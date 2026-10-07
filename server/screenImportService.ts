// Admin Excel import: template generation, upload parsing, database duplicate checks and the final import.
// Validation rules themselves live in shared/screenImport.ts (also used by the browser grid).
import crypto from "crypto";
import ExcelJS from "exceljs";
import { and, eq, ne, sql } from "drizzle-orm";
import { screenImports, screens, type ScreenImport } from "@shared/schema";
import { INDIAN_STATES, TIME_OPTIONS } from "@shared/screenFieldOptions";
import {
  BASE_IMPORT_FIELDS,
  CALCULATED_COLUMNS,
  MAX_IMPORT_ROWS,
  METRIC_PREFIX,
  TEMPLATE_VERSION,
  cellText,
  dedupeKey,
  distanceMeters,
  importFieldsFor,
  normalizeValues,
  normalizedVenue,
  rowToScreen,
  summarize,
  validateRows,
  type ImportCell,
  type ImportContext,
  type ImportField,
  type ImportIssue,
  type ImportRow,
} from "@shared/screenImport";
import type { MetricRegistry } from "@shared/venueMetrics";
import { getVenueType } from "@shared/venueTaxonomy";
import { db } from "./db";
import { deriveVenueFields, publicCache } from "./storage";
import { getCityMaster, getMetricRegistry } from "./venueMetricDefinitions";
import { generateTagsForScreen } from "./services/screen-tagging";

const DATA_START_ROW = 3; // row 1 = groups, row 2 = column names
const TEMPLATE_ROWS = MAX_IMPORT_ROWS;

// One Excel column: a field, or one option of a multi-choice field (Yes/No)
interface SheetColumn {
  key: string;
  option?: string;
  header: string;
  field?: ImportField;
  calculated?: boolean;
}

function sheetColumns(fields: ImportField[]): SheetColumn[] {
  const cols: SheetColumn[] = [];
  const push = (f: ImportField) => {
    if (f.kind === "multi") for (const o of f.options || []) cols.push({ key: f.key, option: o, header: `${f.header}: ${o}`, field: f });
    else cols.push({ key: f.key, header: f.header, field: f });
  };
  BASE_IMPORT_FIELDS.forEach(push);
  for (const c of CALCULATED_COLUMNS) cols.push({ key: c.key, header: c.header, calculated: true });
  fields.filter((f) => f.metric).forEach(push);
  return cols;
}

