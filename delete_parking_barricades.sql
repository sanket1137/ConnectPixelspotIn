BEGIN;

DELETE FROM screens WHERE name LIKE '%Parking Barricades%';

COMMIT;

\echo '=== Verify deletion ==='
SELECT COUNT(*) as remaining FROM screens WHERE name LIKE '%Parking Barricades%';

\echo '=== Total screen count ==='
SELECT COUNT(*) as total_screens FROM screens;
