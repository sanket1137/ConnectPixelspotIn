// Venue metrics: per-venue-type key/value facts stored in screens.venue_metrics (jsonb, filled keys only).
//
// Definitions are managed by admins (table venue_metric_definitions, Admin → Get template → Settings) and
// served to the app as a MetricRegistry. SEED_METRICS below is the starting list (seeded into the table by
// migrations/2026_10_venue_metrics_seed.sql) and the fallback before the definitions have loaded.
// All audience numbers are per day — prices are per day.

import { getVenueType } from "./venueTaxonomy";

export const METRIC_KINDS = ["number", "currency", "enum", "multi", "boolean", "text"] as const;
export type MetricKind = (typeof METRIC_KINDS)[number];
export const METRIC_KIND_LABELS: Record<MetricKind, string> = {
  number: "Number",
  currency: "₹ amount",
  enum: "Dropdown (pick one)",
  multi: "Multi-choice (pick many)",
  boolean: "Yes / No",
  text: "Text",
};
export type ImpactRole = "audience_size" | "affluence" | "dwell" | "frequency";

export interface MetricDef {
  key: string;
  label: string;
  kind: MetricKind;
  unit?: string | null; // shown after the value: "min", "sq ft", "%"
  help?: string | null;
  options?: string[]; // enum / multi values
  min?: number | null;
  max?: number | null;
  required?: boolean;
  showOnCard?: boolean; // advertiser card shows up to 2
  role?: ImpactRole | null;
  sortOrder: number;
  active: boolean; // hidden metrics keep their data but are never asked or shown
}

// venue type slug → its metric definitions
export type MetricRegistry = Record<string, MetricDef[]>;
export type MetricValue = number | string | boolean | string[];
export type VenueMetrics = Record<string, MetricValue>;

// ---------- seed list (the phase-5 list, per day) ----------
type SeedDef = Omit<MetricDef, "sortOrder" | "active">;
const n = (key: string, label: string, extra: Partial<SeedDef> = {}): SeedDef => ({ key, label, kind: "number", min: 0, ...extra });
const inr = (key: string, label: string, extra: Partial<SeedDef> = {}): SeedDef => ({ key, label, kind: "currency", min: 0, ...extra });
const pick = (key: string, label: string, options: string[], extra: Partial<SeedDef> = {}): SeedDef => ({ key, label, kind: "enum", options, ...extra });
const text = (key: string, label: string, extra: Partial<SeedDef> = {}): SeedDef => ({ key, label, kind: "text", ...extra });

const CINEMA_TIERS = ["Silver", "Gold", "Platinum", "Icon", "Luxe", "Director's Cut", "Insignia", "7 Star"];
const AGE_BANDS = ["Kids (under 12)", "Teens (13-17)", "18-24", "25-34", "35-44", "45+", "All ages"];
const GENDER_MIX = ["Mostly women", "Mostly men", "Mixed"];
const GRADES = ["A", "B", "C"];

const FOOD: SeedDef[] = [
  n("covers_per_day", "Covers per day", { required: true, showOnCard: true, role: "audience_size", max: 50_000, help: "Guests served on a typical day" }),
  inr("avg_bill", "Average bill", { showOnCard: true, role: "affluence", max: 100_000, help: "Per table / per guest, in ₹" }),
  n("seating", "Seats", { max: 5_000 }),
  text("meal_times", "Busy meal times", { help: "e.g. Breakfast, Lunch, Dinner, Late night" }),
];
const WORKPLACE: SeedDef[] = [
  n("employees", "Employees", { required: true, showOnCard: true, role: "audience_size", max: 500_000, help: "People working in the building on a typical day" }),
  n("companies", "Companies / tenants", { showOnCard: true, max: 10_000 }),
  pick("building_grade", "Building grade", GRADES, { role: "affluence" }),
  n("floors", "Floors", { max: 200 }),
  n("lifts", "Lifts", { max: 500 }),
  pick("placement", "Screen placement", ["Lift lobby", "Inside lift", "Reception", "Cafeteria", "Common area"]),
];
const ROADSIDE: SeedDef[] = [
  n("vehicles_per_day", "Vehicles per day", { required: true, showOnCard: true, role: "audience_size", max: 2_000_000 }),
  n("width_ft", "Width", { unit: "ft", showOnCard: true, max: 500 }),
  n("height_ft", "Height", { unit: "ft", max: 500 }),
  pick("lighting", "Lighting", ["LED", "Backlit", "Frontlit", "Unlit"]),
  n("visible_from_m", "Visible from", { unit: "m", max: 5_000 }),
  text("facing", "Facing", { help: "e.g. Towards MG Road / northbound traffic" }),
  n("road_speed_kmph", "Typical traffic speed", { unit: "km/h", role: "dwell", max: 150 }),
];
const STATION: SeedDef[] = [
  n("passengers_per_day", "Passengers per day", { required: true, showOnCard: true, role: "audience_size", max: 5_000_000 }),
  n("platforms_or_terminals", "Platforms / terminals", { showOnCard: true, max: 100 }),
  n("trains_or_flights_per_day", "Trains / flights per day", { role: "frequency", max: 10_000 }),
];

