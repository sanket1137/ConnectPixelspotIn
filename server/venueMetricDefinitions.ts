// Venue metric definitions (venue_metric_definitions) and the city master (city_master), cached in memory.
// If the tables don't exist yet (migration not run), the code seed list and STATE_CITIES are used instead.
import { asc, eq, sql, inArray } from "drizzle-orm";
import { cityMaster, screens, venueMetricDefinitions, type VenueMetricDefinitionRow } from "@shared/schema";
import { INDIAN_STATES, STATE_CITIES, normalizeCityName } from "@shared/constants";
import { METRIC_KINDS, metricKeyFromLabel, seedRegistry, type MetricDef, type MetricKind, type MetricRegistry } from "@shared/venueMetrics";
import { getVenueType } from "@shared/venueTaxonomy";
import { db } from "./db";

const TTL_MS = 60_000;
let registryCache: { at: number; all: MetricRegistry } | null = null;
let citiesCache: { at: number; cities: Record<string, string[]> } | null = null;

function rowToDef(r: VenueMetricDefinitionRow): MetricDef & { id: number } {
  return {
    id: r.id,
    key: r.key,
    label: r.label,
    kind: r.inputKind as MetricKind,
    unit: r.unit,
    help: r.help,
    options: Array.isArray(r.options) ? r.options : [],
    min: r.minValue != null ? Number(r.minValue) : null,
    max: r.maxValue != null ? Number(r.maxValue) : null,
    required: r.required,
    showOnCard: r.showOnCard,
    role: (r.role as MetricDef["role"]) ?? null,
    sortOrder: r.sortOrder,
    active: r.active,
  };
}

// Every definition (hidden ones too) per venue type
export async function getMetricRegistry(): Promise<MetricRegistry> {
  if (registryCache && Date.now() - registryCache.at < TTL_MS) return registryCache.all;
  try {
    const rows = await db.select().from(venueMetricDefinitions).orderBy(asc(venueMetricDefinitions.venueType), asc(venueMetricDefinitions.sortOrder));
    if (!rows.length) return seedRegistry();
    const all: MetricRegistry = {};
    for (const r of rows) (all[r.venueType] ||= []).push(rowToDef(r));
    registryCache = { at: Date.now(), all };
    return all;
  } catch (e: any) {
    if (e?.code === "42P01") return seedRegistry(); // table not created yet
    throw e;
  }
}

// What browsers get: active definitions only (hidden ones are never shown)
export async function getPublicMetricRegistry(): Promise<MetricRegistry> {
  const all = await getMetricRegistry();
  const out: MetricRegistry = {};
  for (const [type, defs] of Object.entries(all)) {
    const active = defs.filter((d) => d.active).map(({ id, ...d }: any) => d);
    if (active.length) out[type] = active;
  }
  return out;
}

export function invalidateMetricRegistry() {
  registryCache = null;
}

// How many screens have a value for each key of a venue type
export async function metricUsage(venueType: string): Promise<Record<string, number>> {
  const res = await db.execute(sql`
    SELECT k AS key, count(*)::int AS n
      FROM screens, jsonb_object_keys(venue_metrics) AS k
     WHERE venue_type = ${venueType}
     GROUP BY k`);
  const out: Record<string, number> = {};
  for (const r of res.rows as Array<{ key: string; n: number }>) out[r.key] = r.n;
  return out;
}

export interface MetricInput {
  label: string;
  kind: MetricKind;
  unit?: string | null;
  help?: string | null;
  options?: string[];
  min?: number | null;
  max?: number | null;
  required?: boolean;
  showOnCard?: boolean;
  active?: boolean;
  sortOrder?: number;
}

function cleanInput(input: Partial<MetricInput>): { value: Partial<MetricInput>; error?: string } {
  const value: Partial<MetricInput> = {};
  if (input.label !== undefined) {
    const label = String(input.label).trim().replace(/\s+/g, " ");
    if (label.length < 2 || label.length > 60) return { value, error: "Label must be 2–60 characters" };
    value.label = label;
  }
  if (input.kind !== undefined) {
    if (!METRIC_KINDS.includes(input.kind)) return { value, error: "Unknown input type" };
    value.kind = input.kind;
  }
  if (input.unit !== undefined) value.unit = input.unit ? String(input.unit).trim().slice(0, 20) || null : null;
  if (input.help !== undefined) value.help = input.help ? String(input.help).trim().slice(0, 200) || null : null;
  if (input.options !== undefined) {
    const seen = new Set<string>();
    const opts: string[] = [];
    for (const o of Array.isArray(input.options) ? input.options : []) {
      const s = String(o).trim().replace(/\s+/g, " ").slice(0, 60);
      if (s && !seen.has(s.toLowerCase())) {
        seen.add(s.toLowerCase());
        opts.push(s);
      }
    }
    value.options = opts;
  }
  for (const k of ["min", "max"] as const) {
    if (input[k] !== undefined) {
      const raw = input[k];
      const num = raw === null || (raw as any) === "" ? null : Number(raw);
      if (num !== null && !Number.isFinite(num)) return { value, error: `${k === "min" ? "Minimum" : "Maximum"} must be a number` };
      value[k] = num;
    }
  }
  for (const k of ["required", "showOnCard", "active"] as const) if (input[k] !== undefined) value[k] = !!input[k];
  if (input.sortOrder !== undefined && Number.isFinite(Number(input.sortOrder))) value.sortOrder = Math.round(Number(input.sortOrder));
  return { value };
}

