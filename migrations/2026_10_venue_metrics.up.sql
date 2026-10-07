-- Venue metrics + admin Excel import (docs/plans/venue-metrics-and-bulk-onboarding.md).
-- Reversed by 2026_10_venue_metrics.down.sql. Run 2026_10_venue_metrics_seed.sql afterwards (metric definitions + cities).
--
-- Local DB: renames the phase-5 venue_attributes column to venue_metrics and drops the unused custom_attributes.
-- Production (where phase 5 never ran): creates venue_metrics + footfall_note directly.

BEGIN;

-- 1. screens.venue_metrics: { "flats": 420, "avg_flat_value": 15000000, ... } — filled keys only
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'screens' AND column_name = 'venue_attributes') THEN
    ALTER TABLE screens RENAME COLUMN venue_attributes TO venue_metrics;
  ELSE
    ALTER TABLE screens ADD COLUMN IF NOT EXISTS venue_metrics jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;
ALTER TABLE screens DROP COLUMN IF EXISTS custom_attributes;              -- replaced by admin-managed metric keys (was empty)
ALTER TABLE screens ADD COLUMN IF NOT EXISTS footfall_note text;           -- NULL | 'estimate' | 'hidden'
CREATE INDEX IF NOT EXISTS idx_screens_venue_metrics ON screens USING gin (venue_metrics);

-- Per-day metrics (prices are per day): monthly mall footfall → daily, weekly cinema admits → daily
UPDATE screens SET venue_metrics = (venue_metrics - 'monthly_footfall')
       || jsonb_build_object('daily_footfall', round((venue_metrics->>'monthly_footfall')::numeric / 30))
 WHERE venue_metrics ? 'monthly_footfall';
UPDATE screens SET venue_metrics = (venue_metrics - 'weekly_admits')
       || jsonb_build_object('daily_admits', round((venue_metrics->>'weekly_admits')::numeric / 7))
 WHERE venue_metrics ? 'weekly_admits';

-- 2. Duplicate fingerprint: venue name + screen name (letters/digits only, lower-case) + lat/lng to 4 decimals (~11 m).
--    Generated, so it is always in step with edits. Not unique: a few duplicates already exist (see the import plan).
ALTER TABLE screens ADD COLUMN IF NOT EXISTS dedupe_key text GENERATED ALWAYS AS (
  lower(regexp_replace(coalesce(venue_name, ''), '[^A-Za-z0-9]', '', 'g')) || '|' ||
  lower(regexp_replace(coalesce(name, ''), '[^A-Za-z0-9]', '', 'g')) || '|' ||
  coalesce(trunc(latitude, 4)::text, '') || '|' || coalesce(trunc(longitude, 4)::text, '')
) STORED;
CREATE INDEX IF NOT EXISTS idx_screens_dedupe_key ON screens (dedupe_key);

-- 3. Which import created a screen
ALTER TABLE screens ADD COLUMN IF NOT EXISTS import_id varchar;
CREATE INDEX IF NOT EXISTS idx_screens_import_id ON screens (import_id) WHERE import_id IS NOT NULL;

-- 4. Metric definitions per venue type (admin → Get template → Settings)
CREATE TABLE IF NOT EXISTS venue_metric_definitions (
  id           serial PRIMARY KEY,
  venue_type   text    NOT NULL,                 -- slug from shared/venueTaxonomy.ts, e.g. 'apartment'
  key          text    NOT NULL,                 -- snake_case, never changes once used
  label        text    NOT NULL,
  input_kind   text    NOT NULL,                 -- number | currency | enum | multi | boolean | text
  unit         text,
  help         text,
  options      jsonb   NOT NULL DEFAULT '[]'::jsonb,
  min_value    numeric,
  max_value    numeric,
  required     boolean NOT NULL DEFAULT false,
  show_on_card boolean NOT NULL DEFAULT false,   -- max 2 per venue type
  role         text,                             -- audience_size | affluence | dwell | frequency (drives derived metrics)
  sort_order   integer NOT NULL DEFAULT 0,
  active       boolean NOT NULL DEFAULT true,    -- false = hidden: no template column, not shown; data kept
  created_by   varchar,
  created_at   timestamp NOT NULL DEFAULT now(),
  updated_at   timestamp NOT NULL DEFAULT now(),
  CONSTRAINT venue_metric_definitions_type_key UNIQUE (venue_type, key),
  CONSTRAINT venue_metric_definitions_kind CHECK (input_kind IN ('number', 'currency', 'enum', 'multi', 'boolean', 'text'))
);

-- 5. Imports (drafts until every row is valid)
CREATE TABLE IF NOT EXISTS screen_imports (
  id            varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name     text    NOT NULL,
  file_hash     text    NOT NULL,              -- sha256 of the uploaded file: the same file can't be imported twice
  venue_type    text    NOT NULL,
  owner_id      varchar NOT NULL,
  host          text,
  screen_status text    NOT NULL DEFAULT 'pending',   -- status the screens get: pending | inactive | active
  rows          jsonb   NOT NULL DEFAULT '[]'::jsonb,
  state         text    NOT NULL DEFAULT 'draft',     -- draft | imported | discarded
  error_count   integer NOT NULL DEFAULT 0,
  screen_count  integer NOT NULL DEFAULT 0,
  created_by    varchar NOT NULL,
  updated_by    varchar,
  created_at    timestamp NOT NULL DEFAULT now(),
  updated_at    timestamp NOT NULL DEFAULT now(),
  imported_at   timestamp,
  CONSTRAINT screen_imports_state CHECK (state IN ('draft', 'imported', 'discarded'))
);
CREATE INDEX IF NOT EXISTS idx_screen_imports_hash ON screen_imports (file_hash);
CREATE INDEX IF NOT EXISTS idx_screen_imports_state ON screen_imports (state);

-- 6. City master: State → City for the template dropdown and import checks
CREATE TABLE IF NOT EXISTS city_master (
  id         serial PRIMARY KEY,
  state      text NOT NULL,
  city       text NOT NULL,
  created_by varchar,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT city_master_state_city UNIQUE (state, city)
);

COMMIT;