export const SEED_METRICS: Record<string, SeedDef[]> = {
  apartment: [
    n("flats", "Flats", { required: true, showOnCard: true, role: "audience_size", max: 50_000, help: "Occupied homes in the society" }),
    inr("avg_flat_value", "Average flat value", { showOnCard: true, role: "affluence", max: 1_000_000_000, help: "Typical flat price in ₹ — shows how affluent residents are" }),
    n("residents", "Residents", { role: "audience_size", max: 200_000, help: "Leave blank and we estimate 3.5 × flats" }),
    n("towers", "Towers", { max: 500 }),
    n("lifts", "Lifts", { max: 2_000 }),
    n("possession_year", "Possession year", { min: 1950, max: 2100 }),
    n("occupancy_pct", "Occupancy", { unit: "%", max: 100 }),
  ],
  villa_community: [
    n("flats", "Villas / homes", { required: true, showOnCard: true, role: "audience_size", max: 20_000 }),
    inr("avg_flat_value", "Average home value", { showOnCard: true, role: "affluence", max: 5_000_000_000 }),
    n("residents", "Residents", { role: "audience_size", max: 100_000, help: "Leave blank and we estimate 3.5 × homes" }),
    n("possession_year", "Possession year", { min: 1950, max: 2100 }),
  ],
  cinema_lobby: [
    n("audis", "Audis at the venue", { required: true, showOnCard: true, max: 50 }),
    pick("cinema_tier", "Cinema tier", CINEMA_TIERS, { showOnCard: true, role: "affluence" }),
    n("shows_per_day", "Shows per day (whole venue)", { role: "frequency", max: 500 }),
    inr("avg_ticket_price", "Average ticket price", { role: "affluence", max: 10_000 }),
  ],
  cinema_audi: [
    n("seating_capacity", "Seats", { required: true, showOnCard: true, role: "audience_size", max: 2_000 }),
    pick("cinema_tier", "Cinema tier", CINEMA_TIERS, { showOnCard: true, role: "affluence" }),
    n("shows_per_day", "Shows per day", { role: "frequency", max: 12 }),
    n("daily_admits", "Daily admits", { role: "audience_size", max: 15_000 }),
    pick("audi_format", "Audi format", ["Standard", "Recliner", "IMAX", "4DX", "ScreenX", "Gold", "Luxe", "Playhouse"]),
  ],
  mall: [
    n("daily_footfall", "Daily footfall", { required: true, showOnCard: true, role: "audience_size", max: 2_000_000 }),
    n("stores", "Stores", { showOnCard: true, max: 2_000 }),
    n("area_sqft", "Mall size", { unit: "sq ft", max: 10_000_000 }),
    text("anchor_brands", "Anchor brands", { help: "e.g. Lulu Hypermarket, PVR, Lifestyle" }),
    pick("placement", "Screen placement", ["Atrium", "Food court", "Entrance", "Parking", "Corridor", "Escalator", "Cinema level"]),
    pick("mall_grade", "Mall grade", GRADES, { role: "affluence" }),
  ],
  supermarket: [
    n("bills_per_day", "Bills per day", { required: true, showOnCard: true, role: "audience_size", max: 100_000 }),
    inr("avg_bill_value", "Average bill", { showOnCard: true, role: "affluence", max: 100_000 }),
    n("store_size_sqft", "Store size", { unit: "sq ft", max: 1_000_000 }),
    n("screens_per_store", "Screens in the store", { max: 200 }),
    pick("placement", "Screen placement", ["Checkout", "Aisle", "Entrance", "Billing queue"]),
  ],
  retail_store: [
    n("bills_per_day", "Bills per day", { required: true, showOnCard: true, role: "audience_size", max: 50_000 }),
    inr("avg_bill_value", "Average bill", { showOnCard: true, role: "affluence", max: 1_000_000 }),
    n("store_size_sqft", "Store size", { unit: "sq ft", max: 500_000 }),
    pick("placement", "Screen placement", ["Checkout", "Aisle", "Entrance", "Window"]),
  ],
  auto_care: [
    n("vehicles_per_day", "Vehicles serviced per day", { required: true, showOnCard: true, role: "audience_size", max: 5_000 }),
    inr("avg_ticket", "Average ticket", { showOnCard: true, role: "affluence", max: 500_000 }),
    n("avg_service_min", "Average wait", { unit: "min", role: "dwell", max: 600 }),
  ],
  restaurant: FOOD,
  cafe: FOOD,
  bar_lounge: FOOD,
  bakery_dessert: FOOD,
  hotel: [
    n("rooms", "Rooms", { required: true, showOnCard: true, max: 5_000 }),
    pick("star_rating", "Star rating", ["3", "4", "5"], { showOnCard: true, role: "affluence" }),
    n("occupancy_pct", "Occupancy", { unit: "%", max: 100 }),
    inr("avg_room_rate", "Average room rate", { role: "affluence", max: 500_000 }),
    pick("placement", "Screen placement", ["Lobby", "Lift", "Restaurant", "Rooms", "Banquet"]),
  ],
  event_venue: [
    n("events_per_month", "Events per month", { required: true, showOnCard: true, role: "frequency", max: 500 }),
    n("avg_guests", "Average guests per event", { showOnCard: true, role: "audience_size", max: 50_000 }),
  ],
  corporate_office: WORKPLACE,
  tech_park: WORKPLACE,
  coworking: WORKPLACE,
  commercial_building: WORKPLACE,
  roadside_billboard: ROADSIDE,
  highway: ROADSIDE,
  junction: ROADSIDE,
  fuel_station: [
    n("vehicles_per_day", "Vehicles per day", { required: true, showOnCard: true, role: "audience_size", max: 50_000 }),
    n("pumps", "Fuel pumps", { showOnCard: true, max: 100 }),
  ],
  parking: [
    n("vehicles_per_day", "Vehicles per day", { required: true, showOnCard: true, role: "audience_size", max: 200_000 }),
    n("parking_slots", "Parking slots", { showOnCard: true, max: 50_000 }),
    n("avg_parked_min", "Average time parked", { unit: "min", role: "dwell", max: 1_440 }),
  ],
  bus_station: [
    n("passengers_per_day", "Passengers per day", { required: true, showOnCard: true, role: "audience_size", max: 2_000_000 }),
    n("departures_per_day", "Bus departures per day", { showOnCard: true, role: "frequency", max: 20_000 }),
    n("routes", "Routes", { max: 5_000 }),
    n("avg_wait_min", "Average wait", { unit: "min", role: "dwell", max: 240 }),
  ],
  bus_stop: [
    n("passengers_per_day", "Passengers per day", { required: true, showOnCard: true, role: "audience_size", max: 200_000 }),
    n("departures_per_day", "Buses per day", { showOnCard: true, role: "frequency", max: 5_000 }),
    n("routes", "Routes", { max: 500 }),
    n("avg_wait_min", "Average wait", { unit: "min", role: "dwell", max: 120 }),
  ],
  railway_station: STATION,
  metro: STATION,
  airport: STATION,
  transit_hub: STATION,
  train_onboard: [
    n("passengers_per_trip", "Passengers per trip", { required: true, showOnCard: true, role: "audience_size", max: 5_000 }),
    n("trips_per_day", "Trips per day", { showOnCard: true, role: "frequency", max: 100 }),
    n("coaches", "Coaches", { max: 40 }),
    n("avg_journey_min", "Average journey", { unit: "min", role: "dwell", max: 3_000 }),
  ],
  salon_spa: [
    n("clients_per_day", "Clients per day", { required: true, showOnCard: true, role: "audience_size", max: 5_000 }),
    inr("avg_ticket", "Average ticket", { showOnCard: true, role: "affluence", max: 500_000 }),
    n("avg_service_min", "Average service time", { unit: "min", role: "dwell", max: 600 }),
    pick("gender_mix", "Audience", GENDER_MIX),
  ],
  gym: [
    n("active_members", "Active members", { required: true, showOnCard: true, role: "audience_size", max: 50_000 }),
    inr("monthly_fee", "Monthly fee", { showOnCard: true, role: "affluence", max: 100_000 }),
    n("session_min", "Average session", { unit: "min", role: "dwell", max: 600 }),
    text("peak_hours", "Peak hours", { help: "e.g. 6–9 am, 6–10 pm" }),
    pick("age_band", "Main age group", AGE_BANDS),
  ],
  clinic: [
    n("patients_per_day", "Patients per day", { required: true, showOnCard: true, role: "audience_size", max: 10_000 }),
    n("avg_wait_min", "Average wait", { unit: "min", showOnCard: true, role: "dwell", max: 600 }),
    text("specialty", "Specialty", { help: "e.g. Dental, Dermatology, Pediatrics" }),
  ],
  hospital: [
    n("patients_per_day", "Patients per day", { required: true, showOnCard: true, role: "audience_size", max: 100_000 }),
    n("avg_wait_min", "Average wait", { unit: "min", showOnCard: true, role: "dwell", max: 600 }),
    n("beds", "Beds", { max: 10_000 }),
    text("specialty", "Specialties"),
  ],
  play_area: [
    n("kid_visits_per_day", "Kid visits per day", { required: true, showOnCard: true, role: "audience_size", max: 20_000 }),
    n("parent_dwell_min", "Parent time spent", { unit: "min", showOnCard: true, role: "dwell", max: 600 }),
    pick("kids_age_band", "Kids' age group", ["Under 5", "5-8", "9-12", "All ages"]),
  ],
  sports_venue: [
    n("capacity", "Capacity", { showOnCard: true, role: "audience_size", max: 200_000 }),
    n("events_per_month", "Events per month", { showOnCard: true, role: "frequency", max: 500 }),
    n("daily_visitors", "Daily visitors", { role: "audience_size", max: 200_000 }),
  ],
  academy: [
    n("students_enrolled", "Students enrolled", { required: true, showOnCard: true, role: "audience_size", max: 100_000 }),
    inr("monthly_fee", "Monthly fee", { showOnCard: true, role: "affluence", max: 1_000_000 }),
    n("sessions_per_day", "Sessions per day", { role: "frequency", max: 100 }),
    pick("age_band", "Main age group", AGE_BANDS),
  ],
  school_college: [
    n("students_enrolled", "Students enrolled", { required: true, showOnCard: true, role: "audience_size", max: 200_000 }),
    inr("annual_fee", "Annual fee", { showOnCard: true, role: "affluence", max: 10_000_000 }),
    pick("age_band", "Main age group", AGE_BANDS),
  ],
  standee_network: [
    n("outlets", "Outlets", { required: true, showOnCard: true, max: 100_000 }),
    text("outlet_categories", "Outlet categories", { showOnCard: true, help: "e.g. Pharmacies, Grocery, Salons" }),
    text("print_size", "Standee size"),
    pick("refresh_cycle", "Creative refresh", ["Weekly", "Fortnightly", "Monthly"]),
  ],
};

