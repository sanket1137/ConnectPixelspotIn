-- ============================================================
-- INSERT: 33 New Screens â€” NH44/NH9 Highway Restaurants + CP67 Mall Mohali
-- Run against Neon production DB
-- ============================================================

BEGIN;

-- ============================================================
-- NH 44 HIGHWAY â€” Mannat Haveli Kurukshetra (3 screens)
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
  is_multi_screen, price_per_day, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour,
  content_types_supported,
  type, size, operational_hours,
  status, owned_by_admin
) VALUES
-- 1. KKR Parking (LED Screen, Landscape, Sound: Yes)
(
  'KKR Parking', 'LED Video Wall', 'Landscape', '1920x1080', 15,
  'Mannat Haveli Kurukshetra', 'NH 44, Pipli, Kurukshetra, Haryana 136131',
  'Kurukshetra', 'Haryana', '136131', 30.059219, 76.879279,
  'Restaurant', 13333, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Outdoor Digital', 'High',
  'Large outdoor LED screen at parking area of Mannat Haveli, NH 44 highway restaurant. 12x25 ft (300 sqft). Sound enabled.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  false, 2934, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '12x25 ft', '06:00 AM - 12:00 AM',
  'active', true
),
-- 2. KKR Restaurant Entry (Standy Pod 55", Portrait, No Sound)
(
  'KKR Restaurant Entry', 'Digital Display', 'Portrait', '1080x1920', 15,
  'Mannat Haveli Kurukshetra', 'NH 44, Pipli, Kurukshetra, Haryana 136131',
  'Kurukshetra', 'Haryana', '136131', 30.059219, 76.879279,
  'Restaurant', 13333, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Indoor', 'Medium',
  'Standing pod 55" display at restaurant entrance of Mannat Haveli, NH 44.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  false, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'Digital Display', '55 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
),
-- 3. KKR Lobby Entry (Standy Pod 55", Portrait)
(
  'KKR Lobby Entry', 'Digital Display', 'Portrait', '1080x1920', 15,
  'Mannat Haveli Kurukshetra', 'NH 44, Pipli, Kurukshetra, Haryana 136131',
  'Kurukshetra', 'Haryana', '136131', 30.059219, 76.879279,
  'Restaurant', 13333, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Indoor', 'Medium',
  'Standing pod 55" display at lobby entrance of Mannat Haveli, NH 44.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  false, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'Digital Display', '55 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
);

-- ============================================================
-- NH 44 HIGHWAY â€” Mannat Sitara, Karnal (2 screens)
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
  is_multi_screen, price_per_day, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour,
  content_types_supported,
  type, size, operational_hours,
  status, owned_by_admin
) VALUES
-- 4. Sitara Food Court Entry
(
  'Sitara Food Court Entry', 'Digital Display', 'Portrait', '1080x1920', 15,
  'Mannat Sitara', 'NH 44, Karnal, Haryana 132117',
  'Karnal', 'Haryana', '132117', 29.913446, 76.910647,
  'Restaurant', 8333, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Indoor', 'Medium',
  'Standing pod 55" display at food court entrance of Mannat Sitara, NH 44.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  false, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'Digital Display', '55 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
),
-- 5. Sitara Restaurant Entry
(
  'Sitara Restaurant Entry', 'Digital Display', 'Portrait', '1080x1920', 15,
  'Mannat Sitara', 'NH 44, Karnal, Haryana 132117',
  'Karnal', 'Haryana', '132117', 29.913446, 76.910647,
  'Restaurant', 8333, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Indoor', 'Medium',
  'Standing pod 55" display at restaurant entrance of Mannat Sitara, NH 44.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  false, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'Digital Display', '55 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
);

-- ============================================================
-- NH 44 HIGHWAY â€” Mannat Samalkha, Panipat (2 screens)
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
  is_multi_screen, price_per_day, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour,
  content_types_supported,
  type, size, operational_hours,
  status, owned_by_admin
) VALUES
-- 6. Samalkha Main Entry
(
  'Samalkha Main Entry', 'Digital Display', 'Portrait', '1080x1920', 15,
  'Mannat Samalkha', 'NH 44, Samalkha, Panipat, Haryana 132102',
  'Panipat', 'Haryana', '132102', 29.188752, 77.027595,
  'Restaurant', 9333, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Indoor', 'Medium',
  'Standing pod 55" display at main entrance of Mannat Samalkha, NH 44.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  false, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'Digital Display', '55 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
),
-- 7. Samalkha Restaurant
(
  'Samalkha Restaurant', 'Digital Display', 'Portrait', '1080x1920', 15,
  'Mannat Samalkha', 'NH 44, Samalkha, Panipat, Haryana 132102',
  'Panipat', 'Haryana', '132102', 29.188752, 77.027595,
  'Restaurant', 9333, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Indoor', 'Medium',
  'Standing pod 55" display at restaurant area of Mannat Samalkha, NH 44.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  false, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'Digital Display', '55 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
);

