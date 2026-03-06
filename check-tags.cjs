const { Pool } = require("pg");
require("dotenv").config({ path: "/var/www/pixelspot/.env.production" });
const p = new Pool({ connectionString: process.env.DATABASE_URL });
const sid = "5d855c2c-b751-4a80-aada-c06a6e2d4417";

// First, clear old auto-tag assignments and reset lastTaggedAt so regeneration fires
async function run() {
  await p.query("DELETE FROM screen_tag_assignments WHERE screen_id = $1 AND source = 'auto'", [sid]);
  await p.query("UPDATE screens SET last_tagged_at = NULL WHERE id = $1", [sid]);
  console.log("Cleared old tags and reset lastTaggedAt");
  
  // Now query remaining
  const r = await p.query(
    "SELECT st.slug, st.category, sta.score, sta.is_primary, sta.distance_meters, sta.poi_count FROM screen_tag_assignments sta JOIN screen_tags st ON st.id = sta.tag_id WHERE sta.screen_id = $1 ORDER BY sta.score DESC",
    [sid]
  );
  console.table(r.rows);
  console.log("Remaining tags:", r.rows.length);
  p.end();
}
run().catch(e => { console.error(e); p.end(); });
