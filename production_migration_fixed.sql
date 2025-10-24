-- PixelSpot Production Database Migration - CORRECTED VERSION
-- Generated from Development Database
-- Run this script in your PRODUCTION database

-- ==========================================
-- USERS TABLE
-- ==========================================

INSERT INTO users (id, firebase_uid, email, name, phone, role, status, created_at) VALUES
('2e1aa341-02c8-4424-b72f-e363e5a9a419', 'wIec40wsegWkJbBPnHSwZnYkKgr2', 'jaggi13js@gmail.com', 'Jagpreet singh', NULL, 'admin', 'active', '2025-10-05 18:49:23.417656'),
('d8827862-8017-46b0-a073-a1115c65d121', 'wb4evVcnlwdiuUvPlixbEGbYNq82', 'jaggi13js1@gmail.com', 'Jagpreet singh', NULL, 'screen_owner', 'active', '2025-10-05 19:02:24.138904'),
('3144de19-350b-4069-999f-2f6fba4472d8', 'iQImNRt5p1c8M4U5cyCXwbtSZLj1', 'is9212658454@gmail.com', 'Jagpreet Singh', NULL, 'advertiser', 'active', '2025-10-08 16:40:02.742022'),
('97b6e109-546d-41de-aa1a-a5c222010a76', 'VVrYZlAeimdJgtXQo3ywtc254mf2', 'sanketdhole595@gmail.com', 'SANKET DHOLE', NULL, 'screen_owner', 'active', '2025-10-12 17:29:39.994535'),
('47bac0d1-81ba-448a-b8ef-485798b3d0a7', 'oYAkeU39tacWsrNClLRvcJ9au7m2', 'sanketdhole109@gmail.com', 'Sanket Dhole', NULL, 'advertiser', 'active', '2025-10-12 17:35:44.537476'),
('9da7387e-1201-48d1-9854-72eb8bb6fe52', 'N1VFKY3AhOPqr85HoopvQSZEJvo1', 'test@gmail.com', 'jaggi test', NULL, 'advertiser', 'active', '2025-10-16 14:28:59.563621')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SCREENS TABLE - Admin Owned Screens
-- ==========================================

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

-- ==========================================
-- SCREENS TABLE - User Owned Screens
-- ==========================================

-- Jagpreet Singh 6
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, operational_hours, images, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen
) VALUES (
  '4b30c180-c558-49eb-8085-9ace15ffdd5e', 'd8827862-8017-46b0-a073-a1115c65d121', 'Jagpreet Singh 6', 'LED Video Wall',
  '1290 x3990', 'SPS Enclave f11, 1st Main Rd, Judicial Layout 2nd Phase, Jyotipuram, Doddakallasandra S.O',
  'Bangalore South', '560062', 12.9238111, 77.5933679,
  50, 10, '{"start":"08:00","end":"22:00"}', ARRAY['/objects/uploads/b9cafdd1-3536-4f1c-9cf3-2f8d1837ddb3'], 'active', false,
  'LED Video Wall', 'Portrait', '1290 x3990', 10, 'asdas', 'Café',
  5000, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure','Late Night','Lunch Hours'], 'Indoor', ARRAY['Working Professionals'],
  1, ARRAY['tag'], 6, ARRAY['Video','Static Image'],
  false
) ON CONFLICT (id) DO NOTHING;

-- Screen 1
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, user_intent, user_mood, state
) VALUES (
  '37b1d5bb-8662-4df5-81b9-d7bac919a8ee', '97b6e109-546d-41de-aa1a-a5c222010a76', 'Screen 1', 'LED Video Wall',
  '1920x1080', 'Mg road', 'Bengaluru', '560001', 12.0000000, 77.0000000,
  6000, 10, 'active', false,
  'LED Video Wall', 'Landscape', '1920x1080', 10, 'IndiraNagar', 'Salon',
  700, 'Seated Audience', ARRAY['Morning Rush'], 'Semi-Outdoor', ARRAY['Working Professionals'],
  10, ARRAY[]::text[], 6, ARRAY['Video','Interactive'],
  false, ARRAY['Shopping','Dining','Entertainment'], ARRAY['Social'], 'Karnataka'
) ON CONFLICT (id) DO NOTHING;

