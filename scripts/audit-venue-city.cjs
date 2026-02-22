#!/usr/bin/env node
/**
 * Audit DB venue_category and city values to find mismatches
 */
require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const CANONICAL_VENUES = [
  'Airport', 'Apartment', 'Bus Stop', 'Café', 'Cinema', 'Co-working',
  'College', 'Corporate Park', 'Flyover', 'Gym', 'Highway', 'Hospital',
  'Mall', 'Metro', 'Office Building', 'Restaurant', 'Retail Store',
  'Road Junction', 'Road Side', 'Salon', 'Shopping Complex', 'Stadium'
];

const CITY_ALIASES = {
  'bangalore': 'Bengaluru',
  'banglore': 'Bengaluru',
  'bengalooru': 'Bengaluru',
  'bombay': 'Mumbai',
  'madras': 'Chennai',
  'calcutta': 'Kolkata',
  'poona': 'Pune',
  'trivandrum': 'Thiruvananthapuram',
  'cochin': 'Kochi',
  'mysore': 'Mysuru',
  'baroda': 'Vadodara',
  'pondicherry': 'Puducherry',
  'mangalore': 'Mangaluru',
  'vizag': 'Visakhapatnam',
  'visakapatnam': 'Visakhapatnam',
};

async function audit() {
  const client = await pool.connect();
  try {
    // --- Venue Category Audit ---
    console.log('=== VENUE CATEGORY AUDIT ===\n');
    const venues = await client.query(
      `SELECT venue_category, COUNT(*) as cnt
       FROM screens WHERE status = 'active'
       GROUP BY venue_category ORDER BY venue_category`
    );
    
    const nonStandard = [];
    for (const row of venues.rows) {
      const vc = row.venue_category;
      const isCanonical = CANONICAL_VENUES.includes(vc);
      const marker = isCanonical ? '  ✓' : '  ✗ NON-STANDARD';
      console.log(`${marker}  "${vc}" (${row.cnt} screens)`);
      if (!isCanonical) nonStandard.push(vc);
    }
    
    if (nonStandard.length > 0) {
      console.log(`\n⚠️  ${nonStandard.length} non-standard venue categories found: ${nonStandard.join(', ')}`);
    } else {
      console.log('\n✅ All venue categories match canonical list');
    }

    // Also check ALL screens (including non-active)
    console.log('\n--- All statuses ---');
    const venuesAll = await client.query(
      `SELECT venue_category, status, COUNT(*) as cnt
       FROM screens
       GROUP BY venue_category, status ORDER BY venue_category, status`
    );
    for (const row of venuesAll.rows) {
      const isCanonical = CANONICAL_VENUES.includes(row.venue_category);
      if (!isCanonical) {
        console.log(`  ✗ "${row.venue_category}" [${row.status}] (${row.cnt} screens)`);
      }
    }

    // --- City Name Audit ---
    console.log('\n\n=== CITY NAME AUDIT ===\n');
    const cities = await client.query(
      `SELECT city, COUNT(*) as cnt,
              SUM(CASE WHEN is_multi_screen = true AND number_of_screens IS NOT NULL
                       THEN number_of_screens ELSE 1 END) as physical_screens
       FROM screens WHERE status = 'active'
       GROUP BY city ORDER BY city`
    );
    
    const cityIssues = [];
    for (const row of cities.rows) {
      const normalized = CITY_ALIASES[row.city.toLowerCase()];
      const marker = normalized ? `  ✗ → should be "${normalized}"` : '  ✓';
      console.log(`${marker}  "${row.city}" (${row.cnt} rows, ${row.physical_screens} physical screens)`);
      if (normalized) cityIssues.push({ from: row.city, to: normalized, count: row.cnt });
    }
    
    if (cityIssues.length > 0) {
      console.log(`\n⚠️  ${cityIssues.length} city name issues found:`);
      cityIssues.forEach(c => console.log(`  "${c.from}" → "${c.to}" (${c.count} screens)`));
    } else {
      console.log('\n✅ All city names are standardized');
    }

    // --- Multi-screen analysis ---
    console.log('\n\n=== MULTI-SCREEN ANALYSIS ===\n');
    const multi = await client.query(
      `SELECT city, name, number_of_screens, is_multi_screen
       FROM screens
       WHERE status = 'active' AND is_multi_screen = true
       ORDER BY city, name`
    );
    if (multi.rows.length > 0) {
      console.log(`Found ${multi.rows.length} multi-screen listings:`);
      for (const row of multi.rows) {
        console.log(`  "${row.name}" in ${row.city}: ${row.number_of_screens} screens`);
      }
    } else {
      console.log('No multi-screen listings found among active screens');
    }

    // --- Total stats ---
    console.log('\n\n=== TOTAL STATS ===\n');
    const stats = await client.query(
      `SELECT
         COUNT(*) as total_rows,
         SUM(CASE WHEN is_multi_screen = true AND number_of_screens IS NOT NULL
                  THEN number_of_screens ELSE 1 END) as total_physical,
         COUNT(DISTINCT city) as distinct_cities
       FROM screens WHERE status = 'active'`
    );
    const s = stats.rows[0];
    console.log(`Total active screen rows: ${s.total_rows}`);
    console.log(`Total physical screens (counting multi): ${s.total_physical}`);
    console.log(`Distinct cities: ${s.distinct_cities}`);

    // Advertiser count
    const advCount = await client.query(
      `SELECT COUNT(*) as cnt FROM users WHERE role = 'advertiser'`
    );
    console.log(`Advertisers in DB: ${advCount.rows[0].cnt}`);

  } finally {
    client.release();
    await pool.end();
  }
}

audit().catch(console.error);
