// Canonical venue taxonomy: family → type → aliases. Single source for Discover filters, search,
// cards and (phase 6) the registration dropdown. `screens.venue_category` stays as the raw text
// vendors typed; `screens.venue_type` holds the canonical type slug resolved from it.

export type VenueFamilySlug =
  | "residential"
  | "cinema"
  | "retail"
  | "food"
  | "workplace"
  | "outdoor"
  | "transit"
  | "lifestyle"
  | "education"
  | "mixed";

export interface VenueFamilyDef {
  slug: VenueFamilySlug;
  label: string;
}

export interface VenueTypeDef {
  slug: string;
  label: string;
  family: VenueFamilySlug;
  aliases: string[]; // matched after normalizeText(); the label is always an alias too
}

export const VENUE_FAMILIES: VenueFamilyDef[] = [
  { slug: "residential", label: "Residential" },
  { slug: "cinema", label: "Cinema" },
  { slug: "retail", label: "Retail & Malls" },
  { slug: "food", label: "Food & Drink" },
  { slug: "workplace", label: "Workplace" },
  { slug: "outdoor", label: "Billboards & roads" }, // not "Outdoor": that's the indoor/outdoor screen filter
  { slug: "transit", label: "Transit" },
  { slug: "lifestyle", label: "Lifestyle & Health" },
  { slug: "education", label: "Education" },
  { slug: "mixed", label: "Mixed venues" },
];

