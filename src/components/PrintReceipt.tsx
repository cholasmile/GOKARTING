import React from 'react';

interface PrintReceiptProps {
  receiptId: string;
  tokenNumber?: string | number;
  type: 'booking' | 'food';
  date: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  items: { name: string; qty: number; price: number }[];
  paymentMethod?: string;
  transactionId?: string;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({ 
  receiptId, 
  tokenNumber,
  type, 
  date, 
  customerName, 
  customerPhone,
  totalAmount, 
  items,
  paymentMethod,
  transactionId
}) => {
  const totalQty = items.reduce((acc, item) => acc + item.qty, 0);
  const token = tokenNumber ? String(tokenNumber) : receiptId;

  return (
    <div 
      id={`print-receipt-${receiptId}`} 
      className="hidden print:block w-[2.85in] max-w-[2.85in] h-auto mx-auto text-black bg-white p-1.5 pt-1 mt-0 font-sans text-[11px] leading-normal overflow-hidden border border-black rounded-md"
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2.5 border-b border-solid border-black pb-1.5 mb-1.5 text-left">
        <img src="/deuce-logo.jpg" alt="Deuce Logo" className="w-10 h-10 rounded object-cover border border-black flex-shrink-0" />
        <div>
          <h2 className="text-[16px] font-bold uppercase tracking-wider leading-tight">DEUCE SPORTS GROUP</h2>
          <p className="text-[9.5px] font-semibold uppercase mt-0.5">Yelagiri • GST: 33INYPK7449Q1ZL</p>
        </div>
      </div>

      {/* Meta Bar - Only for Bookings */}
      {type !== 'food' && (
        <>
          <div className="flex justify-between items-center mb-1.5 text-[11px] font-semibold border-b border-solid border-black pb-1">
            <span>TOKEN: <strong className="font-bold">{token}</strong></span>
            <span>{new Date(date).toLocaleDateString()}</span>
          </div>

          <div className="mb-1.5 text-[11px] font-semibold space-y-0.5">
            <p>Customer Name: <strong className="font-bold">{customerName}</strong> ({totalQty} Pax)</p>
            <p>Customer Phone: <strong className="font-bold">{customerPhone || 'N/A'}</strong></p>
            <p>Token Number: <strong className="font-bold">{token}</strong></p>
            {items[0] && <p>Package: <strong className="font-bold">{items[0].name}</strong></p>}
            <p>Type: <strong className="uppercase font-bold">{type}</strong></p>
          </div>
        </>
      )}

      {/* Table */}
      <table className="w-full text-[11px] mb-1.5 border-collapse">
        <thead>
          <tr className="border-b border-black text-left font-bold">
            <th className="py-0.5">{type === 'food' ? 'Item Name' : 'Ticket Split Up'}</th>
            <th className="text-center py-0.5">Qty</th>
            <th className="text-right py-0.5">Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-200">
              <td className="py-0.5 truncate max-w-[1.2in] font-semibold">{item.name}</td>
              <td className="text-center py-0.5 font-semibold">{item.qty}</td>
              <td className="text-right py-0.5 font-mono font-bold">₹{item.price.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Base Amount, SGST and CGST in one line */}
      <div className="text-[10px] font-sans font-bold border-t border-b border-black py-1 my-1 flex justify-between">
        <span>Base: ₹{(totalAmount / 1.18).toFixed(2)}</span>
        <span>SGST (9%): ₹{(totalAmount * 0.09 / 1.18).toFixed(2)}</span>
        <span>CGST (9%): ₹{(totalAmount * 0.09 / 1.18).toFixed(2)}</span>
      </div>

      {/* Summary */}
      <div className="border-t border-solid border-black pt-1 space-y-0.5 text-[11px] font-semibold">
        <div className="flex justify-between font-bold text-[13.5px] border-t border-b border-black py-1 mt-0.5">
          <span>{type === 'food' ? 'TOTAL' : 'GRAND TOTAL'} ({paymentMethod ? paymentMethod.toUpperCase() : 'PAID'}):</span>
          <span>₹{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Single Compact Gate QR Pass if Booking */}
      {type === 'booking' && (
        <div className="mt-1.5 p-1.5 border border-black rounded flex items-center justify-between bg-white">
          <div className="text-[10px] font-semibold">
            <p className="font-bold text-[11px] uppercase">ENTRY PASS</p>
            <p>Passes: <strong>{totalQty} Pax</strong></p>
            <p>Token: <strong>{token}</strong></p>
          </div>
          <div className="w-10 h-10 text-center flex-shrink-0">
            <svg className="w-full h-full text-black" viewBox="0 0 100 100">
               <path d="M5 5h30v30H5V5zm5 5v20h20V10H10zm55-5h30v30H65V5zm5 5v20h20V10H70zM5 65h30v30H5V65zm5 5v20h20V70H10z" fill="currentColor"/>
               <path d="M45 10h10v10H45V10zm20 45h10v10H65V55zm15 15h15v15H80V70zm-15 15h10v10H65V85zm-20-20h10v10H45V65zm20-20h10v10H65V45zm-10 10h10v10H55V55z" fill="currentColor"/>
            </svg>
            <span className="text-[7px] font-bold block -mt-0.5">SCAN</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-1.5 pt-1.5 border-t border-solid border-black text-[9.5px] font-semibold space-y-0.5">
        {type !== 'food' && <p>Valid for date printed above. Non-refundable.</p>}
        <p className="font-bold">Thank you for visiting DEUCE SPORTS GROUP!</p>
      </div>
    </div>
  );
};