export function seedRegistry(): MetricRegistry {
  const out: MetricRegistry = {};
  for (const [type, defs] of Object.entries(SEED_METRICS)) {
    out[type] = defs.map((d, i) => ({ ...d, options: d.options ? [...d.options] : undefined, sortOrder: (i + 1) * 10, active: true }));
  }
  return out;
}

// Active definitions for a venue type, in display / column order
export function metricsFor(registry: MetricRegistry, venueType: string | null | undefined, opts: { includeHidden?: boolean } = {}): MetricDef[] {
  const defs = (venueType && registry[venueType]) || [];
  return defs.filter((d) => opts.includeHidden || d.active).sort((a, b) => a.sortOrder - b.sortOrder);
}

// "Avg flat value (₹)" → "avg_flat_value"
export function metricKeyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/₹/g, " ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
}

// ---------- formatting ----------

export function formatIndianCompact(x: number): string {
  if (x >= 10_000_000) return `${(x / 10_000_000).toFixed(1).replace(/\.0$/, "")} Cr`;
  if (x >= 100_000) return `${(x / 100_000).toFixed(1).replace(/\.0$/, "")} L`;
  return x.toLocaleString("en-IN");
}

export function formatMetricValue(def: MetricDef, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (def.kind === "boolean") return value === true || value === "true" ? "Yes" : value === false || value === "false" ? "No" : null;
  if (def.kind === "multi") {
    const list = Array.isArray(value) ? value.map(String).filter(Boolean) : String(value).split(",").map((s) => s.trim()).filter(Boolean);
    return list.length ? list.join(", ") : null;
  }
  if (def.kind === "number" || def.kind === "currency") {
    const x = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(x) || x <= 0) return null; // zero / empty is "unknown", never shown
    const base = def.kind === "currency" ? `₹${formatIndianCompact(x)}` : formatIndianCompact(x);
    return def.unit ? `${base}${def.unit === "%" ? "%" : ` ${def.unit}`}` : base;
  }
  return String(value).trim() || null;
}

