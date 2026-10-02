-- Template for bulk-inserting screens by SQL (like the insert_*.sql files in the repo root).
--
-- Screens created through the app get venue_type / environment_class / search_text filled
-- automatically. SQL inserts bypass the app, so either:
--   (a) fill them here (see the comments on each column), or
--   (b) leave them out and run afterwards (locally or on the target DB, with its own env file):
--         npx tsx scripts/venue/backfill-types.ts --apply
--       which recomputes them for every row (safe to re-run).
--
-- venue_category: prefer a label from shared/venueTaxonomy.ts (e.g. 'Apartment', 'Cinema audi',
-- 'Retail store', 'Bus station'); any known spelling also works ('Residential Building' → Apartment).
--
-- venue_attributes: the keys for the venue type, from shared/venueAttributes.ts. Money in rupees,
-- counts as plain numbers. Examples:
--   Apartment:      '{"flats": 660, "avg_flat_value": 12000000, "towers": 6, "lifts": 12}'
--   Cinema audi:    '{"seating_capacity": 162, "shows_per_day": 4, "cinema_tier": "Gold"}'
--   Bus station:    '{"passengers_per_day": 44103, "departures_per_day": 410}'
--   Corporate etc.: '{"employees": 2180, "companies": 40}'
-- custom_attributes: '[{"label": "Clubhouse members", "value": "400", "unit": "people"}]'

BEGIN;

INSERT INTO screens (
  name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, avg_daily_footfall, traffic_type, environment_type,
  avg_dwell_time, is_multi_screen, number_of_screens, price_per_day, min_booking_days,
  loop_duration, type, size, description, status, owned_by_admin, host,
  -- phase 3/5 columns (optional here — see (b) above)
  venue_type, environment_class, venue_attributes, custom_attributes
) VALUES
(
  'Stellar MI Citihomes — lift lobbies', 'Digital Display', 'Portrait', '1080x1920', 15,
  'Stellar MI Citihomes', 'Sector 1, Greater Noida', 'Greater Noida', 'Uttar Pradesh', '201310', 28.5881, 77.4498,
  'Apartment', 3000, 'Pedestrian', 'Indoor',
  2, true, 12, 576, 30,
  120, 'Digital Display', '32 inch', 'Lift-lobby screen network across 6 towers.', 'active', true, 'IND-10-BLM',
  'apartment', 'indoor', '{"flats": 660, "avg_flat_value": 12000000, "towers": 6, "lifts": 12}', '[]'
);

COMMIT;