-- Screen 2
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, user_intent, user_mood, state
) VALUES (
  '3732c5c5-9057-4656-8a18-eddae69cae80', '97b6e109-546d-41de-aa1a-a5c222010a76', 'Screen 2', 'Kiosk',
  '1920x1080', 'Mg road', 'Bengaluru', '560001', 72.8765430, 70.8675654,
  2000, 1, 'pending', false,
  'Kiosk', 'Landscape', '1920x1080', 10, 'IndiraNagar', 'Apartment',
  700, 'Seated Audience', ARRAY['Morning Rush','Evening Leisure'], 'Outdoor Digital', ARRAY['Working Professionals','Business Owners'],
  10, ARRAY['Coffee'], 6, ARRAY['Static Image','Interactive'],
  false, ARRAY['Commuting','Entertainment'], ARRAY['Social'], 'Maharashtra'
) ON CONFLICT (id) DO NOTHING;

-- testet (with detailed fields)
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, user_intent, user_mood, state, visibility, description, operating_hours_preset,
  location_tags, custom_location_tags, detailed_age_groups, gender_orientation, income_level,
  lifestyle_tags, custom_audience_tags
) VALUES (
  'b2f373fc-63c2-4d5c-bffd-c62714ec4c2b', '97b6e109-546d-41de-aa1a-a5c222010a76', 'testet', 'LED Video Wall',
  '1090', 'SPS Enclave f11, 1st Main Rd, Judicial Layout 2nd Phase, Jyotipuram, Doddakallasandra S.O',
  'Bangalore South', '560062', 12.9238111, 77.5933679,
  500, 1, 'active', true,
  'LED Video Wall', 'Portrait', '1090', 99, 'asdas', 'Bus Stop',
  500, 'Seated Audience', ARRAY['Morning Rush','Lunch Hours','Evening Leisure'], 'Outdoor Digital', ARRAY['Working Professionals'],
  2, ARRAY['dqwed'], 6, ARRAY['Static Image','Video'],
  false, ARRAY['Shopping'], ARRAY['Relaxed'], 'Karnataka', 'High', 'tetwefwefw', 'Business hours (09:00-18:00 | Mon-Fri)',
  ARRAY['School Nearby','College/University','Library','Hospital','Shopping Mall','Restaurant','Bus Stop','Metro Station','Housing Society','PG/Hostel','Church','Temple'],
  ARRAY['test','qwdf'], ARRAY['Children (5-12)','Teenagers (13-17)','All Ages'], 'Female Dominant', 'Premium Audience',
  ARRAY['Working Professionals','Tech Savvy'], ARRAY['test']
) ON CONFLICT (id) DO NOTHING;

-- puvankarr
INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude,
  price_per_day, min_booking_days, status, owned_by_admin,
  category, display_format, resolution, duration_per_slot, venue_name, venue_category,
  avg_daily_footfall, traffic_type, time_of_day_activity, environment_type, occupation_mix,
  avg_dwell_time, interest_segments, playback_slots_per_hour, content_types_supported,
  is_multi_screen, number_of_screens, user_intent, user_mood, state, visibility, operating_hours_preset
) VALUES (
  '0bc8e04a-9280-46bf-8ac0-403dc0b5edd3', 'd8827862-8017-46b0-a073-a1115c65d121', 'puvankarr', 'Digital Display',
  '10', 'adsa', 'Bangalore South', '560062', 12.9238111, 77.5933679,
  100, 1, 'active', false,
  'Digital Display', 'Portrait', '10', 10, 'ssdfsadfas', 'Apartment',
  4444, 'Pedestrian', ARRAY['Morning Rush','Evening Leisure'], 'Indoor', ARRAY['Students','Working Professionals','Business Owners','Homemakers'],
  1, ARRAY[]::text[], 60, ARRAY['Video'],
  true, 50, ARRAY['Shopping','Commuting'], ARRAY['Rushed','Relaxed','Social','Focused','Leisure'], 'Karnataka', 'High', 'Business hours (09:00-18:00 | Mon-Fri)'
) ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- CAMPAIGNS TABLE
-- ==========================================

