export function calculateTotalPhysicalScreens(screens: any[]): number {
  return screens.reduce((sum, screen) => {
    if (screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 0) {
      return sum + screen.numberOfScreens;
    }
    return sum + 1;
  }, 0);
}

// Calculate inclusive duration in days (e.g. Oct 11 to Oct 14 = 4 days)
export function calculateInclusiveDays(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): number {
  if (!startDate || !endDate) return 1;
  const s = typeof startDate === "string" ? new Date(startDate) : startDate;
  const e = typeof endDate === "string" ? new Date(endDate) : endDate;
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;

  // Use calendar date midnight to prevent DST or timezone hour skew
  const sDate = new Date(s.getFullYear(), s.getMonth(), s.getDate());
  const eDate = new Date(e.getFullYear(), e.getMonth(), e.getDate());

  const diffMs = eDate.getTime() - sDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

export interface ScreenPricing {
  unitPrice: number;          // Base price for 1 physical screen for 1 day
  totalScreens: number;       // Total physical screens at venue
  requestedScreens: number;   // Quantity chosen (or all if bulk mandatory)
  dailyTotal: number;         // unitPrice * requestedScreens
  isBulkMandatory: boolean;   // True if all screens must be booked
  minBookingDays: number;     // Minimum days required (default 1)
}

// Returns detailed pricing breakdown for a screen listing
export function getScreenPricing(
  screen: any,
  requestedQuantity?: number | null
): ScreenPricing {
  let unitPrice = Number(screen?.pricePerDay) || 0;
  if (screen?.zonePricePerDay && screen?.zoneScreenCount && screen.zoneScreenCount > 0) {
    unitPrice = Math.round(screen.zonePricePerDay / screen.zoneScreenCount);
  }

  const isMulti = Boolean(screen?.isMultiScreen && screen?.numberOfScreens && screen.numberOfScreens > 1);
  const totalScreens = isMulti ? Math.max(1, Number(screen.numberOfScreens)) : 1;
  const isBulkMandatory = isMulti && Boolean(screen?.bulkBookingMandatory);

  let requestedScreens: number;
  if (isBulkMandatory) {
    requestedScreens = totalScreens;
  } else if (requestedQuantity !== undefined && requestedQuantity !== null) {
    const parsed = Math.round(Number(requestedQuantity));
    requestedScreens = isNaN(parsed) ? 1 : Math.min(Math.max(1, parsed), totalScreens);
  } else {
    requestedScreens = 1;
  }

  const dailyTotal = unitPrice * requestedScreens;
  const minBookingDays = Math.max(1, Number(screen?.minBookingDays) || 1);

  return {
    unitPrice,
    totalScreens,
    requestedScreens,
    dailyTotal,
    isBulkMandatory,
    minBookingDays,
  };
}

// Returns the price for a SINGLE physical screen.
// For zone screens, each screen's price is zonePricePerDay / zoneScreenCount.
export function getBasePricePerPhysicalScreen(screen: any): number {
  if (screen?.zonePricePerDay && screen?.zoneScreenCount && screen.zoneScreenCount > 0) {
    return Math.round(screen.zonePricePerDay / screen.zoneScreenCount);
  }
  return Number(screen?.pricePerDay) || 0;
}

// Total price per day for the venue as listed — what actually gets charged for booking it.
export function calculateScreenPricePerDay(screen: any, quantity?: number | null): number {
  return getScreenPricing(screen, quantity).dailyTotal;
}

export function calculateScreenCampaignPrice(screen: any, campaignDays: number, quantity?: number | null): number {
  return calculateScreenPricePerDay(screen, quantity) * Math.max(1, campaignDays);
}

export function getScreenCountDisplay(screen: any): string {
  if (screen?.isMultiScreen && screen?.numberOfScreens && screen.numberOfScreens > 1) {
    return `${screen.numberOfScreens} Screens Network`;
  }
  return "1 Screen";
}



