import { resolveScreenVenueType } from "@shared/venueTaxonomy";
import { validateCustomAttributes, validateVenueAttributes } from "@shared/venueAttributes";

// Venue-specific details on screen create/edit: checked against the screen's venue type (from the
// submitted category, else the saved one). Unknown keys are dropped; bad numbers/options → error.
// Mutates body to the cleaned values; returns an error message (for a 400) or null.
export function cleanVenueDetails(
  body: Record<string, any>,
  existing?: { venueCategory?: string | null; venueName?: string | null; name?: string | null }
): string | null {
  const errors: string[] = [];
  if (body.venueAttributes !== undefined) {
    const venueType = resolveScreenVenueType({
      venueCategory: body.venueCategory ?? existing?.venueCategory,
      venueName: body.venueName ?? existing?.venueName,
      name: body.name ?? existing?.name,
    })?.type.slug ?? null;
    const attrs = validateVenueAttributes(venueType, body.venueAttributes);
    errors.push(...attrs.errors);
    body.venueAttributes = attrs.value;
  }
  if (body.customAttributes !== undefined) {
    const custom = validateCustomAttributes(body.customAttributes);
    errors.push(...custom.errors);
    body.customAttributes = custom.value;
  }
  return errors.length ? `Venue details: ${errors.join("; ")}` : null;
}
