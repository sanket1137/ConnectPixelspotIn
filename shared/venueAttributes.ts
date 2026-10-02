// Venue-specific audience inputs per venue type (phase 5).
//
// Definitions live here (typed config, versioned with the code) and drive: the registration form
// fields, server validation, card/detail facts, and the derived "Est." metrics. Values are stored
// per screen in screens.venue_attributes (jsonb, keyed by `key`); owner-defined extras go to
// screens.custom_attributes as [{ label, value, unit }].

import { getVenueType } from "./venueTaxonomy";

export type AttributeType = "number" | "currency" | "enum" | "text" | "boolean";
export type ImpactRole = "audience_size" | "affluence" | "dwell" | "frequency";

export interface AttributeDef {
  key: string;
  label: string;
  type: AttributeType;
  unit?: string; // shown after the value: "min", "sq ft", "ft"
  help?: string;
  required?: boolean;
  cardPriority?: number; // lower shows first on cards; undefined = detail only
  role?: ImpactRole;
  options?: string[]; // enum values
  min?: number;
  max?: number;
}

export type VenueAttributes = Record<string, number | string | boolean>;
export interface CustomAttribute {
  label: string;
  value: string;
  unit?: string;
}

// ---------- shared field building blocks ----------
const n = (key: string, label: string, extra: Partial<AttributeDef> = {}): AttributeDef => ({ key, label, type: "number", min: 0, ...extra });
const inr = (key: string, label: string, extra: Partial<AttributeDef> = {}): AttributeDef => ({ key, label, type: "currency", min: 0, ...extra });
const pick = (key: string, label: string, options: string[], extra: Partial<AttributeDef> = {}): AttributeDef => ({ key, label, type: "enum", options, ...extra });
const text = (key: string, label: string, extra: Partial<AttributeDef> = {}): AttributeDef => ({ key, label, type: "text", ...extra });

const CINEMA_TIERS = ["Silver", "Gold", "Platinum", "Icon", "Luxe", "Director's Cut", "Insignia", "7 Star"];
const AGE_BANDS = ["Kids (under 12)", "Teens (13-17)", "18-24", "25-34", "35-44", "45+", "All ages"];
const GENDER_MIX = ["Mostly women", "Mostly men", "Mixed"];
const GRADES = ["A", "B", "C"];

const FOOD: AttributeDef[] = [
  n("covers_per_day", "Covers per day", { required: true, cardPriority: 1, role: "audience_size", max: 50_000, help: "Guests served on a typical day" }),
  inr("avg_bill", "Average bill", { cardPriority: 2, role: "affluence", max: 100_000, help: "Per table / per guest, in ₹" }),
  n("seating", "Seats", { max: 5_000 }),
  text("meal_times", "Busy meal times", { help: "e.g. Breakfast, Lunch, Dinner, Late night" }),
];

const WORKPLACE: AttributeDef[] = [
  n("employees", "Employees", { required: true, cardPriority: 1, role: "audience_size", max: 500_000, help: "People working in the building on a typical day" }),
  n("companies", "Companies / tenants", { cardPriority: 2, max: 10_000 }),
  pick("building_grade", "Building grade", GRADES, { role: "affluence" }),
  n("floors", "Floors", { max: 200 }),
  n("lifts", "Lifts", { max: 500 }),
  pick("placement", "Screen placement", ["Lift lobby", "Inside lift", "Reception", "Cafeteria", "Common area"]),
];

const ROADSIDE: AttributeDef[] = [
  n("vehicles_per_day", "Vehicles per day", { required: true, cardPriority: 1, role: "audience_size", max: 2_000_000 }),
  n("width_ft", "Width", { unit: "ft", cardPriority: 2, max: 500 }),
  n("height_ft", "Height", { unit: "ft", max: 500 }),
  pick("lighting", "Lighting", ["LED", "Backlit", "Frontlit", "Unlit"]),
  n("visible_from_m", "Visible from", { unit: "m", max: 5_000 }),
  text("facing", "Facing", { help: "e.g. Towards MG Road / northbound traffic" }),
  n("road_speed_kmph", "Typical traffic speed", { unit: "km/h", role: "dwell", max: 150 }),
];

