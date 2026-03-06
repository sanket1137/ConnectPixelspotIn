/**
 * Screen Tag Generation Service — 6-Phase Pipeline
 * 
 * Phase 1: Proximity Analysis   – single POI within maxDistance
 * Phase 2: Density Analysis     – minPoiCount within radius
 * Phase 3: Composite Tags       – derived from Phase 1+2 combinations
 * Phase 4: Audience Profiling   – audience segments from tag combos
 * Phase 5: Time-Based Tags      – rush / nightlife / weekend from tag combos
 * Phase 6: Economic Zone        – price-level analysis of nearby POIs
 * 
 * Output: scored tag assignments (auto), preserving manual ones.
 */

import { eq, and, ne } from "drizzle-orm";
import { db } from "../db";
import { screenTags, screenTagAssignments, screens, type ScreenTag } from "@shared/schema";
import {
  fetchNearbyPlaces,
  filterPlacesByTypes,
  type NearbyPlace,
} from "./google-places";

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────
interface TagCandidate {
  tagId: string;
  slug: string;
  score: number;
  distanceMeters: number | null;
  poiCount: number | null;
  source: "auto";
}

interface TagGenerationResult {
  screenId: string;
  candidates: TagCandidate[];
  primaryTagIds: string[];
  totalApiCalls: number;
  cached: boolean;
  error?: string;
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
function clampScore(score: number): number {
  return Math.max(0, Math.min(1200, Math.round(score)));
}

/** Sort by score desc, then priority asc */
function sortCandidates(candidates: TagCandidate[], tagMap: Map<string, ScreenTag>): TagCandidate[] {
  return candidates.sort((a, b) => {
    const diff = b.score - a.score;
    if (diff !== 0) return diff;
    const pa = tagMap.get(a.slug)?.priority ?? 999;
    const pb = tagMap.get(b.slug)?.priority ?? 999;
    return pa - pb;
  });
}

// ──────────────────────────────────────────
// Load master tags (cached in-memory)
// ──────────────────────────────────────────
let masterTagsCache: ScreenTag[] | null = null;
let masterTagsCacheTime = 0;
const MASTER_CACHE_TTL = 10 * 60 * 1000; // 10 min

async function loadMasterTags(): Promise<ScreenTag[]> {
  if (masterTagsCache && Date.now() - masterTagsCacheTime < MASTER_CACHE_TTL) {
    return masterTagsCache;
  }
  masterTagsCache = await db.select().from(screenTags).where(eq(screenTags.isActive, true));
  masterTagsCacheTime = Date.now();
  return masterTagsCache;
}

function buildTagMap(tags: ScreenTag[]): Map<string, ScreenTag> {
  const map = new Map<string, ScreenTag>();
  for (const t of tags) map.set(t.slug, t);
  return map;
}

// ──────────────────────────────────────────
// Phase 1: Proximity Analysis
// ──────────────────────────────────────────
function runProximityAnalysis(
  places: NearbyPlace[],
  proximityTags: ScreenTag[],
): TagCandidate[] {
  const candidates: TagCandidate[] = [];

  for (const tag of proximityTags) {
    if (!tag.googlePlaceTypes || !tag.maxDistanceMeters) continue;
    if (tag.minPoiCount) continue; // skip density tags

    const typeList: string[] = JSON.parse(tag.googlePlaceTypes);
    const matching = filterPlacesByTypes(places, typeList, tag.maxDistanceMeters);

    if (matching.length === 0) continue;

    // Closest POI
    const closest = matching.reduce((a, b) =>
      a.distanceMeters < b.distanceMeters ? a : b,
    );

    // Score: baseScore * (1 - distance/maxDistance) with minimum 40% of base
    const distanceFactor = Math.max(0.4, 1 - closest.distanceMeters / tag.maxDistanceMeters);
    const score = clampScore(tag.baseScore * distanceFactor);

    candidates.push({
      tagId: tag.id,
      slug: tag.slug,
      score,
      distanceMeters: Math.round(closest.distanceMeters),
      poiCount: matching.length,
      source: "auto",
    });
  }

  return candidates;
}

// ──────────────────────────────────────────
// Phase 2: Density Analysis
// ──────────────────────────────────────────
function runDensityAnalysis(
  places: NearbyPlace[],
  densityTags: ScreenTag[],
): TagCandidate[] {
  const candidates: TagCandidate[] = [];

  for (const tag of densityTags) {
    if (!tag.googlePlaceTypes || !tag.minPoiCount) continue;

    const typeList: string[] = JSON.parse(tag.googlePlaceTypes);
    const maxDist = tag.maxDistanceMeters ?? 500;
    const matching = filterPlacesByTypes(places, typeList, maxDist);

    if (matching.length < tag.minPoiCount) continue;

    // Score: baseScore * densityMultiplier (1.0 at minCount, up to 1.5 at 3x min)
    const densityRatio = Math.min(3, matching.length / tag.minPoiCount);
    const densityMultiplier = 0.5 + densityRatio * (0.5 / 3) + 0.5;
    const score = clampScore(tag.baseScore * Math.min(1.5, densityMultiplier));

    // Closest POI for reference
    const closest = matching.reduce((a, b) =>
      a.distanceMeters < b.distanceMeters ? a : b,
    );

    candidates.push({
      tagId: tag.id,
      slug: tag.slug,
      score,
      distanceMeters: Math.round(closest.distanceMeters),
      poiCount: matching.length,
      source: "auto",
    });
  }

  return candidates;
}

// ──────────────────────────────────────────
// Phase 3: Composite Tags
// ──────────────────────────────────────────
function runCompositeAnalysis(
  existingSlugs: Set<string>,
  tagMap: Map<string, ScreenTag>,
): TagCandidate[] {
  const candidates: TagCandidate[] = [];

  const compositeRules: Array<{
    slug: string;
    requiredSlugs: string[][];  // OR groups — at least one slug from each group
    bonusSlugs?: string[];       // optional score boost
  }> = [
    {
      slug: "it_hub",
      requiredSlugs: [
        ["corporate_zone", "tech_park_proximity"],
        ["cafe_cluster", "restaurant_cluster"],
      ],
      bonusSlugs: ["electronics_retail_zone"],
    },
    {
      slug: "student_hub",
      requiredSlugs: [
        ["university_proximity", "coaching_cluster"],
        ["cafe_cluster", "fast_food_zone"],
      ],
    },
    {
      slug: "family_zone",
      requiredSlugs: [
        ["school_zone"],
        ["park_proximity", "residential_area"],
      ],
    },
  ];

  for (const rule of compositeRules) {
    const tag = tagMap.get(rule.slug);
    if (!tag) continue;

    // Check all required groups: at least one slug from each group must exist
    const allGroupsMet = rule.requiredSlugs.every((group) =>
      group.some((s) => existingSlugs.has(s)),
    );
    if (!allGroupsMet) continue;

    let score = tag.baseScore;
    // Bonus for optional contributing tags
    if (rule.bonusSlugs) {
      const bonusCount = rule.bonusSlugs.filter((s) => existingSlugs.has(s)).length;
      score += bonusCount * 50;
    }

    candidates.push({
      tagId: tag.id,
      slug: tag.slug,
      score: clampScore(score),
      distanceMeters: null,
      poiCount: null,
      source: "auto",
    });
  }

  return candidates;
}

// ──────────────────────────────────────────
// Phase 4: Audience Profiling
// ──────────────────────────────────────────
function runAudienceProfiling(
  existingSlugs: Set<string>,
  tagMap: Map<string, ScreenTag>,
): TagCandidate[] {
  const candidates: TagCandidate[] = [];

  const audienceRules: Array<{
    slug: string;
    requiredAny: string[];  // at least 2 of these must be present
    minMatch: number;
  }> = [
    {
      slug: "shopping_enthusiasts",
      requiredAny: ["mall_proximity", "shopping_district", "luxury_retail_zone", "supermarket_nearby", "electronics_retail_zone"],
      minMatch: 2,
    },
    {
      slug: "commuters",
      requiredAny: ["metro_station_proximity", "railway_station_proximity", "bus_terminal_proximity", "transit_hub", "parking_zone"],
      minMatch: 2,
    },
    {
      slug: "foodies",
      requiredAny: ["foodie_zone", "restaurant_cluster", "cafe_cluster", "fast_food_zone", "bar_nightlife_cluster"],
      minMatch: 2,
    },
    {
      slug: "health_conscious",
      requiredAny: ["gym_nearby", "park_proximity", "sports_complex"],
      minMatch: 2,
    },
    {
      slug: "working_professionals",
      requiredAny: ["corporate_zone", "tech_park_proximity", "cafe_cluster", "bank_atm_cluster"],
      minMatch: 2,
    },
  ];

  for (const rule of audienceRules) {
    const tag = tagMap.get(rule.slug);
    if (!tag) continue;

    const matchCount = rule.requiredAny.filter((s) => existingSlugs.has(s)).length;
    if (matchCount < rule.minMatch) continue;

    // Score scales with how many contributing tags matched
    const matchRatio = matchCount / rule.requiredAny.length;
    const score = clampScore(tag.baseScore * (0.7 + matchRatio * 0.5));

    candidates.push({
      tagId: tag.id,
      slug: tag.slug,
      score,
      distanceMeters: null,
      poiCount: null,
      source: "auto",
    });
  }

  return candidates;
}

// ──────────────────────────────────────────
// Phase 5: Time-Based Tags
// ──────────────────────────────────────────
function runTimeBasedAnalysis(
  existingSlugs: Set<string>,
  tagMap: Map<string, ScreenTag>,
): TagCandidate[] {
  const candidates: TagCandidate[] = [];

  const timeRules: Array<{
    slug: string;
    requiredAny: string[];
    minMatch: number;
  }> = [
    {
      slug: "morning_rush_zone",
      requiredAny: ["metro_station_proximity", "railway_station_proximity", "bus_terminal_proximity", "transit_hub", "corporate_zone"],
      minMatch: 2,
    },
    {
      slug: "late_night_active",
      requiredAny: ["bar_nightlife_cluster", "fast_food_zone", "cinema_nearby"],
      minMatch: 1,
    },
    {
      slug: "weekend_hotspot",
      requiredAny: ["mall_proximity", "cinema_nearby", "park_proximity", "tourist_zone", "sports_complex"],
      minMatch: 2,
    },
  ];

  for (const rule of timeRules) {
    const tag = tagMap.get(rule.slug);
    if (!tag) continue;

    const matchCount = rule.requiredAny.filter((s) => existingSlugs.has(s)).length;
    if (matchCount < rule.minMatch) continue;

    const matchRatio = matchCount / rule.requiredAny.length;
    const score = clampScore(tag.baseScore * (0.7 + matchRatio * 0.5));

    candidates.push({
      tagId: tag.id,
      slug: tag.slug,
      score,
      distanceMeters: null,
      poiCount: null,
      source: "auto",
    });
  }

  return candidates;
}

// ──────────────────────────────────────────
// Phase 6: Economic Zone Analysis
// ──────────────────────────────────────────
function runEconomicAnalysis(
  places: NearbyPlace[],
  tagMap: Map<string, ScreenTag>,
): TagCandidate[] {
  const candidates: TagCandidate[] = [];

  // Count price levels from nearby places
  const priceLevels = { expensive: 0, moderate: 0, inexpensive: 0 };
  for (const place of places) {
    if (!place.priceLevel) continue;
    if (place.priceLevel === "PRICE_LEVEL_VERY_EXPENSIVE" || place.priceLevel === "PRICE_LEVEL_EXPENSIVE") {
      priceLevels.expensive++;
    } else if (place.priceLevel === "PRICE_LEVEL_MODERATE") {
      priceLevels.moderate++;
    } else if (place.priceLevel === "PRICE_LEVEL_INEXPENSIVE" || place.priceLevel === "PRICE_LEVEL_FREE") {
      priceLevels.inexpensive++;
    }
  }

  const totalPriced = priceLevels.expensive + priceLevels.moderate + priceLevels.inexpensive;
  if (totalPriced < 3) return candidates; // not enough data

  // Determine dominant price level
  const maxLevel = Math.max(priceLevels.expensive, priceLevels.moderate, priceLevels.inexpensive);

  let chosenSlug: string;
  if (maxLevel === priceLevels.expensive) {
    chosenSlug = "luxury_lifestyle_zone";
  } else if (maxLevel === priceLevels.moderate) {
    chosenSlug = "mid_market_zone";
  } else {
    chosenSlug = "value_market_zone";
  }

  const tag = tagMap.get(chosenSlug);
  if (!tag) return candidates;

  const dominance = maxLevel / totalPriced;
  const score = clampScore(tag.baseScore * (0.6 + dominance * 0.6));

  candidates.push({
    tagId: tag.id,
    slug: tag.slug,
    score,
    distanceMeters: null,
    poiCount: null,
    source: "auto",
  });

  return candidates;
}

// ──────────────────────────────────────────
// Main pipeline: generate tags for one screen
// ──────────────────────────────────────────
export async function generateTagsForScreen(
  screenId: string,
  latitude: number,
  longitude: number,
  forceRefresh: boolean = false,
): Promise<TagGenerationResult> {
  try {
    // Check 90-day cooldown (skip if force)
    if (!forceRefresh) {
      const [screen] = await db
        .select({
          lastTaggedAt: screens.lastTaggedAt,
          lastTaggedLatitude: screens.lastTaggedLatitude,
          lastTaggedLongitude: screens.lastTaggedLongitude,
        })
        .from(screens)
        .where(eq(screens.id, screenId))
        .limit(1);

      if (screen?.lastTaggedAt) {
        const daysSinceTagged = (Date.now() - new Date(screen.lastTaggedAt).getTime()) / (1000 * 60 * 60 * 24);
        const sameCoords =
          screen.lastTaggedLatitude === String(latitude) &&
          screen.lastTaggedLongitude === String(longitude);

        if (daysSinceTagged < 90 && sameCoords) {
          console.log(`[ScreenTagging] Skipping ${screenId}: tagged ${Math.round(daysSinceTagged)} days ago with same coords`);
          // Return existing assignments
          const existing = await db
            .select()
            .from(screenTagAssignments)
            .where(eq(screenTagAssignments.screenId, screenId));
          return {
            screenId,
            candidates: existing.map((a) => ({
              tagId: a.tagId,
              slug: "", // not needed for existing
              score: a.score,
              distanceMeters: a.distanceMeters,
              poiCount: a.poiCount,
              source: "auto" as const,
            })),
            primaryTagIds: existing.filter((a) => a.isPrimary).map((a) => a.tagId),
            totalApiCalls: 0,
            cached: true,
          };
        }
      }
    }

    // Load master tag definitions
    const allTags = await loadMasterTags();
    const tagMap = buildTagMap(allTags);

    // Separate tags by analysis type
    const proximityTags = allTags.filter((t) => t.googlePlaceTypes && t.maxDistanceMeters && !t.minPoiCount);
    const densityTags = allTags.filter((t) => t.googlePlaceTypes && t.minPoiCount);

    // Fetch nearby places from Google
    const { places, totalApiCalls, cached } = await fetchNearbyPlaces(latitude, longitude, 500);

    // Phase 1: Proximity
    const proximityCandidates = runProximityAnalysis(places, proximityTags);
    console.log(`[ScreenTagging] Phase 1 (proximity): ${proximityCandidates.length} tags`);

    // Phase 2: Density
    const densityCandidates = runDensityAnalysis(places, densityTags);
    console.log(`[ScreenTagging] Phase 2 (density): ${densityCandidates.length} tags`);

    // Collect slugs from Phase 1+2 for composite analysis
    const existingSlugs = new Set<string>([
      ...proximityCandidates.map((c) => c.slug),
      ...densityCandidates.map((c) => c.slug),
    ]);

    // Phase 3: Composite
    const compositeCandidates = runCompositeAnalysis(existingSlugs, tagMap);
    console.log(`[ScreenTagging] Phase 3 (composite): ${compositeCandidates.length} tags`);

    // Add composite slugs
    for (const c of compositeCandidates) existingSlugs.add(c.slug);

    // Phase 4: Audience
    const audienceCandidates = runAudienceProfiling(existingSlugs, tagMap);
    console.log(`[ScreenTagging] Phase 4 (audience): ${audienceCandidates.length} tags`);

    // Phase 5: Time-based
    const timeCandidates = runTimeBasedAnalysis(existingSlugs, tagMap);
    console.log(`[ScreenTagging] Phase 5 (time): ${timeCandidates.length} tags`);

    // Phase 6: Economic
    const economicCandidates = runEconomicAnalysis(places, tagMap);
    console.log(`[ScreenTagging] Phase 6 (economic): ${economicCandidates.length} tags`);

    // Merge all candidates, dedup by slug (keep highest score)
    const allCandidates = [
      ...proximityCandidates,
      ...densityCandidates,
      ...compositeCandidates,
      ...audienceCandidates,
      ...timeCandidates,
      ...economicCandidates,
    ];

    const dedupMap = new Map<string, TagCandidate>();
    for (const c of allCandidates) {
      const existing = dedupMap.get(c.slug);
      if (!existing || c.score > existing.score) {
        dedupMap.set(c.slug, c);
      }
    }

    let finalCandidates = Array.from(dedupMap.values());
    finalCandidates = sortCandidates(finalCandidates, tagMap);

    // Mark top 5 as primary
    const primaryTagIds = finalCandidates.slice(0, 5).map((c) => c.tagId);

    console.log(`[ScreenTagging] Final: ${finalCandidates.length} tags, ${primaryTagIds.length} primary`);

    // ── Persist to DB ──────────────────────
    // Delete old auto assignments (preserve manual)
    await db
      .delete(screenTagAssignments)
      .where(
        and(
          eq(screenTagAssignments.screenId, screenId),
          eq(screenTagAssignments.source, "auto"),
        ),
      );

    // Insert new assignments
    if (finalCandidates.length > 0) {
      await db.insert(screenTagAssignments).values(
        finalCandidates.map((c) => ({
          screenId,
          tagId: c.tagId,
          source: "auto" as const,
          score: c.score,
          isPrimary: primaryTagIds.includes(c.tagId),
          distanceMeters: c.distanceMeters,
          poiCount: c.poiCount,
        })),
      );
    }

    // Update screen metadata
    await db
      .update(screens)
      .set({
        lastTaggedAt: new Date(),
        lastTaggedLatitude: String(latitude),
        lastTaggedLongitude: String(longitude),
      })
      .where(eq(screens.id, screenId));

    return {
      screenId,
      candidates: finalCandidates,
      primaryTagIds,
      totalApiCalls,
      cached,
    };
  } catch (error) {
    console.error(`[ScreenTagging] Error for screen ${screenId}:`, error);
    return {
      screenId,
      candidates: [],
      primaryTagIds: [],
      totalApiCalls: 0,
      cached: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ──────────────────────────────────────────
// Batch: generate tags for all screens
// ──────────────────────────────────────────
export async function generateTagsForAllScreens(
  forceRefresh: boolean = false,
): Promise<{ total: number; success: number; errors: number }> {
  const allScreens = await db
    .select({ id: screens.id, latitude: screens.latitude, longitude: screens.longitude })
    .from(screens);

  let success = 0;
  let errors = 0;

  for (const screen of allScreens) {
    const lat = parseFloat(screen.latitude);
    const lng = parseFloat(screen.longitude);
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      console.warn(`[ScreenTagging] Skipping ${screen.id}: invalid coordinates`);
      errors++;
      continue;
    }

    const result = await generateTagsForScreen(screen.id, lat, lng, forceRefresh);
    if (result.error) {
      errors++;
    } else {
      success++;
    }

    // Small delay between screens to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  return { total: allScreens.length, success, errors };
}
