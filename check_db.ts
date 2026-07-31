import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`SELECT type, occupation_mix, user_intent, user_mood, gender_orientation, income_level FROM screens LIMIT 5`);
  console.log("Results:");
  console.dir(result, { depth: null });
  process.exit(0);
}
main().catch(console.error);