const STATION: AttributeDef[] = [
  n("passengers_per_day", "Passengers per day", { required: true, cardPriority: 1, role: "audience_size", max: 5_000_000 }),
  n("platforms_or_terminals", "Platforms / terminals", { cardPriority: 2, max: 100 }),
  n("trains_or_flights_per_day", "Trains / flights per day", { role: "frequency", max: 10_000 }),
];

export const VENUE_ATTRIBUTES: Record<string, AttributeDef[]> = {
  // Residential
  apartment: [
    n("flats", "Flats", { required: true, cardPriority: 1, role: "audience_size", max: 50_000, help: "Occupied homes in the society" }),
    inr("avg_flat_value", "Average flat value", { cardPriority: 2, role: "affluence", max: 1_000_000_000, help: "Typical flat price in ₹ — shows how affluent residents are" }),
    n("residents", "Residents", { role: "audience_size", max: 200_000, help: "Leave blank and we estimate 3.5 × flats" }),
    n("towers", "Towers", { max: 500 }),
    n("lifts", "Lifts", { max: 2_000 }),
    n("possession_year", "Possession year", { min: 1950, max: 2100 }),
    n("occupancy_pct", "Occupancy", { unit: "%", max: 100 }),
  ],
  villa_community: [
    n("flats", "Villas / homes", { required: true, cardPriority: 1, role: "audience_size", max: 20_000 }),
    inr("avg_flat_value", "Average home value", { cardPriority: 2, role: "affluence", max: 5_000_000_000 }),
    n("residents", "Residents", { role: "audience_size", max: 100_000, help: "Leave blank and we estimate 3.5 × homes" }),
    n("possession_year", "Possession year", { min: 1950, max: 2100 }),
  ],

  // Cinema
  cinema_lobby: [
    n("audis", "Audis at the venue", { required: true, cardPriority: 1, max: 50 }),
    n("shows_per_day", "Shows per day (whole venue)", { cardPriority: 3, role: "frequency", max: 500 }),
    pick("cinema_tier", "Cinema tier", CINEMA_TIERS, { cardPriority: 2, role: "affluence" }),
    inr("avg_ticket_price", "Average ticket price", { role: "affluence", max: 10_000 }),
  ],
  cinema_audi: [
    n("seating_capacity", "Seats", { required: true, cardPriority: 1, role: "audience_size", max: 2_000 }),
    n("shows_per_day", "Shows per day", { cardPriority: 3, role: "frequency", max: 12 }),
    pick("cinema_tier", "Cinema tier", CINEMA_TIERS, { cardPriority: 2, role: "affluence" }),
    n("weekly_admits", "Weekly admits", { role: "audience_size", max: 100_000 }),
    pick("audi_format", "Audi format", ["Standard", "Recliner", "IMAX", "4DX", "ScreenX", "Gold", "Luxe", "Playhouse"]),
  ],

  // Retail & Malls
  mall: [
    n("monthly_footfall", "Monthly footfall", { required: true, cardPriority: 1, role: "audience_size", max: 50_000_000 }),
    n("stores", "Stores", { cardPriority: 2, max: 2_000 }),
    n("area_sqft", "Mall size", { unit: "sq ft", max: 10_000_000 }),
    text("anchor_brands", "Anchor brands", { help: "e.g. Lulu Hypermarket, PVR, Lifestyle" }),
    pick("placement", "Screen placement", ["Atrium", "Food court", "Entrance", "Parking", "Corridor", "Escalator", "Cinema level"]),
    pick("mall_grade", "Mall grade", GRADES, { role: "affluence" }),
  ],
  supermarket: [
    n("bills_per_day", "Bills per day", { required: true, cardPriority: 1, role: "audience_size", max: 100_000 }),
    inr("avg_bill_value", "Average bill", { cardPriority: 2, role: "affluence", max: 100_000 }),
    n("store_size_sqft", "Store size", { unit: "sq ft", max: 1_000_000 }),
    n("screens_per_store", "Screens in the store", { max: 200 }),
    pick("placement", "Screen placement", ["Checkout", "Aisle", "Entrance", "Billing queue"]),
  ],
  retail_store: [
    n("bills_per_day", "Bills per day", { required: true, cardPriority: 1, role: "audience_size", max: 50_000 }),
    inr("avg_bill_value", "Average bill", { cardPriority: 2, role: "affluence", max: 1_000_000 }),
    n("store_size_sqft", "Store size", { unit: "sq ft", max: 500_000 }),
    pick("placement", "Screen placement", ["Checkout", "Aisle", "Entrance", "Window"]),
  ],
  auto_care: [
    n("vehicles_per_day", "Vehicles serviced per day", { required: true, cardPriority: 1, role: "audience_size", max: 5_000 }),
    inr("avg_ticket", "Average ticket", { cardPriority: 2, role: "affluence", max: 500_000 }),
    n("avg_service_min", "Average wait", { unit: "min", role: "dwell", max: 600 }),
  ],

  // Food & Drink
  restaurant: FOOD,
  cafe: FOOD,
  bar_lounge: FOOD,
  bakery_dessert: FOOD,
  hotel: [
    n("rooms", "Rooms", { required: true, cardPriority: 1, max: 5_000 }),
    pick("star_rating", "Star rating", ["3", "4", "5"], { cardPriority: 2, role: "affluence" }),
    n("occupancy_pct", "Occupancy", { unit: "%", max: 100 }),
    inr("avg_room_rate", "Average room rate", { role: "affluence", max: 500_000 }),
    pick("placement", "Screen placement", ["Lobby", "Lift", "Restaurant", "Rooms", "Banquet"]),
  ],
  event_venue: [
    n("events_per_month", "Events per month", { required: true, cardPriority: 1, role: "frequency", max: 500 }),
    n("avg_guests", "Average guests per event", { cardPriority: 2, role: "audience_size", max: 50_000 }),
  ],

  // Workplace
  corporate_office: WORKPLACE,
  tech_park: WORKPLACE,
  coworking: WORKPLACE,
  commercial_building: WORKPLACE,

  // Billboards & roads
  roadside_billboard: ROADSIDE,
  highway: ROADSIDE,
  junction: ROADSIDE,
  fuel_station: [
    n("vehicles_per_day", "Vehicles per day", { required: true, cardPriority: 1, role: "audience_size", max: 50_000 }),
    n("pumps", "Fuel pumps", { cardPriority: 2, max: 100 }),
  ],
  parking: [
    n("vehicles_per_day", "Vehicles per day", { required: true, cardPriority: 1, role: "audience_size", max: 200_000 }),
    n("parking_slots", "Parking slots", { cardPriority: 2, max: 50_000 }),
    n("avg_parked_min", "Average time parked", { unit: "min", role: "dwell", max: 1_440 }),
  ],

  // Transit
  bus_station: [
    n("passengers_per_day", "Passengers per day", { required: true, cardPriority: 1, role: "audience_size", max: 2_000_000 }),
    n("departures_per_day", "Bus departures per day", { cardPriority: 2, role: "frequency", max: 20_000 }),
    n("routes", "Routes", { max: 5_000 }),
    n("avg_wait_min", "Average wait", { unit: "min", role: "dwell", max: 240 }),
  ],
  bus_stop: [
    n("passengers_per_day", "Passengers per day", { required: true, cardPriority: 1, role: "audience_size", max: 200_000 }),
    n("departures_per_day", "Buses per day", { cardPriority: 2, role: "frequency", max: 5_000 }),
    n("routes", "Routes", { max: 500 }),
    n("avg_wait_min", "Average wait", { unit: "min", role: "dwell", max: 120 }),
  ],
  railway_station: STATION,
  metro: STATION,
  airport: STATION,
  transit_hub: STATION,
  train_onboard: [
    n("passengers_per_trip", "Passengers per trip", { required: true, cardPriority: 1, role: "audience_size", max: 5_000 }),
    n("trips_per_day", "Trips per day", { cardPriority: 2, role: "frequency", max: 100 }),
    n("coaches", "Coaches", { max: 40 }),
    n("avg_journey_min", "Average journey", { unit: "min", role: "dwell", max: 3_000 }),
  ],

  // Lifestyle & Health
  salon_spa: [
    n("clients_per_day", "Clients per day", { required: true, cardPriority: 1, role: "audience_size", max: 5_000 }),
    inr("avg_ticket", "Average ticket", { cardPriority: 2, role: "affluence", max: 500_000 }),
    n("avg_service_min", "Average service time", { unit: "min", role: "dwell", max: 600 }),
    pick("gender_mix", "Audience", GENDER_MIX),
  ],
  gym: [
    n("active_members", "Active members", { required: true, cardPriority: 1, role: "audience_size", max: 50_000 }),
    inr("monthly_fee", "Monthly fee", { cardPriority: 2, role: "affluence", max: 100_000 }),
    n("session_min", "Average session", { unit: "min", role: "dwell", max: 600 }),
    text("peak_hours", "Peak hours", { help: "e.g. 6–9 am, 6–10 pm" }),
    pick("age_band", "Main age group", AGE_BANDS),
  ],
  clinic: [
    n("patients_per_day", "Patients per day", { required: true, cardPriority: 1, role: "audience_size", max: 10_000 }),
    n("avg_wait_min", "Average wait", { unit: "min", cardPriority: 2, role: "dwell", max: 600 }),
    text("specialty", "Specialty", { help: "e.g. Dental, Dermatology, Pediatrics" }),
  ],
  hospital: [
    n("patients_per_day", "Patients per day", { required: true, cardPriority: 1, role: "audience_size", max: 100_000 }),
    n("avg_wait_min", "Average wait", { unit: "min", cardPriority: 2, role: "dwell", max: 600 }),
    n("beds", "Beds", { max: 10_000 }),
    text("specialty", "Specialties"),
  ],
  play_area: [
    n("kid_visits_per_day", "Kid visits per day", { required: true, cardPriority: 1, role: "audience_size", max: 20_000 }),
    n("parent_dwell_min", "Parent time spent", { unit: "min", cardPriority: 2, role: "dwell", max: 600 }),
    pick("kids_age_band", "Kids' age group", ["Under 5", "5-8", "9-12", "All ages"]),
  ],
  sports_venue: [
    n("capacity", "Capacity", { cardPriority: 1, role: "audience_size", max: 200_000 }),
    n("events_per_month", "Events per month", { cardPriority: 2, role: "frequency", max: 500 }),
    n("daily_visitors", "Daily visitors", { role: "audience_size", max: 200_000 }),
  ],

  // Education
  academy: [
    n("students_enrolled", "Students enrolled", { required: true, cardPriority: 1, role: "audience_size", max: 100_000 }),
    inr("monthly_fee", "Monthly fee", { cardPriority: 2, role: "affluence", max: 1_000_000 }),
    n("sessions_per_day", "Sessions per day", { role: "frequency", max: 100 }),
    pick("age_band", "Main age group", AGE_BANDS),
  ],
  school_college: [
    n("students_enrolled", "Students enrolled", { required: true, cardPriority: 1, role: "audience_size", max: 200_000 }),
    inr("annual_fee", "Annual fee", { cardPriority: 2, role: "affluence", max: 10_000_000 }),
    pick("age_band", "Main age group", AGE_BANDS),
  ],

  // Mixed venues
  standee_network: [
    n("outlets", "Outlets", { required: true, cardPriority: 1, max: 100_000 }),
    text("outlet_categories", "Outlet categories", { cardPriority: 2, help: "e.g. Pharmacies, Grocery, Salons" }),
    text("print_size", "Standee size"),
    pick("refresh_cycle", "Creative refresh", ["Weekly", "Fortnightly", "Monthly"]),
  ],
};

