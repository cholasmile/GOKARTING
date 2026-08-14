export interface PrintTicketOptions {
  receiptId: string;
  activityName: string;
  customerName: string;
  date: string;
  slot: string;
  items: { label: string; value: string }[];
  totalAmount: number;
  paymentStatus: 'paid' | 'pending';
  quantity: number;
  paymentMethod?: string;
  transactionId?: string;
}

export function printTicket(opts: PrintTicketOptions) {
  const sgst = opts.totalAmount * 0.09;
  const cgst = opts.totalAmount * 0.09;
  const grandTotal = opts.totalAmount + sgst + cgst;
  const {
    receiptId,
    activityName,
    customerName,
    date,
    slot,
    items,
    totalAmount,
    paymentStatus,
    quantity,
    paymentMethod,
    transactionId,
  } = opts;

  const now = new Date().toLocaleString('en-IN');
  const visitDate = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // Build per-person pass blocks
  const passBlocks = Array.from({ length: quantity })
    .map(
      (_, i) => `
      <div class="pass">
        <div class="pass-left">
          <div class="pass-activity">${activityName}</div>
          <div class="pass-id">Ticket: ${receiptId}-${String(i + 1).padStart(2, '0')}</div>
          <div class="pass-customer">${customerName}</div>
          <div class="pass-date">${visitDate} &bull; ${slot}</div>
          <div class="pass-num">Pass ${i + 1} of ${quantity}</div>
        </div>
        <div class="pass-right">
          <svg viewBox="0 0 100 100" class="qr">
            <path d="M5 5h30v30H5V5zm5 5v20h20V10H10zm55-5h30v30H65V5zm5 5v20h20V10H70zM5 65h30v30H5V65zm5 5v20h20V70H10z" fill="#000"/>
            <path d="M45 10h10v10H45V10zm20 45h10v10H65V55zm15 15h15v15H80V70zm-15 15h10v10H65V85zm-20-20h10v10H45V65zm20-20h10v10H65V45zm-10 10h10v10H55V55z" fill="#000"/>
          </svg>
          <div class="scan-label">SCAN AT GATE</div>
        </div>
      </div>`
    )
    .join('');

  const itemRows = items
    .map(
      (it) =>
        `<tr><td class="td-label">${it.label}</td><td class="td-val">${it.value}</td></tr>`
    )
    .join('');

  const summaryRows = `
    <div class="billing-box">
      <div class="billing-row">
        <span>Package Amount</span>
        <span>₹${totalAmount.toFixed(2)}</span>
      </div>
      <div class="billing-row">
        <span>State GST (9%)</span>
        <span>₹${sgst.toFixed(2)}</span>
      </div>
      <div class="billing-row">
        <span>Central GST (9%)</span>
        <span>₹${cgst.toFixed(2)}</span>
      </div>
      <div class="billing-row total-row-print">
        <span>Total</span>
        <span>₹${grandTotal.toFixed(2)}</span>
      </div>
    </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Ticket – ${receiptId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #fff;
      color: #000;
      padding: 14px;
      max-width: 640px;
      margin: 0 auto;
      line-height: 1.25;
    }

    /* ── Header ── */
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .header h1 { font-size: 18px; font-weight: 900; letter-spacing: 1.5px; }
    .header p  { font-size: 9px; color: #111; font-weight: 700; margin-top: 2px; }

    /* ── Meta grid (two columns) ── */
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      font-size: 8.5px;
      color: #555;
      margin-bottom: 10px;
    }
    .meta-box {
      background: #f5f5f5;
      border: 1px solid #e5e5e5;
      border-radius: 5px;
      padding: 6px 8px;
    }

    /* ── Compact two-column info blocks ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }
    .info-box {
      border: 1px solid #e5e5e5;
      background: #fafafa;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      font-size: 8.5px;
      padding: 3px 0;
      border-bottom: 1px solid #efefef;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #666; text-transform: uppercase; letter-spacing: .3px; }
    .info-value { font-weight: 700; text-align: right; }

    .billing-box {
      border: 1px solid #e5e5e5;
      background: #fafafa;
      border-radius: 6px;
      padding: 8px 10px;
      margin: 10px 0 12px;
    }
    .billing-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 8.5px;
      color: #333;
      padding: 4px 0;
      border-bottom: 1px solid #efefef;
    }
    .billing-row:last-child { border-bottom: none; }
    .billing-row.total-row-print {
      font-weight: 900;
      font-size: 11px;
      padding-top: 7px;
      margin-top: 3px;
      border-top: 1.5px solid #111;
    }

    /* ── Total ── */
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 900;
      border-top: 2px solid #000;
      padding-top: 6px;
      margin-bottom: 12px;
    }
    ${paymentStatus === 'pending' ? '.total-row span:last-child { color: #d97706; }' : ''}

    /* ── Footer note ── */
    .receipt-footer {
      text-align: center;
      font-size: 8px;
      color: #888;
      margin-bottom: 12px;
    }

    /* ── Pass divider ── */
    .passes-header {
      text-align: center;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 2px;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
      padding: 6px 0;
      margin-bottom: 10px;
    }

    /* ── Individual pass ── */
    .pass {
      border: 1.5px solid #000;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 12px;
      margin-bottom: 8px;
      page-break-inside: avoid;
    }
    .pass-left { flex: 1; }
    .pass-activity { font-size: 12px; font-weight: 900; letter-spacing: .3px; margin-bottom: 3px; }
    .pass-id       { font-size: 8px; font-family: monospace; color: #555; margin-bottom: 2px; }
    .pass-customer { font-size: 9px; font-weight: 700; margin-bottom: 2px; }
    .pass-date     { font-size: 8px; color: #444; margin-bottom: 4px; }
    .pass-num      { font-size: 7.5px; font-weight: 700; background: #000; color: #fff; display: inline-block; padding: 2px 6px; border-radius: 99px; }
    .pass-right    { text-align: center; margin-left: 12px; }
    .qr            { width: 64px; height: 64px; display: block; }
    .scan-label    { font-size: 6px; font-weight: 900; letter-spacing: 1px; margin-top: 3px; }

    @media print {
      body { padding: 0; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>DEUCE PARK</h1>
    <p>Yelagiri</p>
    <p>GSTIN: 33INYPK7449Q1ZL</p>
  </div>

  <div class="meta-grid">
    <div class="meta-box">Receipt: <strong>${receiptId}</strong></div>
    <div class="meta-box">Printed: ${now}</div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-row"><span class="info-label">Customer</span><span class="info-value">${customerName}</span></div>
      <div class="info-row"><span class="info-label">Activity</span><span class="info-value">${activityName}</span></div>
      <div class="info-row"><span class="info-label">Session</span><span class="info-value">${visitDate}</span></div>
      <div class="info-row"><span class="info-label">Time</span><span class="info-value">${slot}</span></div>
    </div>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Receipt</span><span class="info-value">${receiptId}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-value">${paymentStatus === 'pending' ? 'PENDING' : 'PAID'}</span></div>
      ${paymentMethod ? `<div class="info-row"><span class="info-label">Method</span><span class="info-value">${paymentMethod}</span></div>` : ''}
      ${transactionId ? `<div class="info-row"><span class="info-label">Ref</span><span class="info-value">${transactionId}</span></div>` : ''}
    </div>
  </div>

  ${summaryRows}

  <div class="total-row">
    <span>TOTAL</span>
    <span>₹${grandTotal.toFixed(2)}${paymentStatus === 'pending' ? ' (Due)' : ''}</span>
  </div>

  <div class="receipt-footer">
    Thank you for visiting Deuce Park! &nbsp;•&nbsp; Please keep this receipt.
    <br/>Generated at ${now}
  </div>

  <div class="passes-header">— ENTRY PASSES —</div>
  ${passBlocks}
</body>
</html>`;

  const win = window.open('', '_blank', 'width=720,height=900,scrollbars=yes');
  if (!win) {
    alert('Please allow popups to print the ticket.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Small delay to let styles load before printing
  setTimeout(() => {
    win.print();
    win.close();
  }, 400);
}
