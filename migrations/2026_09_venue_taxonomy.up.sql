-- Phase 3: canonical venue type + environment class + search text on screens.
-- Additive and idempotent; reversed by 2026_09_venue_taxonomy.down.sql.
-- venue_category (raw vendor text) is kept untouched for audit.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE screens ADD COLUMN IF NOT EXISTS venue_type text;         -- canonical slug from shared/venueTaxonomy.ts, e.g. 'apartment'
ALTER TABLE screens ADD COLUMN IF NOT EXISTS environment_class text;  -- 'indoor' | 'outdoor'
ALTER TABLE screens ADD COLUMN IF NOT EXISTS search_text text;        -- lowercased, accent-free: names, address, city, type + aliases, host

CREATE INDEX IF NOT EXISTS idx_screens_venue_type ON screens (venue_type);
CREATE INDEX IF NOT EXISTS idx_screens_environment_class ON screens (environment_class);
CREATE INDEX IF NOT EXISTS idx_screens_search_text_trgm ON screens USING gin (search_text gin_trgm_ops);

COMMIT;
