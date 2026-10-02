// Run: npx tsx --test scripts/tests/venueAttributes.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attributeFacts,
  cardFacts,
  deriveMetrics,
  formatAttributeValue,
  validateCustomAttributes,
  validateVenueAttributes,
  VENUE_ATTRIBUTES,
} from "../../shared/venueAttributes";
import { VENUE_TYPES } from "../../shared/venueTaxonomy";
import { footfallIsEstimate, parseAttributes } from "../venue/parse-attributes";

test("every venue type in the taxonomy has attribute definitions with one required audience field or fact", () => {
  for (const t of VENUE_TYPES) {
    const defs = VENUE_ATTRIBUTES[t.slug];
    assert.ok(defs && defs.length > 0, `${t.slug} has no attributes`);
    assert.ok(defs.some((d) => d.cardPriority !== undefined), `${t.slug} has nothing for cards`);
  }
});

test("Est. residents = flats × 3.5, only when residents is unknown", () => {
  assert.deepEqual(deriveMetrics("apartment", { flats: 660 }).find((m) => m.key === "est_residents")?.value, "2,310");
  assert.equal(deriveMetrics("apartment", { flats: 660, residents: 3000 }).find((m) => m.key === "est_residents"), undefined);
});

test("affluence bands from average flat value, cinema tier and hotel stars", () => {
  const tier = (type: string, attrs: Record<string, any>) => deriveMetrics(type, attrs).find((m) => m.key === "affluence")?.value;
  assert.equal(tier("apartment", { avg_flat_value: 4_000_000 }), "Mid-market"); // ₹40 L
  assert.equal(tier("apartment", { avg_flat_value: 9_000_000 }), "Upper-mid"); // ₹90 L
  assert.equal(tier("apartment", { avg_flat_value: 12_000_000 }), "Premium"); // ₹1.2 Cr
  assert.equal(tier("apartment", { avg_flat_value: 30_000_000 }), "Luxury"); // ₹3 Cr
  assert.equal(tier("cinema_audi", { cinema_tier: "Gold" }), "Upper-mid");
  assert.equal(tier("hotel", { star_rating: "5" }), "Luxury");
  assert.equal(tier("gym", { active_members: 400 }), undefined); // no input → no metric
});

test("seat capacity needs both seats and shows; mall shoppers = monthly ÷ 30", () => {
  assert.equal(deriveMetrics("cinema_audi", { seating_capacity: 162 }).find((m) => m.key === "seat_capacity"), undefined);
  assert.equal(deriveMetrics("cinema_audi", { seating_capacity: 162, shows_per_day: 4 }).find((m) => m.key === "seat_capacity")?.value, "648");
  assert.equal(deriveMetrics("mall", { monthly_footfall: 900_000 }).find((m) => m.key === "daily_shoppers")?.value, "30,000");
});

test("formatting hides zero/empty values and uses Indian units", () => {
  const flats = VENUE_ATTRIBUTES.apartment.find((d) => d.key === "flats")!;
  const value = VENUE_ATTRIBUTES.apartment.find((d) => d.key === "avg_flat_value")!;
  assert.equal(formatAttributeValue(flats, 0), null);
  assert.equal(formatAttributeValue(flats, ""), null);
  assert.equal(formatAttributeValue(value, 12_000_000), "₹1.2 Cr");
  assert.equal(formatAttributeValue(value, 8_500_000), "₹85 L");
});

test("cards show the top-2 filled facts; details show every fact plus Est. metrics", () => {
  const attrs = { flats: 660, avg_flat_value: 12_000_000, towers: 6, lifts: 12 };
  assert.deepEqual(cardFacts("apartment", attrs).map((f) => f.key), ["flats", "avg_flat_value"]);
  const all = attributeFacts("apartment", attrs).map((f) => f.key);
  assert.ok(all.includes("towers") && all.includes("est_residents") && all.includes("affluence"));
  // only derived metrics available → they fill the card line
  assert.deepEqual(cardFacts("cinema_lobby", { cinema_tier: "Platinum" }).map((f) => f.key), ["cinema_tier", "affluence"]);
});

test("validation drops unknown keys, checks ranges and enums", () => {
  const { value, errors } = validateVenueAttributes("apartment", { flats: "1,240", avg_flat_value: -5, hacked: 1, towers: "abc" });
  assert.deepEqual(value, { flats: 1240 });
  assert.equal(errors.length, 2);
  assert.deepEqual(validateVenueAttributes("cinema_audi", { cinema_tier: "Platinum" }).value, { cinema_tier: "Platinum" });
  assert.equal(validateVenueAttributes("cinema_audi", { cinema_tier: "Diamond" }).errors.length, 1);
  assert.deepEqual(validateCustomAttributes([{ label: "Clubhouse members", value: "400", unit: "people" }, { label: "", value: "x" }]).value, [{ label: "Clubhouse members", value: "400", unit: "people" }]);
});

test("description parsers take only explicit numbers, per venue type", () => {
  const blm = parseAttributes("apartment", "Stellar MI Citihomes - residential building lift-lobby digital screen network in Greater Noida. Property spans 6 tower(s) with 12 lift(s) serving 660 flats, avg flat price approx Rs 1.2 Cr. Approximately 3000 residents/users daily.", "32 inch");
  assert.deepEqual(blm.attrs, { flats: 660, towers: 6, lifts: 12, residents: 3000, avg_flat_value: 12_000_000 });
  const audi = parseAttributes("cinema_audi", "PVR FUN CITY MALL, AUDI 3 (NORMAL), Panipat. Seating capacity 162. Cinema category: SILVER. Rate: Rs.2,400", null);
  assert.deepEqual(audi.attrs, { seating_capacity: 162, cinema_tier: "Silver" });
  const lobby = parseAttributes("cinema_lobby", "Cinema Lobby Digital Screen Network at PVR Sangam Chakala. 10 screen(s) in PVR - Gold multiplex.", null);
  assert.deepEqual(lobby.attrs, { cinema_tier: "Gold" });
  const bus = parseAttributes("bus_station", "Est. avg. 44,103 total daily footfall (…) across 410 bus departures/day.", null);
  assert.deepEqual(bus.attrs, { passengers_per_day: 44103, departures_per_day: 410 });
  const billboard = parseAttributes("roadside_billboard", "", "13.1 x 7.3 ft");
  assert.deepEqual(billboard.attrs, { width_ft: 13.1, height_ft: 7.3 });
  // a flat count in a gym description is ignored — gyms don't have flats
  assert.deepEqual(parseAttributes("gym", "Near 1,240 flats", null).attrs, {});
  assert.ok(footfallIsEstimate("Estimated footfall = seating capacity x 4 shows/day (assumption, not measured attendance)"));
  assert.ok(!footfallIsEstimate("Cafe Display Screen"));
});
