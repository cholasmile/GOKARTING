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
            <h1 className="text-xl font-bold uppercase tracking-tight text-black print:text-[17px] leading-none">DEUCE</h1>
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
          <p className="text-xs font-sans font-bold text-black tracking-wider uppercase print:text-[10px]">
            PASS ID: {ticket.id}
          </p>
        </div>

        {/* ── GUEST & SESSION DETAILS ── */}
        <div className="grid grid-cols-2 gap-1.5 mb-2 pb-2 border-b border-solid border-black font-sans text-xs print:text-[11px] print:gap-1 print:mb-1.5 print:pb-1.5">
          <div>
            <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Guest Name</span>
            <span className="font-bold text-black truncate block">{ticket.customerName}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-800 font-semibold uppercase block print:text-[9px]">Contact</span>
            <span className="font-mono font-bold text-black truncate block">{ticket.customerPhone || 'Registered Guest'}</span>
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
        </div>

        {/* ── COMBINED RECEIPT / TAX BREAKDOWN SECTION ── */}
        <div className="mb-2 pb-2 border-b border-solid border-black print:mb-1.5 print:pb-1.5">
          <table className="w-full text-xs font-sans print:text-[11px]">
            <thead>
              <tr className="border-b border-black text-left font-bold">
                <th className="py-0.5">Ticket Split Up</th>
                <th className="py-0.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-0.5 font-semibold text-black">{ticket.activityName} ({ticket.quantity}x)</td>
                <td className="py-0.5 text-right font-mono font-bold text-black">₹{totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── BASE AMOUNT, SGST AND CGST IN ONE LINE ── */}
          <div className="text-[10px] font-sans font-bold border-t border-b border-black py-1 my-1.5 flex justify-between print:text-[9.5px]">
            <span>Base: ₹{basePrice.toFixed(2)}</span>
            <span>SGST (9%): ₹{sgst.toFixed(2)}</span>
            <span>CGST (9%): ₹{cgst.toFixed(2)}</span>
          </div>

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
        <div className="text-center text-xs text-black leading-tight space-y-1 print:text-[10px] font-bold">
          <p className="font-black text-black">Valid only for date printed. Present QR code at gate scanner.</p>
        </div>

      </div>
    </div>
  );
};

export default TicketPass;
