-- Check booking statuses
SELECT status, COUNT(*) as count FROM bookings GROUP BY status;

-- Check if there are any bookings at all
SELECT COUNT(*) as total_bookings FROM bookings;

-- Show sample bookings with details
SELECT id, screen_id, campaign_id, status, created_at 
FROM bookings 
ORDER BY created_at DESC 
LIMIT 10;
