import type { Screen } from "@shared/schema";
import { attributeFacts, attributesFor, cardFacts, type AttributeFact, type VenueAttributes } from "@shared/venueAttributes";
import { buildVenueFacts, formatCompact, getOperatingHoursLabel, getVenueTypeFacts, type VenueFamily } from "@shared/venueTypes";

// What an advertiser sees about a venue, built from the structured venue_attributes (phase 5).
// Rules agreed with the business:
//  - venue-type facts (flats, seats, employees…) come first; derived ones are marked Est.
//  - footfall shows without any label; placeholder footfall (footfall_note = 'hidden') is hidden
//    only when the venue has its own facts — otherwise it still shows.
//  - venues without stored attributes fall back to numbers parsed from their descriptions.

export type DisplayFact = AttributeFact; // { key, label, value, estimate?, formula? }

function mostCommon<T>(values: T[]): T | undefined {
  const counts = new Map<T, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best: T | undefined;
  let bestCount = 0;
  counts.forEach((c, v) => {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  });
  return best;
}

// One venue's attributes from all its listings: largest number / first text per key
export function mergedAttributes(listings: Screen[]): { venueType: string | null; attrs: VenueAttributes } {
  const venueType = mostCommon(listings.map((l) => l.venueType).filter((t): t is string => !!t)) ?? null;
  const attrs: VenueAttributes = {};
  for (const l of listings) {
    if (venueType && l.venueType !== venueType) continue;
    for (const [k, v] of Object.entries((l.venueAttributes as VenueAttributes) || {})) {
      const cur = attrs[k];
      if (cur === undefined) attrs[k] = v;
      else if (typeof v === "number" && typeof cur === "number" && v > cur) attrs[k] = v;
    }
  }
  return { venueType, attrs };
}

function hasStructured(attrs: VenueAttributes): boolean {
  return Object.keys(attrs).length > 0;
}

// Two facts for the result card
export function cardFactsFor(listings: Screen[], family: VenueFamily): DisplayFact[] {
  const { venueType, attrs } = mergedAttributes(listings);
  if (hasStructured(attrs)) return cardFacts(venueType, attrs);
  return getVenueTypeFacts(listings, family).slice(0, 2);
}

// Footfall to show for a set of listings (a venue, or one screen), or null
export function footfallToShow(listings: Screen[], venueHasOwnFacts: boolean): number | null {
  const real = listings.filter((l) => l.footfallNote !== "hidden").map((l) => l.avgDailyFootfall || 0);
  const best = real.length ? Math.max(...real) : 0;
  if (best > 0) return best;
  if (venueHasOwnFacts) return null; // placeholder footfall hidden in favour of the venue's own metrics
  const any = Math.max(0, ...listings.map((l) => l.avgDailyFootfall || 0));
  return any > 0 ? any : null;
}

const footfallLabels: Record<VenueFamily, string> = {
  residential: "Daily footfall",
  cinema: "Daily footfall",
  retail: "Daily shoppers",
  food: "Daily guests",
  workplace: "Daily footfall",
  outdoor: "Daily traffic",
  transit: "Daily commuters",
  lifestyle: "Daily visitors",
  education: "Daily students & parents",
  other: "Daily footfall",
};

// Every fact for the venue panel / screen detail, most important first
export function detailFactsFor(listings: Screen[], family: VenueFamily, totalScreens: number): DisplayFact[] {
  const { venueType, attrs } = mergedAttributes(listings);
  if (!hasStructured(attrs)) {
    // no stored attributes yet — description-parsed facts, with the same footfall rule
    const facts = buildVenueFacts(listings, family, totalScreens);
    const ownFacts = facts.some((f) => !["footfall", "dwell", "screens", "hours", "size"].includes(f.key));
    const footfall = footfallToShow(listings, ownFacts);
    const rest = facts.filter((f) => f.key !== "footfall");
    return footfall ? [{ key: "footfall", label: footfallLabels[family], value: formatCompact(footfall) }, ...rest] : rest;
  }

  const facts: DisplayFact[] = attributeFacts(venueType, attrs);
  const footfall = footfallToShow(listings, facts.length > 0);
  const extra: DisplayFact[] = [];
  if (footfall && !facts.some((f) => f.value === formatCompact(footfall))) {
    // When the venue already states its own audience (e.g. 78,525 passengers/day), the screen's
    // footfall is the smaller number of people passing this screen — say so, so they don't clash
    const venueAudience = attributesFor(venueType).some((d) => d.role === "audience_size" && attrs[d.key] !== undefined);
    extra.push({ key: "footfall", label: venueAudience ? "Daily footfall at the screen" : footfallLabels[family], value: formatCompact(footfall) });
  }
  const dwell = Math.max(0, ...listings.map((l) => l.avgDwellTime || 0));
  if (dwell > 0) extra.push({ key: "dwell", label: family === "transit" ? "Avg wait" : "Avg time spent", value: `${dwell} min` });
  const hours = listings.map(getOperatingHoursLabel).find(Boolean);
  if (hours) extra.push({ key: "hours", label: "Screen hours", value: hours });
  if (totalScreens > 0) extra.push({ key: "screens", label: totalScreens === 1 ? "Screen" : "Screens", value: formatCompact(totalScreens) });

  // venue facts, then footfall/dwell, then derived Est. metrics, then hours/screens
  const own = facts.filter((f) => !f.estimate);
  const derived = facts.filter((f) => f.estimate);
  return [...own, ...extra.filter((f) => f.key === "footfall" || f.key === "dwell"), ...derived, ...extra.filter((f) => f.key === "hours" || f.key === "screens")];
}

// Owner-defined extra details, shown on the screen detail
export function customDetailsFor(screen: Screen): Array<{ label: string; value: string }> {
  const rows = Array.isArray(screen.customAttributes) ? screen.customAttributes : [];
  return rows
    .filter((r) => r && r.label && r.value)
    .map((r) => ({ label: r.label, value: r.unit ? `${r.value} ${r.unit}` : r.value }));
}
