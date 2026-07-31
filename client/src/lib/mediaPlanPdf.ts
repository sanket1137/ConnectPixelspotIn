// ============================================================
// Media Plan PDF / Print Utility
// Margin % and net prices are NEVER included in the printed output.
// Only client-facing (post-margin) amounts are visible in print.
// ============================================================

import type { Screen } from "@shared/schema";

export interface MediaPlanPdfData {
  plan: {
    name: string;
    clientBrand: string;
    startDate: string;
    endDate: string;
    notes?: string | null;
    agencyMargin: number;      // used in calculation, NOT printed
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
    pricePerDay: number;       // net, NOT printed
    totalPrice: number;        // net, NOT printed
    notes?: string | null;
    screen?: Partial<Screen>;  // newly added for rich details
  }>;
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export function printMediaPlan(data: MediaPlanPdfData) {
  const { plan, items } = data;
  const marginMultiplier = 1 + plan.agencyMargin / 100;

  const totalNet = items.reduce((s, i) => s + i.totalPrice, 0);
  const grandTotal = Math.round(totalNet * marginMultiplier);

  const cardsHtml = items
    .map((item, idx) => {
      const clientTotal = Math.round(item.totalPrice * marginMultiplier);
      const clientRatePerDay = Math.round(item.pricePerDay * marginMultiplier);
      const s = item.screen || {};
      
      const cityArea = `${item.city}${item.venueName ? ` – ${item.venueName}` : ""}`;
      
      let imageSrc = s.screenImages?.[0] || s.images?.[0];
      if (imageSrc && imageSrc.startsWith('/')) {
        imageSrc = `${window.location.origin}${imageSrc}`;
      }
      const hasImage = !!imageSrc;
      
      let mapUrl = '';
      if (s.latitude && s.longitude && MAPS_KEY) {
        mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${s.latitude},${s.longitude}&zoom=14&size=400x300&markers=color:red%7C${s.latitude},${s.longitude}&key=${MAPS_KEY}`;
      }
      const hasMap = !!mapUrl;

      // Extract Tags
      const tags: string[] = [];
      if (s.lifestyleTags) tags.push(...s.lifestyleTags);
      if (s.customAudienceTags) tags.push(...s.customAudienceTags);
      if (s.locationTags) tags.push(...s.locationTags);
      
      // Deduplicate tags and take first ~15 so it doesn't break layout
      const uniqueTags = [...new Set(tags)].slice(0, 15);

      return `
        <div class="screen-card">
          <div class="screen-card-header">
            <div class="screen-title-area">
              <h3>${idx + 1}. ${item.screenName}</h3>
              <p class="subtitle">
                ${cityArea} • ${item.venueCategory} • ${item.environmentType} 
                ${s.type ? `• <span style="background: #ccfbf1; color: #0f766e; padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 11px; margin-left: 4px; display: inline-block;">${s.type}</span>` : ""}
              </p>
              ${item.notes ? `<p class="item-note">${item.notes}</p>` : ""}
            </div>
          </div>

          <div class="screen-media-grid">
            ${hasImage ? `<div class="media-box"><img src="${imageSrc}" alt="Screen" onerror="this.onerror=null;this.src='https://placehold.co/400x300?text=No+Image+Available';" /></div>` : ""}
            ${hasMap ? `<div class="media-box"><img src="${mapUrl}" alt="Map" onerror="this.onerror=null;this.src='https://placehold.co/400x300?text=Map+Unavailable';" /></div>` : ""}
          </div>

          <div class="screen-details-grid">
            <div class="spec-col price-box">
              <div class="spec-label">Pricing</div>
              <div class="spec-value highlight-price">${formatINR(clientRatePerDay)}<span style="font-size: 11px; font-weight: 500; color: #6b7280;"> / day</span></div>
              <div class="spec-sub">For ${item.days} Day${item.days !== 1 ? 's' : ''}</div>
              <div class="spec-sub mt-2"><strong>Total Cost: ${formatINR(clientTotal)}</strong></div>
            </div>

            <div class="spec-col">
              <div class="spec-label">Audience & Reach</div>
              <div class="spec-value">${s.avgDailyFootfall ? s.avgDailyFootfall.toLocaleString('en-IN') : 'N/A'}</div>
              <div class="spec-sub">Daily Footfall</div>
              
              <div class="spec-value mt-2">${s.visibility || 'Standard'}</div>
              <div class="spec-sub">Visibility</div>
            </div>

            <div class="spec-col">
              <div class="spec-label">Screen Specifications</div>
              <div class="spec-value">${s.resolution || 'Standard'}</div>
              <div class="spec-sub">Resolution</div>
              
              <div class="spec-value mt-2">${s.displayFormat || 'Landscape'}</div>
              <div class="spec-sub">Orientation</div>
            </div>

            <div class="spec-col">
              <div class="spec-label">Advertising Details</div>
              <div class="spec-value">${s.durationPerSlot || 10} Sec</div>
              <div class="spec-sub">Ad Slot Duration</div>
              
              <div class="spec-value mt-2">${s.loopDuration ? `${s.loopDuration} Sec` : 'Standard'}</div>
              <div class="spec-sub">Loop Time</div>
            </div>
          </div>

          ${uniqueTags.length > 0 ? `
            <div class="tags-section">
              <div class="spec-label" style="margin-bottom: 8px;">Audience & Location Tags</div>
              <div class="tags-container">
                ${uniqueTags.map(tag => `<span class="tag-chip">${tag}</span>`).join('')}
              </div>
            </div>
          ` : ""}
        </div>
      `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Media Plan – ${plan.clientBrand}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      color: #1f2937;
      background: #f3f4f6;
      padding: 0;
    }
    .print-container {
      max-width: 1000px;
      margin: 0 auto;
      background: #fff;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 4px solid #7c3aed;
      margin-bottom: 30px;
    }
    .logo-area h1 { font-size: 26px; color: #7c3aed; font-weight: 800; letter-spacing: -0.5px; }
    .logo-area p { color: #6b7280; font-size: 11px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    
    .plan-meta { text-align: right; }
    .plan-meta h2 { font-size: 18px; font-weight: 800; color: #111827; letter-spacing: 1px; }
    .plan-meta p { color: #4b5563; font-size: 12px; margin-top: 4px; }
    .plan-meta strong { color: #111827; font-weight: 700; }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 40px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #7c3aed;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .info-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
    .info-card .value { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 4px; }

    .cards-wrapper {
      display: flex;
      flex-direction: column;
      gap: 30px;
      margin-bottom: 40px;
    }

    .screen-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      page-break-inside: avoid;
    }

    .screen-card-header {
      padding: 16px 20px;
      border-bottom: 1px solid #f3f4f6;
      background: #fafafa;
    }
    .screen-title-area h3 {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .screen-title-area .subtitle {
      font-size: 13px;
      color: #4b5563;
      font-weight: 500;
    }
    .item-note {
      margin-top: 8px;
      font-size: 12px;
      color: #7c3aed;
      font-style: italic;
      background: #f5f3ff;
      padding: 6px 12px;
      border-radius: 4px;
      display: inline-block;
    }

    .screen-media-grid {
      display: flex;
      border-bottom: 1px solid #f3f4f6;
      height: 180px;
    }
    .media-box {
      flex: 1;
      height: 100%;
      border-right: 1px solid #f3f4f6;
    }
    .media-box:last-child {
      border-right: none;
    }
    .media-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .screen-details-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      padding: 20px;
      border-bottom: 1px solid #f3f4f6;
    }
    .spec-col {
      padding-right: 16px;
      border-right: 1px solid #f3f4f6;
    }
    .spec-col:last-child {
      border-right: none;
    }
    .price-box {
      background: #f8fafc;
      margin: -20px 0 -20px -20px;
      padding: 20px 16px 20px 20px;
      border-right: 1px solid #f3f4f6;
    }
    
    .spec-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 6px;
    }
    .spec-value {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
    }
    .highlight-price {
      font-size: 20px;
      color: #7c3aed;
    }
    .spec-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .mt-2 { margin-top: 12px; }

    .tags-section {
      padding: 16px 20px;
      background: #fafafa;
    }
    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .tag-chip {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
      padding: 4px 10px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 500;
    }

    .summary-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
      margin-top: 20px;
      page-break-inside: avoid;
    }
    .summary-box {
      background: #7c3aed;
      color: #fff;
      border-radius: 12px;
      padding: 24px 32px;
      text-align: right;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .summary-box .lbl { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; opacity: 0.9; }
    .summary-box .amt { font-size: 32px; font-weight: 800; margin-top: 8px; }

    .notes-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
      font-size: 13px;
      color: #334155;
      line-height: 1.5;
      page-break-inside: avoid;
    }
    .notes-section strong { display: block; margin-bottom: 8px; color: #0f172a; font-size: 14px; }

    .footer {
      border-top: 2px solid #e5e7eb;
      padding-top: 16px;
      color: #94a3b8;
      font-size: 11px;
      display: flex;
      justify-content: space-between;
      font-weight: 500;
    }

    @media print {
      body { background: #fff; padding: 0; }
      .print-container { padding: 0; max-width: 100%; }
      /* Force background colors to print if supported by browser */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      
      .screen-card { border: 1.5px solid #e5e7eb; }
      .summary-box { border: 2px solid #7c3aed; }
      .info-card { border: 1.5px solid #e2e8f0; border-left: 4px solid #7c3aed; }
    }
  </style>
</head>
<body>
  <div class="print-container">
    <div class="header">
      <div class="logo-area">
        <h1>${plan.agencyName}</h1>
        <p>Premium Media Proposal</p>
        <p style="font-size: 10px; color: #9ca3af; margin-top: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Powered by Pixelspot</p>
      </div>
      <div class="plan-meta">
        <h2>MEDIA PLAN</h2>
        <p>Prepared for: <strong>${plan.clientBrand}</strong></p>
        <p>Generated: ${formatDate(new Date().toISOString())}</p>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="label">Plan Name</div>
        <div class="value">${plan.name}</div>
      </div>
      <div class="info-card">
        <div class="label">Client / Brand</div>
        <div class="value">${plan.clientBrand}</div>
      </div>
      <div class="info-card">
        <div class="label">Campaign Period</div>
        <div class="value">${formatDate(plan.startDate)} – ${formatDate(plan.endDate)}</div>
      </div>
      <div class="info-card">
        <div class="label">Total Screens</div>
        <div class="value">${items.length}</div>
      </div>
    </div>

    <div class="cards-wrapper">
      ${cardsHtml}
    </div>

    <div class="summary-row">
      <div class="summary-box">
        <div class="lbl">GRAND TOTAL (${items.length} Screens)</div>
        <div class="amt">${formatINR(grandTotal)}</div>
      </div>
    </div>

    ${plan.notes ? `
    <div class="notes-section">
      <strong>Important Notes</strong>
      ${plan.notes}
    </div>` : ""}

    <div class="footer">
      <span>${plan.agencyName} · Confidential Proposal</span>
      <span>This media plan is valid for 7 days from date of issue.</span>
    </div>
  </div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    alert("Please allow popups for this site to download the plan.");
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.focus();
    setTimeout(() => {
      win.print();
    }, 1000); // Give images and map time to load before printing
  };
}
