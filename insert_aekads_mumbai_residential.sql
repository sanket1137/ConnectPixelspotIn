-- ============================================================
-- INSERT: AekAds Mumbai/Thane Residential societies (host IND-02-AEK)
-- Generated 2026-09-28 from the AEK residential sheet (62 properties).
-- Price: ₹99/screen/day → price_per_day = 99, bundle_price_per_day = 99 × screens
-- is_multi_screen = true (bulk booking not mandatory, same as existing AEK residential)
-- Properties with both 28" lift and 43" screens are split into two listings (AEK convention).
-- Duration 10 s | Loop 90 s | 06:00–00:00 daily | min_booking_days 30
-- STATUS: all listings are inserted as 'inactive' — not visible on Discover until activated (query at the end).
--
-- SAFE TO RE-RUN: every insert is skipped if the same property + screen size already exists
-- for IND-02-AEK. Owner = the existing owner of IND-02-AEK screens (looked up, not hard-coded).
-- venue_type / environment_class / search_text / venue_attributes are filled here, so no
-- backfill is needed. Requires the phase-3 and phase-5 migrations on the target DB.
--
-- All 62 sheet properties included (coordinates for #21 and #41 supplied separately).
-- ============================================================

-- 0) Read-only pre-check — run first; lists sheet properties already in the DB for IND-02-AEK:
-- SELECT venue_name, size, status FROM screens WHERE host = 'IND-02-AEK' AND lower(venue_name) IN (
--   'new chandra chsl', 'dlh kesley chsl', 'shree rasraj tower', 'asmita jyoti chsl', 'omkar signate', 'metro heights', 'samudra darshan', 'jeevandeep chsl', 'mahadev chi wadi chsl', 'krupali geejays chsl', 'evershine crowne chsl', 'siddhivinayak tower', 'kalpavrush gardens chsl', 'skylon spaces chsl', 'mayfair greens chsl', 'vaishnavi chsl', 'avila chsl', 'malwani vandana chsl', 'lodha white city', 'shree shreyas chsl', 'astha vinayak chsl', 'pleasant chsl', 'sunrise tower chsl', 'navkar paradise chsl', 'vrindavan', 'neelyog veydaanta chs ltd', 'sharad chsl', 'powai jal vayu vihar chsl', 'royal nest', 'uppereast 97', 'arunoday heritage', 'marol hill veiw', 'bhoomi shivam', 'espee tower', 'symphony chs', 'mangla tower', 'fairfield chs', 'kabra galaxy star 2', 'trident c.h.s. ltd.', 'presidential tower', 'malad rajasthan', 'd&l rustomjee azziano co-operative housing society ltd.', 'ekta bhoomi classic', 'jaigad chsl', 'pratapgad chsl', 'shree chanakya', 'gurukrupa chs', 'neelkanth freesia chsl', 'shraddha vertica', 'viraaj chsl', 'unnathi woods wing b', 'al-burhan chsl', 'zainee chsl', 'neelkanth greens maple d1', 'pride residency', 'horizon classique 2', 'avenue 51 chsl', 'kamar chsl', 'the veena sur chsl', 'chanakya c&d', 'royal oasis', 'royal stone'
-- );

BEGIN;

-- Stop if the owner can't be found (nothing is inserted)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL) THEN
    RAISE EXCEPTION 'No existing IND-02-AEK screen with an owner — set owner_id manually';
  END IF;
END $$;

-- #1 NEW CHANDRA CHSL, Andheri West (12×43" = 12 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds NEW CHANDRA CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'NEW CHANDRA CHSL', 'NEW CHANDRA CHSL, Andheri West, Mumbai, Maharashtra 400053', 'Mumbai', 'Maharashtra', '400053', 19.19708363, 72.84729179,
  'Residential Society', 'apartment', 'indoor', 672, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at NEW CHANDRA CHSL, Andheri West. 6 towers, 12 screens, serving 168 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 12, 99, 1188, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":168,"residents":672,"towers":6}'::jsonb, '[]'::jsonb, 'new chandra chsl | aekads new chandra chsl mumbai 43 inch dual led | new chandra chsl andheri west mumbai maharashtra 400053 | mumbai | maharashtra | 400053 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('NEW CHANDRA CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #2 DLH KESLEY CHSL, Borivali West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds DLH KESLEY CHSL Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'DLH KESLEY CHSL', 'DLH KESLEY CHSL, Borivali West, Mumbai, Maharashtra 400092', 'Mumbai', 'Maharashtra', '400092', 19.21812179, 72.84881324,
  'Residential Society', 'apartment', 'indoor', 384, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at DLH KESLEY CHSL, Borivali West. 2 towers, 4 screens, serving 96 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":96,"residents":384,"towers":2}'::jsonb, '[]'::jsonb, 'dlh kesley chsl | aekads dlh kesley chsl mumbai 28 inch lift led | dlh kesley chsl borivali west mumbai maharashtra 400092 | mumbai | maharashtra | 400092 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('DLH KESLEY CHSL') AND size = '28 Inches (1080 x 1920)'
);

-- #3 Shree Rasraj Tower, Borivali West (2×28" lift = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Shree Rasraj Tower Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Shree Rasraj Tower', 'Shree Rasraj Tower, Borivali West, Mumbai, Maharashtra 400092', 'Mumbai', 'Maharashtra', '400092', 19.23702609, 72.85603842,
  'Residential Society', 'apartment', 'indoor', 400, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Shree Rasraj Tower, Borivali West. 2 towers, 2 screens, serving 100 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":100,"residents":400,"towers":2}'::jsonb, '[]'::jsonb, 'shree rasraj tower | aekads shree rasraj tower mumbai 28 inch lift led | shree rasraj tower borivali west mumbai maharashtra 400092 | mumbai | maharashtra | 400092 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Shree Rasraj Tower') AND size = '28 Inches (1080 x 1920)'
);

-- #4 Asmita Jyoti CHSL, Malvani Road Malad West (17×43" = 17 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Asmita Jyoti CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Asmita Jyoti CHSL', 'Asmita Jyoti CHSL, Malvani Road Malad West, Mumbai, Maharashtra 400095', 'Mumbai', 'Maharashtra', '400095', 19.19702707, 72.82453612,
  'Residential Society', 'apartment', 'indoor', 3900, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Asmita Jyoti CHSL, Malvani Road Malad West. 19 towers, 17 screens, serving 850 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 17, 99, 1683, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":850,"residents":3900,"towers":19}'::jsonb, '[]'::jsonb, 'asmita jyoti chsl | aekads asmita jyoti chsl mumbai 43 inch dual led | asmita jyoti chsl malvani road malad west mumbai maharashtra 400095 | mumbai | maharashtra | 400095 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Asmita Jyoti CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #5 Omkar Signate, Malad East (13×28" lift = 13 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Omkar Signate Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Omkar Signate', 'Omkar Signate, Malad East, Mumbai, Maharashtra 400097', 'Mumbai', 'Maharashtra', '400097', 19.18340471, 72.85878541,
  'Residential Society', 'apartment', 'indoor', 2352, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Omkar Signate, Malad East. 3 towers, 13 screens, serving 588 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 13, 99, 1287, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":588,"residents":2352,"towers":3}'::jsonb, '[]'::jsonb, 'omkar signate | aekads omkar signate mumbai 28 inch lift led | omkar signate malad east mumbai maharashtra 400097 | mumbai | maharashtra | 400097 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Omkar Signate') AND size = '28 Inches (1080 x 1920)'
);

