import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Ticket, Booking } from '../types';
import { useAppContext } from '../context/AppContext';
import { QrCode, CreditCard, CheckCircle, User, Loader2, Calendar } from 'lucide-react';
import TicketPass from './TicketPass';

interface Props {
  activities: Activity[];
  onCancel: () => void;
}

const TIME_SLOTS = [
  '09:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '01:00 PM - 02:00 PM',
  '02:00 PM - 03:00 PM',
  '03:00 PM - 04:00 PM',
  '04:00 PM - 05:00 PM',
  '05:00 PM - 06:00 PM'
];

export const UnifiedTicketingFlow: React.FC<Props> = ({ activities, onCancel }) => {
  const { createBooking } = useAppContext();
  
  const [step, setStep] = useState(1);
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [waiverSigned, setWaiverSigned] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<Ticket | null>(null);

  const totalAdultPrice = activities.reduce((sum, act) => sum + (act.adultPrice || 0), 0);
  const totalChildPrice = activities.reduce((sum, act) => sum + (act.childPrice || 0), 0);
  const totalAmount = (adultCount * totalAdultPrice) + (childCount * totalChildPrice);
  const totalQuantity = adultCount + childCount;
  
  const combinedActivityIds = activities.map(a => a.id).join(',');
  const combinedActivityNames = activities.map(a => a.name).join(' + ');

  const handlePayment = async () => {
    if (!guestName || !guestEmail) return alert("Please fill in required guest details");
    if (!waiverSigned) return alert("You must sign the waiver to proceed");

    setIsProcessing(true);

    try {
      // 1. Create order on backend
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalAmount })
      });
      
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) throw new Error("Could not create Razorpay order");

      // 2. Open Razorpay Checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'dummy_key',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Adventure Park',
        description: `Booking for ${combinedActivityNames}`,
        order_id: orderData.id,
        handler: async (response: any) => {
          // 3. Verify Payment with webhook
          const verifyResponse = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          if (verifyResponse.ok) {
            // 4. Confirm Booking
            const result = createBooking({
              customerName: guestName,
              customerEmail: guestEmail,
              customerPhone: guestPhone,
              activityId: combinedActivityIds,
              activityName: combinedActivityNames,
              date: date,
              timeSlot: timeSlot,
              ticketType: 'standard',
              details: `${adultCount}x Adult, ${childCount}x Child`,
              quantity: totalQuantity,
              totalAmount,
              paymentMethod: 'card'
            });

            if (typeof result === 'string') {
              alert(result);
              setIsProcessing(false);
            } else {
              setConfirmedBooking(result.booking);
              setConfirmedTicket(result.ticket);
              setStep(4); // Success step
            }
          } else {
            alert('Payment verification failed');
            setIsProcessing(false);
          }
        },
        prefill: {
          name: guestName,
          email: guestEmail,
          contact: guestPhone
        },
        theme: {
          color: '#00ABAB'
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        alert(`Payment Failed: ${response.error.description}`);
        setIsProcessing(false);
      });
      rzp1.open();

    } catch (error) {
      console.error(error);
      alert('Error initiating payment');
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 text-white">
      {/* Progress Bar */}
      <div className="flex justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-[#1C1C1C] -z-10 -translate-y-1/2"></div>
        <div className={`absolute top-1/2 left-0 h-1 bg-[#00ABAB] -z-10 -translate-y-1/2 transition-all duration-500`} style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        
        {['Select', 'Details', 'Payment', 'Ticket'].map((label, i) => (
          <div key={i} className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= i + 1 ? 'bg-[#00ABAB] text-[#0A0A0A]' : 'bg-[#1C1C1C] text-[#94A3B8]'}`}>
              {i + 1}
            </div>
            <span className="text-xs mt-2 font-mono text-[#94A3B8]">{label}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8 rounded-2xl border border-[#00ABAB]/30 shadow-[0_0_30px_rgba(0,171,171,0.1)]">
            <h3 className="text-2xl font-bold mb-6 border-b border-[#1C1C1C] pb-4 text-[#00ABAB]">Activity Details</h3>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[#94A3B8] mb-2 font-mono text-sm">Select Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 focus:border-[#00ABAB] outline-none" min={new Date().toISOString().split('T')[0]} />
                </div>
                
                <div>
                  <label className="block text-[#94A3B8] mb-2 font-mono text-sm">Select Time Slot</label>
                  <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 focus:border-[#00ABAB] outline-none">
                    {TIME_SLOTS.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C] hover:border-[#00ABAB]/50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span>Adult (₹{totalAdultPrice})</span>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setAdultCount(Math.max(1, adultCount - 1))} className="w-8 h-8 rounded-full bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black transition-colors">-</button>
                      <span className="font-bold w-4 text-center">{adultCount}</span>
                      <button onClick={() => setAdultCount(adultCount + 1)} className="w-8 h-8 rounded-full bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black transition-colors">+</button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C] hover:border-[#00ABAB]/50 transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <span>Child (₹{totalChildPrice})</span>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setChildCount(Math.max(0, childCount - 1))} className="w-8 h-8 rounded-full bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black transition-colors">-</button>
                      <span className="font-bold w-4 text-center">{childCount}</span>
                      <button onClick={() => setChildCount(childCount + 1)} className="w-8 h-8 rounded-full bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black transition-colors">+</button>
                    </div>
                  </div>
                </div>
                
                <div className="text-xl font-bold text-right text-[#00ABAB] pt-4 border-t border-[#1C1C1C]">
                  Total: ₹{totalAmount}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button onClick={onCancel} className="px-6 py-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-rose-500/10 transition-colors">Cancel</button>
              <button onClick={() => setStep(2)} className="btn-glow px-8 py-2 rounded-xl font-bold">Continue</button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8 rounded-2xl border border-[#00ABAB]/30 shadow-[0_0_30px_rgba(0,171,171,0.1)]">
            <h3 className="text-2xl font-bold mb-6 border-b border-[#1C1C1C] pb-4 flex items-center gap-3 text-[#00ABAB]">
              <User className="w-6 h-6" /> Guest Details
            </h3>
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-[#94A3B8] mb-2 font-mono text-sm">Full Name *</label>
                <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="John Doe" className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 focus:border-[#00ABAB] outline-none transition-colors" required />
              </div>
              <div>
                <label className="block text-[#94A3B8] mb-2 font-mono text-sm">Email Address *</label>
                <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="john@example.com" className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 focus:border-[#00ABAB] outline-none transition-colors" required />
              </div>
              <div className="col-span-2">
                <label className="block text-[#94A3B8] mb-2 font-mono text-sm">Phone Number (Optional)</label>
                <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+1 234 567 890" className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 focus:border-[#00ABAB] outline-none transition-colors" />
              </div>
            </div>

            <div className="bg-[#1C1C1C]/50 p-4 rounded-xl border border-[#00ABAB]/30 mb-8 hover:bg-[#1C1C1C] transition-colors">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={waiverSigned} onChange={e => setWaiverSigned(e.target.checked)} className="mt-1 w-5 h-5 accent-[#00ABAB] cursor-pointer" />
                <span className="text-sm text-[#94A3B8] leading-relaxed">
                  I agree to the <strong className="text-white">Liability Waiver</strong> and confirm that all participants have read the safety instructions for {combinedActivityNames}. I understand the risks involved and agree to follow staff directions at all times.
                </span>
              </label>
            </div>

            <div className="flex justify-between items-center">
              <button onClick={() => setStep(1)} className="px-6 py-2 rounded-xl text-[#94A3B8] hover:text-white transition-colors bg-[#1C1C1C] hover:bg-[#2C2C2C]">Back</button>
              <button onClick={() => setStep(3)} disabled={!guestName || !guestEmail || !waiverSigned} className="btn-glow px-8 py-2 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed">Proceed to Payment</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8 rounded-2xl text-center border border-[#00ABAB]/30 shadow-[0_0_30px_rgba(0,171,171,0.1)]">
            <CreditCard className="w-16 h-16 text-[#00ABAB] mx-auto mb-6" />
            <h3 className="text-2xl font-bold mb-2">Complete Payment</h3>
            <p className="text-[#94A3B8] mb-8">You are about to pay for <strong className="text-white">{totalQuantity} tickets</strong> to {combinedActivityNames}.</p>
            
            <div className="bg-[#0A0A0A] p-6 rounded-2xl border border-[#1C1C1C] max-w-sm mx-auto mb-8 text-left hover:border-[#00ABAB]/30 transition-colors">
              <div className="flex justify-between mb-2">
                <span className="text-[#94A3B8]">Subtotal</span>
                <span>₹{totalAmount}</span>
              </div>
              <div className="flex justify-between mb-4 border-b border-[#1C1C1C] pb-4">
                <span className="text-[#94A3B8]">Taxes & Fees</span>
                <span>₹0</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-[#00ABAB]">
                <span>Total</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <button onClick={() => setStep(2)} disabled={isProcessing} className="px-6 py-2 rounded-xl text-[#94A3B8] hover:text-white transition-colors bg-[#1C1C1C] hover:bg-[#2C2C2C]">Back</button>
              <button onClick={handlePayment} disabled={isProcessing} className="btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                {isProcessing ? 'Processing...' : 'Pay with Razorpay'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && confirmedBooking && confirmedTicket && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-2xl text-center border border-[#00ABAB]/30 shadow-[0_0_30px_rgba(0,171,171,0.2)]">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
            <h3 className="text-3xl font-black mb-2 text-emerald-400 tracking-tight">Payment Successful!</h3>
            <p className="text-[#94A3B8] mb-8 text-lg"><span className="text-[#00ABAB] text-lg font-bold">{combinedActivityNames}</span> is confirmed. A copy of the ticket has been sent to {guestEmail}.</p>
            
            <div className="max-w-md mx-auto mb-8 text-left">
              <TicketPass ticket={confirmedTicket} booking={confirmedBooking} />
            </div>

            <button onClick={onCancel} className="bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black text-white px-8 py-3 rounded-xl font-bold transition-all duration-300">
              Return to POS Dashboard
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedTicketingFlow;
