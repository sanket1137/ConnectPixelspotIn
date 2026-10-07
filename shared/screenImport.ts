// Admin Excel import of screens: template columns, value normalisation, validation, duplicate fingerprint
// and row → screen conversion. Shared by the server (template, upload, commit) and the browser (instant checks
// in the validation grid). Checks that need the database (duplicates against saved screens / other drafts)
// are computed on the server and passed in as `db`.

import { normalizeCityName } from "./constants";
import {
  CONTENT_TYPES,
  DETAILED_AGE_GROUPS,
  DISPLAY_FORMATS,
  ENVIRONMENT_TYPES,
  GENDER_ORIENTATIONS,
  INCOME_LEVELS,
  INDIAN_STATES,
  OCCUPATIONS,
  SCREEN_CATEGORIES,
  TIME_OF_DAY_SLOTS,
  TIME_OPTIONS,
  TRAFFIC_TYPES,
  USER_INTENTS,
  USER_MOODS,
  VISIBILITY_LEVELS,
  WEEK_DAYS,
} from "./screenFieldOptions";
import { cleanMetricValue, metricsFor, type MetricDef, type MetricRegistry, type VenueMetrics } from "./venueMetrics";
import { getVenueType } from "./venueTaxonomy";

export const TEMPLATE_VERSION = 1;
export const MAX_IMPORT_ROWS = 1000;
export const METRIC_PREFIX = "m.";

export type ImportCell = string | string[]; // multi-choice fields hold the chosen options
export interface ImportRow {
  row: number; // row number in the uploaded sheet (for messages)
  values: Record<string, ImportCell>;
  differentScreen?: boolean; // admin confirmed a near-duplicate is a different screen
  warningsOk?: boolean; // admin reviewed this row's warnings
}

export type FieldKind = "text" | "int" | "number" | "decimal" | "select" | "multi" | "time" | "yesno" | "pincode" | "resolution";
export interface ImportField {
  key: string; // screen property (camelCase) or "m.<metric key>"
  header: string;
  group: string;
  kind: FieldKind;
  options?: readonly string[];
  required?: boolean;
  help: string;
  example?: string;
  min?: number;
  max?: number;
  width?: number;
  metric?: MetricDef;
}

const opts = (xs: readonly string[]) => xs;