export function attributesFor(venueType: string | null | undefined): AttributeDef[] {
  return (venueType && VENUE_ATTRIBUTES[venueType]) || [];
}

// ---------- Formatting ----------

export function formatIndianCompact(n: number): string {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(1).replace(/\.0$/, "")} Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(1).replace(/\.0$/, "")} L`;
  return n.toLocaleString("en-IN");
}

export function formatAttributeValue(def: AttributeDef, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (def.type === "boolean") return value ? "Yes" : "No";
  if (def.type === "number" || def.type === "currency") {
    const num = typeof value === "number" ? value : parseFloat(String(value));
    if (!Number.isFinite(num) || num <= 0) return null; // zero / empty is "unknown", never shown
    const base = def.type === "currency" ? `₹${formatIndianCompact(num)}` : formatIndianCompact(num);
    return def.unit ? `${base}${def.unit === "%" ? "%" : ` ${def.unit}`}` : base;
  }
  return String(value).trim() || null;
}

// ---------- Validation (server + form) ----------

// Cleans an incoming attributes object against the type's definitions: unknown keys dropped,
// numbers coerced and range-checked, enums checked. Returns cleaned values + human errors.
export function validateVenueAttributes(venueType: string | null | undefined, input: unknown): { value: VenueAttributes; errors: string[] } {
  const defs = attributesFor(venueType);
  const value: VenueAttributes = {};
  const errors: string[] = [];
  if (!input || typeof input !== "object") return { value, errors };
  for (const def of defs) {
    const raw = (input as Record<string, unknown>)[def.key];
    if (raw === undefined || raw === null || raw === "") continue;
    if (def.type === "number" || def.type === "currency") {
      const num = typeof raw === "number" ? raw : parseFloat(String(raw).replace(/,/g, ""));
      if (!Number.isFinite(num)) errors.push(`${def.label} must be a number`);
      else if (def.min !== undefined && num < def.min) errors.push(`${def.label} can't be below ${def.min}`);
      else if (def.max !== undefined && num > def.max) errors.push(`${def.label} looks too high (max ${def.max.toLocaleString("en-IN")})`);
      else value[def.key] = num;
    } else if (def.type === "enum") {
      const s = String(raw);
      if (def.options && !def.options.includes(s)) errors.push(`${def.label} must be one of: ${def.options.join(", ")}`);
      else value[def.key] = s;
    } else if (def.type === "boolean") {
      value[def.key] = raw === true || raw === "true";
    } else {
      const s = String(raw).trim().slice(0, 300);
      if (s) value[def.key] = s;
    }
  }
  return { value, errors };
}

