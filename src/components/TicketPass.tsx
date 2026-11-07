/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unified All-In-One Entry Pass & Tax Invoice Receipt
 */

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { Ticket, Booking } from '../types';
import { Printer, Download, Share2, ShieldCheck, CheckCircle2, Receipt, Ticket as TicketIcon } from 'lucide-react';
import { printTicket } from '../lib/printTicket';

interface Props {
  ticket: Ticket;
  booking: Booking;
}

export const TicketPass: React.FC<Props> = ({ ticket, booking }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Deuce_Pass_Receipt_${ticket.id}`,
  });

  const basePrice = Math.round((booking.totalAmount || 0) / 1.18 * 100) / 100;
  const cgst = Math.round((booking.totalAmount || 0) * 0.09 * 100) / 100;
  const sgst = Math.round((booking.totalAmount || 0) * 0.09 * 100) / 100;
  const totalAmount = booking.totalAmount || 0;

  const rawToken = ticket.tokenNumber || booking.tokenNumber || ticket.id;
  const tokenDisplay = typeof rawToken === 'string' && rawToken.startsWith('#') ? rawToken : `#${rawToken}`;

  const rawTimestamp = booking.bookingDate || ticket.updatedAt || booking.updatedAt;
  const formattedTimestamp = (() => {
    if (rawTimestamp) {
      try {
        return new Date(rawTimestamp).toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      } catch {}
    }
    return new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  })();

  // Extract Laps, Shots, Duration/Time, and Entitlements
  const combinedSpecsText = [
    ticket.unitOrDuration,
    booking?.unitOrDuration,
    ticket.duration,
    booking?.duration,
    ticket.packageName,
    booking?.packageName,
    ticket.ticketType,
    booking?.details,
    ticket.activityName
  ].filter(Boolean).join(' | ');

  const lapsMatch = combinedSpecsText.match(/(?:^|[^\w])(\d+)\s*(?:-\s*)?laps?\b/i) || combinedSpecsText.match(/\blaps?\s*[:=-]?\s*(\d+)\b/i);
  const shotsMatch = combinedSpecsText.match(/(?:^|[^\w])(\d+)\s*(?:-\s*)?(?:shots?|pellets?|rounds?)\b/i) || combinedSpecsText.match(/\b(?:shots?|pellets?|rounds?)\s*[:=-]?\s*(\d+)\b/i);
  const durMatch = combinedSpecsText.match(/(?:^|[^\w])(\d+\s*(?:-\s*)?(?:mins?|minutes?|hrs?|hours?))\b/i) || combinedSpecsText.match(/\b(?:duration|time)\s*[:=-]?\s*(\d+\s*(?:mins?|minutes?|hrs?|hours?))\b/i);
  const rideMatch = combinedSpecsText.match(/(?:^|[^\w])(\d+\s*(?:-\s*)?rides?)\b/i);

  const rawLaps = ticket.laps != null ? ticket.laps : (booking?.laps != null ? booking.laps : (lapsMatch ? Number(lapsMatch[1] || lapsMatch[2]) : undefined));
  const lapsDisplay = rawLaps != null 
    ? (ticket.quantity > 1 && rawLaps < 100 ? `${rawLaps} Laps / Pax (${rawLaps * ticket.quantity} Total)` : `${rawLaps} Lap${rawLaps !== 1 ? 's' : ''}`)
    : undefined;

  const rawShots = ticket.shots != null ? ticket.shots : (booking?.shots != null ? booking.shots : (shotsMatch ? Number(shotsMatch[1] || shotsMatch[2]) : undefined));
  const shotsDisplay = rawShots != null
    ? (ticket.quantity > 1 ? `${rawShots} Shots / Shooter (${rawShots * ticket.quantity} Total)` : `${rawShots} Shot${rawShots !== 1 ? 's' : ''}`)
    : undefined;

  const durationDisplay = ticket.duration?.trim() || booking?.duration?.trim() || (durMatch ? durMatch[1].trim() : undefined);
  const unitDisplay = ticket.unitOrDuration?.trim() || booking?.unitOrDuration?.trim() || (rideMatch ? rideMatch[1].trim() : undefined);

  const specsList: string[] = [];
  if (lapsDisplay) specsList.push(`🏁 LAPS: ${lapsDisplay}`);
  if (durationDisplay) specsList.push(`⏱ TIME: ${durationDisplay}`);
  if (shotsDisplay) specsList.push(`🎯 SHOTS: ${shotsDisplay}`);
  if (!lapsDisplay && !durationDisplay && !shotsDisplay && unitDisplay) specsList.push(`⭐ SPEC: ${unitDisplay}`);

  return (
    <div className="bg-[#0B1120] rounded-3xl overflow-hidden border border-[#14F1D9]/30 shadow-2xl max-w-md mx-auto">
      
      {/* ── PRINTABLE COMBINED PASS & RECEIPT CONTAINER ── */}
      <div 
        ref={printRef} 
        className="bg-white text-black p-5 w-full mx-auto print:w-[2.85in] print:max-w-[2.85in] print:h-auto print:p-1.5 print:mt-0 print:pt-1 print:shadow-none print:m-0 print:border print:border-black print:rounded-md relative overflow-hidden font-sans text-xs leading-normal"
      >
        {/* Background Watermark (hidden on print) */}
        <img 
          src="/deuce-logo.jpg" 
          alt="Watermark" 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 opacity-[0.03] pointer-events-none z-0 print:hidden" 
        />
        
        {/* ── HEADER ── */}
        <div className="flex items-center justify-center gap-2.5 pb-2 mb-2 border-b border-solid border-black relative z-10 print:pb-1.5 print:mb-1.5">
          <img 
            src="/deuce-logo.jpg" 
            alt="Deuce Logo" 
            className="w-10 h-10 rounded-md object-cover shadow-sm border border-black flex-shrink-0 print:w-10 print:h-10" 
          />
          <div className="text-left">
            <h1 className="text-lg font-bold uppercase tracking-tight text-black print:text-[16px] leading-tight">DEUCE SPORTS GROUP</h1>
            <p className="text-black text-[10.5px] font-sans font-semibold uppercase print:text-[9.5px] mt-0.5">Yelagiri • GST: 33INYPK7449Q1ZL</p>
          </div>
        </div>

        {/* ── PASS & TURNSTILE GATE QR SECTION ── */}
        <div className="bg-white p-2 rounded-lg border border-black mb-2 text-center relative z-10 print:p-1.5 print:mb-1.5">
          <div className="inline-block p-1 bg-white rounded border border-black mb-1">
            <QRCodeSVG 
              value={ticket.qrCodeValue || `DEUCE-PASS-${ticket.id}`} 
              size={100} 
              level="M" 
              includeMargin={false}
              className="print:w-14 print:h-14 mx-auto"
            />
          </div>
          <p className="text-xs font-sans font-black text-black tracking-wider uppercase print:text-[11px]">
            TOKEN NO: {tokenDisplay}
          </p>
          <p className="text-[10px] font-sans font-semibold text-gray-700 tracking-tight print:text-[9px]">
            TIME STAMP: {formattedTimestamp}
          </p>
        </div>

        {/* ── GUEST & SESSION DETAILS ── */}
        <div className="grid grid-cols-2 gap-1.5 mb-2 pb-2 border-b border-solid border-black font-sans text-xs print:text-[11px] print:gap-1 print:mb-1.5 print:pb-1.5">
          <div>
            <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Customer Name</span>
            <span className="font-bold text-black truncate block">{ticket.customerName || booking.customerName}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Customer Phone Number</span>
            <span className="font-mono font-bold text-black truncate block">{ticket.customerPhone || booking.customerPhone || 'N/A'}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Token No</span>
            <span className="font-mono font-bold text-black truncate block">{tokenDisplay}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Time Stamp</span>
            <span className="font-mono font-bold text-black truncate block">{formattedTimestamp}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Activity</span>
            <span className="font-bold text-black truncate block">{ticket.activityName}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Package</span>
            <span className="font-bold text-black truncate block">{booking?.details || 'Standard Package'}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Passes / Date</span>
            <span className="font-bold text-black">{ticket.quantity} Pax &bull; {ticket.date}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Time Slot</span>
            <span className="font-bold text-black">{ticket.timeSlot || booking.timeSlot || 'Standard Session'}</span>
          </div>
          {lapsDisplay && (
            <div>
              <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">No. of Laps</span>
              <span className="font-bold text-black">{lapsDisplay}</span>
            </div>
          )}
          {durationDisplay && (
            <div>
              <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Time / Duration</span>
              <span className="font-bold text-black">{durationDisplay}</span>
            </div>
          )}
          {shotsDisplay && (
            <div>
              <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">No. of Shots</span>
              <span className="font-bold text-black">{shotsDisplay}</span>
            </div>
          )}
          {(!lapsDisplay && !durationDisplay && !shotsDisplay && unitDisplay) && (
            <div>
              <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Entitlement</span>
              <span className="font-bold text-black">{unitDisplay}</span>
            </div>
          )}
        </div>

        {/* ── SESSION SPECIFICATIONS / ENTITLEMENTS BANNER ── */}
        {specsList.length > 0 && (
          <div className="bg-gray-50 border border-black rounded p-1.5 mb-2 print:p-1 print:mb-1.5 text-center">
            <div className="text-[9.5px] font-black uppercase tracking-wider text-black border-b border-dashed border-black pb-0.5 mb-1 print:text-[8.5px]">
              Session Specifications &amp; Entitlements
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 text-xs font-bold text-black print:text-[10px]">
              {specsList.map((spec, i) => (
                <span key={i} className="px-1.5 py-0.5 border border-black rounded bg-white font-mono">
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── COMBINED RECEIPT / TAX BREAKDOWN SECTION ── */}
        <div className="mb-2 pb-2 border-b border-solid border-black print:mb-1.5 print:pb-1.5">
          <table className="w-full text-xs font-sans print:text-[11px]">
            <thead>
              <tr className="border-b border-black text-left font-bold">
                <th className="py-0.5">Ticket Split Up &amp; Specs</th>
                <th className="py-0.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {booking.isComboPack && booking.comboItems && booking.comboItems.length > 0 ? (
                <>
                  <tr className="border-b border-black font-bold">
                    <td className="py-0.5 text-black">{booking.comboPackName || ticket.activityName} ({ticket.quantity}x Combo)</td>
                    <td className="py-0.5 text-right font-mono font-bold text-black">₹{totalAmount.toFixed(2)}</td>
                  </tr>
                  {booking.comboItems.map((ci, idx) => (
                    <tr key={idx} className="border-b border-gray-200 text-[10px] print:text-[9.5px]">
                      <td className="py-0.5 pl-2 text-gray-800">
                        &#9642; {ci.activityName} ({ci.unitOrDuration}) × {ci.quantity * ticket.quantity}
                      </td>
                      <td className="py-0.5 text-right font-mono text-gray-600">Included</td>
                    </tr>
                  ))}
                </>
              ) : booking.isPackageBundle && booking.packageBundleItems && booking.packageBundleItems.length > 0 ? (
                <>
                  {booking.packageBundleItems.map((pi, idx) => {
                    const piSpec = [
                      pi.laps ? `${pi.laps} Laps` : '',
                      pi.shots ? `${pi.shots} Shots` : '',
                      pi.duration || '',
                      pi.unitOrDuration || ''
                    ].filter(Boolean).join(' • ');
                    return (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-0.5 font-semibold text-black">
                          <div>{pi.packageName} ({pi.quantity}x)</div>
                          {piSpec && (
                            <div className="text-[9.5px] text-gray-700 font-normal">
                              ▪ {piSpec}
                            </div>
                          )}
                        </td>
                        <td className="py-0.5 text-right font-mono font-bold text-black">₹{pi.subtotal.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </>
              ) : (
                <tr className="border-b border-gray-200">
                  <td className="py-0.5 font-semibold text-black">
                    <div>{ticket.activityName} ({ticket.quantity}x)</div>
                    {(lapsDisplay || durationDisplay || shotsDisplay || unitDisplay) && (
                      <div className="text-[9.5px] text-gray-700 font-normal">
                        ▪ {[lapsDisplay, durationDisplay, shotsDisplay, unitDisplay].filter(Boolean).join(' • ')}
                      </div>
                    )}
                  </td>
                  <td className="py-0.5 text-right font-mono font-bold text-black">₹{totalAmount.toFixed(2)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ── BASE AMOUNT, SGST AND CGST IN ONE LINE ── */}
          <div className="text-[10px] font-sans font-bold border-t border-b border-black py-1 my-1.5 flex justify-between print:text-[9.5px]">
            <span>Base: ₹{basePrice.toFixed(2)}</span>
            <span>SGST (9%): ₹{sgst.toFixed(2)}</span>
            <span>CGST (9%): ₹{cgst.toFixed(2)}</span>
          </div>

          {booking.discountAmount && booking.discountAmount > 0 ? (
            <div className="text-[10.5px] font-sans font-bold py-1 border-b border-black space-y-0.5 print:text-[9.5px]">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span className="font-mono">₹{(booking.originalAmount || (totalAmount + booking.discountAmount)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>
                  Discount {booking.discountPercentage ? `(${booking.discountPercentage}%)` : (booking.discountType === 'cash' ? '(Cash Discount)' : '')}
                </span>
                <span className="font-mono">-₹{booking.discountAmount.toFixed(2)}</span>
              </div>
            </div>
          ) : null}

          <table className="w-full text-xs font-sans print:text-[11px]">
            <tbody>
              <tr className="text-sm font-bold text-black print:text-[12.5px]">
                <td className="pt-1">GRAND TOTAL</td>
                <td className="pt-1 text-right text-black">₹{totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── TERMS & GATE INSTRUCTIONS FOOTER ── */}
        <div className="text-center text-xs text-black leading-tight space-y-0.5 print:text-[10px] font-bold">
          <p className="font-black text-black">Valid only for date printed. Present QR code at gate scanner.</p>
          <p className="text-[9px] text-gray-600 font-normal">Printed: {formattedTimestamp}</p>
        </div>

      </div>
    </div>
  );
};

export default TicketPass;
