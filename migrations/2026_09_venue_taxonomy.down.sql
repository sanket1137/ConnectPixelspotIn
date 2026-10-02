-- Reverses 2026_09_venue_taxonomy.up.sql. venue_category (raw text) was never changed, so nothing is lost.
-- pg_trgm is left installed (other things may use it; harmless if unused).

BEGIN;

DROP INDEX IF EXISTS idx_screens_search_text_trgm;
DROP INDEX IF EXISTS idx_screens_environment_class;
DROP INDEX IF EXISTS idx_screens_venue_type;

ALTER TABLE screens DROP COLUMN IF EXISTS search_text;
ALTER TABLE screens DROP COLUMN IF EXISTS environment_class;
ALTER TABLE screens DROP COLUMN IF EXISTS venue_type;

COMMIT;