// Screen columns, in template order (venue metrics are appended per venue type)
export const BASE_IMPORT_FIELDS: ImportField[] = [
  { key: "name", header: "Screen name", group: "Location", kind: "text", required: true, help: "3–120 characters, e.g. 'Tower A Lift Lobby'", example: "Tower A Lift Lobby", width: 30 },
  { key: "venueName", header: "Venue name", group: "Location", kind: "text", required: true, help: "Building / venue, e.g. 'Prestige Lakeside Habitat'", example: "Prestige Lakeside Habitat", width: 30 },
  { key: "location", header: "Address", group: "Location", kind: "text", required: true, help: "Full street address", example: "Varthur Road, Whitefield", width: 36 },
  { key: "state", header: "State", group: "Location", kind: "select", options: opts(INDIAN_STATES), required: true, help: "Pick from the list", example: "Karnataka", width: 20 },
  { key: "city", header: "City", group: "Location", kind: "select", required: true, help: "Pick from the list for the chosen State. Missing city? Add it in Settings → Cities.", example: "Bengaluru", width: 20 },
  { key: "pincode", header: "Pincode", group: "Location", kind: "pincode", required: true, help: "6 digits", example: "560087", width: 10 },
  { key: "latitude", header: "Latitude", group: "Location", kind: "decimal", required: true, help: "Decimal degrees, e.g. 12.934512 (Google Maps → right-click → copy)", example: "12.934512", width: 12 },
  { key: "longitude", header: "Longitude", group: "Location", kind: "decimal", required: true, help: "Decimal degrees, e.g. 77.745123", example: "77.745123", width: 12 },
  { key: "category", header: "Screen category", group: "Screen", kind: "select", options: opts(SCREEN_CATEGORIES), required: true, help: "Pick from the list", example: "Lift Display", width: 18 },
  { key: "displayFormat", header: "Display format", group: "Screen", kind: "select", options: opts(DISPLAY_FORMATS), required: true, help: "Pick from the list", example: "Portrait", width: 14 },
  { key: "resolution", header: "Resolution", group: "Screen", kind: "resolution", required: true, help: "Width x height in pixels, e.g. 1080x1920", example: "1080x1920", width: 13 },
  { key: "durationPerSlot", header: "Ad slot duration (sec)", group: "Screen", kind: "int", required: true, min: 1, max: 300, help: "Length of one ad, in seconds", example: "10", width: 12 },
  { key: "loopDuration", header: "Loop duration (sec)", group: "Screen", kind: "int", min: 1, max: 3600, help: "Length of the full ad loop, in seconds (≥ ad slot)", example: "120", width: 12 },
  { key: "environmentType", header: "Environment type", group: "Screen", kind: "select", options: opts(ENVIRONMENT_TYPES), required: true, help: "Pick from the list", example: "Indoor", width: 16 },
  { key: "visibility", header: "Visibility", group: "Screen", kind: "select", options: opts(VISIBILITY_LEVELS), help: "Pick from the list", example: "High", width: 11 },
  { key: "contentTypesSupported", header: "Content types supported", group: "Screen", kind: "multi", options: opts(CONTENT_TYPES), required: true, help: "Yes for every type the screen can play", width: 9 },
  { key: "customOperatingHoursStart", header: "Opening time", group: "Timing", kind: "time", options: TIME_OPTIONS, help: "24-hour time, 15-minute steps", example: "09:00", width: 10 },
  { key: "customOperatingHoursEnd", header: "Closing time", group: "Timing", kind: "time", options: TIME_OPTIONS, help: "24-hour time; earlier than opening = runs past midnight", example: "22:00", width: 10 },
  { key: "customOperatingDays", header: "Operating days", group: "Timing", kind: "multi", options: opts(WEEK_DAYS), required: true, help: "Yes for every day the screen runs", width: 8 },
  { key: "timeOfDayActivity", header: "Time-of-day activity", group: "Timing", kind: "multi", options: opts(TIME_OF_DAY_SLOTS), required: true, help: "Yes for the busy times", width: 10 },
  { key: "trafficType", header: "Traffic type", group: "Audience", kind: "select", options: opts(TRAFFIC_TYPES), required: true, help: "Pick from the list", example: "Pedestrian", width: 15 },
  { key: "avgDailyFootfall", header: "Avg daily footfall", group: "Audience", kind: "int", required: true, min: 0, help: "People passing the screen on a typical day", example: "1200", width: 12 },
  { key: "avgDwellTime", header: "Avg dwell time (min)", group: "Audience", kind: "int", required: true, min: 1, max: 600, help: "Minutes people spend near the screen", example: "2", width: 11 },
  { key: "detailedAgeGroups", header: "Age groups", group: "Audience", kind: "multi", options: opts(DETAILED_AGE_GROUPS), help: "Yes for the main age groups", width: 10 },
  { key: "genderOrientation", header: "Gender orientation", group: "Audience", kind: "select", options: opts(GENDER_ORIENTATIONS), help: "Pick from the list", example: "Mixed Gender", width: 15 },
  { key: "incomeLevel", header: "Income level", group: "Audience", kind: "select", options: opts(INCOME_LEVELS), help: "Pick from the list", example: "Premium Audience", width: 16 },
  { key: "occupationMix", header: "Occupation mix", group: "Audience", kind: "multi", options: opts(OCCUPATIONS), required: true, help: "Yes for the main occupations", width: 11 },
  { key: "userIntent", header: "User intent", group: "Audience", kind: "multi", options: opts(USER_INTENTS), required: true, help: "Yes for why people are here", width: 10 },
  { key: "userMood", header: "User mood", group: "Audience", kind: "multi", options: opts(USER_MOODS), required: true, help: "Yes for the usual mood", width: 9 },
  { key: "numberOfScreens", header: "Number of screens", group: "Pricing", kind: "int", required: true, min: 1, max: 10000, help: "Screens in this listing", example: "1", width: 10 },
  { key: "pricePerDay", header: "Price per screen per day (₹)", group: "Pricing", kind: "int", required: true, min: 1, max: 10_000_000, help: "Whole rupees, per screen", example: "99", width: 13 },
  { key: "bulkBookingMandatory", header: "Book all screens together", group: "Pricing", kind: "yesno", help: "Yes = advertisers must book every screen in the listing", example: "No", width: 11 },
  { key: "minBookingDays", header: "Min booking days", group: "Pricing", kind: "int", required: true, min: 1, max: 365, help: "Minimum campaign length in days", example: "7", width: 10 },
  { key: "description", header: "Description", group: "Pricing", kind: "text", help: "Optional, up to 1000 characters", width: 36 },
];

