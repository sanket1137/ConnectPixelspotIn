-- Performance Optimization Migration
-- Run this on the production database before deploying the optimized code

-- ============================================================
-- 1. OTP Storage Table (for PM2 cluster mode support)
-- ============================================================
CREATE TABLE IF NOT EXISTS otps (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  code VARCHAR(6) NOT NULL,
  type TEXT NOT NULL,
  target TEXT NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_identifier ON otps (identifier);
CREATE INDEX IF NOT EXISTS idx_otps_expires ON otps (expires_at);

-- ============================================================
-- 2. Database Indexes for Query Performance
-- ============================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at);

-- Screens indexes
CREATE INDEX IF NOT EXISTS idx_screens_status ON screens (status);
CREATE INDEX IF NOT EXISTS idx_screens_owner_id ON screens (owner_id);
CREATE INDEX IF NOT EXISTS idx_screens_city ON screens (city);
CREATE INDEX IF NOT EXISTS idx_screens_status_city ON screens (status, city);
CREATE INDEX IF NOT EXISTS idx_screens_price_per_day ON screens (price_per_day);
CREATE INDEX IF NOT EXISTS idx_screens_created_at ON screens (created_at);

-- Screen tag assignments indexes
CREATE INDEX IF NOT EXISTS idx_screen_tag_assignments_screen_id ON screen_tag_assignments (screen_id);
CREATE INDEX IF NOT EXISTS idx_screen_tag_assignments_tag_id ON screen_tag_assignments (tag_id);

-- Campaigns indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_advertiser_id ON campaigns (advertiser_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns (created_at);

-- Bookings indexes
CREATE INDEX IF NOT EXISTS idx_bookings_screen_id ON bookings (screen_id);
CREATE INDEX IF NOT EXISTS idx_bookings_campaign_id ON bookings (campaign_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_screen_status ON bookings (screen_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings (created_at);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

-- AI Conversations indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_last_message ON ai_conversations (last_message_at);

-- AI Messages indexes
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages (conversation_id);

-- AI Rate Limits indexes
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_action ON ai_rate_limits (user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_expires ON ai_rate_limits (expires_at);
