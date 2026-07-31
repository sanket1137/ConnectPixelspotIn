import { db } from "./server/db";
import { mediaPlans, mediaPlanItems } from "./shared/schema";
import { eq, sql } from "drizzle-orm";

async function run() {
  const plans = await db.select({
    id: mediaPlans.id,
    name: mediaPlans.name,
    totalScreens: sql<number>`count(${mediaPlanItems.id})`.mapWith(Number),
    calculatedTotal: sql<number>`sum(${mediaPlanItems.totalPrice})`.mapWith(Number)
  })
  .from(mediaPlans)
  .leftJoin(mediaPlanItems, eq(mediaPlans.id, mediaPlanItems.planId))
  .groupBy(mediaPlans.id);
  
  console.log(plans);
  process.exit(0);
}
run();
