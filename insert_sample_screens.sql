-- Insert 20 sample active screens across tier 1 Indian cities
-- Cities: Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad

INSERT INTO screens (
  name, category, display_format, resolution, duration_per_slot,
  venue_name, location, city, state, pincode, latitude, longitude,
  venue_category, avg_daily_footfall, traffic_type, environment_type,
  description, price_per_day, min_booking_days, playback_slots_per_hour,
  type, size, status, owned_by_admin, avg_dwell_time
) VALUES
-- Mumbai (3 screens)
('Bandra LED Screen', 'Digital LED', 'Landscape', '1920x1080', 10, 'Bandra Mall', 'Linking Road, Bandra West', 'Mumbai', 'Maharashtra', '400050', 19.0596, 72.8295, 'Mall', 25000, 'Heavy', 'Indoor', 'High-traffic LED screen in premium Bandra mall', 5000, 1, 6, 'LED Display', '10x6 ft', 'active', true, 15),
('Marine Drive Billboard', 'Outdoor Billboard', 'Landscape', '3840x2160', 10, 'Marine Drive Promenade', 'Queens Necklace, Marine Drive', 'Mumbai', 'Maharashtra', '400002', 18.9432, 72.8236, 'Road Side', 50000, 'Heavy', 'Outdoor', 'Iconic location with beach view and high visibility', 8000, 2, 6, 'Billboard', '20x10 ft', 'active', true, 5),
('Andheri Metro Station Screen', 'Digital Display', 'Portrait', '1080x1920', 10, 'Andheri Metro', 'DN Nagar Metro Station', 'Mumbai', 'Maharashtra', '400058', 19.1389, 72.8478, 'Metro', 35000, 'Heavy', 'Indoor', 'Metro station screen with captive audience', 4500, 1, 6, 'LED Display', '6x10 ft', 'active', true, 20),

-- Delhi (3 screens)
('Connaught Place LED', 'Digital LED', 'Landscape', '1920x1080', 10, 'CP Central', 'Connaught Place Inner Circle', 'New Delhi', 'Delhi', '110001', 28.6304, 77.2177, 'Shopping Complex', 40000, 'Heavy', 'Outdoor', 'Premium location in heart of Delhi', 7000, 2, 6, 'LED Display', '15x8 ft', 'active', true, 10),
('Saket Mall Digital Screen', 'Digital Display', 'Landscape', '1920x1080', 10, 'Select Citywalk', 'Saket District Centre', 'New Delhi', 'Delhi', '110017', 28.5244, 77.2066, 'Mall', 30000, 'Heavy', 'Indoor', 'Premium mall with high footfall', 5500, 1, 6, 'LED Display', '12x7 ft', 'active', true, 18),
('Rajouri Garden Metro Screen', 'Digital Display', 'Portrait', '1080x1920', 10, 'Rajouri Garden Metro', 'Metro Station Platform', 'New Delhi', 'Delhi', '110027', 28.6414, 77.1222, 'Metro', 28000, 'Heavy', 'Indoor', 'Busy metro station with IT crowd', 4000, 1, 6, 'LED Display', '6x10 ft', 'active', true, 15),

-- Bengaluru (4 screens)
('MG Road LED Billboard', 'Digital LED', 'Landscape', '1920x1080', 10, 'MG Road Junction', 'Mahatma Gandhi Road', 'Bengaluru', 'Karnataka', '560001', 12.9716, 77.6040, 'Road Junction', 35000, 'Heavy', 'Outdoor', 'Prime location on MG Road with tech crowd', 6000, 1, 6, 'LED Display', '15x9 ft', 'active', true, 8),
('Indiranagar Metro Screen', 'Digital Display', 'Portrait', '1080x1920', 10, 'Indiranagar Metro', 'Metro Station Entry', 'Bengaluru', 'Karnataka', '560038', 12.9719, 77.6412, 'Metro', 30000, 'Heavy', 'Indoor', 'Trendy neighborhood metro station', 4200, 1, 6, 'LED Display', '6x10 ft', 'active', true, 12),
('Koramangala Social Cafe Screen', 'Digital Display', 'Landscape', '1920x1080', 10, 'Social Koramangala', '5th Block, Koramangala', 'Bengaluru', 'Karnataka', '560095', 12.9352, 77.6245, 'Café', 8000, 'Moderate', 'Indoor', 'Popular cafe with young professionals', 2500, 1, 6, 'LED Display', '8x5 ft', 'active', true, 45),
('Whitefield Tech Park Screen', 'Digital Display', 'Landscape', '1920x1080', 10, 'ITPL Main Gate', 'International Tech Park', 'Bengaluru', 'Karnataka', '560066', 12.9888, 77.7499, 'Corporate Park', 20000, 'Heavy', 'Outdoor', 'IT park with high-income professionals', 5000, 1, 6, 'LED Display', '12x7 ft', 'active', true, 10),

