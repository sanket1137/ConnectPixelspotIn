# Screen Tag Generation System
## From Latitude/Longitude to Smart Location Tags

This document covers how CCMS auto-generates location-aware tags for screens using GPS coordinates, and everything a developer needs to re-implement the same system in another application.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Credentials & Configuration](#2-credentials--configuration)
3. [Architecture at a Glance](#3-architecture-at-a-glance)
4. [Step-by-Step Pipeline](#4-step-by-step-pipeline)
5. [Google Places API Integration](#5-google-places-api-integration)
6. [Tag Generation Phases](#6-tag-generation-phases)
7. [Scoring Formula](#7-scoring-formula)
8. [Caching Strategy](#8-caching-strategy)
9. [Tag Categories & Master Tags](#9-tag-categories--master-tags)
10. [Database Schema](#10-database-schema)
11. [API Endpoints](#11-api-endpoints)
12. [Re-implementing in Another Application](#12-re-implementing-in-another-application)

---

## 1. Overview

When a screen is registered with a latitude and longitude, the system:

1. Calls **Google Places API (New v1)** with those coordinates
2. Gets nearby Points of Interest (POIs) within a 500m radius
3. Runs 6 tagging algorithms against those POIs
4. Scores and ranks the resulting tags
5. Stores the top tags against the screen (marks top 5 as **Primary**)
6. Re-tags automatically every **90 days**, or on coordinates change

Tags allow advertisers to target screens by location context (e.g., _"near a metro station"_, _"foodie zone"_, _"corporate hub"_) without knowing exact coordinates.

---

## 2. Credentials & Configuration

### Google Places API

| Field | Value |
|-------|-------|
| **API Key** | `AIzaSyAvoM7D6su2MjibqzmxSYCwnafVDT5n8_k` |
| **API Version** | New Places API v1 |
| **Endpoint** | `https://places.googleapis.com/v1/places:searchNearby` |
| **Auth Header** | `X-Goog-Api-Key: <api_key>` |
| **Console** | [Google Cloud Console → APIs & Services → Places API (New)](https://console.cloud.google.com) |

### Configuration in appsettings.json

```json
"GooglePlaces": {
  "ApiKey": "AIzaSyAvoM7D6su2MjibqzmxSYCwnafVDT5n8_k"
}
```

### Other System Credentials (used in surrounding infrastructure)

| Service | Key / Info |
|---------|-----------|
| **PostgreSQL (Neon)** | Host: `ep-snowy-haze-ag6lkc0h-pooler.c-2.eu-central-1.aws.neon.tech` · DB: `pixelspot_ccms` · User: `neondb_owner` · Pass: `npg_Y9bQL3rHdXPq` |
| **Cloudflare R2 (Dev)** | AccountId: `4f22ea89a2e684c242ace359b5706b03` · AccessKey: `ae7110645957e505c8e2e8f0d7ce3ad2` · Secret: `f00a6c7bc692660ebd15f4538b9c68df835a565089dc2cabfc838a5125d4b302` · Bucket: `dev-ccms` |
| **Cloudflare R2 (Prod)** | AccessKey: `aa934dbced6f083dcba7f9125590d20f` · Secret: `71ed546e79b20506e19af06054f929da7946178ea7938862a8185a7b9b86405f` · Bucket: `dev-ccms` |
| **JWT Secret** | `your-super-secret-key-minimum-32-characters-long-for-security` |
| **AWS SES** | Region: `ap-south-1` · AccessKey: `AKIARSDDW6TI36D3GB2T` · Secret: `HJu37GUpIjmf5hrWqeRaRt7yGNKiLPtgrJT6vTzU` |

---

## 3. Architecture at a Glance

```
Screen (lat, lng)
    │
    ▼
GooglePlacesService.GetNearbyPlacesAsync(lat, lng)
    │   ├─ Cache hit? → return cached NearbyPlacesResult
    │   └─ Cache miss → POST https://places.googleapis.com/v1/places:searchNearby
    │       └─ 7 place type groups × max 500m radius
    │           → deduplicate by PlaceId
    │           → organize by radius buckets {50, 100, 250, 500}m
    │           → cache for 48 hours
    │
    ▼
ScreenTaggingService.GenerateTagsAsync(screenId)
    │
    ├─ Phase 1: Proximity Tags    (single POI within threshold distance)
    ├─ Phase 2: Density Tags      (≥N POIs of same type within radius)
    ├─ Phase 3: Composite Tags    (lifestyle tags: multiple conditions)
    ├─ Phase 4: Audience Tags     (derived from what's already assigned)
    ├─ Phase 5: Time Tags         (rush hour, weekend, 24/7 zones)
    └─ Phase 6: Economic Tags     (average price level of nearby POIs)
         │
         ▼
    DeduplicateAndRank()
         │
         └─ Top 5 by score → IsPrimary = true
              Remaining   → IsPrimary = false
                   │
                   ▼
           Saved to ScreenTagAssignments
```

---

## 4. Step-by-Step Pipeline

### Step 1 — Trigger

Tags are generated in two situations:

| Situation | How |
|-----------|-----|
| **Screen creation** | `CreateScreenPage.tsx` calls `POST /api/screens/{id}/generate-tags` automatically after a screen is registered if lat/lng are provided |
| **Manual trigger** | Screen Owner or Admin presses "Generate Tags" in the Tags tab on the screen detail page |
| **Background re-tag** | (Future) A background job can call `GenerateTagsAsync` periodically |

### Step 2 — Cache / Re-tag check

Inside `ScreenTaggingService.GenerateTagsAsync`:

```
if NOT forceRefresh AND coordinates haven't changed AND last tagged < 90 days ago
    → return early (tags are still current)
```

### Step 3 — Fetch nearby POIs

`GooglePlacesService.GetNearbyPlacesAsync(lat, lng)` is called:

- Cache key = `places_{round(lat,4)}_{round(lng,4)}` (≈11m precision)
- Cache duration = **48 hours**
- Max radius searched = **500m**
- Per request: `maxResultCount = 20`
- **7 place type groups** are queried one request each:

| Group | Example Types |
|-------|--------------|
| `transportation` | subway_station, train_station, bus_station, airport |
| `retail` | shopping_mall, store, supermarket, clothing_store |
| `food` | restaurant, cafe, bar, bakery |
| `education` | school, university, library |
| `entertainment` | movie_theater, stadium, park, gym |
| `financial` | bank, atm |
| `government` | police, hospital, post_office |

Each response is deduplicated by `placeId`. If a place appears in multiple groups, the **closer distance** wins.

> **Dev mode**: If no API key is configured, `GenerateMockData()` is used returning ~25 hardcoded mock POIs.

### Step 4 — Distance calculation

Distance is calculated with the **Haversine formula** (great-circle distance on Earth's surface):

$$d = 2R \cdot \arctan\left(\sqrt{\frac{a}{1-a}}\right)$$

where:
$$a = \sin^2\!\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cdot \cos\phi_2 \cdot \sin^2\!\left(\frac{\Delta\lambda}{2}\right)$$

$R = 6{,}371{,}000$ metres, $\phi$ = latitude in radians, $\lambda$ = longitude in radians.

### Step 5 — Run 6 tagging phases (see Section 6)

### Step 6 — Deduplicate + Rank

- All assignments from all phases go into one list
- Duplicates (same `TagId`) keep the highest score
- Sort descending by score
- Top 5 → `IsPrimary = true`
- Remainder → `IsPrimary = false`

### Step 7 — Persist

```csharp
// Delete old auto-generated assignments
_context.ScreenTagAssignments.RemoveRange(autoTagAssignments);

// Insert new ones
await _context.ScreenTagAssignments.AddRangeAsync(finalAssignments);

// Update metadata
screen.LastTaggedAt = DateTime.UtcNow;
screen.LastTaggedLatitude = screen.Latitude;
screen.LastTaggedLongitude = screen.Longitude;

await _context.SaveChangesAsync();
```

Manual tags (`Source = TagSource.Manual`) are **never deleted** during re-tagging.

---

## 5. Google Places API Integration

### Request format

```http
POST https://places.googleapis.com/v1/places:searchNearby
X-Goog-Api-Key: AIzaSyAvoM7D6su2MjibqzmxSYCwnafVDT5n8_k
X-Goog-FieldMask: places.id,places.displayName,places.types,places.location,places.rating,places.userRatingCount,places.priceLevel,places.businessStatus,places.formattedAddress,places.primaryType

{
  "includedTypes": ["subway_station", "light_rail_station", "transit_station"],
  "locationRestriction": {
    "circle": {
      "center": { "latitude": 28.6139, "longitude": 77.2090 },
      "radius": 500.0
    }
  },
  "maxResultCount": 20
}
```

### Response fields used

| Field | Used for |
|-------|----------|
| `places[].id` | Unique place identifier (deduplication) |
| `places[].displayName.text` | Name of the POI |
| `places[].types[]` | Place type array (matched against tag rules) |
| `places[].primaryType` | Single primary type |
| `places[].location.latitude/longitude` | Distance calculation |
| `places[].rating` | Quality multiplier in score |
| `places[].userRatingCount` | Credibility of rating |
| `places[].priceLevel` | Economic zone tags (PRICE_LEVEL_EXPENSIVE etc.) |

### Search radii buckets

```
50m   — Immediate proximity (within line of sight)
100m  — Very close        (< 1 min walk)
250m  — Walking distance  (2–3 min walk)
500m  — Extended area     (5–6 min walk, max for most tags)
```

Places are stored in all buckets they fall within (e.g., a café at 80m appears in the 100m, 250m, and 500m buckets).

---

## 6. Tag Generation Phases

### Phase 1 — Proximity Tags

> **Rule**: A single qualifying POI exists within the tag's `MaxDistanceMeters` threshold.

```
for each master tag with MaxDistanceMeters (no MinPoiCount):
    find the closest place matching any of tag.GooglePlaceTypes
    if closest_place.distance <= tag.MaxDistanceMeters:
        score = baseScore × distanceWeight × qualityMultiplier
        emit assignment
```

Example: `metro_station_proximity` fires if any `subway_station` / `transit_station` is within **250m**.

### Phase 2 — Density Tags

> **Rule**: At least `MinPoiCount` places of the matching type exist within `MaxDistanceMeters`.

```
for each master tag with MinPoiCount:
    count places matching tag.GooglePlaceTypes within tag.MaxDistanceMeters
    if count >= tag.MinPoiCount:
        score = baseScore × distanceWeight (average dist) × 1.0
        emit assignment
```

Example: `shopping_district` fires if **≥10** stores of type `store/clothing_store/shoe_store` are within **250m**.

### Phase 3 — Composite / Lifestyle Tags

> **Rule**: Requires a combination of already-assigned tags AND/OR place type counts.

These are evaluated **after** phases 1 & 2, so they build on what was already found.

| Tag | Condition |
|-----|-----------|
| `it_hub` | `corporate_zone` assigned AND (`tech_park_proximity` OR ≥3 electronics stores within 500m) |
| `student_hub` | `university_proximity` assigned AND ≥5 cafes within 500m |
| `tourist_zone` | ≥2 of: hotel, museum, monument, tourist_attraction within 500m |
| `residential_area` | Named place types include apartment / residential qualifiers |

### Phase 4 — Audience Profile Tags

> **Rule**: Derived purely from existing tag slugs (no new POI queries).

| Tag | Condition |
|-----|-----------|
| `shopping_enthusiasts` | ≥2 of: `mall_proximity`, `shopping_district`, `luxury_retail_zone` |
| `commuters` | ≥2 of: `metro_station_proximity`, `railway_station_proximity`, `bus_terminal_proximity` |
| `foodies` | `foodie_zone` AND `restaurant_cluster` already assigned |
| `health_conscious` | ≥2 of: `gym_nearby`, `park_proximity`, `sports_complex` |

### Phase 5 — Time-Based Tags

| Tag | Condition |
|-----|-----------|
| `morning_rush_zone` | ≥2 of: `metro_station_proximity`, `railway_station_proximity`, `corporate_zone` |
| `late_night_active` | ≥2 of: 24-hour restaurant / convenience_store cluster |
| `weekend_hotspot` | Mall or entertainment venue within 250m |

### Phase 6 — Economic Zone Tags

Uses **average `priceLevel`** of all nearby POIs that have a price:

| Avg Price Level | Tag Assigned |
|----------------|-------------|
| ≥ 3.0 OR ≥2 luxury proximity tags | `luxury_lifestyle_zone` |
| 2.0 – 2.9 | `mid_market_zone` |
| < 2.0 | `value_market_zone` |

`priceLevel` values from Google: `PRICE_LEVEL_FREE=0`, `INEXPENSIVE=1`, `MODERATE=2`, `EXPENSIVE=3`, `VERY_EXPENSIVE=4`.

---

## 7. Scoring Formula

Every tag assignment gets a numeric **score** (0–1200):

$$\text{score} = \lfloor \text{baseScore} \times w_d \times m_q \rfloor$$

Where:

| Component | Description |
|-----------|-------------|
| `baseScore` | Defined per tag in master data (typically 800–1000) |
| `w_d` — Distance Weight | How close the closest matching POI is |
| `m_q` — Quality Multiplier | Based on Google rating of the POI |

### Distance Weights

| Distance (m) | Weight |
|-------------|--------|
| ≤ 50 | 1.00 |
| ≤ 100 | 0.85 |
| ≤ 250 | 0.60 |
| ≤ 500 | 0.35 |

### Quality Multipliers

| Google Rating | Multiplier |
|--------------|-----------|
| ≥ 4.5 | 1.2 |
| ≥ 4.0 | 1.0 |
| ≥ 3.5 | 0.8 |
| < 3.5 | 0.6 |
| No rating | 1.0 |

**Example**: `metro_station_proximity` — base 1000, closest station 80m (weight 0.85), rating 4.2 (multiplier 1.0)  
→ `score = floor(1000 × 0.85 × 1.0) = 850`

---

## 8. Caching Strategy

| Cache | Key | TTL | Location |
|-------|-----|-----|----------|
| Google Places result | `places_{lat4}_{lng4}` | **48 hours** | `IMemoryCache` (in-process) |
| Re-tag interval | stored on `screen.LastTaggedAt` | **90 days** | PostgreSQL |

- Cache key rounds coordinates to 4 decimal places (~11m grid) so nearby requests reuse the same cached result.
- `forceRefresh=true` bypasses both caches.
- Cache lives in-process memory — a backend restart clears it.

---

## 9. Tag Categories & Master Tags

The master tag list is seeded once via `ScreenTagSeeder.SeedTagsAsync()`.

| Category | Example Tags |
|----------|-------------|
| **Transportation** | metro_station_proximity, railway_station_proximity, bus_terminal_proximity, airport_proximity, transit_hub, ev_charging_zone |
| **Retail** | mall_proximity, shopping_district, luxury_retail_zone, supermarket_nearby, electronics_retail_zone, pharmacy_cluster |
| **Food & Beverage** | foodie_zone, restaurant_cluster, cafe_cluster, bar_cluster, fast_food_zone, street_food_hub |
| **Education** | university_proximity, school_zone, library_nearby, coaching_institute_cluster |
| **Healthcare** | hospital_nearby, clinic_cluster, pharmacy_cluster |
| **Entertainment** | cinema_nearby, park_proximity, gym_nearby, sports_complex, gaming_zone |
| **Business / Corporate** | corporate_zone, tech_park_proximity, co_working_space, bank_atm_cluster |
| **Lifestyle / Composite** | it_hub, student_hub, tourist_zone, residential_area, family_zone |
| **Audience** | shopping_enthusiasts, commuters, foodies, health_conscious |
| **Time** | morning_rush_zone, late_night_active, weekend_hotspot |
| **Economic** | luxury_lifestyle_zone, mid_market_zone, value_market_zone |

Each master tag stores:

```
slug                — machine identifier (e.g., "metro_station_proximity")
displayName         — human label
category            — enum (Transportation, Retail, etc.)
googlePlaceTypes    — JSON array of Google Places types to match
maxDistanceMeters   — proximity threshold (null = composite only)
minPoiCount         — density threshold (null = proximity only)
priority            — display ordering
iconName            — MUI icon name for frontend
colorCode           — hex color for chips
```

---

## 10. Database Schema

### Tables involved

```sql
-- Master tag definitions (seeded once)
ScreenTags (
    Id              UUID PK,
    Slug            TEXT UNIQUE,
    DisplayName     TEXT,
    Category        INT,            -- TagCategory enum
    Description     TEXT,
    GooglePlaceTypes TEXT,          -- JSON array e.g. ["subway_station"]
    MaxDistanceMeters INT,
    MinPoiCount     INT,
    Priority        INT,
    IconName        TEXT,
    ColorCode       TEXT,
    IsDeleted       BOOL,
    CreatedAt       TIMESTAMPTZ
)

-- Per-screen tag assignments
ScreenTagAssignments (
    Id              UUID PK,
    ScreenId        UUID FK → Screens,
    TagId           UUID FK → ScreenTags,
    Source          INT,            -- TagSource: Auto=0, Manual=1
    Score           INT,            -- 0-1200
    IsPrimary       BOOL,           -- top 5 = true
    DistanceMeters  INT,            -- closest matching POI distance
    PoiCount        INT,            -- matching POIs found (density tags)
    AssignedAt      TIMESTAMPTZ
)

-- Tagging metadata on screen
Screens (
    ...
    LastTaggedAt        TIMESTAMPTZ,
    LastTaggedLatitude  DECIMAL(10,7),
    LastTaggedLongitude DECIMAL(10,7)
)
```

---

## 11. API Endpoints (CCMS)

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/screens/{id}/generate-tags?forceRefresh=false` | ScreenOwner, Admin | Trigger tag generation |
| `GET` | `/api/screens/{id}/tags` | Any authenticated | Get assigned tags for a screen |
| `POST` | `/api/screens/{id}/tags` | ScreenOwner, Admin | Manually add a tag |
| `DELETE` | `/api/screens/{id}/tags/{tagId}` | ScreenOwner, Admin | Remove a tag |
| `GET` | `/api/screens/tags` | Any authenticated | List all master tags (optional `?category=`) |
| `GET` | `/api/screens/search` | Any authenticated | Search screens by tag slugs, location, etc. |

### generate-tags response

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Generated 18 tags",
    "tagsGenerated": 18,
    "primaryTags": ["metro_station_proximity", "corporate_zone", "foodie_zone", "morning_rush_zone", "commuters"],
    "fromCache": false,
    "totalPoisFound": 47
  }
}
```

---

## 12. Re-implementing in Another Application

This section covers everything needed to build the same tag system from scratch in any stack.

### What you need

1. **Google Cloud project** with _Places API (New)_ enabled
2. **API Key** stored as a server-side environment variable (`GOOGLE_PLACES_API_KEY`)
3. A **database table** for master tag definitions
4. A **join table** for screen/entity ↔ tag assignments
5. Two-column coordinates (`latitude DECIMAL(10,7)`, `longitude DECIMAL(10,7)`) on your entity

---

### Step A — Fetch POIs from Google Places (New API)

```python
import httpx, json

API_KEY = "AIzaSyAvoM7D6su2MjibqzmxSYCwnafVDT5n8_k"
HEADERS = {
    "X-Goog-Api-Key": API_KEY,
    "X-Goog-FieldMask": (
        "places.id,places.displayName,places.types,places.location,"
        "places.rating,places.userRatingCount,places.priceLevel,places.primaryType"
    ),
    "Content-Type": "application/json",
}

PLACE_TYPE_GROUPS = {
    "transportation": ["subway_station", "train_station", "bus_station", "airport", "transit_station"],
    "retail":         ["shopping_mall", "store", "supermarket", "clothing_store", "jewelry_store"],
    "food":           ["restaurant", "cafe", "bar", "bakery", "fast_food_restaurant"],
    "education":      ["school", "university", "library"],
    "entertainment":  ["movie_theater", "stadium", "park", "gym", "amusement_park"],
    "financial":      ["bank", "atm"],
    "government":     ["police", "hospital", "post_office", "local_government_office"],
}

def fetch_nearby_pois(lat: float, lng: float, radius_m: int = 500) -> list[dict]:
    all_places = {}  # deduplicate by place_id

    for group, types in PLACE_TYPE_GROUPS.items():
        body = {
            "includedTypes": types,
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": float(radius_m)
                }
            },
            "maxResultCount": 20
        }
        resp = httpx.post(
            "https://places.googleapis.com/v1/places:searchNearby",
            headers=HEADERS, json=body, timeout=10
        )
        resp.raise_for_status()
        for place in resp.json().get("places", []):
            pid = place["id"]
            dist = haversine(lat, lng,
                             place["location"]["latitude"],
                             place["location"]["longitude"])
            if pid not in all_places or all_places[pid]["distance"] > dist:
                all_places[pid] = {
                    "id": pid,
                    "name": place.get("displayName", {}).get("text", ""),
                    "types": place.get("types", []),
                    "distance": dist,
                    "rating": place.get("rating"),
                    "price_level": place.get("priceLevel"),
                }

    return sorted(all_places.values(), key=lambda p: p["distance"])
```

---

### Step B — Haversine Distance

```python
import math

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    R = 6_371_000  # Earth radius in metres
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lon2 - lon1)
    a = math.sin(dφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(dλ/2)**2
    return int(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))
```

---

### Step C — Distance Weight & Quality Multiplier

```python
def distance_weight(distance_m: int) -> float:
    if distance_m <= 50:   return 1.00
    if distance_m <= 100:  return 0.85
    if distance_m <= 250:  return 0.60
    return 0.35            # 500m

def quality_multiplier(rating: float | None) -> float:
    if rating is None:  return 1.0
    if rating >= 4.5:   return 1.2
    if rating >= 4.0:   return 1.0
    if rating >= 3.5:   return 0.8
    return 0.6
```

---

### Step D — Proximity Tag Evaluation

```python
def evaluate_proximity_tags(places: list[dict], master_tags: list[dict]) -> list[dict]:
    """
    Proximity tag: fires when a single matching POI is within MaxDistanceMeters.
    master_tag fields: slug, google_place_types (list), max_distance_meters, base_score
    """
    assignments = []
    for tag in master_tags:
        if tag.get("min_poi_count"):
            continue  # density tag, skip here
        if not tag.get("max_distance_meters"):
            continue  # composite tag
        required_types = set(tag["google_place_types"])
        matching = [p for p in places
                    if set(p["types"]) & required_types
                    and p["distance"] <= tag["max_distance_meters"]]
        if matching:
            best = min(matching, key=lambda p: p["distance"])
            score = int(tag["base_score"]
                        * distance_weight(best["distance"])
                        * quality_multiplier(best.get("rating")))
            assignments.append({"slug": tag["slug"], "score": score,
                                 "distance": best["distance"]})
    return assignments
```

---

### Step E — Density Tag Evaluation

```python
def evaluate_density_tags(places: list[dict], master_tags: list[dict]) -> list[dict]:
    """
    Density tag: fires when ≥ MinPoiCount matching POIs are within MaxDistanceMeters.
    """
    assignments = []
    for tag in master_tags:
        if not tag.get("min_poi_count"):
            continue
        required_types = set(tag["google_place_types"])
        matching = [p for p in places
                    if set(p["types"]) & required_types
                    and p["distance"] <= tag["max_distance_meters"]]
        if len(matching) >= tag["min_poi_count"]:
            avg_dist = int(sum(p["distance"] for p in matching) / len(matching))
            score = int(tag["base_score"] * distance_weight(avg_dist))
            assignments.append({"slug": tag["slug"], "score": score,
                                 "distance": avg_dist, "poi_count": len(matching)})
    return assignments
```

---

### Step F — Composite / Audience Tags

These fire based on already-assigned tag slugs. Build them as simple rule functions:

```python
def evaluate_composite_tags(assigned_slugs: set[str], places: list[dict]) -> list[dict]:
    assignments = []

    # Shopping Enthusiasts audience tag
    if len({"mall_proximity", "shopping_district", "luxury_retail_zone"} & assigned_slugs) >= 2:
        assignments.append({"slug": "shopping_enthusiasts", "score": 800})

    # Commuters audience tag
    if len({"metro_station_proximity", "railway_station_proximity", "bus_terminal_proximity"} & assigned_slugs) >= 2:
        assignments.append({"slug": "commuters", "score": 820})

    # Morning Rush Zone
    if len({"metro_station_proximity", "railway_station_proximity", "corporate_zone"} & assigned_slugs) >= 2:
        assignments.append({"slug": "morning_rush_zone", "score": 850})

    # Economic zone via price level
    priced = [p for p in places if p.get("price_level")]
    if priced:
        PRICE_MAP = {"PRICE_LEVEL_FREE": 0, "PRICE_LEVEL_INEXPENSIVE": 1,
                     "PRICE_LEVEL_MODERATE": 2, "PRICE_LEVEL_EXPENSIVE": 3,
                     "PRICE_LEVEL_VERY_EXPENSIVE": 4}
        avg = sum(PRICE_MAP.get(p["price_level"], 2) for p in priced) / len(priced)
        if avg >= 3.0 or len({"luxury_retail_zone","luxury_hotel_nearby"} & assigned_slugs) >= 2:
            assignments.append({"slug": "luxury_lifestyle_zone", "score": int(900 * (avg / 4))})
        elif avg >= 2.0:
            assignments.append({"slug": "mid_market_zone", "score": 700})
        else:
            assignments.append({"slug": "value_market_zone", "score": 650})

    return assignments
```

---

### Step G — Deduplicate, Rank, Mark Primary

```python
def deduplicate_and_rank(all_assignments: list[dict]) -> list[dict]:
    best = {}
    for a in all_assignments:
        slug = a["slug"]
        if slug not in best or best[slug]["score"] < a["score"]:
            best[slug] = a

    ranked = sorted(best.values(), key=lambda x: x["score"], reverse=True)
    for i, a in enumerate(ranked):
        a["is_primary"] = i < 5
    return ranked
```

---

### Step H — Full Orchestration

```python
import hashlib, time

_cache: dict = {}  # In-memory; replace with Redis for production
CACHE_TTL_SECONDS = 48 * 3600

def generate_tags_for_entity(entity_id: str, lat: float, lng: float,
                              master_tags: list[dict],
                              force_refresh: bool = False) -> list[dict]:
    cache_key = f"places_{round(lat,4)}_{round(lng,4)}"

    if not force_refresh and cache_key in _cache:
        entry = _cache[cache_key]
        if time.time() - entry["ts"] < CACHE_TTL_SECONDS:
            places = entry["data"]
        else:
            places = None
    else:
        places = None

    if places is None:
        places = fetch_nearby_pois(lat, lng)
        _cache[cache_key] = {"data": places, "ts": time.time()}

    # Phase 1 & 2
    assignments = []
    assignments += evaluate_proximity_tags(places, master_tags)
    assignments += evaluate_density_tags(places, master_tags)

    # Phase 3-6 (composite)
    assigned_slugs = {a["slug"] for a in assignments}
    assignments += evaluate_composite_tags(assigned_slugs, places)

    # Deduplicate & rank
    final = deduplicate_and_rank(assignments)

    # Persist to DB (pseudo-code)
    # db.delete_auto_tags(entity_id)
    # db.insert_tag_assignments(entity_id, final)

    return final
```

---

### Step I — Master Tag Seed Data (minimal subset)

```sql
-- Transportation
INSERT INTO master_tags VALUES
  ('metro_station_proximity', 'Metro Station Proximity', 'Transportation',
   '["subway_station","light_rail_station","transit_station"]', 250, NULL, 1000),
  ('railway_station_proximity', 'Railway Station Proximity', 'Transportation',
   '["train_station"]', 500, NULL, 950),
  ('shopping_district', 'Shopping District', 'Retail',
   '["store","clothing_store","shoe_store"]', 250, 10, 900),
  ('foodie_zone', 'Foodie Zone', 'Food',
   '["restaurant"]', 250, 15, 900),
  ('corporate_zone', 'Corporate Zone', 'Business',
   '["corporate_office","office_building"]', 500, 5, 880);
```

---

### Summary Checklist for Re-implementation

- [ ] Google Cloud project with **Places API (New)** enabled
- [ ] API key stored in environment variable, passed as `X-Goog-Api-Key` header
- [ ] `haversine()` distance function
- [ ] Master tags table with: slug, google_place_types (JSON), max_distance_m, min_poi_count, base_score
- [ ] `fetch_nearby_pois()` — loops 7 type groups, deduplicates by place_id
- [ ] `evaluate_proximity_tags()` — closest single POI match
- [ ] `evaluate_density_tags()` — count ≥ N matches within radius
- [ ] `evaluate_composite_tags()` — derive from already-assigned slugs + price levels
- [ ] `deduplicate_and_rank()` — top 5 = primary
- [ ] 48-hour result cache (keyed by rounded lat/lng)
- [ ] 90-day re-tag cooldown stored on the entity
- [ ] `source` column to distinguish Auto vs Manual tags (never delete Manual on re-tag)