// ---------- validation (form, server, import) ----------

const YES = new Set(["yes", "y", "true", "1"]);
const NO = new Set(["no", "n", "false", "0"]);

// "85L", "1.2 Cr", "1,20,00,000", "₹ 4,500" → number; null when not a number
export function parseIndianNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const s = String(raw ?? "").trim().toLowerCase().replace(/₹|rs\.?|inr/g, "").replace(/,/g, "").trim();
  if (!s) return null;
  const m = s.match(/^(-?\d+(?:\.\d+)?)\s*(cr|crore|crores|l|lac|lakh|lakhs|k)?$/);
  if (!m) return null;
  const base = parseFloat(m[1]);
  const mult = m[2]?.startsWith("c") ? 10_000_000 : m[2]?.startsWith("l") ? 100_000 : m[2] === "k" ? 1_000 : 1;
  return base * mult;
}

// One value against its definition → cleaned value, or an error message
export function cleanMetricValue(def: MetricDef, raw: unknown): { value?: MetricValue; error?: string } {
  if (raw === undefined || raw === null || raw === "" || (Array.isArray(raw) && raw.length === 0)) return {};
  if (def.kind === "number" || def.kind === "currency") {
    const x = parseIndianNumber(raw);
    if (x === null) return { error: `${def.label} must be a number` };
    if (def.min != null && x < def.min) return { error: `${def.label} can't be below ${def.min}` };
    if (def.max != null && x > def.max) return { error: `${def.label} looks too high (max ${Number(def.max).toLocaleString("en-IN")})` };
    return { value: x };
  }
  if (def.kind === "enum") {
    const s = String(raw).trim();
    const hit = (def.options || []).find((o) => o.toLowerCase() === s.toLowerCase());
    return hit ? { value: hit } : { error: `${def.label} must be one of: ${(def.options || []).join(", ")}` };
  }
  if (def.kind === "multi") {
    const items = (Array.isArray(raw) ? raw : String(raw).split(",")).map((s) => String(s).trim()).filter(Boolean);
    const out: string[] = [];
    for (const it of items) {
      const hit = (def.options || []).find((o) => o.toLowerCase() === it.toLowerCase());
      if (!hit) return { error: `${def.label}: "${it}" is not one of ${(def.options || []).join(", ")}` };
      if (!out.includes(hit)) out.push(hit);
    }
    return out.length ? { value: out } : {};
  }
  if (def.kind === "boolean") {
    if (raw === true || raw === false) return { value: raw };
    const s = String(raw).trim().toLowerCase();
    if (YES.has(s)) return { value: true };
    if (NO.has(s)) return { value: false };
    return { error: `${def.label} must be Yes or No` };
  }
  const s = String(raw).trim().slice(0, 300);
  return s ? { value: s } : {};
}

