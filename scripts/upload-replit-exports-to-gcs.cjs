/**
 * ═══════════════════════════════════════════════════════════════
 *  STEP 2 OF 2 — RUN THIS ON THE NEW SERVER (5.223.70.55)
 * ═══════════════════════════════════════════════════════════════
 *
 *  Prerequisites:
 *    1. Copy the JSON manifest output from STEP 1 (Replit Shell) into
 *       /var/www/pixelspot/scripts/replit-manifest.json
 *    2. Run:  cd /var/www/pixelspot && node scripts/upload-replit-exports-to-gcs.cjs
 *
 *  Alternatively, if you only have a list of UUIDs (not a full manifest),
 *  set UUIDS_ONLY=true below and fill in the UUID_LIST array.
 *
 *  What this script does:
 *    1. Reads manifest of Replit objects (from STEP 1) or a UUID list
 *    2. Downloads each image via HTTP from https://connect.pixelspot.in
 *    3. Uploads to gs://pixelspot-uploads/private/uploads/<uuid>
 *    4. Outputs a DB restore SQL file you can run to re-associate images
 */

require('dotenv').config({ path: '.env.production' });

const { Storage } = require('@google-cloud/storage');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ── Config ──────────────────────────────────────────────────────
const OLD_SERVER_BASE = 'https://connect.pixelspot.in/objects/uploads/';
const GCS_BUCKET = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'pixelspot-uploads';
const GCS_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'pixelspot-f4010';
const MANIFEST_PATH = path.join(__dirname, 'replit-manifest.json');
const OUTPUT_SQL = path.join(__dirname, 'restore-screen-images.sql');

// Set to true + fill UUID_LIST if you only have raw UUIDs (no manifest)
const UUIDS_ONLY = false;
const UUID_LIST = [
  // paste your UUIDs here if UUIDS_ONLY is true
  // '08f349ee-2d16-433e-8add-13415933504a',
];

// ── GCS client (uses env creds from .env.production) ─────────────
function makeGcsClient() {
  const projectId = GCS_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;

  if (clientEmail && rawKey) {
    const privateKey = rawKey.replace(/\\n/g, '\n');
    return new Storage({ projectId, credentials: { client_email: clientEmail, private_key: privateKey } });
  }

  // Fall back to default ADC (Application Default Credentials)
  return new Storage({ projectId });
}

// ── Helper: download URL as Buffer ──────────────────────────────
function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || 'image/jpeg' }));
    }).on('error', reject);
  });
}

// ── Main ─────────────────────────────────────────────────────────
async function run() {
  const gcs = makeGcsClient();
  const bucket = gcs.bucket(GCS_BUCKET);

  // Build list of UUIDs to migrate
  let items = []; // { uuid, replitName }

  if (UUIDS_ONLY) {
    items = UUID_LIST.map(uuid => ({ uuid, replitName: `uploads/${uuid}` }));
  } else if (fs.existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    items = manifest
      .filter(m => m.uuid && m.status === 'downloaded')
      .map(m => ({ uuid: m.uuid, replitName: m.name }));
    console.log(`📄 Loaded ${items.length} items from manifest`);
  } else {
    console.error(`❌ No manifest found at ${MANIFEST_PATH}`);
    console.error('   Either run STEP 1 first and save output to replit-manifest.json,');
    console.error('   or set UUIDS_ONLY=true and fill in UUID_LIST above.\n');
    console.error('   Quick UUID-only mode: edit this script, set UUIDS_ONLY=true');
    process.exit(1);
  }

  if (items.length === 0) {
    console.error('No items to migrate. Check manifest or UUID_LIST.');
    process.exit(1);
  }

  console.log(`\n🚀 Migrating ${items.length} images from ${OLD_SERVER_BASE.split('/').slice(0,3).join('/')} → GCS\n`);

  const migrated = [];
  const failed = [];

  for (const item of items) {
    const { uuid, replitName } = item;
    const srcUrl = `${OLD_SERVER_BASE}${uuid}`;
    const gcsPath = `private/uploads/${uuid}`;
    const objectRoute = `/objects/uploads/${uuid}`;

    process.stdout.write(`  ${uuid} ... `);

    try {
      // Check if already exists in GCS
      const [exists] = await bucket.file(gcsPath).exists();
      if (exists) {
        console.log('ALREADY IN GCS, skipped');
        migrated.push({ uuid, gcsPath, objectRoute, status: 'skipped' });
        continue;
      }

      // Download from old server
      const { buffer, contentType } = await downloadUrl(srcUrl);

      // Upload to GCS
      // ACL policy must be stored as custom:aclPolicy JSON — read by server/objectAcl.ts
      const aclPolicy = JSON.stringify({ owner: 'migrated', visibility: 'public' });
      await bucket.file(gcsPath).save(buffer, {
        metadata: {
          contentType,
          metadata: {
            'custom:aclPolicy': aclPolicy,
            migratedFrom: replitName,
            migratedAt: new Date().toISOString()
          }
        }
      });

      console.log(`✅  ${buffer.length} bytes → ${contentType}`);
      migrated.push({ uuid, gcsPath, objectRoute, status: 'migrated', bytes: buffer.length });

    } catch (e) {
      console.log(`❌  FAILED: ${e.message}`);
      failed.push({ uuid, error: e.message });
    }
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`✅  Migrated: ${migrated.length}   ❌  Failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log('\nFailed UUIDs:');
    failed.forEach(f => console.log(`  ${f.uuid} — ${f.error}`));
  }

  // ── Save migration results ─────────────────────────────────────
  const resultPath = path.join(__dirname, 'migration-results.json');
  fs.writeFileSync(resultPath, JSON.stringify({ migrated, failed }, null, 2));
  console.log(`\nResults saved to: ${resultPath}`);

  // ── Generate SQL to restore DB image routes ────────────────────
  const migratedRoutes = migrated.map(m => m.objectRoute);
  console.log('\n📋  Migrated image routes (use these in admin panel to re-assign to screens):');
  migratedRoutes.forEach(r => console.log(`   ${r}`));

  // Generate a helper SQL to check which screens need images
  const sql = `-- Run this to see screens with empty images (need re-assignment):
SELECT
  id,
  title,
  "screenName",
  array_length(images, 1) AS legacy_count,
  array_length("screenImages", 1) AS screen_img_count,
  array_length("surroundingImages", 1) AS surr_img_count
FROM screens
WHERE
  (images IS NULL OR array_length(images, 1) IS NULL)
  AND ("screenImages" IS NULL OR array_length("screenImages", 1) IS NULL)
ORDER BY title;

-- Migrated GCS image routes (paste into Admin > Screens to re-assign):
-- ${migratedRoutes.join('\n-- ')}
`;
  fs.writeFileSync(OUTPUT_SQL, sql);
  console.log(`\nSQL helper saved to: ${OUTPUT_SQL}`);
  console.log('\n🎯  Next step: Use the Admin panel → Screens → edit each screen → re-upload images');
  console.log('    OR run the restore-screen-images.sql query to manually assign routes.');
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
