import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Ticket, Booking } from '../types';
import { useAppContext } from '../context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, CreditCard, CheckCircle, User, Loader2, Calendar, Banknote, Smartphone, ArrowRight, AlertCircle, Printer, Check } from 'lucide-react';
import TicketPass from './TicketPass';
import { printTicket } from '../lib/printTicket';

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

type PaymentMethod = 'razorpay' | 'upi' | 'card' | 'cash';
type CounterStep = 'idle' | 'confirming' | 'confirmed';

export const UnifiedTicketingFlow: React.FC<Props> = ({ activities, onCancel }) => {
  const { createBooking, markPaymentConfirmed, counterUpiId, currentUser } = useAppContext();

  const [step, setStep] = useState(1);
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [waiverSigned, setWaiverSigned] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<Ticket | null>(null);

  // Counter payment state
  const [counterStep, setCounterStep] = useState<CounterStep>('idle');
  const [cardRef, setCardRef] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [counterError, setCounterError] = useState<string | null>(null);

  const totalAdultPrice = activities.reduce((sum, act) => sum + (act.adultPrice || 0), 0);
  const totalChildPrice = activities.reduce((sum, act) => sum + (act.childPrice || 0), 0);
  const totalAmount = (adultCount * totalAdultPrice) + (childCount * totalChildPrice);
  const totalQuantity = adultCount + childCount;

  const combinedActivityIds = activities.map(a => a.id).join(',');
  const combinedActivityNames = activities.map(a => a.name).join(' + ');

  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - totalAmount) : 0;

  // UPI payment deep-link (standard UPI URI scheme)
  const upiLink = counterUpiId
    ? `upi://pay?pa=${encodeURIComponent(counterUpiId)}&pn=${encodeURIComponent('Deuce Adventure Park')}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('Booking-' + combinedActivityNames)}`
    : '';

  // ── STEP 3: Payment method reset when switching
  useEffect(() => {
    setCounterStep('idle');
    setCardRef('');
    setAmountReceived('');
    setCounterError(null);
  }, [paymentMethod]);

  // ── ONLINE RAZORPAY FLOW
  const handleOnlinePayment = async () => {
    setIsProcessing(true);
    try {
      // 1. Create initial pending booking
      const bookingResult = createBooking({
        customerName: guestName,
        customerEmail: guestEmail,
        customerPhone: guestPhone,
        activityId: combinedActivityIds,
        activityName: combinedActivityNames,
        date,
        timeSlot,
        ticketType: 'standard',
        details: `${adultCount}x Adult, ${childCount}x Child`,
        quantity: totalQuantity,
        totalAmount,
        paymentMethod: 'upi' // temp, will be updated after Razorpay
      });

      if (typeof bookingResult === 'string') {
        alert(bookingResult);
        setIsProcessing(false);
        return;
      }

      // 2. Create Razorpay order on backend
      const orderRes = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          receipt: `rcpt_${bookingResult.booking.id}`,
          bookingRef: bookingResult.booking.id
        })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error('Could not create Razorpay order');

      // 3. Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Deuce Adventure Park',
        description: `Booking for ${combinedActivityNames}`,
        order_id: orderData.id,
        handler: async (response: any) => {
          // 4. Verify payment on backend
          const verifyRes = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          if (verifyRes.ok) {
            // 5. Mark booking as paid with Razorpay IDs
            markPaymentConfirmed({
              bookingId: bookingResult.booking.id,
              method: 'razorpay',
              staffId: currentUser?.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id
            });

            setConfirmedBooking({ ...bookingResult.booking, paymentStatus: 'paid', status: 'confirmed' });
            setConfirmedTicket(bookingResult.ticket);
            setStep(4);
          } else {
            alert('Payment verification failed. Please contact staff.');
          }
          setIsProcessing(false);
        },
        prefill: { name: guestName, email: guestEmail, contact: guestPhone },
        theme: { color: '#00ABAB' },
        modal: {
          ondismiss: () => setIsProcessing(false)
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (r: any) => {
        alert(`Payment Failed: ${r.error.description}`);
        setIsProcessing(false);
      });
      rzp.open();

    } catch (err: any) {
      console.error(err);
      alert('Error initiating payment. Please try again.');
      setIsProcessing(false);
    }
  };

  // ── COUNTER: Create pending booking then show confirmation UI
  const handleCounterBooking = () => {
    if (!guestName || !guestEmail) return alert('Please fill in guest name and email.');
    setCounterError(null);

    const bookingResult = createBooking({
      customerName: guestName,
      customerEmail: guestEmail,
      customerPhone: guestPhone,
      activityId: combinedActivityIds,
      activityName: combinedActivityNames,
      date,
      timeSlot,
      ticketType: 'standard',
      details: `${adultCount}x Adult, ${childCount}x Child`,
      quantity: totalQuantity,
      totalAmount,
      paymentMethod: 'cash' // always starts as pending
    });

    if (typeof bookingResult === 'string') {
      setCounterError(bookingResult);
      return;
    }

    setConfirmedBooking(bookingResult.booking);
    setConfirmedTicket(bookingResult.ticket);
    setCounterStep('confirming');
  };

  // ── COUNTER: Confirm payment after physical collection
  const handleConfirmCounterPayment = () => {
    if (!confirmedBooking) return;
    setCounterError(null);

    if (paymentMethod === 'cash') {
      const received = parseFloat(amountReceived);
      if (isNaN(received) || received < totalAmount) {
        setCounterError(`Amount received (₹${received || 0}) is less than total due (₹${totalAmount}).`);
        return;
      }
    }

    if (paymentMethod === 'card' && !cardRef.trim()) {
      setCounterError('Please enter the card transaction reference number.');
      return;
    }

    const result = markPaymentConfirmed({
      bookingId: confirmedBooking.id,
      method: paymentMethod as 'upi' | 'card' | 'cash',
      staffId: currentUser?.id,
      referenceNumber: cardRef || undefined,
      amountReceived: paymentMethod === 'cash' ? parseFloat(amountReceived) : undefined
    });

    if (result.success) {
      setCounterStep('confirmed');
      setConfirmedBooking(prev => prev ? { ...prev, paymentStatus: 'paid', status: 'confirmed' } : prev);
      // Auto-print after a short delay
      setTimeout(() => {
        if (confirmedTicket && confirmedBooking) {
          printTicket({
            receiptId: `TKT-${confirmedBooking.id}`,
            activityName: combinedActivityNames,
            customerName: confirmedBooking.customerName,
            date: confirmedBooking.date,
            slot: confirmedBooking.timeSlot,
            items: activities.map(a => ({ label: a.name, value: `₹${a.adultPrice || 0}/Adult, ₹${a.childPrice || 0}/Child` })),
            totalAmount: confirmedBooking.totalAmount,
            paymentStatus: 'paid',
            quantity: totalQuantity
          });
        }
      }, 600);
    } else {
      setCounterError(result.message);
    }
  };

  // ── METHOD ICON
  const methodIcon = (m: PaymentMethod) => {
    if (m === 'razorpay') return <CreditCard className="w-5 h-5" />;
    if (m === 'upi') return <Smartphone className="w-5 h-5" />;
    if (m === 'card') return <CreditCard className="w-5 h-5" />;
    return <Banknote className="w-5 h-5" />;
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
              {step > i + 1 ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className="text-xs mt-2 font-mono text-[#94A3B8]">{label}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Activity Details ── */}
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
                    {TIME_SLOTS.map(slot => <option key={slot} value={slot}>{slot}</option>)}
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

        {/* ── STEP 2: Guest Details ── */}
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
                <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 focus:border-[#00ABAB] outline-none transition-colors" />
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

        {/* ── STEP 3: Payment ── */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8 rounded-2xl border border-[#00ABAB]/30 shadow-[0_0_30px_rgba(0,171,171,0.1)] space-y-6">

            {/* Order Summary */}
            <div className="bg-[#0A0A0A] p-5 rounded-2xl border border-[#1C1C1C]">
              <p className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-3">Order Summary</p>
              <div className="flex justify-between text-sm mb-1">
                <span>{combinedActivityNames}</span>
                <span>{adultCount}A + {childCount}C</span>
              </div>
              <div className="flex justify-between text-sm text-[#94A3B8] mb-3">
                <span>{date} • {timeSlot}</span>
                <span>{totalQuantity} tickets</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-[#00ABAB] border-t border-[#1C1C1C] pt-3">
                <span>Total Due</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <p className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-3">Payment Method</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {([
                  { key: 'razorpay', label: 'Online (Razorpay)', desc: 'UPI / Card / Net Banking' },
                  { key: 'upi', label: 'Counter UPI', desc: 'Scan & Pay QR' },
                  { key: 'card', label: 'Counter Card', desc: 'POS Machine' },
                  { key: 'cash', label: 'Cash', desc: 'Cash at counter' }
                ] as { key: PaymentMethod; label: string; desc: string }[]).map(m => (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMethod(m.key)}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${paymentMethod === m.key ? 'bg-[#00ABAB]/10 border-[#00ABAB] text-[#00ABAB] shadow-[0_0_15px_rgba(0,171,171,0.2)]' : 'bg-[#0A0A0A] border-[#1C1C1C] text-[#94A3B8] hover:border-white/30 hover:text-white'}`}
                  >
                    {methodIcon(m.key)}
                    <span className="font-bold text-[10px] uppercase tracking-wide leading-tight">{m.label}</span>
                    <span className="text-[9px] opacity-70">{m.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Error display */}
            {counterError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {counterError}
              </div>
            )}

            {/* ── RAZORPAY FLOW ── */}
            {paymentMethod === 'razorpay' && counterStep === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
                <p className="text-[#94A3B8] text-sm">Customer will be redirected to Razorpay to complete payment via UPI, Card, or Net Banking.</p>
                <div className="flex justify-between mt-6">
                  <button onClick={() => setStep(2)} className="px-6 py-2 rounded-xl text-[#94A3B8] bg-[#1C1C1C] hover:bg-[#2C2C2C]">Back</button>
                  <button onClick={handleOnlinePayment} disabled={isProcessing} className="btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                    {isProcessing ? 'Processing...' : `Pay ₹${totalAmount} with Razorpay`}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── COUNTER UPI FLOW ── */}
            {paymentMethod === 'upi' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {counterStep === 'idle' && (
                  <>
                    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl">
                      {counterUpiId ? (
                        <>
                          <QRCodeSVG value={upiLink} size={200} level="H" includeMargin={true} />
                          <p className="text-black text-sm font-bold text-center">UPI ID: <span className="text-[#007B8B] font-mono">{counterUpiId}</span></p>
                          <p className="text-black text-2xl font-black">₹{totalAmount}</p>
                          <p className="text-gray-500 text-xs text-center">Ask customer to scan with any UPI app</p>
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                          <p className="text-black font-bold">UPI ID not configured</p>
                          <p className="text-gray-500 text-sm mt-1">Admin must set the Counter UPI ID in Payment Settings.</p>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <button onClick={() => setStep(2)} className="px-6 py-2 rounded-xl text-[#94A3B8] bg-[#1C1C1C] hover:bg-[#2C2C2C]">Back</button>
                      <button onClick={handleCounterBooking} className="btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                        <Smartphone className="w-4 h-4" /> Customer Has Paid — Confirm
                      </button>
                    </div>
                  </>
                )}
                {counterStep === 'confirming' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 p-6 bg-[#0A0A0A] rounded-2xl border border-[#00ABAB]/30">
                    <Smartphone className="w-12 h-12 text-[#00ABAB] mx-auto" />
                    <p className="text-white font-bold text-lg">Confirm UPI Payment Received</p>
                    <p className="text-[#94A3B8] text-sm">Verify the payment in your UPI app / bank account before confirming.</p>
                    <div className="flex gap-3 justify-center">
                      <button onClick={() => setCounterStep('idle')} className="px-6 py-2 rounded-xl bg-[#1C1C1C] text-[#94A3B8] hover:bg-[#2C2C2C]">Cancel</button>
                      <button onClick={handleConfirmCounterPayment} className="btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                        <Check className="w-4 h-4" /> Confirm Payment Received
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── COUNTER CARD FLOW ── */}
            {paymentMethod === 'card' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {counterStep === 'idle' && (
                  <>
                    <div className="bg-[#0A0A0A] p-5 rounded-xl border border-[#1C1C1C] space-y-4">
                      <div className="flex justify-between items-center text-lg font-bold">
                        <span className="text-[#94A3B8]">Amount Due</span>
                        <span className="text-[#00ABAB]">₹{totalAmount}</span>
                      </div>
                      <div>
                        <label className="block text-[#94A3B8] mb-2 font-mono text-xs uppercase tracking-widest">Transaction Reference # (optional)</label>
                        <input
                          type="text"
                          value={cardRef}
                          onChange={e => setCardRef(e.target.value)}
                          placeholder="e.g. TXN123456789"
                          className="w-full bg-[#1C1C1C] border border-[#1C1C1C] focus:border-[#00ABAB] rounded-xl p-3 outline-none text-white"
                        />
                      </div>
                      <p className="text-[#94A3B8] text-xs">⚠ Do NOT enter card number, CVV, or PIN. Reference number only.</p>
                    </div>
                    <div className="flex justify-between">
                      <button onClick={() => setStep(2)} className="px-6 py-2 rounded-xl text-[#94A3B8] bg-[#1C1C1C] hover:bg-[#2C2C2C]">Back</button>
                      <button onClick={handleCounterBooking} className="btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Card Payment Done — Confirm
                      </button>
                    </div>
                  </>
                )}
                {counterStep === 'confirming' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 p-6 bg-[#0A0A0A] rounded-2xl border border-[#00ABAB]/30">
                    <CreditCard className="w-12 h-12 text-[#00ABAB] mx-auto" />
                    <p className="text-white font-bold text-lg">Confirm Card Payment</p>
                    {cardRef && <p className="text-[#00ABAB] font-mono text-sm">Ref: {cardRef}</p>}
                    <p className="text-[#94A3B8] text-sm">Has the card payment of <strong className="text-white">₹{totalAmount}</strong> been approved on the POS terminal?</p>
                    <div className="flex gap-3 justify-center">
                      <button onClick={() => setCounterStep('idle')} className="px-6 py-2 rounded-xl bg-[#1C1C1C] text-[#94A3B8] hover:bg-[#2C2C2C]">Back</button>
                      <button onClick={handleConfirmCounterPayment} className="btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                        <Check className="w-4 h-4" /> Yes, Payment Confirmed
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── COUNTER CASH FLOW ── */}
            {paymentMethod === 'cash' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {counterStep === 'idle' && (
                  <>
                    <div className="bg-[#0A0A0A] p-5 rounded-xl border border-[#1C1C1C] space-y-4">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span className="text-[#94A3B8]">Amount Due</span>
                        <span className="text-[#00ABAB]">₹{totalAmount}</span>
                      </div>
                      <div>
                        <label className="block text-[#94A3B8] mb-2 font-mono text-xs uppercase tracking-widest">Amount Received (₹)</label>
                        <input
                          type="number"
                          value={amountReceived}
                          onChange={e => setAmountReceived(e.target.value)}
                          min={totalAmount}
                          step="1"
                          placeholder={String(totalAmount)}
                          className="w-full bg-[#1C1C1C] border border-[#1C1C1C] focus:border-[#00ABAB] rounded-xl p-3 outline-none text-white text-lg font-bold"
                        />
                      </div>
                      {amountReceived && parseFloat(amountReceived) >= totalAmount && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-between items-center p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                          <span className="text-emerald-400 font-mono text-sm">Balance / Change</span>
                          <span className="text-emerald-400 font-black text-xl">₹{change.toFixed(2)}</span>
                        </motion.div>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <button onClick={() => setStep(2)} className="px-6 py-2 rounded-xl text-[#94A3B8] bg-[#1C1C1C] hover:bg-[#2C2C2C]">Back</button>
                      <button onClick={handleCounterBooking} disabled={!amountReceived || parseFloat(amountReceived) < totalAmount} className="btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Banknote className="w-4 h-4" /> Confirm Cash Received
                      </button>
                    </div>
                  </>
                )}
                {counterStep === 'confirming' && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 p-6 bg-[#0A0A0A] rounded-2xl border border-emerald-500/30">
                    <Banknote className="w-12 h-12 text-emerald-400 mx-auto" />
                    <p className="text-white font-bold text-lg">Confirm Cash Collection</p>
                    <div className="text-left space-y-2 max-w-xs mx-auto">
                      <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Amount Due</span><span className="font-bold">₹{totalAmount}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Amount Received</span><span className="font-bold text-emerald-400">₹{parseFloat(amountReceived).toFixed(2)}</span></div>
                      <div className="flex justify-between text-sm border-t border-white/10 pt-2"><span className="text-[#94A3B8]">Change to Give</span><span className="font-black text-[#00ABAB]">₹{change.toFixed(2)}</span></div>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button onClick={() => setCounterStep('idle')} className="px-6 py-2 rounded-xl bg-[#1C1C1C] text-[#94A3B8] hover:bg-[#2C2C2C]">Back</button>
                      <button onClick={handleConfirmCounterPayment} className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 rounded-xl font-black flex items-center gap-2">
                        <Check className="w-4 h-4" /> Cash Collected — Generate Ticket
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── POST-CONFIRM SUCCESS (counter) ── */}
            {counterStep === 'confirmed' && confirmedBooking && confirmedTicket && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 p-6 bg-[#0A0A0A] rounded-2xl border border-[#00ABAB]/30">
                <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                <h4 className="text-2xl font-black text-emerald-400">Payment Confirmed!</h4>
                <p className="text-[#94A3B8]">Ticket generated. Print dialog will open automatically.</p>
                <div className="max-w-md mx-auto">
                  <TicketPass ticket={confirmedTicket} booking={confirmedBooking} />
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={() => printTicket({
                    receiptId: `TKT-${confirmedBooking.id}`,
                    activityName: combinedActivityNames,
                    customerName: confirmedBooking.customerName,
                    date: confirmedBooking.date,
                    slot: confirmedBooking.timeSlot,
                    items: activities.map(a => ({ label: a.name, value: `₹${a.adultPrice || 0}/Adult` })),
                    totalAmount: confirmedBooking.totalAmount,
                    paymentStatus: 'paid',
                    quantity: totalQuantity
                  })} className="btn-glow px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print Ticket
                  </button>
                  <button onClick={onCancel} className="bg-[#1C1C1C] hover:bg-[#2C2C2C] text-white px-6 py-3 rounded-xl font-bold">
                    New Booking
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── STEP 4: Online Payment Success ── */}
        {step === 4 && confirmedBooking && confirmedTicket && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-2xl text-center border border-[#00ABAB]/30 shadow-[0_0_30px_rgba(0,171,171,0.2)]">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
            <h3 className="text-3xl font-black mb-2 text-emerald-400 tracking-tight">Payment Successful!</h3>
            <p className="text-[#94A3B8] mb-8 text-lg"><span className="text-[#00ABAB] text-lg font-bold">{combinedActivityNames}</span> confirmed. Ticket sent to {guestEmail}.</p>

            <div className="max-w-md mx-auto mb-8 text-left">
              <TicketPass ticket={confirmedTicket} booking={confirmedBooking} />
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => printTicket({
                receiptId: `TKT-${confirmedBooking.id}`,
                activityName: combinedActivityNames,
                customerName: confirmedBooking.customerName,
                date: confirmedBooking.date,
                slot: confirmedBooking.timeSlot,
                items: activities.map(a => ({ label: a.name, value: `₹${a.adultPrice || 0}/Adult` })),
                totalAmount: confirmedBooking.totalAmount,
                paymentStatus: 'paid',
                quantity: totalQuantity
              })} className="btn-glow px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print Ticket
              </button>
              <button onClick={onCancel} className="bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black text-white px-8 py-3 rounded-xl font-bold transition-all duration-300">
                Return to POS Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UnifiedTicketingFlow;