INSERT INTO campaigns (
  id, advertiser_id, name, objective, start_date, end_date, budget, status, created_at
) VALUES
('e0a70685-3914-4dd0-9699-3e87b8e094d8', '3144de19-350b-4069-999f-2f6fba4472d8', 'dsfas', 'brand_awareness', '2025-10-08 00:00:00', '2025-10-09 00:00:00', 9000, 'pending', '2025-10-08 17:03:30.197194'),
('614aab1b-4b97-42ea-bb5a-9c50a40e8810', '3144de19-350b-4069-999f-2f6fba4472d8', 'Golden Crown', 'event_promotion', '2025-10-08 00:00:00', '2025-10-22 00:00:00', 9000, 'pending', '2025-10-08 17:04:04.821358'),
('4253d889-9ff1-4f1d-a50b-aa127e4bf210', '3144de19-350b-4069-999f-2f6fba4472d8', 'test', 'brand_awareness', '2025-10-08 00:00:00', '2025-10-22 00:00:00', 8999, 'pending', '2025-10-08 17:15:00.612532'),
('67123ef2-4b61-497b-b444-2a143bcf90c2', '3144de19-350b-4069-999f-2f6fba4472d8', 'test', 'product_launch', '2025-10-08 00:00:00', '2025-10-15 00:00:00', 8000, 'pending', '2025-10-08 17:21:35.864117'),
('8a46e1e4-cb1a-4cd6-9f5b-cbcc63e0c1ca', '3144de19-350b-4069-999f-2f6fba4472d8', 'Jagpreet Singh', 'brand_awareness', '2025-10-15 00:00:00', '2025-10-23 00:00:00', 900, 'pending', '2025-10-08 17:30:17.62057'),
('243b7a0d-1315-4256-af3f-b540fe86a231', '3144de19-350b-4069-999f-2f6fba4472d8', 'ASF', 'product_launch', '2025-10-01 00:00:00', '2025-10-22 00:00:00', 5666, 'pending', '2025-10-12 14:57:17.398077')
ON CONFLICT (id) DO NOTHING;

