import { db } from "../server/db";
import { screens } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkScreen() {
  const targetId = "c8e5f893-61f5-4eaf-a569-e21f7031ea36";
  console.log("Searching for Screen ID:", targetId);
  try {
    const result = await db.select().from(screens).where(eq(screens.id, targetId));
    if (result.length === 0) {
      console.log("❌ Screen NOT FOUND by exact ID!");
      const allScreens = await db.select().from(screens);
      console.log(`Total screens in database: ${allScreens.length}`);
      const matches = allScreens.filter(s => s.id.includes("c8e5f893") || s.id.includes("31ea36"));
      if (matches.length > 0) {
        console.log("Found partial ID match:", matches);
      } else {
        console.log("Sample screen IDs in DB:", allScreens.slice(0, 10).map(s => ({ id: s.id, name: s.name, status: s.status, city: s.city })));
      }
    } else {
      console.log("✅ Screen FOUND in database!");
      console.log(JSON.stringify(result[0], null, 2));
    }
  } catch (err) {
    console.error("Database query error:", err);
  }
  process.exit(0);
}

checkScreen();
