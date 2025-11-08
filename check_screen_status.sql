-- Check screen status counts
SELECT status, COUNT(*) as count FROM screens GROUP BY status;

-- Check all screen cities with status
SELECT city, status, COUNT(*) as count 
FROM screens 
GROUP BY city, status 
ORDER BY city, status;

-- Check sample screen data
SELECT id, name, city, status, "pricePerDay", latitude, longitude 
FROM screens 
LIMIT 10;