-- Campaigns with targeting
INSERT INTO campaigns (
  id, advertiser_id, name, objective, start_date, end_date, budget, status, created_at,
  target_location_type, target_cities, target_pincodes, target_age_groups, target_gender,
  target_affluence, target_occupations, target_intent, target_mood, venue_type_filters,
  estimated_budget
) VALUES
(
  '59c983ee-78ce-441e-bc82-b932efb5b551', '3144de19-350b-4069-999f-2f6fba4472d8', 'test', 'brand_awareness',
  '2025-10-22 00:00:00', '2025-10-29 00:00:00', 168000, 'pending', '2025-10-12 15:47:50.961623',
  'city', ARRAY['Bangalore'], ARRAY[]::text[], ARRAY['18-25','40-60','25-40','60+'], 'all',
  ARRAY['Premium','Mid','Budget'], ARRAY['Students','Business Owners','Working Professionals','Homemakers'],
  ARRAY['Commuting','Fitness','Work','Shopping','Dining','Entertainment','Education'],
  ARRAY['Relaxed','Leisure','Social','Rushed','Focused'],
  ARRAY['Apartment','Highway','Cafe','Mall','Airport','Road Junction','Restaurant','Shopping Complex','Corporate Park','Metro'],
  168000
),
(
  '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', '3144de19-350b-4069-999f-2f6fba4472d8', 'dsfas', 'brand_awareness',
  '2025-10-13 00:00:00', '2025-10-21 00:00:00', 486000, 'pending', '2025-10-12 16:05:33.239237',
  'india', ARRAY[]::text[], ARRAY[]::text[], ARRAY['40-60','18-25','25-40','60+'], 'all',
  ARRAY['Premium','Mid','Budget'], ARRAY['Working Professionals','Homemakers','Students','Business Owners'],
  ARRAY['Shopping','Dining','Entertainment','Education','Fitness','Commuting','Work'],
  ARRAY['Relaxed','Social','Rushed','Focused','Leisure'],
  ARRAY['Apartment','Highway','Cafe','Mall','Airport','Metro','Corporate Park','Shopping Complex','Restaurant','Road Junction'],
  486000
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- BOOKINGS TABLE
-- ==========================================

INSERT INTO bookings (
  id, screen_id, campaign_id, price, status, approved_by_admin, owner_approved,
  start_date, end_date, created_at
) VALUES
('c141235c-2896-43d3-845d-88648f084759', '4b30c180-c558-49eb-8085-9ace15ffdd5e', 'e0a70685-3914-4dd0-9699-3e87b8e094d8', 100, 'owner_approved', false, true, '2025-10-08 00:00:00', '2025-10-09 00:00:00', '2025-10-08 17:03:30.526591'),
('545d8299-a129-43af-a0fa-9a55cd50657d', '4b30c180-c558-49eb-8085-9ace15ffdd5e', '614aab1b-4b97-42ea-bb5a-9c50a40e8810', 750, 'pending_owner', false, false, '2025-10-08 00:00:00', '2025-10-22 00:00:00', '2025-10-08 17:04:05.151332'),
('caa1c4b8-7a51-402c-8bcd-cc6bbb39f404', '4b30c180-c558-49eb-8085-9ace15ffdd5e', '4253d889-9ff1-4f1d-a50b-aa127e4bf210', 750, 'owner_approved', false, true, '2025-10-08 00:00:00', '2025-10-22 00:00:00', '2025-10-08 17:15:00.953876'),
('a33a5efc-422a-499e-8f5f-13c784d3b976', '4b30c180-c558-49eb-8085-9ace15ffdd5e', '67123ef2-4b61-497b-b444-2a143bcf90c2', 400, 'pending_owner', false, false, '2025-10-08 00:00:00', '2025-10-15 00:00:00', '2025-10-08 17:21:36.203875'),
('f9bbf68c-3a0e-488b-bece-c5f77c9b66a3', '4b30c180-c558-49eb-8085-9ace15ffdd5e', '8a46e1e4-cb1a-4cd6-9f5b-cbcc63e0c1ca', 450, 'pending_owner', false, false, '2025-10-15 00:00:00', '2025-10-23 00:00:00', '2025-10-08 17:30:18.036581'),
('9063d723-4eb9-457a-8d3b-892cc5939bba', '4b30c180-c558-49eb-8085-9ace15ffdd5e', '243b7a0d-1315-4256-af3f-b540fe86a231', 1100, 'pending_owner', false, false, '2025-10-01 00:00:00', '2025-10-22 00:00:00', '2025-10-12 14:57:17.765507'),
('feb87c56-52c8-484e-be31-44f1c69e0934', '2998aebf-6a6e-4aad-88a6-c9b7c580cd66', '59c983ee-78ce-441e-bc82-b932efb5b551', 96000, 'pending_owner', false, false, '2025-10-22 00:00:00', '2025-10-29 00:00:00', '2025-10-12 15:47:51.335993'),
('c3565fc2-4012-4d57-a5f7-e5ed88201f79', '4ff3038f-16a2-4881-bb25-3bf83d467621', '59c983ee-78ce-441e-bc82-b932efb5b551', 72000, 'pending_owner', false, false, '2025-10-22 00:00:00', '2025-10-29 00:00:00', '2025-10-12 15:47:51.45688'),
('a6cedded-eae6-4233-adef-4db926595e72', '2998aebf-6a6e-4aad-88a6-c9b7c580cd66', '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', 108000, 'pending_owner', false, false, '2025-10-13 00:00:00', '2025-10-21 00:00:00', '2025-10-12 16:05:33.619205'),
('65f7fffd-a048-4d81-8406-774b8949ab5f', 'be6961d2-5807-4a6f-804f-4fdbd5633be2', '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', 72000, 'pending_owner', false, false, '2025-10-13 00:00:00', '2025-10-21 00:00:00', '2025-10-12 16:05:33.727654'),
('df83d046-b818-4adf-a861-7e5986f10423', 'efa343f9-36b3-44e3-ad60-858fc69ddbb2', '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', 90000, 'pending_owner', false, false, '2025-10-13 00:00:00', '2025-10-21 00:00:00', '2025-10-12 16:05:33.743628'),
('626e6362-75d1-4c2a-8d8b-f78311fd3aec', '4ff3038f-16a2-4881-bb25-3bf83d467621', '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', 81000, 'pending_owner', false, false, '2025-10-13 00:00:00', '2025-10-21 00:00:00', '2025-10-12 16:05:33.975277'),
('0bda9135-bc7e-4892-9583-ae30d2a32402', '5757ace6-e24e-4b1b-a04f-a3b4b1a551b0', '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', 135000, 'pending_owner', false, false, '2025-10-13 00:00:00', '2025-10-21 00:00:00', '2025-10-12 16:05:34.08835')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- Migration Complete
-- ==========================================
-- Total Records:
--   Users: 6
--   Screens: 14
--   Campaigns: 8
--   Bookings: 13
--   Payments: 0
