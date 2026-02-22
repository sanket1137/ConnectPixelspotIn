/**
 * generate-image-assignment-tool.cjs
 *
 * Generates two files:
 *  1. image-gallery.html  — Visual gallery of all 97 GCS images to identify them
 *  2. image-assignment.csv — Template CSV: screen_id, screen_name, image_uuids
 *
 * After filling in the CSV, run:
 *   node scripts/apply-image-assignments.cjs scripts/image-assignment.csv
 */

require('dotenv').config({ path: '.env.production' });
const { neon } = require('@neondatabase/serverless');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://5.223.70.55';
const GCS_BUCKET = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'pixelspot-uploads';

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  const gcs = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentials: {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
  });

  // Get all GCS images
  const [files] = await gcs.bucket(GCS_BUCKET).getFiles({ prefix: 'private/uploads/' });
  const imageUuids = files
    .map(f => f.name.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1])
    .filter(Boolean)
    .sort();

  // Get all screens
  const screens = await sql`SELECT id, name, screen_images FROM screens ORDER BY name`;

  // ── Generate HTML Gallery ──────────────────────────────────
  const imgCards = imageUuids.map(uuid => `
    <div class="card" onclick="copyUuid('${uuid}')">
      <img src="${BASE_URL}/objects/uploads/${uuid}"
           onerror="this.style.display='none'; this.nextSibling.style.display='block'"
           loading="lazy" />
      <div class="video-placeholder" style="display:none">📹 Media file</div>
      <div class="uuid">${uuid}</div>
      <button onclick="event.stopPropagation(); copyUuid('${uuid}')">📋 Copy UUID</button>
    </div>`).join('\n');

  const screenRows = screens.map(s => `
    <tr class="${s.screen_images?.length ? 'has-images' : 'no-images'}">
      <td><code>${s.id}</code></td>
      <td>${s.name}</td>
      <td>${s.screen_images?.length ? s.screen_images.map(p=>`<code>${p}</code>`).join('<br>') : '<em>— no images —</em>'}</td>
    </tr>`).join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Pixelspot Image Assignment Tool</title>
<style>
  body { font-family: sans-serif; margin: 0; padding: 16px; background: #f5f5f5; }
  h1 { color: #333; }
  .stats { background: #fff3cd; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin-bottom: 32px; }
  .card { background: white; border-radius: 8px; padding: 8px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: transform .15s; }
  .card:hover { transform: scale(1.02); }
  .card img { width: 100%; height: 150px; object-fit: cover; border-radius: 4px; }
  .card .uuid { font-size: 10px; color: #666; word-break: break-all; margin: 4px 0; }
  .card button { width: 100%; padding: 4px; font-size: 11px; cursor: pointer; }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  th { background: #333; color: white; padding: 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
  tr.has-images td:first-child { border-left: 4px solid #28a745; }
  tr.no-images td:first-child { border-left: 4px solid #dc3545; }
  code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-size: 11px; }
  .toast { position: fixed; bottom: 20px; right: 20px; background: #333; color: white; padding: 10px 16px; border-radius: 8px; display: none; }
</style>
</head>
<body>
<h1>🖼️ Pixelspot Image Assignment Tool</h1>
<div class="stats">
  <strong>GCS Images:</strong> ${imageUuids.length} files &nbsp;|&nbsp;
  <strong>Screens with images:</strong> ${screens.filter(s=>s.screen_images?.length).length} / ${screens.length} &nbsp;|&nbsp;
  <strong>Screens needing images:</strong> ${screens.filter(s=>!s.screen_images?.length).length}
</div>

<h2>All Images in GCS (click to copy UUID)</h2>
<div class="gallery">
${imgCards}
</div>

<h2>All Screens</h2>
<p>Green border = has images. Red border = needs images.</p>
<table>
  <thead><tr><th>Screen ID</th><th>Name</th><th>Current Images</th></tr></thead>
  <tbody>${screenRows}</tbody>
</table>

<div class="toast" id="toast">UUID copied!</div>

<script>
function copyUuid(uuid) {
  navigator.clipboard.writeText(uuid).then(() => {
    const t = document.getElementById('toast');
    t.style.display = 'block';
    setTimeout(() => t.style.display = 'none', 1500);
  });
}
</script>
</body>
</html>`;

  const htmlPath = path.join(__dirname, '..', 'image-gallery.html');
  fs.writeFileSync(htmlPath, html);
  console.log(`✅ Gallery saved: ${htmlPath}`);

  // ── Generate CSV template ──────────────────────────────────
  const csvLines = ['screen_id,screen_name,image_uuid_1,image_uuid_2,image_uuid_3,image_uuid_4'];
  for (const s of screens) {
    const existing = (s.screen_images || [])
      .map(p => p.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)?.[1] || '')
      .slice(0, 4);
    while (existing.length < 4) existing.push('');
    csvLines.push(`${s.id},"${s.name.replace(/"/g, '\\"')}",${existing.join(',')}`);
  }
  const csvPath = path.join(__dirname, 'image-assignment.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`✅ CSV template saved: ${csvPath}`);

  console.log(`\n📋 Next steps:`);
  console.log(`  1. Open image-gallery.html in your browser to see all images visually`);
  console.log(`  2. Fill in scripts/image-assignment.csv — match image UUIDs to screens`);
  console.log(`  3. Run: node scripts/apply-image-assignments.cjs`);
  console.log(`\n🌐 Or just use the Admin panel → Screens to assign images manually`);
  console.log(`   All images are live at: ${BASE_URL}/objects/uploads/<uuid>`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
