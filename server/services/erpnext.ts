import fetch from "node-fetch";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { User } from "@shared/schema";

/**
 * Creates a Lead in ERPNext when a user is both mobile and email verified.
 * 
 * ERPNext API: POST https://erp.pixelspot.in/api/resource/Lead
 * Strictly sends only:
 * - first_name (Always send)
 * - mobile_no (Always send)
 * - company_name (Send only if provided; otherwise leave it out)
 */
export async function checkAndCreateERPNextLead(user: User): Promise<void> {
  try {
    // 1. Trigger condition: User must be both mobile AND email verified
    if (!user.emailVerified || !user.mobileVerified) {
      return;
    }

    // 2. Prevent duplicate lead creation if already sent to ERPNext
    if (user.erpnextLeadCreated) {
      return;
    }

    // Extract first name (always send)
    const rawName = (user.name || "").trim();
    const firstName = rawName ? rawName.split(/\s+/)[0] : "User";

    // Extract mobile number (always send)
    const mobileNo = (user.mobileNumber || user.phone || "").trim();

    if (!mobileNo) {
      console.log(`[ERPNext] User ${user.id} (${user.email}) does not have a valid mobile number yet. Skipping.`);
      return;
    }

    // Build payload containing ONLY specified fields according to brief rules:
    // - first_name (Always send)
    // - mobile_no (Always send)
    // - company_name (Send only if the user provided it; otherwise leave it out)
    const payload: Record<string, string> = {
      first_name: firstName,
      mobile_no: mobileNo,
    };

    const company = (user.companyName || user.brandName || user.agencyName || "").trim();
    if (company) {
      payload.company_name = company;
    }

    console.log(`[ERPNext] Triggering Lead creation for user ${user.id} (${user.email}):`, payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Include ERPNext authentication token if configured in environment
    const apiKey = process.env.ERPNEXT_API_KEY;
    const apiSecret = process.env.ERPNEXT_API_SECRET;
    if (apiKey && apiSecret) {
      headers["Authorization"] = `token ${apiKey}:${apiSecret}`;
    }

    const response = await fetch("https://erp.pixelspot.in/api/resource/Lead", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const resText = await response.text();
    console.log(`[ERPNext] Response (${response.status}):`, resText);

    // If successfully created (200/201) or already exists (409 Conflict), mark user as created
    if (response.ok || response.status === 409) {
      await db
        .update(users)
        .set({ erpnextLeadCreated: true })
        .where(eq(users.id, user.id));
      console.log(`[ERPNext] Marked erpnextLeadCreated=true for user ${user.id}`);
    }
  } catch (error) {
    console.error(`[ERPNext] Failed to create Lead for user ${user.id}:`, error);
  }
}
