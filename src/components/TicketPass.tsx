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
        className="bg-white text-black p-5 w-full mx-auto print:w-[2.85in] print:max-w-[2.85in] print:max-h-[3.85in] print:p-1.5 print:shadow-none print:m-0 print:border print:border-black print:rounded relative overflow-hidden font-mono text-xs leading-tight"
      >
        {/* Background Watermark (hidden on print) */}
        <img 
          src="/deuce-logo.jpg" 
          alt="Watermark" 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 opacity-[0.03] pointer-events-none z-0 print:hidden" 
        />
        
        {/* ── HEADER ── */}
        <div className="text-center pb-2 mb-2 border-b border-dashed border-gray-300 relative z-10 flex flex-col items-center print:pb-1 print:mb-1">
          <img 
            src="/deuce-logo.jpg" 
            alt="Deuce Logo" 
            className="w-10 h-10 rounded-xl object-cover mb-1 shadow-sm border border-gray-200 print:hidden" 
          />
          <h1 className="text-lg font-black uppercase tracking-tight text-black print:text-[11px]">Deuce Adventure Park</h1>
          <p className="text-gray-500 text-[10px] font-mono print:text-[7px]">Yelagiri Hills • GST: 33INYPK7449Q1ZL</p>
        </div>

        {/* ── PASS & TURNSTILE GATE QR SECTION ── */}
        <div className="bg-gray-50 p-2 rounded-xl border border-gray-200 mb-2 text-center relative z-10 print:p-1 print:mb-1">
          <div className="inline-block p-1 bg-white rounded-lg border border-gray-200 mb-1">
            <QRCodeSVG 
              value={ticket.qrCodeValue || `DEUCE-PASS-${ticket.id}`} 
              size={100} 
              level="M" 
              includeMargin={false}
              className="print:w-12 print:h-12 mx-auto"
            />
          </div>
          <p className="text-[10px] font-mono font-black text-black tracking-wider uppercase print:text-[8px]">
            PASS ID: {ticket.id}
          </p>
        </div>

        {/* ── GUEST & SESSION DETAILS ── */}
        <div className="grid grid-cols-2 gap-1.5 mb-2 pb-2 border-b border-dashed border-gray-300 font-sans text-[11px] print:text-[7.5px] print:gap-1 print:mb-1 print:pb-1">
          <div>
            <span className="text-[9px] text-gray-500 font-bold uppercase block print:text-[6.5px]">Guest Name</span>
            <span className="font-bold text-black truncate block">{ticket.customerName}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-500 font-bold uppercase block print:text-[6.5px]">Contact</span>
            <span className="font-mono font-bold text-black truncate block">{ticket.customerPhone || 'Registered Guest'}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-500 font-bold uppercase block print:text-[6.5px]">Activity</span>
            <span className="font-black text-blue-700 truncate block print:text-black">{ticket.activityName}</span>
          </div>
          <div>
            <span className="text-[9px] text-gray-500 font-bold uppercase block print:text-[6.5px]">Passes / Date</span>
            <span className="font-bold text-black">{ticket.quantity} Pax &bull; {ticket.date}</span>
          </div>
        </div>

        {/* ── COMBINED RECEIPT / TAX BREAKDOWN SECTION ── */}
        <div className="mb-2 pb-2 border-b border-dashed border-gray-300 print:mb-1 print:pb-1">
          <table className="w-full text-xs font-mono print:text-[7.5px]">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-0.5 text-gray-600">{ticket.activityName} ({ticket.quantity}x)</td>
                <td className="py-0.5 text-right font-bold text-black">₹{basePrice.toFixed(2)}</td>
              </tr>
              <tr className="border-b border-gray-100 text-[10px] text-gray-500 print:text-[7px]">
                <td className="py-0.5">GST (18%)</td>
                <td className="py-0.5 text-right font-mono">₹{(cgst + sgst).toFixed(2)}</td>
              </tr>
              <tr className="text-xs font-black text-black print:text-[9px]">
                <td className="pt-1">GRAND TOTAL</td>
                <td className="pt-1 text-right text-emerald-700 print:text-black">₹{totalAmount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── TERMS & GATE INSTRUCTIONS FOOTER ── */}
        <div className="text-center text-[9px] text-gray-500 leading-tight space-y-0.5 print:text-[6.5px]">
          <p className="font-bold text-gray-700 print:text-black">Valid only for date printed. Present QR code at gate scanner.</p>
        </div>

      </div>
    </div>
  );
};

export default TicketPass;
