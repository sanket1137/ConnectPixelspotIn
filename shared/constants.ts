// ========== VENUE CATEGORIES ==========
// Canonical list of all valid venue categories for screens.
// This is the single source of truth — used in UI dropdowns, DB validation, and normalization.
export const VENUE_CATEGORIES = [
  'Airport',
  'Apartment',
  'Bus Stop',
  'Café',
  'Cinema',
  'Co-working',
  'College',
  'Corporate Park',
  'Flyover',
  'Gym',
  'Highway',
  'Hospital',
  'Hotel',
  'Mall',
  'Metro',
  'Office Building',
  'Petrol Bunk',
  'Restaurant',
  'Retail Store',
  'Road Junction',
  'Road Side',
  'Salon',
  'Shopping Complex',
  'Stadium',
  'Transit Hub',
] as const;

export type VenueCategory = typeof VENUE_CATEGORIES[number];

/**
 * Maps non-standard venue category values found in DB to canonical ones.
 * Key = lowercase non-standard value, Value = canonical value from VENUE_CATEGORIES.
 */
export const VENUE_CATEGORY_ALIASES: Record<string, string> = {
  'cafe': 'Café',
  'cinema lobby': 'Cinema',
  'food court': 'Restaurant',
  'healthcare': 'Hospital',
  'hotel/restaurant': 'Hotel',
  'metro station': 'Metro',
  'office complex': 'Office Building',
  'shopping mall': 'Mall',
};

/**
 * Normalize a venue category string to its canonical form.
 * Returns the canonical value if found in aliases, or the original value if already canonical.
 */
export function normalizeVenueCategory(raw: string): string {
  if (!raw) return raw;
  const alias = VENUE_CATEGORY_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  // Check if it's already a canonical value (case-insensitive)
  const match = VENUE_CATEGORIES.find(v => v.toLowerCase() === raw.toLowerCase());
  return match || raw;
}

// ========== CITY NAME NORMALIZATION ==========
/**
 * Maps common alternate city spellings to preferred canonical form.
 * Key = lowercase alternate, Value = canonical spelling.
 */
export const CITY_ALIASES: Record<string, string> = {
  'bangalore': 'Bengaluru',
  'banglore': 'Bengaluru',
  'bengalooru': 'Bengaluru',
  'bombay': 'Mumbai',
  'madras': 'Chennai',
  'calcutta': 'Kolkata',
  'poona': 'Pune',
  'trivandrum': 'Thiruvananthapuram',
  'cochin': 'Kochi',
  'mysore': 'Mysuru',
  'baroda': 'Vadodara',
  'pondicherry': 'Puducherry',
  'mangalore': 'Mangaluru',
  'vizag': 'Visakhapatnam',
  'visakapatnam': 'Visakhapatnam',
  'ahmedbad': 'Ahmedabad',
  'ahmadabad': 'Ahmedabad',
  'gurgaon': 'Gurugram',
};

/**
 * Normalize a city name to its canonical spelling.
 * Also title-cases the result.
 */
export function normalizeCityName(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  const alias = CITY_ALIASES[trimmed.toLowerCase()];
  return alias || trimmed;
}

// ========== TIER 1 & TIER 2 CITIES ==========
// Tier 1 and Tier 2 Indian Cities
export const TIER_1_CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
] as const;

export const TIER_2_CITIES = [
  "Agra",
  "Agartala",
  "Ahmednagar",
  "Ajmer",
  "Akola",
  "Aligarh",
  "Allahabad",
  "Alwar",
  "Ambernath",
  "Amravati",
  "Amritsar",
  "Asansol",
  "Aurangabad",
  "Bareilly",
  "Belgaum",
  "Bhagalpur",
  "Bhavnagar",
  "Bhilai",
  "Bhilwara",
  "Bhiwandi",
  "Bhopal",
  "Bhubaneswar",
  "Bikaner",
  "Bilaspur",
  "Bokaro",
  "Chandigarh",
  "Coimbatore",
  "Cuttack",
  "Dehradun",
  "Dhanbad",
  "Durgapur",
  "Erode",
  "Faridabad",
  "Gaya",
  "Ghaziabad",
  "Gorakhpur",
  "Guntur",
  "Gurgaon",
  "Guwahati",
  "Gwalior",
  "Hubli",
  "Imphal",
  "Indore",
  "Jabalpur",
  "Jaipur",
  "Jalandhar",
  "Jammu",
  "Jamnagar",
  "Jamshedpur",
  "Jhansi",
  "Jodhpur",
  "Kakinada",
  "Kannur",
  "Kanpur",
  "Kochi",
  "Kohima",
  "Kolhapur",
  "Kollam",
  "Kota",
  "Kozhikode",
  "Kurnool",
  "Lucknow",
  "Ludhiana",
  "Madurai",
  "Mangalore",
  "Mathura",
  "Meerut",
  "Moradabad",
  "Muzaffarpur",
  "Mysore",
  "Nagpur",
  "Nanded",
  "Nashik",
  "Navi Mumbai",
  "Nellore",
  "Noida",
  "Panipat",
  "Patna",
  "Pondicherry",
  "Prayagraj",
  "Puducherry",
  "Raichur",
  "Raipur",
  "Rajkot",
  "Ranchi",
  "Rourkela",
  "Sagar",
  "Salem",
  "Sangli",
  "Shimla",
  "Siliguri",
  "Solapur",
  "Srinagar",
  "Surat",
  "Thane",
  "Thiruvananthapuram",
  "Tiruchirappalli",
  "Tirunelveli",
  "Tirupati",
  "Tiruppur",
  "Udaipur",
  "Ujjain",
  "Vadodara",
  "Varanasi",
  "Vasai-Virar",
  "Vellore",
  "Vijayawada",
  "Visakhapatnam",
  "Warangal",
] as const;

