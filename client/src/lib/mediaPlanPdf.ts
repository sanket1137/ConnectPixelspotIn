// ============================================================
// Pixelspot Media Proposal PDF / Print Utility
// Implements Pixelspot Media Proposal — Structure Brief:
// Page 1: Overview (Cover Scope + At-a-glance KPIs + Category Brief) — Scope only, NO PRICING
// Page 2+: Venue-by-Venue Details (Reference Image + Table per Category with Subtotals & Financials)
// Final Page/Section: Campaign Execution Terms, Contact Details & CTA, and Company Footer
// Contact Details: Jagpreet Singh | +91 77608 07137 | jagpreet@pixelspot.in | www.pixelspot.in
// ============================================================

import type { Screen } from "@shared/schema";

export interface MediaPlanPdfData {
  plan: {
    name: string;
    clientBrand: string;
    startDate: string;
    endDate: string;
    notes?: string | null;
    agencyMargin: number; // used in calculation, NOT printed in sections 1-3
    agencyName: string;
  };
  items: Array<{
    screenName: string;
    venueName: string;
    city: string;
    state?: string | null;
    location: string;
    venueCategory: string;
    environmentType: string;
    category: string;
    days: number;
    pricePerDay: number; // net
    totalPrice: number; // net
    notes?: string | null;
    screen?: Partial<Screen>;
  }>;
}

