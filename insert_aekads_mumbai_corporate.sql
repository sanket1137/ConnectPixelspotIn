-- ============================================================
-- INSERT: AekAds Mumbai Corporate (3 properties → 5 DB entries)
-- Network: AekAds | City: Mumbai | State: Maharashtra
-- Rate: ₹4,000/screen/month net (Mumbai Corporate)
-- price_per_day = round(rate × screens / 30 × 1.1) → ₹147/screen/day
-- Properties with mixed screen sizes split into separate entries
-- Duration: 10 sec per slot | Loop: 90 sec (1.5 min)
-- min_booking_days = 30 (monthly commitment)
-- ============================================================

BEGIN;

-- ============================================================
-- #1 Omega Business Park, Thane (3×28" + 2×43" = 5 screens)
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
-- 1a. Omega Business Park — 28 Inch Lift (3 screens, ₹441/day)
(
  'AekAds Omega Business Park Mumbai - 28 Inch Lift LED',
  'Digital Display', 'Portrait', '1080x1920', 10,
  'Omega Business Park',
  'Omega Business Park, Wagle Industrial Estate, Thane West, Maharashtra 400604',
  'Mumbai', 'Maharashtra', '400604', 19.2037254, 72.954676,
  'Corporate Office', 3232, 'Pedestrian',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  '28-inch inside-lift LED screens at Omega Business Park, Thane. 3 screens across 202 offices.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Upper Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Corporate','Business District'],
  2,
  ARRAY['Business','Work'], ARRAY['Focused','Professional'],
  true, 3, 441, 30,
  90, 9, 40,
  ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
),
-- 1b. Omega Business Park — 43 Inch Dual LED (2 screens, ₹294/day)
(
  'AekAds Omega Business Park Mumbai - 43 Inch Dual LED',
  'Digital Display', 'Portrait', '1080x1920', 10,
  'Omega Business Park',
  'Omega Business Park, Wagle Industrial Estate, Thane West, Maharashtra 400604',
  'Mumbai', 'Maharashtra', '400604', 19.2037254, 72.954676,
  'Corporate Office', 3232, 'Pedestrian',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  '43-inch Dual LED screens at Omega Business Park, Thane. 2 screens across 202 offices.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Upper Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Corporate','Business District'],
  5,
  ARRAY['Business','Work'], ARRAY['Focused','Professional'],
  true, 2, 294, 30,
  90, 9, 40,
  ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
);

-- ============================================================
-- #2 Fenkin 9, Thane (4×28" + 6×43" = 10 screens)
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
-- 2a. Fenkin 9 — 28 Inch Lift (4 screens, ₹588/day)
(
  'AekAds Fenkin 9 Mumbai - 28 Inch Lift LED',
  'Digital Display', 'Portrait', '1080x1920', 10,
  'Fenkin 9',
  'Fenkin 9, LBS Marg, Thane, Maharashtra 400080',
  'Mumbai', 'Maharashtra', '400080', 19.18781654, 72.95396265,
  'Corporate Office', 3200, 'Pedestrian',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  '28-inch inside-lift LED screens at Fenkin 9, Thane. 4 screens across 200 offices.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Upper Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Corporate','Business District'],
  2,
  ARRAY['Business','Work'], ARRAY['Focused','Professional'],
  true, 4, 588, 30,
  90, 9, 40,
  ARRAY['Video','Static Image'],
  'Digital Display', '28 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
),
-- 2b. Fenkin 9 — 43 Inch Dual LED (6 screens, ₹882/day)
(
  'AekAds Fenkin 9 Mumbai - 43 Inch Dual LED',
  'Digital Display', 'Portrait', '1080x1920', 10,
  'Fenkin 9',
  'Fenkin 9, LBS Marg, Thane, Maharashtra 400080',
  'Mumbai', 'Maharashtra', '400080', 19.18781654, 72.95396265,
  'Corporate Office', 3200, 'Pedestrian',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  '43-inch Dual LED screens at Fenkin 9, Thane. 6 screens across 200 offices.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Upper Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Corporate','Business District'],
  5,
  ARRAY['Business','Work'], ARRAY['Focused','Professional'],
  true, 6, 882, 30,
  90, 9, 40,
  ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
);

-- ============================================================
-- #3 Ashar IT Park, Thane (10×43" = 10 screens)
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
-- 3. Ashar IT Park — 43 Inch Dual LED (10 screens, ₹1,470/day)
(
  'AekAds Ashar IT Park Mumbai - 43 Inch Dual LED',
  'Digital Display', 'Portrait', '1080x1920', 10,
  'Ashar IT Park',
  'Ashar IT Park, Wagle Industrial Estate, Thane West, Maharashtra 400604',
  'Mumbai', 'Maharashtra', '400604', 19.19859089, 72.95474230,
  'Corporate Office', 3000, 'Pedestrian',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure'],
  'Indoor', 'High',
  '43-inch Dual LED screens at Ashar IT Park, Thane. 10 screens in IT park.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Upper Middle Income',
  ARRAY['Working Professionals','Business Owners'],
  ARRAY['Corporate','Business District'],
  5,
  ARRAY['Business','Work'], ARRAY['Focused','Professional'],
  true, 10, 1470, 30,
  90, 9, 40,
  ARRAY['Video','Static Image'],
  'Digital Display', '43 Inches (1080 x 1920)', '06:00 AM - 12:00 AM',
  'active', true
);

COMMIT;
