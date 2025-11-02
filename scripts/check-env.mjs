#!/usr/bin/env node

/**
 * Pre-build Environment Validation Script
 * Ensures all required environment variables are present before building
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ENV_FILE = resolve(process.cwd(), '.env.production');

console.log('🔍 Validating environment configuration...\n');

// Check if .env.production exists
if (!existsSync(ENV_FILE)) {
  console.error('❌ Error: .env.production file not found!');
  console.error('Please create .env.production with all required variables');
  process.exit(1);
}

// Load environment variables manually
const envContent = readFileSync(ENV_FILE, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
});

// Required VITE_ variables (build-time)
const requiredViteVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_GOOGLE_MAPS_API_KEY',
];

// Required runtime variables (server-side)
const requiredRuntimeVars = [
  'DATABASE_URL',
  'AWS_SES_FROM_EMAIL',
  'AWS_SES_REGION',
  'SESSION_SECRET',
];

let hasErrors = false;

// Check VITE_ variables
console.log('Checking build-time variables (VITE_*):');
requiredViteVars.forEach(varName => {
  if (envVars[varName]) {
    const value = envVars[varName];
    const preview = value.length > 20 ? `${value.substring(0, 20)}...` : value;
    console.log(`  ✅ ${varName}: ${preview}`);
  } else {
    console.error(`  ❌ ${varName}: MISSING`);
    hasErrors = true;
  }
});

console.log('\nChecking runtime variables:');
requiredRuntimeVars.forEach(varName => {
  if (envVars[varName]) {
    console.log(`  ✅ ${varName}: SET`);
  } else {
    console.error(`  ❌ ${varName}: MISSING`);
    hasErrors = true;
  }
});

if (hasErrors) {
  console.error('\n❌ Environment validation failed!');
  console.error('Please add missing variables to .env.production');
  process.exit(1);
}

console.log('\n✅ All required environment variables are set');
console.log('✅ Ready to build!\n');
