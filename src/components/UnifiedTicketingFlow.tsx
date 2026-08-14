import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Ticket, Booking, Payment } from '../types';
import { useAppContext } from '../context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, CreditCard, CheckCircle, User, Loader2, Calendar, Banknote, Smartphone, ArrowRight, AlertCircle, Printer, Check } from 'lucide-react';
import TicketPass from './TicketPass';
import { InvoiceModal } from './InvoiceModal';
import { printTicket } from '../lib/printTicket';
import { generateOfflineId } from '../lib/deviceSetup';

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

// Helper function to get available time slots based on selected date
const getAvailableTimeSlots = (selectedDate: string): string[] => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentHour = now.getHours();
  
  // If selected date is today, filter out past time slots
  if (selectedDate === today) {
    return TIME_SLOTS.filter(slot => {
      const slotHour = parseInt(slot.split(':')[0]);
      const isPM = slot.includes('PM') && !slot.includes('12:');
      const isNoon = slot.includes('12:');
      
      let hour24 = slotHour;
      if (isPM) hour24 = slotHour + 12;
      if (isNoon && !slot.includes('12:00 PM')) hour24 = 12;
      
      return hour24 > currentHour;
    });
  }
  
  // For future dates, all slots are available
  return TIME_SLOTS;
};

const isPastDateSelection = (selectedDate: string): boolean => {
  if (!selectedDate) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(`${selectedDate}T00:00:00`);
  return selected < today;
};

type PaymentMethod = 'cash' | 'upi' | 'qrcode' | 'card_tap' | 'card_insert' | 'card_swipe';
type CounterStep = 'idle' | 'confirming' | 'confirmed';

