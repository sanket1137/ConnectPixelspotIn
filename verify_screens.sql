SELECT name, venue_name, city, state, pincode, latitude, longitude, venue_category, avg_daily_footfall, price_per_day, environment_type, category, display_format, is_multi_screen, number_of_screens, min_booking_days
FROM screens
WHERE venue_name IN ('Mannat Sitara','Mannat Samalkha','Mannat Haveli Murthal','Mannat Haveli Rohtak','Mannat Dhaba Rohtak','CP67 Mall Mohali')
ORDER BY venue_name, name;
