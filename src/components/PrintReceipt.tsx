import React from 'react';

interface PrintReceiptProps {
  receiptId: string;
  type: 'booking' | 'food';
  date: string;
  customerName: string;
  totalAmount: number;
  items: { name: string; qty: number; price: number }[];
  paymentMethod?: string;
  transactionId?: string;
}

export const PrintReceipt: React.FC<PrintReceiptProps> = ({ 
  receiptId, 
  type, 
  date, 
  customerName, 
  totalAmount, 
  items,
  paymentMethod,
  transactionId
}) => {
  const totalQty = items.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div 
      id={`print-receipt-${receiptId}`} 
      className="hidden print:block w-[2.85in] max-w-[2.85in] max-h-[3.85in] mx-auto text-black bg-white p-1.5 font-mono text-[8px] leading-tight overflow-hidden border border-black rounded"
    >
      {/* Header */}
      <div className="text-center border-b border-dashed border-black pb-1 mb-1">
        <h2 className="text-[11px] font-black uppercase tracking-wider">DEUCE ADVENTURE PARK</h2>
        <p className="text-[7px] font-bold">Yelagiri Hills • GST: 33INYPK7449Q1ZL</p>
      </div>

      {/* Meta Bar */}
      <div className="flex justify-between items-center mb-1 text-[7.5px] border-b border-dotted border-gray-400 pb-1">
        <span>REC: <strong className="font-bold">{receiptId}</strong></span>
        <span>{new Date(date).toLocaleDateString()}</span>
      </div>

      <div className="mb-1 text-[7.5px]">
        <p>Guest: <strong className="font-bold">{customerName}</strong> ({totalQty} Pax)</p>
        <p>Type: <strong className="uppercase">{type}</strong></p>
      </div>

      {/* Table */}
      <table className="w-full text-[7.5px] mb-1 border-collapse">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-0.5">Item</th>
            <th className="text-center py-0.5">Qty</th>
            <th className="text-right py-0.5">Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              <td className="py-0.5 truncate max-w-[1.2in]">{item.name}</td>
              <td className="text-center py-0.5">{item.qty}</td>
              <td className="text-right py-0.5 font-mono">₹{item.price.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Summary */}
      <div className="border-t border-dashed border-black pt-1 space-y-0.5 text-[7.5px]">
        <div className="flex justify-between font-bold text-[9px] border-t border-b border-black py-0.5 mt-0.5">
          <span>GRAND TOTAL ({paymentMethod ? paymentMethod.toUpperCase() : 'PAID'}):</span>
          <span>₹{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Single Compact Gate QR Pass if Booking */}
      {type === 'booking' && (
        <div className="mt-1 p-1 border border-black rounded flex items-center justify-between bg-gray-50">
          <div className="text-[7px]">
            <p className="font-black text-[8px] uppercase">GATE ENTRY PASS</p>
            <p>Passes: <strong>{totalQty} Pax</strong></p>
            <p>ID: {receiptId}</p>
          </div>
          <div className="w-8 h-8 text-center flex-shrink-0">
            <svg className="w-full h-full text-black" viewBox="0 0 100 100">
               <path d="M5 5h30v30H5V5zm5 5v20h20V10H10zm55-5h30v30H65V5zm5 5v20h20V10H70zM5 65h30v30H5V65zm5 5v20h20V70H10z" fill="currentColor"/>
               <path d="M45 10h10v10H45V10zm20 45h10v10H65V55zm15 15h15v15H80V70zm-15 15h10v10H65V85zm-20-20h10v10H45V65zm20-20h10v10H65V45zm-10 10h10v10H55V55z" fill="currentColor"/>
            </svg>
            <span className="text-[5px] font-bold block -mt-0.5">SCAN</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center mt-1 pt-1 border-t border-dotted border-gray-400 text-[6.5px]">
        <p>Valid for date printed above. Non-refundable.</p>
        <p className="font-bold">Thank you for visiting Deuce Park!</p>
      </div>
    </div>
  );
};

