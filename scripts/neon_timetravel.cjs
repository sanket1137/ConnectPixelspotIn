// Neon DB time-travel: query screens as they were BEFORE our cleanup (~04:30 UTC today)
// Neon supports: SET neon.time_travel_timestamp = 'ISO timestamp';
const path = require('path');
require(path.join('/var/www/pixelspot/node_modules/dotenv')).config({path:'/var/www/pixelspot/.env.production'});
const { Pool } = require(path.join('/var/www/pixelspot/node_modules/pg'));

// Neon time travel requires the NON-pooler endpoint
const dbUrl = (process.env.DATABASE_URL || '').replace('-pooler.', '.');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // Query as of just before our cleanup ran (try 30 mins ago, 1hr ago, 2hrs ago)
    const timestamps = [
      new Date(Date.now() - 10 * 60 * 1000).toISOString(),   // 10 min ago
      new Date(Date.now() - 30 * 60 * 1000).toISOString(),   // 30 min ago
      new Date(Date.now() - 60 * 60 * 1000).toISOString(),   // 1 hr ago
      new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hrs ago
    ];

    for (const ts of timestamps) {
      console.log(`\n=== Time travel to: ${ts} ===`);
      try {
        await client.query(`SET neon.time_travel_timestamp = '${ts}'`);
        const r = await client.query(`
          SELECT id, name, images, screen_images, surrounding_images
          FROM screens
          WHERE (images IS NOT NULL AND array_length(images,1) > 0)
             OR (screen_images IS NOT NULL AND array_length(screen_images,1) > 0)
             OR (surrounding_images IS NOT NULL AND array_length(surrounding_images,1) > 0)
          ORDER BY name
        `);
        
        if (r.rows.length > 0) {
          console.log(`Found ${r.rows.length} screens with images at this timestamp!`);
          r.rows.forEach(row => {
            const allImages = [
              ...(row.images || []),
              ...(row.screen_images || []),
              ...(row.surrounding_images || [])
            ].filter(Boolean);
            if (allImages.length > 0) {
              console.log(`SCREEN:${row.id}|${row.name}|IMAGES:${allImages.join(',')}`);
            }
          });
          // Reset time travel
          await client.query(`RESET neon.time_travel_timestamp`);
          break; // Found data, stop trying
        } else {
          console.log('No screens with images at this timestamp');
          await client.query(`RESET neon.time_travel_timestamp`);
        }
      } catch(e) {
        await client.query(`RESET neon.time_travel_timestamp`).catch(()=>{});
        console.log('Time travel error:', e.message.substring(0,100));
        break; // If feature not available, stop
      }
    }
  } finally {
    client.release();
    pool.end();
  }
}
run().catch(e => { console.error(e.message); process.exit(1); });
