-- Normalize city names in screens table to canonical spellings
-- Matches the CITY_ALIASES from shared/constants.ts

BEGIN;

UPDATE screens SET city = 'Bengaluru' WHERE LOWER(city) IN ('bangalore', 'banglore', 'bengalooru');
UPDATE screens SET city = 'Mumbai' WHERE LOWER(city) = 'bombay';
UPDATE screens SET city = 'Chennai' WHERE LOWER(city) = 'madras';
UPDATE screens SET city = 'Kolkata' WHERE LOWER(city) = 'calcutta';
UPDATE screens SET city = 'Pune' WHERE LOWER(city) = 'poona';
UPDATE screens SET city = 'Thiruvananthapuram' WHERE LOWER(city) = 'trivandrum';
UPDATE screens SET city = 'Kochi' WHERE LOWER(city) = 'cochin';
UPDATE screens SET city = 'Mysuru' WHERE LOWER(city) = 'mysore';
UPDATE screens SET city = 'Vadodara' WHERE LOWER(city) = 'baroda';
UPDATE screens SET city = 'Puducherry' WHERE LOWER(city) = 'pondicherry';
UPDATE screens SET city = 'Mangaluru' WHERE LOWER(city) = 'mangalore';
UPDATE screens SET city = 'Visakhapatnam' WHERE LOWER(city) IN ('vizag', 'visakapatnam');
UPDATE screens SET city = 'Ahmedabad' WHERE LOWER(city) IN ('ahmedbad', 'ahmadabad');
UPDATE screens SET city = 'Gurugram' WHERE LOWER(city) = 'gurgaon';

-- Trim whitespace from all city names
UPDATE screens SET city = TRIM(city) WHERE city != TRIM(city);

COMMIT;

-- Verify: show distinct cities after normalization
SELECT city, COUNT(*) FROM screens GROUP BY city ORDER BY city;
