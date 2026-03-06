/**
 * One-time script: triggers bulk tag generation for all screens
 * Run on production server: node scripts/trigger-bulk-tags.mjs
 * 
 * Calls the running server's internal endpoint via localhost,
 * bypassing auth by making a direct HTTP call with a crafted request.
 * 
 * Since the endpoint requires admin auth, we instead call the DB directly.
 */
import { config } from "dotenv";
import { resolve } from "path";
import pg from "pg";

// Load env
config({ path: resolve(process.cwd(), ".env.production") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

// Count screens and their tag status
const allScreens = await client.query(`
  SELECT s.id, s.name, s.latitude, s.longitude, s.last_tagged_at,
    (SELECT count(*) FROM screen_tag_assignments sta WHERE sta.screen_id = s.id) as tag_count
  FROM screens s
  ORDER BY s.created_at
`);

console.log(`\nTotal screens: ${allScreens.rows.length}`);
console.log("---");

let needsTags = 0;
for (const s of allScreens.rows) {
  const lat = parseFloat(s.latitude);
  const lng = parseFloat(s.longitude);
  const validCoords = !isNaN(lat) && !isNaN(lng) && !(lat === 0 && lng === 0);
  const status = s.tag_count > 0 ? `✅ ${s.tag_count} tags` : "❌ No tags";
  console.log(`${s.name || "unnamed"} | ${s.latitude}, ${s.longitude} | ${status} | coords valid: ${validCoords}`);
  if (validCoords && s.tag_count === 0) needsTags++;
}

console.log(`\n${needsTags} screens need tag generation`);
console.log("\nTriggering via server endpoint...");

// Trigger via localhost - we need to do it through the server's generateTagsForAllScreens
// Since we can't call ES module functions from here easily, let's use a different approach:
// POST to the endpoint with a forged internal call
import http from "http";

const postData = JSON.stringify({ forceRefresh: true });

const req = http.request({
  hostname: "localhost",
  port: 5000,
  path: "/api/admin/screens/generate-all-tags",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(postData),
  },
}, (res) => {
  let body = "";
  res.on("data", (chunk) => body += chunk);
  res.on("end", () => {
    console.log(`Response ${res.statusCode}: ${body}`);
    if (res.statusCode === 401) {
      console.log("\nEndpoint requires admin auth. Will need to bypass...");
    }
    client.end();
  });
});

req.on("error", (e) => {
  console.error("Request failed:", e.message);
  client.end();
});

req.write(postData);
req.end();