export function validateCustomAttributes(input: unknown): { value: CustomAttribute[]; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(input)) return { value: [], errors };
  const value = input
    .map((r) => ({
      label: String((r as any)?.label ?? "").trim().slice(0, 60),
      value: String((r as any)?.value ?? "").trim().slice(0, 120),
      unit: String((r as any)?.unit ?? "").trim().slice(0, 20) || undefined,
    }))
    .filter((r) => r.label && r.value);
  if (value.length > 10) errors.push("Up to 10 custom details");
  return { value: value.slice(0, 10), errors };
}

// ---------- Audience impact: derived "Est." metrics (formulas approved in the plan) ----------

export const IMPACT_CONFIG = {
  residentsPerFlat: 3.5,
  // ₹ thresholds for average flat / home value
  flatValueBands: [
    { upTo: 5_000_000, tier: "Mid-market" },
    { upTo: 10_000_000, tier: "Upper-mid" },
    { upTo: 25_000_000, tier: "Premium" },
    { upTo: Infinity, tier: "Luxury" },
  ],
  cinemaTierAffluence: { Silver: "Mid-market", Gold: "Upper-mid", Platinum: "Premium", Icon: "Luxury", Luxe: "Luxury", "Director's Cut": "Luxury", Insignia: "Luxury", "7 Star": "Luxury" } as Record<string, string>,
  hotelStarAffluence: { "3": "Mid-market", "4": "Premium", "5": "Luxury" } as Record<string, string>,
  daysPerMonth: 30,
};

