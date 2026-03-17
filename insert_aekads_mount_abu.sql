-- ============================================================
-- INSERT: AekAds Mount Abu Outdoor Screens (2 locations, 3 digital screens)
-- Network: AekAds | State: Rajasthan
-- Rate: ₹1,00,000/screen/month net
-- price_per_day = round(rate × screens / 30 × 1.1)
-- Duration: 15 sec per slot | Loop: 90 sec (1.5 min)
-- Excluded: 1 poster backlight (static/non-digital)
-- ============================================================

BEGIN;

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
-- 1. Near Tollbooth — 1 screen (16×10 ft), ₹1L/mo → ₹3,667/day
(
  'AekAds Near Tollbooth Mount Abu - Outdoor LED',
  'LED Display', 'Landscape', '1920x1080', 15,
  'AekAds Near Tollbooth',
  'Near Tollbooth, Mount Abu, Rajasthan 307501',
  'Mount Abu', 'Rajasthan', '307501', 24.58052432, 72.72539514,
  'Outdoor', 5000, 'Vehicular',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Outdoor Digital', 'High',
  '16x10 ft outdoor LED screen near Mount Abu Tollbooth. High-traffic entry point to the hill station.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Tourists','Commuters','Local Residents'],
  ARRAY['Travel','Tourism'],
  5,
  ARRAY['Travel','Commuting'], ARRAY['Relaxed','Leisure'],
  false, 1, 3667, 30,
  90, 6, 40,
  ARRAY['Video','Static Image'],
  'LED Display', '16x10 ft', '06:00 AM - 12:00 AM',
  'active', true
),
-- 2. Ambedkar Circle — 2 screens (12×10 ft each), ₹1L each/mo → ₹7,333/day
(
  'AekAds Ambedkar Circle Mount Abu - Outdoor LED',
  'LED Display', 'Landscape', '1920x1080', 15,
  'AekAds Ambedkar Circle',
  'Ambedkar Circle, Mount Abu, Rajasthan 307501',
  'Mount Abu', 'Rajasthan', '307501', 24.59172797, 72.7090316,
  'Outdoor', 5000, 'Vehicular',
  ARRAY['Morning Rush','Lunch Hours','Evening Leisure','Late Night'],
  'Outdoor Digital', 'High',
  '12x10 ft outdoor LED screens at Ambedkar Circle, Mount Abu. 2 screens at a key junction.',
  '06:00', '00:00',
  ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
  ARRAY['Young Adults (18-25)','Adults (26-40)','Middle Age (41-55)'],
  'Mixed Gender', 'Middle Income',
  ARRAY['Tourists','Commuters','Local Residents'],
  ARRAY['Travel','Tourism'],
  5,
  ARRAY['Travel','Commuting'], ARRAY['Relaxed','Leisure'],
  true, 2, 7333, 30,
  90, 6, 40,
  ARRAY['Video','Static Image'],
  'LED Display', '12x10 ft', '06:00 AM - 12:00 AM',
  'active', true
);

COMMIT;
