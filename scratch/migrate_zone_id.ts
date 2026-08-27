import { config } from "dotenv";
config();
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Starting migration to add zone_id to screens...");
  
  // 1. Add zone_id to screens
  await db.execute(sql`ALTER TABLE screens ADD COLUMN IF NOT EXISTS zone_id VARCHAR;`);
  console.log("Added zone_id to screens.");

  // 2. Migrate data from zone_screens to screens
  await db.execute(sql`
    UPDATE screens
    SET zone_id = zs.zone_id
    FROM zone_screens zs
    WHERE screens.id = zs.screen_id;
  `);
  console.log("Migrated mappings to screens.zone_id.");

  // 3. Drop zone_screens table
  await db.execute(sql`DROP TABLE IF EXISTS zone_screens CASCADE;`);
  console.log("Knocked off the useless zone_screens table!");

  console.log("Migration complete.");
  process.exit(0);
}

main().catch(console.error);
