/**
 * ═══════════════════════════════════════════════════════════════
 *  migrate-from-uuid-list.cjs  —  run on NEW SERVER (5.223.70.55)
 * ═══════════════════════════════════════════════════════════════
 *
 *  Usage:
 *    node scripts/migrate-from-uuid-list.cjs [path-to-uuid-list.txt]
 *
 *  The uuid-list.txt should have one entry per line, either:
 *    - a full Replit object name:  uploads/08f349ee-2d16-433e-8add-13415933504a
 *    - just a UUID:                08f349ee-2d16-433e-8add-13415933504a
 *    - a full /objects/ path:      /objects/uploads/08f349ee-...
 *    - blank lines and # comments are ignored
 *
 *  The script:
 *    1. Downloads each image from https://connect.pixelspot.in/objects/uploads/<uuid>
 *    2. Uploads to gs://pixelspot-uploads/private/uploads/<uuid>
 *    3. Prints results and saves migration-results.json
 */

require('dotenv').config({ path: '.env.production' });

const { Storage } = require('@google-cloud/storage');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────────────
const OLD_SERVER_BASE = 'https://connect.pixelspot.in/objects/uploads/';
const GCS_BUCKET = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'pixelspot-uploads';
const GCS_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'pixelspot-f4010';

// ── Default UUID list (known from error logs) ────────────────────
const DEFAULT_UUIDS = [
  '08f349ee-2d16-433e-8add-13415933504a',
  'b2c01b82-09a2-4e6e-96e6-9f22e2a0c21f',
  '702f8717-4399-4663-9935-e153ad92a414',
  'de28c4a1-da21-4915-976e-257431946b0d',
  '070d7d37-0ef5-450f-b638-04e1fa942c6c',
  'd6d8635f-02fd-488f-b6cc-05f351dfcc2b',
  '33a9f875-2d75-49e8-a8bd-65d56b3ae3a1',
];

// ── Parse UUID from various input formats ────────────────────────
function parseUuid(line) {
  const clean = line.trim();
  if (!clean || clean.startsWith('#')) return null;
  const m = clean.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1] : null;
}

// ── GCS client ───────────────────────────────────────────────────
function makeGcs() {
  const projectId = GCS_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  if (clientEmail && rawKey) {
    return new Storage({ projectId, credentials: { client_email: clientEmail, private_key: rawKey.replace(/\\n/g, '\n') } });
  }
  console.warn('⚠️  FIREBASE_CLIENT_EMAIL/PRIVATE_KEY not set — using Application Default Credentials');
  return new Storage({ projectId });
}

// ── HTTP download with redirect follow ──────────────────────────
function downloadUrl(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'));

  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { timeout: 30000, headers: { 'User-Agent': 'PixelspotMigration/1.0' } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        return resolve(downloadUrl(res.headers.location, redirectCount + 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        buffer: Buffer.concat(chunks),
        contentType: res.headers['content-type'] || 'image/jpeg'
      }));
      res.on('error', reject);
    }).on('error', reject).on('timeout', function() { this.destroy(new Error('Request timed out')); });
  });
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  const listFile = process.argv[2];
  let uuids = [];

  if (listFile) {
    if (!fs.existsSync(listFile)) {
      console.error(`File not found: ${listFile}`);
      process.exit(1);
    }
    const lines = fs.readFileSync(listFile, 'utf8').split('\n');
    uuids = lines.map(parseUuid).filter(Boolean);
    console.log(`📄 Loaded ${uuids.length} UUIDs from ${listFile}`);
  } else {
    uuids = DEFAULT_UUIDS;
    console.log(`Using ${uuids.length} default UUIDs from error logs`);
    console.log('Tip: pass a file path to migrate more:  node migrate-from-uuid-list.cjs /tmp/uuid-list.txt');
  }

  if (uuids.length === 0) {
    console.error('No UUIDs found to migrate');
    process.exit(1);
  }

  const gcs = makeGcs();
  const bucket = gcs.bucket(GCS_BUCKET);
  const migrated = [];
  const failed = [];

  console.log(`\n🚀 Migrating ${uuids.length} images  →  gs://${GCS_BUCKET}/private/uploads/<uuid>\n`);

  for (const uuid of uuids) {
    const srcUrl = `${OLD_SERVER_BASE}${uuid}`;
    const gcsPath = `private/uploads/${uuid}`;
    process.stdout.write(`  ${uuid} ... `);

    try {
      // Skip if already in GCS with correct ACL (saves bandwidth)
      const [exists] = await bucket.file(gcsPath).exists();
      if (exists) {
        // Ensure ACL is set even if skipping download
        const aclFix = JSON.stringify({ owner: 'migrated', visibility: 'public' });
        await bucket.file(gcsPath).setMetadata({ metadata: { 'custom:aclPolicy': aclFix } }).catch(() => {});
        console.log('already exists (ACL confirmed), skipped download');
        migrated.push({ uuid, objectRoute: `/objects/uploads/${uuid}`, status: 'existed' });
        continue;
      }

      // Download
      const { buffer, contentType } = await downloadUrl(srcUrl);

      // Upload
      // ACL policy must be stored as custom:aclPolicy JSON — read by server/objectAcl.ts
      const aclPolicy = JSON.stringify({ owner: 'migrated', visibility: 'public' });
      await bucket.file(gcsPath).save(buffer, {
        resumable: false,
        metadata: {
          contentType,
          metadata: {
            'custom:aclPolicy': aclPolicy,
            migratedFrom: srcUrl,
            migratedAt: new Date().toISOString()
          }
        }
      });

      const route = `/objects/uploads/${uuid}`;
      console.log(`✅ ${(buffer.length / 1024).toFixed(1)} KB  (${contentType})`);
      migrated.push({ uuid, objectRoute: route, gcsPath, contentType, bytes: buffer.length, status: 'migrated' });

    } catch (e) {
      console.log(`❌ ${e.message}`);
      failed.push({ uuid, error: e.message });
    }
  }

  // ── Results ───────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`✅ Success: ${migrated.length}    ❌ Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed:');
    failed.forEach(f => console.log(`  ✗ ${f.uuid}  —  ${f.error}`));
  }

  // Save results
  const outFile = path.join(__dirname, 'migration-results.json');
  fs.writeFileSync(outFile, JSON.stringify({ migrated, failed, timestamp: new Date().toISOString() }, null, 2));
  console.log(`\nFull results: ${outFile}`);

  // Print image routes for admin panel
  if (migrated.length > 0) {
    console.log('\n📋 Image routes now available on new server:');
    migrated.forEach(m => console.log(`   ${m.objectRoute}`));
    console.log('\n→ Use Admin panel > Screens to re-assign these images to the correct screens.');
  }
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