// Calculated columns: shown (locked, grey) in the template, ignored on import, recalculated on commit
export const CALCULATED_COLUMNS: Array<{ key: string; header: string; help: string }> = [
  { key: "bundlePricePerDay", header: "Bundle price per day (₹)", help: "= price per screen × number of screens" },
  { key: "isMultiScreen", header: "Multi-screen", help: "= Yes when more than 1 screen" },
  { key: "type", header: "Type", help: "= Screen category" },
  { key: "size", header: "Size", help: "= Resolution" },
  { key: "operationalHours", header: "Operational hours", help: "= Opening – Closing" },
  { key: "playbackSlotsPerHour", header: "Plays per hour", help: "= 3600 ÷ loop duration" },
  { key: "maxBrandsPerLoop", header: "Brands per loop", help: "= loop duration ÷ ad slot" },
];

function metricField(def: MetricDef): ImportField {
  const kind: FieldKind = def.kind === "enum" ? "select" : def.kind === "multi" ? "multi" : def.kind === "boolean" ? "yesno" : def.kind === "text" ? "text" : "number";
  const unit = def.kind === "currency" ? " (₹)" : def.unit ? ` (${def.unit})` : "";
  return {
    key: METRIC_PREFIX + def.key,
    header: `${def.label}${unit}`,
    group: "Venue metrics",
    kind,
    options: def.options,
    required: !!def.required,
    help: [def.help, def.kind === "currency" ? "₹ amount — 85L, 1.2 Cr and 1,20,00,000 are all fine" : null, def.max != null ? `Max ${Number(def.max).toLocaleString("en-IN")}` : null].filter(Boolean).join(". ") || def.label,
    min: def.min ?? undefined,
    max: def.max ?? undefined,
    width: kind === "multi" ? 9 : 14,
    metric: def,
  };
}

export function importFieldsFor(registry: MetricRegistry, venueType: string): ImportField[] {
  return [...BASE_IMPORT_FIELDS, ...metricsFor(registry, venueType).map(metricField)];
}

// ---------- small helpers ----------

export const cellText = (v: ImportCell | undefined): string => (Array.isArray(v) ? v.join(", ") : (v ?? "").toString().trim());
export const cellList = (v: ImportCell | undefined): string[] =>
  Array.isArray(v) ? v : (v ?? "").toString().split(",").map((s) => s.trim()).filter(Boolean);
const isBlank = (v: ImportCell | undefined) => (Array.isArray(v) ? v.length === 0 : cellText(v) === "");

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

export function closest(value: string, options: readonly string[], maxDistance = 3): string | null {
  const v = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!v) return null;
  let best: string | null = null;
  let bestD = Infinity;
  for (const o of options) {
    const k = o.toLowerCase().replace(/[^a-z0-9]/g, "");
    const d = k === v ? 0 : k.startsWith(v) || v.startsWith(k) ? 1 : levenshtein(v, k);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return bestD <= Math.min(maxDistance, Math.max(1, Math.floor(v.length / 3))) ? best : null;
}