-- ============================================================
-- NH 44 HIGHWAY â€” Mannat Haveli Murthal (2 screens)
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
  is_multi_screen, price_per_day, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour,
  content_types_supported,
  type, size, operational_hours,
  status, owned_by_admin
) VALUES
-- 8. Murthal Lobby Entry (65" Standy Pod)
(
  'Murthal Lobby Entry', 'Digital Display', 'Portrait', '1080x1920', 15,
  'Mannat Haveli Murthal', 'NH 44, Murthal, Haryana 131039',
  'Murthal', 'Haryana', '131039', 29.065178, 77.063651,
  'Restaurant', 16667, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Indoor', 'Medium',
  'Standing pod 65" display at lobby entrance of Mannat Haveli Murthal, NH 44.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  false, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'Digital Display', '65 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
),
-- 9. Murthal Restaurant Entry (55" Standy Pod)
(
  'Murthal Restaurant Entry', 'Digital Display', 'Portrait', '1080x1920', 15,
  'Mannat Haveli Murthal', 'NH 44, Murthal, Haryana 131039',
  'Murthal', 'Haryana', '131039', 29.065178, 77.063651,
  'Restaurant', 16667, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Indoor', 'Medium',
  'Standing pod 55" display at restaurant entrance of Mannat Haveli Murthal, NH 44.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  false, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'Digital Display', '55 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
);

-- ============================================================
-- NH 9 HIGHWAY â€” Mannat Haveli Rohtak (1 screen)
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
  is_multi_screen, price_per_day, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour,
  content_types_supported,
  type, size, operational_hours,
  status, owned_by_admin
) VALUES
-- 10. RH Restaurant Entry
(
  'RH Restaurant Entry', 'Digital Display', 'Portrait', '1080x1920', 15,
  'Mannat Haveli Rohtak', 'NH 9, Rohtak, Haryana 124021',
  'Rohtak', 'Haryana', '124021', 28.844313, 76.677618,
  'Restaurant', 8333, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Indoor', 'Medium',
  'Standing pod 55" display at restaurant entrance of Mannat Haveli Rohtak, NH 9.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  false, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'Digital Display', '55 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
);

-- ============================================================
-- NH 9 HIGHWAY â€” Mannat Dhaba Rohtak (1 screen)
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
  is_multi_screen, price_per_day, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour,
  content_types_supported,
  type, size, operational_hours,
  status, owned_by_admin
) VALUES
-- 11. RH Dhaba Entry
(
  'RH Dhaba Entry', 'Digital Display', 'Portrait', '1080x1920', 15,
  'Mannat Dhaba Rohtak', 'NH 9, Rohtak, Haryana 124501',
  'Rohtak', 'Haryana', '124501', 28.811148, 76.720234,
  'Restaurant', 6667, 'Mixed',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Indoor', 'Medium',
  'Standing pod 55" display at entry of Mannat Dhaba Rohtak, NH 9.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Commuters','Local Residents'],
  30,
  ARRAY['Commuting','Dining'], ARRAY['Rushed','Relaxed'],
  false, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'Digital Display', '55 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
);