export const VENUE_TYPES: VenueTypeDef[] = [
  // Residential
  { slug: "apartment", label: "Apartment", family: "residential", aliases: ["apartments", "residential", "residential building", "residential society", "residence", "residences", "gated society", "gated community", "housing society", "society", "residential complex"] },
  { slug: "villa_community", label: "Villa community", family: "residential", aliases: ["villa", "villas", "villa community", "row houses"] },

  // Cinema
  { slug: "cinema_lobby", label: "Cinema lobby", family: "cinema", aliases: ["cinema", "cinemas", "multiplex", "cinema lobby", "theater lobby", "theatre lobby", "movie theater", "movie theatre"] },
  { slug: "cinema_audi", label: "Cinema audi", family: "cinema", aliases: ["theater", "theatre", "audi", "auditorium", "cinema audi", "cinema screen", "in cinema"] },

  // Retail & Malls
  { slug: "mall", label: "Mall", family: "retail", aliases: ["malls", "shopping mall", "shopping complex", "shopping centre", "shopping center"] },
  { slug: "supermarket", label: "Supermarket", family: "retail", aliases: ["super market", "supermarkets", "hypermarket", "hyper market", "smart bazaar", "grocery store", "grocery"] },
  { slug: "retail_store", label: "Retail store", family: "retail", aliases: ["store", "stores", "shop", "retail", "showroom", "pet store", "pet shop", "sports store", "sports shop", "sporting goods store", "organic store", "organic shop", "organic makeup store", "aquarium shop", "furniture showroom", "textile showroom", "artificial plant shop", "nuts and fruits", "electronics store", "mobile store", "pharmacy"] },
  { slug: "auto_care", label: "Car care", family: "retail", aliases: ["car care", "car detailing", "detailing company", "car wash", "car service", "car showroom"] },

  // Food & Drink
  { slug: "restaurant", label: "Restaurant", family: "food", aliases: ["restaurants", "kitchen", "food court", "dhaba", "family restaurant", "udupi"] },
  { slug: "cafe", label: "Cafe", family: "food", aliases: ["cafe", "café", "cafes", "coffee shop", "coffee house"] },
  { slug: "bar_lounge", label: "Bar & lounge", family: "food", aliases: ["bar", "pub", "lounge", "restobar", "resto bar", "bar & kitchen", "bar and kitchen", "brewery"] },
  { slug: "bakery_dessert", label: "Bakery & desserts", family: "food", aliases: ["bakery", "cake shop", "sweet shop", "sweet store", "sweets", "ice cream", "ice cream parlor", "ice cream parlour", "dessert", "desserts"] },
  { slug: "hotel", label: "Hotel & resort", family: "food", aliases: ["hotels", "resort", "resorts", "hotel & restaurant", "hotel restaurant"] },
  { slug: "event_venue", label: "Event venue", family: "food", aliases: ["party hall", "banquet hall", "banquet", "convention centre", "convention center", "wedding hall"] },

  // Workplace
  { slug: "corporate_office", label: "Corporate office", family: "workplace", aliases: ["corporate", "office", "offices", "office building", "office complex", "corporate lobby", "corporate building"] },
  { slug: "tech_park", label: "Tech park", family: "workplace", aliases: ["corporate park", "corporate tech park", "it park", "tech park", "business park", "sez"] },
  { slug: "coworking", label: "Co-working", family: "workplace", aliases: ["coworking", "co working", "coworking space", "co-working space", "shared office"] },
  { slug: "commercial_building", label: "Commercial building", family: "workplace", aliases: ["commercial", "commercial complex", "commercial tower", "trade tower"] },

  // Outdoor
  { slug: "roadside_billboard", label: "Roadside billboard", family: "outdoor", aliases: ["roadside", "road side", "billboard", "bill board", "hoarding", "hoardings", "outdoor", "led wall", "outdoor led", "digital billboard", "unipole", "gantry"] },
  { slug: "highway", label: "Highway", family: "outdoor", aliases: ["highways", "expressway", "national highway"] },
  { slug: "junction", label: "Junction & flyover", family: "outdoor", aliases: ["road junction", "junction", "traffic junction", "signal", "flyover"] },
  { slug: "fuel_station", label: "Fuel station", family: "outdoor", aliases: ["petrol bunk", "petrol pump", "fuel station", "petrol station", "gas station"] },
  { slug: "parking", label: "Parking", family: "outdoor", aliases: ["parking lot", "car parking", "parking barricade", "barricade", "barricades"] },

  // Transit
  { slug: "bus_station", label: "Bus station", family: "transit", aliases: ["bus stand", "bus terminal", "bus depot", "ksrtc"] },
  { slug: "bus_stop", label: "Bus stop", family: "transit", aliases: ["bus shelter", "bus queue shelter", "bqs"] },
  { slug: "railway_station", label: "Railway station", family: "transit", aliases: ["railway", "railways", "train station", "railway platform"] },
  { slug: "train_onboard", label: "Train (onboard)", family: "transit", aliases: ["train", "trains", "vande bharat", "onboard train"] },
  { slug: "metro", label: "Metro", family: "transit", aliases: ["metro station", "metro rail", "subway"] },
  { slug: "airport", label: "Airport", family: "transit", aliases: ["airports", "airport terminal"] },
  { slug: "transit_hub", label: "Transit hub", family: "transit", aliases: ["transit", "interchange"] },

  // Lifestyle & Health
  { slug: "salon_spa", label: "Salon & spa", family: "lifestyle", aliases: ["salon", "saloon", "spa", "salon & spa", "salon and spa", "beauty parlour", "beauty parlor", "nail studio", "nail salon", "foot spa", "tattoo", "tattoo studio", "tattoo shop", "tattoo centre", "tattoo center", "tatoo studio", "barber", "barber shop"] },
  { slug: "gym", label: "Gym & fitness", family: "lifestyle", aliases: ["gym", "gyms", "fitness", "fitness centre", "fitness center", "fitness consultant", "yoga", "yoga studio", "crossfit", "health club"] },
  { slug: "clinic", label: "Clinic", family: "lifestyle", aliases: ["clinics", "dental", "dental clinic", "dentist", "skin clinic", "skin & hair", "skin & hair clinic", "skin and hair clinic", "physiotherapy", "physio", "pet clinic", "vet clinic", "diagnostic centre", "diagnostic center", "healthcare", "medical centre"] },
  { slug: "hospital", label: "Hospital", family: "lifestyle", aliases: ["hospitals", "multispeciality hospital", "nursing home"] },
  { slug: "play_area", label: "Play area", family: "lifestyle", aliases: ["play zone", "play centre", "play center", "kids play centre", "kids play center", "game centre", "game center", "gaming zone", "kids game centre", "arcade", "play ville", "playville", "trampoline park"] },
  { slug: "sports_venue", label: "Sports venue", family: "lifestyle", aliases: ["stadium", "sports complex", "sports centre", "sports center", "sports", "sports club", "turf", "sports arena"] },

  // Education
  { slug: "academy", label: "Academy & classes", family: "education", aliases: ["academy", "academies", "coaching", "coaching centre", "tuition", "classes", "institute", "music academy", "music school", "dance studio", "dance school", "art school", "martial arts school", "sports academy"] },
  { slug: "school_college", label: "School & college", family: "education", aliases: ["school", "schools", "play school", "preschool", "pre school", "college", "colleges", "university", "campus"] },

  // Mixed venues
  { slug: "standee_network", label: "Standee network", family: "mixed", aliases: ["standee", "standees", "digital standee", "standee network", "multi venue", "mixed"] },
];

