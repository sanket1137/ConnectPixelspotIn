export function calculateTotalPhysicalScreens(screens: any[]): number {
  return screens.reduce((sum, screen) => {
    if (screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 0) {
      return sum + screen.numberOfScreens;
    }
    return sum + 1;
  }, 0);
}

// Returns the price for a SINGLE physical screen.
// For zone screens, each screen's price is zonePricePerDay / zoneScreenCount.
export function getBasePricePerPhysicalScreen(screen: any): number {
  if (screen?.zonePricePerDay && screen?.zoneScreenCount && screen.zoneScreenCount > 0) {
    return screen.zonePricePerDay / screen.zoneScreenCount;
  }
  return screen?.pricePerDay || 0;
}

// Total price per day for the venue as listed — what actually gets charged for booking it.
export function calculateScreenPricePerDay(screen: any, quantity?: number): number {
  let price = Number(screen?.pricePerDay) || 0;
  if (screen?.zonePricePerDay && screen?.zoneScreenCount && screen.zoneScreenCount > 0) {
    price = screen.zonePricePerDay / screen.zoneScreenCount;
  }
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


