export interface PrintTicketItem {
  label: string;
  value: string;
  spec?: string;
  unitOrDuration?: string;
  laps?: number | string;
  shots?: number | string;
  duration?: string;
}

export interface PrintTicketOptions {
  receiptId: string;
  tokenNumber?: string | number;
  activityName: string;
  packageName?: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  slot: string;
  items: PrintTicketItem[];
  subtotalAmount?: number;
  discountPercentage?: number;
  discountAmount?: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'refunded' | 'cancelled';
  quantity: number;
  paymentMethod?: string;
  transactionId?: string;
  counterStaff?: string;
  timestamp?: string;
  unitOrDuration?: string;
  duration?: string;
  laps?: number | string;
  shots?: number | string;
}

function extractSpecFromText(text: string) {
  if (!text) return {};
  const res: { laps?: string; shots?: string; duration?: string; unit?: string } = {};

  // Laps: e.g. "5 Laps", "5-lap", "Laps: 10"
  const lapsMatch = text.match(/(?:^|[^\w])(\d+)\s*(?:-\s*)?laps?\b/i) || text.match(/\blaps?\s*[:=-]?\s*(\d+)\b/i);
  if (lapsMatch) {
    const n = lapsMatch[1] || lapsMatch[2];
    res.laps = `${n} Lap${Number(n) !== 1 ? 's' : ''}`;
  }

  // Shots: e.g. "15 shots", "10 Shots", "50 pellets", "Shots: 30"
  const shotsMatch = text.match(/(?:^|[^\w])(\d+)\s*(?:-\s*)?(?:shots?|pellets?|rounds?)\b/i) || text.match(/\b(?:shots?|pellets?|rounds?)\s*[:=-]?\s*(\d+)\b/i);
  if (shotsMatch) {
    const n = shotsMatch[1] || shotsMatch[2];
    res.shots = `${n} Shot${Number(n) !== 1 ? 's' : ''}`;
  }

  // Duration / Time: e.g. "10 mins", "15 Mins", "30 minutes", "1 hour", "1 hr", "Duration: 15 Mins"
  const durMatch = text.match(/(?:^|[^\w])(\d+\s*(?:-\s*)?(?:mins?|minutes?|hrs?|hours?))\b/i) || text.match(/\b(?:duration|time)\s*[:=-]?\s*(\d+\s*(?:mins?|minutes?|hrs?|hours?))\b/i);
  if (durMatch) {
    res.duration = durMatch[1].trim();
  }

  // Ride unit: e.g. "1 ride", "2 rides"
  const rideMatch = text.match(/(?:^|[^\w])(\d+\s*(?:-\s*)?rides?)\b/i);
  if (rideMatch) {
    res.unit = rideMatch[1].trim();
  }

  return res;
}