// Cleans submitted metrics for a venue type. Keys this type doesn't ask for (hidden, or from another venue
// type) are kept from `existing` untouched, so hiding a metric or switching type never loses data.
export function validateVenueMetrics(
  registry: MetricRegistry,
  venueType: string | null | undefined,
  input: unknown,
  existing: VenueMetrics = {}
): { value: VenueMetrics; errors: string[] } {
  const defs = metricsFor(registry, venueType);
  const asked = new Set(defs.map((d) => d.key));
  const value: VenueMetrics = {};
  for (const [k, v] of Object.entries(existing || {})) if (!asked.has(k)) value[k] = v;
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { value, errors };
  for (const def of defs) {
    const res = cleanMetricValue(def, (input as Record<string, unknown>)[def.key]);
    if (res.error) errors.push(res.error);
    else if (res.value !== undefined) value[def.key] = res.value;
  }
  return { value, errors };
}

// ---------- derived metrics (formulas approved earlier; shown only when every input exists) ----------

export const IMPACT_CONFIG = {
  residentsPerFlat: 3.5,
  flatValueBands: [
    { upTo: 5_000_000, tier: "Mid-market" },
    { upTo: 10_000_000, tier: "Upper-mid" },
    { upTo: 25_000_000, tier: "Premium" },
    { upTo: Infinity, tier: "Luxury" },
  ],
  cinemaTierAffluence: { Silver: "Mid-market", Gold: "Upper-mid", Platinum: "Premium", Icon: "Luxury", Luxe: "Luxury", "Director's Cut": "Luxury", Insignia: "Luxury", "7 Star": "Luxury" } as Record<string, string>,
  hotelStarAffluence: { "3": "Mid-market", "4": "Premium", "5": "Luxury" } as Record<string, string>,
};