-- #6 Metro heights, Kandivali West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Metro heights Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Metro heights', 'Metro heights, Kandivali West, Mumbai, Maharashtra 400067', 'Mumbai', 'Maharashtra', '400067', 19.21662399, 72.83971694,
  'Residential Society', 'apartment', 'indoor', 620, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Metro heights, Kandivali West. 2 towers, 4 screens, serving 150 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":150,"residents":620,"towers":2}'::jsonb, '[]'::jsonb, 'metro heights | aekads metro heights mumbai 28 inch lift led | metro heights kandivali west mumbai maharashtra 400067 | mumbai | maharashtra | 400067 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Metro heights') AND size = '28 Inches (1080 x 1920)'
);

-- #7 SAMUDRA DARSHAN, Andheri West (12×28" lift = 12 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds SAMUDRA DARSHAN Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'SAMUDRA DARSHAN', 'SAMUDRA DARSHAN, Andheri West, Mumbai, Maharashtra 400053', 'Mumbai', 'Maharashtra', '400053', 19.12323457, 72.82710947,
  'Residential Society', 'apartment', 'indoor', 2000, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at SAMUDRA DARSHAN, Andheri West. 7 towers, 12 screens, serving 491 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 12, 99, 1188, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":491,"residents":2000,"towers":7}'::jsonb, '[]'::jsonb, 'samudra darshan | aekads samudra darshan mumbai 28 inch lift led | samudra darshan andheri west mumbai maharashtra 400053 | mumbai | maharashtra | 400053 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('SAMUDRA DARSHAN') AND size = '28 Inches (1080 x 1920)'
);

-- #8 Jeevandeep CHSL, Kandivali West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Jeevandeep CHSL Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Jeevandeep CHSL', 'Jeevandeep CHSL, Kandivali West, Mumbai, Maharashtra 400067', 'Mumbai', 'Maharashtra', '400067', 19.21172837, 72.83534155,
  'Residential Society', 'apartment', 'indoor', 484, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Jeevandeep CHSL, Kandivali West. 2 towers, 4 screens, serving 121 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":121,"residents":484,"towers":2}'::jsonb, '[]'::jsonb, 'jeevandeep chsl | aekads jeevandeep chsl mumbai 28 inch lift led | jeevandeep chsl kandivali west mumbai maharashtra 400067 | mumbai | maharashtra | 400067 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Jeevandeep CHSL') AND size = '28 Inches (1080 x 1920)'
);

-- #9 Mahadev Chi Wadi CHSL, South Mumbai (7×43" = 7 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Mahadev Chi Wadi CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Mahadev Chi Wadi CHSL', 'Mahadev Chi Wadi CHSL, South Mumbai, Mumbai, Maharashtra 400012', 'Mumbai', 'Maharashtra', '400012', 19.00545785, 72.84668616,
  'Residential Society', 'apartment', 'indoor', 1150, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Mahadev Chi Wadi CHSL, South Mumbai. 8 towers, 7 screens, serving 285 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 7, 99, 693, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":285,"residents":1150,"towers":8}'::jsonb, '[]'::jsonb, 'mahadev chi wadi chsl | aekads mahadev chi wadi chsl mumbai 43 inch dual led | mahadev chi wadi chsl south mumbai mumbai maharashtra 400012 | mumbai | maharashtra | 400012 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Mahadev Chi Wadi CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #10 Krupali GeeJays Chsl, Borivali West (2×28" lift = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Krupali GeeJays Chsl Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Krupali GeeJays Chsl', 'Krupali GeeJays Chsl, Borivali West, Mumbai, Maharashtra 400092', 'Mumbai', 'Maharashtra', '400092', 19.21726254, 72.84792618,
  'Residential Society', 'apartment', 'indoor', 260, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Krupali GeeJays Chsl, Borivali West. 2 towers, 2 screens, serving 62 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":62,"residents":260,"towers":2}'::jsonb, '[]'::jsonb, 'krupali geejays chsl | aekads krupali geejays chsl mumbai 28 inch lift led | krupali geejays chsl borivali west mumbai maharashtra 400092 | mumbai | maharashtra | 400092 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Krupali GeeJays Chsl') AND size = '28 Inches (1080 x 1920)'
);

-- #11 Evershine Crowne Chsl, Thakur Village (8×28" lift = 8 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Evershine Crowne Chsl Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Evershine Crowne Chsl', 'Evershine Crowne Chsl, Thakur Village, Mumbai, Maharashtra 400101', 'Mumbai', 'Maharashtra', '400101', 19.214378, 72.872958,
  'Residential Society', 'apartment', 'indoor', 872, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Evershine Crowne Chsl, Thakur Village. 2 towers, 8 screens, serving 218 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 8, 99, 792, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":218,"residents":872,"towers":2}'::jsonb, '[]'::jsonb, 'evershine crowne chsl | aekads evershine crowne chsl mumbai 28 inch lift led | evershine crowne chsl thakur village mumbai maharashtra 400101 | mumbai | maharashtra | 400101 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Evershine Crowne Chsl') AND size = '28 Inches (1080 x 1920)'
);

-- #12 Siddhivinayak Tower, Borivali West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Siddhivinayak Tower Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Siddhivinayak Tower', 'Siddhivinayak Tower, Borivali West, Mumbai, Maharashtra 400092', 'Mumbai', 'Maharashtra', '400092', 19.2197774, 72.8370596,
  'Residential Society', 'apartment', 'indoor', 592, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Siddhivinayak Tower, Borivali West. 2 towers, 4 screens, serving 148 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":148,"residents":592,"towers":2}'::jsonb, '[]'::jsonb, 'siddhivinayak tower | aekads siddhivinayak tower mumbai 28 inch lift led | siddhivinayak tower borivali west mumbai maharashtra 400092 | mumbai | maharashtra | 400092 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Siddhivinayak Tower') AND size = '28 Inches (1080 x 1920)'
);

-- #13 KalpaVrush Gardens CHSL, Kandivali West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds KalpaVrush Gardens CHSL Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'KalpaVrush Gardens CHSL', 'KalpaVrush Gardens CHSL, Kandivali West, Mumbai, Maharashtra 400067', 'Mumbai', 'Maharashtra', '400067', 19.21566048, 72.83770618,
  'Residential Society', 'apartment', 'indoor', 320, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at KalpaVrush Gardens CHSL, Kandivali West. 2 towers, 4 screens, serving 80 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":80,"residents":320,"towers":2}'::jsonb, '[]'::jsonb, 'kalpavrush gardens chsl | aekads kalpavrush gardens chsl mumbai 28 inch lift led | kalpavrush gardens chsl kandivali west mumbai maharashtra 400067 | mumbai | maharashtra | 400067 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('KalpaVrush Gardens CHSL') AND size = '28 Inches (1080 x 1920)'
);

