-- Check current screen status values
SELECT DISTINCT status FROM screens;

-- Count screens by status
SELECT status, COUNT(*) as count FROM screens GROUP BY status;

-- Show all screens with details
SELECT id, name, city, state, status, latitude, longitude FROM screens ORDER BY created_at DESC LIMIT 10;
