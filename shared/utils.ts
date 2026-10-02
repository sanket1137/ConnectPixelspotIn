export function calculateTotalPhysicalScreens(screens: any[]): number {
  return screens.reduce((sum, screen) => {
    if (screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 0) {
      return sum + screen.numberOfScreens;
    }
    return sum + 1;
  }, 0);
}

// Returns the price for a SINGLE physical screen.
// bulkBookingMandatory=true means the venue must be booked as a whole, so pricePerDay
// is the per-screen rate and the bundle spans numberOfScreens screens. Otherwise the
// venue is priced and booked as the single listed unit pricePerDay describes, regardless
// of how many physical screens happen to be installed there.
export function getBasePricePerPhysicalScreen(screen: any): number {
  return screen.pricePerDay || 0;
}

// Total price per day for the venue as listed — what actually gets charged for booking it.
export function calculateScreenPricePerDay(screen: any, quantity?: number): number {
  const price = Number(screen?.pricePerDay) || 0;
  if (screen?.isMultiScreen && screen?.numberOfScreens && screen.numberOfScreens > 1 && screen.bulkBookingMandatory) {
    return price * screen.numberOfScreens;
  }
  const qty = quantity && quantity >= 1 ? quantity : 1;
  return price * qty;
}

export function calculateScreenCampaignPrice(screen: any, campaignDays: number, quantity?: number): number {
  return calculateScreenPricePerDay(screen, quantity) * campaignDays;
}

export function getScreenCountDisplay(screen: any): string {
  if (screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 1) {
    return `${screen.numberOfScreens} Screens`;
  }
  return "1 Screen";
}


