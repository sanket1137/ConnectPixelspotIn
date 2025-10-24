
-- Phoenix Mall Food Court Display
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, operational_hours, images, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, number_of_screens, user_intent, user_mood, state
) VALUES (
  'be6961d2-5807-4a6f-804f-4fdbd5633be2', NULL, 'Phoenix Mall Food Court Display', 'Digital Display',
  '55 inch', 'LBS Marg, Kurla West, Mumbai', 'Mumbai', '400070', 19.0883000, 72.8889000,
  8000, 7, '{"start": "10:00", "end": "22:00"}', NULL, 'active', true,
  'Digital Display', 'Landscape', '1920x1080', 10, 'Phoenix Marketcity', 'Mall',
  15000, 'Mixed', ARRAY['Lunch Hours','Evening Leisure'], 'Indoor', ARRAY['Working Professionals','Students'],
  25, ARRAY['Shopping','Food','Entertainment'], 6, ARRAY['Static Image','Video'],
  true, 4, ARRAY['Shopping','Dining','Leisure'], ARRAY['Relaxed','Social'], 'Maharashtra'
) ON CONFLICT (id) DO NOTHING;

-- Starbucks Connaught Place
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, operational_hours, images, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, user_intent, user_mood, state
) VALUES (
  'e262300e-e328-4f1c-bdf7-adc8df04650e', NULL, 'Starbucks Connaught Place', 'Digital Display',
  '43 inch', 'Connaught Place, New Delhi', 'Delhi', '110001', 28.6315000, 77.2167000,
  5000, 3, '{"start": "07:00", "end": "23:00"}', NULL, 'active', true,
  'Digital Display', 'Portrait', '1080x1920', 8, 'Starbucks CP', 'Café',
  3000, 'Seated Audience', ARRAY['Morning Rush','Lunch Hours','Evening Leisure'], 'Indoor', ARRAY['Working Professionals','Business Owners'],
  35, ARRAY['Coffee','Tech','Business'], 8, ARRAY['Static Image','Video'],
  false, ARRAY['Work','Dining'], ARRAY['Relaxed','Focused'], 'Delhi'
) ON CONFLICT (id) DO NOTHING;

-- Indiranagar Metro Station
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, operational_hours, images, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, number_of_screens, user_intent, user_mood, state
) VALUES (
  '2998aebf-6a6e-4aad-88a6-c9b7c580cd66', NULL, 'Indiranagar Metro Station', 'Transit Display',
  '65 inch', 'Indiranagar, Bangalore', 'Bangalore', '560038', 12.9716000, 77.6412000,
  12000, 7, '{"start": "06:00", "end": "23:00"}', NULL, 'active', true,
  'Transit Display', 'Landscape', '1920x1080', 5, 'Indiranagar Metro', 'Metro',
  25000, 'Transit', ARRAY['Morning Rush','Evening Leisure'], 'Indoor', ARRAY['Working Professionals','Students'],
  3, ARRAY['Tech','Commute','Education'], 12, ARRAY['Static Image','Video'],
  true, 6, ARRAY['Commuting','Work'], ARRAY['Rushed','Focused'], 'Karnataka'
) ON CONFLICT (id) DO NOTHING;

-- Cult Fit Koramangala
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, operational_hours, images, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, user_intent, user_mood, state
) VALUES (
  '727e0cfc-7f92-4ccc-ae10-639f5a441baf', NULL, 'Cult Fit Koramangala', 'LED Video Wall',
  '10x6 ft', '5th Block, Koramangala, Bangalore', 'Bangalore', '560095', 12.9352000, 77.6245000,
  6000, 5, '{"start": "06:00", "end": "22:00"}', NULL, 'active', true,
  'LED Video Wall', 'Landscape', '3840x2160', 10, 'Cult.fit Koramangala', 'Gym',
  800, 'Mixed', ARRAY['Morning Rush','Evening Leisure'], 'Indoor', ARRAY['Working Professionals','Students'],
  45, ARRAY['Fitness','Health','Wellness'], 6, ARRAY['Video','Static Image'],
  false, ARRAY['Fitness','Entertainment'], ARRAY['Focused','Social'], 'Karnataka'
) ON CONFLICT (id) DO NOTHING;

