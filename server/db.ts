// Reference: blueprint:javascript_database
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Maximum pool size
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 30000, // Give Neon 30s to wake up from cold start
  ssl: true,                  // Enforce SSL for Neon
});

// Prevent idle connection resets from crashing the Node.js process
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
});

export const db = drizzle({ client: pool, schema });
