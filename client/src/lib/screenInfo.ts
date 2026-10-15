import type { Screen } from "@shared/schema";
import { calculateScreenPricePerDay, getScreenPricing } from "@shared/utils";
import { getPlaysPerHour, getVenueFamily, type VenueFamily } from "@shared/venueTypes";
import { getVenueType } from "@shared/venueTaxonomy";

// Family from the canonical venue_type (phase 3); keyword guess only for rows not typed yet
export function screenFamily(s: Screen): VenueFamily {
  const type = getVenueType(s.venueType);
  if (type) return type.family === "mixed" ? "other" : type.family;
  return getVenueFamily({ venueCategory: s.venueCategory, venueName: s.venueName, name: s.name });
}

// "Cinema audi", "Apartment"… — the canonical type label, else the raw category as typed
export function screenTypeLabel(s: Screen): string | null {
  return getVenueType(s.venueType)?.label || (s.venueCategory || "").trim() || null;
}

export function screenPhotos(s: Screen): { screen: string[]; surroundings: string[] } {
  const screen = [...(s.screenImages || []), ...(s.images || [])].filter(Boolean);
  return { screen: Array.from(new Set(screen)), surroundings: (s.surroundingImages || []).filter(Boolean) };
}

export function primaryPhoto(s: Screen): string | null {
  const { screen, surroundings } = screenPhotos(s);
  return screen[0] || surroundings[0] || null;
}

export interface PriceInfo {
  total: number;
  screens: number;
  perScreen: number;
  isBulkMandatory: boolean;
  minDays: number | null;
}

export function priceInfo(s: Screen, override?: number, quantity?: number): PriceInfo {
  const p = getScreenPricing(s, quantity);
  return {
    total: override ?? p.dailyTotal,
    screens: p.requestedScreens,
    perScreen: p.unitPrice,
    isBulkMandatory: p.isBulkMandatory,
    minDays: p.minBookingDays > 1 ? p.minBookingDays : null,
  };
}



// "LED Video Wall · 16 x 9 ft" — size only when it has a number in it ("Not specified" is skipped)
export function formatLine(s: Screen): string | null {
  const bits: string[] = [];
  if (s.category) bits.push(s.category);
  if (s.size && /\d/.test(s.size)) bits.push(s.size);
  return bits.length ? bits.join(" · ") : null;
}

// Locality = first part of the address that isn't the venue name or the city
export function localityLine(s: Screen): string {
  const city = (s.city || "").trim();
  const venue = (s.venueName || "").trim().toLowerCase();
  const parts = (s.location || "")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p.toLowerCase() !== venue && p.toLowerCase() !== city.toLowerCase() && !/^\d{6}$/.test(p));
  const locality = parts.find((p) => !/\d{3,}/.test(p)) || parts[0];
  return [locality, city].filter(Boolean).join(", ");
}

export function footfallValue(s: Screen): number | null {
  return s.avgDailyFootfall && s.avgDailyFootfall > 0 ? s.avgDailyFootfall : null;
}

export function playsPerHour(s: Screen): number | null {
  return getPlaysPerHour(s) ?? (s.playbackSlotsPerHour && s.playbackSlotsPerHour > 0 ? s.playbackSlotsPerHour : null);
}

export function directionsUrl(s: Screen): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("en-IN");
}
