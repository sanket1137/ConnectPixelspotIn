// Run: npx tsx --test scripts/tests/screenImport.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculatedValues,
  dedupeKey,
  importFieldsFor,
  normalizeTime,
  normalizeValues,
  rowToScreen,
  summarize,
  validateRows,
  type ImportContext,
  type ImportRow,
} from "../../shared/screenImport";
import { seedRegistry } from "../../shared/venueMetrics";

const cities = { Karnataka: ["Bengaluru", "Mysuru"], Maharashtra: ["Mumbai", "Thane"], Haryana: ["Gurugram"] };
const ctx: ImportContext = { registry: seedRegistry(), venueType: "apartment", cities };

const good = (): Record<string, any> => ({
  name: "Tower A Lift Lobby",
  venueName: "Prestige Lakeside Habitat",
  location: "Varthur Road, Whitefield",
  state: "Karnataka",
  city: "Bengaluru",
  pincode: "560087",
  latitude: "12.934512",
  longitude: "77.745123",
  category: "Lift Display",
  displayFormat: "Portrait",
  resolution: "1080x1920",
  durationPerSlot: "10",
  loopDuration: "120",
  environmentType: "Indoor",
  contentTypesSupported: ["Static Image", "Video"],
  customOperatingHoursStart: "06:00",
  customOperatingHoursEnd: "23:00",
  customOperatingDays: ["Monday", "Tuesday"],
  timeOfDayActivity: ["Morning Rush"],
  trafficType: "Pedestrian",
  avgDailyFootfall: "1200",
  avgDwellTime: "2",
  occupationMix: ["Working Professionals"],
  userIntent: ["Commuting"],
  userMood: ["Rushed"],
  numberOfScreens: "4",
  pricePerDay: "99",
  minBookingDays: "7",
  "m.flats": "420",
  "m.avg_flat_value": "1.5 Cr",
});
const rowsOf = (...vals: Record<string, any>[]): ImportRow[] => vals.map((values, i) => ({ row: i + 3, values }));
const codes = (rows: ImportRow[], c: ImportContext = ctx) => validateRows(rows, c).map((i) => `${i.row}:${i.field}:${i.code}`);

test("a complete row passes", () => {
  assert.deepEqual(validateRows(rowsOf(good()), ctx), []);
});

test("times: 9 AM, 9:30 pm, 24:00, 24 hours", () => {
  assert.equal(normalizeTime("9 AM"), "09:00");
  assert.equal(normalizeTime("9:30 pm"), "21:30");
  assert.equal(normalizeTime("12 am"), "00:00");
  assert.equal(normalizeTime("24:00"), "23:59");
  assert.equal(normalizeTime("24 hours"), "24h");
  assert.equal(normalizeTime("25:00"), null);
  assert.equal(normalizeTime("0.375"), "09:00");
});

test("silent clean-ups: case, Yes/No, resolution, times, 24 hours", () => {
  const fields = importFieldsFor(ctx.registry, "apartment");
  const v = normalizeValues({ ...good(), category: "lift display", environmentType: "INDOOR", city: "bengaluru", resolution: "1080 X 1920", bulkBookingMandatory: "y", customOperatingHoursStart: "24 hours", customOperatingDays: ["tuesday", "Monday"] }, fields, ctx);
  assert.equal(v.category, "Lift Display");
  assert.equal(v.environmentType, "Indoor");
  assert.equal(v.city, "Bengaluru");
  assert.equal(v.resolution, "1080x1920");
  assert.equal(v.bulkBookingMandatory, "Yes");
  assert.deepEqual([v.customOperatingHoursStart, v.customOperatingHoursEnd], ["00:00", "23:59"]);
  assert.deepEqual(v.customOperatingDays, ["Monday", "Tuesday"]);
});

test("dropdown values outside the list are errors with a suggestion", () => {
  const issues = validateRows(rowsOf({ ...good(), trafficType: "Pedestrain", category: "Digital Screen" }), ctx);
  const traffic = issues.find((i) => i.field === "trafficType")!;
  assert.equal(traffic.level, "error");
  assert.deepEqual(traffic.fix?.set, { trafficType: "Pedestrian" });
  assert.ok(issues.some((i) => i.field === "category"));
});

test("required multi-choice groups need at least one Yes; unknown items rejected", () => {
  assert.ok(codes(rowsOf({ ...good(), userMood: [] })).includes("3:userMood:required"));
  assert.ok(codes(rowsOf({ ...good(), userIntent: ["Grocery"] })).includes("3:userIntent:option"));
});

test("city must belong to the state; spelling and alias suggestions", () => {
  const typo = validateRows(rowsOf({ ...good(), city: "Banglore" }), ctx).find((i) => i.field === "city")!;
  assert.deepEqual(typo.fix?.set, { city: "Bengaluru" });
  const alias = validateRows(rowsOf({ ...good(), city: "Bangalore" }), ctx).find((i) => i.field === "city")!;
  assert.deepEqual(alias.fix?.set, { city: "Bengaluru" });
  const other = validateRows(rowsOf({ ...good(), city: "Gurugram" }), ctx).find((i) => i.field === "city")!;
  assert.match(other.message, /Haryana/);
  assert.ok(codes(rowsOf({ ...good(), state: "Karnatka" })).includes("3:state:option"));
});

