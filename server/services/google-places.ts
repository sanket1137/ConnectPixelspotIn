/**
 * Google Places API v1 – Nearby Search Service
 * 
 * Calls Places API (New) to find nearby POIs for a given lat/lng.
 * Groups place types into 7 batches (max 50 types per request).
 * Deduplicates by placeId and caches results for 48 hours.
 * 
 * Env: GOOGLE_PLACES_API_KEY
 */

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────
export interface NearbyPlace {
  placeId: string;
  displayName: string;
  types: string[];
  latitude: number;
  longitude: number;
  distanceMeters: number; // calculated via haversine
  priceLevel?: string;    // PRICE_LEVEL_INEXPENSIVE .. PRICE_LEVEL_VERY_EXPENSIVE
}

export interface PlaceSearchResult {
  places: NearbyPlace[];
  totalApiCalls: number;
  cached: boolean;
}

// ──────────────────────────────────────────
// Google Places type groups (7 batches)
// ──────────────────────────────────────────
const TYPE_GROUPS: string[][] = [
  // Group 1 — Transport (only specific station types — no transit_station which is too broad)
  ["subway_station", "light_rail_station", "train_station", "bus_station", "bus_stop", "airport", "parking"],

  // Group 2 — Retail
  ["shopping_mall", "store", "clothing_store", "shoe_store", "jewelry_store", "department_store", "supermarket", "grocery_store", "electronics_store", "cell_phone_store"],

  // Group 3 — Food & nightlife
  ["restaurant", "cafe", "bar", "night_club", "fast_food_restaurant", "meal_takeaway", "meal_delivery"],

  // Group 4 — Education
  ["university", "school", "primary_school", "secondary_school", "library"],

  // Group 5 — Healthcare
  ["hospital", "doctor", "dentist", "physiotherapist", "pharmacy"],

  // Group 6 — Entertainment & fitness
  ["movie_theater", "park", "gym", "stadium", "tourist_attraction", "museum", "art_gallery"],

  // Group 7 — Business & lodging (only API-supported types)
  ["accounting", "insurance_agency", "real_estate_agency", "bank", "atm", "lodging", "hotel", "hindu_temple", "mosque", "church"],
];

// ──────────────────────────────────────────
// 48-hour in-memory cache
// ──────────────────────────────────────────
interface CacheEntry {
  result: PlaceSearchResult;
  expiresAt: number;
}

const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours
const cache = new Map<string, CacheEntry>();

function cacheKey(lat: number, lng: number): string {
  // Round to 4 decimal places (~11m precision) for cache hits on tiny moves
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function getCached(lat: number, lng: number): PlaceSearchResult | null {
  const key = cacheKey(lat, lng);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return { ...entry.result, cached: true };
}

function setCache(lat: number, lng: number, result: PlaceSearchResult): void {
  const key = cacheKey(lat, lng);
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });

  // Evict oldest entries if cache grows beyond 500
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

// ──────────────────────────────────────────
// Haversine distance (meters)
// ──────────────────────────────────────────
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ──────────────────────────────────────────
// Places API (New) – searchNearby
// ──────────────────────────────────────────
const PLACES_API_URL = "https://places.googleapis.com/v1/places:searchNearby";

async function searchNearbyBatch(
  apiKey: string,
  latitude: number,
  longitude: number,
  includedTypes: string[],
  radiusMeters: number = 500,
): Promise<NearbyPlace[]> {
  const body = {
    includedTypes,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude, longitude },
        radius: radiusMeters,
      },
    },
  };

  const fieldMask = "places.id,places.displayName,places.types,places.location,places.priceLevel";

  const response = await fetch(PLACES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Places API error (${response.status}):`, errorText);
    return []; // graceful degradation
  }

  const data = await response.json() as {
    places?: Array<{
      id: string;
      displayName?: { text: string };
      types?: string[];
      location?: { latitude: number; longitude: number };
      priceLevel?: string;
    }>;
  };

  if (!data.places || data.places.length === 0) return [];

  return data.places.map((p) => ({
    placeId: p.id,
    displayName: p.displayName?.text ?? "Unknown",
    types: p.types ?? [],
    latitude: p.location?.latitude ?? latitude,
    longitude: p.location?.longitude ?? longitude,
    distanceMeters: haversineDistance(
      latitude, longitude,
      p.location?.latitude ?? latitude,
      p.location?.longitude ?? longitude,
    ),
    priceLevel: p.priceLevel,
  }));
}

// ──────────────────────────────────────────
// Public: fetch all nearby places (7 batches)
// ──────────────────────────────────────────
export async function fetchNearbyPlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number = 500,
): Promise<PlaceSearchResult> {
  // Check cache first
  const cached = getCached(latitude, longitude);
  if (cached) {
    console.log(`[GooglePlaces] Cache hit for ${latitude},${longitude} (${cached.places.length} places)`);
    return cached;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn("[GooglePlaces] GOOGLE_PLACES_API_KEY not set — returning empty results");
    return { places: [], totalApiCalls: 0, cached: false };
  }

  console.log(`[GooglePlaces] Fetching nearby places for ${latitude},${longitude} (radius=${radiusMeters}m, ${TYPE_GROUPS.length} batches)`);

  // Fire all 7 batches in parallel
  const batchResults = await Promise.all(
    TYPE_GROUPS.map((types) =>
      searchNearbyBatch(apiKey, latitude, longitude, types, radiusMeters),
    ),
  );

  // Flatten + dedup by placeId (keep lowest distance entry)
  const byId = new Map<string, NearbyPlace>();
  for (const batch of batchResults) {
    for (const place of batch) {
      const existing = byId.get(place.placeId);
      if (!existing || place.distanceMeters < existing.distanceMeters) {
        byId.set(place.placeId, place);
      }
    }
  }

  const allPlaces = Array.from(byId.values());
  console.log(`[GooglePlaces] Found ${allPlaces.length} unique places (${TYPE_GROUPS.length} API calls)`);

  const result: PlaceSearchResult = {
    places: allPlaces,
    totalApiCalls: TYPE_GROUPS.length,
    cached: false,
  };

  setCache(latitude, longitude, result);
  return result;
}

// ──────────────────────────────────────────
// Public: filter places by type list
// ──────────────────────────────────────────
export function filterPlacesByTypes(
  places: NearbyPlace[],
  types: string[],
  maxDistanceMeters?: number,
): NearbyPlace[] {
  const typeSet = new Set(types);
  return places.filter((p) => {
    const matchesType = p.types.some((t) => typeSet.has(t));
    const matchesDistance = maxDistanceMeters == null || p.distanceMeters <= maxDistanceMeters;
    return matchesType && matchesDistance;
  });
}