export interface DerivedMetric {
  key: string;
  label: string;
  value: string;
  estimate: true; // always shown with an "Est." marker
  formula: string; // plain-English, for a tooltip
}

const num = (v: unknown): number | null => {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(x) && x > 0 ? x : null;
};

export function affluenceTier(venueType: string | null | undefined, attrs: VenueAttributes): string | null {
  const flatValue = num(attrs.avg_flat_value);
  if (flatValue) return IMPACT_CONFIG.flatValueBands.find((b) => flatValue <= b.upTo)!.tier;
  if (typeof attrs.cinema_tier === "string") return IMPACT_CONFIG.cinemaTierAffluence[attrs.cinema_tier] ?? null;
  if (venueType === "hotel" && attrs.star_rating !== undefined) return IMPACT_CONFIG.hotelStarAffluence[String(attrs.star_rating)] ?? null;
  return null;
}

// Only metrics whose inputs exist; never shown when an input is missing.
export function deriveMetrics(venueType: string | null | undefined, attrs: VenueAttributes): DerivedMetric[] {
  const out: DerivedMetric[] = [];
  const flats = num(attrs.flats);
  if (flats && !num(attrs.residents)) {
    out.push({ key: "est_residents", label: "Residents", value: formatIndianCompact(Math.round(flats * IMPACT_CONFIG.residentsPerFlat)), estimate: true, formula: `Flats × ${IMPACT_CONFIG.residentsPerFlat} people per home` });
  }
  const tier = affluenceTier(venueType, attrs);
  if (tier) {
    const basis = num(attrs.avg_flat_value) ? "average flat value" : typeof attrs.cinema_tier === "string" ? "cinema tier" : "hotel star rating";
    out.push({ key: "affluence", label: "Affluence", value: tier, estimate: true, formula: `From ${basis}` });
  }
  const seats = num(attrs.seating_capacity);
  const shows = num(attrs.shows_per_day);
  if (seats && shows) {
    out.push({ key: "seat_capacity", label: "Daily seat capacity", value: formatIndianCompact(Math.round(seats * shows)), estimate: true, formula: "Seats × shows per day (capacity, not attendance)" });
  }
  const monthly = num(attrs.monthly_footfall);
  if (monthly) {
    out.push({ key: "daily_shoppers", label: "Daily shoppers", value: formatIndianCompact(Math.round(monthly / IMPACT_CONFIG.daysPerMonth)), estimate: true, formula: `Monthly footfall ÷ ${IMPACT_CONFIG.daysPerMonth}` });
  }
  return out;
}

