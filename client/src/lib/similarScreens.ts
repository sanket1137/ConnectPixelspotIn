import type { Screen } from "@shared/schema";
import { normalizeVenueCategory } from "@shared/constants";
import { venueKeyFor } from "@/lib/venueGroups";
import { screenFamily } from "@/lib/screenInfo";

// "Similar screens" for the detail panel: same kind of venue, similar audience and surroundings.
// Scored only on what an advertiser cares about — venue type, tags, audience, price, distance.
// The network/host a screen belongs to is deliberately NOT a signal (and never shown).

function tags(s: Screen): Set<string> {
  return new Set(
    [...(s.locationTags || []), ...(s.lifestyleTags || []), ...(s.interestSegments || []), ...(s.userIntent || [])]
      .filter(Boolean)
      .map((t) => t.toLowerCase())
  );
}

function km(a: Screen, b: Screen): number | null {
  const lat1 = parseFloat(String(a.latitude)), lng1 = parseFloat(String(a.longitude));
  const lat2 = parseFloat(String(b.latitude)), lng2 = parseFloat(String(b.longitude));
  if ([lat1, lng1, lat2, lng2].some(isNaN)) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function findSimilarScreens(target: Screen, pool: Screen[], limit = 4): Array<{ screen: Screen; km: number | null }> {
  const family = screenFamily(target);
  const typeOf = (s: Screen) => s.venueType || normalizeVenueCategory(s.venueCategory || "").toLowerCase();
  const category = typeOf(target);
  const ownVenue = venueKeyFor(target);
  const targetTags = tags(target);
  const price = target.pricePerDay || 0;

  const scored: Array<{ screen: Screen; km: number | null; score: number }> = [];
  const seenVenues = new Set<string>();
  for (const s of pool) {
    if (s.id === target.id) continue;
    const key = venueKeyFor(s);
    if (key && key === ownVenue) continue; // other screens at the same venue live in the venue panel
    if (screenFamily(s) !== family) continue;

    let score = 3;
    if (typeOf(s) === category) score += 3;
    if (s.category && s.category === target.category) score += 1;
    if (s.incomeLevel && s.incomeLevel === target.incomeLevel) score += 1;
    const shared = Array.from(tags(s)).filter((t) => targetTags.has(t)).length;
    score += Math.min(shared, 4) * 0.75;
    const d = km(target, s);
    if (d !== null) score += d < 2 ? 2 : d < 5 ? 1.5 : d < 15 ? 0.5 : 0;
    if (price > 0 && s.pricePerDay) {
      const ratio = s.pricePerDay / price;
      if (ratio > 0.5 && ratio < 2) score += 0.5;
    }
    scored.push({ screen: s, km: d, score });
  }

  scored.sort((a, b) => b.score - a.score || (a.km ?? 1e9) - (b.km ?? 1e9));
  const picked: Array<{ screen: Screen; km: number | null }> = [];
  for (const item of scored) {
    // one suggestion per venue, so four suggestions are four different places
    const key = venueKeyFor(item.screen) || item.screen.id;
    if (seenVenues.has(key)) continue;
    seenVenues.add(key);
    picked.push({ screen: item.screen, km: item.km });
    if (picked.length === limit) break;
  }
  return picked;
}
