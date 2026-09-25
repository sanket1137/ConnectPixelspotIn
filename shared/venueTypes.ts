// Venue families and the "key facts" an advertiser sees for each kind of venue.
//
// venue_category in the DB is free text ("Multiplex", "Corporate Office", "Residential", …), so the
// family is detected from venue_category first, then venue name / screen name as a fallback.
// Facts are only ever built from real data on the screen rows (columns, or numbers written in the
// description such as "315 offices" or "1,240 flats") — nothing is estimated or invented.

export type VenueFamily =
  | "residential"
  | "cinema"
  | "retail"
  | "food"
  | "workplace"
  | "outdoor"
  | "transit"
  | "lifestyle"
  | "other";

export const VENUE_FAMILY_LABELS: Record<VenueFamily, string> = {
  residential: "Residential",
  cinema: "Cinema",
  retail: "Retail & Malls",
  food: "Food & Drink",
  workplace: "Workplace",
  outdoor: "Outdoor",
  transit: "Transit",
  lifestyle: "Lifestyle & Health",
  other: "Venue",
};

// Order matters: first match wins. Keywords are matched against lower-cased text.
const FAMILY_RULES: Array<{ family: VenueFamily; keywords: string[] }> = [
  { family: "residential", keywords: ["apartment", "residential", "residence", "society", "villa", "gated", "housing"] },
  { family: "cinema", keywords: ["cinema", "multiplex", "theater", "theatre", "pvr", "inox", "cinepolis", "cinépolis", "audi"] },
  { family: "transit", keywords: ["bus stop", "bus station", "bus stand", "metro", "railway", "train", "airport", "transit", "vande bharat"] },
  { family: "outdoor", keywords: ["billboard", "bill board", "hoarding", "highway", "road", "street", "junction", "flyover", "petrol", "parking", "barricade", "mill", "outdoor"] },
  { family: "workplace", keywords: ["corporate", "office", "tech park", "it park", "co-working", "coworking", "business park"] },
  { family: "retail", keywords: ["mall", "hypermarket", "supermarket", "super market", "smart bazaar", "retail", "store", "shopping", "mart"] },
  { family: "food", keywords: ["restaurant", "cafe", "café", "coffee", "food", "hotel", "dhaba", "resto", "bar", "bakery", "udupi"] },
  { family: "lifestyle", keywords: ["salon", "spa", "gym", "fitness", "hospital", "clinic", "play area", "play zone", "play ville", "playville", "kids", "stadium", "sports", "college"] },
];

export function getVenueFamily(input: { venueCategory?: string | null; venueName?: string | null; name?: string | null }): VenueFamily {
  const sources = [input.venueCategory, input.venueName, input.name];
  for (const source of sources) {
    const text = (source || "").toLowerCase();
    if (!text) continue;
    for (const rule of FAMILY_RULES) {
      if (rule.keywords.some((k) => text.includes(k))) return rule.family;
    }
  }
  return "other";
}

// ---------- Numbers written in descriptions ----------

type CountKey = "flats" | "residents" | "seats" | "audis" | "offices" | "employees" | "stores" | "members" | "rooms";

const COUNT_PATTERNS: Record<CountKey, RegExp> = {
  flats: /(\d[\d,]*)\s*\+?\s*(?:flats|apartments|households|homes|families)\b/i,
  residents: /(\d[\d,]*)\s*\+?\s*residents\b/i,
  seats: /(\d[\d,]*)\s*\+?\s*(?:seats|seater|seating|recliners|covers)\b/i,
  audis: /(\d[\d,]*)\s*\+?\s*(?:audis|auditoriums|audi screens)\b/i,
  offices: /(\d[\d,]*)\s*\+?\s*(?:offices|companies|tenants)\b/i,
  employees: /(\d[\d,]*)\s*\+?\s*(?:employees|professionals|working professionals)\b/i,
  stores: /(\d[\d,]*)\s*\+?\s*(?:stores|outlets|shops|brands)\b/i,
  members: /(\d[\d,]*)\s*\+?\s*(?:members|memberships)\b/i,
  rooms: /(\d[\d,]*)\s*\+?\s*(?:rooms|keys)\b/i,
};