-- ============================================================
-- CP67 MALL MOHALI â€” Indoor Screens (10:00-23:00, 13hrs)
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
-- 12. TF-Food Court Pillars (20 units)
(
  'TF-Food Court Pillars', 'LED Video Wall', 'Portrait', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'LED video wall pillars at top floor food court of CP67 Mall. 20 units, 6x2.5 ft each (300 sqft total).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  true, 20, 9166, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '6x2.5 ft (x20 units)', '10:00 AM - 11:00 PM',
  'active', true
),
-- 13. Food Court Large Screen (3 units)
(
  'Food Court Large Screen', 'LED Video Wall', 'Landscape', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'Large LED video wall at food court of CP67 Mall. 3 units, 12x5 ft each (180 sqft total).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  true, 3, 8800, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '12x5 ft (x3 units)', '10:00 AM - 11:00 PM',
  'active', true
),
-- 14. Homeland opera Screen (2 units)
(
  'Homeland Opera Screen', 'LED Video Wall', 'Portrait', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'Medium',
  'LED video wall at Homeland Opera section of CP67 Mall. 2 units, 5x2 ft each (20 sqft total).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  true, 2, 1320, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '5x2 ft (x2 units)', '10:00 AM - 11:00 PM',
  'active', true
),
-- 15. Homeland opera Entry Screen
(
  'Homeland Opera Entry Screen', 'LED Video Wall', 'Landscape', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'Medium',
  'LED video wall at Homeland Opera entry of CP67 Mall. 6.3x5.3 ft (33.39 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, NULL, 1466, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '6.3x5.3 ft', '10:00 AM - 11:00 PM',
  'active', true
),
-- 16. Food Court Elevator Screen
(
  'Food Court Elevator Screen', 'LED Video Wall', 'Landscape', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'Large LED video wall at food court elevator area of CP67 Mall. 21x6 ft (126 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, NULL, 3666, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '21x6 ft', '10:00 AM - 11:00 PM',
  'active', true
),
-- 17. Elevator Screen 2nd Floor
(
  'Elevator Screen 2nd Floor', 'LED Video Wall', 'Landscape', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'LED video wall at 2nd floor elevator area of CP67 Mall. 18x4 ft (72 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, NULL, 3666, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '18x4 ft', '10:00 AM - 11:00 PM',
  'active', true
),
-- 18. Elevator Screen 1st Floor
(
  'Elevator Screen 1st Floor', 'LED Video Wall', 'Landscape', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'LED video wall at 1st floor elevator area of CP67 Mall. 18x2 ft (36 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, NULL, 3666, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '18x2 ft', '10:00 AM - 11:00 PM',
  'active', true
),
-- 19. Elevator Screen Ground Floor
(
  'Elevator Screen Ground Floor', 'LED Video Wall', 'Landscape', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'LED video wall at ground floor elevator area of CP67 Mall. 18x2 ft (36 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, NULL, 3666, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '18x2 ft', '10:00 AM - 11:00 PM',
  'active', true
),
-- 20. Ground Floor Vertical Screen (2 units)
(
  'Ground Floor Vertical Screen', 'LED Video Wall', 'Portrait', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'Medium',
  'Vertical LED video wall on ground floor of CP67 Mall. 2 units, 6.3x3.5 ft each (44.1 sqft total).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  true, 2, 1466, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '6.3x3.5 ft (x2 units)', '10:00 AM - 11:00 PM',
  'active', true
),
-- 21. GF Lift Lobby Screen (2 units)
(
  'GF Lift Lobby Screen', 'LED Video Wall', 'Portrait', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'Medium',
  'LED video wall at ground floor lift lobby of CP67 Mall. 2 units, 5x2 ft each (20 sqft total).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  true, 2, 3666, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '5x2 ft (x2 units)', '10:00 AM - 11:00 PM',
  'active', true
),
-- 22. First Floor Vertical Screen
(
  'First Floor Vertical Screen', 'LED Video Wall', 'Portrait', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'Medium',
  'Vertical LED video wall on first floor of CP67 Mall. 6x3.5 ft (21 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, NULL, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '6x3.5 ft', '10:00 AM - 11:00 PM',
  'active', true
),
-- 23. Second Floor PVR Square Pillar Screen
(
  'Second Floor PVR Square Pillar Screen', 'LED Video Wall', 'Portrait', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'LED video wall on square pillar near PVR, 2nd floor of CP67 Mall. 11x3.5 ft (38.5 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, NULL, 1834, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '11x3.5 ft', '10:00 AM - 11:00 PM',
  'active', true
),
-- 24. GF-Main Atrium Screen
(
  'GF-Main Atrium Screen', 'LED Video Wall', 'Portrait', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'Massive LED video wall at ground floor main atrium of CP67 Mall. 30x11.5 ft (345 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, NULL, 7334, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '30x11.5 ft', '10:00 AM - 11:00 PM',
  'active', true
),
-- 25. GF-UPR-Round-Screen
(
  'GF-UPR-Round-Screen', 'LED Video Wall', 'Square', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'Medium',
  'Round LED screen (upper) at ground floor of CP67 Mall. 10x11.5 ft (115 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, NULL, 366, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '10x11.5 ft (Round)', '10:00 AM - 11:00 PM',
  'active', true
),
-- 26. GF-DWN-Round-Screen
(
  'GF-DWN-Round-Screen', 'LED Video Wall', 'Square', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'Medium',
  'Round LED screen (lower) at ground floor of CP67 Mall. 13.5x11.5 ft (155.25 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, NULL, 734, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '13.5x11.5 ft (Round)', '10:00 AM - 11:00 PM',
  'active', true
),
-- 27. GF-Round-Screen
(
  'GF-Round-Screen', 'LED Video Wall', 'Square', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'Large round LED screen at ground floor of CP67 Mall. 28x11.5 ft (322 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, NULL, 2566, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '28x11.5 ft (Round)', '10:00 AM - 11:00 PM',
  'active', true
);

