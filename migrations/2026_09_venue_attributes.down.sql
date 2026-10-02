-- Reverses 2026_09_venue_attributes.up.sql. Descriptions and avg_daily_footfall were never
-- changed, so nothing the backfill read from is lost.

BEGIN;

ALTER TABLE screens DROP COLUMN IF EXISTS footfall_note;
ALTER TABLE screens DROP COLUMN IF EXISTS custom_attributes;
ALTER TABLE screens DROP COLUMN IF EXISTS venue_attributes;

COMMIT;
