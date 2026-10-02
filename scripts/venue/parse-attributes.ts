// Pre-fills venue_attributes from what screen descriptions (and the size column) already say.
// Only explicit numbers are taken — nothing is estimated or invented. Used by the one-time
// backfill (scripts/venue/backfill-attributes.ts), which is reviewed as a dry run first.
import { attributesFor, type VenueAttributes } from "../../shared/venueAttributes";

const int = (s: string) => parseInt(s.replace(/,/g, ""), 10);
const rupees = (amount: string, unit: string) => Math.round(parseFloat(amount) * (/^c/i.test(unit) ? 10_000_000 : 100_000));

const TIERS: Record<string, string> = {
  silver: "Silver", gold: "Gold", platinum: "Platinum", icon: "Icon", luxe: "Luxe", insignia: "Insignia",
  "director's cut": "Director's Cut", "directors cut": "Director's Cut", "7 star": "7 Star",
};

interface Rule {
  key: string;
  source: string; // shown in the dry-run report
  pattern: RegExp;
  value: (m: RegExpMatchArray) => number | string | null;
}

const RULES: Rule[] = [
  // Residential
  { key: "flats", source: "“N flats / households”", pattern: /(\d[\d,]*)\s*(?:flats|households|homes)\b/i, value: (m) => int(m[1]) },
  { key: "towers", source: "“N tower(s)”", pattern: /(\d[\d,]*)\s*tower(?:\(s\)|s)?\b/i, value: (m) => int(m[1]) },
  { key: "lifts", source: "“N lift(s)”", pattern: /(\d[\d,]*)\s*lift(?:\(s\)|s)?\b/i, value: (m) => int(m[1]) },
  { key: "residents", source: "“approx. N captive residents”", pattern: /approx\.?\s*(\d[\d,]*)\s*captive residents/i, value: (m) => int(m[1]) },
  { key: "residents", source: "“Approximately N residents/users daily”", pattern: /approximately\s*(\d[\d,]*)\s*residents\/users daily/i, value: (m) => int(m[1]) },
  { key: "avg_flat_value", source: "“avg flat price approx Rs X Cr”", pattern: /avg\.?\s+flat\s+(?:price|value)\s*(?:approx\.?)?\s*(?:rs\.?|₹|inr)?\s*([\d.]+)\s*(cr|crore|l|lakh)\b/i, value: (m) => rupees(m[1], m[2]) },
  { key: "avg_flat_value", source: "“Property value up to ₹X Cr” (a maximum, not an average)", pattern: /property value up to\s*(?:rs\.?|₹|inr)?\s*([\d.]+)\s*(cr|crore|l|lakh)\b/i, value: (m) => rupees(m[1], m[2]) },

  // Cinema
  { key: "seating_capacity", source: "“Seating capacity N”", pattern: /seating capacity\s*(?:of\s*)?[:\-]?\s*(\d[\d,]*)/i, value: (m) => int(m[1]) },
  { key: "cinema_tier", source: "“Cinema category: X”", pattern: /cinema category\s*:\s*([a-z' ]{3,20}?)\s*[.,]/i, value: (m) => TIERS[m[1].trim().toLowerCase()] ?? null },
  { key: "cinema_tier", source: "“in PVR - X multiplex”", pattern: /-\s*(silver|gold|platinum|icon|luxe|insignia|director'?s cut|7 star)\s+multiplex/i, value: (m) => TIERS[m[1].trim().toLowerCase()] ?? null },

  // Workplace
  { key: "employees", source: "“serving an estimated N employees”", pattern: /serving (?:an estimated\s*)?(\d[\d,]*)\s*employees/i, value: (m) => int(m[1]) },
  { key: "companies", source: "“across N offices”", pattern: /across\s*(\d[\d,]*)\s*offices/i, value: (m) => int(m[1]) },

  // Transit
  { key: "passengers_per_day", source: "“N total daily footfall”", pattern: /(\d[\d,]*)\s*total daily footfall/i, value: (m) => int(m[1]) },
  { key: "departures_per_day", source: "“N bus departures/day”", pattern: /(\d[\d,]*)\s*bus departures\s*\/\s*day/i, value: (m) => int(m[1]) },

  // Malls
  { key: "stores", source: "“N+ brands”", pattern: /(\d[\d,]*)\s*\+?\s*brands\b/i, value: (m) => int(m[1]) },
  { key: "area_sqft", source: "“X L sqft”", pattern: /([\d.]+)\s*l(?:akh)?\s*sq\.?\s*ft/i, value: (m) => Math.round(parseFloat(m[1]) * 100_000) },
];

// Billboard size from the size column ("16 x 9 ft", "13.1 x 7.3 ft", "48x8 feet")
const SIZE_RE = /([\d.]+)\s*(?:ft|feet|')?\s*[x×]\s*([\d.]+)\s*(?:ft|feet|')/i;

export interface ParsedAttributes {
  attrs: VenueAttributes;
  sources: Record<string, string>; // key → which rule filled it
}

export function parseAttributes(venueType: string | null, description: string | null, size: string | null): ParsedAttributes {
  const allowed = new Set(attributesFor(venueType).map((d) => d.key));
  const attrs: VenueAttributes = {};
  const sources: Record<string, string> = {};
  const text = (description || "").replace(/\s+/g, " ");

  for (const rule of RULES) {
    if (!allowed.has(rule.key) || attrs[rule.key] !== undefined) continue;
    const m = text.match(rule.pattern);
    if (!m) continue;
    const v = rule.value(m);
    if (v === null || (typeof v === "number" && (!Number.isFinite(v) || v <= 0))) continue;
    attrs[rule.key] = v;
    sources[rule.key] = rule.source;
  }

  if (allowed.has("width_ft") && size) {
    const m = size.match(SIZE_RE);
    if (m) {
      attrs.width_ft = parseFloat(m[1]);
      attrs.height_ft = parseFloat(m[2]);
      sources.width_ft = sources.height_ft = "size column “W x H ft”";
    }
  }
  return { attrs, sources };
}

// Footfall the description itself calls an estimate/assumption → shown with "Est."
export function footfallIsEstimate(description: string | null): boolean {
  return /\b(assumption|estimated footfall|est\.?\s*avg|approximately\s+[\d,]+\s+residents)/i.test(description || "");
}