export async function createMetric(venueType: string, input: MetricInput, userId: string) {
  if (!getVenueType(venueType)) return { error: "Unknown venue category" };
  const { value, error } = cleanInput(input);
  if (error) return { error };
  if (!value.label || !value.kind) return { error: "Label and input type are required" };
  if ((value.kind === "enum" || value.kind === "multi") && !(value.options || []).length) return { error: "Add at least one option" };
  const key = metricKeyFromLabel(value.label);
  if (!key) return { error: "Label needs letters or digits" };
  const existing = (await getMetricRegistry())[venueType] || [];
  if (existing.some((d) => d.key === key)) return { error: `A metric "${key}" already exists for this venue category` };
  if (existing.some((d) => d.label.toLowerCase() === value.label!.toLowerCase())) return { error: "A metric with this label already exists" };
  if (value.showOnCard && existing.filter((d) => d.active && d.showOnCard).length >= 2) return { error: "Only 2 metrics can show on the advertiser card — turn one off first" };
  const sortOrder = value.sortOrder ?? Math.max(0, ...existing.map((d) => d.sortOrder)) + 10;
  const [row] = await db
    .insert(venueMetricDefinitions)
    .values({
      venueType,
      key,
      label: value.label,
      inputKind: value.kind,
      unit: value.unit ?? null,
      help: value.help ?? null,
      options: value.options ?? [],
      minValue: value.min != null ? String(value.min) : null,
      maxValue: value.max != null ? String(value.max) : null,
      required: !!value.required,
      showOnCard: !!value.showOnCard,
      sortOrder,
      active: value.active ?? true,
      createdBy: userId,
    })
    .returning();
  invalidateMetricRegistry();
  return { metric: rowToDef(row) };
}

export async function updateMetric(id: number, input: Partial<MetricInput>) {
  const [cur] = await db.select().from(venueMetricDefinitions).where(eq(venueMetricDefinitions.id, id));
  if (!cur) return { error: "Metric not found", status: 404 };
  const { value, error } = cleanInput(input);
  if (error) return { error };
  const used = (await metricUsage(cur.venueType))[cur.key] || 0;
  if (value.kind && value.kind !== cur.inputKind && used > 0) return { error: `Input type is locked — ${used} screens already have a value` };
  if (value.options && used > 0) {
    // options already in use can't be removed
    const res = await db.execute(sql`
      SELECT DISTINCT v AS v FROM screens,
        LATERAL (SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(venue_metrics->${cur.key}) = 'array' THEN venue_metrics->${cur.key} ELSE jsonb_build_array(venue_metrics->${cur.key}) END) AS v) x
       WHERE venue_type = ${cur.venueType} AND venue_metrics ? ${cur.key}`);
    const inUse = (res.rows as Array<{ v: string }>).map((r) => r.v);
    const missing = inUse.filter((v) => !value.options!.includes(v));
    if (missing.length) return { error: `Can't remove options in use: ${missing.join(", ")}` };
  }
  const kind = value.kind ?? cur.inputKind;
  if ((kind === "enum" || kind === "multi") && !(value.options ?? cur.options ?? []).length) return { error: "Add at least one option" };
  if (value.label && value.label.toLowerCase() !== cur.label.toLowerCase()) {
    const siblings = (await getMetricRegistry())[cur.venueType] || [];
    if (siblings.some((d) => d.label.toLowerCase() === value.label!.toLowerCase())) return { error: "A metric with this label already exists" };
  }
  const willShow = value.showOnCard ?? cur.showOnCard;
  const willBeActive = value.active ?? cur.active;
  if (willShow && willBeActive && !(cur.showOnCard && cur.active)) {
    const siblings = (await getMetricRegistry())[cur.venueType] || [];
    if (siblings.filter((d) => d.active && d.showOnCard && d.key !== cur.key).length >= 2) return { error: "Only 2 metrics can show on the advertiser card — turn one off first" };
  }
  const [row] = await db
    .update(venueMetricDefinitions)
    .set({
      ...(value.label !== undefined && { label: value.label }),
      ...(value.kind !== undefined && { inputKind: value.kind }),
      ...(value.unit !== undefined && { unit: value.unit }),
      ...(value.help !== undefined && { help: value.help }),
      ...(value.options !== undefined && { options: value.options }),
      ...(value.min !== undefined && { minValue: value.min != null ? String(value.min) : null }),
      ...(value.max !== undefined && { maxValue: value.max != null ? String(value.max) : null }),
      ...(value.required !== undefined && { required: value.required }),
      ...(value.showOnCard !== undefined && { showOnCard: value.showOnCard }),
      ...(value.active !== undefined && { active: value.active }),
      ...(value.sortOrder !== undefined && { sortOrder: value.sortOrder }),
      updatedAt: new Date(),
    })
    .where(eq(venueMetricDefinitions.id, id))
    .returning();
  invalidateMetricRegistry();
  return { metric: rowToDef(row) };
}

