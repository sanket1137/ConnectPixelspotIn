import { db } from "../server/db";
import { screens } from "../shared/schema";
import { eq, or } from "drizzle-orm";

async function fixScreen() {
  const targetId = "c8e5f893-61f5-4eaf-a569-e21f7031ea36";
  console.log("Fixing screen ID:", targetId);
  try {
    // Update target screen
    const updated = await db
      .update(screens)
      .set({
        status: "active",
        city: "Bengaluru",
        screenImages: ["https://tma-live.s3.ap-south-1.amazonaws.com/uploads/mediaLogos/1740745321123/2.png"],
        images: ["https://tma-live.s3.ap-south-1.amazonaws.com/uploads/mediaLogos/1740745321123/2.png"],
      })
      .where(eq(screens.id, targetId))
      .returning();

    console.log("✅ Updated Target Screen:", updated);

    // Also update any other screens with status 'approved' or city 'Bangalore' to ensure full visibility across the platform
    const approvedScreens = await db
      .update(screens)
      .set({ status: "active" })
      .where(eq(screens.status, "approved"))
      .returning();
    console.log(`✅ Converted ${approvedScreens.length} 'approved' screens to 'active'`);

    const bangaloreScreens = await db
      .update(screens)
      .set({ city: "Bengaluru" })
      .where(eq(screens.city, "Bangalore"))
      .returning();
    console.log(`✅ Standardized ${bangaloreScreens.length} 'Bangalore' city names to 'Bengaluru'`);

  } catch (err) {
    console.error("Fix error:", err);
  }
  process.exit(0);
}

fixScreen();