-- ============================================================
-- CP67 MALL MOHALI â€” Outdoor Screens (16:00-12:00, 20hrs)
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
  is_multi_screen, price_per_day, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour,
  content_types_supported,
  type, size, operational_hours,
  status, owned_by_admin
) VALUES
-- 28. Outdoor 8th Floor Screen (L-shape)
(
  'Outdoor 8th Floor Screen', 'LED Video Wall', 'Landscape', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 50000, 'Mixed',
  ARRAY['Evening Leisure','Late Night','Morning Rush'],
  'Outdoor Digital', 'High',
  'Massive L-shaped outdoor LED screen on 8th floor of CP67 Mall. 47x18.6 ft (874.2 sqft). Visible from Airport Road.',
  '16:00', '12:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals','Business Owners'],
  ARRAY['Commuters','Shoppers','Local Residents'],
  5,
  ARRAY['Shopping','Commuting','Entertainment'], ARRAY['Relaxed','Rushed','Social'],
  false, 7334, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '47x18.6 ft (L-shape)', '04:00 PM - 12:00 PM',
  'active', true
),
-- 29. Outdoor Zone 4 PVR Screen
(
  'Outdoor Zone 4 PVR Screen', 'LED Video Wall', 'Landscape', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 50000, 'Mixed',
  ARRAY['Evening Leisure','Late Night','Morning Rush'],
  'Outdoor Digital', 'High',
  'Massive outdoor LED screen near PVR Zone 4 of CP67 Mall. 35x19 ft (665 sqft). Visible from Airport Road.',
  '16:00', '12:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals','Business Owners'],
  ARRAY['Commuters','Shoppers','Local Residents'],
  5,
  ARRAY['Shopping','Commuting','Entertainment'], ARRAY['Relaxed','Rushed','Social'],
  false, 7334, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '35x19 ft', '04:00 PM - 12:00 PM',
  'active', true
),
-- 30. Apple Store Screen
(
  'Apple Store Screen', 'LED Video Wall', 'Portrait', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 40000, 'Mixed',
  ARRAY['Evening Leisure','Late Night','Morning Rush'],
  'Outdoor Digital', 'High',
  'LED video wall near Apple Store at CP67 Mall. 9.6x9.6 ft (92.16 sqft).',
  '16:00', '12:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals','Business Owners'],
  ARRAY['Commuters','Shoppers','Local Residents'],
  5,
  ARRAY['Shopping','Commuting','Entertainment'], ARRAY['Relaxed','Rushed','Social'],
  false, 5519, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '9.6x9.6 ft', '04:00 PM - 12:00 PM',
  'active', true
);

