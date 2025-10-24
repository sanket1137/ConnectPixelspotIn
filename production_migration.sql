-- PixelSpot Production Database Migration
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
-- SCREENS TABLE
-- ==========================================

INSERT INTO screens (
  id, owner_id, name, type, size, location, city, pincode, latitude, longitude, 
  price_per_day, min_booking_days, operational_hours, images, status, owned_by_admin, 
  created_at, category, display_format, resolution, duration_per_slot, venue_name, 
  venue_category, avg_daily_footfall, traffic_type, time_of_day_activity, 
  environment_type, occupation_mix, avg_dwell_time, interest_segments, 
  playback_slots_per_hour, content_types_supported, is_multi_screen, number_of_screens, 
  user_intent, user_mood, state, visibility, description, operating_hours_preset, 
  custom_operating_hours, custom_operating_days, location_tags, custom_location_tags, 
  detailed_age_groups, gender_orientation, income_level, lifestyle_tags, custom_audience_tags
) VALUES
(
  '4b30c180-c558-49eb-8085-9ace15ffdd5e', 'd8827862-8017-46b0-a073-a1115c65d121', 'Jagpreet Singh 6', 
  'LED Video Wall', '1290 x3990', 'SPS Enclave f11, 1st Main Rd, Judicial Layout 2nd Phase, Jyotipuram, Doddakallasandra S.O', 
  'Bangalore South', '560062', 12.9238111, 77.5933679, 50, 10, 
  '{"start":"08:00","end":"22:00"}', '{/objects/uploads/b9cafdd1-3536-4f1c-9cf3-2f8d1837ddb3}', 
  'active', false, '2025-10-08 15:55:38.739024', 'LED Video Wall', 'Portrait', '1290 x3990', 10, 
  'asdas', 'Café', 5000, 'Pedestrian', '{"Morning Rush","Evening Leisure","Late Night","Lunch Hours"}', 
  'Indoor', '{"Working Professionals"}', 1, '{tag}', 6, '{"Video","Static Image"}', false, NULL, 
  NULL, NULL, 'Karnataka', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
  '1b24a21a-ccd2-487b-8240-df44f928f67f', 'd8827862-8017-46b0-a073-a1115c65d121', 'tes', 
  'LED Video Wall', '1920 x 2800', 'SPS Enclave f11, 1st Main Rd, Judicial Layout 2nd Phase, Jyotipuram, Doddakallasandra S.O', 
  'Bangalore South', '560062', 12.9238122, 77.5933679, 50000, 1, NULL, NULL, 'pending', false, 
  '2025-10-12 15:39:06.809199', 'LED Video Wall', 'Portrait', '1920 x 2800', 10, 'asdas', 'Apartment', 
  5000, 'Mixed', '{"Morning Rush","Lunch Hours","Evening Leisure","Late Night"}', 'Outdoor Digital', 
  '{"Working Professionals","Students","Business Owners","Homemakers"}', 5, '{tag}', 6, 
  '{"Static Image","Video"}', false, NULL, '{"Shopping","Commuting"}', '{"Relaxed","Rushed"}', 
  'Karnataka', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
  'be6961d2-5807-4a6f-804f-4fdbd5633be2', NULL, 'Phoenix Mall Food Court Display', 'Digital Display', 
  '55 inch', 'LBS Marg, Kurla West, Mumbai', 'Mumbai', '400070', 19.0883000, 72.8889000, 8000, 7, 
  '{"start": "10:00", "end": "22:00"}', NULL, 'active', true, '2025-10-12 15:41:18.106071', 
  'Digital Display', 'Landscape', '1920x1080', 10, 'Phoenix Marketcity', 'Mall', 15000, 'Mixed', 
  '{"Lunch Hours","Evening Leisure"}', 'Indoor', '{"Working Professionals","Students"}', 25, 
  '{"Shopping","Food","Entertainment"}', 6, '{"Static Image","Video"}', true, 4, 
  '{"Shopping","Dining","Leisure"}', '{"Relaxed","Social"}', 'Maharashtra', NULL, NULL, NULL, 
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
  'e262300e-e328-4f1c-bdf7-adc8df04650e', NULL, 'Starbucks Connaught Place', 'Digital Display', 
  '43 inch', 'Connaught Place, New Delhi', 'Delhi', '110001', 28.6315000, 77.2167000, 5000, 3, 
  '{"start": "07:00", "end": "23:00"}', NULL, 'active', true, '2025-10-12 15:41:18.106071', 
  'Digital Display', 'Portrait', '1080x1920', 8, 'Starbucks CP', 'Café', 3000, 'Seated Audience', 
  '{"Morning Rush","Lunch Hours","Evening Leisure"}', 'Indoor', '{"Working Professionals","Business Owners"}', 
  35, '{"Coffee","Tech","Business"}', 8, '{"Static Image","Video"}', false, NULL, 
  '{"Work","Dining"}', '{"Relaxed","Focused"}', 'Delhi', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL, NULL, NULL
),
(
  '2998aebf-6a6e-4aad-88a6-c9b7c580cd66', NULL, 'Indiranagar Metro Station', 'Transit Display', 
  '65 inch', 'Indiranagar, Bangalore', 'Bangalore', '560038', 12.9716000, 77.6412000, 12000, 7, 
  '{"start": "06:00", "end": "23:00"}', NULL, 'active', true, '2025-10-12 15:41:18.106071', 
  'Transit Display', 'Landscape', '1920x1080', 5, 'Indiranagar Metro', 'Metro', 25000, 'Transit', 
  '{"Morning Rush","Evening Leisure"}', 'Indoor', '{"Working Professionals","Students"}', 3, 
  '{"Tech","Commute","Education"}', 12, '{"Static Image","Video"}', true, 6, 
  '{"Commuting","Work"}', '{"Rushed","Focused"}', 'Karnataka', NULL, NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL, NULL, NULL, NULL
),
(
  '727e0cfc-7f92-4ccc-ae10-639f5a441baf', NULL, 'Cult Fit Koramangala', 'LED Video Wall', '10x6 ft', 
  '5th Block, Koramangala, Bangalore', 'Bangalore', '560095', 12.9352000, 77.6245000, 6000, 5, 
  '{"start": "06:00", "end": "22:00"}', NULL, 'active', true, '2025-10-12 15:41:18.106071', 
  'LED Video Wall', 'Landscape', '3840x2160', 10, 'Cult.fit Koramangala', 'Gym', 800, 'Mixed', 
  '{"Morning Rush","Evening Leisure"}', 'Indoor', '{"Working Professionals","Students"}', 45, 
  '{"Fitness","Health","Wellness"}', 6, '{"Video","Static Image"}', false, NULL, 
  '{"Fitness","Entertainment"}', '{"Focused","Social"}', 'Karnataka', NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL, NULL, NULL, NULL, NULL
),
(
  'efa343f9-36b3-44e3-ad60-858fc69ddbb2', NULL, 'DLF Cyber Hub Food Court', 'Digital Display', 
  '55 inch', 'DLF Cyber City, Gurgaon', 'Gurgaon', '122002', 28.4942000, 77.0897000, 10000, 5, 
  '{"start": "11:00", "end": "23:00"}', NULL, 'active', true, '2025-10-12 15:41:18.106071', 
  'Digital Display', 'Landscape', '1920x1080', 8, 'DLF Cyber Hub', 'Corporate Park', 8000, 'Mixed', 
  '{"Lunch Hours","Evening Leisure"}', 'Semi-Outdoor', '{"Working Professionals","Business Owners"}', 
  30, '{"Food","Business","Tech"}', 8, '{"Static Image","Video","HTML5"}', true, 3, 
  '{"Dining","Work"}', '{"Relaxed","Social"}', 'Haryana', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL, NULL, NULL
),
(
  '30a9b31e-9332-4a8c-9e0b-834aa562906a', NULL, 'VR Mall Surat Cinema Lobby', 'LED Video Wall', 
  '8x12 ft', 'Dumas Road, Surat', 'Surat', '395007', 21.1702000, 72.8311000, 7000, 3, 
  '{"start": "10:00", "end": "00:00"}', NULL, 'active', true, '2025-10-12 15:41:18.106071', 
  'LED Video Wall', 'Portrait', '1080x1920', 10, 'VR Mall Surat', 'Cinema', 12000, 'Mixed', 
  '{"Evening Leisure","Late Night"}', 'Indoor', '{"Students","Working Professionals"}', 15, 
  '{"Entertainment","Movies","Shopping"}', 6, '{"Video","Static Image"}', true, 2, 
  '{"Entertainment","Leisure","Shopping"}', '{"Relaxed","Social","Leisure"}', 'Gujarat', NULL, NULL, 
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
  '4ff3038f-16a2-4881-bb25-3bf83d467621', NULL, 'Prestige Tech Park Lobby', 'Digital Display', 
  '65 inch', 'Marathahalli, Bangalore', 'Bangalore', '560037', 12.9569000, 77.6978000, 9000, 7, 
  '{"start": "08:00", "end": "20:00"}', NULL, 'active', true, '2025-10-12 15:41:18.106071', 
  'Digital Display', 'Landscape', '1920x1080', 10, 'Prestige Tech Park', 'Corporate Park', 5000, 
  'Mixed', '{"Morning Rush","Lunch Hours","Evening Leisure"}', 'Indoor', '{"Working Professionals"}', 
  10, '{"Tech","Business","Startups"}', 6, '{"Static Image","Video","HTML5"}', false, NULL, 
  '{"Work","Commuting"}', '{"Focused","Rushed"}', 'Karnataka', NULL, NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL, NULL, NULL, NULL
),
(
  '5757ace6-e24e-4b1b-a04f-a3b4b1a551b0', NULL, 'Lodha Luxury Apartment Lift', 'Lift Display', 
  '32 inch', 'Mahalaxmi, Mumbai', 'Mumbai', '400011', 18.9825000, 72.8231000, 15000, 14, 
  '{"start": "00:00", "end": "23:59"}', NULL, 'active', true, '2025-10-12 15:41:18.106071', 
  'Lift Display', 'Portrait', '1080x1920', 6, 'Lodha Bellissimo', 'Apartment', 2000, 'Mixed', 
  '{"Morning Rush","Evening Leisure"}', 'Indoor', '{"Business Owners","Working Professionals"}', 
  2, '{"Luxury","Real Estate","Premium Services"}', 10, '{"Static Image","Video"}', true, 8, 
  '{"Commuting","Leisure"}', '{"Relaxed"}', 'Maharashtra', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL, NULL, NULL
),
(
  '37b1d5bb-8662-4df5-81b9-d7bac919a8ee', '97b6e109-546d-41de-aa1a-a5c222010a76', 'Screen 1', 
  'LED Video Wall', '1920x1080', 'Mg road', 'Bengaluru', '560001', 12.0000000, 77.0000000, 6000, 10, 
  NULL, NULL, 'active', false, '2025-10-12 17:34:01.985422', 'LED Video Wall', 'Landscape', 
  '1920x1080', 10, 'IndiraNagar', 'Salon', 700, 'Seated Audience', '{"Morning Rush"}', 
  'Semi-Outdoor', '{"Working Professionals"}', 10, '{}', 6, '{"Video","Interactive"}', false, NULL, 
  '{"Shopping","Dining","Entertainment"}', '{"Social"}', 'Karnataka', NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL, NULL, NULL, NULL, NULL
),
(
  '3732c5c5-9057-4656-8a18-eddae69cae80', '97b6e109-546d-41de-aa1a-a5c222010a76', 'Screen 2', 
  'Kiosk', '1920x1080', 'Mg road', 'Bengaluru', '560001', 72.8765430, 70.8675654, 2000, 1, NULL, 
  NULL, 'pending', false, '2025-10-22 09:34:22.088466', 'Kiosk', 'Landscape', '1920x1080', 10, 
  'IndiraNagar', 'Apartment', 700, 'Seated Audience', '{"Morning Rush","Evening Leisure"}', 
  'Outdoor Digital', '{"Working Professionals","Business Owners"}', 10, '{"Coffee"}', 6, 
  '{"Static Image","Interactive"}', false, NULL, '{"Commuting","Entertainment"}', '{"Social"}', 
  'Maharashtra', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
),
(
  'b2f373fc-63c2-4d5c-bffd-c62714ec4c2b', '97b6e109-546d-41de-aa1a-a5c222010a76', 'testet', 
  'LED Video Wall', '1090', 'SPS Enclave f11, 1st Main Rd, Judicial Layout 2nd Phase, Jyotipuram, Doddakallasandra S.O', 
  'Bangalore South', '560062', 12.9238111, 77.5933679, 500, 1, NULL, NULL, 'active', true, 
  '2025-10-22 19:14:25.256219', 'LED Video Wall', 'Portrait', '1090', 99, 'asdas', 'Bus Stop', 500, 
  'Seated Audience', '{"Morning Rush","Lunch Hours","Evening Leisure"}', 'Outdoor Digital', 
  '{"Working Professionals"}', 2, '{"dqwed"}', 6, '{"Static Image","Video"}', false, NULL, 
  '{"Shopping"}', '{"Relaxed"}', 'Karnataka', 'High', 'tetwefwefw', 'Business hours (09:00-18:00 | Mon-Fri)', 
  NULL, NULL, '{"School Nearby","College/University","Library","Hospital","Shopping Mall","Restaurant","Bus Stop","Metro Station","Housing Society","PG/Hostel","Church","Temple"}', 
  '{"test","qwdf",""}', '{"Children (5-12)","Teenagers (13-17)","All Ages"}', 'Female Dominant', 
  'Premium Audience', '{"Working Professionals","Tech Savvy"}', '{"test",""}'
),
(
  '0bc8e04a-9280-46bf-8ac0-403dc0b5edd3', 'd8827862-8017-46b0-a073-a1115c65d121', 'puvankarr', 
  'Digital Display', '10', 'adsa', 'Bangalore South', '560062', 12.9238111, 77.5933679, 100, 1, 
  NULL, NULL, 'active', false, '2025-10-23 19:23:01.169505', 'Digital Display', 'Portrait', '10', 
  10, 'ssdfsadfas', 'Apartment', 4444, 'Pedestrian', '{"Morning Rush","Evening Leisure"}', 'Indoor', 
  '{"Students","Working Professionals","Business Owners","Homemakers"}', 1, '{}', 60, '{"Video"}', 
  true, 50, '{"Shopping","Commuting"}', '{"Rushed","Relaxed","Social","Focused","Leisure"}', 
  'Karnataka', 'High', NULL, 'Business hours (09:00-18:00 | Mon-Fri)', NULL, NULL, '{}', '{}', '{}', 
  NULL, NULL, '{}', '{}'
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- CAMPAIGNS TABLE
-- ==========================================

INSERT INTO campaigns (
  id, advertiser_id, name, objective, start_date, end_date, budget, creative_url, status, 
  created_at, target_location_type, target_cities, target_state, target_pincodes, 
  target_age_groups, target_gender, target_affluence, target_occupations, target_intent, 
  target_mood, venue_type_filters, estimated_budget, target_area
) VALUES
(
  'e0a70685-3914-4dd0-9699-3e87b8e094d8', '3144de19-350b-4069-999f-2f6fba4472d8', 'dsfas', 
  'brand_awareness', '2025-10-08 00:00:00', '2025-10-09 00:00:00', 9000, NULL, 'pending', 
  '2025-10-08 17:03:30.197194', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL
),
(
  '614aab1b-4b97-42ea-bb5a-9c50a40e8810', '3144de19-350b-4069-999f-2f6fba4472d8', 'Golden Crown', 
  'event_promotion', '2025-10-08 00:00:00', '2025-10-22 00:00:00', 9000, NULL, 'pending', 
  '2025-10-08 17:04:04.821358', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL
),
(
  '4253d889-9ff1-4f1d-a50b-aa127e4bf210', '3144de19-350b-4069-999f-2f6fba4472d8', 'test', 
  'brand_awareness', '2025-10-08 00:00:00', '2025-10-22 00:00:00', 8999, NULL, 'pending', 
  '2025-10-08 17:15:00.612532', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL
),
(
  '67123ef2-4b61-497b-b444-2a143bcf90c2', '3144de19-350b-4069-999f-2f6fba4472d8', 'test', 
  'product_launch', '2025-10-08 00:00:00', '2025-10-15 00:00:00', 8000, NULL, 'pending', 
  '2025-10-08 17:21:35.864117', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL
),
(
  '8a46e1e4-cb1a-4cd6-9f5b-cbcc63e0c1ca', '3144de19-350b-4069-999f-2f6fba4472d8', 'Jagpreet Singh', 
  'brand_awareness', '2025-10-15 00:00:00', '2025-10-23 00:00:00', 900, NULL, 'pending', 
  '2025-10-08 17:30:17.62057', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL
),
(
  '243b7a0d-1315-4256-af3f-b540fe86a231', '3144de19-350b-4069-999f-2f6fba4472d8', 'ASF', 
  'product_launch', '2025-10-01 00:00:00', '2025-10-22 00:00:00', 5666, NULL, 'pending', 
  '2025-10-12 14:57:17.398077', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 
  NULL, NULL
),
(
  '59c983ee-78ce-441e-bc82-b932efb5b551', '3144de19-350b-4069-999f-2f6fba4472d8', 'test', 
  'brand_awareness', '2025-10-22 00:00:00', '2025-10-29 00:00:00', 168000, NULL, 'pending', 
  '2025-10-12 15:47:50.961623', 'city', '{"Bangalore"}', NULL, '{}', 
  '{"18-25","40-60","25-40","60+"}', 'all', '{"Premium","Mid","Budget"}', 
  '{"Students","Business Owners","Working Professionals","Homemakers"}', 
  '{"Commuting","Fitness","Work","Shopping","Dining","Entertainment","Education"}', 
  '{"Relaxed","Leisure","Social","Rushed","Focused"}', 
  '{"Apartment","Highway","Cafe","Mall","Airport","Road Junction","Restaurant","Shopping Complex","Corporate Park","Metro"}', 
  168000, NULL
),
(
  '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', '3144de19-350b-4069-999f-2f6fba4472d8', 'dsfas', 
  'brand_awareness', '2025-10-13 00:00:00', '2025-10-21 00:00:00', 486000, NULL, 'pending', 
  '2025-10-12 16:05:33.239237', 'india', '{}', NULL, '{}', '{"40-60","18-25","25-40","60+"}', 'all', 
  '{"Premium","Mid","Budget"}', '{"Working Professionals","Homemakers","Students","Business Owners"}', 
  '{"Shopping","Dining","Entertainment","Education","Fitness","Commuting","Work"}', 
  '{"Relaxed","Social","Rushed","Focused","Leisure"}', 
  '{"Apartment","Highway","Cafe","Mall","Airport","Metro","Corporate Park","Shopping Complex","Restaurant","Road Junction"}', 
  486000, NULL
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- BOOKINGS TABLE
-- ==========================================

INSERT INTO bookings (
  id, screen_id, campaign_id, price, status, approved_by_admin, owner_approved, start_date, 
  end_date, created_at, owner_response, owner_responded_at, alternative_dates, admin_notes, 
  admin_responded_at
) VALUES
(
  'c141235c-2896-43d3-845d-88648f084759', '4b30c180-c558-49eb-8085-9ace15ffdd5e', 
  'e0a70685-3914-4dd0-9699-3e87b8e094d8', 100, 'owner_approved', false, true, 
  '2025-10-08 00:00:00', '2025-10-09 00:00:00', '2025-10-08 17:03:30.526591', NULL, NULL, NULL, 
  NULL, NULL
),
(
  '545d8299-a129-43af-a0fa-9a55cd50657d', '4b30c180-c558-49eb-8085-9ace15ffdd5e', 
  '614aab1b-4b97-42ea-bb5a-9c50a40e8810', 750, 'pending_owner', false, false, 
  '2025-10-08 00:00:00', '2025-10-22 00:00:00', '2025-10-08 17:04:05.151332', NULL, NULL, NULL, 
  NULL, NULL
),
(
  'caa1c4b8-7a51-402c-8bcd-cc6bbb39f404', '4b30c180-c558-49eb-8085-9ace15ffdd5e', 
  '4253d889-9ff1-4f1d-a50b-aa127e4bf210', 750, 'owner_approved', false, true, 
  '2025-10-08 00:00:00', '2025-10-22 00:00:00', '2025-10-08 17:15:00.953876', NULL, NULL, NULL, 
  NULL, NULL
),
(
  'a33a5efc-422a-499e-8f5f-13c784d3b976', '4b30c180-c558-49eb-8085-9ace15ffdd5e', 
  '67123ef2-4b61-497b-b444-2a143bcf90c2', 400, 'pending_owner', false, false, 
  '2025-10-08 00:00:00', '2025-10-15 00:00:00', '2025-10-08 17:21:36.203875', NULL, NULL, NULL, 
  NULL, NULL
),
(
  'f9bbf68c-3a0e-488b-bece-c5f77c9b66a3', '4b30c180-c558-49eb-8085-9ace15ffdd5e', 
  '8a46e1e4-cb1a-4cd6-9f5b-cbcc63e0c1ca', 450, 'pending_owner', false, false, 
  '2025-10-15 00:00:00', '2025-10-23 00:00:00', '2025-10-08 17:30:18.036581', NULL, NULL, NULL, 
  NULL, NULL
),
(
  '9063d723-4eb9-457a-8d3b-892cc5939bba', '4b30c180-c558-49eb-8085-9ace15ffdd5e', 
  '243b7a0d-1315-4256-af3f-b540fe86a231', 1100, 'pending_owner', false, false, 
  '2025-10-01 00:00:00', '2025-10-22 00:00:00', '2025-10-12 14:57:17.765507', NULL, NULL, NULL, 
  NULL, NULL
),
(
  'feb87c56-52c8-484e-be31-44f1c69e0934', '2998aebf-6a6e-4aad-88a6-c9b7c580cd66', 
  '59c983ee-78ce-441e-bc82-b932efb5b551', 96000, 'pending_owner', false, false, 
  '2025-10-22 00:00:00', '2025-10-29 00:00:00', '2025-10-12 15:47:51.335993', NULL, NULL, NULL, 
  NULL, NULL
),
(
  'c3565fc2-4012-4d57-a5f7-e5ed88201f79', '4ff3038f-16a2-4881-bb25-3bf83d467621', 
  '59c983ee-78ce-441e-bc82-b932efb5b551', 72000, 'pending_owner', false, false, 
  '2025-10-22 00:00:00', '2025-10-29 00:00:00', '2025-10-12 15:47:51.45688', NULL, NULL, NULL, 
  NULL, NULL
),
(
  'a6cedded-eae6-4233-adef-4db926595e72', '2998aebf-6a6e-4aad-88a6-c9b7c580cd66', 
  '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', 108000, 'pending_owner', false, false, 
  '2025-10-13 00:00:00', '2025-10-21 00:00:00', '2025-10-12 16:05:33.619205', NULL, NULL, NULL, 
  NULL, NULL
),
(
  '65f7fffd-a048-4d81-8406-774b8949ab5f', 'be6961d2-5807-4a6f-804f-4fdbd5633be2', 
  '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', 72000, 'pending_owner', false, false, 
  '2025-10-13 00:00:00', '2025-10-21 00:00:00', '2025-10-12 16:05:33.727654', NULL, NULL, NULL, 
  NULL, NULL
),
(
  'df83d046-b818-4adf-a861-7e5986f10423', 'efa343f9-36b3-44e3-ad60-858fc69ddbb2', 
  '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', 90000, 'pending_owner', false, false, 
  '2025-10-13 00:00:00', '2025-10-21 00:00:00', '2025-10-12 16:05:33.743628', NULL, NULL, NULL, 
  NULL, NULL
),
(
  '626e6362-75d1-4c2a-8d8b-f78311fd3aec', '4ff3038f-16a2-4881-bb25-3bf83d467621', 
  '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', 81000, 'pending_owner', false, false, 
  '2025-10-13 00:00:00', '2025-10-21 00:00:00', '2025-10-12 16:05:33.975277', NULL, NULL, NULL, 
  NULL, NULL
),
(
  '0bda9135-bc7e-4892-9583-ae30d2a32402', '5757ace6-e24e-4b1b-a04f-a3b4b1a551b0', 
  '7a93cdc1-18ad-4ada-bf53-acec28d51e6b', 135000, 'pending_owner', false, false, 
  '2025-10-13 00:00:00', '2025-10-21 00:00:00', '2025-10-12 16:05:34.08835', NULL, NULL, NULL, 
  NULL, NULL
)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- PAYMENTS TABLE (Currently Empty)
-- ==========================================
-- No payment records to migrate

-- ==========================================
-- Migration Complete
-- ==========================================
-- Total Records:
--   Users: 6
--   Screens: 14
--   Campaigns: 8
--   Bookings: 13
--   Payments: 0
