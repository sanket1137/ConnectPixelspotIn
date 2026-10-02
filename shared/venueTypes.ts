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
  | "education"
  | "other";

export const VENUE_FAMILY_LABELS: Record<VenueFamily, string> = {
  residential: "Residential",
  cinema: "Cinema",
  retail: "Retail & Malls",
  food: "Food & Drink",
  workplace: "Workplace",
  outdoor: "Billboards & roads",
  transit: "Transit",
  lifestyle: "Lifestyle & Health",
  education: "Education",
  other: "Venue",
};

// Order matters: first match wins. Keywords are matched against lower-cased text.
const FAMILY_RULES: Array<{ family: VenueFamily; keywords: string[] }> = [
  { family: "residential", keywords: ["apartment", "residential", "residence", "society", "villa", "gated", "housing"] },
  { family: "education", keywords: ["school", "academy", "college", "institute", "university", "coaching", "tuition", "classes"] },
  { family: "cinema", keywords: ["cinema", "multiplex", "theater", "theatre", "pvr", "inox", "cinepolis", "cinépolis", "audi"] },
  { family: "transit", keywords: ["bus stop", "bus station", "bus stand", "metro", "railway", "train", "airport", "transit", "vande bharat"] },
  { family: "outdoor", keywords: ["billboard", "bill board", "hoarding", "highway", "road", "street", "junction", "flyover", "petrol", "parking", "barricade", "mill", "outdoor"] },
  { family: "workplace", keywords: ["corporate", "office", "tech park", "it park", "co-working", "coworking", "business park"] },
  { family: "retail", keywords: ["mall", "hypermarket", "supermarket", "super market", "smart bazaar", "retail", "store", "shopping", "mart"] },
  { family: "food", keywords: ["restaurant", "cafe", "café", "coffee", "food", "hotel", "dhaba", "resto", "bar", "bakery", "udupi"] },
  { family: "lifestyle", keywords: ["salon", "spa", "gym", "fitness", "hospital", "clinic", "play area", "play zone", "play ville", "playville", "play centre", "play center", "game centre", "game center", "kids", "stadium", "sports", "dance", "yoga", "tattoo", "nail"] },
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

type CountKey =
  | "flats" | "residents" | "seats" | "audis" | "offices" | "employees" | "stores" | "members" | "rooms"
  | "towers" | "lifts" | "departures";

// Several phrasings per key; the first pattern that matches wins. Group 1 is always the number.
// Covers the templated descriptions from bulk imports too, e.g. "Seating capacity 162",
// "6 tower(s) with 12 lift(s) serving 660 flats", "538 bus departures/day".
const COUNT_PATTERNS: Record<CountKey, RegExp[]> = {
  flats: [/(\d[\d,]*)\s*\+?\s*(?:flats|apartments|households|homes|families)\b/i],
  residents: [/(\d[\d,]*)\s*\+?\s*residents\b/i],
  seats: [/seating capacity\s*(?:of\s*)?[:\-]?\s*(\d[\d,]*)/i, /(\d[\d,]*)\s*\+?\s*(?:seats|seater|seating|recliners|covers)\b/i],
  audis: [/(\d[\d,]*)\s*\+?\s*(?:audis|auditoriums|audi screens)\b/i],
  offices: [/(\d[\d,]*)\s*\+?\s*(?:offices|companies|tenants)\b/i],
  employees: [/(\d[\d,]*)\s*\+?\s*(?:employees|professionals|working professionals)\b/i],
  stores: [/(\d[\d,]*)\s*\+?\s*(?:stores|outlets|shops|brands)\b/i],
  members: [/(\d[\d,]*)\s*\+?\s*(?:members|memberships|students)\b/i],
  rooms: [/(\d[\d,]*)\s*\+?\s*(?:rooms|keys)\b/i],
  towers: [/(\d[\d,]*)\s*tower(?:\(s\)|s)?\b/i],
  lifts: [/(\d[\d,]*)\s*lift(?:\(s\)|s)?\b/i],
  departures: [/(\d[\d,]*)\s*(?:bus\s+|train\s+)?departures\b/i],
};

function parseCount(description: string, key: CountKey): number | null {
  for (const pattern of COUNT_PATTERNS[key]) {
    const m = description.match(pattern);
    if (!m) continue;
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

// "avg flat price approx Rs 1.2 Cr" / "average flat value ₹85 lakh" → rupees
function parseFlatValue(description: string): number | null {
  const m = description.match(/(?:avg|average)\.?\s+flat\s+(?:price|value|cost)[^\d₹]{0,20}(?:rs\.?|inr|₹)?\s*([\d.]+)\s*(cr|crore|crores|l|lac|lakh|lakhs)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * (/^c/i.test(m[2]) ? 10000000 : 100000));
}

// "Cinema category: SILVER" → "Silver"
function parseCinemaTier(description: string): string | null {
  const m = description.match(/cinema category\s*:\s*([a-z' ]{3,20}?)(?:[.,\n]|$)/i);
  if (!m) return null;
  return m[1].trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatRupeesCompact(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1).replace(/\.0$/, "")} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, "")} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
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
  return buildVenueFacts(listings, family, totalScreens).slice(0, 4);
}

// Facts that describe the venue itself (not footfall, screen count, hours or size) — used for the
// two-fact line on result cards, e.g. "660 flats · ₹1.2 Cr avg flat value".
export function getVenueTypeFacts(listings: any[], family: VenueFamily): VenueFact[] {
  const generic = new Set(["footfall", "screens", "hours", "size", "dwell"]);
  return buildVenueFacts(listings, family, 1).filter((f) => !generic.has(f.key));
}

// Every fact we can back with data, most important for the venue type first.
export function buildVenueFacts(listings: any[], family: VenueFamily, totalScreens: number): VenueFact[] {
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
    education: "Daily students & parents",
    other: "Daily footfall",
  };

  const screensFact = fact("screens", totalScreens === 1 ? "Screen" : "Screens", totalScreens);
  const footfallFact = fact("footfall", footfallLabel[family], footfall);
  const dwellFact = fact("dwell", family === "transit" ? "Avg wait" : "Avg time spent", dwell ? `${dwell} min` : null);
  const hoursFact = fact("hours", "Screen hours", hours);

  const flatValue = parseFlatValue(description);
  const flatValueFact = fact("flatValue", "Avg flat value", flatValue ? formatRupeesCompact(flatValue) : null);
  const cinemaTier = parseCinemaTier(description);

  const byFamily: Record<VenueFamily, Array<VenueFact | null>> = {
    residential: [fact("flats", "Flats", counts.flats), flatValueFact, fact("residents", "Residents", counts.residents), footfallFact, fact("towers", "Towers", counts.towers), fact("lifts", "Lifts", counts.lifts), screensFact],
    cinema: [fact("seats", "Seats", counts.seats), fact("tier", "Cinema tier", cinemaTier), fact("audis", "Audis", counts.audis), footfallFact, dwellFact],
    retail: [footfallFact, fact("stores", "Stores", counts.stores), dwellFact, screensFact],
    food: [footfallFact, fact("seats", "Seats", counts.seats), dwellFact, fact("rooms", "Rooms", counts.rooms)],
    workplace: [fact("employees", "Employees", counts.employees), fact("offices", "Offices", counts.offices), footfallFact, fact("lifts", "Lifts", counts.lifts), screensFact],
    outdoor: [footfallFact, fact("size", "Size", largestSize), hoursFact, screensFact],
    transit: [footfallFact, fact("departures", "Departures / day", counts.departures), dwellFact, hoursFact, screensFact],
    lifestyle: [footfallFact, dwellFact, fact("members", "Members", counts.members), fact("audience", "Audience", audience)],
    education: [footfallFact, dwellFact, fact("members", "Students", counts.members), fact("audience", "Audience", audience)],
    other: [footfallFact, dwellFact, hoursFact, screensFact],
  };

  const facts: VenueFact[] = [];
  const seen = new Set<string>();
  for (const f of [...byFamily[family], footfallFact, dwellFact, screensFact, hoursFact]) {
    // footfall that only repeats an earlier number ("3,000 residents" / "3,000 daily footfall") adds nothing
    if (f && f.key === "footfall" && facts.some((x) => x.value === f.value)) continue;
    if (f && !seen.has(f.key)) {
      facts.push(f);
      seen.add(f.key);
    }
  }
  return facts;
}
