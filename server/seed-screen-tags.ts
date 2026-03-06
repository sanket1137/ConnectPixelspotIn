/**
 * Master Screen Tag Seed Data
 * 
 * Seeds the `screen_tags` table with all master tag definitions.
 * Safe to re-run: uses upsert (ON CONFLICT slug DO UPDATE).
 * 
 * Usage: npx tsx server/seed-screen-tags.ts
 */

import { db } from "./db";
import { screenTags } from "@shared/schema";
import { sql } from "drizzle-orm";

interface MasterTag {
  slug: string;
  displayName: string;
  category: string;
  description: string;
  googlePlaceTypes: string | null; // JSON array string
  maxDistanceMeters: number | null;
  minPoiCount: number | null;
  baseScore: number;
  priority: number;
  iconName: string;
  colorCode: string;
}

const MASTER_TAGS: MasterTag[] = [
  // ═══════════════════════════════════════
  // TRANSPORTATION (proximity + density)
  // ═══════════════════════════════════════
  {
    slug: "metro_station_proximity",
    displayName: "Near Metro Station",
    category: "Transportation",
    description: "Screen is within walking distance of a metro/subway station",
    googlePlaceTypes: '["subway_station","light_rail_station"]',
    maxDistanceMeters: 250,
    minPoiCount: null,
    baseScore: 1000,
    priority: 1,
    iconName: "Train",
    colorCode: "#1976D2",
  },
  {
    slug: "railway_station_proximity",
    displayName: "Near Railway Station",
    category: "Transportation",
    description: "Screen is within walking distance of a railway station",
    googlePlaceTypes: '["train_station"]',
    maxDistanceMeters: 500,
    minPoiCount: null,
    baseScore: 950,
    priority: 2,
    iconName: "TrainFront",
    colorCode: "#1565C0",
  },
  {
    slug: "bus_terminal_proximity",
    displayName: "Near Bus Stop/Terminal",
    category: "Transportation",
    description: "Screen is near a bus station or stop",
    googlePlaceTypes: '["bus_station","bus_stop"]',
    maxDistanceMeters: 250,
    minPoiCount: null,
    baseScore: 850,
    priority: 3,
    iconName: "Bus",
    colorCode: "#42A5F5",
  },
  {
    slug: "airport_proximity",
    displayName: "Near Airport",
    category: "Transportation",
    description: "Screen is in or near an airport",
    googlePlaceTypes: '["airport"]',
    maxDistanceMeters: 500,
    minPoiCount: null,
    baseScore: 1000,
    priority: 4,
    iconName: "Plane",
    colorCode: "#0D47A1",
  },
  {
    slug: "transit_hub",
    displayName: "Transit Hub",
    category: "Transportation",
    description: "Multiple transit options within reach (bus + metro + rail)",
    googlePlaceTypes: '["subway_station","train_station","bus_station","bus_stop"]',
    maxDistanceMeters: 500,
    minPoiCount: 5,
    baseScore: 950,
    priority: 5,
    iconName: "Route",
    colorCode: "#2196F3",
  },
  {
    slug: "parking_zone",
    displayName: "Parking Zone",
    category: "Transportation",
    description: "Near parking facilities",
    googlePlaceTypes: '["parking"]',
    maxDistanceMeters: 250,
    minPoiCount: null,
    baseScore: 700,
    priority: 6,
    iconName: "ParkingCircle",
    colorCode: "#90CAF9",
  },

  // ═══════════════════════════════════════
  // RETAIL (proximity + density)
  // ═══════════════════════════════════════
  {
    slug: "mall_proximity",
    displayName: "Near Shopping Mall",
    category: "Retail",
    description: "Screen is within walking distance of a shopping mall",
    googlePlaceTypes: '["shopping_mall"]',
    maxDistanceMeters: 250,
    minPoiCount: null,
    baseScore: 950,
    priority: 10,
    iconName: "ShoppingBag",
    colorCode: "#E91E63",
  },
  {
    slug: "shopping_district",
    displayName: "Shopping District",
    category: "Retail",
    description: "High density of retail stores in the area",
    googlePlaceTypes: '["store","clothing_store","shoe_store","jewelry_store","department_store"]',
    maxDistanceMeters: 250,
    minPoiCount: 8,
    baseScore: 900,
    priority: 11,
    iconName: "Store",
    colorCode: "#C2185B",
  },
  {
    slug: "luxury_retail_zone",
    displayName: "Luxury Retail Zone",
    category: "Retail",
    description: "Premium/luxury stores and boutiques nearby",
    googlePlaceTypes: '["jewelry_store","clothing_store","department_store"]',
    maxDistanceMeters: 500,
    minPoiCount: 3,
    baseScore: 880,
    priority: 12,
    iconName: "Gem",
    colorCode: "#AD1457",
  },
  {
    slug: "supermarket_nearby",
    displayName: "Near Supermarket",
    category: "Retail",
    description: "Supermarket or grocery store within walking distance",
    googlePlaceTypes: '["supermarket","grocery_store"]',
    maxDistanceMeters: 250,
    minPoiCount: null,
    baseScore: 750,
    priority: 13,
    iconName: "ShoppingCart",
    colorCode: "#F48FB1",
  },
  {
    slug: "electronics_retail_zone",
    displayName: "Electronics Hub",
    category: "Retail",
    description: "Cluster of electronics and tech stores",
    googlePlaceTypes: '["electronics_store","cell_phone_store"]',
    maxDistanceMeters: 500,
    minPoiCount: 3,
    baseScore: 850,
    priority: 14,
    iconName: "Smartphone",
    colorCode: "#EC407A",
  },

  // ═══════════════════════════════════════
  // FOOD & BEVERAGE
  // ═══════════════════════════════════════
  {
    slug: "foodie_zone",
    displayName: "Foodie Zone",
    category: "Food",
    description: "High density of restaurants in the area",
    googlePlaceTypes: '["restaurant"]',
    maxDistanceMeters: 250,
    minPoiCount: 10,
    baseScore: 900,
    priority: 20,
    iconName: "UtensilsCrossed",
    colorCode: "#FF5722",
  },
  {
    slug: "restaurant_cluster",
    displayName: "Restaurant Cluster",
    category: "Food",
    description: "Multiple restaurants within close proximity",
    googlePlaceTypes: '["restaurant","meal_takeaway","meal_delivery"]',
    maxDistanceMeters: 250,
    minPoiCount: 5,
    baseScore: 850,
    priority: 21,
    iconName: "Utensils",
    colorCode: "#E64A19",
  },
  {
    slug: "cafe_cluster",
    displayName: "Café Hub",
    category: "Food",
    description: "Cluster of cafes — ideal for young professional targeting",
    googlePlaceTypes: '["cafe"]',
    maxDistanceMeters: 250,
    minPoiCount: 3,
    baseScore: 800,
    priority: 22,
    iconName: "Coffee",
    colorCode: "#BF360C",
  },
  {
    slug: "bar_nightlife_cluster",
    displayName: "Nightlife Zone",
    category: "Food",
    description: "Bars and nightlife venues nearby",
    googlePlaceTypes: '["bar","night_club"]',
    maxDistanceMeters: 500,
    minPoiCount: 3,
    baseScore: 820,
    priority: 23,
    iconName: "Wine",
    colorCode: "#D84315",
  },
  {
    slug: "fast_food_zone",
    displayName: "Fast Food Zone",
    category: "Food",
    description: "Quick-service restaurants cluster",
    googlePlaceTypes: '["fast_food_restaurant","meal_takeaway"]',
    maxDistanceMeters: 250,
    minPoiCount: 3,
    baseScore: 780,
    priority: 24,
    iconName: "Pizza",
    colorCode: "#FF7043",
  },

  // ═══════════════════════════════════════
  // EDUCATION
  // ═══════════════════════════════════════
  {
    slug: "university_proximity",
    displayName: "Near University/College",
    category: "Education",
    description: "Screen is near a university or college campus",
    googlePlaceTypes: '["university"]',
    maxDistanceMeters: 500,
    minPoiCount: null,
    baseScore: 900,
    priority: 30,
    iconName: "GraduationCap",
    colorCode: "#4CAF50",
  },
  {
    slug: "school_zone",
    displayName: "School Zone",
    category: "Education",
    description: "Schools within proximity",
    googlePlaceTypes: '["school","primary_school","secondary_school"]',
    maxDistanceMeters: 250,
    minPoiCount: null,
    baseScore: 800,
    priority: 31,
    iconName: "School",
    colorCode: "#388E3C",
  },
  {
    slug: "coaching_cluster",
    displayName: "Coaching Hub",
    category: "Education",
    description: "Cluster of coaching / tutorial institutes and schools",
    googlePlaceTypes: '["school","primary_school","secondary_school","library"]',
    maxDistanceMeters: 500,
    minPoiCount: 5,
    baseScore: 780,
    priority: 32,
    iconName: "BookOpen",
    colorCode: "#66BB6A",
  },

  // ═══════════════════════════════════════
  // HEALTHCARE
  // ═══════════════════════════════════════
  {
    slug: "hospital_nearby",
    displayName: "Near Hospital",
    category: "Healthcare",
    description: "Hospital within walking distance",
    googlePlaceTypes: '["hospital"]',
    maxDistanceMeters: 500,
    minPoiCount: null,
    baseScore: 850,
    priority: 40,
    iconName: "Hospital",
    colorCode: "#F44336",
  },
  {
    slug: "clinic_cluster",
    displayName: "Medical Complex",
    category: "Healthcare",
    description: "Multiple clinics or medical facilities nearby",
    googlePlaceTypes: '["doctor","dentist","physiotherapist","hospital"]',
    maxDistanceMeters: 500,
    minPoiCount: 3,
    baseScore: 800,
    priority: 41,
    iconName: "Stethoscope",
    colorCode: "#D32F2F",
  },
  {
    slug: "pharmacy_cluster",
    displayName: "Pharmacy Cluster",
    category: "Healthcare",
    description: "Multiple pharmacies nearby",
    googlePlaceTypes: '["pharmacy"]',
    maxDistanceMeters: 250,
    minPoiCount: 2,
    baseScore: 750,
    priority: 42,
    iconName: "Pill",
    colorCode: "#EF5350",
  },

  // ═══════════════════════════════════════
  // ENTERTAINMENT
  // ═══════════════════════════════════════
  {
    slug: "cinema_nearby",
    displayName: "Near Cinema",
    category: "Entertainment",
    description: "Movie theater within walking distance",
    googlePlaceTypes: '["movie_theater"]',
    maxDistanceMeters: 250,
    minPoiCount: null,
    baseScore: 850,
    priority: 50,
    iconName: "Film",
    colorCode: "#9C27B0",
  },
  {
    slug: "park_proximity",
    displayName: "Near Park/Garden",
    category: "Entertainment",
    description: "Public park or garden nearby — high weekend footfall",
    googlePlaceTypes: '["park"]',
    maxDistanceMeters: 250,
    minPoiCount: null,
    baseScore: 800,
    priority: 51,
    iconName: "Trees",
    colorCode: "#7B1FA2",
  },
  {
    slug: "gym_nearby",
    displayName: "Near Gym/Fitness",
    category: "Entertainment",
    description: "Gym or fitness center within walking distance",
    googlePlaceTypes: '["gym"]',
    maxDistanceMeters: 250,
    minPoiCount: null,
    baseScore: 800,
    priority: 52,
    iconName: "Dumbbell",
    colorCode: "#AB47BC",
  },
  {
    slug: "sports_complex",
    displayName: "Sports Complex",
    category: "Entertainment",
    description: "Sports or recreation complex nearby",
    googlePlaceTypes: '["stadium"]',
    maxDistanceMeters: 500,
    minPoiCount: 2,
    baseScore: 820,
    priority: 53,
    iconName: "Trophy",
    colorCode: "#8E24AA",
  },

  // ═══════════════════════════════════════
  // BUSINESS / CORPORATE
  // ═══════════════════════════════════════
  {
    slug: "corporate_zone",
    displayName: "Corporate Zone",
    category: "Business",
    description: "Office buildings and corporate parks in the area",
    googlePlaceTypes: '["accounting","insurance_agency","real_estate_agency"]',
    maxDistanceMeters: 500,
    minPoiCount: 3,
    baseScore: 880,
    priority: 60,
    iconName: "Building2",
    colorCode: "#607D8B",
  },
  {
    slug: "tech_park_proximity",
    displayName: "Near Tech Park",
    category: "Business",
    description: "IT/Tech park within reach",
    googlePlaceTypes: '["accounting","insurance_agency","real_estate_agency"]',
    maxDistanceMeters: 500,
    minPoiCount: null,
    baseScore: 860,
    priority: 61,
    iconName: "Laptop",
    colorCode: "#455A64",
  },
  {
    slug: "bank_atm_cluster",
    displayName: "Banking Area",
    category: "Business",
    description: "Cluster of banks and ATMs",
    googlePlaceTypes: '["bank","atm"]',
    maxDistanceMeters: 250,
    minPoiCount: 3,
    baseScore: 750,
    priority: 62,
    iconName: "Landmark",
    colorCode: "#78909C",
  },
  {
    slug: "hotel_cluster",
    displayName: "Hotel District",
    category: "Business",
    description: "Multiple hotels/lodging nearby — business or tourist zone",
    googlePlaceTypes: '["lodging","hotel"]',
    maxDistanceMeters: 500,
    minPoiCount: 3,
    baseScore: 830,
    priority: 63,
    iconName: "Hotel",
    colorCode: "#546E7A",
  },

  // ═══════════════════════════════════════
  // RESIDENTIAL
  // ═══════════════════════════════════════
  {
    slug: "residential_area",
    displayName: "Residential Area",
    category: "Residential",
    description: "Surrounded by residential buildings",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 750,
    priority: 65,
    iconName: "Home",
    colorCode: "#795548",
  },

  // ═══════════════════════════════════════
  // RELIGIOUS & CULTURAL
  // ═══════════════════════════════════════
  {
    slug: "religious_site_proximity",
    displayName: "Near Place of Worship",
    category: "Religious",
    description: "Temple, mosque, church, or gurudwara nearby",
    googlePlaceTypes: '["hindu_temple","mosque","church"]',
    maxDistanceMeters: 250,
    minPoiCount: null,
    baseScore: 750,
    priority: 70,
    iconName: "Church",
    colorCode: "#FF9800",
  },
  {
    slug: "tourist_zone",
    displayName: "Tourist Zone",
    category: "Cultural",
    description: "Tourist attractions, museums, monuments nearby",
    googlePlaceTypes: '["tourist_attraction","museum","art_gallery"]',
    maxDistanceMeters: 500,
    minPoiCount: 3,
    baseScore: 870,
    priority: 71,
    iconName: "MapPin",
    colorCode: "#F57C00",
  },

  // ═══════════════════════════════════════
  // COMPOSITE / LIFESTYLE (no googlePlaceTypes — derived from other tags)
  // ═══════════════════════════════════════
  {
    slug: "it_hub",
    displayName: "IT/Tech Hub",
    category: "Lifestyle",
    description: "Corporate zone with tech park presence and electronics stores",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 900,
    priority: 80,
    iconName: "Monitor",
    colorCode: "#00BCD4",
  },
  {
    slug: "student_hub",
    displayName: "Student Hub",
    category: "Lifestyle",
    description: "University area with cafes — ideal for youth targeting",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 880,
    priority: 81,
    iconName: "Backpack",
    colorCode: "#009688",
  },
  {
    slug: "family_zone",
    displayName: "Family Zone",
    category: "Lifestyle",
    description: "School + park + residential — family-friendly area",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 830,
    priority: 82,
    iconName: "Users",
    colorCode: "#00897B",
  },

  // ═══════════════════════════════════════
  // AUDIENCE PROFILE (derived from tag combinations)
  // ═══════════════════════════════════════
  {
    slug: "shopping_enthusiasts",
    displayName: "Shopping Enthusiasts",
    category: "Audience",
    description: "Area attracts shoppers (mall + retail district present)",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 800,
    priority: 90,
    iconName: "ShoppingBag",
    colorCode: "#673AB7",
  },
  {
    slug: "commuters",
    displayName: "Commuter Audience",
    category: "Audience",
    description: "Multiple transit points — high commuter footfall",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 820,
    priority: 91,
    iconName: "Footprints",
    colorCode: "#5E35B1",
  },
  {
    slug: "foodies",
    displayName: "Foodie Audience",
    category: "Audience",
    description: "Restaurant and foodie zone — culinary-focused audience",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 800,
    priority: 92,
    iconName: "ChefHat",
    colorCode: "#7E57C2",
  },
  {
    slug: "health_conscious",
    displayName: "Health-Conscious Audience",
    category: "Audience",
    description: "Gyms, parks, sports — health & fitness audience",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 800,
    priority: 93,
    iconName: "Heart",
    colorCode: "#9575CD",
  },
  {
    slug: "working_professionals",
    displayName: "Working Professionals",
    category: "Audience",
    description: "Corporate zone + café cluster — professional audience",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 810,
    priority: 94,
    iconName: "Briefcase",
    colorCode: "#512DA8",
  },

  // ═══════════════════════════════════════
  // TIME-BASED (derived from tag combinations)
  // ═══════════════════════════════════════
  {
    slug: "morning_rush_zone",
    displayName: "Morning Rush Zone",
    category: "Time",
    description: "Transit + corporate — high morning commuter traffic",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 850,
    priority: 100,
    iconName: "Sunrise",
    colorCode: "#FFC107",
  },
  {
    slug: "late_night_active",
    displayName: "Late Night Active",
    category: "Time",
    description: "Bars, nightlife, 24-hour services — active after dark",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 820,
    priority: 101,
    iconName: "Moon",
    colorCode: "#FFA000",
  },
  {
    slug: "weekend_hotspot",
    displayName: "Weekend Hotspot",
    category: "Time",
    description: "Mall or entertainment venues — high weekend footfall",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 830,
    priority: 102,
    iconName: "PartyPopper",
    colorCode: "#FFB300",
  },

  // ═══════════════════════════════════════
  // ECONOMIC ZONE (derived from price levels)
  // ═══════════════════════════════════════
  {
    slug: "luxury_lifestyle_zone",
    displayName: "Luxury Zone",
    category: "Economic",
    description: "Expensive venues — premium/luxury audience",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 900,
    priority: 110,
    iconName: "Crown",
    colorCode: "#FFD700",
  },
  {
    slug: "mid_market_zone",
    displayName: "Mid-Market Zone",
    category: "Economic",
    description: "Moderately priced area — middle-income audience",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 700,
    priority: 111,
    iconName: "Wallet",
    colorCode: "#4DB6AC",
  },
  {
    slug: "value_market_zone",
    displayName: "Value Market Zone",
    category: "Economic",
    description: "Budget-friendly area",
    googlePlaceTypes: null,
    maxDistanceMeters: null,
    minPoiCount: null,
    baseScore: 650,
    priority: 112,
    iconName: "IndianRupee",
    colorCode: "#81C784",
  },
];