-- #14 SKYLON SPACES CHSL, Kandivali West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds SKYLON SPACES CHSL Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'SKYLON SPACES CHSL', 'SKYLON SPACES CHSL, Kandivali West, Mumbai, Maharashtra 400067', 'Mumbai', 'Maharashtra', '400067', 19.20083354, 72.84134864,
  'Residential Society', 'apartment', 'indoor', 688, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at SKYLON SPACES CHSL, Kandivali West. 2 towers, 4 screens, serving 172 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":172,"residents":688,"towers":2}'::jsonb, '[]'::jsonb, 'skylon spaces chsl | aekads skylon spaces chsl mumbai 28 inch lift led | skylon spaces chsl kandivali west mumbai maharashtra 400067 | mumbai | maharashtra | 400067 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('SKYLON SPACES CHSL') AND size = '28 Inches (1080 x 1920)'
);

-- #15 Mayfair Greens CHSL, Kandivali West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Mayfair Greens CHSL Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Mayfair Greens CHSL', 'Mayfair Greens CHSL, Kandivali West, Mumbai, Maharashtra 400067', 'Mumbai', 'Maharashtra', '400067', 19.21358271, 72.85277829,
  'Residential Society', 'apartment', 'indoor', 368, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Mayfair Greens CHSL, Kandivali West. 1 towers, 4 screens, serving 92 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":92,"residents":368,"towers":1}'::jsonb, '[]'::jsonb, 'mayfair greens chsl | aekads mayfair greens chsl mumbai 28 inch lift led | mayfair greens chsl kandivali west mumbai maharashtra 400067 | mumbai | maharashtra | 400067 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Mayfair Greens CHSL') AND size = '28 Inches (1080 x 1920)'
);

-- #16 Vaishnavi CHSL, Borivali West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Vaishnavi CHSL Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Vaishnavi CHSL', 'Vaishnavi CHSL, Borivali West, Mumbai, Maharashtra 400092', 'Mumbai', 'Maharashtra', '400092', 19.2327535, 72.82796444,
  'Residential Society', 'apartment', 'indoor', 564, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Vaishnavi CHSL, Borivali West. 2 towers, 4 screens, serving 141 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":141,"residents":564,"towers":2}'::jsonb, '[]'::jsonb, 'vaishnavi chsl | aekads vaishnavi chsl mumbai 28 inch lift led | vaishnavi chsl borivali west mumbai maharashtra 400092 | mumbai | maharashtra | 400092 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Vaishnavi CHSL') AND size = '28 Inches (1080 x 1920)'
);

-- #17 Avila chsl, Malad (1×43" = 1 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Avila chsl Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Avila chsl', 'Avila chsl, Malad, Mumbai, Maharashtra 400064', 'Mumbai', 'Maharashtra', '400064', 19.19259125, 72.83798091,
  'Residential Society', 'apartment', 'indoor', 112, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Avila chsl, Malad. 1 towers, 1 screens, serving 28 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 1, 99, 99, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":28,"residents":112,"towers":1}'::jsonb, '[]'::jsonb, 'avila chsl | aekads avila chsl mumbai 43 inch dual led | avila chsl malad mumbai maharashtra 400064 | mumbai | maharashtra | 400064 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Avila chsl') AND size = '43 Inches (1080 x 1920)'
);

-- #18 Malwani Vandana chsl, Malad (1×43" = 1 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Malwani Vandana chsl Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Malwani Vandana chsl', 'Malwani Vandana chsl, Malad, Mumbai, Maharashtra 400095', 'Mumbai', 'Maharashtra', '400095', 19.2024015, 72.82489596,
  'Residential Society', 'apartment', 'indoor', 224, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Malwani Vandana chsl, Malad. 1 towers, 1 screens, serving 56 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 1, 99, 99, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":56,"residents":224,"towers":1}'::jsonb, '[]'::jsonb, 'malwani vandana chsl | aekads malwani vandana chsl mumbai 43 inch dual led | malwani vandana chsl malad mumbai maharashtra 400095 | mumbai | maharashtra | 400095 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Malwani Vandana chsl') AND size = '43 Inches (1080 x 1920)'
);

-- #19 Lodha White City, Kandivali East (9×28" lift + 2×43" = 11 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Lodha White City Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Lodha White City', 'Lodha White City, Kandivali East, Mumbai, Maharashtra 400101', 'Mumbai', 'Maharashtra', '400101', 19.20093372, 72.87650895,
  'Residential Society', 'apartment', 'indoor', 1980, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Lodha White City, Kandivali East. 2 towers, 9 screens, serving 495 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 9, 99, 891, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":495,"residents":1980,"towers":2}'::jsonb, '[]'::jsonb, 'lodha white city | aekads lodha white city mumbai 28 inch lift led | lodha white city kandivali east mumbai maharashtra 400101 | mumbai | maharashtra | 400101 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Lodha White City') AND size = '28 Inches (1080 x 1920)'
);
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Lodha White City Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Lodha White City', 'Lodha White City, Kandivali East, Mumbai, Maharashtra 400101', 'Mumbai', 'Maharashtra', '400101', 19.20093372, 72.87650895,
  'Residential Society', 'apartment', 'indoor', 1980, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Lodha White City, Kandivali East. 2 towers, 2 screens, serving 495 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":495,"residents":1980,"towers":2}'::jsonb, '[]'::jsonb, 'lodha white city | aekads lodha white city mumbai 43 inch dual led | lodha white city kandivali east mumbai maharashtra 400101 | mumbai | maharashtra | 400101 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Lodha White City') AND size = '43 Inches (1080 x 1920)'
);

-- #20 Shree Shreyas CHSL, Santacruz (2×28" lift = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Shree Shreyas CHSL Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Shree Shreyas CHSL', 'Shree Shreyas CHSL, Santacruz, Mumbai, Maharashtra 400098', 'Mumbai', 'Maharashtra', '400098', 19.07807131, 72.86100804,
  'Residential Society', 'apartment', 'indoor', 128, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Shree Shreyas CHSL, Santacruz. 2 towers, 2 screens, serving 32 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":32,"residents":128,"towers":2}'::jsonb, '[]'::jsonb, 'shree shreyas chsl | aekads shree shreyas chsl mumbai 28 inch lift led | shree shreyas chsl santacruz mumbai maharashtra 400098 | mumbai | maharashtra | 400098 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Shree Shreyas CHSL') AND size = '28 Inches (1080 x 1920)'
);

-- #21 Astha Vinayak CHSL, Andheri West (2×28" lift = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Astha Vinayak CHSL Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Astha Vinayak CHSL', 'Astha Vinayak CHSL, Andheri West, Mumbai, Maharashtra 400068', 'Mumbai', 'Maharashtra', '400068', 19.128977, 72.832748,
  'Residential Society', 'apartment', 'indoor', 224, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Astha Vinayak CHSL, Andheri West. 1 towers, 2 screens, serving 56 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":56,"residents":224,"towers":1}'::jsonb, '[]'::jsonb, 'astha vinayak chsl | aekads astha vinayak chsl mumbai 28 inch lift led | astha vinayak chsl andheri west mumbai maharashtra 400068 | mumbai | maharashtra | 400068 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Astha Vinayak CHSL') AND size = '28 Inches (1080 x 1920)'
);

