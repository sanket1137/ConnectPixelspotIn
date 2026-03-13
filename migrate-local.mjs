import pg from './node_modules/pg/lib/index.js';
const { Pool } = pg;

const pool = new Pool({ connectionString: 'postgresql://jagpreetsingh@localhost:5432/postgres' });

const migrations = [
  // screens table — new columns
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS custom_operating_hours TEXT`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS custom_operating_days TEXT`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS operating_hours_preset TEXT`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS visibility TEXT`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS description TEXT`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS location_tags TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS custom_location_tags TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS detailed_age_groups TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS gender_orientation TEXT`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS income_level TEXT`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS occupation_mix TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS lifestyle_tags TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS avg_dwell_time INTEGER NOT NULL DEFAULT 5`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS interest_segments TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS custom_audience_tags TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS user_intent TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS user_mood TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS is_multi_screen BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS number_of_screens INTEGER`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS playback_slots_per_hour INTEGER NOT NULL DEFAULT 4`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS content_types_supported TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS screen_images TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS surrounding_images TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS rejection_reason TEXT`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS owned_by_admin BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS state TEXT`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS venue_category TEXT`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS avg_daily_footfall INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS traffic_type TEXT NOT NULL DEFAULT 'Mixed'`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS time_of_day_activity TEXT[]`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS environment_type TEXT NOT NULL DEFAULT 'Indoor'`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS display_format TEXT NOT NULL DEFAULT 'Landscape'`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS min_booking_days INTEGER NOT NULL DEFAULT 1`,
  `ALTER TABLE screens ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Digital Display'`,
  // users table
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS industry TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS gst_number TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT false`,
  // campaigns table
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_area JSONB`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_location_type TEXT`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_cities TEXT[]`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_state TEXT`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_pincodes TEXT[]`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_age_groups TEXT[]`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_gender TEXT`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_affluence TEXT[]`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_occupations TEXT[]`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_intent TEXT[]`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_mood TEXT[]`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS venue_type_filters TEXT[]`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS estimated_budget INTEGER`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS rejection_reason TEXT`,
  // blogs table
  `CREATE TABLE IF NOT EXISTS blogs (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    cover_image TEXT,
    author_id VARCHAR NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
  // bookings table
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_approved BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_response TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_responded_at TIMESTAMP`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS alternative_dates JSONB`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_notes TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS admin_responded_at TIMESTAMP`,
  // payments table
  `ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT`,
];

let ok = 0, fail = 0;
for (const sql of migrations) {
  try {
    await pool.query(sql);
    ok++;
  } catch(e) {
    if (!e.message.includes('already exists')) {
      console.error('FAIL:', e.message.substring(0, 120));
      fail++;
    } else {
      ok++;
    }
  }
}

console.log(`\n✅ Migration complete: ${ok} ok, ${fail} failed`);
await pool.end();
