/**
 * apply-image-assignments.cjs
 *
 * Reads scripts/image-assignment.csv and updates the DB.
 *
 * CSV format (fill in the UUID columns):
 *   screen_id, screen_name, image_uuid_1, image_uuid_2, ...
 *
 * Usage:
 *   node scripts/apply-image-assignments.cjs
 */

require('dotenv').config({ path: '.env.production' });
const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function main() {
  const csvPath = process.argv[2] || path.join(__dirname, 'image-assignment.csv');
  const sql = neon(process.env.DATABASE_URL);

  const lines = fs.readFileSync(csvPath, 'utf8').split('\n').filter(Boolean);
  lines.shift(); // remove header

  let updated = 0, skipped = 0;

  for (const line of lines) {
    // Parse CSV (handle quoted names)
    const parts = line.match(/("(?:[^"]|"")*"|[^,]*),?/g)?.map(p => p.replace(/,$/, '').replace(/^"|"$/g, '')) || [];
    const [screenId, , ...uuidCols] = parts;
    if (!screenId) continue;

    const uuids = uuidCols.map(u => u.trim()).filter(u => /^[0-9a-f]{8}-/.test(u));
    if (uuids.length === 0) { skipped++; continue; }

    const imagePaths = uuids.map(u => `/objects/uploads/${u}`);
    await sql`UPDATE screens SET screen_images = ${imagePaths} WHERE id = ${screenId}`;
    console.log(`  ✅ ${screenId.substring(0,8)}... → ${imagePaths.length} image(s)`);
    updated++;
  }

  console.log(`\nDone: ${updated} screens updated, ${skipped} skipped (no UUIDs)`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
