const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function check() {
  const counts = await sql`
    SELECT city, state, count(*)::int as count 
    FROM screens 
    GROUP BY city, state 
    ORDER BY count DESC
  `;
  console.log("Screens counts by city/state:");
  console.table(counts);

  const total = await sql`SELECT count(*)::int as total FROM screens`;
  console.log("Total screens in DB:", total[0].total);

  const sample = await sql`
    SELECT id, name, city, state, screen_images, images 
    FROM screens 
    LIMIT 5
  `;
  console.log("Sample screen images:", sample);
}
check().catch(console.error);
