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
      padding: 24px;
      max-width: 680px;
      margin: 0 auto;
    }

    /* ── Header ── */
    .header {
      text-align: center;
      border-bottom: 3px solid #000;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header h1 { font-size: 22px; font-weight: 900; letter-spacing: 2px; }
    .header p  { font-size: 10px; color: #555; margin-top: 2px; }

    /* ── Meta row ── */
    .meta {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #555;
      margin-bottom: 14px;
    }

    /* ── Details table ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    tr { border-bottom: 1px solid #eee; }
    .td-label { font-size: 10px; color: #666; padding: 5px 0; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; width: 40%; }
    .td-val   { font-size: 11px; font-weight: 700; padding: 5px 0; text-align: right; }

    /* ── Total ── */
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 900;
      border-top: 2px solid #000;
      padding-top: 8px;
      margin-bottom: 20px;
    }
    ${paymentStatus === 'pending' ? '.total-row span:last-child { color: #d97706; }' : ''}

    /* ── Footer note ── */
    .receipt-footer {
      text-align: center;
      font-size: 9px;
      color: #888;
      margin-bottom: 24px;
    }

    /* ── Pass divider ── */
    .passes-header {
      text-align: center;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 3px;
      border-top: 2px dashed #000;
      border-bottom: 2px dashed #000;
      padding: 8px 0;
      margin-bottom: 16px;
    }

    /* ── Individual pass ── */
    .pass {
      border: 2px solid #000;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .pass-left { flex: 1; }
    .pass-activity { font-size: 15px; font-weight: 900; letter-spacing: .5px; margin-bottom: 4px; }
    .pass-id       { font-size: 9px;  font-family: monospace; color: #555; margin-bottom: 2px; }
    .pass-customer { font-size: 11px; font-weight: 700; margin-bottom: 2px; }
    .pass-date     { font-size: 10px; color: #444; margin-bottom: 4px; }
    .pass-num      { font-size: 9px;  font-weight: 700; background: #000; color: #fff; display: inline-block; padding: 2px 8px; border-radius: 99px; }
    .pass-right    { text-align: center; margin-left: 16px; }
    .qr            { width: 80px; height: 80px; display: block; }
    .scan-label    { font-size: 7px; font-weight: 900; letter-spacing: 1.5px; margin-top: 4px; }

    @media print {
      body { padding: 0; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>DEUCE PARK</h1>
    <p>GSTIN: 33INYPK7449Q1ZL &nbsp;&bull;&nbsp; Offline Billing Receipt</p>
  </div>

  <div class="meta">
    <span>Receipt: <strong>${receiptId}</strong></span>
    <span>Printed: ${now}</span>
  </div>

  <table>
    <tr><td class="td-label">Customer</td><td class="td-val">${customerName}</td></tr>
    <tr><td class="td-label">Activity</td><td class="td-val">${activityName}</td></tr>
    ${itemRows}
    <tr><td class="td-label">Session</td><td class="td-val">${visitDate} @ ${slot}</td></tr>
    <tr><td class="td-label">Invoice ID</td><td class="td-val">${receiptId}</td></tr>
    <tr><td class="td-label">Payment Status</td><td class="td-val" style="font-weight:900;text-transform:uppercase;">${paymentStatus === 'pending' ? 'PENDING' : 'PAID'}</td></tr>
    ${paymentMethod ? `<tr><td class="td-label">Payment Method</td><td class="td-val" style="text-transform:uppercase;">${paymentMethod}</td></tr>` : ''}
    ${transactionId ? `<tr><td class="td-label">Transaction Ref</td><td class="td-val font-mono" style="font-size:10px;">${transactionId}</td></tr>` : ''}
    <tr><td class="td-label">State GST / SGST (9%)</td><td class="td-val">₹${sgst.toFixed(2)}</td></tr>
    <tr><td class="td-label">Central GST / CGST (9%)</td><td class="td-val">₹${cgst.toFixed(2)}</td></tr>
  </table>

  <div class="total-row">
    <span>TOTAL</span>
    <span>₹${grandTotal.toFixed(2)}${paymentStatus === 'pending' ? ' (Due)' : ''}</span>
  </div>

  <div class="receipt-footer">
    Thank you for visiting Deuce Park! &nbsp;•&nbsp; Please keep this receipt.
    <br/>System generated offline receipt &nbsp;•&nbsp; ${now}
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
