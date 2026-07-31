import { db } from "./server/db";
import { screens } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const result = await db.select().from(screens).where(eq(screens.id, "f7135cd3-c6cd-4a68-8d4a-ccc5ed7e7343"));
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
main().catch(console.error);