const colLetter = (i: number) => {
  let s = "";
  let n = i;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const nameSafe = (s: string) => s.replace(/[^A-Za-z0-9]/g, "_");
const FILL = {
  required: "FFFED7AA",
  optional: "FFF1F5F9",
  metric: "FFDBEAFE",
  metricRequired: "FFBFDBFE",
  calculated: "FFE5E7EB",
  group: "FF1F2937",
};

// ---------- template ----------

export async function buildTemplate(venueType: string, fill?: ImportRow[]): Promise<Buffer> {
  const vt = getVenueType(venueType);
  if (!vt) throw new Error("Unknown venue category");
  const registry = await getMetricRegistry();
  const cities = await getCityMaster();
  const fields = importFieldsFor(registry, venueType);
  const cols = sheetColumns(fields);
  const colOf = new Map<string, string>();
  cols.forEach((c, i) => {
    if (!c.option) colOf.set(c.key, colLetter(i + 1));
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "PixelSpot";
  wb.created = new Date();
  const ws = wb.addWorksheet("Screens", { views: [{ state: "frozen", xSplit: 2, ySplit: 2 }] });
  const how = wb.addWorksheet("How to fill");
  const lists = wb.addWorksheet("Lists", { state: "veryHidden" });
  const meta = wb.addWorksheet("_meta", { state: "veryHidden" });

  // Lists sheet: one column per dropdown source; states in A, times in B, Yes/No in C, cities per state after that
  const listRanges = new Map<string, string>(); // field key → range
  let listCol = 1;
  const addList = (id: string, values: readonly string[]) => {
    const L = colLetter(listCol++);
    lists.getCell(`${L}1`).value = id;
    values.forEach((v, i) => (lists.getCell(`${L}${i + 2}`).value = v));
    const range = `Lists!$${L}$2:$${L}$${Math.max(2, values.length + 1)}`;
    listRanges.set(id, range);
    return range;
  };
  addList("state", INDIAN_STATES);
  addList("time", TIME_OPTIONS);
  addList("yesno", ["Yes", "No"]);
  for (const f of fields) if (f.kind === "select" && f.key !== "state" && f.key !== "city" && f.options?.length) addList(f.key, f.options);
  for (const state of INDIAN_STATES) {
    const range = addList(`city:${state}`, cities[state]?.length ? cities[state] : ["(add cities in Settings)"]);
    wb.definedNames.add(range, `C_${nameSafe(state)}`);
  }

  // Header rows
  let groupStart = 1;
  cols.forEach((c, i) => {
    const col = i + 1;
    const group = c.calculated ? "Calculated (filled automatically)" : c.field!.group;
    const next = cols[i + 1];
    const nextGroup = next ? (next.calculated ? "Calculated (filled automatically)" : next.field!.group) : null;
    if (nextGroup !== group) {
      if (col > groupStart) ws.mergeCells(1, groupStart, 1, col);
      const g = ws.getCell(1, groupStart);
      g.value = group === "Venue metrics" ? `Venue metrics — ${vt.label}` : group;
      g.font = { bold: true, color: { argb: "FFFFFFFF" } };
      g.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.group } };
      g.alignment = { horizontal: "center", vertical: "middle" };
      groupStart = col + 1;
    }
    const h = ws.getCell(2, col);
    h.value = c.calculated ? c.header : `${c.header}${c.field!.required && !c.option ? " *" : ""}`;
    const kind = c.calculated ? "calculated" : c.field!.metric ? (c.field!.required ? "metricRequired" : "metric") : c.field!.required ? "required" : "optional";
    h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL[kind as keyof typeof FILL] } };
    h.font = { bold: true };
    h.alignment = { wrapText: true, vertical: "top" };
    h.border = { bottom: { style: "thin", color: { argb: "FF94A3B8" } } };
    const note = c.calculated
      ? CALCULATED_COLUMNS.find((x) => x.key === c.key)!.help + ". Don't type here."
      : `${c.field!.help}${c.option ? `\nYes = ${c.option}. ${c.field!.required ? "At least one Yes in this group." : ""}` : ""}${c.field!.example && !c.option ? `\nExample: ${c.field!.example}` : ""}`;
    h.note = { texts: [{ text: note }], margins: { insetmode: "auto" } } as any;
    ws.getColumn(col).width = c.option ? 9 : c.field?.width ?? 14;
  });
  ws.getRow(2).height = 48;

  // Input columns unlocked; calculated columns locked with formulas
  const last = DATA_START_ROW + TEMPLATE_ROWS - 1;
  cols.forEach((c, i) => {
    const L = colLetter(i + 1);
    const range = `${L}${DATA_START_ROW}:${L}${last}`;
    const column = ws.getColumn(i + 1);
    if (c.calculated) {
      column.protection = { locked: true };
      return;
    }
    column.protection = { locked: false };
    const f = c.field!;
    const dv = (opts: any) => (ws as any).dataValidations.add(range, { allowBlank: true, showErrorMessage: true, errorStyle: "stop", ...opts });
    if (c.option || f.kind === "yesno") dv({ type: "list", formulae: [listRanges.get("yesno")], errorTitle: "Yes or No", error: "Pick Yes or No" });
    else if (f.key === "state") dv({ type: "list", formulae: [listRanges.get("state")], errorTitle: "State", error: "Pick a state from the list" });
    else if (f.key === "city") {
      const stateCol = colOf.get("state");
      dv({ type: "list", formulae: [`INDIRECT("C_"&SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(${stateCol}${DATA_START_ROW}," ","_"),"-","_"),"&","_"))`], errorTitle: "City", error: "Pick a city for the chosen State. Missing? Add it in Admin → Settings → Cities, then download a fresh template." });
    } else if (f.kind === "time") dv({ type: "list", formulae: [listRanges.get("time")], errorTitle: "Time", error: "Pick a time from the list" });
    else if (f.kind === "select" && listRanges.has(f.key)) dv({ type: "list", formulae: [listRanges.get(f.key)], errorTitle: f.header, error: "Pick a value from the list" });
    else if (f.kind === "int") dv({ type: "whole", operator: "between", formulae: [f.min ?? 0, f.max ?? 100_000_000], errorTitle: f.header, error: `Whole number${f.min !== undefined ? ` from ${f.min}` : ""}${f.max !== undefined ? ` to ${f.max}` : ""}` });
    else if (f.key === "latitude") dv({ type: "decimal", operator: "between", formulae: [6.5, 37.5], errorTitle: "Latitude", error: "India latitude is between 6.5 and 37.5" });
    else if (f.key === "longitude") dv({ type: "decimal", operator: "between", formulae: [68, 97.5], errorTitle: "Longitude", error: "India longitude is between 68 and 97.5" });
    else if (f.kind === "pincode") dv({ type: "whole", operator: "between", formulae: [100000, 999999], errorTitle: "Pincode", error: "6-digit pincode" });
    if (f.kind === "time" || f.kind === "resolution" || f.kind === "text") column.numFmt = "@";
  });

  const L = (k: string) => colOf.get(k)!;
  const formulas: Record<string, (r: number) => string> = {
    bundlePricePerDay: (r) => `IF(${L("pricePerDay")}${r}="","",${L("pricePerDay")}${r}*MAX(1,N(${L("numberOfScreens")}${r})))`,
    isMultiScreen: (r) => `IF(${L("numberOfScreens")}${r}="","",IF(${L("numberOfScreens")}${r}>1,"Yes","No"))`,
    type: (r) => `IF(${L("category")}${r}="","",${L("category")}${r})`,
    size: (r) => `IF(${L("resolution")}${r}="","",${L("resolution")}${r})`,
    operationalHours: (r) => `IF(OR(${L("customOperatingHoursStart")}${r}="",${L("customOperatingHoursEnd")}${r}=""),"",${L("customOperatingHoursStart")}${r}&" – "&${L("customOperatingHoursEnd")}${r})`,
    playbackSlotsPerHour: (r) => `IF(N(${L("loopDuration")}${r})>0,INT(3600/${L("loopDuration")}${r}),"")`,
    maxBrandsPerLoop: (r) => `IF(AND(N(${L("loopDuration")}${r})>0,N(${L("durationPerSlot")}${r})>0),INT(${L("loopDuration")}${r}/${L("durationPerSlot")}${r}),"")`,
  };
  cols.forEach((c, i) => {
    if (!c.calculated) return;
    for (let r = DATA_START_ROW; r <= last; r++) {
      const cell = ws.getCell(r, i + 1);
      cell.value = { formula: formulas[c.key](r) } as any;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
    }
  });

  // Optional: filled rows (corrected sheet download)
  (fill || []).forEach((row, idx) => {
    const r = DATA_START_ROW + idx;
    cols.forEach((c, i) => {
      if (c.calculated) return;
      const v = row.values[c.key];
      if (c.option) {
        const list = Array.isArray(v) ? v : cellText(v).split(",").map((s) => s.trim());
        if (list.includes(c.option)) ws.getCell(r, i + 1).value = "Yes";
      } else {
        const s = cellText(v);
        if (!s) return;
        const asNumber = ["int", "number", "decimal", "pincode"].includes(c.field!.kind) && /^-?\d+(\.\d+)?$/.test(s);
        ws.getCell(r, i + 1).value = asNumber ? Number(s) : s;
      }
    });
  });

  await ws.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatColumns: true,
    formatRows: true,
    insertRows: true,
    deleteRows: true,
    sort: true,
    autoFilter: true,
  });

  // How to fill
  how.getColumn(1).width = 34;
  how.getColumn(2).width = 12;
  how.getColumn(3).width = 70;
  how.getColumn(4).width = 26;
  const intro = [
    `PixelSpot screen import — ${vt.label}`,
    "1. Fill one row per screen listing on the 'Screens' sheet, starting at row 3. Up to " + MAX_IMPORT_ROWS + " rows.",
    "2. Orange headers are required, white are optional, blue are this venue's metrics (dark blue = required). Grey columns fill themselves.",
    "3. Use the dropdowns. Values that aren't on a list are rejected on import (they break advertiser filters).",
    "4. Multi-choice fields have one Yes/No column per option — put Yes on every option that applies.",
    "5. Owner, host and status are chosen once on the Import page, not in the sheet. Photos are added after import.",
    "6. Upload the file in Admin → Manage Screens → Import screens. You can fix any problems on screen before importing.",
  ];
  intro.forEach((t, i) => {
    const cell = how.getCell(i + 1, 1);
    cell.value = t;
    if (i === 0) cell.font = { bold: true, size: 14 };
  });
  const hr = intro.length + 2;
  ["Column", "Required", "How to fill", "Example"].forEach((t, i) => {
    const cell = how.getCell(hr, i + 1);
    cell.value = t;
    cell.font = { bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL.optional } };
  });
  let r = hr + 1;
  for (const f of fields) {
    how.getCell(r, 1).value = f.header;
    how.getCell(r, 2).value = f.required ? "Yes" : "";
    how.getCell(r, 3).value = f.kind === "multi" ? `${f.help}. Options: ${(f.options || []).join(", ")}` : f.options && f.kind === "select" && f.options.length <= 12 ? `${f.help}: ${f.options.join(", ")}` : f.help;
    how.getCell(r, 3).alignment = { wrapText: true };
    how.getCell(r, 4).value = f.example ?? "";
    r++;
  }
  for (const c of CALCULATED_COLUMNS) {
    how.getCell(r, 1).value = c.header;
    how.getCell(r, 3).value = `Calculated: ${c.help}`;
    r++;
  }

  // _meta: what this template is, and which field each column holds
  meta.getCell("A1").value = "venueType";
  meta.getCell("B1").value = venueType;
  meta.getCell("A2").value = "version";
  meta.getCell("B2").value = TEMPLATE_VERSION;
  meta.getCell("A3").value = "generated";
  meta.getCell("B3").value = new Date().toISOString();
  cols.forEach((c, i) => {
    meta.getCell(5 + i, 1).value = i + 1;
    meta.getCell(5 + i, 2).value = c.key;
    meta.getCell(5 + i, 3).value = c.option ?? "";
    meta.getCell(5 + i, 4).value = c.calculated ? "calculated" : "";
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------- parsing an upload ----------

function cellToString(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) {
    // time-only cells come back as 1899-12-30 + time (UTC)
    if (v.getUTCFullYear() <= 1900) return `${String(v.getUTCHours()).padStart(2, "0")}:${String(v.getUTCMinutes()).padStart(2, "0")}`;
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "object") {
    const o = v as any;
    if (Array.isArray(o.richText)) return o.richText.map((t: any) => t.text).join("").trim();
    if ("result" in o) return cellToString(o.result);
    if ("text" in o) return String(o.text).trim();
    if ("error" in o) return "";
  }
  return String(v).trim();
}

export interface ParsedUpload {
  venueType: string;
  rows: ImportRow[];
  notices: string[];
  hash: string;
}

export async function parseUpload(buffer: Buffer): Promise<ParsedUpload | { error: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer as any);
  } catch {
    return { error: "This file couldn't be read. Upload the .xlsx template downloaded from Get template." };
  }
  const meta = wb.getWorksheet("_meta");
  const ws = wb.getWorksheet("Screens");
  if (!meta || !ws) return { error: "This isn't a PixelSpot template. Download a fresh one from Get template and copy your rows into it." };
  const venueType = cellToString(meta.getCell("B1").value);
  if (!getVenueType(venueType)) return { error: "The template's venue category isn't recognised. Download a fresh template." };

  const registry = await getMetricRegistry();
  const known = new Set(importFieldsFor(registry, venueType).map((f) => f.key));
  const notices: string[] = [];
  const map: Array<{ col: number; key: string; option?: string }> = [];
  for (let r = 5; r <= meta.rowCount; r++) {
    const col = Number(cellToString(meta.getCell(r, 1).value));
    const key = cellToString(meta.getCell(r, 2).value);
    if (!col || !key || cellToString(meta.getCell(r, 4).value) === "calculated") continue;
    if (!known.has(key)) {
      if (key.startsWith(METRIC_PREFIX) && !notices.some((n) => n.includes(key))) notices.push(`Ignored column for metric "${key.slice(METRIC_PREFIX.length)}" — it is hidden or was removed in Settings.`);
      continue;
    }
    map.push({ col, key, option: cellToString(meta.getCell(r, 3).value) || undefined });
  }
  const metaCols = new Set(Array.from({ length: meta.rowCount }, (_, i) => Number(cellToString(meta.getCell(5 + i, 1).value))).filter(Boolean));
  const headerRow = ws.getRow(2);
  headerRow.eachCell((cell, col) => {
    if (!metaCols.has(col) && cellToString(cell.value)) notices.push(`Ignored extra column "${cellToString(cell.value)}".`);
  });

  const rows: ImportRow[] = [];
  for (let r = DATA_START_ROW; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const values: Record<string, ImportCell> = {};
    let any = false;
    for (const m of map) {
      const s = cellToString(row.getCell(m.col).value);
      if (m.option) {
        if (!values[m.key]) values[m.key] = [];
        if (s) any = true;
        if (/^(yes|y|true|1|✓|x)$/i.test(s)) (values[m.key] as string[]).push(m.option);
      } else {
        values[m.key] = s;
        if (s) any = true;
      }
    }
    if (!any) continue;
    if (rows.length >= MAX_IMPORT_ROWS) return { error: `Too many rows — the limit is ${MAX_IMPORT_ROWS} per file. Split it into smaller files.` };
    rows.push({ row: r, values });
  }
  if (!rows.length) return { error: "No screens found — fill rows from row 3 of the Screens sheet." };

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return { venueType, rows, notices, hash };
}