// ---------- Facts for cards and details ----------

export interface AttributeFact {
  key: string;
  label: string;
  value: string;
  estimate?: boolean;
  formula?: string;
}

// Filled attributes in card order, then derived metrics. Cards take the first 2; details show all.
export function attributeFacts(venueType: string | null | undefined, attrs: VenueAttributes | null | undefined): AttributeFact[] {
  if (!attrs) return [];
  const defs = attributesFor(venueType);
  const filled = defs
    .map((d) => ({ d, v: formatAttributeValue(d, attrs[d.key]) }))
    .filter((x): x is { d: AttributeDef; v: string } => !!x.v)
    .sort((a, b) => (a.d.cardPriority ?? 99) - (b.d.cardPriority ?? 99));
  const facts: AttributeFact[] = filled.map(({ d, v }) => ({ key: d.key, label: d.label, value: v }));
  for (const m of deriveMetrics(venueType, attrs)) facts.push({ key: m.key, label: m.label, value: m.value, estimate: true, formula: m.formula });
  return facts;
}

// Card line: top-2 facts — filled card-priority attributes first, then derived metrics
export function cardFacts(venueType: string | null | undefined, attrs: VenueAttributes | null | undefined): AttributeFact[] {
  const all = attributeFacts(venueType, attrs);
  const defs = attributesFor(venueType);
  const onCard = (f: AttributeFact) => f.estimate || defs.find((d) => d.key === f.key)?.cardPriority !== undefined;
  return all.filter(onCard).slice(0, 2);
}

export function venueTypeLabel(venueType: string | null | undefined): string | null {
  return getVenueType(venueType)?.label ?? null;
}
