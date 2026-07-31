import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const typeResult = await db.execute(sql`SELECT DISTINCT type FROM screens WHERE status = 'active' AND type IS NOT NULL`);
    console.log("types ok");
    
    const occMixResult = await db.execute(sql`SELECT DISTINCT unnest(occupation_mix) as occ FROM screens WHERE status = 'active' AND occupation_mix IS NOT NULL`);
    console.log("occMix ok");

    const userMoodResult = await db.execute(sql`SELECT DISTINCT unnest(user_mood) as mood FROM screens WHERE status = 'active' AND user_mood IS NOT NULL`);
    console.log("userMoods ok");

    const genderResult = await db.execute(sql`SELECT DISTINCT gender_orientation FROM screens WHERE status = 'active' AND gender_orientation IS NOT NULL`);
    console.log("genderOrientations ok");

    const incomeResult = await db.execute(sql`SELECT DISTINCT income_level FROM screens WHERE status = 'active' AND income_level IS NOT NULL`);
    console.log("incomeLevels ok");
    
  } catch(e) {
    console.error("ERROR IN QUERIES:", e);
  }
  process.exit(0);
}
main().catch(console.error);
