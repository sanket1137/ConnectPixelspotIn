/**
 * ═══════════════════════════════════════════════════════════════
 *  STEP 1 OF 2 — RUN THIS IN YOUR REPLIT PROJECT SHELL
 * ═══════════════════════════════════════════════════════════════
 * 
 *   Go to https://replit.com → open your "pixel-spot-connect" project
 *   Click the "Shell" tab and run:
 * 
 *       node migrate-replit-to-gcs.cjs
 * 
 *   (copy this file to the Replit project root first)
 * 
 * This script:
 *   1. Lists ALL objects in Replit Object Storage
 *   2. Downloads each file as bytes
 *   3. Saves content-type metadata
 *   4. Outputs a JSON array — COPY the JSON and send it back
 *      so the second script can upload them to GCS
 */

const { Client } = require('@replit/object-storage');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new Client();

  // ── 1. List all objects ──────────────────────────────────────
  console.log('📦  Listing all objects in Replit Object Storage...');
  const { ok, value: objects, error: listErr } = await client.list();
  if (!ok) {
    console.error('❌  Failed to list objects:', listErr);
    process.exit(1);
  }
  console.log(`Found ${objects.length} objects\n`);

  // ── 2. Download each object and save locally ─────────────────
  const outDir = '/tmp/replit-export';
  fs.mkdirSync(outDir, { recursive: true });

  const manifest = [];

  for (const obj of objects) {
    const name = obj.name; // e.g. "uploads/08f349ee-..."
    process.stdout.write(`  Downloading: ${name} ... `);

    const { ok: dlOk, value: data, error: dlErr } = await client.downloadAsBytes(name);
    if (!dlOk) {
      console.log(`FAILED: ${dlErr}`);
      manifest.push({ name, status: 'failed', error: String(dlErr) });
      continue;
    }

    // Save to disk (filename = uuid only to avoid slash issues)
    const safeFileName = name.replace(/\//g, '__');
    const localPath = path.join(outDir, safeFileName);
    fs.writeFileSync(localPath, Buffer.from(data));

    const uuid = (name.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/) || [])[1] || null;

    manifest.push({
      name,          // original Replit path
      localPath,     // where we saved it locally
      uuid,          // extracted UUID (null if not UUID-named)
      sizeBytes: data.length,
      status: 'downloaded'
    });

    console.log(`OK (${data.length} bytes)`);
  }

  // ── 3. Output manifest ───────────────────────────────────────
  const manifestPath = path.join(outDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\n══════════════════════════════════════════════════════');
  console.log('MANIFEST (copy everything between the ===MANIFEST=== markers):');
  console.log('===MANIFEST===');
  console.log(JSON.stringify(manifest, null, 2));
  console.log('===MANIFEST===');
  console.log(`\nTotal: ${manifest.filter(m=>m.status==='downloaded').length} downloaded, ${manifest.filter(m=>m.status==='failed').length} failed`);
  console.log(`Files saved to: ${outDir}`);
  console.log('\n✅  Done! Copy the manifest above and share it.');
  console.log('    Then run STEP 2 (scripts/upload-replit-exports-to-gcs.cjs) on the new server.');
}

run().catch(e => { console.error('Fatal error:', e); process.exit(1); });

