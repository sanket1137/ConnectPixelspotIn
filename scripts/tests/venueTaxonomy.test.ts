// Run: npx tsx --test scripts/tests/venueTaxonomy.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchText,
  matchesSearch,
  parseSearchQuery,
  resolveEnvironmentClass,
  resolveScreenVenueType,
  resolveVenueType,
} from "../../shared/venueTaxonomy";

const familyOf = (raw: string) => resolveVenueType(raw)?.type.family;
const typeOf = (raw: string) => resolveVenueType(raw)?.type.slug;

test("residential spellings all land in the Residential family (Apartment type)", () => {
  for (const raw of ["residential", "Residential", "Residence", "Residential Building", "Residential Society", "Apartment", " apartments "]) {
    assert.equal(familyOf(raw), "residential", raw);
    assert.equal(typeOf(raw), "apartment", raw);
  }
});

test("previously unmapped or mis-mapped types resolve correctly", () => {
  assert.equal(typeOf("Parking"), "parking");
  assert.equal(typeOf("Theater Lobby"), "cinema_lobby");
  assert.equal(typeOf("Theater"), "cinema_audi");
  assert.equal(typeOf("Play Area"), "play_area");
  assert.equal(typeOf("Bill Board"), "roadside_billboard");
  assert.equal(typeOf("Standees"), "standee_network");
  assert.equal(typeOf("Train"), "train_onboard");
  assert.equal(typeOf("Railways"), "railway_station");
  assert.equal(typeOf("Railway Station"), "railway_station"); // was Road Side
  assert.equal(typeOf("Corporate Lobby"), "corporate_office");
  assert.equal(typeOf("Hypermarket"), typeOf("Super market")); // one filter, not two
  assert.equal(typeOf("CAFÉ"), "cafe");
  assert.equal(typeOf("Saloon"), "salon_spa");
  assert.equal(typeOf("Icecream Parlor"), "bakery_dessert");
  assert.equal(familyOf("Play School"), "education");
  assert.equal(familyOf("Music Academy"), "education");
  // reviewed: left untyped on purpose
  assert.equal(resolveVenueType("Theater Company"), null);
  assert.equal(resolveScreenVenueType({ venueCategory: "", venueName: "Ulsoor Lake", name: "Ulsoor Lake Promenade" }), null);
});

test("empty category falls back to the venue/screen name, and only then", () => {
  assert.equal(resolveScreenVenueType({ venueCategory: "", venueName: "MG Road Metro" })?.type.slug, "metro");
  assert.equal(resolveScreenVenueType({ venueCategory: "", venueName: "Brigade Road Junction" })?.method, "name");
  // a filled category wins over whatever the name suggests
  assert.equal(resolveScreenVenueType({ venueCategory: "Gym", venueName: "Metro Fitness" })?.type.slug, "gym");
  // empty environment: Outdoor-family types count as outdoor
  assert.equal(resolveEnvironmentClass(null, "junction"), "outdoor");
  assert.equal(resolveEnvironmentClass(null, "gym"), null);
});

test("Outdoor environment = Outdoor + Outdoor Digital + Semi-Outdoor (any case)", () => {
  for (const raw of ["Outdoor", "Outdoor Digital", "Semi-Outdoor", "semi outdoor", "OUTDOOR DIGITAL"]) {
    assert.equal(resolveEnvironmentClass(raw), "outdoor", raw);
  }
  for (const raw of ["Indoor", "indoor", " INDOOR "]) assert.equal(resolveEnvironmentClass(raw), "indoor", raw);
  assert.equal(resolveEnvironmentClass(""), null);
});

const pvrKoramangala = buildSearchText({
  venueName: "PVR Forum Mall",
  name: "PVR - Lobby - Forum Mall Koramangala",
  location: "Hosur Road, Koramangala",
  city: "Bengaluru",
  state: "Karnataka",
  host: "IND-01-SOX",
  venueCategory: "Cinema",
});
const rsbStore = buildSearchText({
  venueName: "Noida Logix City Center",
  name: "Noida Logix City Center - FRDL",
  location: "Sector 32, Noida",
  city: "Noida",
  host: "IND-07-RSB",
  venueCategory: "Retail Store",
});
const gym = buildSearchText({ venueName: "Viva Fitness", name: "Viva Fitness", city: "Bengaluru", venueCategory: "Gym" });

test('"pvr koramangala" — every word must match', () => {
  const q = parseSearchQuery("pvr koramangala");
  assert.deepEqual(q.terms.map((t) => t.text), ["pvr", "koramangala"]);
  assert.ok(matchesSearch(pvrKoramangala, q));
  assert.ok(!matchesSearch(rsbStore, q));
  assert.ok(!matchesSearch(pvrKoramangala, parseSearchQuery("pvr noida")));
});

test('"IND-07-RSB" finds screens by network code', () => {
  const q = parseSearchQuery("IND-07-RSB");
  assert.ok(matchesSearch(rsbStore, q));
  assert.ok(!matchesSearch(pvrKoramangala, q));
});

test('"gym" matches gyms and switches on the Lifestyle family', () => {
  const q = parseSearchQuery("gym");
  assert.deepEqual(q.families, ["lifestyle"]);
  assert.ok(matchesSearch(gym, q, "gym"));
  assert.ok(!matchesSearch(pvrKoramangala, q, "cinema_lobby"));
  // a gym typed as "Fitness" still matches "gym" via its type
  assert.ok(matchesSearch(buildSearchText({ venueName: "V Tone", venueCategory: "Fitness" }), q, "gym"));
});

test('multi-word type phrases stay together ("bus stop") and accents are ignored ("café")', () => {
  const q = parseSearchQuery("bus stop whitefield");
  assert.deepEqual(q.families, ["transit"]);
  assert.ok(q.terms.some((t) => t.text === "bus stop"));
  assert.deepEqual(parseSearchQuery("Café").terms.map((t) => t.text), ["cafe"]);
});

test("type words match by venue type, but aliases don't leak into other searches", () => {
  const store = buildSearchText({ venueName: "Dattani Village", city: "Vasai", venueCategory: "Retail Store" });
  // "pet" is not a type word and not in this store's text → no match (aliases aren't copied into search text)
  assert.ok(!matchesSearch(store, parseSearchQuery("pet"), "retail_store"));
  // "hoarding" is a Roadside billboard alias → matches billboards even when the word isn't in their text
  const billboard = buildSearchText({ venueName: "Tambaram Main Road", city: "Chennai", venueCategory: "Roadside" });
  assert.ok(matchesSearch(billboard, parseSearchQuery("hoarding"), "roadside_billboard"));
  assert.ok(!matchesSearch(store, parseSearchQuery("hoarding"), "retail_store"));
});