test("coordinates: swapped, outside India, zero, other state, low precision", () => {
  const swapped = validateRows(rowsOf({ ...good(), latitude: "77.745123", longitude: "12.934512" }), ctx).find((i) => i.code === "swapped")!;
  assert.deepEqual(swapped.fix?.set, { latitude: "12.934512", longitude: "77.745123" });
  assert.ok(codes(rowsOf({ ...good(), latitude: "51.5", longitude: "-0.12" })).includes("3:latitude:outside"));
  assert.ok(codes(rowsOf({ ...good(), latitude: "0" })).includes("3:latitude:zero"));
  const mumbai = validateRows(rowsOf({ ...good(), latitude: "19.0760", longitude: "72.8777" }), ctx);
  assert.equal(mumbai.find((i) => i.code === "state_area")?.level, "warning");
  assert.equal(validateRows(rowsOf({ ...good(), latitude: "12.93", longitude: "77.74" }), ctx).find((i) => i.code === "precision")?.level, "warning");
});

test("pincode format error; pincode from another state is a warning", () => {
  assert.ok(codes(rowsOf({ ...good(), pincode: "56008" })).includes("3:pincode:pincode"));
  assert.equal(validateRows(rowsOf({ ...good(), pincode: "400064" }), ctx).find((i) => i.code === "pin_state")?.level, "warning");
});

test("hours: pair required, same time rejected, overnight is a warning", () => {
  assert.ok(codes(rowsOf({ ...good(), customOperatingHoursEnd: "" })).includes("3:customOperatingHoursEnd:hours_pair"));
  assert.ok(codes(rowsOf({ ...good(), customOperatingHoursEnd: "06:00" })).includes("3:customOperatingHoursEnd:hours_same"));
  assert.equal(validateRows(rowsOf({ ...good(), customOperatingHoursEnd: "02:00" }), ctx)[0]?.level, "warning");
});

test("numbers, loop vs slot, metrics", () => {
  assert.ok(codes(rowsOf({ ...good(), pricePerDay: "99.5" })).includes("3:pricePerDay:int"));
  assert.ok(codes(rowsOf({ ...good(), loopDuration: "5" })).includes("3:loopDuration:loop_lt_slot"));
  assert.ok(codes(rowsOf({ ...good(), "m.flats": "" })).includes("3:m.flats:required"));
  assert.ok(codes(rowsOf({ ...good(), "m.flats": "lots" })).includes("3:m.flats:metric"));
});

test("duplicates: within the file, against saved screens, other drafts, near-duplicates", () => {
  assert.deepEqual(codes(rowsOf(good(), good())).filter((c) => c.endsWith("dup_file")), ["3:row:dup_file", "4:row:dup_file"]);
  const key = dedupeKey("Prestige Lakeside Habitat", "Tower A Lift Lobby", "12.934512", "77.745123");
  const withDb: ImportContext = { ...ctx, db: { existing: { [key]: { id: "s1", name: "Tower A Lift Lobby", venueName: "Prestige Lakeside Habitat" } }, drafts: {}, nearby: {} } };
  assert.ok(codes(rowsOf(good()), withDb).includes("3:row:dup_saved"));
  const draft: ImportContext = { ...ctx, db: { existing: {}, drafts: { [key]: "aek.xlsx" }, nearby: {} } };
  assert.ok(codes(rowsOf(good()), draft).includes("3:row:dup_draft"));
  const near: ImportContext = { ...ctx, db: { existing: {}, drafts: {}, nearby: { 3: { id: "s2", name: "Tower B Lift", venueName: "Prestige Lakeside Habitat", meters: 12 } } } };
  assert.ok(codes(rowsOf(good()), near).includes("3:row:near_dup"));
  assert.deepEqual(validateRows([{ row: 3, values: good(), differentScreen: true }], near), []);
});

test("fingerprint matches the database formula (rounded to 6, cut to 4 decimals)", () => {
  assert.equal(dedupeKey("Cinépolis Lulu Mall!", "Audi 1", "12.96885", "77.6"), "cinpolislulumall|audi1|12.9688|77.6000");
  assert.equal(dedupeKey("A", "B", "12.96889999", "77.1"), "a|b|12.9689|77.1000");
});

test("warnings block until reviewed", () => {
  const rows = rowsOf({ ...good(), customOperatingHoursEnd: "02:00" });
  assert.equal(summarize(rows, validateRows(rows, ctx)).blocking, 1);
  rows[0].warningsOk = true;
  assert.equal(summarize(rows, validateRows(rows, ctx)).blocking, 0);
});

test("row → screen: calculated fields, metrics JSON, venue type", () => {
  const s = rowToScreen(rowsOf(good())[0], ctx, { ownerId: "o1", host: "IND-02-AEK", status: "inactive", importId: "imp1" });
  assert.equal(s.bundlePricePerDay, 396);
  assert.equal(s.isMultiScreen, true);
  assert.equal(s.type, "Lift Display");
  assert.equal(s.size, "1080x1920");
  assert.equal(s.playbackSlotsPerHour, 30);
  assert.equal(s.maxBrandsPerLoop, 12);
  assert.equal(s.operationalHours, JSON.stringify({ start: "06:00", end: "23:00" }));
  assert.deepEqual(s.venueMetrics, { flats: 420, avg_flat_value: 15_000_000 });
  assert.equal(s.venueType, "apartment");
  assert.equal(s.venueCategory, "Apartment");
  assert.equal(s.status, "inactive");
  assert.equal(s.host, "IND-02-AEK");
  assert.deepEqual(calculatedValues({ pricePerDay: "50" }).bundlePricePerDay, 50);
});
