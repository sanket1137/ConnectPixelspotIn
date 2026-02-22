require('dotenv').config({ path: '.env.production' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
async function run() {
  const rows = await sql`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_name IN ('screens','campaigns','users','bookings')
    ORDER BY table_name, ordinal_position
  `;
  const tables = {};
  for (const r of rows) {
    if (!tables[r.table_name]) tables[r.table_name] = [];
    tables[r.table_name].push(r.column_name);
  }
  for (const [t, cols] of Object.entries(tables)) {
    console.log(`\n${t}: ${cols.join(', ')}`);
  }
}
run().catch(e => console.error(e.message));
