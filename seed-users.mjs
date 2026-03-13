#!/usr/bin/env node

/**
 * Seed Script: Creates 3 dummy users (admin, screen_owner, advertiser)
 * - Creates Firebase Auth users via REST API
 * - Inserts matching rows directly into local PostgreSQL
 *
 * Usage: node --env-file=.env seed-users.mjs
 * (Run from ConnectPixelspotIn directory)
 */

import pg from './node_modules/pg/lib/index.js';
const { Pool } = pg;

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || 'AIzaSyC5SM1bjIyRBroAC9l8lK5y_ngYzGBjERs';
const DB_URL = process.env.DATABASE_URL || 'postgresql://jagpreetsingh@localhost:5432/postgres';

const USERS = [
  {
    email: 'admin@pixelspot.test',
    password: 'Admin@1234',
    name: 'Pixelspot Admin',
    role: 'admin',
  },
  {
    email: 'owner@pixelspot.test',
    password: 'Owner@1234',
    name: 'Screen Owner Demo',
    role: 'screen_owner',
  },
  {
    email: 'advertiser@pixelspot.test',
    password: 'Advert@1234',
    name: 'Advertiser Demo',
    role: 'advertiser',
  },
];

// ─── FIREBASE REST API ────────────────────────────────────────────────────────
async function createFirebaseUser(email, password, name) {
  const SIGN_UP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
  const LOOKUP_URL  = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`;

  // First try to sign up (create new user)
  const res = await fetch(SIGN_UP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName: name, returnSecureToken: true }),
  });

  const data = await res.json();

  if (data.error) {
    if (data.error.message === 'EMAIL_EXISTS') {
      // Try to sign in to get the UID
      const signInRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: true }),
        }
      );
      const signInData = await signInRes.json();
      if (signInData.localId) {
        console.log(`  ⚠️  Firebase user already exists: ${email} → UID: ${signInData.localId}`);
        return signInData.localId;
      }
    }
    throw new Error(`Firebase error for ${email}: ${data.error.message}`);
  }

  console.log(`  ✅ Firebase user created: ${email} → UID: ${data.localId}`);
  return data.localId;
}

// ─── POSTGRES INSERT ──────────────────────────────────────────────────────────
async function upsertDbUser(pool, { firebaseUid, email, name, role }) {
  // Check if user exists by firebase_uid
  const existing = await pool.query(
    'SELECT id FROM users WHERE firebase_uid = $1 OR email = $2 LIMIT 1',
    [firebaseUid, email]
  );

  if (existing.rows.length > 0) {
    // Update existing
    await pool.query(
      `UPDATE users SET firebase_uid=$1, email=$2, name=$3, role=$4,
       email_verified=true, profile_completed=true, status='active'
       WHERE id=$5`,
      [firebaseUid, email, name, role, existing.rows[0].id]
    );
    console.log(`  ⚠️  DB user updated: ${email} (role: ${role})`);
    return existing.rows[0].id;
  }

  // Insert new
  const result = await pool.query(
    `INSERT INTO users (firebase_uid, email, email_verified, name, role, status, profile_completed, created_at)
     VALUES ($1, $2, true, $3, $4, 'active', true, NOW())
     RETURNING id`,
    [firebaseUid, email, name, role]
  );
  console.log(`  ✅ DB user created: ${email} (role: ${role}) → id: ${result.rows[0].id}`);
  return result.rows[0].id;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 Seeding dummy test users...\n');
  console.log(`📦 Database: ${DB_URL.split('@').pop()}`);
  console.log(`🔑 Firebase project: ${FIREBASE_API_KEY.slice(0, 15)}...\n`);

  const pool = new Pool({ connectionString: DB_URL });

  const results = [];

  for (const user of USERS) {
    console.log(`\n👤 Creating ${user.role.toUpperCase()}: ${user.email}`);
    try {
      const firebaseUid = await createFirebaseUser(user.email, user.password, user.name);
      const dbId = await upsertDbUser(pool, { ...user, firebaseUid });
      results.push({ ...user, firebaseUid, dbId, status: 'ok' });
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
      results.push({ ...user, status: 'error', error: err.message });
    }
  }

  await pool.end();

  console.log('\n' + '═'.repeat(58));
  console.log('📋 SEED RESULTS — USER CREDENTIALS');
  console.log('═'.repeat(58));
  for (const r of results) {
    if (r.status === 'ok') {
      console.log(`\n  Role:     ${r.role}`);
      console.log(`  Email:    ${r.email}`);
      console.log(`  Password: ${r.password}`);
      console.log(`  DB ID:    ${r.dbId}`);
    } else {
      console.log(`\n  ❌ ${r.email} — ${r.error}`);
    }
  }
  console.log('\n' + '═'.repeat(58));
  console.log('✅ Done! Use the credentials above to log in at http://localhost:5001\n');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
