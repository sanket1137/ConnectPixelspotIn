import type { VenueGroup } from "@/lib/venueGroups";

export interface MapViewport {
  zoom: number;
  bounds: { north: number; south: number; east: number; west: number } | null;
}

function inBounds(v: VenueGroup, b: MapViewport["bounds"]): boolean {
  if (!b) return true;
  // pad by ~20% so pins don't pop in at the edges while panning
  const padLat = (b.north - b.south) * 0.2;
  const padLng = (b.east - b.west) * 0.2;
  const withinLng = b.west <= b.east ? v.lng >= b.west - padLng && v.lng <= b.east + padLng : v.lng >= b.west - padLng || v.lng <= b.east + padLng;
  return v.lat >= b.south - padLat && v.lat <= b.north + padLat && withinLng;
}

// Venues in (or near) the visible map area. Every venue keeps its own pin — nothing is merged —
// but pins far off-screen aren't drawn, so thousands of results don't freeze the map.
export function venuesInView(venues: VenueGroup[], viewport: MapViewport): VenueGroup[] {
  return venues.filter((v) => inBounds(v, viewport.bounds));
}
