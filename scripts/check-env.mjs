#!/usr/bin/env node

/**
 * Pre-build Environment Validation Script
 * Ensures all required environment variables are present before building
 * Works with both .env.production files and Replit Secrets
 * Skips validation in CI/deployment environments where env vars are injected later
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Skip validation in CI/deployment environments
// Replit deployments inject secrets AFTER the prebuild phase
const isCI = process.env.CI === 'true' || 
             process.env.REPL_ID || 
             process.env.REPLIT_DEPLOYMENT === '1' ||
             process.env.NODE_ENV === 'production';

if (isCI) {
  console.log('🚀 Running in CI/deployment environment');
  console.log('✅ Skipping environment validation (secrets injected at runtime)');
  console.log('✅ Ready to build!\n');
  process.exit(0);
}

const ENV_FILE = resolve(process.cwd(), '.env.production');

console.log('🔍 Validating environment configuration...\n');

// Load environment variables from .env.production if it exists
// Otherwise, use process.env (Replit Secrets)
let envVars = { ...process.env };

if (existsSync(ENV_FILE)) {
  console.log('📄 Loading variables from .env.production file...\n');
  const envContent = readFileSync(ENV_FILE, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  });
} else {
  console.log('📦 Using environment variables from Replit Secrets/process.env...\n');
}

// Required VITE_ variables (build-time)
const requiredViteVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_GOOGLE_MAPS_API_KEY',
];

// Required runtime variables (server-side)
const requiredRuntimeVars = [
  'DATABASE_URL',
  'SESSION_SECRET',
];

// Optional but recommended variables
const optionalVars = [
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'AWS_SES_FROM_EMAIL',
  'AWS_SES_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

let hasErrors = false;
let hasWarnings = false;

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

console.log('\nChecking optional variables:');
optionalVars.forEach(varName => {
  if (envVars[varName]) {
    console.log(`  ✅ ${varName}: SET`);
  } else {
    console.warn(`  ⚠️  ${varName}: NOT SET (optional)`);
    hasWarnings = true;
  }
});

if (hasErrors) {
  console.error('\n❌ Environment validation failed!');
  console.error('Please add missing variables to Replit Secrets or .env.production');
  process.exit(1);
}

if (hasWarnings) {
  console.log('\n⚠️  Some optional variables are not set');
  console.log('The app will build but some features may not work');
}

console.log('\n✅ All required environment variables are set');
console.log('✅ Ready to build!\n');
