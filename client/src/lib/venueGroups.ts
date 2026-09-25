import type { Screen } from "@shared/schema";
import { calculateScreenPricePerDay } from "@shared/utils";
import { getVenueFamily, type VenueFamily } from "@shared/venueTypes";

export type ListedScreen = Screen & { distanceKm?: number };

// One pin on the map = every listing at (practically) the same spot. Coordinates are rounded to
// 4 decimals (~11 m) so a PVR lobby network and the audi screens in the same cinema share one pin,
// even when vendors typed the venue name differently.
export interface VenueGroup {
  key: string;
  lat: number;
  lng: number;
  name: string;
  otherNames: string[];
  city: string;
  address: string;
  family: VenueFamily;
  venueCategory: string;
  listings: ListedScreen[];
  packages: ListedScreen[]; // one booking covers several screens
  singles: ListedScreen[]; // one booking = one screen
  totalScreens: number;
  minPrice: number;
  image: string | null;
  distanceKm?: number;
}

export function screenCount(screen: Screen): number {
  return screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 1 ? screen.numberOfScreens : 1;
}

export function isPackage(screen: Screen): boolean {
  return screenCount(screen) > 1;
}

export function venueKeyFor(screen: Screen): string | null {
  const lat = parseFloat(String(screen.latitude));
  const lng = parseFloat(String(screen.longitude));
  if (isNaN(lat) || isNaN(lng)) return null;
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  let best = values[0] || "";
  let bestCount = 0;
  counts.forEach((c, v) => {
    if (c > bestCount || (c === bestCount && v.length < best.length)) {
      best = v;
      bestCount = c;
    }
  });
  return best;
}

export function groupScreensByVenue(screens: ListedScreen[]): VenueGroup[] {
  const buckets = new Map<string, ListedScreen[]>();
  const order: string[] = [];
  for (const s of screens) {
    const key = venueKeyFor(s);
    if (!key) continue;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(s);
  }

  return order.map((key) => {
    const listings = buckets.get(key)!;
    const names = listings.map((l) => (l.venueName || l.name || "").trim()).filter(Boolean);
    const distinctNames = Array.from(new Set(names.map((n) => n.toLowerCase())));
    // Several unrelated venues typed with the same coordinates — don't pretend they're one venue
    const mixed = distinctNames.length >= 4;
    const name = mixed ? `${distinctNames.length} venues at this spot` : mostCommon(names) || "Venue";
    const otherNames = mixed ? [] : Array.from(new Set(names.filter((n) => n.toLowerCase() !== name.toLowerCase())));
    const first = listings[0];
    const venueCategory = mostCommon(listings.map((l) => l.venueCategory).filter(Boolean)) || "";
    const packages = listings.filter(isPackage).sort((a, b) => screenCount(b) - screenCount(a));
    const singles = listings
      .filter((l) => !isPackage(l))
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { numeric: true, sensitivity: "base" }));
    const prices = listings.map((l) => calculateScreenPricePerDay(l)).filter((p) => p > 0);
    const withImage = listings.find((l) => l.screenImages?.[0] || l.surroundingImages?.[0] || l.images?.[0]);
    const distances = listings.map((l) => l.distanceKm).filter((d): d is number => typeof d === "number");
    const [latStr, lngStr] = key.split(",");
    return {
      key,
      lat: parseFloat(latStr),
      lng: parseFloat(lngStr),
      name,
      otherNames,
      city: first.city,
      address: first.location,
      family: getVenueFamily({ venueCategory, venueName: name, name: first.name }),
      venueCategory,
      listings,
      packages,
      singles,
      totalScreens: listings.reduce((sum, l) => sum + screenCount(l), 0),
      minPrice: prices.length ? Math.min(...prices) : 0,
      image: withImage ? (withImage.surroundingImages?.[0] || withImage.screenImages?.[0] || withImage.images?.[0] || null) : null,
      distanceKm: distances.length ? Math.min(...distances) : undefined,
    };
  });
}

// Listing names are often "<Venue> <City> - <Placement>" — show just the part that tells the
// advertiser which screen this is.
export function shortListingName(screen: Screen, venueName: string): string {
  const name = (screen.name || "").trim();
  const parts = name.split(/\s+[-–|]\s+/);
  if (parts.length > 1) {
    const tail = parts.slice(1).join(" – ").trim();
    if (tail) return tail;
  }
  if (venueName && name.toLowerCase().startsWith(venueName.toLowerCase()) && name.length > venueName.length + 2) {
    return name.slice(venueName.length).replace(/^[\s,:-]+/, "");
  }
  return name || screen.category || "Screen";
}

export function formatRupees(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function formatRupeesShort(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `₹${Math.round(n)}`;
}
