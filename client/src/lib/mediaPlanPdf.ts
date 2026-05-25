// ============================================================
// Media Plan PDF / Print Utility
// Margin % and net prices are NEVER included in the printed output.
// Only client-facing (post-margin) amounts are visible in print.
// ============================================================

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

export function printMediaPlan(data: MediaPlanPdfData) {
  const { plan, items } = data;
  const marginMultiplier = 1 + plan.agencyMargin / 100;

  const totalNet = items.reduce((s, i) => s + i.totalPrice, 0);
  const grandTotal = Math.round(totalNet * marginMultiplier);

  const rows = items
    .map((item, idx) => {
      const clientTotal = Math.round(item.totalPrice * marginMultiplier);
      const clientRatePerDay = Math.round(item.pricePerDay * marginMultiplier);
      const cityArea = `${item.city}${item.venueName ? ` – ${item.venueName}` : ""}`;
      return `
        <tr class="${idx % 2 === 0 ? "row-even" : "row-odd"}">
          <td>${idx + 1}</td>
          <td>
            <strong>${item.screenName}</strong>
            ${item.notes ? `<br/><span class="item-note">${item.notes}</span>` : ""}
          </td>
          <td>${cityArea}</td>
          <td>${item.venueCategory}</td>
          <td>${item.environmentType}</td>
          <td class="center">${item.days}</td>
          <td class="right">${formatINR(clientRatePerDay)}</td>
          <td class="right total-col">${formatINR(clientTotal)}</td>
        </tr>`;
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
      font-size: 11px;
      color: #1a1a2e;
      background: #fff;
      padding: 24px 32px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 18px;
      border-bottom: 3px solid #7c3aed;
      margin-bottom: 20px;
    }
    .logo-area h1 { font-size: 22px; color: #7c3aed; font-weight: 800; }
    .logo-area p { color: #6b7280; font-size: 10px; margin-top: 2px; }
    .plan-meta { text-align: right; }
    .plan-meta h2 { font-size: 15px; font-weight: 700; color: #111827; }
    .plan-meta p { color: #6b7280; font-size: 10px; margin-top: 3px; }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .info-card {
      background: #f5f3ff;
      border-left: 3px solid #7c3aed;
      border-radius: 6px;
      padding: 8px 12px;
    }
    .info-card .label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; }
    .info-card .value { font-size: 12px; font-weight: 700; color: #111827; margin-top: 2px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    thead tr {
      background: #7c3aed;
      color: #fff;
    }
    thead th {
      padding: 8px 10px;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: .3px;
    }
    tbody td {
      padding: 7px 10px;
      vertical-align: top;
      border-bottom: 1px solid #e5e7eb;
      font-size: 10.5px;
    }
    .row-even { background: #ffffff; }
    .row-odd  { background: #faf5ff; }
    .item-note { color: #6b7280; font-style: italic; font-size: 9.5px; }
    .center { text-align: center; }
    .right  { text-align: right; }
    .total-col { font-weight: 600; color: #5b21b6; }

    .summary-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .summary-box {
      background: #7c3aed;
      color: #fff;
      border-radius: 8px;
      padding: 14px 24px;
      text-align: right;
    }
    .summary-box .lbl { font-size: 10px; opacity: .8; }
    .summary-box .amt { font-size: 20px; font-weight: 800; margin-top: 4px; }

    .notes-section {
      background: #f9fafb;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 20px;
      font-size: 10.5px;
      color: #374151;
    }
    .notes-section strong { display: block; margin-bottom: 4px; color: #111827; }

    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      color: #9ca3af;
      font-size: 9px;
      display: flex;
      justify-content: space-between;
    }

    @media print {
      body { padding: 8px 16px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      <h1>${plan.agencyName}</h1>
      <p>Powered by PixelSpot</p>
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

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Screen</th>
        <th>City &amp; Area</th>
        <th>Venue Type</th>
        <th>Environment</th>
        <th class="center">Days</th>
        <th class="right">Rate/Day</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="summary-row">
    <div class="summary-box">
      <div class="lbl">GRAND TOTAL (${items.length} Screens)</div>
      <div class="amt">${formatINR(grandTotal)}</div>
    </div>
  </div>

  ${plan.notes ? `
  <div class="notes-section">
    <strong>Notes</strong>
    ${plan.notes}
  </div>` : ""}

  <div class="footer">
    <span>${plan.agencyName} · Confidential</span>
    <span>This media plan is valid for 7 days from date of issue.</span>
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
    win.print();
  };
}