export function printTicket(opts: PrintTicketOptions) {
  const {
    receiptId,
    tokenNumber,
    activityName,
    packageName,
    customerName,
    customerPhone,
    date,
    slot,
    items = [],
    subtotalAmount,
    discountPercentage = 0,
    discountAmount = 0,
    totalAmount,
    paymentStatus,
    quantity,
    paymentMethod = 'CASH',
    transactionId,
    counterStaff = 'Staff',
    timestamp,
    unitOrDuration,
    duration,
    laps,
    shots
  } = opts;

  const rawToken = tokenNumber != null && String(tokenNumber).trim() !== ''
    ? String(tokenNumber).trim()
    : (receiptId.startsWith('TKT-') ? receiptId.replace(/^TKT-/, '') : receiptId);
  const token = rawToken.startsWith('#') ? rawToken : `#${rawToken}`;

  const displayPackage = packageName || (items.length > 0 && items[0].label !== activityName ? items[0].label : 'Standard Package');

  const isFood = activityName.toLowerCase().includes('food') || 
                 activityName.toLowerCase().includes('cafe') || 
                 activityName.toLowerCase().includes('dining') ||
                 activityName.toLowerCase().includes('beverage') ||
                 receiptId.startsWith('INV-FS-') ||
                 receiptId.startsWith('KOT-') || 
                 receiptId.startsWith('ord') ||
                 slot === 'FOOD COUNTER' ||
                 slot === 'CAFE COUNTER' ||
                 slot === 'Counter POS';

  // 5% GST specifically for Food Street (2.5% CGST + 2.5% SGST); 18% standard for non-food activities (9% CGST + 9% SGST)
  const gstDivisor = isFood ? 1.05 : 1.18;
  const netTaxable = subtotalAmount != null 
    ? subtotalAmount 
    : Math.round((totalAmount / gstDivisor) * 100) / 100;
  const taxDiff = Math.max(0, Math.round((totalAmount - netTaxable) * 100) / 100);
  const sgst = Math.round((taxDiff / 2) * 100) / 100;
  const cgst = Math.round((taxDiff - sgst) * 100) / 100;
  const totalGst = sgst + cgst;
  const baseSubtotal = subtotalAmount != null ? subtotalAmount : (totalAmount + discountAmount);
  const grandTotal = totalAmount;
  const gstRateText = isFood ? '2.5%' : '9%';

  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  let timeStamp = now;
  if (timestamp) {
    try {
      timeStamp = new Date(timestamp).toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      timeStamp = now;
    }
  }

  let visitDate = date;
  try {
    visitDate = new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit', month: '2-digit', year: '2-digit'
    });
  } catch {
    visitDate = date;
  }

  const isRefunded = paymentStatus === 'refunded' || paymentStatus === 'cancelled';
  const isPending = paymentStatus === 'pending';

  const statusText = isRefunded ? 'CANCELLED' : isPending ? 'PENDING' : 'PAID';
  const statusBadgeClass = isRefunded ? 'status-refunded' : isPending ? 'status-pending' : 'status-paid';

  // Optimized Compact SVG QR Code
  const qrSvg = `
    <svg viewBox="0 0 100 100" class="qr-code">
      <rect width="100" height="100" fill="#ffffff" />
      <path d="M5 5h32v32H5V5zm6 6v20h20V11H11zm52-6h32v32H63V5zm6 6v20h20V11H69zM5 63h32v32H5V63zm6 6v20h20V69H11z" fill="#000000"/>
      <rect x="15" y="15" width="12" height="12" fill="#000000" />
      <rect x="73" y="15" width="12" height="12" fill="#000000" />
      <rect x="15" y="73" width="12" height="12" fill="#000000" />
      <path d="M45 5h10v12H45V5zm0 18h10v8H45v-8zm18 22h8v10h-8V45zm12 0h18v10H75V45zm-30 0h8v18h-8V45zm12 12h8v12h-8V57zm12 12h14v8H69v-8zm-24 6h10v18H45V75zm34 6h14v12H79V81zm-18 6h12v6H61v-6z" fill="#000000"/>
    </svg>
  `;

  // Combine all sources of specs:
  const combinedText = [
    unitOrDuration,
    duration,
    packageName,
    displayPackage,
    ...items.map(i => `${i.label} ${i.spec || ''} ${i.unitOrDuration || ''}`)
  ].filter(Boolean).join(' | ');

  const textSpecs = extractSpecFromText(combinedText);

  // Determine laps:
  let lapsText: string | undefined = undefined;
  if (laps != null && String(laps).trim() !== '') {
    const num = Number(laps);
    if (!isNaN(num)) {
      lapsText = quantity > 1 && num < 100
        ? `${num} Laps / Pax (${num * quantity} Total)`
        : `${num} Lap${num !== 1 ? 's' : ''}`;
    } else {
      lapsText = String(laps).trim();
    }
  } else if (textSpecs.laps) {
    const num = Number(textSpecs.laps.replace(/\D/g, ''));
    if (!isNaN(num) && quantity > 1 && num < 100) {
      lapsText = `${num} Laps / Pax (${num * quantity} Total)`;
    } else {
      lapsText = textSpecs.laps;
    }
  }

  // Determine shots:
  let shotsText: string | undefined = undefined;
  if (shots != null && String(shots).trim() !== '') {
    const num = Number(shots);
    if (!isNaN(num)) {
      shotsText = quantity > 1
        ? `${num} Shots / Shooter (${num * quantity} Total)`
        : `${num} Shot${num !== 1 ? 's' : ''}`;
    } else {
      shotsText = String(shots).trim();
    }
  } else if (textSpecs.shots) {
    const num = Number(textSpecs.shots.replace(/\D/g, ''));
    if (!isNaN(num) && quantity > 1) {
      shotsText = `${num} Shots / Shooter (${num * quantity} Total)`;
    } else {
      shotsText = textSpecs.shots;
    }
  }

  // Determine time / duration:
  const durationText: string | undefined = duration?.trim() || textSpecs.duration;

  // Determine custom unit:
  const unitText: string | undefined = unitOrDuration?.trim() || textSpecs.unit;

  // Build high-visibility spec pills for the session specifications bar:
  const specsList: string[] = [];
  if (lapsText) specsList.push(`🏁 LAPS: ${lapsText}`);
  if (durationText) specsList.push(`⏱ TIME: ${durationText}`);
  if (shotsText) specsList.push(`🎯 SHOTS: ${shotsText}`);
  if (!lapsText && !durationText && !shotsText && unitText) specsList.push(`⭐ SPEC: ${unitText}`);

  const formattedItems = items.map(it => {
    let spec = it.spec;
    if (!spec) {
      const itText = `${it.label} ${it.unitOrDuration || ''}`;
      const ispecs = extractSpecFromText(itText);
      const parts = [
        it.laps ? `${it.laps} Laps` : ispecs.laps,
        it.duration || ispecs.duration,
        it.shots ? `${it.shots} Shots` : ispecs.shots,
        it.unitOrDuration || ispecs.unit
      ].filter(Boolean);
      if (parts.length > 0) {
        spec = Array.from(new Set(parts)).join(' • ');
      }
    }
    return {
      ...it,
      spec
    };
  });

  const itemRows = formattedItems.length > 0 
    ? formattedItems.map(it => `
        <tr>
          <td class="td-name">
            <div>${it.label}</div>
            ${it.spec ? `<div style="font-size: 9.5px; font-weight: 700; color: #222; margin-top: 1px;">▪ ${it.spec}</div>` : ''}
          </td>
          <td class="td-val">${it.value}</td>
        </tr>
      `).join('')
    : `<tr><td class="td-name">${activityName} (${quantity} Pax)</td><td class="td-val">₹${netTaxable.toFixed(2)}</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Receipt – ${receiptId}</title>
  <style>
    /* CRISP THERMAL RECEIPT SETUP (NO OVER-INKING / SMUDGING) */
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page {
      size: 3in auto;
      margin: 0mm;
    }
    html, body {
      width: 3in;
      max-width: 3in;
      height: auto;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111111;
      font-family: Arial, Helvetica, "Segoe UI", sans-serif;
      font-size: 11px;
      line-height: 1.35;
      font-weight: 600;
      -webkit-font-smoothing: antialiased;
    }
    .receipt-box {
      width: 100%;
      max-width: 2.85in;
      height: auto;
      margin: 0 auto;
      padding: 4px 6px;
      border: 1px solid #000;
      border-radius: 4px;
      background: #ffffff;
      box-sizing: border-box;
      display: block;
    }

    /* ── HEADER ── */
    .header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border-bottom: 1px solid #000;
      padding-top: 2px;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 6px;
      text-align: left;
    }
    .header-logo {
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid #000;
      flex-shrink: 0;
    }
    .header-text {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.1;
      color: #000000;
    }
    .brand-sub {
      font-size: 10px;
      color: #111111;
      font-weight: 700;
      text-transform: uppercase;
      margin-top: 3px;
      line-height: 1.15;
    }

    /* ── META BAR ── */
    .info-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      font-weight: 700;
      margin-bottom: 6px;
      border-bottom: 1px solid #000;
      padding-bottom: 5px;
    }
    .status-tag {
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      text-transform: uppercase;
      border: 1px solid #000;
      background: #ffffff;
      color: #000000;
    }

    /* ── GATE PASS & QR ── */
    .pass-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #000;
      border-radius: 4px;
      padding: 6px 8px;
      margin-bottom: 6px;
      background: #ffffff;
    }
    .pass-details {
      flex: 1;
      font-size: 11px;
      line-height: 1.35;
      font-weight: 600;
      color: #111111;
    }
    .act-title {
      font-size: 13.5px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 1.7in;
      color: #000000;
    }
    .qr-box {
      width: 68px;
      text-align: center;
      margin-left: 6px;
      flex-shrink: 0;
    }
    .qr-code {
      width: 64px;
      height: 64px;
      display: block;
      margin: 0 auto;
    }

    /* ── SESSION SPECIFICATIONS / ENTITLEMENTS ── */
    .specs-bar {
      border: 1.5px solid #000;
      border-radius: 4px;
      padding: 3px 6px;
      margin-bottom: 6px;
      background: #fafafa;
      text-align: center;
    }
    .specs-bar-title {
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px dashed #000;
      padding-bottom: 2px;
      margin-bottom: 3px;
      color: #000;
    }
    .specs-bar-content {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 4px;
      font-size: 10.5px;
      font-weight: 800;
    }
    .spec-tag {
      display: inline-block;
      padding: 1px 6px;
      border: 1px solid #000;
      border-radius: 3px;
      background: #ffffff;
      color: #000000;
      font-family: monospace;
    }

    /* ── ITEMS & SUMMARY TABLE ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 6px;
    }
    .items-table th {
      padding: 3px 0;
      border-bottom: 1px solid #000;
      font-weight: 800;
      text-align: left;
    }
    .items-table td {
      padding: 3px 0;
      border-bottom: 1px solid #ddd;
      font-weight: 600;
    }
    .td-name { font-weight: 700; text-align: left; color: #000; }
    .td-val { text-align: right; font-weight: 700; font-family: monospace; color: #000; }

    .summary-box {
      border-top: 1px solid #000;
      padding-top: 5px;
      font-size: 11px;
      font-weight: 600;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 2px 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 800;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 5px 0;
      margin-top: 4px;
      color: #000000;
    }

    /* ── FOOTER ── */
    .footer-note {
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      color: #111111;
      border-top: 1px solid #000;
      padding-top: 5px;
      margin-top: 6px;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div>
      <div class="header">
        <img src="/deuce-logo.jpg" alt="Deuce Logo" class="header-logo" />
        <div class="header-text">
          <div class="brand-title">DEUCE SPORTS GROUP</div>
          <div class="brand-sub">YELAGIRI &bull; GST: 33INYPK7449Q1ZL</div>
        </div>
      </div>

      ${isFood ? `
      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 5px 0; margin: 5px 0; text-align: center;">
        <div style="font-size: 14px; font-weight: 800; letter-spacing: 0.5px;">TOKEN NO: <span style="font-size: 18px; font-family: monospace;">${token}</span></div>
        <div style="font-size: 10px; font-weight: 700; margin-top: 2px;">TIME STAMP: <strong>${timeStamp}</strong></div>
        <div style="font-size: 9.5px; font-weight: 600; color: #222; margin-top: 2px;">INVOICE: ${receiptId} &bull; ${visitDate}</div>
      </div>
      ` : `
      <div class="info-bar">
        <span>TOKEN NO: <strong>${token}</strong></span>
        <span class="status-tag ${statusBadgeClass}">${statusText}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 700; margin-top: -3px; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1px solid #000; color: #111;">
        <span>RECEIPT: ${receiptId}</span>
        <span>TIME STAMP: ${timeStamp}</span>
      </div>

      <div class="pass-box">
        <div class="pass-details">
          <div class="act-title">${activityName}</div>
          <div>Customer Name: <strong>${customerName}</strong></div>
          <div>Phone Number: <strong>${customerPhone || 'N/A'}</strong></div>
          <div>Token No: <strong>${token}</strong></div>
          <div>Time Stamp: <strong>${timeStamp}</strong></div>
          <div>Package: <strong>${displayPackage}</strong></div>
          <div>Passes: <strong>${quantity} Pax</strong></div>
          <div>Date/Slot: <strong>${visitDate}</strong> (${slot})</div>
          ${lapsText ? `<div style="margin-top: 2px;">No. of Laps: <strong style="font-size: 11.5px; font-weight: 800;">${lapsText}</strong></div>` : ''}
          ${durationText ? `<div style="margin-top: 2px;">Time / Duration: <strong style="font-size: 11.5px; font-weight: 800;">${durationText}</strong></div>` : ''}
          ${shotsText ? `<div style="margin-top: 2px;">No. of Shots: <strong style="font-size: 11.5px; font-weight: 800;">${shotsText}</strong></div>` : ''}
          ${(!lapsText && !durationText && !shotsText && unitText) ? `<div style="margin-top: 2px;">Entitlement: <strong style="font-size: 11.5px; font-weight: 800;">${unitText}</strong></div>` : ''}
        </div>
        <div class="qr-box">
          ${qrSvg}
        </div>
      </div>

      ${(!isFood && specsList.length > 0) ? `
      <div class="specs-bar">
        <div class="specs-bar-title">SESSION SPECIFICATIONS &amp; ENTITLEMENTS</div>
        <div class="specs-bar-content">
          ${specsList.map(s => `<span class="spec-tag">${s}</span>`).join(' ')}
        </div>
      </div>
      ` : ''}
      `}

      <!-- Menu Items and Price Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th>${isFood ? 'Item Name' : 'Ticket Split Up &amp; Specs'}</th>
            <th style="text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

      <!-- Base Amount, SGST and CGST in one line -->
      <div style="font-size: 10px; font-weight: 700; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin: 4px 0; display: flex; justify-content: space-between; text-align: center;">
        <span>Base: ₹${netTaxable.toFixed(2)}</span>
        <span>SGST (${gstRateText}): ₹${sgst.toFixed(2)}</span>
        <span>CGST (${gstRateText}): ₹${cgst.toFixed(2)}</span>
      </div>

      <div class="summary-box">
        ${discountAmount > 0 ? `
        <div class="summary-row">
          <span>Discount${discountPercentage > 0 ? ` (${discountPercentage}%)` : ''}</span>
          <span>-₹${discountAmount.toFixed(2)}</span>
        </div>
        ` : ''}

        <div class="total-row">
          <span>TOTAL (${paymentMethod.toUpperCase()})</span>
          <span>₹${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer-note">
        ${isFood ? `<strong>Thank you for visiting DEUCE SPORTS GROUP!</strong><div style="font-size: 8.5px; color: #555; margin-top: 3px;">Printed: ${timeStamp}</div>` : `Valid for date/slot printed above. Non-refundable.<br/><strong>Thank you for visiting DEUCE SPORTS GROUP!</strong><div style="font-size: 8.5px; color: #555; margin-top: 3px;">Printed: ${timeStamp}</div>`}
      </div>
    </div>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=380,height=520,scrollbars=no');
  if (!win) {
    alert('Please allow popups to print the ticket.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => {
    win.print();
    win.close();
  }, 300);
}