-- ============================================================
-- CP67 MALL MOHALI â€” Remaining Indoor Screens (10:00-23:00)
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
  is_multi_screen, price_per_day, min_booking_days,
  loop_duration, max_brands_per_loop, playback_slots_per_hour,
  content_types_supported,
  type, size, operational_hours,
  status, owned_by_admin
) VALUES
-- 31. Parking Screen
(
  'Parking Screen', 'LED Video Wall', 'Landscape', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 40000, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'LED video wall at parking area of CP67 Mall. 18x12 ft (216 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, 5866, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '18x12 ft', '10:00 AM - 11:00 PM',
  'active', true
),
-- 32. Z4-SF&TF-Curved Screen
(
  'Z4-SF&TF-Curved Screen', 'LED Video Wall', 'Portrait', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'Curved LED video wall at Zone 4, SF & TF of CP67 Mall. 14.5x12.5 ft (181.25 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, 4584, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '14.5x12.5 ft (Curved)', '10:00 AM - 11:00 PM',
  'active', true
),
-- 33. Digital Rectangular Pillars G floor
(
  'Digital Rectangular Pillars G Floor', 'LED Video Wall', 'Portrait', '2464x960', 15,
  'CP67 Mall Mohali', 'Airport Road, Sector 67, Mohali, Punjab 160062',
  'Mohali', 'Punjab', '160062', 30.677190, 76.724098,
  'Mall', 33333, 'Pedestrian',
  ARRAY['Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  'LED video wall on rectangular pillars at ground floor of CP67 Mall. 25x14 ft (350 sqft).',
  '10:00', '23:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Teenagers (13-17)','Young Adults (18-25)','Adults (26-40)'],
  'Mixed Gender', 'Premium Audience',
  ARRAY['Students','Working Professionals'],
  ARRAY['Shoppers','Local Residents'],
  90,
  ARRAY['Shopping','Dining','Entertainment'], ARRAY['Relaxed','Social','Leisure'],
  false, 1834, 1,
  180, 12, 240,
  ARRAY['Video','Static Image'],
  'LED Video Wall', '25x14 ft', '10:00 AM - 11:00 PM',
  'active', true
);

COMMIT;

-- ============================================================
-- VERIFICATION
-- ============================================================

\echo '=== Newly inserted screens ==='
SELECT name, category, city, venue_name, price_per_day, environment_type, status
FROM screens
WHERE venue_name IN (
  'Mannat Haveli Kurukshetra', 'Mannat Sitara', 'Mannat Samalkha',
  'Mannat Haveli Murthal', 'Mannat Haveli Rohtak', 'Mannat Dhaba Rohtak',
  'CP67 Mall Mohali'
)
ORDER BY venue_name, name;

\echo '=== Count of newly inserted screens ==='
SELECT venue_name, COUNT(*) as cnt
FROM screens
WHERE venue_name IN (
  'Mannat Haveli Kurukshetra', 'Mannat Sitara', 'Mannat Samalkha',
  'Mannat Haveli Murthal', 'Mannat Haveli Rohtak', 'Mannat Dhaba Rohtak',
  'CP67 Mall Mohali'
)
GROUP BY venue_name
ORDER BY venue_name;

\echo '=== Total screen count ==='
SELECT COUNT(*) as total_screens FROM screens;
