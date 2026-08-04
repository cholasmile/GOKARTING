import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useReactToPrint } from 'react-to-print';
import { Ticket, Booking } from '../types';
import { Printer, Download, Share2 } from 'lucide-react';

interface Props {
  ticket: Ticket;
  booking: Booking;
}

export const TicketPass: React.FC<Props> = ({ ticket, booking }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Ticket_${ticket.id}`,
  });

  return (
    <div className="bg-[#1C1C1C] rounded-2xl overflow-hidden border border-[#00ABAB]/30">
      {/* Printable Area */}
      <div ref={printRef} className="bg-white text-black p-6 w-[350px] mx-auto print:w-full print:p-4 print:shadow-none">
        
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-dashed border-gray-300 pb-4">
          <h1 className="text-2xl font-black uppercase tracking-tight text-black">Adventure Park</h1>
          <p className="text-gray-500 text-sm font-mono mt-1">Official Entry Pass</p>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
            <QRCodeSVG 
              value={ticket.qrCodeValue} 
              size={180} 
              level="H" 
              includeMargin={true}
            />
          </div>
          <p className="text-xs font-mono text-gray-400 mt-2 tracking-widest">{ticket.id}</p>
        </div>

        {/* Details Section */}
        <div className="space-y-4 mb-6">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase">Guest Name</p>
            <p className="font-bold text-lg">{ticket.customerName}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Activity</p>
              <p className="font-bold text-sm text-[#00ABAB]">{ticket.activityName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Quantity</p>
              <p className="font-bold text-sm">{ticket.quantity} ({ticket.ticketType})</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Date</p>
              <p className="font-bold text-sm">{ticket.date}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Time Slot</p>
              <p className="font-bold text-sm">{ticket.timeSlot}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-dashed border-gray-300 pt-4 text-center">
          <p className="text-xs text-gray-500">Payment Status: <span className="font-bold text-green-600 uppercase">{booking.paymentStatus}</span></p>
          <p className="text-[10px] text-gray-400 mt-2">Scan this QR code at the entrance gate. Non-transferable.</p>
        </div>
      </div>

      {/* Action Buttons (Not printed) */}
      <div className="p-4 bg-[#0A0A0A] flex justify-center gap-4">
        <button 
          onClick={handlePrint}
          className="flex-1 bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black text-white py-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors"
        >
          <Printer className="w-4 h-4" /> Print Pass
        </button>
        <button className="flex-1 bg-[#1C1C1C] hover:bg-[#2C2C2C] text-white py-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors">
          <Share2 className="w-4 h-4" /> Share
        </button>
      </div>
    </div>
  );
};

export default TicketPass;
