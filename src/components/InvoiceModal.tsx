/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Booking, FoodOrder, Payment } from '../types';
import { Printer, X, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';

interface InvoiceModalProps {
  booking?: Booking;
  order?: FoodOrder;
  payment?: Payment;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ booking, order, payment, onClose }) => {
  const getSubtotalAndTax = () => {
    let subtotal = 0;
    if (booking) {
      subtotal = booking.totalAmount;
    } else if (order) {
      subtotal = order.totalAmount;
    }
    const tax = subtotal * 0.12; // 12% GST/Adventure tax
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = getSubtotalAndTax();

  const handlePrint = () => {
    window.print();
  };

  const transactionId = payment?.transactionId || `tx-${Math.floor(10000000 + Math.random() * 90000000)}`;
  const paymentMethod = payment?.method || 'card';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-panel border border-[#00ABAB]/30 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Top Header Banner with 3D gradient */}
        <div className="p-6 bg-gradient-to-r from-teal-600 via-teal-700 to-teal-800 text-[#0B0F14] rounded-t-2xl relative ">
          <button 
            id="btn-close-invoice"
            onClick={onClose} 
            className="absolute top-4 right-4 p-1.5 rounded-full hover:glass-panel/10 text-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-black/25 rounded-xl border border-white/20 text-teal-200">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-black text-teal-200 font-mono">Payment Processed Successfully</span>
              <h3 className="text-lg font-bold font-sans tracking-tight">Official Invoice & Receipt</h3>
            </div>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="p-6 space-y-6 flex-1 print:p-0 text-[#FFFFFF]">
          
          {/* Park Branding */}
          <div className="flex justify-between items-start border-b border-[#00ABAB]/30 pb-4">
            <div>
              <h4 className="font-extrabold text-base text-teal-950 font-sans tracking-tight">DEUCE ADVENTURE PARK</h4>
              <p className="text-[10px] text-[#9CA3AF] font-mono mt-0.5">1 Adventure Way, Food Street Wing</p>
              <p className="text-[10px] text-[#9CA3AF] font-mono">GSTIN: 29AAAAA1111A1Z1</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#9CA3AF]">Invoice ID</span>
              <h5 className="font-mono text-xs font-bold text-teal-700">
                {booking ? `INV-B-${booking.id}` : `INV-F-${order?.id}`}
              </h5>
              <p className="text-[10px] text-[#9CA3AF] font-mono mt-0.5">
                {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}
              </p>
            </div>
          </div>

          {/* Customer & Transaction Info */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-[#0A0A0A]/50 p-4 rounded-xl border border-[#00ABAB]/30 font-mono">
            <div>
              <span className="text-[9px] text-[#9CA3AF] uppercase font-bold">Billed To:</span>
              <div className="font-bold text-[#FFFFFF] font-sans text-sm mt-0.5">
                {booking ? booking.customerName : order?.customerName}
              </div>
              <div className="text-[#40E0D0] text-[11px] font-bold mt-0.5">
                {booking ? booking.customerPhone : order?.customerPhone || 'N/A'}
              </div>
              <div className="text-[#9CA3AF] truncate text-[11px] mt-0.5">
                {booking ? booking.customerEmail : order?.customerEmail}
              </div>
            </div>
            <div>
              <span className="text-[9px] text-[#9CA3AF] uppercase font-bold">Payment Details:</span>
              <div className="flex items-center gap-1.5 font-bold text-[#40E0D0] font-sans mt-0.5 capitalize">
                <CreditCard className="h-3.5 w-3.5" />
                {paymentMethod.replace('_', ' ')}
              </div>
              <div className="text-[#9CA3AF] truncate text-[10px] mt-0.5">
                Ref: {transactionId}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <span className="text-[9px] text-[#9CA3AF] uppercase font-bold block mb-2 font-mono">Billing Items:</span>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#00ABAB]/30 text-[#9CA3AF] font-mono font-bold">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {booking ? (
                  <tr>
                    <td className="py-2.5">
                      <div className="font-bold text-[#FFFFFF]">{booking.activityName}</div>
                      <div className="text-[10px] text-[#9CA3AF] mt-0.5">
                        {booking.date} @ {booking.timeSlot} â€¢ {booking.details}
                      </div>
                    </td>
                    <td className="py-2.5 text-center font-mono text-[#9CA3AF]">{booking.quantity}</td>
                    <td className="py-2.5 text-right font-mono text-[#9CA3AF]">
                      ${(booking.totalAmount / booking.quantity).toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right font-mono text-[#40E0D0] font-bold">
                      ${booking.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ) : (
                  order?.items.map((item, idx) => (
                    <tr key={idx} id={`invoice-item-${item.id}`}>
                      <td className="py-2.5">
                        <div className="font-bold text-[#FFFFFF]">{item.name}</div>
                        <div className="text-[10px] text-[#9CA3AF] mt-0.5">{item.vendorName}</div>
                      </td>
                      <td className="py-2.5 text-center font-mono text-[#9CA3AF]">{item.quantity}</td>
                      <td className="py-2.5 text-right font-mono text-[#9CA3AF]">${item.price.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono text-[#40E0D0] font-bold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pricing Summary */}
          <div className="border-t border-[#00ABAB]/30 pt-4 space-y-1.5 text-xs text-right font-mono text-[#9CA3AF]">
            <div className="flex justify-between">
              <span className="text-[#9CA3AF]">Subtotal:</span>
              <span className="text-[#FFFFFF]">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9CA3AF]">Adventure Tax / GST (12%):</span>
              <span className="text-[#FFFFFF]">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-[#00ABAB]/30 pt-2 font-bold text-sm">
              <span className="text-[#FFFFFF] font-sans">Total Charged:</span>
              <span className="text-[#40E0D0] font-sans text-base font-extrabold">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* QR Code Segment for Booking with glowing sci-fi aesthetic */}
          {booking && (
            <div className="bg-[#0A0A0A]/50 border border-[#00ABAB]/30 rounded-xl p-4 flex flex-col items-center text-center space-y-3">
              <div className="glass-panel p-3 rounded-xl shadow-xs">
                {/* SVG QR Code Simulation */}
                <svg className="w-28 h-28 text-slate-950" viewBox="0 0 100 100">
                  <path d="M5 5h30v30H5V5zm6 6v18h18V11H11zM65 5h30v30H65V5zm6 6v18h18V11H71zM5 65h30v30H5V65zm6 6v18h18V71H11z" fill="currentColor"/>
                  <path d="M45 5h10v10H45V5zm0 20h10v10H45V25zm20 40h10v10H65V65zm20 0h10v10H85V65zm-20 20h10v10H65V85zm-20-20h10v10H45V65zm20-20h10v10H65V45zm-10 10h10v10H55V55zm20 0h10v10H75V55zm10 10h10v10H85V65zm-40 0h10v10H45V65z" fill="currentColor"/>
                  <path d="M15 15h2v2h-2v-2zm4 4h2v2h-2v-2zm5 5h2v2h-2v-2zM75 15h2v2h-2v-2zm4 4h2v2h-2v-2zm-60 60h2v2h-2v-2zm4 4h2v2h-2v-2z" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-mono bg-teal-100 text-teal-950 font-bold tracking-widest px-3 py-1 rounded-full border border-[#00ABAB]/30">GATE ENTRY PASS</span>
                <p className="text-[11px] text-[#9CA3AF] mt-2 leading-relaxed max-w-xs">Scan at any Activity Check-In Point to activate your check-in automatically.</p>
              </div>
            </div>
          )}

          {order && (
            <div className="bg-[#0A0A0A]/50 border border-[#00ABAB]/30 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="text-left font-mono">
                <span className="text-[9px] text-[#9CA3AF] font-bold uppercase tracking-wider block font-sans">Food Ticket ID</span>
                <div className="font-bold text-sm text-[#FFFFFF] mt-0.5">{order.id}</div>
                <p className="text-[10px] text-[#9CA3AF] leading-normal mt-1 font-sans">Present this screen to the counter as soon as your status is "Ready"</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-[#9CA3AF] font-bold block uppercase">Live Status</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-950 border border-teal-300 mt-1.5 uppercase tracking-wide">
                  {order.status}
                </span>
              </div>
            </div>
          )}

        </div>

        {/* Action Controls Footer */}
        <div className="p-4 bg-[#0A0A0A] border-t border-slate-100 rounded-b-2xl flex gap-3 justify-end">
          <button
            id="btn-print-receipt"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border border-[#00ABAB]/30 hover:bg-[#121A24] text-[#9CA3AF] transition-colors cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </button>
          <button
            id="btn-close-invoice-modal"
            onClick={onClose}
            className="px-5 py-2 text-xs font-black rounded-xl btn-glow text-[#0B0F14] transition-all  cursor-pointer"
          >
            Close Receipt
          </button>
        </div>

      </div>
    </div>
  );
};








