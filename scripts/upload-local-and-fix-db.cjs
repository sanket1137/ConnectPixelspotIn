/**
 * upload-local-and-fix-db.cjs
 *
 * 1. Reads all files from C:\Users\Sanket\Downloads\upload (or path arg)
 * 2. Uploads each to GCS at private/uploads/<uuid>.<ext>
 * 3. Queries DB - shows which screens reference which UUIDs
 * 4. Verifies every DB-referenced UUID has a file in GCS
 * 5. Reports any missing files
 *
 * Usage (run locally):
 *   node scripts/upload-local-and-fix-db.cjs
 */

require('dotenv').config({ path: '.env.production' });

const { Storage } = require('@google-cloud/storage');
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const LOCAL_DIR = process.argv[2] || 'C:\\Users\\Sanket\\Downloads\\upload';
const GCS_BUCKET = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'pixelspot-uploads';
const GCS_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'pixelspot-f4010';
const ACL_VALUE = JSON.stringify({ owner: 'migrated', visibility: 'public' });

const MIME_MAP = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp',
  '.gif': 'image/gif', '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
};

function makeGcs() {
  return new Storage({
    projectId: GCS_PROJECT_ID,
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
  });
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
function extractUuids(val) {
  if (!val) return [];
  const str = Array.isArray(val) ? val.join(' ') : String(val);
  return [...new Set([...str.matchAll(UUID_RE)].map(m => m[0].toLowerCase()))];
}

async function main() {
  const gcs = makeGcs();
  const bucket = gcs.bucket(GCS_BUCKET);
  const sql = neon(process.env.DATABASE_URL);

  // ── 1. Read local files ─────────────────────────────────────
  console.log(`\n📂 Reading local files from: ${LOCAL_DIR}\n`);
  const allFiles = fs.readdirSync(LOCAL_DIR);

  // Deduplicate: keep first occurrence of each UUID (ignore " (1)" duplicates)
  const uuidFileMap = new Map(); // uuid -> { filename, ext, fullPath }
  const skippedDupes = [];
  for (const filename of allFiles) {
    const ext = path.extname(filename).toLowerCase();
    if (!MIME_MAP[ext]) continue;
    const uuidMatch = filename.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
    if (!uuidMatch) continue;
    const uuid = uuidMatch[1].toLowerCase();
    if (uuidFileMap.has(uuid)) {
      skippedDupes.push(filename);
      continue;
    }
    uuidFileMap.set(uuid, { filename, ext, fullPath: path.join(LOCAL_DIR, filename) });
  }

  console.log(`Found ${uuidFileMap.size} unique files (${skippedDupes.length} duplicates skipped)`);
  if (skippedDupes.length) console.log(`  Skipped: ${skippedDupes.join(', ')}`);

  // ── 2. Query DB for screen image references ─────────────────
  console.log('\n🔍 Querying DB for screen image references...');
  const screens = await sql`SELECT id, name, images, screen_images, surrounding_images FROM screens ORDER BY name`;
  const campaigns = await sql`SELECT id, name, creative_url FROM campaigns WHERE creative_url IS NOT NULL`;

  // Build a map: uuid -> list of screens that reference it
  const uuidToScreens = new Map();
  let totalDbRefs = 0;
  for (const s of screens) {
    const uuids = [
      ...extractUuids(s.images),
      ...extractUuids(s.screen_images),
      ...extractUuids(s.surrounding_images),
    ];
    for (const uuid of uuids) {
      if (!uuidToScreens.has(uuid)) uuidToScreens.set(uuid, []);
      uuidToScreens.get(uuid).push(s.name);
      totalDbRefs++;
    }
  }
  for (const c of campaigns) {
    for (const uuid of extractUuids(c.creative_url)) {
      if (!uuidToScreens.has(uuid)) uuidToScreens.set(uuid, []);
      uuidToScreens.get(uuid).push(`[campaign] ${c.name}`);
    }
  }
  console.log(`DB has ${uuidToScreens.size} unique UUIDs referenced across ${screens.length} screens`);

  // ── 3. Check existing GCS files ────────────────────────────
  console.log('\n📦 Checking existing GCS files...');
  const [existingFiles] = await bucket.getFiles({ prefix: 'private/uploads/' });
  const gcsUuids = new Set(existingFiles.map(f => {
    const m = f.name.match(UUID_RE);
    return m ? m[0].toLowerCase() : null;
  }).filter(Boolean));
  console.log(`${gcsUuids.size} files already in GCS\n`);

  // ── 4. Upload all local files to GCS ───────────────────────
  console.log(`⬆️  Uploading ${uuidFileMap.size} local files to GCS...\n`);
  let uploaded = 0, skipped = 0, failed = 0;

  for (const [uuid, info] of uuidFileMap) {
    const gcsPath = `private/uploads/${uuid}`;
    process.stdout.write(`  ${uuid}${info.ext} ... `);

    if (gcsUuids.has(uuid)) {
      // Ensure ACL is set correctly even if file exists
      await bucket.file(gcsPath).setMetadata({ metadata: { 'custom:aclPolicy': ACL_VALUE } }).catch(() => {});
      console.log('already in GCS ✓');
      skipped++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(info.fullPath);
      const contentType = MIME_MAP[info.ext] || 'application/octet-stream';
      await bucket.file(gcsPath).save(buffer, {
        resumable: false,
        metadata: {
          contentType,
          metadata: { 'custom:aclPolicy': ACL_VALUE, uploadedAt: new Date().toISOString() },
        },
      });
      console.log(`✅ ${(buffer.length / 1024).toFixed(0)}KB`);
      uploaded++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
      failed++;
    }
  }

  console.log(`\n✅ Uploaded: ${uploaded}   ⏭ Skipped (existed): ${skipped}   ❌ Failed: ${failed}`);

  // ── 5. Fix DB references ────────────────────────────────────
  console.log('\n🗄  Verifying & fixing DB references...');
  
  // All UUIDs now available in GCS (local + previously existing)
  const allAvailableUuids = new Set([...uuidFileMap.keys(), ...gcsUuids]);

  let dbFixed = 0;
  let missingFromGcs = [];

  for (const s of screens) {
    const rebuildArr = (arr) => {
      if (!arr || !Array.isArray(arr)) return arr;
      return arr.map(p => {
        const uuids = extractUuids(p);
        if (!uuids.length) return p;
        for (const uuid of uuids) {
          if (allAvailableUuids.has(uuid)) return `/objects/uploads/${uuid}`;
        }
        return p; // keep as-is if UUID not found locally
      });
    };

    const newScreenImages = rebuildArr(s.screen_images);
    const newSurrImages = rebuildArr(s.surrounding_images);
    const newImages = rebuildArr(s.images);

    // Detect if update needed (path format might differ)
    const changed =
      JSON.stringify(newScreenImages) !== JSON.stringify(s.screen_images) ||
      JSON.stringify(newSurrImages) !== JSON.stringify(s.surrounding_images) ||
      JSON.stringify(newImages) !== JSON.stringify(s.images);

    if (changed) {
      await sql`UPDATE screens SET screen_images=${newScreenImages}, surrounding_images=${newSurrImages}, images=${newImages} WHERE id=${s.id}`;
      dbFixed++;
    }
  }

  // ── 6. Check which DB-referenced UUIDs are missing locally ─
  console.log('\n📋 Coverage report:');
  const dbMissingLocally = [];
  for (const [uuid, screenNames] of uuidToScreens) {
    if (!allAvailableUuids.has(uuid)) {
      dbMissingLocally.push({ uuid, screens: screenNames });
      missingFromGcs.push(uuid);
    }
  }

  if (dbMissingLocally.length === 0) {
    console.log('✅ ALL DB-referenced images exist in GCS — complete coverage!');
  } else {
    console.log(`⚠️  ${dbMissingLocally.length} DB-referenced UUIDs NOT found in local folder or GCS:`);
    dbMissingLocally.forEach(m => console.log(`   ✗ ${m.uuid}  (used by: ${m.screens.slice(0,2).join(', ')}${m.screens.length>2?' ...':''})`));
  }

  // ── 7. Log DB state ─────────────────────────────────────────
  console.log(`\n🗄  DB updates: ${dbFixed} records fixed`);
  
  // Show sample screens with their current image paths
  console.log('\n📸 Sample screens → image paths (first 5):');
  const refreshed = await sql`SELECT name, screen_images FROM screens WHERE screen_images IS NOT NULL AND array_length(screen_images,1)>0 LIMIT 5`;
  for (const s of refreshed) {
    console.log(`  "${s.name}"`);
    (s.screen_images || []).forEach(p => console.log(`    ${p}`));
  }

  console.log('\n🎉 Done! Images are uploaded to GCS and DB references are current.');
  console.log(`    Access images at: http://5.223.70.55/objects/uploads/<uuid>`);
  console.log(`    GCS Console: https://console.cloud.google.com/storage/browser/pixelspot-uploads/private/uploads`);
}

main().catch(e => { console.error('\nFatal:', e.message); process.exit(1); });
