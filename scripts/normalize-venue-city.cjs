#!/usr/bin/env node
/**
 * Normalize venue_category and city values in the screens table
 * to match canonical values from shared/constants.ts
 */
require('dotenv').config({ path: '.env.production' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Venue Category: non-standard -> canonical
const VENUE_FIXES = {
  'Cafe': 'Café',
  'Cinema Lobby': 'Cinema',
  'Food Court': 'Restaurant',
  'Healthcare': 'Hospital',
  'Hotel/Restaurant': 'Hotel',
  'Metro Station': 'Metro',
  'Office Complex': 'Office Building',
  'Shopping Mall': 'Mall',
};

// City: non-standard -> canonical
const CITY_FIXES = {
  'Bangalore': 'Bengaluru',
  'Baroda': 'Vadodara',
  'Cochin': 'Kochi',
  'Mysore': 'Mysuru',
  'Pondicherry': 'Puducherry',
  'Ahmedbad': 'Ahmedabad',
};

async function normalize() {
  const client = await pool.connect();
  let totalUpdated = 0;
  
  try {
    await client.query('BEGIN');

    // --- Fix venue categories ---
    console.log('=== VENUE CATEGORY NORMALIZATION ===\n');
    for (const [from, to] of Object.entries(VENUE_FIXES)) {
      const result = await client.query(
        `UPDATE screens SET venue_category = $1 WHERE venue_category = $2`,
        [to, from]
      );
      if (result.rowCount > 0) {
        console.log(`  ✓ "${from}" → "${to}": ${result.rowCount} rows updated`);
        totalUpdated += result.rowCount;
      } else {
        console.log(`  - "${from}" → "${to}": no rows found`);
      }
    }

    // --- Fix city names ---
    console.log('\n=== CITY NAME NORMALIZATION ===\n');
    for (const [from, to] of Object.entries(CITY_FIXES)) {
      const result = await client.query(
        `UPDATE screens SET city = $1 WHERE city = $2`,
        [to, from]
      );
      if (result.rowCount > 0) {
        console.log(`  ✓ "${from}" → "${to}": ${result.rowCount} rows updated`);
        totalUpdated += result.rowCount;
      } else {
        console.log(`  - "${from}" → "${to}": no rows found`);
      }
    }

    await client.query('COMMIT');
    console.log(`\n✅ Done. Total rows updated: ${totalUpdated}`);

    // --- Verify ---
    console.log('\n=== POST-NORMALIZATION VERIFICATION ===\n');
    
    const venues = await client.query(
      `SELECT venue_category, COUNT(*) as cnt
       FROM screens WHERE status = 'active'
       GROUP BY venue_category ORDER BY venue_category`
    );
    console.log('Venue categories after normalization:');
    for (const row of venues.rows) {
      console.log(`  "${row.venue_category}" (${row.cnt} screens)`);
    }

    const cities = await client.query(
      `SELECT city, COUNT(*) as cnt,
              SUM(CASE WHEN is_multi_screen = true AND number_of_screens IS NOT NULL
                       THEN number_of_screens ELSE 1 END) as physical_screens
       FROM screens WHERE status = 'active'
       GROUP BY city ORDER BY physical_screens DESC`
    );
    console.log('\nCities after normalization (by physical screens):');
    for (const row of cities.rows) {
      console.log(`  "${row.city}" — ${row.cnt} rows, ${row.physical_screens} physical screens`);
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

normalize().catch(console.error);