async function seedTags() {
  console.log(`🌱 Seeding ${MASTER_TAGS.length} master screen tags...`);

  for (const tag of MASTER_TAGS) {
    await db
      .insert(screenTags)
      .values({
        slug: tag.slug,
        displayName: tag.displayName,
        category: tag.category,
        description: tag.description,
        googlePlaceTypes: tag.googlePlaceTypes,
        maxDistanceMeters: tag.maxDistanceMeters,
        minPoiCount: tag.minPoiCount,
        baseScore: tag.baseScore,
        priority: tag.priority,
        iconName: tag.iconName,
        colorCode: tag.colorCode,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: screenTags.slug,
        set: {
          displayName: sql`EXCLUDED.display_name`,
          category: sql`EXCLUDED.category`,
          description: sql`EXCLUDED.description`,
          googlePlaceTypes: sql`EXCLUDED.google_place_types`,
          maxDistanceMeters: sql`EXCLUDED.max_distance_meters`,
          minPoiCount: sql`EXCLUDED.min_poi_count`,
          baseScore: sql`EXCLUDED.base_score`,
          priority: sql`EXCLUDED.priority`,
          iconName: sql`EXCLUDED.icon_name`,
          colorCode: sql`EXCLUDED.color_code`,
        },
      });
  }

  console.log(`✅ Seeded ${MASTER_TAGS.length} master tags successfully.`);
  process.exit(0);
}

seedTags().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
