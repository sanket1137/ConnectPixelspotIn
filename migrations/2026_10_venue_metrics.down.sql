-- Reverses 2026_10_venue_metrics.up.sql (local: back to the phase-5 venue_attributes column).
-- Screens created by imports stay; only the import_id link is dropped.

BEGIN;

DROP TABLE IF EXISTS city_master;
DROP TABLE IF EXISTS screen_imports;
DROP TABLE IF EXISTS venue_metric_definitions;

DROP INDEX IF EXISTS idx_screens_import_id;
ALTER TABLE screens DROP COLUMN IF EXISTS import_id;
DROP INDEX IF EXISTS idx_screens_dedupe_key;
ALTER TABLE screens DROP COLUMN IF EXISTS dedupe_key;

UPDATE screens SET venue_metrics = (venue_metrics - 'daily_footfall')
       || jsonb_build_object('monthly_footfall', (venue_metrics->>'daily_footfall')::numeric * 30)
 WHERE venue_metrics ? 'daily_footfall';
UPDATE screens SET venue_metrics = (venue_metrics - 'daily_admits')
       || jsonb_build_object('weekly_admits', (venue_metrics->>'daily_admits')::numeric * 7)
 WHERE venue_metrics ? 'daily_admits';

DROP INDEX IF EXISTS idx_screens_venue_metrics;
ALTER TABLE screens RENAME COLUMN venue_metrics TO venue_attributes;
ALTER TABLE screens ADD COLUMN IF NOT EXISTS custom_attributes jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