-- DLF Cyber Hub Food Court
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, operational_hours, images, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, number_of_screens, user_intent, user_mood, state
) VALUES (
  'efa343f9-36b3-44e3-ad60-858fc69ddbb2', NULL, 'DLF Cyber Hub Food Court', 'Digital Display',
  '55 inch', 'DLF Cyber City, Gurgaon', 'Gurgaon', '122002', 28.4942000, 77.0897000,
  10000, 5, '{"start": "11:00", "end": "23:00"}', NULL, 'active', true,
  'Digital Display', 'Landscape', '1920x1080', 8, 'DLF Cyber Hub', 'Corporate Park',
  8000, 'Mixed', ARRAY['Lunch Hours','Evening Leisure'], 'Semi-Outdoor', ARRAY['Working Professionals','Business Owners'],
  30, ARRAY['Food','Business','Tech'], 8, ARRAY['Static Image','Video','HTML5'],
  true, 3, ARRAY['Dining','Work'], ARRAY['Relaxed','Social'], 'Haryana'
) ON CONFLICT (id) DO NOTHING;

-- VR Mall Surat Cinema Lobby
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, operational_hours, images, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, number_of_screens, user_intent, user_mood, state
) VALUES (
  '30a9b31e-9332-4a8c-9e0b-834aa562906a', NULL, 'VR Mall Surat Cinema Lobby', 'LED Video Wall',
  '8x12 ft', 'Dumas Road, Surat', 'Surat', '395007', 21.1702000, 72.8311000,
  7000, 3, '{"start": "10:00", "end": "00:00"}', NULL, 'active', true,
  'LED Video Wall', 'Portrait', '1080x1920', 10, 'VR Mall Surat', 'Cinema',
  12000, 'Mixed', ARRAY['Evening Leisure','Late Night'], 'Indoor', ARRAY['Students','Working Professionals'],
  15, ARRAY['Entertainment','Movies','Shopping'], 6, ARRAY['Video','Static Image'],
  true, 2, ARRAY['Entertainment','Leisure','Shopping'], ARRAY['Relaxed','Social','Leisure'], 'Gujarat'
) ON CONFLICT (id) DO NOTHING;

-- Prestige Tech Park Lobby
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, operational_hours, images, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, user_intent, user_mood, state
) VALUES (
  '4ff3038f-16a2-4881-bb25-3bf83d467621', NULL, 'Prestige Tech Park Lobby', 'Digital Display',
  '65 inch', 'Marathahalli, Bangalore', 'Bangalore', '560037', 12.9569000, 77.6978000,
  9000, 7, '{"start": "08:00", "end": "20:00"}', NULL, 'active', true,
  'Digital Display', 'Landscape', '1920x1080', 10, 'Prestige Tech Park', 'Corporate Park',
  5000, 'Mixed', ARRAY['Morning Rush','Lunch Hours','Evening Leisure'], 'Indoor', ARRAY['Working Professionals'],
  10, ARRAY['Tech','Business','Startups'], 6, ARRAY['Static Image','Video','HTML5'],
  false, ARRAY['Work','Commuting'], ARRAY['Focused','Rushed'], 'Karnataka'
) ON CONFLICT (id) DO NOTHING;

-- Lodha Luxury Apartment Lift
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, operational_hours, images, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, number_of_screens, user_intent, user_mood, state
) VALUES (
  '5757ace6-e24e-4b1b-a04f-a3b4b1a551b0', NULL, 'Lodha Luxury Apartment Lift', 'Lift Display',
  '32 inch', 'Mahalaxmi, Mumbai', 'Mumbai', '400011', 18.9825000, 72.8231000,
  15000, 14, '{"start": "00:00", "end": "23:59"}', NULL, 'active', true,
  'Lift Display', 'Portrait', '1080x1920', 6, 'Lodha Bellissimo', 'Apartment',
  2000, 'Mixed', ARRAY['Morning Rush','Evening Leisure'], 'Indoor', ARRAY['Business Owners','Working Professionals'],
  2, ARRAY['Luxury','Real Estate','Premium Services'], 10, ARRAY['Static Image','Video'],
  true, 8, ARRAY['Commuting','Leisure'], ARRAY['Relaxed'], 'Maharashtra'
) ON CONFLICT (id) DO NOTHING;