// "9 AM", "9:30 pm", "21:00", "0930", "24:00" → "HH:MM"; null if not a time
export function normalizeTime(raw: string): string | null {
  const trimmed = raw.trim();
  // Excel time value pasted as a number: fraction of a day (0.375 = 09:00)
  if (/^0?\.\d+$/.test(trimmed)) {
    const mins = Math.round(parseFloat(trimmed) * 1440);
    return mins >= 1440 ? "23:59" : `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  }
  const s = trimmed.toLowerCase().replace(/\./g, ":").replace(/\s+/g, " ");
  if (!s) return null;
  if (/^(24 ?hours|24x7|24\/7|open 24 hours)$/.test(s)) return "24h";
  const m = s.match(/^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (min > 59) return null;
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    if (m[3] === "am") h = h === 12 ? 0 : h;
    else h = h === 12 ? 12 : h + 12;
  }
  if (h === 24 && min === 0) return "23:59";
  if (h > 23) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function parseYesNo(raw: ImportCell | undefined): boolean | null {
  const s = cellText(raw).toLowerCase();
  if (!s) return null;
  if (["yes", "y", "true", "1", "✓", "x"].includes(s)) return true;
  if (["no", "n", "false", "0", "-"].includes(s)) return false;
  return null;
}

// Decimal string rounded half-up to `places` (avoids float rounding), e.g. ("12.96885", 6) → "12.968850"
function roundDecimalString(raw: string, places: number): string | null {
  const m = raw.trim().match(/^(-?)(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const frac = (m[3] || "").padEnd(places + 1, "0");
  let digits = BigInt(m[2] + frac.slice(0, places));
  if (parseInt(frac[places], 10) >= 5) digits += BigInt(1);
  const str = digits.toString().padStart(places + 1, "0");
  return `${m[1]}${str.slice(0, -places)}.${str.slice(-places)}`;
}

// Same fingerprint as the generated column screens.dedupe_key (see migrations/2026_10_venue_metrics.up.sql)
export function dedupeKey(venueName: string, name: string, lat: string | number, lng: string | number): string {
  const norm = (s: string) => (s || "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  const coord = (v: string | number) => {
    const r = roundDecimalString(String(v), 6);
    return r ? r.slice(0, r.length - 2) : "";
  };
  return `${norm(venueName)}|${norm(name)}|${coord(lat)}|${coord(lng)}`;
}

export function normalizedVenue(venueName: string): string {
  return (venueName || "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
}

export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---------- geography ----------

const INDIA = { minLat: 6.5, maxLat: 37.5, minLng: 68, maxLng: 97.5 };

// Approximate bounding boxes [minLat, maxLat, minLng, maxLng]; used only for a warning
const STATE_BOUNDS: Record<string, [number, number, number, number]> = {
  "Andhra Pradesh": [12.6, 19.95, 76.7, 84.8],
  "Arunachal Pradesh": [26.6, 29.5, 91.5, 97.4],
  Assam: [24.1, 28.0, 89.7, 96.1],
  Bihar: [24.3, 27.6, 83.3, 88.3],
  Chhattisgarh: [17.8, 24.1, 80.2, 84.4],
  Goa: [14.9, 15.8, 73.6, 74.4],
  Gujarat: [20.1, 24.7, 68.1, 74.5],
  Haryana: [27.6, 30.95, 74.4, 77.6],
  "Himachal Pradesh": [30.4, 33.3, 75.5, 79.0],
  Jharkhand: [21.9, 25.4, 83.3, 87.9],
  Karnataka: [11.5, 18.5, 74.0, 78.6],
  Kerala: [8.2, 12.8, 74.8, 77.4],
  "Madhya Pradesh": [21.0, 26.9, 74.0, 82.8],
  Maharashtra: [15.6, 22.1, 72.6, 80.9],
  Manipur: [23.8, 25.7, 93.0, 94.8],
  Meghalaya: [25.0, 26.1, 89.8, 92.8],
  Mizoram: [21.9, 24.6, 92.2, 93.5],
  Nagaland: [25.2, 27.1, 93.3, 95.3],
  Odisha: [17.8, 22.6, 81.4, 87.5],
  Punjab: [29.5, 32.6, 73.8, 77.0],
  Rajasthan: [23.0, 30.2, 69.4, 78.3],
  Sikkim: [27.0, 28.2, 88.0, 88.95],
  "Tamil Nadu": [8.0, 13.6, 76.2, 80.4],
  Telangana: [15.8, 19.95, 77.2, 81.3],
  Tripura: [22.9, 24.6, 91.1, 92.4],
  "Uttar Pradesh": [23.8, 30.5, 77.0, 84.7],
  Uttarakhand: [28.7, 31.5, 77.5, 81.1],
  "West Bengal": [21.5, 27.3, 85.8, 89.9],
  "Andaman and Nicobar Islands": [6.7, 13.7, 92.2, 94.3],
  Chandigarh: [30.65, 30.8, 76.65, 76.85],
  "Dadra and Nagar Haveli and Daman and Diu": [20.3, 20.8, 70.8, 73.3],
  Delhi: [28.4, 28.9, 76.8, 77.35],
  "Jammu and Kashmir": [32.2, 35.1, 73.2, 76.8],
  Ladakh: [32.3, 36.0, 75.3, 80.4],
  Lakshadweep: [8.0, 12.4, 71.6, 74.0],
};

// First 2 pincode digits per state (India Post circles); used only for a warning
const PIN_PREFIXES: Record<string, number[]> = {
  Delhi: [11],
  Haryana: [12, 13],
  Punjab: [14, 15, 16],
  Chandigarh: [16],
  "Himachal Pradesh": [17],
  "Jammu and Kashmir": [18, 19],
  Ladakh: [19],
  "Uttar Pradesh": [20, 21, 22, 23, 24, 25, 26, 27, 28],
  Uttarakhand: [24, 26],
  Rajasthan: [30, 31, 32, 33, 34],
  Gujarat: [36, 37, 38, 39],
  "Dadra and Nagar Haveli and Daman and Diu": [39],
  Maharashtra: [40, 41, 42, 43, 44],
  Goa: [40],
  "Madhya Pradesh": [45, 46, 47, 48],
  Chhattisgarh: [49],
  Telangana: [50],
  "Andhra Pradesh": [51, 52, 53],
  Karnataka: [56, 57, 58, 59],
  "Tamil Nadu": [60, 61, 62, 63, 64],
  Puducherry: [53, 60, 67],
  Kerala: [67, 68, 69],
  Lakshadweep: [68],
  "West Bengal": [70, 71, 72, 73, 74],
  Sikkim: [73],
  "Andaman and Nicobar Islands": [74],
  Odisha: [75, 76, 77],
  Assam: [78],
  "Arunachal Pradesh": [79],
  Nagaland: [79],
  Manipur: [79],
  Mizoram: [79],
  Tripura: [79],
  Meghalaya: [79],
  Bihar: [80, 81, 82, 83, 84, 85],
  Jharkhand: [81, 82, 83],
};

// ---------- issues ----------

export interface ImportIssue {
  row: number;
  field: string; // field key, or "row"
  level: "error" | "warning";
  code: string;
  message: string;
  fix?: { label: string; set: Record<string, ImportCell> }; // one-click suggestion
}

export interface ImportContext {
  registry: MetricRegistry;
  venueType: string;
  cities: Record<string, string[]>; // state → cities (city master)
  // filled by the server
  db?: {
    existing: Record<string, { id: string; name: string; venueName: string }>; // dedupe key → saved screen
    drafts: Record<string, string>; // dedupe key → other open draft's file name
    nearby: Record<number, { id: string; name: string; venueName: string; meters: number }>; // row → closest saved screen at the same venue
  };
}

// Silent clean-ups: trim, canonical case for list values, times, Yes/No, resolution spacing.
// Returns a new values object; anything unrecognised is left as typed for the validator to flag.
export function normalizeValues(values: Record<string, ImportCell>, fields: ImportField[], ctx: Pick<ImportContext, "cities">): Record<string, ImportCell> {
  const out: Record<string, ImportCell> = { ...values };
  for (const f of fields) {
    const v = out[f.key];
    if (v === undefined) continue;
    if (f.kind === "multi") {
      const list = cellList(v);
      const fixed: string[] = [];
      for (const it of list) {
        const hit = f.options?.find((o) => o.toLowerCase() === it.toLowerCase()) ?? it;
        if (!fixed.includes(hit)) fixed.push(hit);
      }
      if (f.key === "customOperatingDays") fixed.sort((a, b) => WEEK_DAYS.indexOf(a as any) - WEEK_DAYS.indexOf(b as any));
      out[f.key] = fixed;
      continue;
    }
    let s = cellText(v).replace(/\s+/g, " ");
    if (f.kind === "select" && s) {
      const options = f.key === "city" ? ctx.cities[cellText(out.state)] || [] : f.options || [];
      s = options.find((o) => o.toLowerCase() === s.toLowerCase()) ?? s;
    } else if (f.kind === "time" && s) {
      const t = normalizeTime(s);
      if (t && t !== "24h") s = t;
    } else if (f.kind === "yesno" && s) {
      const b = parseYesNo(s);
      if (b !== null) s = b ? "Yes" : "No";
    } else if (f.kind === "resolution" && s) {
      s = s.replace(/\s*[x×X*]\s*/, "x");
    } else if (f.kind === "pincode") {
      s = s.replace(/\s+/g, "").replace(/\.0+$/, "");
    } else if ((f.kind === "int" || f.kind === "decimal") && s) {
      s = s.replace(/,/g, "");
    }
    out[f.key] = s;
  }
  // "24 hours" in opening time → 00:00–23:59
  if (normalizeTime(cellText(out.customOperatingHoursStart)) === "24h") {
    out.customOperatingHoursStart = "00:00";
    out.customOperatingHoursEnd = "23:59";
  }
  return out;
}

const INT_RE = /^-?\d+$/;
const NUM_RE = /^-?\d+(\.\d+)?$/;

// Every rule the plan lists. Errors block the import; warnings must be reviewed (warningsOk) first.
export function validateRows(rows: ImportRow[], ctx: ImportContext): ImportIssue[] {
  const fields = importFieldsFor(ctx.registry, ctx.venueType);
  const issues: ImportIssue[] = [];
  const keyRows = new Map<string, number[]>();

  for (const r of rows) {
    const v = r.values;
    const add = (field: string, level: ImportIssue["level"], code: string, message: string, fix?: ImportIssue["fix"]) =>
      issues.push({ row: r.row, field, level, code, message, fix });

    for (const f of fields) {
      const raw = v[f.key];
      if (isBlank(raw)) {
        if (f.required) add(f.key, "error", "required", f.kind === "multi" ? `${f.header}: mark at least one Yes` : `${f.header} is required`);
        continue;
      }
      const s = cellText(raw);
      if (f.metric) {
        const res = cleanMetricValue(f.metric, f.kind === "multi" ? cellList(raw) : f.kind === "yesno" ? (parseYesNo(raw) ?? s) : s);
        if (res.error) {
          const sug = f.kind === "select" && f.options ? closest(s, f.options) : null;
          add(f.key, "error", "metric", res.error, sug ? { label: sug, set: { [f.key]: sug } } : undefined);
        }
        continue;
      }
      switch (f.kind) {
        case "text": {
          const min = ["name", "venueName", "location"].includes(f.key) ? 3 : 0;
          const max = f.key === "description" ? 1000 : 120;
          if (s.length < min) add(f.key, "error", "short", `${f.header} needs at least ${min} characters`);
          else if (s.length > max) add(f.key, "error", "long", `${f.header} is longer than ${max} characters`);
          break;
        }
        case "int":
        case "number": {
          if (!INT_RE.test(s)) add(f.key, "error", "int", `${f.header} must be a whole number`);
          else {
            const x = parseInt(s, 10);
            if (f.min !== undefined && x < f.min) add(f.key, "error", "min", `${f.header} must be at least ${f.min}`);
            else if (f.max !== undefined && x > f.max) add(f.key, "error", "max", `${f.header} can't be more than ${f.max.toLocaleString("en-IN")}`);
          }
          break;
        }
        case "decimal":
          if (!NUM_RE.test(s)) add(f.key, "error", "number", `${f.header} must be a decimal number`);
          break;
        case "pincode":
          if (!/^[1-9]\d{5}$/.test(s)) add(f.key, "error", "pincode", "Pincode must be 6 digits (not starting with 0)");
          break;
        case "resolution":
          if (!/^\d{2,5}x\d{2,5}$/.test(s)) add(f.key, "error", "resolution", "Resolution must look like 1920x1080");
          break;
        case "time":
          if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) add(f.key, "error", "time", `${f.header} must be a time like 09:00`);
          break;
        case "yesno":
          if (parseYesNo(raw) === null) add(f.key, "error", "yesno", `${f.header} must be Yes or No`);
          break;
        case "multi": {
          for (const it of cellList(raw)) {
            if (!f.options?.includes(it)) {
              const sug = closest(it, f.options || []);
              add(f.key, "error", "option", `${f.header}: "${it}" is not an option`, sug ? { label: `${it} → ${sug}`, set: { [f.key]: cellList(raw).map((x) => (x === it ? sug : x)) } } : undefined);
            }
          }
          break;
        }
        case "select": {
          if (f.key === "city") break; // checked below with the state
          if (!f.options?.includes(s)) {
            const sug = closest(s, f.options || []);
            add(f.key, "error", "option", `"${s}" is not a valid ${f.header.toLowerCase()}`, sug ? { label: sug, set: { [f.key]: sug } } : undefined);
          }
          break;
        }
      }
    }

    // State ↔ city
    const state = cellText(v.state);
    const city = cellText(v.city);
    if (city && INDIAN_STATES.includes(state as any)) {
      const list = ctx.cities[state] || [];
      if (!list.includes(city)) {
        const alias = normalizeCityName(city);
        const viaAlias = list.find((c) => c.toLowerCase() === alias.toLowerCase());
        const sug = viaAlias ?? closest(city, list);
        const elsewhere = Object.entries(ctx.cities).find(([st, cs]) => st !== state && cs.some((c) => c.toLowerCase() === (viaAlias ?? city).toLowerCase()))?.[0];
        const msg = elsewhere && !sug ? `${city} is in ${elsewhere}, not ${state}` : `"${city}" is not a city in ${state}${sug ? ` — did you mean ${sug}?` : ". Add it in Settings → Cities if it's correct."}`;
        add("city", "error", "city", msg, sug ? { label: sug, set: { city: sug } } : elsewhere ? { label: `State → ${elsewhere}`, set: { state: elsewhere } } : undefined);
      }
    }

    // Pincode ↔ state (warning)
    const pin = cellText(v.pincode);
    if (/^[1-9]\d{5}$/.test(pin) && PIN_PREFIXES[state] && !PIN_PREFIXES[state].includes(parseInt(pin.slice(0, 2), 10))) {
      add("pincode", "warning", "pin_state", `Pincode ${pin} doesn't look like a ${state} pincode`);
    }

    // Coordinates
    const latS = cellText(v.latitude);
    const lngS = cellText(v.longitude);
    if (NUM_RE.test(latS) && NUM_RE.test(lngS)) {
      const lat = parseFloat(latS);
      const lng = parseFloat(lngS);
      const inIndia = (a: number, b: number) => a >= INDIA.minLat && a <= INDIA.maxLat && b >= INDIA.minLng && b <= INDIA.maxLng;
      if (lat === 0 || lng === 0) add("latitude", "error", "zero", "Latitude/longitude can't be 0");
      else if (!inIndia(lat, lng)) {
        if (inIndia(lng, lat)) add("latitude", "error", "swapped", "Latitude and longitude look swapped", { label: "Swap", set: { latitude: lngS, longitude: latS } });
        else add("latitude", "error", "outside", "This point is outside India");
      } else {
        const b = STATE_BOUNDS[state];
        const pad = 0.25;
        if (b && (lat < b[0] - pad || lat > b[1] + pad || lng < b[2] - pad || lng > b[3] + pad)) add("latitude", "warning", "state_area", `The pin is outside ${state}`);
        const decimals = (s: string) => (s.split(".")[1] || "").length;
        if (decimals(latS) < 4 || decimals(lngS) < 4) add("latitude", "warning", "precision", "Low precision — use at least 4 decimals (~11 m)");
      }
    }

    // Hours: both or neither; overnight is a warning
    const open = cellText(v.customOperatingHoursStart);
    const close = cellText(v.customOperatingHoursEnd);
    if (!!open !== !!close) add(open ? "customOperatingHoursEnd" : "customOperatingHoursStart", "error", "hours_pair", "Give both opening and closing time, or neither");
    else if (open && close && /^\d\d:\d\d$/.test(open) && /^\d\d:\d\d$/.test(close)) {
      if (close === open) add("customOperatingHoursEnd", "error", "hours_same", "Closing time can't equal opening time (use 00:00–23:59 for 24 hours)");
      else if (close < open) add("customOperatingHoursEnd", "warning", "overnight", `Runs overnight (${open} → ${close} next day)`);
    }

    // Slot vs loop
    const slot = parseInt(cellText(v.durationPerSlot), 10);
    const loop = parseInt(cellText(v.loopDuration), 10);
    if (slot > 0 && loop > 0 && loop < slot) add("loopDuration", "error", "loop_lt_slot", "Loop duration must be at least the ad slot duration");

    // Footfall sanity (warning)
    const footfall = parseInt(cellText(v.avgDailyFootfall), 10);
    if (footfall > 500_000) add("avgDailyFootfall", "warning", "footfall_high", "More than 5 lakh people a day — please double-check");

    // Duplicates
    if (latS && lngS && cellText(v.name) && cellText(v.venueName)) {
      const key = dedupeKey(cellText(v.venueName), cellText(v.name), latS, lngS);
      keyRows.set(key, [...(keyRows.get(key) || []), r.row]);
      const saved = ctx.db?.existing[key];
      if (saved) add("row", "error", "dup_saved", `Already exists: "${saved.name}" at ${saved.venueName}. Remove this row.`);
      const draft = ctx.db?.drafts[key];
      if (draft) add("row", "error", "dup_draft", `Same screen is in another open import draft (${draft}). Remove this row or discard that draft.`);
      const near = ctx.db?.nearby[r.row];
      if (!saved && near && !r.differentScreen) {
        add("row", "error", "near_dup", `A screen "${near.name}" already exists at ${near.venueName}, ${Math.round(near.meters)} m away. Remove this row, or tick "This is a different screen".`);
      }
    }
  }

  for (const [, list] of Array.from(keyRows.entries())) {
    if (list.length > 1) {
      for (const row of list) issues.push({ row, field: "row", level: "error", code: "dup_file", message: `Same screen appears more than once in this file (rows ${list.join(", ")})` });
    }
  }
  return issues;
}