// ---------- Normalisation ----------

// lowercase, accents stripped (é → e), punctuation → space except "&", spaces collapsed.
// A few common spelling variants are folded so aliases don't have to list them all.
export function normalizeText(input: string | null | undefined): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9&]+/g, " ")
    .replace(/\bcenter\b/g, "centre")
    .replace(/\bparlor\b/g, "parlour")
    .replace(/\bicecream\b/g, "ice cream")
    .replace(/\s+/g, " ")
    .trim();
}

const TYPE_BY_SLUG = new Map(VENUE_TYPES.map((t) => [t.slug, t]));
const FAMILY_BY_SLUG = new Map(VENUE_FAMILIES.map((f) => [f.slug, f]));

// normalised alias → type slug (label and slug count as aliases too)
const ALIAS_TO_TYPE = (() => {
  const m = new Map<string, string>();
  for (const t of VENUE_TYPES) {
    for (const a of [t.label, t.slug.replace(/_/g, " "), ...t.aliases]) {
      const key = normalizeText(a);
      if (key && !m.has(key)) m.set(key, t.slug);
    }
  }
  return m;
})();

// Longest aliases first, so "bus stop" wins over "stop", "cinema lobby" over "cinema"
const ALIASES_BY_LENGTH = Array.from(ALIAS_TO_TYPE.keys()).sort((a, b) => b.length - a.length);

export function getVenueType(slug: string | null | undefined): VenueTypeDef | undefined {
  return slug ? TYPE_BY_SLUG.get(slug) : undefined;
}

export function getVenueFamilyDef(slug: string | null | undefined): VenueFamilyDef | undefined {
  return slug ? FAMILY_BY_SLUG.get(slug as VenueFamilySlug) : undefined;
}

export function typesInFamily(family: VenueFamilySlug): VenueTypeDef[] {
  return VENUE_TYPES.filter((t) => t.family === family);
}

export interface VenueTypeMatch {
  type: VenueTypeDef;
  // exact alias · an alias found inside longer text · category empty, resolved from the venue/screen name
  method: "exact" | "contains" | "name";
}

// Raw values reviewed and deliberately left without a type (they'd otherwise match by a word
// inside them, e.g. "Theater Company" is a studio, not a cinema).
const NO_TYPE_VALUES = new Set(["theater company", "theatre company"]);

function hasPhrase(haystack: string, phrase: string): boolean {
  return ` ${haystack} `.includes(` ${phrase} `);
}

// Raw venue_category (free text) → canonical type. Exact alias match first; otherwise the longest
// alias that appears as whole words inside the text ("Kids Play centre Whitefield" → play_area).
export function resolveVenueType(raw: string | null | undefined): VenueTypeMatch | null {
  const text = normalizeText(raw);
  if (!text || NO_TYPE_VALUES.has(text)) return null;
  const exact = ALIAS_TO_TYPE.get(text);
  if (exact) return { type: TYPE_BY_SLUG.get(exact)!, method: "exact" };
  for (const alias of ALIASES_BY_LENGTH) {
    if (alias.length >= 3 && hasPhrase(text, alias)) return { type: TYPE_BY_SLUG.get(ALIAS_TO_TYPE.get(alias)!)!, method: "contains" };
  }
  return null;
}

