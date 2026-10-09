/**
 * Script to create test users (screenowner & advertiser) in Firebase and PostgreSQL
 * 
 * Uses Firebase REST API (avoids Admin SDK private key issues locally)
 * and Drizzle ORM for PostgreSQL.
 * 
 * Users created:
 *   - screenowner@test.com (screen_owner role)
 *   - advertiser@test.com  (advertiser role)
 *   Password for both: Pwd@456
 * 
 * Usage: npx tsx create-test-users.ts
 */

import "./load-env.js";
import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";

// Firebase REST API key (same as client-side key)
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || "AIzaSyC5SM1bjIyRBroAC9l8lK5y_ngYzGBjERs";

const testUsers = [
  {
    email: "screenowner@test.com",
    name: "Screen Owner Test",
    role: "screen_owner",
    phone: "+919999900001",
  },
  {
    email: "advertiser@test.com",
    name: "Advertiser Test",
    role: "advertiser",
    phone: "+919999900002",
  },
];

const password = "Pwd@456";

// ─── FIREBASE REST API ────────────────────────────────────────────────────────
async function createOrGetFirebaseUser(email: string, pwd: string, name: string): Promise<string> {
  const SIGN_UP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

  // Try to sign up (create new user)
  const res = await fetch(SIGN_UP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pwd, displayName: name, returnSecureToken: true }),
  });

  const data = await res.json();

  if (data.error) {
    if (data.error.message === "EMAIL_EXISTS") {
      // User already exists – sign in to get UID
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: pwd, returnSecureToken: true }),
        }
      );
      const signInData = await signInRes.json();
      if (signInData.localId) {
        console.log(`  ⚠️  Firebase user already exists: ${email} → UID: ${signInData.localId}`);
        return signInData.localId;
      }
      throw new Error(`Firebase sign-in failed for ${email}: ${JSON.stringify(signInData.error)}`);
    }
    throw new Error(`Firebase error for ${email}: ${data.error.message}`);
  }

  console.log(`  ✅ Firebase user created: ${email} → UID: ${data.localId}`);
  return data.localId;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🚀 Creating test users...\n");

  for (const testUser of testUsers) {
    try {
      console.log(`📧 Processing ${testUser.email} (${testUser.role})...`);

      // Step 1: Create Firebase user via REST API
      const firebaseUid = await createOrGetFirebaseUser(testUser.email, password, testUser.name);

      // Step 2: Upsert database user
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, testUser.email))
        .limit(1);

      if (existingUser.length > 0) {
        await db
          .update(users)
          .set({
            firebaseUid,
            name: testUser.name,
            role: testUser.role,
            emailVerified: true,
            mobileVerified: true,
            mobileNumber: testUser.phone,
            phone: testUser.phone,
            profileCompleted: true,
            status: "active",
          })
          .where(eq(users.email, testUser.email));
        console.log(`  ✅ Updated existing database user`);
      } else {
        await db.insert(users).values({
          firebaseUid,
          email: testUser.email,
          name: testUser.name,
          role: testUser.role,
          emailVerified: true,
          mobileVerified: true,
          mobileNumber: testUser.phone,
          phone: testUser.phone,
          profileCompleted: true,
          status: "active",
        });
        console.log(`  ✅ Created new database user`);
      }

      console.log(`✅ Done: ${testUser.email}\n`);
    } catch (error: any) {
      console.error(`❌ Error processing ${testUser.email}:`, error.message);
      console.log();
    }
  }

  console.log("=".repeat(60));
  console.log("✅ Test user creation completed!");
  console.log("=".repeat(60));
  console.log("\nCredentials for testing:");
  console.log("─".repeat(60));
  testUsers.forEach((u) => {
    console.log(`  Role:     ${u.role}`);
    console.log(`  Email:    ${u.email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Phone:    ${u.phone}`);
    console.log();
  });
  console.log("─".repeat(60));
  console.log("Both users are ACTIVE with email & phone verification = true\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });
