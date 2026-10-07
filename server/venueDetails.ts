import { resolveScreenVenueType } from "@shared/venueTaxonomy";
import { validateVenueMetrics, type VenueMetrics } from "@shared/venueMetrics";
import { getMetricRegistry } from "./venueMetricDefinitions";

// Venue metrics on screen create/edit: checked against the screen's venue type (from the submitted
// category, else the saved one) using the admin-managed definitions. Values of keys this type doesn't ask
// for (hidden metrics, or another venue type's) are kept from the saved screen. Bad numbers/options → error.
// Mutates body to the cleaned values; returns an error message (for a 400) or null.
export async function cleanVenueDetails(
  body: Record<string, any>,
  existing?: { venueCategory?: string | null; venueName?: string | null; name?: string | null; venueMetrics?: VenueMetrics | null }
): Promise<string | null> {
  delete body.customAttributes; // retired: admins add proper metric keys instead
  delete body.dedupeKey; // generated column
  if (body.venueMetrics === undefined) return null;
  const venueType =
    resolveScreenVenueType({
      venueCategory: body.venueCategory ?? existing?.venueCategory,
      venueName: body.venueName ?? existing?.venueName,
      name: body.name ?? existing?.name,
    })?.type.slug ?? null;
  const res = validateVenueMetrics(await getMetricRegistry(), venueType, body.venueMetrics, existing?.venueMetrics ?? {});
  body.venueMetrics = res.value;
  return res.errors.length ? `Venue details: ${res.errors.join("; ")}` : null;
}