function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCategoryName(item: MediaPlanPdfData["items"][0]): string {
  const raw =
    item.venueCategory ||
    item.category ||
    item.screen?.venueCategory ||
    item.screen?.category ||
    "Other";
  if (!raw) return "Other";
  const trimmed = raw.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

// ONLY Outdoor requires venue-by-venue screen photos.
// Cinema, Multiplex, Apartments, Malls, Cafes, etc. use 1 representative sample photo.
function isVenueWiseImageCategory(categoryName: string): boolean {
  const lower = categoryName.toLowerCase();
  return (
    lower.includes("outdoor") ||
    lower.includes("billboard") ||
    lower.includes("unipole") ||
    lower.includes("hoarding") ||
    lower.includes("gantry") ||
    lower.includes("bus stop") ||
    lower.includes("flyover") ||
    lower.includes("highway") ||
    lower.includes("road junction") ||
    lower.includes("road side")
  );
}

function resolveImageSrc(src?: string | null): string | null {
  if (!src) return null;
  if (typeof src !== "string") return null;
  const trimmed = src.trim();
  if (
    !trimmed ||
    trimmed === "null" ||
    trimmed === "undefined" ||
    trimmed === "none" ||
    trimmed === "n/a" ||
    trimmed === "N/A" ||
    trimmed === "[]" ||
    trimmed === "{}"
  ) {
    return null;
  }
  if (trimmed.startsWith("/")) {
    return `${window.location.origin}${trimmed}`;
  }
  return trimmed;
}

function getValidScreenImageUrl(screen?: Partial<Screen>): string | null {
  if (!screen) return null;
  const candidates: Array<string | null | undefined> = [
    screen.screenImages?.[0],
    screen.images?.[0],
    (screen as any)?.imageUrl,
    (screen as any)?.thumbnailUrl,
  ];
  for (const cand of candidates) {
    const resolved = resolveImageSrc(cand);
    if (resolved) return resolved;
  }
  return null;
}

// Fetch screen size directly from screen.size field
function getScreenSize(screen?: Partial<Screen>): string {
  if (!screen) return "Confirmed at booking";
  const size = screen.size?.trim();
  if (size && size !== "Standard" && size !== "N/A" && size !== "null") {
    return size;
  }
  return "Confirmed at booking";
}

export function printMediaPlan(data: MediaPlanPdfData) {
  const { plan, items } = data;
  const marginMultiplier = 1 + plan.agencyMargin / 100;

  // Global aggregate metrics
  const totalPhysicalScreens = items.reduce((sum, item) => {
    const s = item.screen;
    const count =
      s?.isMultiScreen && s?.numberOfScreens && s.numberOfScreens > 0
        ? s.numberOfScreens
        : 1;
    return sum + count;
  }, 0);

  const totalVenues = items.length;

  const totalFootfall = items.reduce((sum, item) => {
    const footfall = item.screen?.avgDailyFootfall || 0;
    return sum + footfall;
  }, 0);

  const totalNet = items.reduce((s, i) => s + i.totalPrice, 0);
  const grandTotal = Math.round(totalNet * marginMultiplier);

  // Group items by inventory category
  const categoryMap = new Map<
    string,
    {
      categoryName: string;
      items: typeof items;
      venueCount: number;
      screenCount: number;
      footfallCount: number;
      categorySubtotal: number;
      isVenueWiseImages: boolean;
    }
  >();

  for (const item of items) {
    const catName = getCategoryName(item);
    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, {
        categoryName: catName,
        items: [],
        venueCount: 0,
        screenCount: 0,
        footfallCount: 0,
        categorySubtotal: 0,
        isVenueWiseImages: isVenueWiseImageCategory(catName),
      });
    }
    const group = categoryMap.get(catName)!;
    group.items.push(item);
    group.venueCount += 1;
    const s = item.screen;
    const screenCnt =
      s?.isMultiScreen && s?.numberOfScreens && s.numberOfScreens > 0
        ? s.numberOfScreens
        : 1;
    group.screenCount += screenCnt;
    group.footfallCount += s?.avgDailyFootfall || 0;
    group.categorySubtotal += Math.round(item.totalPrice * marginMultiplier);
  }

  const categoryGroups = Array.from(categoryMap.values());
  const categoryNamesList = categoryGroups.map((g) => g.categoryName).join(", ");

  // --------------------------------------------------------------------------
  // SECTION 3 HTML — Category-Wise Brief Summary
  // --------------------------------------------------------------------------
  const categoryBriefHtml = categoryGroups
    .map((g) => {
      const sampleItem =
        g.items.find(
          (i) => i.screen?.screenImages?.[0] || i.screen?.images?.[0]
        ) || g.items[0];
      const screenSize = getScreenSize(sampleItem?.screen);

      return `
      <div class="brief-card">
        <div class="brief-info-col">
          <div class="brief-category-header">
            <span class="brief-category-title">${g.categoryName}</span>
            <span class="brief-size-badge">Screen Size: ${screenSize}</span>
          </div>
          <div class="brief-summary">
            <strong>${g.venueCount} venue${g.venueCount !== 1 ? "s" : ""}</strong>, 
            <strong>${g.screenCount} screen${g.screenCount !== 1 ? "s" : ""}</strong>
            ${
              g.footfallCount > 0
                ? `, <strong>${g.footfallCount.toLocaleString("en-IN")}</strong> daily footfall target`
                : ""
            }.
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  // --------------------------------------------------------------------------
  // SECTION 4 HTML — Category Blocks with Reference Image FIRST, then Venue Table
  // --------------------------------------------------------------------------
  let categorySectionsHtml = "";

  for (const group of categoryGroups) {
    // 1. Reference Image(s) HTML for this Category
    let referenceImagesHtml = "";

    if (group.isVenueWiseImages) {
      // Outdoor: Venue-wise screen photos FIRST (ONLY render cards with valid images)
      const itemsWithImages = group.items.filter((item) => {
        return !!getValidScreenImageUrl(item.screen);
      });

      if (itemsWithImages.length > 0) {
        const venuePhotoCards = itemsWithImages
          .map((item) => {
            const imageSrc = getValidScreenImageUrl(item.screen)!;
            const screenSize = getScreenSize(item.screen);

            return `
              <div class="outdoor-photo-card">
                <div class="category-reference-header">
                  <div>
                    <span class="photo-tag venue-tag">Outdoor Site Reference</span>
                    <div class="category-reference-title">${item.venueName || item.screenName}</div>
                    <div style="font-size: 11px; color: #64748b;">${item.city}${item.location ? `, ${item.location}` : ""}</div>
                  </div>
                  <div class="category-reference-meta">Screen Size: ${screenSize}</div>
                </div>
                <div class="big-photo-wrapper">
                  <img src="${imageSrc}" alt="${item.screenName}" onerror="var card=this.closest('.outdoor-photo-card'); if(card) card.remove();" onload="if(this.naturalWidth===0){var card=this.closest('.outdoor-photo-card'); if(card) card.remove();}" />
                </div>
              </div>
            `;
          })
          .join("");

        referenceImagesHtml = `<div class="outdoor-photos-grid">${venuePhotoCards}</div>`;
      } else {
        referenceImagesHtml = "";
      }
    } else {
      // Standard Categories (Apartments, Malls, Cinema, Coworking, Tech Parks, Cafes, etc.):
      // 1 Full-Width Reference Screen Photo ONLY if an image exists
      const itemWithImage = group.items.find((i) => {
        return !!getValidScreenImageUrl(i.screen);
      });

      if (itemWithImage) {
        const imageSrc = getValidScreenImageUrl(itemWithImage.screen)!;
        const screenSize = getScreenSize(itemWithImage.screen);

        referenceImagesHtml = `
          <div class="category-reference-container">
            <div class="category-reference-header">
              <div>
                <span class="photo-tag">Category Representative Reference Screen</span>
                <div class="category-reference-title">${group.categoryName} Inventory Setup</div>
                <div style="font-size: 11px; color: #64748b;">Representative display format across ${group.venueCount} venues (${group.screenCount} screens)</div>
              </div>
              <div class="category-reference-meta">Screen Size: ${screenSize}</div>
            </div>
            <div class="big-photo-wrapper">
              <img src="${imageSrc}" alt="${group.categoryName}" onerror="var card=this.closest('.category-reference-container'); if(card) card.remove();" onload="if(this.naturalWidth===0){var card=this.closest('.category-reference-container'); if(card) card.remove();}" />
            </div>
          </div>
        `;
      } else {
        referenceImagesHtml = "";
      }
    }

    // 2. Table Rows HTML for this Category
    let categoryTableRows = "";
    for (const item of group.items) {
      const clientTotal = Math.round(item.totalPrice * marginMultiplier);
      const s = item.screen || {};
      const screenCnt =
        s.isMultiScreen && s.numberOfScreens && s.numberOfScreens > 0
          ? s.numberOfScreens
          : 1;

      const venueName = item.venueName || item.screenName || "Confirmed at booking";
      const locationArea = `${item.city || ""}${
        item.location ? `, ${item.location}` : ""
      }`.trim() || "Confirmed at booking";
      const screenSizeText = getScreenSize(s);
      const footfallStr = s.avgDailyFootfall
        ? s.avgDailyFootfall.toLocaleString("en-IN")
        : "Confirmed at booking";
      const adSlotDuration = s.durationPerSlot
        ? `${s.durationPerSlot} sec`
        : "15 sec (standard)";
      const loopTime = s.loopDuration
        ? `${s.loopDuration} sec`
        : "120 sec (standard)";

      // Audience targeting tags
      const tags: string[] = [];
      if (s.lifestyleTags) tags.push(...s.lifestyleTags);
      if (s.customAudienceTags) tags.push(...s.customAudienceTags);
      if (s.locationTags) tags.push(...s.locationTags);
      const uniqueTags = [...new Set(tags)].slice(0, 5);
      const targetingStr =
        uniqueTags.length > 0
          ? uniqueTags.join(", ")
          : s.environmentType || "General Audience";

      categoryTableRows += `
        <tr class="venue-row">
          <td class="font-bold">${venueName}</td>
          <td>${locationArea}</td>
          <td><span class="size-pill">${screenSizeText}</span></td>
          <td class="text-center font-medium">${screenCnt}</td>
          <td class="text-right">${footfallStr}</td>
          <td class="text-center">${adSlotDuration}</td>
          <td class="text-center">${loopTime}</td>
          <td><span class="targeting-text">${targetingStr}</span></td>
          <td class="text-right font-bold text-blue">${formatINR(clientTotal)}</td>
        </tr>
      `;
    }

    const subtotalFootfallStr =
      group.footfallCount > 0
        ? group.footfallCount.toLocaleString("en-IN")
        : "N/A";

    const subtotalRowHtml = `
      <tr class="subtotal-row">
        <td colspan="3" class="font-bold">Subtotal — ${group.categoryName}</td>
        <td class="text-center font-bold">${group.screenCount}</td>
        <td class="text-right font-bold">${subtotalFootfallStr}</td>
        <td colspan="3"></td>
        <td class="text-right font-bold text-blue">${formatINR(group.categorySubtotal)}</td>
      </tr>
    `;

    // Combine Category Header + Reference Image + Category Table
    categorySectionsHtml += `
      <div class="category-block">
        <div class="category-header-banner">
          <span class="category-pill">${group.categoryName}</span>
          <span style="font-weight: 600; color: #475569; font-size: 12px; margin-left: 8px;">
            (${group.venueCount} venue${group.venueCount !== 1 ? "s" : ""}, ${group.screenCount} screen${group.screenCount !== 1 ? "s" : ""})
          </span>
        </div>

        <!-- Reference Image FIRST (only if present) -->
        ${referenceImagesHtml}

        <!-- THEN List of Venues Table -->
        <div class="table-wrapper">
          <table class="detail-table">
            <thead>
              <tr>
                <th style="width: 20%;">Venue Name</th>
                <th style="width: 15%;">Location / Area</th>
                <th style="width: 12%;">Screen Size</th>
                <th style="width: 6%;" class="text-center">Screens</th>
                <th style="width: 12%;" class="text-right">Footfall / Audience</th>
                <th style="width: 8%;" class="text-center">Ad Slot</th>
                <th style="width: 8%;" class="text-center">Loop Time</th>
                <th style="width: 10%;">Audience Targeting</th>
                <th style="width: 9%;" class="text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              ${categoryTableRows}
              ${subtotalRowHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Grand Total Row Table
  const grandFootfallStr =
    totalFootfall > 0 ? totalFootfall.toLocaleString("en-IN") : "N/A";

  const grandTotalTableHtml = `
    <div class="table-wrapper grand-total-wrapper">
      <table class="detail-table">
        <tbody>
          <tr class="grand-total-row">
            <td style="width: 47%;" class="font-bold uppercase tracking-wide">Grand Total (${totalVenues} Venues across ${categoryGroups.length} Categories)</td>
            <td style="width: 6%;" class="text-center font-bold">${totalPhysicalScreens}</td>
            <td style="width: 12%;" class="text-right font-bold">${grandFootfallStr}</td>
            <td style="width: 26%;"></td>
            <td style="width: 9%;" class="text-right font-bold text-blue-large">${formatINR(grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // --------------------------------------------------------------------------
  // COMPLETE DOCUMENT HTML TEMPLATE
  // --------------------------------------------------------------------------
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Pixelspot Media Proposal – ${plan.clientBrand}</title>
  <style>
    /* Reset & CSS Variables */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    :root {
      --primary-blue: #2563eb;
      --dark-blue: #1d4ed8;
      --light-blue-bg: #eff6ff;
      --tint-border: #bfdbfe;
      --text-main: #0f172a;
      --text-muted: #64748b;
      --border-color: #e2e8f0;
      --zebra-bg: #f8fafc;
    }

    @page {
      size: landscape;
      margin: 10mm 12mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: var(--text-main);
      background: #ffffff;
      line-height: 1.4;
    }

    .proposal-container {
      max-width: 1120px;
      margin: 0 auto;
      padding: 20px;
      background: #ffffff;
    }

    /* Section Header Pattern */
    .section-kicker {
      color: var(--primary-blue);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-bottom: 4px;
      display: block;
    }

    .section-headline {
      color: var(--text-main);
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.4px;
      margin-bottom: 16px;
      line-height: 1.2;
    }

    .section-block {
      margin-bottom: 24px;
    }

    /* Page Break Rule: ONLY Page 2 starts section 4 cleanly */
    .page-break-start {
      page-break-before: always;
      break-before: page;
      padding-top: 12px;
    }

    /* Header Bar */
    .brand-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 14px;
      border-bottom: 3px solid var(--primary-blue);
      margin-bottom: 20px;
    }

    .brand-logo-area h1 {
      font-size: 22px;
      color: var(--primary-blue);
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand-logo-area p {
      color: var(--text-muted);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-top: 2px;
    }

    .meta-box {
      text-align: right;
    }
    .meta-box h2 {
      font-size: 15px;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: 0.5px;
    }
    .meta-box p {
      color: var(--text-muted);
      font-size: 11px;
      margin-top: 2px;
    }

    /* SECTION 1: COVER / SUMMARY */
    .cover-card {
      background: var(--zebra-bg);
      border: 1px solid var(--border-color);
      border-left: 5px solid var(--primary-blue);
      border-radius: 8px;
      padding: 16px 24px;
      margin-bottom: 20px;
    }

    .cover-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 12px;
    }

    .cover-item {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 12px 16px;
    }
    .cover-item .lbl {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-muted);
    }
    .cover-item .val {
      font-size: 15px;
      font-weight: 700;
      color: var(--text-main);
      margin-top: 3px;
    }

    /* SECTION 2: KPIS */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }

    .kpi-card {
      background: #ffffff;
      border: 1.5px solid var(--border-color);
      border-top: 4px solid var(--primary-blue);
      border-radius: 8px;
      padding: 14px 20px;
      text-align: center;
    }
    .kpi-card .num {
      font-size: 32px;
      font-weight: 800;
      color: var(--text-main);
      line-height: 1;
      margin-bottom: 4px;
    }
    .kpi-card .label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--primary-blue);
    }
    .kpi-card .subtext {
      font-size: 10px;
      color: var(--text-muted);
      margin-top: 3px;
    }

    /* SECTION 3: CATEGORY-WISE BRIEF */
    .brief-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 20px;
    }

    .brief-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-left: 5px solid var(--primary-blue);
      border-radius: 6px;
      padding: 12px 16px;
    }

    .brief-info-col {
      flex: 1;
    }

    .brief-category-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .brief-category-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--text-main);
    }

    .brief-size-badge {
      font-size: 10px;
      font-weight: 600;
      background: var(--light-blue-bg);
      color: var(--primary-blue);
      padding: 2px 8px;
      border-radius: 12px;
      border: 1px solid var(--tint-border);
    }

    .brief-summary {
      font-size: 12px;
      color: var(--text-main);
    }

    /* SECTION 4: CATEGORY BLOCKS & TABLE STYLING */
    .category-block {
      margin-bottom: 28px;
    }

    .category-header-banner {
      background: #f1f5f9;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      border-left: 4px solid var(--primary-blue);
      display: flex;
      align-items: center;
    }

    .category-pill {
      background: var(--primary-blue);
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 12px;
      display: inline-block;
    }

    /* Full-Width LARGE Reference Screen Container */
    .category-reference-container {
      width: 100%;
      margin-bottom: 14px;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .category-reference-header {
      padding: 10px 16px;
      background: var(--zebra-bg);
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .category-reference-title {
      font-size: 14px;
      font-weight: 800;
      color: var(--text-main);
      margin-top: 2px;
    }

    .category-reference-meta {
      font-size: 10px;
      font-weight: 600;
      color: var(--primary-blue);
      background: var(--light-blue-bg);
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid var(--tint-border);
    }

    .big-photo-wrapper {
      width: 100%;
      max-height: 320px;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
    }

    .big-photo-wrapper img {
      max-width: 100%;
      max-height: 300px;
      width: auto;
      height: auto;
      object-fit: contain;
      border-radius: 4px;
      display: block;
    }

    /* Outdoor Venue-wise Photo Grid */
    .outdoor-photos-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
      width: 100%;
      margin-bottom: 14px;
    }

    .outdoor-photo-card {
      width: 100%;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .photo-tag {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--primary-blue);
      background: var(--light-blue-bg);
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }

    .venue-tag {
      color: #92400e;
      background: #fef3c7;
    }

    .table-wrapper {
      width: 100%;
      overflow-x: auto;
      margin-bottom: 10px;
    }

    .detail-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      text-align: left;
    }

    .detail-table th {
      background: var(--text-main);
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 10px;
      padding: 8px 10px;
      border: 1px solid var(--text-main);
    }

    .detail-table td {
      padding: 8px 10px;
      border: 1px solid var(--border-color);
      vertical-align: middle;
    }

    /* Zebra Striping */
    .detail-table tr.venue-row:nth-child(even) {
      background-color: var(--zebra-bg);
    }

    .size-pill {
      font-size: 10px;
      font-weight: 600;
      color: #1e293b;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }

    /* Subtotal & Total Rows */
    .subtotal-row td {
      background: var(--light-blue-bg) !important;
      border-top: 2px solid var(--tint-border) !important;
      border-bottom: 2px solid var(--tint-border) !important;
      font-size: 11px;
    }

    .grand-total-row td {
      background: #dbeafe !important;
      border-top: 3px solid var(--primary-blue) !important;
      border-bottom: 3px solid var(--primary-blue) !important;
      font-size: 12px;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-medium { font-weight: 600; }
    .uppercase { text-transform: uppercase; }
    .tracking-wide { letter-spacing: 0.5px; }
    .text-blue { color: var(--primary-blue); }
    .text-blue-large { color: var(--primary-blue); font-size: 13px; font-weight: 800; }
    .targeting-text { font-size: 10px; color: var(--text-muted); }

    /* SECTION 5: CLOSING & CTA */
    .terms-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }

    .term-box {
      background: var(--zebra-bg);
      border: 1px solid var(--border-color);
      border-left: 3px solid var(--primary-blue);
      border-radius: 6px;
      padding: 12px 14px;
    }

    .term-box h4 {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .term-box p {
      font-size: 10.5px;
      color: var(--text-muted);
      line-height: 1.4;
    }

    /* High-Impact CTA & Contact Details Block */
    .cta-contact-card {
      background: #ffffff;
      border: 2px solid var(--primary-blue);
      border-radius: 8px;
      padding: 18px 24px;
      margin-bottom: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .cta-header h3 {
      font-size: 16px;
      font-weight: 800;
      color: var(--primary-blue);
      margin-bottom: 4px;
    }

    .cta-header p {
      font-size: 11px;
      color: var(--text-muted);
      margin-bottom: 14px;
    }

    .contact-details-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      background: var(--light-blue-bg);
      border: 1px solid var(--tint-border);
      border-radius: 6px;
      padding: 12px 16px;
    }

    .contact-item {
      display: flex;
      flex-direction: column;
    }

    .contact-item .contact-lbl {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      display: block;
    }

    .contact-item .contact-val {
      font-size: 13px;
      margin-top: 2px;
      display: block;
    }

    .notes-box {
      background: #fffbebf5;
      border: 1px solid #fef08a;
      border-radius: 6px;
      padding: 12px 16px;
      font-size: 11px;
      color: #713f12;
      margin-bottom: 20px;
    }

    .footer {
      border-top: 1.5px solid var(--border-color);
      padding-top: 12px;
      color: var(--text-muted);
      font-size: 10.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 500;
      width: 100%;
    }

    .footer-left strong {
      color: var(--text-main);
    }

    /* Print & Export PDF Specific CSS Rules */
    @media print {
      @page {
        size: landscape;
        margin: 8mm 10mm;
      }
      body { background: #ffffff; padding: 0; margin: 0; }
      .proposal-container { padding: 0; max-width: 100%; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      
      .section-block { page-break-inside: avoid; break-inside: avoid; }
      .page-break-start { page-break-before: always !important; break-before: page !important; }
      .category-reference-container { page-break-inside: avoid; break-inside: avoid; }
      .big-photo-wrapper { max-height: 260px !important; padding: 4px !important; background: #ffffff !important; }
      .big-photo-wrapper img { max-height: 240px !important; }
      .detail-table tr { page-break-inside: avoid; break-inside: avoid; }

      .terms-grid {
        display: table !important;
        width: 100% !important;
        table-layout: fixed !important;
        border-spacing: 10px !important;
        margin-bottom: 16px !important;
      }

      .term-box {
        display: table-cell !important;
        width: 50% !important;
        vertical-align: top !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        background: #f8fafc !important;
        border: 1px solid #e2e8f0 !important;
        border-left: 3px solid #2563eb !important;
        padding: 10px 12px !important;
      }

      .cta-contact-card {
        display: block !important;
        background: #ffffff !important;
        border: 2px solid #2563eb !important;
        border-radius: 8px !important;
        padding: 16px 20px !important;
        margin-top: 14px !important;
        margin-bottom: 16px !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .contact-details-grid {
        display: table !important;
        width: 100% !important;
        table-layout: fixed !important;
        background: #eff6ff !important;
        border: 1px solid #bfdbfe !important;
        border-radius: 6px !important;
        padding: 12px 16px !important;
      }

      .contact-item {
        display: table-cell !important;
        width: 25% !important;
        vertical-align: top !important;
        padding: 4px 8px !important;
      }

      .footer {
        display: table !important;
        width: 100% !important;
        border-top: 1.5px solid #e2e8f0 !important;
        margin-top: 16px !important;
        padding-top: 10px !important;
      }

      .footer-left {
        display: table-cell !important;
        text-align: left !important;
        font-size: 10px !important;
      }

      .footer-right {
        display: table-cell !important;
        text-align: right !important;
        font-size: 10px !important;
      }
    }
  </style>
</head>
<body>
  <div class="proposal-container">

    <!-- BRAND HEADER -->
    <div class="brand-header">
      <div class="brand-logo-area">
        <h1>${plan.agencyName}</h1>
        <p>Powered by Pixelspot Media Network</p>
      </div>
      <div class="meta-box">
        <h2>CAMPAIGN PROPOSAL</h2>
        <p>Prepared for: <strong>${plan.clientBrand}</strong></p>
        <p>Issued Date: ${formatDate(new Date().toISOString())}</p>
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- EXECUTIVE OVERVIEW (PAGE 1): COVER + KPIS + CATEGORY BRIEF            -->
    <!-- ===================================================================== -->
    <div class="section-block">
      <span class="section-kicker">PIXELSPOT MEDIA PROPOSAL</span>
      <h2 class="section-headline">Campaign Scope & Reach Summary</h2>
      
      <div class="cover-card">
        <p style="font-size: 13px; color: var(--text-main); font-weight: 600; line-height: 1.4;">
          This proposal presents a targeted Digital Out-of-Home (DOOH) media plan for <strong>${plan.clientBrand}</strong> across prime inventory environments.
        </p>

        <div class="cover-grid">
          <div class="cover-item">
            <div class="lbl">Total Inventory Scope</div>
            <div class="val">${categoryGroups.length} Inventory Types</div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 3px;">
              ${categoryNamesList}
            </div>
          </div>

          <div class="cover-item">
            <div class="lbl">Total Targeted Audience</div>
            <div class="val">${totalFootfall > 0 ? totalFootfall.toLocaleString("en-IN") : "High Footfall"} Daily Audience</div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 3px;">
              Combined daily footfall across all targeted venues
            </div>
          </div>

          <div class="cover-item">
            <div class="lbl">Campaign Duration</div>
            <div class="val">${formatDate(plan.startDate)} – ${formatDate(plan.endDate)}</div>
          </div>

          <div class="cover-item">
            <div class="lbl">Proposal Reference</div>
            <div class="val">${plan.name}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section-block">
      <span class="section-kicker">CAMPAIGN OVERVIEW</span>
      <h2 class="section-headline">At-a-Glance Key Performance Indicators</h2>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="num">${totalPhysicalScreens.toLocaleString("en-IN")}</div>
          <div class="label">Total Screens</div>
          <div class="subtext">Active digital displays in plan</div>
        </div>

        <div class="kpi-card">
          <div class="num">${totalVenues.toLocaleString("en-IN")}</div>
          <div class="label">Total Venues</div>
          <div class="subtext">Distinct physical locations</div>
        </div>

        <div class="kpi-card">
          <div class="num">${totalFootfall > 0 ? totalFootfall.toLocaleString("en-IN") : "Verified"}</div>
          <div class="label">Total Targeted Footfall</div>
          <div class="subtext">Aggregate daily audience reach</div>
        </div>
      </div>
    </div>

    <div class="section-block">
      <span class="section-kicker">INVENTORY SEGREGATION</span>
      <h2 class="section-headline">Category-Wise Brief</h2>

      <div class="brief-container">
        ${categoryBriefHtml}
      </div>
    </div>

    <!-- ===================================================================== -->
    <!-- FINANCIALS & INVENTORY (PAGE 2+): REFERENCE IMAGES & TABLES           -->
    <!-- ===================================================================== -->
    <div class="section-block page-break-start">
      <span class="section-kicker">FULL BIFURCATION & FINANCIALS</span>
      <h2 class="section-headline">Venue-by-Venue Reference Images & Detailed Pricing</h2>

      ${categorySectionsHtml}
      ${grandTotalTableHtml}
    </div>

    <!-- ===================================================================== -->
    <!-- CAMPAIGN EXECUTION: OPERATIONAL TERMS, CONTACT & CTA                  -->
    <!-- ===================================================================== -->
    <div class="section-block">
      <span class="section-kicker">CAMPAIGN EXECUTION</span>
      <h2 class="section-headline">Standard Operational Terms & Next Steps</h2>

      <div class="terms-grid">
        <div class="term-box">
          <h4>1. Creative Specifications</h4>
          <p>Supported video formats: MP4, MOV (H.264). High-res static images: PNG, JPG. Aspect ratios: 16:9 Landscape / 9:16 Portrait at minimum 1080p resolution.</p>
        </div>

        <div class="term-box">
          <h4>2. Loop & Playback Scheduling</h4>
          <p>Ad slots play sequentially within standardized loops. Screen networks operate continuous monitoring with high uptime guarantees.</p>
        </div>

        <div class="term-box">
          <h4>3. Proof of Play & Reporting</h4>
          <p>Geotagged site photos and system play logs are compiled and shared upon campaign launch and final audit completion.</p>
        </div>

        <div class="term-box">
          <h4>4. Booking & Slot Confirmation</h4>
          <p>Inventory slots are reserved upon confirmation. Final deployment is scheduled post creative clearance and agreement completion.</p>
        </div>
      </div>

      <!-- High-Impact CTA & Contact Details Block -->
      <div class="cta-contact-card">
        <div class="cta-header">
          <h3>Ready to Launch Your DOOH Campaign?</h3>
          <p>Contact our media team to confirm inventory slot reservations and finalize campaign deployment.</p>
        </div>

        <div class="contact-details-grid">
          <div class="contact-item">
            <span class="contact-lbl">Contact Executive</span>
            <span class="contact-val font-bold">Jagpreet Singh</span>
          </div>

          <div class="contact-item">
            <span class="contact-lbl">Direct Call / WhatsApp</span>
            <span class="contact-val font-bold text-blue">+91 77608 07137</span>
          </div>

          <div class="contact-item">
            <span class="contact-lbl">Email Inquiry</span>
            <span class="contact-val font-bold text-blue">jagpreet@pixelspot.in</span>
          </div>

          <div class="contact-item">
            <span class="contact-lbl">Official Platform</span>
            <span class="contact-val font-bold">www.pixelspot.in</span>
          </div>
        </div>
      </div>

      ${
        plan.notes
          ? `
      <div class="notes-box">
        <strong>Campaign Notes & Special Directives:</strong><br/>
        ${plan.notes}
      </div>`
          : ""
      }

      <!-- Bottom Company Details Footer -->
      <div class="footer">
        <div class="footer-left">
          <strong>Pixelspot Media Network</strong> • 📞 <strong>+91 77608 07137</strong> | ✉️ <strong>jagpreet@pixelspot.in</strong> | 🌐 <strong>www.pixelspot.in</strong>
        </div>
        <div class="footer-right">
          <span>${plan.agencyName} Proposal • Confidential • Valid 7 Days</span>
        </div>
      </div>
    </div>

    </div>

  </div>

  <script>
    (function() {
      function cleanupBrokenContainersAndPrint() {
        var containers = document.querySelectorAll('.category-reference-container, .outdoor-photo-card');
        containers.forEach(function(el) {
          var img = el.querySelector('img');
          if (!img || !img.src || img.naturalWidth === 0 || !img.complete) {
            el.remove();
          }
        });

        var grids = document.querySelectorAll('.outdoor-photos-grid');
        grids.forEach(function(grid) {
          if (grid.querySelectorAll('.outdoor-photo-card').length === 0) {
            grid.remove();
          }
        });

        setTimeout(function() {
          window.focus();
          window.print();
        }, 250);
      }

      var imgs = Array.from(document.images);
      if (imgs.length === 0) {
        cleanupBrokenContainersAndPrint();
      } else {
        var loadedCount = 0;
        function checkDone() {
          loadedCount++;
          if (loadedCount >= imgs.length) {
            cleanupBrokenContainersAndPrint();
          }
        }
        imgs.forEach(function(img) {
          if (img.complete) {
            checkDone();
          } else {
            img.addEventListener('load', checkDone);
            img.addEventListener('error', checkDone);
          }
        });
        setTimeout(cleanupBrokenContainersAndPrint, 2000);
      }
    })();
  </script>
</body>
</html>`;

  // Open window & trigger print/pdf export
  const win = window.open("", "_blank", "width=1000,height=750");
  if (!win) {
    alert("Please allow popups for this site to view/download the media proposal.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
