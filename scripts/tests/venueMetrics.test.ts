// Run: npx tsx --test scripts/tests/venueMetrics.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cardMetricFacts,
  cleanMetricValue,
  deriveMetrics,
  formatMetricValue,
  metricFacts,
  metricKeyFromLabel,
  metricsFor,
  parseIndianNumber,
  seedRegistry,
  validateVenueMetrics,
  type MetricDef,
} from "../../shared/venueMetrics";
import { VENUE_TYPES } from "../../shared/venueTaxonomy";
import { footfallIsEstimate, parseAttributes } from "../venue/parse-attributes";

const reg = seedRegistry();

test("every venue type has seed metrics, something for the card, and per-day audience keys", () => {
  for (const t of VENUE_TYPES) {
    const defs = metricsFor(reg, t.slug);
    assert.ok(defs.length > 0, `${t.slug} has no metrics`);
    assert.ok(defs.some((d) => d.showOnCard), `${t.slug} has nothing for cards`);
    assert.ok(defs.filter((d) => d.showOnCard).length <= 2, `${t.slug} has more than 2 card metrics`);
    assert.ok(!defs.some((d) => /monthly_footfall|weekly_admits/.test(d.key)), `${t.slug} still has a non-daily audience key`);
  }
});

test("residents = flats × 3.5 only when residents is unknown", () => {
  assert.equal(deriveMetrics("apartment", { flats: 660 }).find((m) => m.key === "est_residents")?.value, "2,310");
  assert.equal(deriveMetrics("apartment", { flats: 660, residents: 3000 }).find((m) => m.key === "est_residents"), undefined);
});

test("affluence bands from average flat value, cinema tier and hotel stars", () => {
  const tier = (type: string, m: Record<string, any>) => deriveMetrics(type, m).find((x) => x.key === "affluence")?.value;
  assert.equal(tier("apartment", { avg_flat_value: 4_000_000 }), "Mid-market");
  assert.equal(tier("apartment", { avg_flat_value: 30_000_000 }), "Luxury");
  assert.equal(tier("cinema_audi", { cinema_tier: "7 Star" }), "Luxury");
  assert.equal(tier("hotel", { star_rating: "4" }), "Premium");
});

test("Indian amounts: 85L, 1.2 Cr, 1,20,00,000, ₹ 4,500", () => {
  assert.equal(parseIndianNumber("85L"), 8_500_000);
  assert.equal(parseIndianNumber("1.2 Cr"), 12_000_000);
  assert.equal(parseIndianNumber("1,20,00,000"), 12_000_000);
  assert.equal(parseIndianNumber("₹ 4,500"), 4_500);
  assert.equal(parseIndianNumber("lots"), null);
});

test("formatting hides empty / zero values; multi and yes/no read naturally", () => {
  const num: MetricDef = { key: "x", label: "X", kind: "number", sortOrder: 0, active: true };
  assert.equal(formatMetricValue(num, 0), null);
  assert.equal(formatMetricValue(num, ""), null);
  assert.equal(formatMetricValue({ ...num, kind: "currency" }, 12_000_000), "₹1.2 Cr");
  assert.equal(formatMetricValue({ ...num, kind: "multi" }, ["Wedding", "Corporate"]), "Wedding, Corporate");
  assert.equal(formatMetricValue({ ...num, kind: "boolean" }, true), "Yes");
});

test("value cleaning per kind", () => {
  const pick: MetricDef = { key: "tier", label: "Tier", kind: "enum", options: ["Gold", "Luxe"], sortOrder: 0, active: true };
  assert.deepEqual(cleanMetricValue(pick, "gold"), { value: "Gold" });
  assert.ok(cleanMetricValue(pick, "Bronze").error);
  const multi: MetricDef = { ...pick, kind: "multi" };
  assert.deepEqual(cleanMetricValue(multi, "luxe, Gold, gold"), { value: ["Luxe", "Gold"] });
  const yn: MetricDef = { ...pick, kind: "boolean" };
  assert.deepEqual(cleanMetricValue(yn, "Yes"), { value: true });
  const n: MetricDef = { key: "flats", label: "Flats", kind: "number", min: 0, max: 100, sortOrder: 0, active: true };
  assert.ok(cleanMetricValue(n, "500").error);
});

test("validation keeps values of keys the type doesn't ask for (hidden / other type)", () => {
  const r = seedRegistry();
  r.apartment = r.apartment.map((d) => (d.key === "towers" ? { ...d, active: false } : d));
  const res = validateVenueMetrics(r, "apartment", { flats: "1,200", unknown_key: 5 }, { towers: 6, seating_capacity: 300, flats: 900 });
  assert.deepEqual(res.errors, []);
  assert.deepEqual(res.value, { towers: 6, seating_capacity: 300, flats: 1200 });
  assert.ok(validateVenueMetrics(r, "apartment", { flats: "lots" }).errors[0].startsWith("Flats"));
});

test("cards: filled show-on-card metrics first, max 2; hidden metrics never shown", () => {
  const r = seedRegistry();
  assert.deepEqual(cardMetricFacts(r, "apartment", { flats: 660, avg_flat_value: 12_000_000, towers: 4 }).map((f) => f.key), ["flats", "avg_flat_value"]);
  r.apartment = r.apartment.map((d) => (d.key === "towers" ? { ...d, active: false } : d));
  assert.ok(!metricFacts(r, "apartment", { towers: 4 }).some((f) => f.key === "towers"));
});

test("metric keys from labels", () => {
  assert.equal(metricKeyFromLabel("Avg flat value (₹)"), "avg_flat_value");
  assert.equal(metricKeyFromLabel("  Clubhouse members  "), "clubhouse_members");
});

test("description parsers take only explicit numbers, per venue type", () => {
  assert.equal(parseAttributes("apartment", "Premium society with 660 flats", null).attrs.flats, 660);
  assert.equal(parseAttributes("cinema_audi", "Premium society with 660 flats", null).attrs.flats, undefined);
  assert.equal(footfallIsEstimate("Estimated footfall based on assumption"), true);
  assert.equal(footfallIsEstimate("Busy lobby"), false);
});