// ---------- cities ----------

export async function getCityMaster(): Promise<Record<string, string[]>> {
  if (citiesCache && Date.now() - citiesCache.at < TTL_MS) return citiesCache.cities;
  try {
    // 1. Start with STATE_CITIES baseline
    const cities: Record<string, Set<string>> = {};
    for (const [state, list] of Object.entries(STATE_CITIES)) {
      cities[state] = new Set((list || []).map(c => normalizeCityName(c.trim())).filter(Boolean));
    }
    for (const s of INDIAN_STATES) {
      if (!cities[s]) cities[s] = new Set();
    }

    // 2. Query distinct states and cities from screens in database
    try {
      const screenRows = await db
        .selectDistinct({ state: screens.state, city: screens.city })
        .from(screens)
        .where(inArray(screens.status, ["active", "approved"]));
      for (const r of screenRows) {
        if (r.state && r.city) {
          const normCity = normalizeCityName(r.city.trim());
          const stateKey = r.state.trim();
          if (normCity && stateKey) {
            if (!cities[stateKey]) cities[stateKey] = new Set();
            cities[stateKey].add(normCity);
          }
        }
      }
    } catch (err) {
      console.warn("[getCityMaster] Could not query screens table for cities:", err);
    }

    // 3. Query cityMaster table (custom admin-added cities)
    try {
      const rows = await db
        .select({ state: cityMaster.state, city: cityMaster.city })
        .from(cityMaster)
        .orderBy(asc(cityMaster.state), asc(cityMaster.city));
      for (const r of rows) {
        if (r.state && r.city) {
          const stateKey = r.state.trim();
          const cityVal = normalizeCityName(r.city.trim());
          if (!cities[stateKey]) cities[stateKey] = new Set();
          if (cityVal) cities[stateKey].add(cityVal);
        }
      }
    } catch (e: any) {
      if (e?.code !== "42P01") console.warn("[getCityMaster] Could not query cityMaster:", e);
    }

    // 4. Convert all sets to sorted arrays
    const result: Record<string, string[]> = {};
    for (const [state, citySet] of Object.entries(cities)) {
      result[state] = Array.from(citySet).filter(Boolean).sort((a, b) => a.localeCompare(b));
    }

    citiesCache = { at: Date.now(), cities: result };
    return result;
  } catch (e: any) {
    console.error("getCityMaster error:", e);
    return { ...STATE_CITIES };
  }
}

export async function addCity(state: string, city: string, userId: string) {
  const normState = String(state || "").trim();
  const name = String(city || "").trim().replace(/\s+/g, " ");
  if (!normState) return { error: "Pick or enter a valid state" };
  if (name.length < 2 || name.length > 60 || !/^[A-Za-z0-9][A-Za-z0-9 .'-]*$/.test(name)) {
    return { error: "City name must be 2–60 characters" };
  }
  const titled = name.replace(/\b([a-z])/g, (m) => m.toUpperCase());
  const current = (await getCityMaster())[normState] || [];
  if (current.some((c) => c.toLowerCase() === titled.toLowerCase())) {
    return { error: `${titled} is already listed under ${normState}` };
  }
  await db.insert(cityMaster).values({ state: normState, city: titled, createdBy: userId }).onConflictDoNothing();
  citiesCache = null;
  return { state: normState, city: titled };
}
