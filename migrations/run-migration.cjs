const { readFileSync } = require('fs');
const { resolve } = require('path');
const { Pool } = require('pg');

// Load .env file manually
const envPath = resolve(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
});

console.log('DATABASE_URL found:', !!process.env.DATABASE_URL);

const sql = readFileSync('migrations/flow_completion.sql', 'utf-8');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query(sql)
  .then(() => {
    console.log('Migration completed successfully');
    pool.end();
  })
  .catch(e => {
    console.error('Migration error:', e.message);
    console.error('Error detail:', JSON.stringify(e, null, 2));
    pool.end();
    process.exit(1);
  });