export function summarize(rows: ImportRow[], issues: ImportIssue[]): { total: number; ok: number; errorRows: number; warningRows: number; blocking: number } {
  const errorRows = new Set(issues.filter((i) => i.level === "error").map((i) => i.row));
  const reviewed = new Set(rows.filter((r) => r.warningsOk).map((r) => r.row));
  const warningRows = new Set(issues.filter((i) => i.level === "warning" && !reviewed.has(i.row) && !errorRows.has(i.row)).map((i) => i.row));
  return { total: rows.length, ok: rows.length - errorRows.size - warningRows.size, errorRows: errorRows.size, warningRows: warningRows.size, blocking: errorRows.size + warningRows.size };
}

// ---------- row → screen ----------

export function calculatedValues(v: Record<string, ImportCell>) {
  const price = parseInt(cellText(v.pricePerDay), 10) || 0;
  const screens = Math.max(1, parseInt(cellText(v.numberOfScreens), 10) || 1);
  const slot = parseInt(cellText(v.durationPerSlot), 10) || 0;
  const loop = parseInt(cellText(v.loopDuration), 10) || 0;
  const open = cellText(v.customOperatingHoursStart);
  const close = cellText(v.customOperatingHoursEnd);
  return {
    bundlePricePerDay: price * screens,
    isMultiScreen: screens > 1,
    type: cellText(v.category),
    size: cellText(v.resolution),
    operationalHours: open && close ? JSON.stringify({ start: open, end: close }) : null,
    playbackSlotsPerHour: loop > 0 ? Math.floor(3600 / loop) : null,
    maxBrandsPerLoop: loop > 0 && slot > 0 ? Math.floor(loop / slot) : null,
  };
}

