-- ============================================================
-- INSERT: 6 Parking Barricade Screens — NH44/NH9 Highway Restaurants
-- Naming: Network VenueName City - Screen Name
-- Price: ₹1167/day + 10% platform = ₹1284/day
-- Run against Neon production DB
-- ============================================================

BEGIN;

-- ============================================================
-- NH 44 HIGHWAY — Parking Barricades (4 venues)
-- ============================================================

INSERT INTO screens (
  name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end,
  custom_operating_days,
  detailed_age_groups, gender_orientation, income_level,
  occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour,
  content_types_supported,
  type, size, operational_hours,
  status, owned_by_admin
) VALUES
-- 1. Mannat Haveli Kurukshetra — Parking Barricades (10 units, 3x4 ft each, 120 sqft)
(
  'NH 44 Mannat Haveli Kurukshetra - Parking Barricades',
  'Static Display', 'Landscape', 'Static Print', 0,
  'Mannat Haveli Kurukshetra', 'NH 44, Pipli, Kurukshetra, Haryana 136131',
  'Kurukshetra', 'Haryana', '136131', 30.0592189, 76.8792789,
  'Parking', 12000, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Outdoor', 'High',
  'Parking barricade advertising at Mannat Haveli Kurukshetra, NH 44. 10 units, 3x4 ft each (120 sqft total). Static image only.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  true, 10, 1284, 30,
  0, 1, 0,
  ARRAY['Static Image'],
  'Static Display', '3x4 ft (x10 units, 120 sqft)', '06:00 AM - 12:00 AM',
  'active', true
),
-- 2. Mannat Sitara Karnal — Parking Barricades (10 units, 3x4 ft each, 120 sqft)
(
  'NH 44 Mannat Sitara Karnal - Parking Barricades',
  'Static Display', 'Landscape', 'Static Print', 0,
  'Mannat Sitara', 'NH 44, Karnal, Haryana 132117',
  'Karnal', 'Haryana', '132117', 29.9134458, 76.9106469,
  'Parking', 7000, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Outdoor', 'High',
  'Parking barricade advertising at Mannat Sitara, NH 44. 10 units, 3x4 ft each (120 sqft total). Static image only.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  true, 10, 1284, 30,
  0, 1, 0,
  ARRAY['Static Image'],
  'Static Display', '3x4 ft (x10 units, 120 sqft)', '06:00 AM - 12:00 AM',
  'active', true
),
-- 3. Mannat Samalkha Panipat — Parking Barricades (10 units, 3x4 ft each, 120 sqft)
(
  'NH 44 Mannat Samalkha Panipat - Parking Barricades',
  'Static Display', 'Landscape', 'Static Print', 0,
  'Mannat Samalkha', 'NH 44, Samalkha, Panipat, Haryana 132102',
  'Panipat', 'Haryana', '132102', 29.1887517, 77.0275948,
  'Parking', 8000, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Outdoor', 'High',
  'Parking barricade advertising at Mannat Samalkha, NH 44. 10 units, 3x4 ft each (120 sqft total). Static image only.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  true, 10, 1284, 30,
  0, 1, 0,
  ARRAY['Static Image'],
  'Static Display', '3x4 ft (x10 units, 120 sqft)', '06:00 AM - 12:00 AM',
  'active', true
),
-- 4. Mannat Haveli Murthal — Parking Barricades (10 units, 3x4 ft each, 120 sqft)
(
  'NH 44 Mannat Haveli Murthal - Parking Barricades',
  'Static Display', 'Landscape', 'Static Print', 0,
  'Mannat Haveli Murthal', 'NH 44, Murthal, Haryana 131039',
  'Murthal', 'Haryana', '131039', 29.0651776, 77.0636513,
  'Parking', 15000, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Outdoor', 'High',
  'Parking barricade advertising at Mannat Haveli Murthal, NH 44. 10 units, 3x4 ft each (120 sqft total). Static image only.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  true, 10, 1284, 30,
  0, 1, 0,
  ARRAY['Static Image'],
  'Static Display', '3x4 ft (x10 units, 120 sqft)', '06:00 AM - 12:00 AM',
  'active', true
);

-- ============================================================
-- NH 9 HIGHWAY — Parking Barricades (2 venues)
-- ============================================================

INSERT INTO screens (
  name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end,
  custom_operating_days,
  detailed_age_groups, gender_orientation, income_level,
  occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour,
  content_types_supported,
  type, size, operational_hours,
  status, owned_by_admin
) VALUES
-- 5. Mannat Haveli Rohtak — Parking Barricades (10 units, 3x4 ft each, 120 sqft)
(
  'NH 9 Mannat Haveli Rohtak - Parking Barricades',
  'Static Display', 'Landscape', 'Static Print', 0,
  'Mannat Haveli Rohtak', 'NH 9, Rohtak, Haryana 124021',
  'Rohtak', 'Haryana', '124021', 28.8443134, 76.6776184,
  'Parking', 7000, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Outdoor', 'High',
  'Parking barricade advertising at Mannat Haveli Rohtak, NH 9. 10 units, 3x4 ft each (120 sqft total). Static image only.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  true, 10, 1284, 30,
  0, 1, 0,
  ARRAY['Static Image'],
  'Static Display', '3x4 ft (x10 units, 120 sqft)', '06:00 AM - 12:00 AM',
  'active', true
),
-- 6. Mannat Dhaba Rohtak — Parking Barricades (10 units, 3x4 ft each, 120 sqft)
(
  'NH 9 Mannat Dhaba Rohtak - Parking Barricades',
  'Static Display', 'Landscape', 'Static Print', 0,
  'Mannat Dhaba Rohtak', 'NH 9, Rohtak, Haryana 124501',
  'Rohtak', 'Haryana', '124501', 28.811148, 76.7202338,
  'Parking', 5000, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Outdoor', 'High',
  'Parking barricade advertising at Mannat Dhaba Rohtak, NH 9. 10 units, 3x4 ft each (120 sqft total). Static image only.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  true, 10, 1284, 30,
  0, 1, 0,
  ARRAY['Static Image'],
  'Static Display', '3x4 ft (x10 units, 120 sqft)', '06:00 AM - 12:00 AM',
  'active', true
);

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

\echo '=== Newly inserted parking barricade screens ==='
SELECT name, category, city, venue_name, price_per_day, number_of_screens, environment_type, status
FROM screens
WHERE name LIKE '%Parking Barricades%'
ORDER BY name;

\echo '=== Total screen count ==='
SELECT COUNT(*) as total_screens FROM screens;