-- #22 Pleasant CHSL, Malad West (2×43" = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Pleasant CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Pleasant CHSL', 'Pleasant CHSL, Malad West, Mumbai, Maharashtra 400064', 'Mumbai', 'Maharashtra', '400064', 19.18876691, 72.83476282,
  'Residential Society', 'apartment', 'indoor', 224, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Pleasant CHSL, Malad West. 2 towers, 2 screens, serving 56 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":56,"residents":224,"towers":2}'::jsonb, '[]'::jsonb, 'pleasant chsl | aekads pleasant chsl mumbai 43 inch dual led | pleasant chsl malad west mumbai maharashtra 400064 | mumbai | maharashtra | 400064 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Pleasant CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #23 Sunrise tower chsl, Malad East (8×43" = 8 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Sunrise tower chsl Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Sunrise tower chsl', 'Sunrise tower chsl, Malad East, Mumbai, Maharashtra 400097', 'Mumbai', 'Maharashtra', '400097', 19.18306329, 72.85659117,
  'Residential Society', 'apartment', 'indoor', 480, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Sunrise tower chsl, Malad East. 2 towers, 8 screens, serving 120 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 8, 99, 792, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":120,"residents":480,"towers":2}'::jsonb, '[]'::jsonb, 'sunrise tower chsl | aekads sunrise tower chsl mumbai 43 inch dual led | sunrise tower chsl malad east mumbai maharashtra 400097 | mumbai | maharashtra | 400097 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Sunrise tower chsl') AND size = '43 Inches (1080 x 1920)'
);

-- #24 Navkar Paradise chsl, Borivali West (6×28" lift = 6 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Navkar Paradise chsl Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Navkar Paradise chsl', 'Navkar Paradise chsl, Borivali West, Mumbai, Maharashtra 400092', 'Mumbai', 'Maharashtra', '400092', 19.22920519, 72.84867586,
  'Residential Society', 'apartment', 'indoor', 540, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Navkar Paradise chsl, Borivali West. 3 towers, 6 screens, serving 135 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 6, 99, 594, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":135,"residents":540,"towers":3}'::jsonb, '[]'::jsonb, 'navkar paradise chsl | aekads navkar paradise chsl mumbai 28 inch lift led | navkar paradise chsl borivali west mumbai maharashtra 400092 | mumbai | maharashtra | 400092 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Navkar Paradise chsl') AND size = '28 Inches (1080 x 1920)'
);

-- #25 Vrindavan, Borivali West (6×28" lift = 6 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Vrindavan Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Vrindavan', 'Vrindavan, Borivali West, Mumbai, Maharashtra 400067', 'Mumbai', 'Maharashtra', '400067', 19.21675269, 72.8532904,
  'Residential Society', 'apartment', 'indoor', 544, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Vrindavan, Borivali West. 4 towers, 6 screens, serving 136 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 6, 99, 594, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":136,"residents":544,"towers":4}'::jsonb, '[]'::jsonb, 'vrindavan | aekads vrindavan mumbai 28 inch lift led | vrindavan borivali west mumbai maharashtra 400067 | mumbai | maharashtra | 400067 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Vrindavan') AND size = '28 Inches (1080 x 1920)'
);

-- #26 Neelyog Veydaanta CHS LTD, Ghatkopar West (11×28" lift = 11 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Neelyog Veydaanta CHS LTD Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Neelyog Veydaanta CHS LTD', 'Neelyog Veydaanta CHS LTD, Ghatkopar West, Mumbai, Maharashtra 400086', 'Mumbai', 'Maharashtra', '400086', 19.09130256, 72.9137489,
  'Residential Society', 'apartment', 'indoor', 800, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Neelyog Veydaanta CHS LTD, Ghatkopar West. 3 towers, 11 screens, serving 200 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 11, 99, 1089, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":200,"residents":800,"towers":3}'::jsonb, '[]'::jsonb, 'neelyog veydaanta chs ltd | aekads neelyog veydaanta chs ltd mumbai 28 inch lift led | neelyog veydaanta chs ltd ghatkopar west mumbai maharashtra 400086 | mumbai | maharashtra | 400086 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Neelyog Veydaanta CHS LTD') AND size = '28 Inches (1080 x 1920)'
);

-- #27 Sharad CHSL, Kurla East (9×43" = 9 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Sharad CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Sharad CHSL', 'Sharad CHSL, Kurla East, Mumbai, Maharashtra 400024', 'Mumbai', 'Maharashtra', '400024', 19.06423474, 72.8883795,
  'Residential Society', 'apartment', 'indoor', 1208, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Sharad CHSL, Kurla East. 9 towers, 9 screens, serving 302 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 9, 99, 891, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":302,"residents":1208,"towers":9}'::jsonb, '[]'::jsonb, 'sharad chsl | aekads sharad chsl mumbai 43 inch dual led | sharad chsl kurla east mumbai maharashtra 400024 | mumbai | maharashtra | 400024 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Sharad CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #28 Powai Jal Vayu vihar chsl, Powai (3×43" = 3 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Powai Jal Vayu vihar chsl Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Powai Jal Vayu vihar chsl', 'Powai Jal Vayu vihar chsl, Powai, Mumbai, Maharashtra 400076', 'Mumbai', 'Maharashtra', '400076', 19.11734971, 72.90517286,
  'Residential Society', 'apartment', 'indoor', 504, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Powai Jal Vayu vihar chsl, Powai. 3 towers, 3 screens, serving 126 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 3, 99, 297, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":126,"residents":504,"towers":3}'::jsonb, '[]'::jsonb, 'powai jal vayu vihar chsl | aekads powai jal vayu vihar chsl mumbai 43 inch dual led | powai jal vayu vihar chsl powai mumbai maharashtra 400076 | mumbai | maharashtra | 400076 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Powai Jal Vayu vihar chsl') AND size = '43 Inches (1080 x 1920)'
);

-- #29 Royal Nest, Malad West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Royal Nest Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Royal Nest', 'Royal Nest, Malad West, Mumbai, Maharashtra 400095', 'Mumbai', 'Maharashtra', '400095', 19.2048033, 72.8214262,
  'Residential Society', 'apartment', 'indoor', 600, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Royal Nest, Malad West. 2 towers, 4 screens, serving 135 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":135,"residents":600,"towers":2}'::jsonb, '[]'::jsonb, 'royal nest | aekads royal nest mumbai 28 inch lift led | royal nest malad west mumbai maharashtra 400095 | mumbai | maharashtra | 400095 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Royal Nest') AND size = '28 Inches (1080 x 1920)'
);

