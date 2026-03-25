-- Migration: Add login tracking columns to users table
-- Run on NeonDB before deploying the new build

ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip TEXT;