// ---------- validation with database checks ----------

export async function buildContext(venueType: string, rows: ImportRow[], importId: string | null, registry?: MetricRegistry): Promise<ImportContext> {
  const ctx: ImportContext = { registry: registry ?? (await getMetricRegistry()), venueType, cities: await getCityMaster() };
  const keyed = rows
    .map((r) => {
      const lat = cellText(r.values.latitude);
      const lng = cellText(r.values.longitude);
      const name = cellText(r.values.name);
      const venue = cellText(r.values.venueName);
      if (!lat || !lng || !name || !venue || !/^-?\d+(\.\d+)?$/.test(lat) || !/^-?\d+(\.\d+)?$/.test(lng)) return null;
      return { row: r.row, key: dedupeKey(venue, name, lat, lng), lat: parseFloat(lat), lng: parseFloat(lng), venue: normalizedVenue(venue) };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const existing: NonNullable<ImportContext["db"]>["existing"] = {};
  const nearby: NonNullable<ImportContext["db"]>["nearby"] = {};
  const drafts: Record<string, string> = {};
  if (keyed.length) {
    const keys = keyed.map((k) => k.key);
    const res = await db.execute(sql`SELECT id, name, venue_name, dedupe_key FROM screens WHERE dedupe_key IN (SELECT jsonb_array_elements_text(${JSON.stringify(keys)}::jsonb))`);
    for (const r of res.rows as any[]) existing[r.dedupe_key] = { id: r.id, name: r.name, venueName: r.venue_name };

    const near = await db.execute(sql`
      SELECT x."row", s.id, s.name, s.venue_name, s.latitude::float8 AS lat, s.longitude::float8 AS lng, s.dedupe_key
        FROM jsonb_to_recordset(${JSON.stringify(keyed)}::jsonb) AS x("row" int, lat float8, lng float8, venue text, key text)
        JOIN screens s
          ON s.latitude BETWEEN x.lat - 0.0005 AND x.lat + 0.0005
         AND s.longitude BETWEEN x.lng - 0.0005 AND x.lng + 0.0005
         AND lower(regexp_replace(coalesce(s.venue_name, ''), '[^A-Za-z0-9]', '', 'g')) = x.venue
         AND s.dedupe_key <> x.key`);
    const byRow = new Map(keyed.map((k) => [k.row, k]));
    for (const r of near.rows as any[]) {
      const k = byRow.get(r.row)!;
      const meters = distanceMeters(k.lat, k.lng, r.lat, r.lng);
      if (meters > 30) continue;
      if (!nearby[r.row] || meters < nearby[r.row].meters) nearby[r.row] = { id: r.id, name: r.name, venueName: r.venue_name, meters };
    }

    const others = await db
      .select({ id: screenImports.id, fileName: screenImports.fileName, rows: screenImports.rows })
      .from(screenImports)
      .where(and(eq(screenImports.state, "draft"), importId ? ne(screenImports.id, importId) : sql`true`));
    const wanted = new Set(keys);
    for (const d of others) {
      for (const r of (d.rows as ImportRow[]) || []) {
        const v = r.values || {};
        const lat = cellText(v.latitude);
        const lng = cellText(v.longitude);
        if (!lat || !lng) continue;
        const k = dedupeKey(cellText(v.venueName), cellText(v.name), lat, lng);
        if (wanted.has(k)) drafts[k] = d.fileName;
      }
    }
  }
  ctx.db = { existing, drafts, nearby };
  return ctx;
}

export function normalizeRows(rows: ImportRow[], ctx: ImportContext): ImportRow[] {
  const fields = importFieldsFor(ctx.registry, ctx.venueType);
  return rows.map((r) => ({ ...r, values: normalizeValues(r.values || {}, fields, ctx) }));
}

export async function checkDraft(draft: Pick<ScreenImport, "id" | "venueType" | "rows">) {
  const rows = draft.rows as ImportRow[];
  const ctx = await buildContext(draft.venueType, rows, draft.id);
  const issues: ImportIssue[] = validateRows(rows, ctx);
  return { issues, summary: summarize(rows, issues) };
}

// ---------- import ----------

export async function commitImport(importId: string, userId: string): Promise<{ count: number } | { error: string; status?: number }> {
  const [draft] = await db.select().from(screenImports).where(eq(screenImports.id, importId));
  if (!draft) return { error: "Import not found", status: 404 };
  if (draft.state !== "draft") return { error: draft.state === "imported" ? "This import was already completed" : "This draft was discarded", status: 409 };

  const rows = draft.rows as ImportRow[];
  const registry = await getMetricRegistry();
  const result = await db.transaction(async (tx) => {
    // one import at a time, so two admins can't insert the same screens together
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('screen_import_commit'))`);
    const ctx = await buildContext(draft.venueType, rows, draft.id, registry);
    const issues = validateRows(rows, ctx);
    const sum = summarize(rows, issues);
    if (sum.blocking > 0) return { error: `${sum.blocking} row(s) still need fixing — nothing was imported.` };

    const values = rows.map((r) => {
      const s = rowToScreen(r, { registry, venueType: draft.venueType }, { ownerId: draft.ownerId, host: draft.host, status: draft.screenStatus, importId: draft.id });
      const derived = deriveVenueFields(s as any);
      return { ...s, ...derived, venueType: draft.venueType } as typeof screens.$inferInsert;
    });
    const created: Array<{ id: string; latitude: string; longitude: string }> = [];
    for (let i = 0; i < values.length; i += 200) {
      const chunk = await tx.insert(screens).values(values.slice(i, i + 200)).returning({ id: screens.id, latitude: screens.latitude, longitude: screens.longitude });
      created.push(...chunk);
    }
    await tx
      .update(screenImports)
      .set({ state: "imported", screenCount: created.length, errorCount: 0, importedAt: new Date(), updatedAt: new Date(), updatedBy: userId })
      .where(eq(screenImports.id, draft.id));
    return { created };
  });
  if ("error" in result) return { error: result.error as string, status: 400 };

  publicCache.invalidatePublicScreens();
  // Auto-tagging (Google Places) one screen at a time in the background
  (async () => {
    for (const s of result.created) {
      const lat = parseFloat(String(s.latitude));
      const lng = parseFloat(String(s.longitude));
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) continue;
      try {
        await generateTagsForScreen(s.id, lat, lng);
      } catch (err) {
        console.error(`[AutoTag] import ${importId} screen ${s.id}:`, err);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
  })();
  return { count: result.created.length };
}