-- #30 UpperEast 97, Malad East (4×28" lift + 3×43" = 7 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds UpperEast 97 Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'UpperEast 97', 'UpperEast 97, Malad East, Mumbai, Maharashtra 400097', 'Mumbai', 'Maharashtra', '400097', 19.17556061, 72.85263777,
  'Residential Society', 'apartment', 'indoor', 600, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at UpperEast 97, Malad East. 7 towers, 4 screens, serving 130 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":130,"residents":600,"towers":7}'::jsonb, '[]'::jsonb, 'uppereast 97 | aekads uppereast 97 mumbai 28 inch lift led | uppereast 97 malad east mumbai maharashtra 400097 | mumbai | maharashtra | 400097 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('UpperEast 97') AND size = '28 Inches (1080 x 1920)'
);
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds UpperEast 97 Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'UpperEast 97', 'UpperEast 97, Malad East, Mumbai, Maharashtra 400097', 'Mumbai', 'Maharashtra', '400097', 19.17556061, 72.85263777,
  'Residential Society', 'apartment', 'indoor', 600, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at UpperEast 97, Malad East. 7 towers, 3 screens, serving 130 households.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 3, 99, 297, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"flats":130,"residents":600,"towers":7}'::jsonb, '[]'::jsonb, 'uppereast 97 | aekads uppereast 97 mumbai 43 inch dual led | uppereast 97 malad east mumbai maharashtra 400097 | mumbai | maharashtra | 400097 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('UpperEast 97') AND size = '43 Inches (1080 x 1920)'
);

-- #31 Arunoday Heritage, Bhandup West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Arunoday Heritage Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Arunoday Heritage', 'Arunoday Heritage, Bhandup West, Mumbai, Maharashtra 400078', 'Mumbai', 'Maharashtra', '400078', 19.15031962, 72.94123935,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Arunoday Heritage, Bhandup West. 2 towers, 4 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":2}'::jsonb, '[]'::jsonb, 'arunoday heritage | aekads arunoday heritage mumbai 28 inch lift led | arunoday heritage bhandup west mumbai maharashtra 400078 | mumbai | maharashtra | 400078 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Arunoday Heritage') AND size = '28 Inches (1080 x 1920)'
);

-- #32 Marol Hill Veiw, Andheri East (4×43" = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Marol Hill Veiw Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Marol Hill Veiw', 'Marol Hill Veiw, Andheri East, Mumbai, Maharashtra 400059', 'Mumbai', 'Maharashtra', '400059', 19.12136183, 72.88577276,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Marol Hill Veiw, Andheri East. 4 towers, 4 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":4}'::jsonb, '[]'::jsonb, 'marol hill veiw | aekads marol hill veiw mumbai 43 inch dual led | marol hill veiw andheri east mumbai maharashtra 400059 | mumbai | maharashtra | 400059 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Marol Hill Veiw') AND size = '43 Inches (1080 x 1920)'
);

-- #33 Bhoomi Shivam, Kandivali West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Bhoomi Shivam Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Bhoomi Shivam', 'Bhoomi Shivam, Kandivali West, Mumbai, Maharashtra 400067', 'Mumbai', 'Maharashtra', '400067', 19.21637099, 72.83354104,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Bhoomi Shivam, Kandivali West. 1 towers, 4 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'bhoomi shivam | aekads bhoomi shivam mumbai 28 inch lift led | bhoomi shivam kandivali west mumbai maharashtra 400067 | mumbai | maharashtra | 400067 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Bhoomi Shivam') AND size = '28 Inches (1080 x 1920)'
);

-- #34 Espee Tower, Borivali (2×28" lift + 1×43" = 3 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Espee Tower Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Espee Tower', 'Espee Tower, Borivali, Mumbai, Maharashtra 400066', 'Mumbai', 'Maharashtra', '400066', 19.22121419, 72.86206375,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Espee Tower, Borivali. 2 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{}'::jsonb, '[]'::jsonb, 'espee tower | aekads espee tower mumbai 28 inch lift led | espee tower borivali mumbai maharashtra 400066 | mumbai | maharashtra | 400066 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Espee Tower') AND size = '28 Inches (1080 x 1920)'
);
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Espee Tower Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Espee Tower', 'Espee Tower, Borivali, Mumbai, Maharashtra 400066', 'Mumbai', 'Maharashtra', '400066', 19.22121419, 72.86206375,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Espee Tower, Borivali. 1 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 1, 99, 99, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{}'::jsonb, '[]'::jsonb, 'espee tower | aekads espee tower mumbai 43 inch dual led | espee tower borivali mumbai maharashtra 400066 | mumbai | maharashtra | 400066 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Espee Tower') AND size = '43 Inches (1080 x 1920)'
);

-- #35 Symphony CHS, Kandivali West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Symphony CHS Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Symphony CHS', 'Symphony CHS, Kandivali West, Mumbai, Maharashtra 400067', 'Mumbai', 'Maharashtra', '400067', 19.20554526, 72.83419153,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Symphony CHS, Kandivali West. 2 towers, 4 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":2}'::jsonb, '[]'::jsonb, 'symphony chs | aekads symphony chs mumbai 28 inch lift led | symphony chs kandivali west mumbai maharashtra 400067 | mumbai | maharashtra | 400067 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Symphony CHS') AND size = '28 Inches (1080 x 1920)'
);

-- #36 Mangla Tower, Mulund West (1×43" = 1 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Mangla Tower Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Mangla Tower', 'Mangla Tower, Mulund West, Mumbai, Maharashtra 400080', 'Mumbai', 'Maharashtra', '400080', 19.16791323, 72.94294485,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Mangla Tower, Mulund West. 1 towers, 1 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 1, 99, 99, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'mangla tower | aekads mangla tower mumbai 43 inch dual led | mangla tower mulund west mumbai maharashtra 400080 | mumbai | maharashtra | 400080 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Mangla Tower') AND size = '43 Inches (1080 x 1920)'
);

-- #37 Fairfield CHS, Thane (9×43" = 9 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Fairfield CHS Thane - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Fairfield CHS', 'Fairfield CHS, Thane, Thane, Maharashtra 400601', 'Thane', 'Maharashtra', '400601', 19.21375912, 72.98760114,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Fairfield CHS, Thane. 9 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 9, 99, 891, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{}'::jsonb, '[]'::jsonb, 'fairfield chs | aekads fairfield chs thane 43 inch dual led | fairfield chs thane thane maharashtra 400601 | thane | maharashtra | 400601 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Fairfield CHS') AND size = '43 Inches (1080 x 1920)'
);

-- #38 Kabra Galaxy Star 2, Thane West (5×43" = 5 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Kabra Galaxy Star 2 Thane - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Kabra Galaxy Star 2', 'Kabra Galaxy Star 2, Thane West, Thane, Maharashtra 400607', 'Thane', 'Maharashtra', '400607', 19.24703485, 72.98368011,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Kabra Galaxy Star 2, Thane West. 4 towers, 5 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 5, 99, 495, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":4}'::jsonb, '[]'::jsonb, 'kabra galaxy star 2 | aekads kabra galaxy star 2 thane 43 inch dual led | kabra galaxy star 2 thane west thane maharashtra 400607 | thane | maharashtra | 400607 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Kabra Galaxy Star 2') AND size = '43 Inches (1080 x 1920)'
);