// What a screen row resolves to: its venue_category first; only when that's empty, the venue name
// and then the screen name ("MG Road Metro" → metro). Used at write time and by the backfill.
export function resolveScreenVenueType(s: { venueCategory?: string | null; venueName?: string | null; name?: string | null }): VenueTypeMatch | null {
  if (normalizeText(s.venueCategory)) return resolveVenueType(s.venueCategory);
  for (const text of [s.venueName, s.name]) {
    const m = resolveVenueType(text);
    if (m) return { type: m.type, method: "name" };
  }
  return null;
}

// Raw environment_type → "indoor" | "outdoor". Outdoor = Outdoor, Outdoor Digital, Semi-Outdoor.
// When it's empty, an Outdoor-family venue type counts as outdoor.
export function resolveEnvironmentClass(raw: string | null | undefined, venueType?: string | null): "indoor" | "outdoor" | null {
  const text = normalizeText(raw);
  if (text.includes("outdoor")) return "outdoor"; // outdoor, outdoor digital, semi outdoor
  if (text.includes("indoor")) return "indoor";
  if (!text && venueType) return getVenueType(venueType)?.family === "outdoor" ? "outdoor" : null;
  return null;
}

// ---------- Search ----------

// Everything a screen can be found by, lowercased and accent-free: venue & screen name, address,
// city/state/pincode, raw category, the type + family labels, and the network (host) code.
// Stored in screens.search_text at write time. Aliases are NOT copied in (a retail store would
// otherwise match "pet"); a query word that is an alias matches by venue_type instead.
export function buildSearchText(s: {
  venueName?: string | null;
  name?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  host?: string | null;
  venueCategory?: string | null;
  venueType?: string | null;
}): string {
  const type = getVenueType(s.venueType) || resolveScreenVenueType(s)?.type;
  const family = type ? FAMILY_BY_SLUG.get(type.family) : undefined;
  const parts = [s.venueName, s.name, s.location, s.city, s.state, s.pincode, s.host, s.venueCategory, type?.label, family?.label];
  return Array.from(new Set(parts.map(normalizeText).filter(Boolean))).join(" | ");
}

export interface SearchTerm {
  text: string; // must appear in search_text…
  types: string[]; // …or, when the term is a venue-type word, the screen's venue_type is one of these
}

export interface ParsedSearch {
  terms: SearchTerm[]; // every term must match
  families: VenueFamilySlug[]; // venue-type words in the query switch these families on
}

// "gym koramangala" → terms [gym (or type gym), koramangala], families [lifestyle].
// Multi-word type phrases ("bus stop") stay together as one term.
export function parseSearchQuery(query: string | null | undefined): ParsedSearch {
  let text = normalizeText(query);
  const terms: SearchTerm[] = [];
  const families = new Set<VenueFamilySlug>();
  const add = (term: string) => {
    if (terms.some((t) => t.text === term)) return;
    const slug = ALIAS_TO_TYPE.get(term);
    if (slug) families.add(TYPE_BY_SLUG.get(slug)!.family);
    terms.push({ text: term, types: slug ? [slug] : [] });
  };
  for (const alias of ALIASES_BY_LENGTH) {
    if (!alias.includes(" ") || !hasPhrase(text, alias)) continue;
    add(alias);
    text = ` ${text} `.replace(` ${alias} `, " ").trim();
  }
  text.split(" ").filter(Boolean).forEach(add);
  return { terms, families: Array.from(families) };
}

// Same rule the server applies in SQL — used by tests.
export function matchesSearch(searchText: string, parsed: ParsedSearch, venueType?: string | null): boolean {
  return parsed.terms.every((t) => searchText.includes(t.text) || (!!venueType && t.types.includes(venueType)));
}
