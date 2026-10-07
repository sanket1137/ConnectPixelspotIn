// ========== VENUE CATEGORIES ==========
// Canonical list of all valid venue categories for screens.
// This is the single source of truth — used in UI dropdowns, DB validation, and normalization.
export const VENUE_CATEGORIES = [
  'Airport',
  'Apartment',
  'Bus Stop',
  'Cafe',
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

// ========== USER ROLES ==========
// Canonical list of all valid user roles.
// This is the single source of truth — used in UI dropdowns/badges and API validation.
export const USER_ROLES = ['admin', 'screen_owner', 'advertiser', 'agency'] as const;

export type UserRole = typeof USER_ROLES[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  screen_owner: 'Screen Owner',
  advertiser: 'Advertiser',
  agency: 'Agency',
};

/**
 * Maps non-standard venue category values found in DB to canonical ones.
 * Key = lowercase non-standard value, Value = canonical value from VENUE_CATEGORIES.
 */
export const VENUE_CATEGORY_ALIASES: Record<string, string> = {
  'cafe': 'Cafe',
  'café': 'Cafe',
  'cafe ': 'Cafe',
  ' café': 'Cafe',
  'cinema lobby': 'Cinema',
  'multiplex': 'Cinema',
  'food court': 'Restaurant',
  'healthcare': 'Hospital',
  'hospital': 'Hospital',
  'hotel/restaurant': 'Hotel',
  'metro station': 'Metro',
  'metro': 'Metro',
  'office complex': 'Office Building',
  'office building': 'Office Building',
  'corporate office': 'Corporate Park',
  'corporate tech park': 'Corporate Park',
  'corporate park': 'Corporate Park',
  'residential society': 'Apartment',
  'residential building': 'Apartment',
  'apartment': 'Apartment',
  'apartments': 'Apartment',
  'residential': 'Apartment',
  'residential complex': 'Apartment',
  'housing society': 'Apartment',
  'gated society': 'Apartment',
  'gated community': 'Apartment',
  'residence': 'Apartment',
  'residences': 'Apartment',
  'society': 'Apartment',
  'coworking space': 'Co-working',
  'co-working space': 'Co-working',
  'co working': 'Co-working',
  'shopping mall': 'Mall',
  'hypermarket': 'Mall',
  'roadside': 'Road Side',
  'road side': 'Road Side',
  'outdoor': 'Road Side',
  'bus station': 'Bus Stop',
  'bus stop': 'Bus Stop',
  'railway station': 'Road Side',
  'saloon': 'Salon',
  'salon ': 'Salon',
  ' salon': 'Salon',
  'salon & spa': 'Salon',
  'transit hub': 'Transit Hub',
  'fitness': 'Gym',
  'sports complex': 'Stadium',
  'sports centre': 'Stadium',
  'theater': 'Cinema',
  'theatre': 'Cinema',
  'theater company': 'Cinema',
  'clinic': 'Hospital',
  ' clinic': 'Hospital',
  'dental clinic': 'Hospital',
  'dental': 'Hospital',
  'pet clinic': 'Hospital',
  'physiotherapy': 'Hospital',
  'skin clinic': 'Hospital',
  'skin & hair clinic': 'Hospital',
  'skin & hair': 'Hospital',
  'restobar': 'Restaurant',
  'resto bar': 'Restaurant',
  'bar & kitchen': 'Restaurant',
  ' restaurant': 'Restaurant',
  'restaurant': 'Restaurant',
  'highway': 'Highway',
  'petrol bunk': 'Petrol Bunk',
  'road junction': 'Road Junction',
  'retail store': 'Retail Store',
  'supermarket': 'Retail Store',
  'super market': 'Retail Store',
  'super market ': 'Retail Store',
  'hotel': 'Hotel',
};

/**
 * Normalize a venue category string to its canonical form.
 * Returns the canonical value if found in aliases, or the original value if already canonical.
 */
export function normalizeVenueCategory(raw: string): string {
  if (!raw) return raw;
  const alias = VENUE_CATEGORY_ALIASES[raw.toLowerCase().trim()];
  if (alias) return alias;
  // Check if it's already a canonical value (case-insensitive)
  const match = VENUE_CATEGORIES.find(v => v.toLowerCase() === raw.toLowerCase().trim());
  return match || raw;
}

/**
 * Given a canonical venue category, return ALL DB values that map to it
 * (including the canonical itself and any aliases).
 * Used by getFilteredScreens to do a broad match.
 */
export function getVenueCategoryVariants(canonical: string): string[] {
  const normalized = normalizeVenueCategory(canonical);
  const variants = new Set<string>();
  // Always include the canonical itself
  variants.add(normalized);
  variants.add(canonical.trim());
  // Add all aliases that resolve to this canonical
  for (const [alias, target] of Object.entries(VENUE_CATEGORY_ALIASES)) {
    if (target.toLowerCase() === normalized.toLowerCase()) {
      variants.add(alias);
    }
  }
  return Array.from(variants);
}

// ========== CITY NAME NORMALIZATION ==========
/**
 * Maps common alternate city spellings, regional names, and common typos to preferred canonical form.
 * Key = lowercase alternate, Value = canonical spelling.
 */
export const CITY_ALIASES: Record<string, string> = {
  // Bengaluru
  'bengaluru': 'Bengaluru',
  'bangalore': 'Bengaluru',
  'bengaluru urban': 'Bengaluru',
  'bengaluru rural': 'Bengaluru',
  'bangalore urban': 'Bengaluru',
  'bangalore rural': 'Bengaluru',
  'bangalore south': 'Bengaluru',
  'bangalore north': 'Bengaluru',
  'bangalore central': 'Bengaluru',
  'bengaluru city': 'Bengaluru',
  'banglore': 'Bengaluru',
  'benglore': 'Bengaluru',
  'benaglore': 'Bengaluru',
  'benagaluru': 'Bengaluru',
  'bangaluru': 'Bengaluru',
  'bengalooru': 'Bengaluru',
  'banglore city': 'Bengaluru',
  'blr': 'Bengaluru',

  // Mumbai
  'mumbai': 'Mumbai',
  'bombay': 'Mumbai',
  'bombai': 'Mumbai',
  'mumbai city': 'Mumbai',
  'mumbai suburban': 'Mumbai',
  'bom': 'Mumbai',

  // Delhi / NCR
  'delhi': 'Delhi',
  'new delhi': 'Delhi',
  'delhi ncr': 'Delhi',
  'ncr': 'Delhi',

  // Gurugram
  'gurugram': 'Gurugram',
  'gurgaon': 'Gurugram',
  'gurgoan': 'Gurugram',

  // Kolkata
  'kolkata': 'Kolkata',
  'calcutta': 'Kolkata',
  'calcata': 'Kolkata',

  // Chennai
  'chennai': 'Chennai',
  'madras': 'Chennai',

  // Hyderabad
  'hyderabad': 'Hyderabad',
  'secunderabad': 'Hyderabad',
  'hyd': 'Hyderabad',

  // Pune
  'pune': 'Pune',
  'poona': 'Pune',

  // Kochi
  'kochi': 'Kochi',
  'cochin': 'Kochi',
  'ernakulam': 'Kochi',

  // Thiruvananthapuram
  'thiruvananthapuram': 'Thiruvananthapuram',
  'trivandrum': 'Thiruvananthapuram',

  // Vadodara
  'vadodara': 'Vadodara',
  'baroda': 'Vadodara',

  // Visakhapatnam
  'visakhapatnam': 'Visakhapatnam',
  'vizag': 'Visakhapatnam',
  'visakapatnam': 'Visakhapatnam',

  // Mysuru
  'mysuru': 'Mysuru',
  'mysore': 'Mysuru',

  // Mangaluru
  'mangaluru': 'Mangaluru',
  'mangalore': 'Mangaluru',

  // Belagavi
  'belagavi': 'Belagavi',
  'belgaum': 'Belagavi',

  // Hubballi
  'hubballi': 'Hubballi',
  'hubli': 'Hubballi',

  // Kalaburagi
  'kalaburagi': 'Kalaburagi',
  'kalburgi': 'Kalaburagi',
  'gulbarga': 'Kalaburagi',

  // Ballari
  'ballari': 'Ballari',
  'bellary': 'Ballari',
  'bellari': 'Ballari',

  // Puducherry
  'puducherry': 'Puducherry',
  'pondicherry': 'Puducherry',

  // Prayagraj
  'prayagraj': 'Prayagraj',
  'allahabad': 'Prayagraj',

  // Varanasi
  'varanasi': 'Varanasi',
  'banaras': 'Varanasi',
  'benares': 'Varanasi',
  'kashi': 'Varanasi',

  // Vijayawada
  'vijayawada': 'Vijayawada',
  'vijaywada': 'Vijayawada',
  'bezawada': 'Vijayawada',

  // Ahmedabad
  'ahmedabad': 'Ahmedabad',
  'ahmadabad': 'Ahmedabad',
  'ahmedbad': 'Ahmedabad',
  'amdavad': 'Ahmedabad',

  // Bhubaneswar
  'bhubaneswar': 'Bhubaneswar',
  'bhubaneshwar': 'Bhubaneswar',

  // Shimla
  'shimla': 'Shimla',
  'simla': 'Shimla',

  // Jalandhar
  'jalandhar': 'Jalandhar',
  'jullundur': 'Jalandhar',

  // Panaji
  'panaji': 'Panaji',
  'panjim': 'Panaji',
};

/**
 * Normalize a city name to its canonical spelling.
 * Also title-cases the result.
 */
export function normalizeCityName(raw: string): string {
  if (!raw) return raw;
  const trimmed = raw.trim();
  const alias = CITY_ALIASES[trimmed.toLowerCase()];
  if (alias) return alias;
  return trimmed.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Given any city string (e.g. "Benglore", "Bangalore", or "Bengaluru"),
 * return all known spelling variants and aliases for SQL/filter matching.
 */
export function getCityVariants(raw: string): string[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  const canonical = normalizeCityName(trimmed);
  const variants = new Set<string>();

  // Include canonical and the raw input (lowercased)
  variants.add(canonical.toLowerCase());
  variants.add(trimmed.toLowerCase());

  // Add all aliases that map to this canonical name
  for (const [alias, target] of Object.entries(CITY_ALIASES)) {
    if (target.toLowerCase() === canonical.toLowerCase()) {
      variants.add(alias);
    }
  }

  return Array.from(variants);
}

// ========== TIER 1 & TIER 2 CITIES ==========
// Tier 1 and Tier 2 Indian Cities
export const TIER_1_CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
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
  "Gurugram",
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
  "Mangaluru",
  "Mathura",
  "Meerut",
  "Moradabad",
  "Muzaffarpur",
  "Mysuru",
  "Nagpur",
  "Nanded",
  "Nashik",
  "Navi Mumbai",
  "Nellore",
  "Noida",
  "Panipat",
  "Patna",
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
  "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Belagavi", "Kalaburagi", "Dharwad", "Vijayapur", "Tumakuru", "Udupi", "Shivamogga", "Ballari", "Hassan", "Bidar", "Raichur"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Chhatrapati Sambhajinagar", "Thane", "Navi Mumbai"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Varanasi", "Noida", "Greater Noida"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Rohtak", "Ambala", "Panchkula"],
  "Delhi": ["Delhi", "Dwarka", "Rohini"],
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

// ========== URL SLUG HELPERS (for SEO routes / sitemap) ==========
/**
 * Convert any human-readable name to a URL slug.
 * - Lowercase
 * - Strip diacritics (é → e)
 * - Replace any non-alphanumeric run with a single hyphen
 * - Trim leading/trailing hyphens
 */
export function toSlug(raw: string): string {
  if (!raw) return "";
  return raw
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve a city slug back to its canonical city name.
 * Matches against ALL_INDIAN_CITIES + CITY_ALIASES. Returns null if no match.
 */
export function fromCitySlug(slug: string): string | null {
  if (!slug) return null;
  const target = toSlug(slug);
  // 1. Direct match against canonical city list
  const direct = ALL_INDIAN_CITIES.find(c => toSlug(c) === target);
  if (direct) return direct;
  // 2. Match against alias keys (e.g., "bangalore" → "Bengaluru")
  for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
    if (toSlug(alias) === target) return canonical;
  }
  return null;
}

/**
 * Resolve a venue slug back to its canonical venue category.
 * Matches against VENUE_CATEGORIES + VENUE_CATEGORY_ALIASES. Returns null if no match.
 */
export function fromVenueSlug(slug: string): string | null {
  if (!slug) return null;
  const target = toSlug(slug);
  const direct = VENUE_CATEGORIES.find(v => toSlug(v) === target);
  if (direct) return direct;
  for (const [alias, canonical] of Object.entries(VENUE_CATEGORY_ALIASES)) {
    if (toSlug(alias) === target) return canonical;
  }
  return null;
}