-- #39 Trident C.H.S. Ltd., Ghatkopar West (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Trident C.H.S. Ltd. Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Trident C.H.S. Ltd.', 'Trident C.H.S. Ltd., Ghatkopar West, Mumbai, Maharashtra 400086', 'Mumbai', 'Maharashtra', '400086', 19.09664964, 72.91200706,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Trident C.H.S. Ltd., Ghatkopar West. 2 towers, 4 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":2}'::jsonb, '[]'::jsonb, 'trident c h s ltd | aekads trident c h s ltd mumbai 28 inch lift led | trident c h s ltd ghatkopar west mumbai maharashtra 400086 | mumbai | maharashtra | 400086 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Trident C.H.S. Ltd.') AND size = '28 Inches (1080 x 1920)'
);

-- #40 Presidential Tower, Ghatkopar West (2×43" = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Presidential Tower Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Presidential Tower', 'Presidential Tower, Ghatkopar West, Mumbai, Maharashtra 400086', 'Mumbai', 'Maharashtra', '400086', 19.09863249, 72.91829026,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Presidential Tower, Ghatkopar West. 1 towers, 2 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'presidential tower | aekads presidential tower mumbai 43 inch dual led | presidential tower ghatkopar west mumbai maharashtra 400086 | mumbai | maharashtra | 400086 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Presidential Tower') AND size = '43 Inches (1080 x 1920)'
);

-- #41 Malad Rajasthan, Malad East (2×28" lift = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Malad Rajasthan Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Malad Rajasthan', 'Malad Rajasthan, Malad East, Mumbai, Maharashtra 400097', 'Mumbai', 'Maharashtra', '400097', 19.190944, 72.860398,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Malad Rajasthan, Malad East. 1 towers, 2 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'malad rajasthan | aekads malad rajasthan mumbai 28 inch lift led | malad rajasthan malad east mumbai maharashtra 400097 | mumbai | maharashtra | 400097 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Malad Rajasthan') AND size = '28 Inches (1080 x 1920)'
);

-- #42 D&L Rustomjee Azziano Co-operative Housing Society Ltd., Thane West (14×43" = 14 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds D&L Rustomjee Azziano Co-operative Housing Society Ltd. Thane - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'D&L Rustomjee Azziano Co-operative Housing Society Ltd.', 'D&L Rustomjee Azziano Co-operative Housing Society Ltd., Thane West, Thane, Maharashtra 400601', 'Thane', 'Maharashtra', '400601', 19.20901546, 72.98722548,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at D&L Rustomjee Azziano Co-operative Housing Society Ltd., Thane West. 2 towers, 14 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 14, 99, 1386, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":2}'::jsonb, '[]'::jsonb, 'd&l rustomjee azziano co operative housing society ltd | aekads d&l rustomjee azziano co operative housing society ltd thane 43 inch dual led | d&l rustomjee azziano co operative housing society ltd thane west thane maharashtra 400601 | thane | maharashtra | 400601 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('D&L Rustomjee Azziano Co-operative Housing Society Ltd.') AND size = '43 Inches (1080 x 1920)'
);

-- #43 Ekta Bhoomi Classic, Kandivali West (4×43" = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Ekta Bhoomi Classic Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Ekta Bhoomi Classic', 'Ekta Bhoomi Classic, Kandivali West, Mumbai, Maharashtra 400067', 'Mumbai', 'Maharashtra', '400067', 19.20959497, 72.8392563,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Ekta Bhoomi Classic, Kandivali West. 4 towers, 4 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":4}'::jsonb, '[]'::jsonb, 'ekta bhoomi classic | aekads ekta bhoomi classic mumbai 43 inch dual led | ekta bhoomi classic kandivali west mumbai maharashtra 400067 | mumbai | maharashtra | 400067 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Ekta Bhoomi Classic') AND size = '43 Inches (1080 x 1920)'
);

-- #44 Jaigad CHSL, Kandivali East (4×43" = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Jaigad CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Jaigad CHSL', 'Jaigad CHSL, Kandivali East, Mumbai, Maharashtra 400101', 'Mumbai', 'Maharashtra', '400101', 19.20499647, 72.87068596,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Jaigad CHSL, Kandivali East. 1 towers, 4 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'jaigad chsl | aekads jaigad chsl mumbai 43 inch dual led | jaigad chsl kandivali east mumbai maharashtra 400101 | mumbai | maharashtra | 400101 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Jaigad CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #45 Pratapgad CHSL, Kandivali East (5×43" = 5 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Pratapgad CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Pratapgad CHSL', 'Pratapgad CHSL, Kandivali East, Mumbai, Maharashtra 400101', 'Mumbai', 'Maharashtra', '400101', 19.20502662, 72.87110161,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Pratapgad CHSL, Kandivali East. 1 towers, 5 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 5, 99, 495, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'pratapgad chsl | aekads pratapgad chsl mumbai 43 inch dual led | pratapgad chsl kandivali east mumbai maharashtra 400101 | mumbai | maharashtra | 400101 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Pratapgad CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #46 Shree Chanakya, Kandivali West (3×43" = 3 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Shree Chanakya Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Shree Chanakya', 'Shree Chanakya, Kandivali West, Mumbai, Maharashtra 400092', 'Mumbai', 'Maharashtra', '400092', 19.21233055, 72.83636518,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Shree Chanakya, Kandivali West. 3 towers, 3 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 3, 99, 297, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":3}'::jsonb, '[]'::jsonb, 'shree chanakya | aekads shree chanakya mumbai 43 inch dual led | shree chanakya kandivali west mumbai maharashtra 400092 | mumbai | maharashtra | 400092 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Shree Chanakya') AND size = '43 Inches (1080 x 1920)'
);

-- #47 Gurukrupa CHS, Vikhroli East (4×28" lift = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Gurukrupa CHS Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Gurukrupa CHS', 'Gurukrupa CHS, Vikhroli East, Mumbai, Maharashtra 400083', 'Mumbai', 'Maharashtra', '400083', 19.11480834, 72.93378081,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Gurukrupa CHS, Vikhroli East. 2 towers, 4 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":2}'::jsonb, '[]'::jsonb, 'gurukrupa chs | aekads gurukrupa chs mumbai 28 inch lift led | gurukrupa chs vikhroli east mumbai maharashtra 400083 | mumbai | maharashtra | 400083 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Gurukrupa CHS') AND size = '28 Inches (1080 x 1920)'
);

-- #48 Neelkanth Freesia Chsl, Thane West (3×43" = 3 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Neelkanth Freesia Chsl Thane - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Neelkanth Freesia Chsl', 'Neelkanth Freesia Chsl, Thane West, Thane, Maharashtra 400610', 'Thane', 'Maharashtra', '400610', 19.24314532, 72.97078572,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Neelkanth Freesia Chsl, Thane West. 1 towers, 3 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 3, 99, 297, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'neelkanth freesia chsl | aekads neelkanth freesia chsl thane 43 inch dual led | neelkanth freesia chsl thane west thane maharashtra 400610 | thane | maharashtra | 400610 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Neelkanth Freesia Chsl') AND size = '43 Inches (1080 x 1920)'
);

