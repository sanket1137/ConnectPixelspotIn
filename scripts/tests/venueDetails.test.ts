// Run: npx tsx --test scripts/tests/venueDetails.test.ts
// Server-side check applied by POST /api/owner/screens, POST /api/admin/screens/create and
// PATCH /api/owner/screens/:id.
import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanVenueDetails } from "../../server/venueDetails";

test("valid details are cleaned against the venue type and kept", () => {
  const body: Record<string, any> = {
    venueCategory: "Residential Building",
    venueAttributes: { flats: "1,240", avg_flat_value: 12000000, not_a_field: 5 },
    customAttributes: [{ label: "Clubhouse members", value: "400", unit: "people" }, { label: "", value: "x" }],
  };
  assert.equal(cleanVenueDetails(body), null);
  assert.deepEqual(body.venueAttributes, { flats: 1240, avg_flat_value: 12000000 });
  assert.deepEqual(body.customAttributes, [{ label: "Clubhouse members", value: "400", unit: "people" }]);
});

test("bad numbers / options are rejected with a readable message", () => {
  const err = cleanVenueDetails({ venueCategory: "Cinema audi", venueAttributes: { seating_capacity: -3, cinema_tier: "Diamond" } });
  assert.match(err ?? "", /^Venue details: Seats can't be below 0; Cinema tier must be one of/);
});

test("an edit without a category uses the saved screen's venue type", () => {
  const body: Record<string, any> = { venueAttributes: { employees: 500, flats: 10 } };
  assert.equal(cleanVenueDetails(body, { venueCategory: "Coworking Space" }), null);
  assert.deepEqual(body.venueAttributes, { employees: 500 }); // flats isn't a coworking field
});

test("requests without venue details are left alone", () => {
  const body: Record<string, any> = { name: "x", pricePerDay: 100 };
  assert.equal(cleanVenueDetails(body), null);
  assert.deepEqual(body, { name: "x", pricePerDay: 100 });
});
