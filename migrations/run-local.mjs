// Runs one SQL migration file against the LOCAL database in .env.localcopy.
// Refuses anything that isn't localhost — this script never touches production.
//
//   node migrations/run-local.mjs migrations/2026_09_venue_taxonomy.up.sql
//   node migrations/run-local.mjs migrations/2026_09_venue_taxonomy.down.sql
import fs from "fs";
import path from "path";
import pg from "pg";

const file = process.argv[2];
if (!file || !file.endsWith(".sql") || !fs.existsSync(file)) {
  console.error("Usage: node migrations/run-local.mjs <path-to-migration.sql>");
  process.exit(1);
}

const envLine = fs.readFileSync(".env.localcopy", "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
const url = envLine?.slice("DATABASE_URL=".length).trim() || "";
const { hostname, pathname } = new URL(url);
if (hostname !== "localhost" && hostname !== "127.0.0.1") {
  console.error(`Refusing: .env.localcopy points at ${hostname}, not localhost.`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(fs.readFileSync(file, "utf8"));
  console.log(`Applied ${path.basename(file)} to ${pathname.slice(1)} on ${hostname}.`);
} catch (e) {
  console.error(`Failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
