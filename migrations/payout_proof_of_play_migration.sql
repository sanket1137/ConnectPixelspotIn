-- Migration: Payment/Payout/Proof-of-Play system overhaul
-- Date: 2025-07-14
-- Description: Adds proof_of_play table, payment deadline fields, payout type tracking

-- 1. Add payment_deadline_hours to users (per-owner configurable)
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_deadline_hours INTEGER DEFAULT 24;

-- 2. Add payment deadline and payout split columns to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_advance_amount INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS owner_final_amount INTEGER;

-- 3. Add payout_type and proof_of_play_id to owner_payouts
ALTER TABLE owner_payouts ADD COLUMN IF NOT EXISTS payout_type TEXT NOT NULL DEFAULT 'advance';
ALTER TABLE owner_payouts ADD COLUMN IF NOT EXISTS proof_of_play_id VARCHAR;

-- 4. Create proof_of_play table
CREATE TABLE IF NOT EXISTS proof_of_play (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id VARCHAR NOT NULL,
  campaign_id VARCHAR NOT NULL,
  screen_id VARCHAR NOT NULL,
  owner_id VARCHAR NOT NULL,
  file_urls JSONB NOT NULL DEFAULT '[]',
  owner_notes TEXT,
  admin_verified BOOLEAN NOT NULL DEFAULT FALSE,
  admin_verified_by VARCHAR,
  admin_verified_at TIMESTAMP,
  admin_notes TEXT,
  advertiser_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  advertiser_confirmed_at TIMESTAMP,
  advertiser_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Create indexes for proof_of_play
CREATE INDEX IF NOT EXISTS idx_proof_of_play_booking_id ON proof_of_play (booking_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_play_campaign_id ON proof_of_play (campaign_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_play_owner_id ON proof_of_play (owner_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_play_status ON proof_of_play (status);

-- 6. Add index for payment deadline lookups on bookings
CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline ON bookings (payment_deadline) WHERE payment_deadline IS NOT NULL;
