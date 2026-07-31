export function calculateTotalPhysicalScreens(screens: any[]): number {
  return screens.reduce((sum, screen) => {
    if (screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 0) {
      return sum + screen.numberOfScreens;
    }
    return sum + 1;
  }, 0);
}

// Returns the price for a SINGLE physical screen.
// If bulkBookingMandatory is true, the DB pricePerDay is the bundle price, 
// so we divide by the number of screens to get the per-screen price.
export function getBasePricePerPhysicalScreen(screen: any): number {
  const price = screen.pricePerDay || 0;
  if (screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 0) {
    if (screen.bulkBookingMandatory) {
      return price / screen.numberOfScreens;
    }
  }
  return price;
}

// Total price per day for the venue (all selected physical screens)
export function calculateScreenPricePerDay(screen: any): number {
  const physicalScreens = calculateTotalPhysicalScreens([screen]);
  return getBasePricePerPhysicalScreen(screen) * physicalScreens;
}

export function calculateScreenCampaignPrice(screen: any, campaignDays: number): number {
  return calculateScreenPricePerDay(screen) * campaignDays;
}

export function getScreenCountDisplay(screen: any): string {
  if (screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 1) {
    return `${screen.numberOfScreens} Screens`;
  }
  return "1 Screen";
}


