import type { PublicScreen } from "@shared/schema";

/**
 * Sanitizes a Screen object for public/advertiser presentation.
 * Strips internal, administrative, and proprietary supplier fields:
 * - host (partner/supply network identifier)
 * - bundlePricePerDay (internal wholesale pricing)
 * - ownerId (owner UUID)
 * - rejectionReason (admin moderation note)
 * - ownedByAdmin (internal flag)
 * - searchText (internal search index)
 * - dedupeKey (internal duplicate fingerprint)
 * - importId (internal bulk import tracking)
 * - lastTagged* (internal geo-tagging timestamps/coordinates)
 * - images (deprecated duplicate of screenImages)
 */
export function sanitizePublicScreen(screen: any): PublicScreen {
  if (!screen || typeof screen !== "object") return screen;

  // Extract only public/advertiser safe fields
  const {
    ownerId,
    host,
    bundlePricePerDay,
    rejectionReason,
    ownedByAdmin,
    searchText,
    dedupeKey,
    importId,
    lastTaggedAt,
    lastTaggedLatitude,
    lastTaggedLongitude,
    images,
    ...safeFields
  } = screen;

  // Normalize images: if screenImages is missing/empty but legacy images exist, use them
  if (
    (!safeFields.screenImages || safeFields.screenImages.length === 0) &&
    Array.isArray(images) &&
    images.length > 0
  ) {
    safeFields.screenImages = images;
  }

  return safeFields as PublicScreen;
}

/**
 * Batch sanitizes an array of screens for public/advertiser consumption.
 */
export function sanitizePublicScreens(screens: any[]): PublicScreen[] {
  if (!Array.isArray(screens)) return [];
  return screens.map(sanitizePublicScreen);
}
