import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("=== INSPECTING USERS & CAMPAIGNS FOR DUMMY/TEST DATA ===\n");

  // 1. Find users of interest
  const usersResult = await db.execute(sql`
    SELECT id, name, email, role, status, created_at
    FROM users
    WHERE 
      email ILIKE '%sanket%' OR
      email ILIKE '%jaggi%' OR
      email ILIKE '%ratan%' OR
      email ILIKE '%mohan%' OR
      email ILIKE '%praveen%' OR
      email ILIKE '%test%' OR
      name ILIKE '%sanket%' OR
      name ILIKE '%jaggi%' OR
      name ILIKE '%ratan%' OR
      name ILIKE '%mohan%' OR
      name ILIKE '%praveen%' OR
      name ILIKE '%test%'
    ORDER BY created_at DESC;
  `);

  console.log(`Found ${usersResult.rows.length} matched users:`);
  console.log(JSON.stringify(usersResult.rows, null, 2));

  // 2. Fetch all campaigns with advertiser details and booking counts
  const campaignsResult = await db.execute(sql`
    SELECT 
      c.id,
      c.name AS campaign_name,
      c.status AS campaign_status,
      c.budget,
      c.start_date,
      c.end_date,
      c.created_at,
      u.id AS advertiser_id,
      u.name AS advertiser_name,
      u.email AS advertiser_email,
      u.role AS advertiser_role,
      COUNT(b.id) AS bookings_count
    FROM campaigns c
    LEFT JOIN users u ON c.advertiser_id = u.id
    LEFT JOIN bookings b ON b.campaign_id = c.id
    GROUP BY c.id, u.id
    ORDER BY c.created_at DESC;
  `);

  console.log(`\nFound total ${campaignsResult.rows.length} campaigns across the platform.`);

  // Filter campaigns into categories:
  // A. Specifically requested user emails / names
  // B. Identified as test / dummy from campaign name or user email
  // C. Other legitimate or production-like campaigns

  const targetEmails = [
    "sanketdhole595@gmail.com",
    "sanketdhole109@gmail.com",
    "sanketbdhole@gmail.com"
  ];

  const targetNames = ["jaggi", "ratan", "mohan", "praveen", "sanket"];

  const matchedCampaigns: any[] = [];
  const otherDummyCampaigns: any[] = [];
  const cleanCampaigns: any[] = [];

  for (const row of campaignsResult.rows) {
    const email = ((row.advertiser_email as string) || "").toLowerCase();
    const name = ((row.advertiser_name as string) || "").toLowerCase();
    const cName = ((row.campaign_name as string) || "").toLowerCase();

    const isExplicitTargetUser = 
      targetEmails.some(t => email.includes(t.toLowerCase())) ||
      targetNames.some(t => name.includes(t) || email.includes(t));

    const isTestDummyName = 
      cName.includes("test") || 
      cName.includes("dummy") || 
      cName.includes("sample") || 
      cName.includes("demo") ||
      cName.includes("draft") ||
      cName === "my campaign" ||
      cName === "campaign 1" ||
      cName === "quick campaign";

    if (isExplicitTargetUser) {
      matchedCampaigns.push(row);
    } else if (isTestDummyName || email.includes("test")) {
      otherDummyCampaigns.push(row);
    } else {
      cleanCampaigns.push(row);
    }
  }

  console.log("\n========================================================");
  console.log(`TARGET USER CAMPAIGNS (${matchedCampaigns.length}):`);
  console.log("========================================================");
  console.log(JSON.stringify(matchedCampaigns, null, 2));

  console.log("\n========================================================");
  console.log(`OTHER IDENTIFIED TEST/DUMMY CAMPAIGNS (${otherDummyCampaigns.length}):`);
  console.log("========================================================");
  console.log(JSON.stringify(otherDummyCampaigns, null, 2));

  console.log("\n========================================================");
  console.log(`REMAINING CAMPAIGNS (${cleanCampaigns.length}):`);
  console.log("========================================================");
  console.log(JSON.stringify(cleanCampaigns, null, 2));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