export const UnifiedTicketingFlow: React.FC<Props> = ({ activities, onCancel }) => {
  const { createBooking, markPaymentConfirmed, counterUpiId, posTerminalId, currentUser, payments, posProvider } = useAppContext();

  const getPaymentDetails = (bookingId: string) => {
    const p = payments?.find(pay => pay.bookingId === bookingId);
    return {
      paymentMethod: p?.method || p?.payment_method,
      transactionId: p?.transactionId || p?.gateway_payment_id || p?.pos_transaction_id || p?.referenceNumber
    };
  };

  const [step, setStep] = useState(1);
  const [adultCount, setAdultCount] = useState(1);
  const [childCount, setChildCount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const availableSlots = getAvailableTimeSlots(date);
  const [timeSlot, setTimeSlot] = useState(availableSlots.length > 0 ? availableSlots[0] : '');

  useEffect(() => {
    if (!date || isPastDateSelection(date)) {
      setTimeSlot('');
      return;
    }

    const nextSlots = getAvailableTimeSlots(date);
    if (nextSlots.length === 0) {
      setTimeSlot('');
      return;
    }

    if (!nextSlots.includes(timeSlot)) {
      setTimeSlot(nextSlots[0]);
    }
  }, [date, timeSlot]);

  // Per-activity selected package: { [activityId]: packageId }
  const [selectedPackages, setSelectedPackages] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    activities.forEach(act => {
      if (act.packages && act.packages.length > 0) {
        defaults[act.id] = act.packages[0].id;
      }
    });
    return defaults;
  });

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [waiverSigned, setWaiverSigned] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<Ticket | null>(null);

  // Counter payment state
  const [counterStep, setCounterStep] = useState<CounterStep>('idle');
  const [cardRef, setCardRef] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [counterError, setCounterError] = useState<string | null>(null);

  // New state variables for POS & verification
  const [posStatus, setPosStatus] = useState<'Connected' | 'Disconnected' | 'Processing' | 'Payment Completed' | 'Payment Failed'>('Disconnected');
  const [isPollingQRPayment, setIsPollingQRPayment] = useState(false);
  const [tempBooking, setTempBooking] = useState<Booking | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Helper: get selected package object for an activity
  const getSelectedPackage = (actId: string) => {
    const act = activities.find(a => a.id === actId);
    if (!act?.packages?.length) return null;
    return act.packages.find(p => p.id === selectedPackages[actId]) || act.packages[0];
  };

  // Compute total from packages (if activity has packages) or adult/child pricing
  const totalAmount = activities.reduce((sum, act) => {
    const pkg = getSelectedPackage(act.id);
    if (pkg) {
      // Package is per-person, multiply by total guests
      return sum + pkg.price * (adultCount + childCount);
    }
    return sum + (act.adultPrice || 0) * adultCount + (act.childPrice || 0) * childCount;
  }, 0);

  const totalQuantity = adultCount + childCount;

  // Human-readable details string that includes package names
  const buildDetailsString = () => {
    const parts = activities.map(act => {
      const pkg = getSelectedPackage(act.id);
      if (pkg) return `${act.name}: ${pkg.name}`;
      return `${act.name}: ${adultCount}x Adult${childCount > 0 ? `, ${childCount}x Child` : ''}`;
    });
    return parts.join(' | ');
  };

  const totalAdultPrice = activities.reduce((sum, act) => sum + (act.adultPrice || 0), 0);
  const totalChildPrice = activities.reduce((sum, act) => sum + (act.childPrice || 0), 0);

  const combinedActivityIds = activities.map(a => a.id).join(',');
  const combinedActivityNames = activities.map(a => a.name).join(' + ');

  const change = amountReceived ? Math.max(0, parseFloat(amountReceived) - totalAmount) : 0;

  // UPI payment deep-link (standard UPI URI scheme)
  const upiLink = counterUpiId
    ? `upi://pay?pa=${encodeURIComponent(counterUpiId)}&pn=${encodeURIComponent('Deuce Park')}&am=${totalAmount}&cu=INR&tn=${encodeURIComponent('Booking-' + combinedActivityNames)}`
    : '';

  // ── Check POS Status on mount & interval
  useEffect(() => {
    const checkPosStatus = () => {
      fetch('/api/pos/status')
        .then(res => res.json())
        .then(data => {
          if (data.status === 'Connected') {
            setPosStatus('Connected');
          } else {
            setPosStatus('Disconnected');
          }
        })
        .catch(() => setPosStatus('Disconnected'));
    };

    checkPosStatus();
    const interval = setInterval(checkPosStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // ── Poll for UPI QR Payment status when QR displayed
  useEffect(() => {
    if (!isPollingQRPayment || !tempBooking) return;

    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/razorpay/check-payment/${tempBooking.id}`);
        const data = await response.json();
        
        if (isSubscribed && data.status === 'Paid') {
          clearInterval(interval);
          setIsPollingQRPayment(false);
          
          const confirmResult = markPaymentConfirmed({
            bookingId: tempBooking.id,
            method: 'upi',
            staffId: currentUser?.id,
            razorpayOrderId: data.razorpayOrderId,
            razorpayPaymentId: data.razorpayPaymentId,
            bookingData: tempBooking
          });

          if (confirmResult.success) {
            setConfirmedBooking(confirmResult.booking || tempBooking);
            setConfirmedTicket(confirmResult.ticket || null);
            setCounterStep('confirmed');
            setShowInvoiceModal(true);
            setStep(4);
          }
        }
      } catch (err) {
        console.error('QR status check failed', err);
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isPollingQRPayment, tempBooking]);

  // ── STEP 3: Payment method reset when switching
  useEffect(() => {
    setCounterStep('idle');
    setCardRef('');
    setAmountReceived('');
    setCounterError(null);
    setIsPollingQRPayment(false);
    setTempBooking(null);
  }, [paymentMethod]);

  // ── CASH PAYMENT FLOW
  const handleCashPayment = async () => {
    if (!guestName || !guestPhone) return alert('Please fill in guest name and phone number.');
    setIsProcessing(true);
    setCounterError(null);

    const received = parseFloat(amountReceived);
    if (isNaN(received) || received < totalAmount) {
      setCounterError(`Amount received (₹${received || 0}) is less than total due (₹${totalAmount}).`);
      setIsProcessing(false);
      return;
    }

    // 1. Create Booking as pending
    const bookingResult = createBooking({
      customerName: guestName,
      customerEmail: guestEmail,
      customerPhone: guestPhone,
      activityId: combinedActivityIds,
      activityName: combinedActivityNames,
      date,
      timeSlot,
      ticketType: 'standard',
      details: buildDetailsString(),
      quantity: totalQuantity,
      totalAmount,
      paymentMethod: 'cash'
    });

    if (typeof bookingResult === 'string') {
      setCounterError(bookingResult);
      setIsProcessing(false);
      return;
    }

    // 2. Mark as PAID in DB
    const confirmResult = markPaymentConfirmed({
      bookingId: bookingResult.booking.id,
      method: 'cash',
      staffId: currentUser?.id,
      amountReceived: received,
      bookingData: bookingResult.booking
    });

    if (confirmResult.success) {
      setConfirmedBooking(confirmResult.booking || bookingResult.booking);
      setConfirmedTicket(confirmResult.ticket || null);
      setCounterStep('confirmed');
      setStep(4);
      setShowInvoiceModal(true);
    } else {
      setCounterError(confirmResult.message);
    }
    setIsProcessing(false);
  };

  // ── UPI MANUAL CONFIRM FLOW
  const handleUpiCollectPayment = () => {
    if (!guestName || !guestPhone) return alert('Please fill in guest name and phone number.');
    setIsProcessing(true);
    setCounterError(null);

    // 1. Create booking (created as pending)
    const bookingResult = createBooking({
      customerName: guestName,
      customerEmail: guestEmail,
      customerPhone: guestPhone,
      activityId: combinedActivityIds,
      activityName: combinedActivityNames,
      date,
      timeSlot,
      ticketType: 'standard',
      details: buildDetailsString(),
      quantity: totalQuantity,
      totalAmount,
      paymentMethod: 'upi'
    });

    if (typeof bookingResult === 'string') {
      setCounterError(bookingResult);
      setIsProcessing(false);
      return;
    }

    // 2. Mark paid immediately upon staff confirm click
    const confirmResult = markPaymentConfirmed({
      bookingId: bookingResult.booking.id,
      method: 'upi',
      staffId: currentUser?.id,
      bookingData: bookingResult.booking
    });

    if (confirmResult.success) {
      setConfirmedBooking(confirmResult.booking || bookingResult.booking);
      setConfirmedTicket(confirmResult.ticket || null);
      setCounterStep('confirmed');
      setStep(4);
      setShowInvoiceModal(true);
    } else {
      setCounterError(confirmResult.message);
    }
    setIsProcessing(false);
  };

  // ── DYNAMIC QR CODE DISPLAY TRIGGER
  const handleGenerateQR = () => {
    if (!guestName || !guestPhone) return alert('Please fill in guest name and phone number.');
    setIsProcessing(true);
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
      details: buildDetailsString(),
      quantity: totalQuantity,
      totalAmount,
      paymentMethod: 'upi'
    });

    if (typeof bookingResult === 'string') {
      setCounterError(bookingResult);
      setIsProcessing(false);
      return;
    }

    setTempBooking(bookingResult.booking);
    setCounterStep('confirming'); // Render QR screen
    setIsPollingQRPayment(true);
    setIsProcessing(false);
  };

  // ── CARD POS FLOW (TAP / INSERT / SWIPE)
  const handleCardPayment = async (option: 'tap' | 'insert' | 'swipe') => {
    if (!guestName || !guestPhone) return alert('Please fill in guest name and phone number.');
    if (posStatus === 'Disconnected') {
      alert('Card Terminal is disconnected. Please check POS settings.');
      return;
    }

    setIsProcessing(true);
    setCounterError(null);
    setPosStatus('Processing');

    const refId = generateOfflineId('ref');

    try {
      const response = await fetch('/api/pos/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          referenceId: refId,
          terminalId: 'POS-TERM-001',
          paymentOption: option
        })
      });

      const data = await response.json();
      
      if (response.ok && data.status === 'Paid') {
        setPosStatus('Payment Completed');

        // Create booking
        const bookingResult = createBooking({
          customerName: guestName,
          customerEmail: guestEmail,
          customerPhone: guestPhone,
          activityId: combinedActivityIds,
          activityName: combinedActivityNames,
          date,
          timeSlot,
          ticketType: 'standard',
          details: buildDetailsString(),
          quantity: totalQuantity,
          totalAmount,
          paymentMethod: 'card'
        });

        if (typeof bookingResult === 'string') {
          setCounterError(bookingResult);
          setPosStatus('Payment Failed');
          setIsProcessing(false);
          return;
        }

        // Confirm payment
        const confirmResult = markPaymentConfirmed({
          bookingId: bookingResult.booking.id,
          method: 'card',
          staffId: currentUser?.id,
          referenceNumber: data.transactionId,
          posTransactionId: data.transactionId,
          terminalId: 'POS-TERM-001',
          bookingData: bookingResult.booking
        });

        if (confirmResult.success) {
          setConfirmedBooking(confirmResult.booking || bookingResult.booking);
          setConfirmedTicket(confirmResult.ticket || null);
          setCounterStep('confirmed');
          setStep(4);
          setShowInvoiceModal(true);
        } else {
          setCounterError(confirmResult.message);
        }
      } else {
        setPosStatus('Payment Failed');
        setCounterError(data.failureReason || 'POS Card Payment was declined by bank.');
      }
    } catch (err) {
      console.error(err);
      setPosStatus('Payment Failed');
      setCounterError('POS Terminal communication interrupted. Check local connection.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── METHOD ICON
  const methodIcon = (m: PaymentMethod) => {
    if (m === 'qrcode') return <QrCode className="w-5 h-5 text-violet-400" />;
    if (m === 'upi') return <Smartphone className="w-5 h-5 text-violet-400" />;
    if (m.startsWith('card')) return <CreditCard className="w-5 h-5 text-[#00ABAB]" />;
    return <Banknote className="w-5 h-5 text-emerald-400" />;
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[#94A3B8] mb-2 font-mono text-sm">Select Date</label>
                  <input type="date" value={date} onChange={e => {
                    const nextDate = e.target.value;
                    if (isPastDateSelection(nextDate)) {
                      setDate(nextDate);
                      setTimeSlot('');
                      return;
                    }

                    setDate(nextDate);
                    const slots = getAvailableTimeSlots(nextDate);
                    setTimeSlot(slots.length > 0 ? slots[0] : '');
                  }} className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 focus:border-[#00ABAB] outline-none" min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-[#94A3B8] mb-2 font-mono text-sm">Select Time Slot</label>
                  <select value={timeSlot} onChange={e => setTimeSlot(e.target.value)} className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 focus:border-[#00ABAB] outline-none">
                    {availableSlots.length > 0 ? (
                      availableSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)
                    ) : (
                      <option value="">No slots available</option>
                    )}
                  </select>
                  {availableSlots.length === 0 && <p className="text-red-400 text-xs mt-1">No available slots for today. Please select a future date.</p>}
                </div>

                {/* Guest Count */}
                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C]">
                  <p className="text-[#94A3B8] font-mono text-sm mb-3">Guest Count</p>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Adults</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setAdultCount(Math.max(1, adultCount - 1))} className="w-8 h-8 rounded-full bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black transition-colors font-bold">-</button>
                      <span className="font-bold w-6 text-center">{adultCount}</span>
                      <button onClick={() => setAdultCount(adultCount + 1)} className="w-8 h-8 rounded-full bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black transition-colors font-bold">+</button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Children</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setChildCount(Math.max(0, childCount - 1))} className="w-8 h-8 rounded-full bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black transition-colors font-bold">-</button>
                      <span className="font-bold w-6 text-center">{childCount}</span>
                      <button onClick={() => setChildCount(childCount + 1)} className="w-8 h-8 rounded-full bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black transition-colors font-bold">+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column: Package selection per activity + total */}
              <div className="space-y-4">
                <p className="text-[#94A3B8] font-mono text-sm uppercase tracking-widest">Activity Packages</p>
                {activities.map(act => {
                  const hasPkgs = act.packages && act.packages.length > 0;
                  const selPkg = getSelectedPackage(act.id);
                  return (
                    <div key={act.id} className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C] hover:border-[#00ABAB]/40 transition-colors">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-[#00ABAB]" />
                        <span className="font-semibold text-sm text-white">{act.name}</span>
                      </div>
                      {hasPkgs ? (
                        <>
                          <label className="block text-[#94A3B8] text-xs mb-1 font-mono">Select Package</label>
                          <select
                            value={selectedPackages[act.id] || ''}
                            onChange={e => setSelectedPackages(prev => ({ ...prev, [act.id]: e.target.value }))}
                            className="w-full bg-[#111] border border-[#2C2C2C] rounded-lg p-2 text-sm focus:border-[#00ABAB] outline-none mb-2"
                          >
                            {act.packages!.map(pkg => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.name} — ₹{pkg.price}/person
                              </option>
                            ))}
                          </select>
                          {selPkg && (
                            <p className="text-xs text-[#94A3B8] italic">{selPkg.description}</p>
                          )}
                        </>
                      ) : (
                        <div className="flex justify-between text-sm text-[#94A3B8]">
                          <span>Adult: ₹{act.adultPrice} · Child: ₹{act.childPrice}</span>
                          <span>×{totalQuantity}</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="bg-[#00ABAB]/10 border border-[#00ABAB]/30 rounded-xl p-4">
                  <div className="flex justify-between items-center text-sm text-[#94A3B8] mb-1">
                    <span>Guests</span><span>{adultCount} Adult{adultCount !== 1 ? 's' : ''}{childCount > 0 ? ` + ${childCount} Child${childCount !== 1 ? 'ren' : ''}` : ''}</span>
                  </div>
                  <div className="flex justify-between items-center text-xl font-bold text-[#00ABAB]">
                    <span>Total</span><span>₹{totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-8">
              <button onClick={onCancel} className="px-6 py-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-rose-500/10 transition-colors">Cancel</button>
              <button
                onClick={() => {
                  if (isPastDateSelection(date) || !timeSlot || !availableSlots.includes(timeSlot)) {
                    alert('Please select a valid future date and available time slot.');
                    return;
                  }
                  setStep(2);
                }}
                className="btn-glow px-8 py-2 rounded-xl font-bold"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: Guest Details ── */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-panel p-8 rounded-2xl border border-[#00ABAB]/30 shadow-[0_0_30px_rgba(0,171,171,0.1)]">
            <h3 className="text-2xl font-bold mb-6 border-b border-[#1C1C1C] pb-4 flex items-center gap-3 text-[#00ABAB]">
              <User className="w-6 h-6" /> Guest Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              <div>
                <label className="block text-[#94A3B8] mb-2 font-mono text-sm">Full Name *</label>
                <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="John Doe" className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 focus:border-[#00ABAB] outline-none transition-colors" required />
              </div>
              <div>
                <label className="block text-[#94A3B8] mb-2 font-mono text-sm">Email Address</label>
                <input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="john@example.com" className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 focus:border-[#00ABAB] outline-none transition-colors" />
              </div>
              <div className="col-span-2">
                <label className="block text-[#94A3B8] mb-2 font-mono text-sm">Phone Number *</label>
                <input type="tel" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-3 focus:border-[#00ABAB] outline-none transition-colors" required />
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
              <button onClick={() => setStep(3)} disabled={!guestName || !guestPhone || !waiverSigned} className="btn-glow px-8 py-2 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed">Proceed to Payment</button>
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
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-3">Counter Payment Methods</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: 'cash', label: 'Cash', desc: 'Cash collection' },
                    { key: 'upi', label: 'UPI Collect', desc: 'Manual request' },
                    { key: 'qrcode', label: 'QR Code', desc: 'Scan dynamic QR' }
                  ] as { key: PaymentMethod; label: string; desc: string }[]).map(m => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setPaymentMethod(m.key)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${paymentMethod === m.key ? 'bg-[#00ABAB]/10 border-[#00ABAB] text-[#00ABAB] shadow-[0_0_15px_rgba(0,171,171,0.2)]' : 'bg-[#0A0A0A] border-[#1C1C1C] text-[#94A3B8] hover:border-white/30 hover:text-white'}`}
                    >
                      {methodIcon(m.key)}
                      <span className="font-bold text-[10px] uppercase tracking-wide leading-tight mt-1">{m.label}</span>
                      <span className="text-[9px] opacity-70 mt-0.5">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-3">Physical Card POS Integration</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: 'card_tap', label: 'Card – Tap', desc: 'NFC Contactless' },
                    { key: 'card_insert', label: 'Card – Insert/Chip', desc: 'Chip insertion' },
                    { key: 'card_swipe', label: 'Card – Swipe', desc: 'Magnetic stripe' }
                  ] as { key: PaymentMethod; label: string; desc: string }[]).map(m => {
                    const isSwipe = m.key === 'card_swipe';
                    const isSwipeSupported = posProvider !== 'razorpay_pos'; // Only supported on mock_pos emulator
                    const isDisabled = isSwipe && !isSwipeSupported;

                    return (
                      <button
                        key={m.key}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setPaymentMethod(m.key)}
                        className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center relative ${isDisabled ? 'opacity-40 cursor-not-allowed bg-[#0A0A0A]/50 border-[#1c1c1c]' : paymentMethod === m.key ? 'bg-[#00ABAB]/10 border-[#00ABAB] text-[#00ABAB] shadow-[0_0_15px_rgba(0,171,171,0.2)]' : 'bg-[#0A0A0A] border-[#1C1C1C] text-[#94A3B8] hover:border-white/30 hover:text-white'}`}
                      >
                        {methodIcon(m.key)}
                        <span className="font-bold text-[10px] uppercase tracking-wide leading-tight mt-1">{m.label}</span>
                        <span className="text-[9px] opacity-70 mt-0.5">{isSwipe && !isSwipeSupported ? 'Not supported' : m.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs px-2 pt-2 border-t border-[#1c1c1c]">
                <span className="text-[#94A3B8] font-mono">Terminal ID: {posTerminalId || 'POS-TERM-001'}</span>
                <span className="flex items-center gap-1.5">
                  POS Status: 
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${posStatus === 'Connected' || posStatus === 'Payment Completed' ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : posStatus === 'Processing' ? 'bg-amber-500 animate-pulse' : 'bg-red-500'}`}></span>
                  <span className={`font-bold ${posStatus === 'Connected' || posStatus === 'Payment Completed' ? 'text-emerald-400' : posStatus === 'Processing' ? 'text-amber-400' : 'text-red-400'}`}>{posStatus}</span>
                </span>
              </div>
            </div>

            {/* Error display */}
            {counterError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {counterError}
              </div>
            )}

            {/* ── CASH FLOW ── */}
            {paymentMethod === 'cash' && counterStep === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="bg-[#0A0A0A] p-5 rounded-xl border border-[#1C1C1C] space-y-4">
                  <div className="flex justify-between items-center text-sm text-[#94A3B8]">
                    <span>Amount Due</span>
                    <span className="text-white font-bold">₹{totalAmount}</span>
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
                      <span className="text-emerald-400 font-mono text-sm">Change to Give</span>
                      <span className="text-emerald-400 font-black text-xl">₹{change.toFixed(2)}</span>
                    </motion.div>
                  )}
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setStep(2)} className="px-6 py-2 rounded-xl text-[#94A3B8] bg-[#1C1C1C] hover:bg-[#2C2C2C]">Back</button>
                  <button 
                    onClick={handleCashPayment} 
                    disabled={isProcessing || !amountReceived || parseFloat(amountReceived) < totalAmount} 
                    className="btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                    Confirm Cash Received
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── UPI COLLECT FLOW ── */}
            {paymentMethod === 'upi' && counterStep === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="bg-[#0A0A0A] p-5 rounded-xl border border-[#1C1C1C] text-center space-y-2">
                  <Smartphone className="w-10 h-10 text-[#00ABAB] mx-auto" />
                  <p className="text-[#94A3B8] text-sm">Collect Payment of <span className="text-white font-bold">₹{totalAmount}</span> via customer's UPI mobile collect request or static QR code.</p>
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setStep(2)} className="px-6 py-2 rounded-xl text-[#94A3B8] bg-[#1C1C1C] hover:bg-[#2C2C2C]">Back</button>
                  <button onClick={handleUpiCollectPayment} disabled={isProcessing} className="btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2">
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Confirm Payment Received
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── DYNAMIC QR CODE SCAN & POLL FLOW ── */}
            {paymentMethod === 'qrcode' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {counterStep === 'idle' && (
                  <div className="text-center space-y-4 py-4">
                    <p className="text-[#94A3B8] text-sm">Generate a dynamic UPI scan-and-pay QR code for exactly ₹{totalAmount}.</p>
                    <button onClick={handleGenerateQR} disabled={isProcessing || !counterUpiId} className="btn-glow px-8 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto">
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                      Generate QR Code
                    </button>
                    {!counterUpiId && (
                      <p className="text-red-400 text-xs">⚠️ Admin must configure Counter UPI ID first in payment settings.</p>
                    )}
                  </div>
                )}
                
                {counterStep === 'confirming' && tempBooking && (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-2xl max-w-sm mx-auto shadow-2xl">
                      <QRCodeSVG value={upiLink} size={200} level="H" includeMargin={true} />
                      <p className="text-black text-sm font-bold text-center">UPI ID: <span className="text-[#007B8B] font-mono">{counterUpiId}</span></p>
                      <p className="text-black text-2xl font-black">₹{totalAmount}</p>
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-bold animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00ABAB]" />
                        Waiting for payment confirmation...
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center max-w-sm mx-auto">
                      <button 
                        onClick={() => {
                          setIsPollingQRPayment(false);
                          setCounterStep('idle');
                        }} 
                        className="px-5 py-2 rounded-xl bg-[#1c1c1c] text-[#94a3b8] text-sm hover:bg-[#2c2c2c] transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                          setIsPollingQRPayment(false);
                          const confirmResult = markPaymentConfirmed({
                            bookingId: tempBooking.id,
                            method: 'upi',
                            staffId: currentUser?.id,
                            bookingData: tempBooking
                          });

                          if (confirmResult.success) {
                            setConfirmedBooking(tempBooking);
                            setConfirmedTicket(confirmResult.ticket || null);
                            setCounterStep('confirmed');
                            setStep(4);
                            setShowInvoiceModal(true);
                          } else {
                            setCounterError(confirmResult.message);
                          }
                        }} 
                        className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                      >
                        <Check className="w-4 h-4" /> Payment Received (Override)
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── CARD POS FLOW ── */}
            {paymentMethod.startsWith('card') && counterStep === 'idle' && (() => {
              const selectedOption = paymentMethod === 'card_tap' ? 'tap'
                                   : paymentMethod === 'card_insert' ? 'insert'
                                   : 'swipe';
              const modeLabel = selectedOption === 'tap' ? 'Card – Tap (NFC Contactless)'
                              : selectedOption === 'insert' ? 'Card – Insert/Chip'
                              : 'Card – Swipe (Magnetic Stripe)';

              return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {posStatus === 'Processing' ? (
                    <div className="bg-[#0A0A0A] p-8 rounded-xl border border-amber-500/30 text-center space-y-4 animate-pulse">
                      <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto" />
                      <p className="text-amber-400 text-lg font-black tracking-wider uppercase animate-bounce">Awaiting Card Action on POS</p>
                      <p className="text-[#94A3B8] text-xs">Please {selectedOption === 'tap' ? 'Tap NFC Card' : selectedOption === 'insert' ? 'Insert Chip Card' : 'Swipe Magnetic Card'} on terminal...</p>
                    </div>
                  ) : (
                    <div className="bg-[#0A0A0A] p-6 rounded-xl border border-[#1C1C1C] text-center space-y-4">
                      <CreditCard className="w-12 h-12 text-[#00ABAB] mx-auto" />
                      <div>
                        <p className="text-sm font-bold text-white uppercase">{modeLabel}</p>
                        <p className="text-[#94A3B8] text-xs mt-1">Ready to charge ₹{totalAmount} on POS terminal</p>
                      </div>

                      <button 
                        onClick={() => handleCardPayment(selectedOption)}
                        disabled={isProcessing || posStatus === 'Disconnected'}
                        className="w-full py-3.5 bg-[#00ABAB] hover:bg-[#00ABAB]/80 text-[#0A0A0A] rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,171,171,0.15)]"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                        Process POS Charge
                      </button>

                      {posStatus === 'Disconnected' && (
                        <p className="text-red-400 text-xs">⚠️ Terminal disconnected. Connect POS or select another payment method.</p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <button onClick={() => setStep(2)} disabled={posStatus === 'Processing'} className="px-6 py-2 rounded-xl text-[#94A3B8] bg-[#1C1C1C] hover:bg-[#2C2C2C] disabled:opacity-50">Back</button>
                  </div>
                </motion.div>
              );
            })()}

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
                  <button onClick={() => {
                    const pd = getPaymentDetails(confirmedBooking.id);
                    printTicket({
                      receiptId: `TKT-${confirmedBooking.id}`,
                      activityName: combinedActivityNames,
                      customerName: confirmedBooking.customerName,
                      date: confirmedBooking.date,
                      slot: confirmedBooking.timeSlot,
                      items: activities.map(a => ({ label: a.name, value: `₹${a.adultPrice || 0}/Adult` })),
                      totalAmount: confirmedBooking.totalAmount,
                      paymentStatus: 'paid',
                      quantity: totalQuantity,
                      paymentMethod: pd.paymentMethod,
                      transactionId: pd.transactionId
                    });
                  }} className="btn-glow px-6 py-3 rounded-xl font-bold flex items-center gap-2">
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

        {/* ── STEP 4: Payment Success (QR auto-poll or online success) ── */}
        {step === 4 && confirmedBooking && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-2xl text-center border border-[#00ABAB]/30 shadow-[0_0_30px_rgba(0,171,171,0.2)]">
            <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
            <h3 className="text-3xl font-black mb-2 text-emerald-400 tracking-tight">Booking Confirmed!</h3>
            <p className="text-[#94A3B8] mb-2 text-lg"><span className="text-[#00ABAB] text-lg font-bold">{confirmedBooking.activityName}</span> — Payment Received ✓</p>
            {guestEmail && <p className="text-[#94A3B8] text-sm mb-6">Confirmation sent to {guestEmail}.</p>}

            {/* Booking summary card */}
            <div className="max-w-md mx-auto mb-6 text-left bg-[#0A0A0A] border border-[#1C1C1C] rounded-2xl p-5 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Booking ID</span><span className="font-mono text-[#00ABAB]">#{confirmedBooking.id.slice(-8).toUpperCase()}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Guest</span><span className="font-bold text-white">{confirmedBooking.customerName}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Activity</span><span className="text-white">{confirmedBooking.activityName}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Date</span><span className="text-white">{confirmedBooking.date}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Time Slot</span><span className="text-white">{confirmedBooking.timeSlot}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Package / Details</span><span className="text-white text-right max-w-[60%]">{confirmedBooking.details}</span></div>
              <div className="flex justify-between text-sm border-t border-[#1C1C1C] pt-2 mt-2"><span className="text-[#94A3B8]">Total Paid</span><span className="text-emerald-400 font-black text-lg">₹{confirmedBooking.totalAmount}</span></div>
            </div>

            {confirmedTicket && (
              <div className="max-w-md mx-auto mb-8 text-left">
                <TicketPass ticket={confirmedTicket} booking={confirmedBooking} />
              </div>
            )}

            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => {
                const pd = getPaymentDetails(confirmedBooking.id);
                printTicket({
                  receiptId: `TKT-${confirmedBooking.id}`,
                  activityName: combinedActivityNames,
                  customerName: confirmedBooking.customerName,
                  date: confirmedBooking.date,
                  slot: confirmedBooking.timeSlot,
                  items: activities.map(a => ({ label: a.name, value: `₹${a.adultPrice || 0}/Adult` })),
                  totalAmount: confirmedBooking.totalAmount,
                  paymentStatus: 'paid',
                  quantity: totalQuantity,
                  paymentMethod: pd.paymentMethod,
                  transactionId: pd.transactionId
                });
              }} className="btn-glow px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print Ticket
              </button>
              <button onClick={onCancel} className="bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black text-white px-8 py-3 rounded-xl font-bold transition-all duration-300">
                Return to POS Dashboard
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Invoice Modal for confirmed bookings */}
      {showInvoiceModal && confirmedBooking && (
        <InvoiceModal
          booking={confirmedBooking}
          onClose={() => setShowInvoiceModal(false)}
        />
      )}
    </div>
  );
};

export default UnifiedTicketingFlow;
