-- Phase 5: venue-specific audience inputs + footfall quality note on screens.
-- Additive and idempotent; reversed by 2026_09_venue_attributes.down.sql.
-- Definitions of the keys live in shared/venueAttributes.ts.

BEGIN;

ALTER TABLE screens ADD COLUMN IF NOT EXISTS venue_attributes jsonb NOT NULL DEFAULT '{}'::jsonb;  -- { "flats": 660, "avg_flat_value": 12000000, ... }
ALTER TABLE screens ADD COLUMN IF NOT EXISTS custom_attributes jsonb NOT NULL DEFAULT '[]'::jsonb; -- [{ "label": "Clubhouse members", "value": "400", "unit": "people" }]
ALTER TABLE screens ADD COLUMN IF NOT EXISTS footfall_note text;                                  -- NULL | 'estimate' (shown as "Est.") | 'hidden' (placeholder, not shown)

COMMIT;
