export interface PrintTicketOptions {
  receiptId: string;
  activityName: string;
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

  const baseSubtotal = subtotalAmount != null ? subtotalAmount : (totalAmount + discountAmount);
  const netTaxable = totalAmount;
  const sgst = netTaxable * 0.09;
  const cgst = netTaxable * 0.09;
  const grandTotal = netTaxable;

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
    : `<tr><td class="td-name">${activityName}</td><td class="td-val">₹${totalAmount.toFixed(2)}</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Receipt – ${receiptId}</title>
  <style>
    /* STRICT 3-INCH BREADTH X 4-INCH HEIGHT THERMAL RECEIPT SETUP */
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page {
      size: 3in 4in;
      margin: 1.5mm;
    }
    html, body {
      width: 3in;
      max-width: 3in;
      height: 4in;
      max-height: 4in;
      background: #fff;
      color: #000;
      font-family: 'Courier New', Courier, monospace, sans-serif;
      font-size: 8px;
      line-height: 1.15;
      overflow: hidden;
    }
    .receipt-box {
      width: 100%;
      max-width: 2.85in;
      max-height: 3.85in;
      margin: 0 auto;
      padding: 4px 6px;
      border: 1px solid #000;
      border-radius: 4px;
      background: #fff;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }

    /* ── HEADER ── */
    .header {
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 3px;
      margin-bottom: 3px;
    }
    .brand-title {
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .brand-sub {
      font-size: 7px;
      color: #222;
      font-weight: 600;
    }

    /* ── META BAR ── */
    .info-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      margin-bottom: 2px;
    }
    .status-tag {
      font-weight: 900;
      padding: 1px 4px;
      border-radius: 2px;
      font-size: 7.5px;
      text-transform: uppercase;
      border: 1px solid #000;
    }
    .status-paid { background: #000; color: #fff; }
    .status-pending { background: #fff; color: #000; }
    .status-refunded { background: #000; color: #fff; }
    
    .timestamp-line {
      font-size: 7px;
      color: #333;
      margin-bottom: 3px;
      border-bottom: 1px dotted #aaa;
      padding-bottom: 2px;
    }

    /* ── COMPACT GATE PASS & QR ── */
    .pass-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #000;
      border-radius: 3px;
      padding: 3px 4px;
      margin-bottom: 3px;
      background: #fdfdfd;
    }
    .pass-details {
      flex: 1;
      font-size: 7.5px;
      line-height: 1.15;
    }
    .act-title {
      font-size: 9.5px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 1px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 1.8in;
    }
    .qr-box {
      width: 44px;
      text-align: center;
      margin-left: 4px;
      flex-shrink: 0;
    }
    .qr-code {
      width: 42px;
      height: 42px;
      display: block;
      margin: 0 auto;
    }
    .qr-sub {
      font-size: 6px;
      font-weight: 900;
      letter-spacing: 0.3px;
      margin-top: 1px;
    }

    /* ── ITEMS & SUMMARY TABLE ── */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5px;
      margin-bottom: 2px;
    }
    .items-table td {
      padding: 1px 0;
    }
    .td-name { font-weight: 700; text-align: left; }
    .td-val { text-align: right; font-weight: 700; font-family: monospace; }

    .summary-box {
      border-top: 1px dashed #000;
      padding-top: 2px;
      font-size: 7.5px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5px 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      font-weight: 900;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 2px 0;
      margin-top: 2px;
    }

    /* ── FOOTER ── */
    .footer-note {
      text-align: center;
      font-size: 6.5px;
      color: #333;
      border-top: 1px dotted #ccc;
      padding-top: 2px;
      margin-top: 2px;
      line-height: 1.1;
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div>
      {/* Header */}
      <div class="header">
        <div class="brand-title">DEUCE ADVENTURE PARK</div>
        <div class="brand-sub">Yelagiri Hills &bull; GST: 33INYPK7449Q1ZL</div>
      </div>

      {/* Meta Bar */}
      <div class="info-bar">
        <span>NO: <strong>${receiptId}</strong></span>
        <span class="status-tag ${statusBadgeClass}">${statusText}</span>
      </div>
      <div class="timestamp-line">Issued: ${now} &bull; ${counterStaff}</div>

      {/* Gate Pass & QR Code */}
      <div class="pass-box">
        <div class="pass-details">
          <div class="act-title">${activityName}</div>
          <div>Guest: <strong>${customerName}</strong></div>
          <div>Passes: <strong>${quantity} Pax</strong></div>
          <div>Date/Slot: <strong>${visitDate}</strong> (${slot})</div>
        </div>
        <div class="qr-box">
          ${qrSvg}
          <div class="qr-sub">GATE SCAN</div>
        </div>
      </div>

      {/* Itemized Table */}
      <table class="items-table">
        <tbody>
          ${itemRows}
        </tbody>
      </table>
    </div>

    <div>
      {/* Summary */}
      <div class="summary-box">
        <div class="summary-row">
          <span>Subtotal</span>
          <span>₹${baseSubtotal.toFixed(2)}</span>
        </div>

        ${discountAmount > 0 ? `
        <div class="summary-row">
          <span>Discount (${discountPercentage}%)</span>
          <span>-₹${discountAmount.toFixed(2)}</span>
        </div>
        ` : ''}

        <div class="summary-row">
          <span>GST (SGST 9% + CGST 9%)</span>
          <span>₹${(sgst + cgst).toFixed(2)}</span>
        </div>

        <div class="total-row">
          <span>GRAND TOTAL (${paymentMethod.toUpperCase()})</span>
          <span>₹${grandTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div class="footer-note">
        Valid for date/slot printed above. Non-refundable.
        <br/><em>Thank you for visiting Deuce Park!</em>
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

