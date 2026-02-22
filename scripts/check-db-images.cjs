require('dotenv').config({ path: '.env.production' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const screens = await sql`
    SELECT id, name, screen_images, surrounding_images
    FROM screens
    ORDER BY name
  `;

  const withImages = screens.filter(s => s.screen_images?.length > 0);
  const noImages = screens.filter(s => !s.screen_images?.length);

  console.log(`\nTotal screens: ${screens.length}`);
  console.log(`With screen_images: ${withImages.length}`);
  console.log(`Without screen_images: ${noImages.length}`);

  if (withImages.length > 0) {
    console.log('\n--- Screens WITH images ---');
    for (const s of withImages) {
      console.log(`\n"${s.name}" (${s.id})`);
      (s.screen_images || []).forEach(p => console.log(`  ${p}`));
    }
  }

  if (noImages.length > 0) {
    console.log('\n--- Screens WITHOUT images (first 20) ---');
    noImages.slice(0, 20).forEach(s => console.log(`  ${s.id}  "${s.name}"`));
    if (noImages.length > 20) console.log(`  ... and ${noImages.length - 20} more`);
  }
}
main().catch(e => console.error(e.message));