export function rowToScreen(
  r: ImportRow,
  ctx: Pick<ImportContext, "registry" | "venueType">,
  meta: { ownerId: string; host: string | null; status: string; importId: string }
): Record<string, unknown> {
  const v = r.values;
  const t = (k: string) => cellText(v[k]) || null;
  const int = (k: string) => (cellText(v[k]) ? parseInt(cellText(v[k]), 10) : null);
  const list = (k: string) => cellList(v[k]);
  const metrics: VenueMetrics = {};
  for (const def of metricsFor(ctx.registry, ctx.venueType)) {
    const raw = v[METRIC_PREFIX + def.key];
    const res = cleanMetricValue(def, def.kind === "multi" ? cellList(raw) : def.kind === "boolean" ? (parseYesNo(raw) ?? cellText(raw)) : cellText(raw));
    if (res.value !== undefined) metrics[def.key] = res.value;
  }
  const calc = calculatedValues(v);
  const hasHours = !!(t("customOperatingHoursStart") && t("customOperatingHoursEnd"));
  return {
    ownerId: meta.ownerId,
    host: meta.host,
    status: meta.status,
    ownedByAdmin: true,
    importId: meta.importId,
    name: t("name"),
    venueName: t("venueName"),
    location: t("location"),
    state: t("state"),
    city: t("city") ? normalizeCityName(t("city")!) : null,
    pincode: t("pincode"),
    latitude: t("latitude"),
    longitude: t("longitude"),
    category: t("category"),
    displayFormat: t("displayFormat"),
    resolution: t("resolution"),
    durationPerSlot: int("durationPerSlot"),
    loopDuration: int("loopDuration"),
    environmentType: t("environmentType"),
    visibility: t("visibility"),
    contentTypesSupported: list("contentTypesSupported"),
    customOperatingHoursStart: t("customOperatingHoursStart"),
    customOperatingHoursEnd: t("customOperatingHoursEnd"),
    operatingHoursPreset: hasHours ? "Custom" : null,
    customOperatingDays: list("customOperatingDays"),
    timeOfDayActivity: list("timeOfDayActivity"),
    trafficType: t("trafficType"),
    avgDailyFootfall: int("avgDailyFootfall"),
    avgDwellTime: int("avgDwellTime"),
    detailedAgeGroups: list("detailedAgeGroups"),
    genderOrientation: t("genderOrientation"),
    incomeLevel: t("incomeLevel"),
    occupationMix: list("occupationMix"),
    userIntent: list("userIntent"),
    userMood: list("userMood"),
    numberOfScreens: int("numberOfScreens") ?? 1,
    pricePerDay: int("pricePerDay"),
    bulkBookingMandatory: parseYesNo(v.bulkBookingMandatory) === true,
    minBookingDays: int("minBookingDays") ?? 1,
    description: t("description"),
    venueCategory: getVenueType(ctx.venueType)?.label ?? ctx.venueType,
    venueType: ctx.venueType,
    venueMetrics: metrics,
    ...calc,
  };
}