-- Hyderabad (2 screens)
('Hitec City Digital Screen', 'Digital LED', 'Landscape', '1920x1080', 10, 'Cyber Towers', 'Hitec City Main Road', 'Hyderabad', 'Telangana', '500081', 17.4485, 78.3908, 'Corporate Park', 25000, 'Heavy', 'Outdoor', 'IT hub with tech professionals', 5500, 1, 6, 'LED Display', '14x8 ft', 'active', true, 8),
('Banjara Hills Mall Screen', 'Digital Display', 'Landscape', '1920x1080', 10, 'GVK One Mall', 'Banjara Hills Road No 1', 'Hyderabad', 'Telangana', '500034', 17.4239, 78.4738, 'Mall', 22000, 'Heavy', 'Indoor', 'Upscale mall in premium locality', 4800, 1, 6, 'LED Display', '10x6 ft', 'active', true, 20),

-- Chennai (2 screens)
('T Nagar Shopping Screen', 'Digital LED', 'Landscape', '1920x1080', 10, 'Pondy Bazaar', 'Thyagaraya Road, T Nagar', 'Chennai', 'Tamil Nadu', '600017', 13.0418, 80.2341, 'Shopping Complex', 30000, 'Heavy', 'Outdoor', 'Busiest shopping district in Chennai', 5000, 1, 6, 'LED Display', '12x7 ft', 'active', true, 10),
('OMR IT Corridor Screen', 'Digital Display', 'Landscape', '1920x1080', 10, 'Tech Park Entrance', 'Old Mahabalipuram Road', 'Chennai', 'Tamil Nadu', '600096', 12.9121, 80.2270, 'Corporate Park', 18000, 'Heavy', 'Outdoor', 'Major IT corridor with tech companies', 4500, 1, 6, 'LED Display', '10x6 ft', 'active', true, 8),

-- Kolkata (2 screens)
('Park Street LED Screen', 'Digital LED', 'Landscape', '1920x1080', 10, 'Park Street Plaza', 'Park Street Central', 'Kolkata', 'West Bengal', '700016', 22.5539, 88.3530, 'Road Junction', 28000, 'Heavy', 'Outdoor', 'Historic commercial hub of Kolkata', 4800, 1, 6, 'LED Display', '12x7 ft', 'active', true, 9),
('Salt Lake Sector V Screen', 'Digital Display', 'Landscape', '1920x1080', 10, 'Tech Park Gate', 'Sector V, Salt Lake', 'Kolkata', 'West Bengal', '700091', 22.5726, 88.4329, 'Corporate Park', 15000, 'Moderate', 'Outdoor', 'IT hub with growing tech presence', 3800, 1, 6, 'LED Display', '10x6 ft', 'active', true, 10),

-- Pune (2 screens)
('Koregaon Park Cafe Screen', 'Digital Display', 'Landscape', '1920x1080', 10, 'German Bakery Area', 'North Main Road, Koregaon Park', 'Pune', 'Maharashtra', '411001', 18.5435, 73.8957, 'Café', 12000, 'Moderate', 'Indoor', 'Trendy area with cafes and restaurants', 3000, 1, 6, 'LED Display', '8x5 ft', 'active', true, 30),
('Hinjewadi IT Park Screen', 'Digital Display', 'Landscape', '1920x1080', 10, 'Rajiv Gandhi Infotech Park', 'Phase 1, Hinjewadi', 'Pune', 'Maharashtra', '411057', 18.5912, 73.7389, 'Corporate Park', 22000, 'Heavy', 'Outdoor', 'Major IT park with multinational companies', 4500, 1, 6, 'LED Display', '12x7 ft', 'active', true, 8),

-- Ahmedabad (2 screens)
('SG Highway LED Screen', 'Digital LED', 'Landscape', '1920x1080', 10, 'SG Highway Junction', 'Sarkhej-Gandhinagar Highway', 'Ahmedabad', 'Gujarat', '380015', 23.0304, 72.5024, 'Highway', 35000, 'Heavy', 'Outdoor', 'Major arterial road with heavy traffic', 5500, 2, 6, 'LED Display', '16x9 ft', 'active', true, 5),
('CG Road Shopping Screen', 'Digital Display', 'Landscape', '1920x1080', 10, 'CG Road Plaza', 'CG Road, Navrangpura', 'Ahmedabad', 'Gujarat', '380009', 23.0368, 72.5537, 'Shopping Complex', 25000, 'Heavy', 'Indoor', 'Premium shopping and dining destination', 4200, 1, 6, 'LED Display', '10x6 ft', 'active', true, 15);

-- Verify insertion
SELECT COUNT(*) as total_active_screens FROM screens WHERE status = 'active';
SELECT city, COUNT(*) as screens_count FROM screens WHERE status = 'active' GROUP BY city ORDER BY screens_count DESC;