export interface DerivedMetric {
  key: string;
  label: string;
  value: string;
  estimate: true;
  formula: string;
}

const pos = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) && x > 0 ? x : null;
};

export function affluenceTier(venueType: string | null | undefined, m: VenueMetrics): string | null {
  const flatValue = pos(m.avg_flat_value);
  if (flatValue) return IMPACT_CONFIG.flatValueBands.find((b) => flatValue <= b.upTo)!.tier;
  if (typeof m.cinema_tier === "string") return IMPACT_CONFIG.cinemaTierAffluence[m.cinema_tier] ?? null;
  if (venueType === "hotel" && m.star_rating !== undefined) return IMPACT_CONFIG.hotelStarAffluence[String(m.star_rating)] ?? null;
  return null;
}

export function deriveMetrics(venueType: string | null | undefined, m: VenueMetrics): DerivedMetric[] {
  const out: DerivedMetric[] = [];
  const flats = pos(m.flats);
  if (flats && !pos(m.residents)) {
    out.push({ key: "est_residents", label: "Residents", value: formatIndianCompact(Math.round(flats * IMPACT_CONFIG.residentsPerFlat)), estimate: true, formula: `Flats × ${IMPACT_CONFIG.residentsPerFlat} people per home` });
  }
  const tier = affluenceTier(venueType, m);
  if (tier) {
    const basis = pos(m.avg_flat_value) ? "average flat value" : typeof m.cinema_tier === "string" ? "cinema tier" : "hotel star rating";
    out.push({ key: "affluence", label: "Affluence", value: tier, estimate: true, formula: `From ${basis}` });
  }
  const seats = pos(m.seating_capacity);
  const shows = pos(m.shows_per_day);
  if (seats && shows) {
    out.push({ key: "seat_capacity", label: "Daily seat capacity", value: formatIndianCompact(Math.round(seats * shows)), estimate: true, formula: "Seats × shows per day (capacity, not attendance)" });
  }
  return out;
}

// ---------- facts for cards and details ----------

export interface MetricFact {
  key: string;
  label: string;
  value: string;
  estimate?: boolean;
  formula?: string;
}

// Filled active metrics (card ones first), then derived ones. Hidden or empty metrics never appear.
export function metricFacts(registry: MetricRegistry, venueType: string | null | undefined, m: VenueMetrics | null | undefined): MetricFact[] {
  if (!m) return [];
  const filled = metricsFor(registry, venueType)
    .map((d) => ({ d, v: formatMetricValue(d, m[d.key]) }))
    .filter((x): x is { d: MetricDef; v: string } => !!x.v)
    .sort((a, b) => Number(!!b.d.showOnCard) - Number(!!a.d.showOnCard) || a.d.sortOrder - b.d.sortOrder);
  const facts: MetricFact[] = filled.map(({ d, v }) => ({ key: d.key, label: d.label, value: v }));
  for (const x of deriveMetrics(venueType, m)) facts.push({ key: x.key, label: x.label, value: x.value, estimate: true, formula: x.formula });
  return facts;
}

// Card line: up to 2 facts — filled "show on card" metrics first, then derived ones
export function cardMetricFacts(registry: MetricRegistry, venueType: string | null | undefined, m: VenueMetrics | null | undefined): MetricFact[] {
  const defs = metricsFor(registry, venueType);
  const onCard = (f: MetricFact) => f.estimate || !!defs.find((d) => d.key === f.key)?.showOnCard;
  return metricFacts(registry, venueType, m).filter(onCard).slice(0, 2);
}

export function hasAudienceMetric(registry: MetricRegistry, venueType: string | null | undefined, m: VenueMetrics): boolean {
  return metricsFor(registry, venueType).some((d) => d.role === "audience_size" && m[d.key] !== undefined);
}

export function venueTypeLabel(venueType: string | null | undefined): string | null {
  return getVenueType(venueType)?.label ?? null;
}