export const ALL_INDIAN_CITIES = [
  ...TIER_1_CITIES,
  ...TIER_2_CITIES,
].sort();

// Indian States and Union Territories
export const INDIAN_STATES = [
  // States (28)
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union Territories (8)
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type IndianState = typeof INDIAN_STATES[number];

// State to Cities mapping - major cities by state
export const STATE_CITIES: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Tirupati"],
  "Karnataka": ["Bangalore", "Bengaluru", "Mysore", "Mangalore", "Hubli"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Noida"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
  "Haryana": ["Faridabad", "Gurgaon", "Gurugram", "Rohtak", "Panipat"],
  "Delhi": ["New Delhi", "Delhi", "Dwarka", "Rohini"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Puri"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani"],
  "Himachal Pradesh": ["Shimla", "Mandi", "Solan", "Dharamshala"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
  "Chandigarh": ["Chandigarh"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
};

// Visibility Levels
export const VISIBILITY_LEVELS = [
  "High", // Prime visibility with maximum exposure
  "Medium", // Good visibility with moderate foot traffic
  "Low" // Limited visibility or niche audience
] as const;

// Operating Hours Presets
export const OPERATING_HOURS_PRESETS = [
  "Business hours (09:00-18:00 | Mon-Fri)",
  "Mall hours (10:00-22:00 | Mon-Sun)",
  "Retail (11:00-23:00 | Mon-Sun)",
  "Airport/Highways (24/7 | Mon-Sun)",
  "Custom"
] as const;

// Detailed Age Groups
export const DETAILED_AGE_GROUPS = [
  "Children (5-12)",
  "Teenagers (13-17)",
  "Young Adults (18-25)",
  "Adults (26-40)",
  "Middle Age (41-55)",
  "Seniors (55+)",
  "All Ages"
] as const;

// Gender Orientation
export const GENDER_ORIENTATIONS = [
  "Male Dominant",
  "Female Dominant",
  "Mixed Gender",
  "Family Oriented"
] as const;

// Income Levels
export const INCOME_LEVELS = [
  "Budget Conscious",
  "Middle Income",
  "Premium Audience",
  "Luxury Buyers"
] as const;

// Lifestyle Tags
export const LIFESTYLE_TAGS = [
  "Working Professionals",
  "Students",
  "Commuters",
  "Shoppers",
  "Tourists",
  "Local Residents",
  "Health Conscious",
  "Tech Savvy"
] as const;

// Location Tags - Nearby Facilities & Points of Interest
export const LOCATION_TAGS = {
  Educational: [
    "School Nearby",
    "College/University",
    "Coaching Centers",
    "Library"
  ],
  Healthcare: [
    "Hospital",
    "Clinic",
    "Pharmacy",
    "Diagnostic Center"
  ],
  Commercial: [
    "Shopping Mall",
    "Market Area",
    "Office Complex",
    "Bank/ATM"
  ],
  "Food & Dining": [
    "Restaurant",
    "Food Court",
    "Cafe",
    "Street Food"
  ],
  Transportation: [
    "Bus Stop",
    "Metro Station",
    "Railway Station",
    "Airport",
    "Parking Area"
  ],
  Residential: [
    "Housing Society",
    "PG/Hostel",
    "Apartment Complex"
  ],
  "Religious & Cultural": [
    "Temple",
    "Church",
    "Mosque",
    "Gurudwara",
    "Cultural Center"
  ],
  Industrial: [
    "Factory",
    "Industrial Area",
    "Warehouse"
  ],
  "Safety & Security": [
    "Police Station",
    "Fire Station",
    "Security Office"
  ],
  Entertainment: [
    "Cinema Hall",
    "Park/Garden",
    "Sports Complex",
    "Gym"
  ]
} as const;

// Flatten all location tags for easy access
export const ALL_LOCATION_TAGS = Object.values(LOCATION_TAGS).flat();
