-- ============================================================
-- Agency Media Plans Migration
-- Run this once on your production database to enable the
-- Agency user type and Media Planning features.
-- ============================================================

-- 1. Media Plans table (one plan per client pitch / campaign)
CREATE TABLE IF NOT EXISTS media_plans (
  id             VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      VARCHAR NOT NULL,          -- FK → users.id (role = 'agency')
  name           TEXT NOT NULL,             -- e.g. "Q3 Launch - Nike Delhi"
  client_brand   TEXT NOT NULL,             -- client / brand name
  start_date     TIMESTAMP NOT NULL,
  end_date       TIMESTAMP NOT NULL,
  budget         INTEGER NOT NULL DEFAULT 0, -- total budget in INR (paise NOT used here)
  agency_margin  INTEGER NOT NULL DEFAULT 0, -- markup % (0-99), hidden from client PDF
  notes          TEXT,                       -- internal or client-facing notes
  status         TEXT NOT NULL DEFAULT 'draft', -- draft | sent | executed
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_plans_agency_id ON media_plans(agency_id);
CREATE INDEX IF NOT EXISTS idx_media_plans_status    ON media_plans(status);

-- 2. Media Plan Items table (individual screen line items within a plan)
CREATE TABLE IF NOT EXISTS media_plan_items (
  id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id          VARCHAR NOT NULL,         -- FK → media_plans.id
  screen_id        VARCHAR NOT NULL,         -- FK → screens.id
  screen_owner_id  VARCHAR,                  -- denormalized for display (owner tag)
  days             INTEGER NOT NULL DEFAULT 1,
  price_per_day    INTEGER NOT NULL DEFAULT 0, -- net cost in INR
  total_price      INTEGER NOT NULL DEFAULT 0, -- = days * price_per_day (net, pre-margin)
  notes            TEXT,                     -- agency note for this screen
  status           TEXT NOT NULL DEFAULT 'included', -- included | removed
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_plan_items_plan_id   ON media_plan_items(plan_id);
CREATE INDEX IF NOT EXISTS idx_media_plan_items_screen_id ON media_plan_items(screen_id);