-- #49 Shraddha Vertica, Vikhroli East (2×28" lift = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Shraddha Vertica Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Shraddha Vertica', 'Shraddha Vertica, Vikhroli East, Mumbai, Maharashtra 400083', 'Mumbai', 'Maharashtra', '400083', 19.11431365, 72.93391573,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Shraddha Vertica, Vikhroli East. 1 towers, 2 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'shraddha vertica | aekads shraddha vertica mumbai 28 inch lift led | shraddha vertica vikhroli east mumbai maharashtra 400083 | mumbai | maharashtra | 400083 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Shraddha Vertica') AND size = '28 Inches (1080 x 1920)'
);

-- #50 Viraaj CHSL, Malad East (2×43" = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Viraaj CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Viraaj CHSL', 'Viraaj CHSL, Malad East, Mumbai, Maharashtra 400097', 'Mumbai', 'Maharashtra', '400097', 19.17710094, 72.8723073,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Viraaj CHSL, Malad East. 1 towers, 2 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'viraaj chsl | aekads viraaj chsl mumbai 43 inch dual led | viraaj chsl malad east mumbai maharashtra 400097 | mumbai | maharashtra | 400097 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Viraaj CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #51 Unnathi Woods Wing B, Thane West (6×43" = 6 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Unnathi Woods Wing B Thane - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Unnathi Woods Wing B', 'Unnathi Woods Wing B, Thane West, Thane, Maharashtra 400615', 'Thane', 'Maharashtra', '400615', 19.26571924, 72.9721969,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Unnathi Woods Wing B, Thane West. 6 towers, 6 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 6, 99, 594, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":6}'::jsonb, '[]'::jsonb, 'unnathi woods wing b | aekads unnathi woods wing b thane 43 inch dual led | unnathi woods wing b thane west thane maharashtra 400615 | thane | maharashtra | 400615 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Unnathi Woods Wing B') AND size = '43 Inches (1080 x 1920)'
);

-- #52 Al-Burhan CHSL, Andheri East (2×43" = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Al-Burhan CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Al-Burhan CHSL', 'Al-Burhan CHSL, Andheri East, Mumbai, Maharashtra 400059', 'Mumbai', 'Maharashtra', '400059', 19.11468094, 72.87584709,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Al-Burhan CHSL, Andheri East. 2 towers, 2 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":2}'::jsonb, '[]'::jsonb, 'al burhan chsl | aekads al burhan chsl mumbai 43 inch dual led | al burhan chsl andheri east mumbai maharashtra 400059 | mumbai | maharashtra | 400059 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Al-Burhan CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #53 Zainee CHSL, Andheri East (2×43" = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Zainee CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Zainee CHSL', 'Zainee CHSL, Andheri East, Mumbai, Maharashtra 400059', 'Mumbai', 'Maharashtra', '400059', 19.11446698, 72.875317,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Zainee CHSL, Andheri East. 2 towers, 2 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":2}'::jsonb, '[]'::jsonb, 'zainee chsl | aekads zainee chsl mumbai 43 inch dual led | zainee chsl andheri east mumbai maharashtra 400059 | mumbai | maharashtra | 400059 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Zainee CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #54 Neelkanth Greens Maple D1, Thane West (2×28" lift + 1×43" = 3 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Neelkanth Greens Maple D1 Thane - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Neelkanth Greens Maple D1', 'Neelkanth Greens Maple D1, Thane West, Thane, Maharashtra 400610', 'Thane', 'Maharashtra', '400610', 19.24357326, 72.97078033,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Neelkanth Greens Maple D1, Thane West. 1 towers, 2 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'neelkanth greens maple d1 | aekads neelkanth greens maple d1 thane 28 inch lift led | neelkanth greens maple d1 thane west thane maharashtra 400610 | thane | maharashtra | 400610 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Neelkanth Greens Maple D1') AND size = '28 Inches (1080 x 1920)'
);
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Neelkanth Greens Maple D1 Thane - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Neelkanth Greens Maple D1', 'Neelkanth Greens Maple D1, Thane West, Thane, Maharashtra 400610', 'Thane', 'Maharashtra', '400610', 19.24357326, 72.97078033,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Neelkanth Greens Maple D1, Thane West. 1 towers, 1 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 1, 99, 99, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'neelkanth greens maple d1 | aekads neelkanth greens maple d1 thane 43 inch dual led | neelkanth greens maple d1 thane west thane maharashtra 400610 | thane | maharashtra | 400610 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Neelkanth Greens Maple D1') AND size = '43 Inches (1080 x 1920)'
);

-- #55 Pride Residency, Thane West (3×43" = 3 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Pride Residency Thane - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Pride Residency', 'Pride Residency, Thane West, Thane, Maharashtra 400615', 'Thane', 'Maharashtra', '400615', 19.26548826, 72.96394676,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Pride Residency, Thane West. 3 towers, 3 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 3, 99, 297, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":3}'::jsonb, '[]'::jsonb, 'pride residency | aekads pride residency thane 43 inch dual led | pride residency thane west thane maharashtra 400615 | thane | maharashtra | 400615 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Pride Residency') AND size = '43 Inches (1080 x 1920)'
);

-- #56 Horizon Classique 2, Thane West (1×43" = 1 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Horizon Classique 2 Thane - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Horizon Classique 2', 'Horizon Classique 2, Thane West, Thane, Maharashtra 400615', 'Thane', 'Maharashtra', '400615', 19.27593336, 72.96103891,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Horizon Classique 2, Thane West. 1 towers, 1 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 1, 99, 99, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'horizon classique 2 | aekads horizon classique 2 thane 43 inch dual led | horizon classique 2 thane west thane maharashtra 400615 | thane | maharashtra | 400615 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Horizon Classique 2') AND size = '43 Inches (1080 x 1920)'
);

-- #57 Avenue 51 CHSL, Santacruz East (2×43" = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Avenue 51 CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Avenue 51 CHSL', 'Avenue 51 CHSL, Santacruz East, Mumbai, Maharashtra 400098', 'Mumbai', 'Maharashtra', '400098', 19.07278659, 72.86424572,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Avenue 51 CHSL, Santacruz East. 1 towers, 2 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'avenue 51 chsl | aekads avenue 51 chsl mumbai 43 inch dual led | avenue 51 chsl santacruz east mumbai maharashtra 400098 | mumbai | maharashtra | 400098 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Avenue 51 CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #58 Kamar CHSL, Grant Road (2×43" = 2 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Kamar CHSL Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Kamar CHSL', 'Kamar CHSL, Grant Road, Mumbai, Maharashtra 400007', 'Mumbai', 'Maharashtra', '400007', 18.96514476, 72.8196521,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Kamar CHSL, Grant Road. 1 towers, 2 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 2, 99, 198, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'kamar chsl | aekads kamar chsl mumbai 43 inch dual led | kamar chsl grant road mumbai maharashtra 400007 | mumbai | maharashtra | 400007 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Kamar CHSL') AND size = '43 Inches (1080 x 1920)'
);