function parseCount(description: string, key: CountKey): number | null {
  const m = description.match(COUNT_PATTERNS[key]);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ---------- Formatting ----------

export function formatCompact(n: number): string {
  if (n >= 10000000) return `${(n / 10000000).toFixed(1).replace(/\.0$/, "")} Cr`;
  if (n >= 100000) return `${(n / 100000).toFixed(1).replace(/\.0$/, "")} L`;
  if (n >= 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return n.toLocaleString("en-IN");
}

function formatClock(hhmm?: string | null): string | null {
  if (!hhmm) return null;
  const [hStr, mStr = "00"] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  if (!Number.isFinite(h)) return null;
  const suffix = h >= 12 && h < 24 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return mStr === "00" ? `${h12} ${suffix}` : `${h12}:${mStr} ${suffix}`;
}

export function getOperatingHoursLabel(screen: any): string | null {
  const start = formatClock(screen?.customOperatingHoursStart);
  const end = formatClock(screen?.customOperatingHoursEnd);
  if (start && end) return start === end ? "24 hours" : `${start} – ${end}`;
  if (screen?.operatingHoursPreset && screen.operatingHoursPreset !== "Custom") {
    const m = String(screen.operatingHoursPreset).match(/\(([^|)]+)/);
    return m ? m[1].trim() : String(screen.operatingHoursPreset);
  }
  if (screen?.operationalHours) {
    try {
      const parsed = JSON.parse(screen.operationalHours);
      const s = formatClock(parsed.start);
      const e = formatClock(parsed.end);
      if (s && e) return `${s} – ${e}`;
    } catch {
      /* not JSON */
    }
  }
  return null;
}

// How many times one advertiser's ad plays per hour, when the loop length is known.
export function getPlaysPerHour(screen: any): number | null {
  const loop = Number(screen?.loopDuration);
  if (Number.isFinite(loop) && loop > 0) return Math.floor(3600 / loop);
  return null;
}

// ---------- Key facts ----------

export interface VenueFact {
  key: string;
  label: string;
  value: string;
}

// Venue-level facts from all listings at the venue. Footfall/dwell are venue properties that each
// listing repeats, so we take the max rather than summing.
export function getVenueKeyFacts(listings: any[], family: VenueFamily, totalScreens: number): VenueFact[] {
  const description = listings.map((l) => l.description || "").join(" \n ");
  const maxOf = (pick: (l: any) => number | null | undefined) => {
    const values = listings.map(pick).filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
    return values.length ? Math.max(...values) : null;
  };
  const footfall = maxOf((l) => l.avgDailyFootfall);
  const dwell = maxOf((l) => l.avgDwellTime);
  const hours = listings.map(getOperatingHoursLabel).find(Boolean) || null;
  const counts = Object.fromEntries(
    (Object.keys(COUNT_PATTERNS) as CountKey[]).map((k) => [k, parseCount(description, k)])
  ) as Record<CountKey, number | null>;
  const audience = listings.map((l) => l.incomeLevel).find(Boolean) || null;
  const largestSize = listings.map((l) => l.size).find((s: any) => s && /\d/.test(String(s))) || null;

  const fact = (key: string, label: string, value: string | number | null | undefined): VenueFact | null =>
    value === null || value === undefined || value === "" ? null : { key, label, value: typeof value === "number" ? formatCompact(value) : value };

  const footfallLabel: Record<VenueFamily, string> = {
    residential: "Daily footfall",
    cinema: "Daily footfall",
    retail: "Daily shoppers",
    food: "Daily guests",
    workplace: "Daily footfall",
    outdoor: "Daily traffic",
    transit: "Daily commuters",
    lifestyle: "Daily visitors",
    other: "Daily footfall",
  };

  const screensFact = fact("screens", totalScreens === 1 ? "Screen" : "Screens", totalScreens);
  const footfallFact = fact("footfall", footfallLabel[family], footfall);
  const dwellFact = fact("dwell", family === "transit" ? "Avg wait" : "Avg time spent", dwell ? `${dwell} min` : null);
  const hoursFact = fact("hours", "Screen hours", hours);

  const byFamily: Record<VenueFamily, Array<VenueFact | null>> = {
    residential: [fact("flats", "Flats", counts.flats), fact("residents", "Residents", counts.residents), footfallFact, screensFact],
    cinema: [footfallFact, fact("seats", "Seats", counts.seats), fact("audis", "Audis", counts.audis), dwellFact],
    retail: [footfallFact, fact("stores", "Stores", counts.stores), dwellFact, screensFact],
    food: [footfallFact, fact("seats", "Seats", counts.seats), dwellFact, fact("rooms", "Rooms", counts.rooms)],
    workplace: [fact("offices", "Offices", counts.offices), fact("employees", "Employees", counts.employees), footfallFact, screensFact],
    outdoor: [footfallFact, fact("size", "Size", largestSize), hoursFact, screensFact],
    transit: [footfallFact, dwellFact, hoursFact, screensFact],
    lifestyle: [footfallFact, dwellFact, fact("members", "Members", counts.members), fact("audience", "Audience", audience)],
    other: [footfallFact, dwellFact, hoursFact, screensFact],
  };

  const facts: VenueFact[] = [];
  const seen = new Set<string>();
  for (const f of [...byFamily[family], footfallFact, dwellFact, screensFact, hoursFact]) {
    if (f && !seen.has(f.key)) {
      facts.push(f);
      seen.add(f.key);
    }
    if (facts.length === 4) break;
  }
  return facts;
}
