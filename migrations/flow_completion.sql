-- ============================================================================
-- DOOH Flow Completion Migration
-- Date: 2026-03-07
-- Description: Adds slot model, creative workflow, Razorpay payments,
--              owner payouts, invoices, notifications, and bank details
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. SCREENS TABLE — Loop duration & brand slot model
-- ============================================================================

-- Add loop duration (total loop cycle in seconds)
ALTER TABLE screens ADD COLUMN IF NOT EXISTS loop_duration integer;

-- Add max brands per loop (auto-calculated: loop_duration / duration_per_slot)
ALTER TABLE screens ADD COLUMN IF NOT EXISTS max_brands_per_loop integer;

-- Make playback_slots_per_hour nullable (was NOT NULL, now auto-calculated)
-- First drop any NOT NULL constraints to make it nullable
ALTER TABLE screens ALTER COLUMN playback_slots_per_hour DROP NOT NULL;

-- Back-fill loop_duration for existing screens from playback_slots_per_hour
-- If a screen has 60 slots/hour with 10s per slot, loop = 3600/60 = 60s (one cycle)
-- We estimate: loop = (3600 / playback_slots_per_hour) * (3600 / duration_per_slot / playback_slots_per_hour)
-- Simpler approach: set a default loop of 120s for existing screens that don't have it
UPDATE screens
SET loop_duration = 120
WHERE loop_duration IS NULL;

-- Auto-calculate max_brands_per_loop for existing screens
UPDATE screens
SET max_brands_per_loop = CASE 
  WHEN duration_per_slot > 0 AND loop_duration > 0 
  THEN FLOOR(loop_duration::numeric / duration_per_slot::numeric)
  ELSE 1
END
WHERE max_brands_per_loop IS NULL;

-- Auto-recalculate playback_slots_per_hour from duration_per_slot
UPDATE screens
SET playback_slots_per_hour = CASE
  WHEN duration_per_slot > 0 THEN FLOOR(3600.0 / duration_per_slot)
  ELSE 360
END
WHERE playback_slots_per_hour IS NULL;

-- ============================================================================
-- 2. CAMPAIGNS TABLE — Summary, creative workflow, payment status
-- ============================================================================

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creative_file_url text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creative_file_type text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creative_status text DEFAULT 'pending';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creative_rejection_reason text;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creative_reviewed_by varchar;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS creative_reviewed_at timestamp;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';

-- ============================================================================
-- 3. PAYMENTS TABLE — Razorpay fields (alter existing table)
-- ============================================================================

-- Add new Razorpay gateway columns
ALTER TABLE payments ADD COLUMN IF NOT EXISTS campaign_id varchar;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS advertiser_id varchar;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_order_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_payment_id text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_signature text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id varchar;

-- Make booking_id nullable (campaign-level payments may not have a specific booking)
ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;

-- Change default method from 'stripe' to 'razorpay'
ALTER TABLE payments ALTER COLUMN method SET DEFAULT 'razorpay';

-- Rename old stripe column (keep for backward compat, don't drop)
-- stripePaymentIntentId is already nullable, just leave it

-- Add new indexes
CREATE INDEX IF NOT EXISTS idx_payments_campaign_id ON payments (campaign_id);
CREATE INDEX IF NOT EXISTS idx_payments_advertiser_id ON payments (advertiser_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_order ON payments (gateway_order_id);

-- ============================================================================
-- 4. USERS TABLE — Bank details for screen owner payouts
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_ifsc_code text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id text;

-- ============================================================================
-- 5. NEW TABLE: owner_payouts — Admin-controlled payouts to screen owners
-- ============================================================================

CREATE TABLE IF NOT EXISTS owner_payouts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id varchar NOT NULL,
  owner_id varchar NOT NULL,
  campaign_id varchar NOT NULL,
  screen_id varchar NOT NULL,
  total_owner_amount integer NOT NULL,
  payout_amount integer NOT NULL,
  platform_commission integer NOT NULL DEFAULT 0,
  payout_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending_admin',
  admin_initiated_by varchar,
  admin_initiated_at timestamp,
  owner_accepted_at timestamp,
  processed_at timestamp,
  expires_at timestamp,
  admin_notes text,
  transaction_ref text,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_owner_payouts_booking_id ON owner_payouts (booking_id);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_owner_id ON owner_payouts (owner_id);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_campaign_id ON owner_payouts (campaign_id);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_status ON owner_payouts (status);
CREATE INDEX IF NOT EXISTS idx_owner_payouts_expires ON owner_payouts (expires_at);

-- ============================================================================
-- 6. NEW TABLE: invoices — GST-compliant invoicing
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  type text NOT NULL,
  advertiser_id varchar,
  owner_id varchar,
  campaign_id varchar,
  booking_id varchar,
  payout_id varchar,
  subtotal integer NOT NULL,
  gst_percent integer NOT NULL DEFAULT 18,
  gst_amount integer NOT NULL,
  total_amount integer NOT NULL,
  advertiser_gst text,
  platform_gst text,
  status text NOT NULL DEFAULT 'draft',
  pdf_url text,
  issued_at timestamp,
  paid_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_advertiser_id ON invoices (advertiser_id);
CREATE INDEX IF NOT EXISTS idx_invoices_owner_id ON invoices (owner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_campaign_id ON invoices (campaign_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices (invoice_number);

-- ============================================================================
-- 7. NEW TABLE: notifications — In-app notification center
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  action_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);

-- ============================================================================
-- 8. CREATE SEQUENCE for invoice numbers
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1;

COMMIT;
