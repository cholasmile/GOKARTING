export interface PrintTicketOptions {
  receiptId: string;
  activityName: string;
  packageName?: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  slot: string;
  items: { label: string; value: string }[];
  subtotalAmount?: number;
  discountPercentage?: number;
  discountAmount?: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'refunded' | 'cancelled';
  quantity: number;
  paymentMethod?: string;
  transactionId?: string;
  counterStaff?: string;
}

export function printTicket(opts: PrintTicketOptions) {
  const {
    receiptId,
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
    counterStaff = 'Staff'
  } = opts;

  const displayPackage = packageName || (items.length > 0 && items[0].label !== activityName ? items[0].label : 'Standard Package');

  const netTaxable = Math.round((totalAmount / 1.18) * 100) / 100;
  const sgst = Math.round(((totalAmount - netTaxable) / 2) * 100) / 100;
  const cgst = Math.round(((totalAmount - netTaxable) / 2) * 100) / 100;
  const totalGst = sgst + cgst;
  const baseSubtotal = subtotalAmount != null ? subtotalAmount : (totalAmount + discountAmount);
  const grandTotal = totalAmount;

  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

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

  const itemRows = items.length > 0 
    ? items.map(it => `<tr><td class="td-name">${it.label}</td><td class="td-val">${it.value}</td></tr>`).join('')
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
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1;
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
          <div class="brand-title">DEUCE</div>
          <div class="brand-sub">YELAGIRI &bull; GST: 33INYPK7449Q1ZL</div>
        </div>
      </div>

      <div class="info-bar">
        <span>TKT: <strong>${receiptId}</strong></span>
        <span class="status-tag ${statusBadgeClass}">${statusText}</span>
      </div>

      <div class="pass-box">
        <div class="pass-details">
          <div class="act-title">${activityName}</div>
          <div>Package: <strong>${displayPackage}</strong></div>
          <div>Guest: <strong>${customerName}</strong></div>
          <div>Passes: <strong>${quantity} Pax</strong></div>
          <div>Date/Slot: <strong>${visitDate}</strong> (${slot})</div>
        </div>
        <div class="qr-box">
          ${qrSvg}
        </div>
      </div>

      <!-- Ticket Split Up -->
      <table class="items-table">
        <thead>
          <tr>
            <th>Ticket Split Up</th>
            <th style="text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.length > 0 
            ? items.map(it => `<tr><td class="td-name">${it.label}</td><td class="td-val">${it.value}</td></tr>`).join('')
            : `<tr><td class="td-name">${activityName} (${quantity} Pax)</td><td class="td-val">₹${totalAmount.toFixed(2)}</td></tr>`
          }
        </tbody>
      </table>
    </div>

      <!-- Base Amount, SGST and CGST in one line -->
      <div style="font-size: 10px; font-weight: 700; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; margin: 4px 0; display: flex; justify-content: space-between; text-align: center;">
        <span>Base: ₹${netTaxable.toFixed(2)}</span>
        <span>SGST (9%): ₹${sgst.toFixed(2)}</span>
        <span>CGST (9%): ₹${cgst.toFixed(2)}</span>
      </div>

      <div class="summary-box">
        ${discountAmount > 0 ? `
        <div class="summary-row">
          <span>Discount (${discountPercentage}%)</span>
          <span>-₹${discountAmount.toFixed(2)}</span>
        </div>
        ` : ''}

        <div class="total-row">
          <span>GRAND TOTAL (${paymentMethod.toUpperCase()})</span>
          <span>₹${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      <div class="footer-note">
        Valid for date/slot printed above. Non-refundable.
        <br/><strong>Thank you for visiting DEUCE!</strong>
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