-- #59 The Veena Sur CHSL, Kandivali West (6×28" lift = 6 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds The Veena Sur CHSL Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'The Veena Sur CHSL', 'The Veena Sur CHSL, Kandivali West, Mumbai, Maharashtra 400067', 'Mumbai', 'Maharashtra', '400067', 19.21060983, 72.84031167,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at The Veena Sur CHSL, Kandivali West. 3 towers, 6 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 6, 99, 594, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":3}'::jsonb, '[]'::jsonb, 'the veena sur chsl | aekads the veena sur chsl mumbai 28 inch lift led | the veena sur chsl kandivali west mumbai maharashtra 400067 | mumbai | maharashtra | 400067 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('The Veena Sur CHSL') AND size = '28 Inches (1080 x 1920)'
);

-- #60 Chanakya C&D, Kandivali West (1×43" = 1 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Chanakya C&D Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Chanakya C&D', 'Chanakya C&D, Kandivali West, Mumbai, Maharashtra 400067', 'Mumbai', 'Maharashtra', '400067', 19.21235082, 72.83645102,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Chanakya C&D, Kandivali West. 1 towers, 1 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 1, 99, 99, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":1}'::jsonb, '[]'::jsonb, 'chanakya c&d | aekads chanakya c&d mumbai 43 inch dual led | chanakya c&d kandivali west mumbai maharashtra 400067 | mumbai | maharashtra | 400067 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Chanakya C&D') AND size = '43 Inches (1080 x 1920)'
);

-- #61 Royal Oasis, Malad West (12×28" lift + 1×43" = 13 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Royal Oasis Mumbai - 28 Inch Lift LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Royal Oasis', 'Royal Oasis, Malad West, Mumbai, Maharashtra 400095', 'Mumbai', 'Maharashtra', '400095', 19.2040325, 72.82112602,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '28-inch inside-lift LED screens at Royal Oasis, Malad West. 3 towers, 12 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 12, 99, 1188, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":3}'::jsonb, '[]'::jsonb, 'royal oasis | aekads royal oasis mumbai 28 inch lift led | royal oasis malad west mumbai maharashtra 400095 | mumbai | maharashtra | 400095 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Royal Oasis') AND size = '28 Inches (1080 x 1920)'
);
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Royal Oasis Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Royal Oasis', 'Royal Oasis, Malad West, Mumbai, Maharashtra 400095', 'Mumbai', 'Maharashtra', '400095', 19.2040325, 72.82112602,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Royal Oasis, Malad West. 3 towers, 1 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 1, 99, 99, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":3}'::jsonb, '[]'::jsonb, 'royal oasis | aekads royal oasis mumbai 43 inch dual led | royal oasis malad west mumbai maharashtra 400095 | mumbai | maharashtra | 400095 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Royal Oasis') AND size = '43 Inches (1080 x 1920)'
);

-- #62 Royal Stone, Vikhroli East (4×43" = 4 screens)
INSERT INTO screens (
  owner_id, host, name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, venue_type, environment_class, avg_daily_footfall, traffic_type, time_of_day_activity,
  environment_type, visibility, description,
  custom_operating_hours_start, custom_operating_hours_end, custom_operating_days,
  detailed_age_groups, gender_orientation, income_level, occupation_mix, lifestyle_tags, avg_dwell_time,
  user_intent, user_mood,
  is_multi_screen, number_of_screens, price_per_day, bundle_price_per_day, bulk_booking_mandatory, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour, content_types_supported,
  type, size, operational_hours, status, owned_by_admin,
  venue_attributes, custom_attributes, search_text
)
SELECT
  (SELECT owner_id FROM screens WHERE host = 'IND-02-AEK' AND owner_id IS NOT NULL LIMIT 1), 'IND-02-AEK',
  'AekAds Royal Stone Mumbai - 43 Inch Dual LED', 'Digital Display', 'Portrait', '1080x1920', 10,
  'Royal Stone', 'Royal Stone, Vikhroli East, Mumbai, Maharashtra 400083', 'Mumbai', 'Maharashtra', '400083', 19.11403974, 72.93553244,
  'Residential Society', 'apartment', 'indoor', 0, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'],
  'Indoor', 'Medium', '43-inch Dual LED screens at Royal Stone, Vikhroli East. 2 towers, 4 screens.',
  '06:00', '00:00', ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'], 'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Homemakers','Families'], ARRAY['Daily Commuters','Urban Residents'], 5,
  ARRAY['Daily Living','Commuting'], ARRAY['Relaxed','Routine'],
  true, 4, 99, 396, false, 30,
  90, 9, 40, ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM', 'inactive', true,
  '{"towers":2}'::jsonb, '[]'::jsonb, 'royal stone | aekads royal stone mumbai 43 inch dual led | royal stone vikhroli east mumbai maharashtra 400083 | mumbai | maharashtra | 400083 | ind 02 aek | residential society | apartment | residential'
WHERE NOT EXISTS (
  SELECT 1 FROM screens WHERE host = 'IND-02-AEK' AND lower(trim(venue_name)) = lower('Royal Stone') AND size = '43 Inches (1080 x 1920)'
);

COMMIT;

-- Expected: 67 listings (306 screens) from 62 properties, if none existed before.
-- Verify: SELECT status, count(*), sum(number_of_screens) FROM screens WHERE host = 'IND-02-AEK' AND venue_category = 'Residential Society' AND city IN ('Mumbai','Thane') GROUP BY status;
--
-- To make this batch live later (only these sheet properties):
-- UPDATE screens SET status = 'active' WHERE host = 'IND-02-AEK' AND status = 'inactive' AND venue_category = 'Residential Society'
--   AND lower(trim(venue_name)) IN ('new chandra chsl', 'dlh kesley chsl', 'shree rasraj tower', 'asmita jyoti chsl', 'omkar signate', 'metro heights', 'samudra darshan', 'jeevandeep chsl', 'mahadev chi wadi chsl', 'krupali geejays chsl', 'evershine crowne chsl', 'siddhivinayak tower', 'kalpavrush gardens chsl', 'skylon spaces chsl', 'mayfair greens chsl', 'vaishnavi chsl', 'avila chsl', 'malwani vandana chsl', 'lodha white city', 'shree shreyas chsl', 'astha vinayak chsl', 'pleasant chsl', 'sunrise tower chsl', 'navkar paradise chsl', 'vrindavan', 'neelyog veydaanta chs ltd', 'sharad chsl', 'powai jal vayu vihar chsl', 'royal nest', 'uppereast 97', 'arunoday heritage', 'marol hill veiw', 'bhoomi shivam', 'espee tower', 'symphony chs', 'mangla tower', 'fairfield chs', 'kabra galaxy star 2', 'trident c.h.s. ltd.', 'presidential tower', 'malad rajasthan', 'd&l rustomjee azziano co-operative housing society ltd.', 'ekta bhoomi classic', 'jaigad chsl', 'pratapgad chsl', 'shree chanakya', 'gurukrupa chs', 'neelkanth freesia chsl', 'shraddha vertica', 'viraaj chsl', 'unnathi woods wing b', 'al-burhan chsl', 'zainee chsl', 'neelkanth greens maple d1', 'pride residency', 'horizon classique 2', 'avenue 51 chsl', 'kamar chsl', 'the veena sur chsl', 'chanakya c&d', 'royal oasis', 'royal stone');
