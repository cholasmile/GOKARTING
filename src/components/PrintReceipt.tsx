import React from 'react';
import { Booking, FoodOrder } from '../types';

interface PrintReceiptProps {
  receiptId: string;
  type: 'booking' | 'food';
  date: string;
  customerName: string;
  totalAmount: number;
  items: { name: string; qty: number; price: number }[];
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({ 
  receiptId, 
  type, 
  date, 
  customerName, 
  totalAmount, 
  items 
}) => {
  return (
    <div id={`print-receipt-${receiptId}`} className="hidden print:block w-full text-black bg-white p-4 font-mono text-sm">
      <div className="text-center border-b-2 border-black pb-2 mb-4">
        <h2 className="text-xl font-black">DEUCE ADVENTURE PARK</h2>
        <p className="text-xs">GSTIN: 22AAAAA0000A1Z5</p>
        <p className="text-xs">Offline Billing Receipt</p>
      </div>

      <div className="flex justify-between mb-2 text-xs">
        <span>Receipt: {receiptId}</span>
        <span>Date: {new Date(date).toLocaleString()}</span>
      </div>
      <div className="mb-4 text-xs">
        <p>Customer: {customerName}</p>
        <p>Type: {type.toUpperCase()}</p>
      </div>

      <table className="w-full text-xs mb-4">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Item</th>
            <th className="text-center py-1">Qty</th>
            <th className="text-right py-1">Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td className="py-1">{item.name}</td>
              <td className="text-center py-1">{item.qty}</td>
              <td className="text-right py-1">${item.price.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t-2 border-black pt-2 flex justify-between font-bold text-sm">
        <span>TOTAL:</span>
        <span>${totalAmount.toFixed(2)}</span>
      </div>
      
      <div className="text-center mt-6">
        <p className="text-[10px]">Thank you for visiting!</p>
        <p className="text-[10px]">Please keep this receipt for your records.</p>
        <p className="mt-2 text-[8px] text-gray-500">System generated offline invoice</p>
      </div>

      {type === 'booking' && (
        <div className="mt-8 pt-8 border-t-2 border-black border-dashed">
          <h3 className="text-lg font-black text-center mb-6">ENTRY PASSES</h3>
          <div className="flex flex-col gap-6">
            {items.map((item, idx) => (
              <React.Fragment key={idx}>
                {Array.from({ length: item.qty }).map((_, i) => (
                  <div key={`${idx}-${i}`} className="border-2 border-black p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-lg">{item.name}</h4>
                      <p className="text-xs mt-1">Ticket ID: {receiptId}-{i + 1}</p>
                      <p className="text-xs">Date: {new Date(date).toLocaleDateString()}</p>
                      <p className="text-xs font-bold mt-2">Pass {i + 1} of {item.qty}</p>
                    </div>
                    <div className="w-24 h-24">
                      {/* Simulated QR Code for print view */}
                      <svg className="w-full h-full text-black" viewBox="0 0 100 100">
                         <path d="M5 5h30v30H5V5zm5 5v20h20V10H10zm55-5h30v30H65V5zm5 5v20h20V10H70zM5 65h30v30H5V65zm5 5v20h20V70H10z" fill="currentColor"/>
                         <path d="M45 10h10v10H45V10zm20 45h10v10H65V55zm15 15h15v15H80V70zm-15 15h10v10H65V85zm-20-20h10v10H45V65zm20-20h10v10H65V45zm-10 10h10v10H55V55z" fill="currentColor"/>
                      </svg>
                      <div className="text-center text-[8px] font-bold mt-1">SCAN AT GATE</div>
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
