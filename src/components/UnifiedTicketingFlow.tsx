import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Ticket, Booking, Payment } from '../types';
import { useAppContext } from '../context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, CreditCard, CheckCircle, User, Loader2, Calendar, Banknote, Smartphone, ArrowRight, AlertCircle, Printer, Check, Gift } from 'lucide-react';
import TicketPass from './TicketPass';
import { InvoiceModal } from './InvoiceModal';
import { printTicket } from '../lib/printTicket';
import { generateOfflineId } from '../lib/deviceSetup';

import { getAvailableTimeSlots, isPastDate as isPastDateSelection, getTodayDateString } from '../lib/slotUtils';

interface Props {
  activities: Activity[];
  onCancel: () => void;
}

type PaymentMethod = 'cash' | 'upi' | 'qrcode' | 'card_tap' | 'card_insert' | 'card_swipe' | 'complimentary';
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

  // Per-package quantities: { [packageId]: quantity }
  const [packageQuantities, setPackageQuantities] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {};
    activities.forEach(act => {
      if (act.packages && act.packages.length > 0) {
        // Default the first package of each activity to 1 pax
        defaults[act.packages[0].id] = 1;
      }
    });
    return defaults;
  });

  const updatePackageQty = (pkgId: string, delta: number) => {
    setPackageQuantities(prev => {
      const current = prev[pkgId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [pkgId]: next };
    });
  };

  const setPackageDirectQty = (pkgId: string, qty: number) => {
    setPackageQuantities(prev => ({
      ...prev,
      [pkgId]: Math.max(0, qty)
    }));
  };

  // Synchronize package selection whenever activity packages or pricing change in context
  useEffect(() => {
    setPackageQuantities(prev => {
      const updated = { ...prev };
      activities.forEach(act => {
        if (act.packages && act.packages.length > 0) {
          const hasAnySet = act.packages.some(p => (updated[p.id] || 0) > 0);
          if (!hasAnySet) {
            updated[act.packages[0].id] = 1;
          }
        }
      });
      return updated;
    });
  }, [activities]);

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

  // ── Discount & Tiered Promotional Rules ──
  const [discountType, setDiscountType] = useState<'none' | 'individual_5' | 'group_10' | 'group_15' | 'bulk_30' | 'custom' | 'cash'>('none');
  const [customDiscountPct, setCustomDiscountPct] = useState<number>(0);
  const [customCashDiscount, setCustomCashDiscount] = useState<number>(0);

  // List of all active selected package items across all activities
  const selectedPackageItems = activities.flatMap(act => {
    if (!act.packages || act.packages.length === 0) return [];
    return act.packages
      .map(pkg => ({
        activityId: act.id,
        activityName: act.name,
        packageId: pkg.id,
        packageName: pkg.name,
        unitPrice: pkg.price,
        description: pkg.description,
        quantity: packageQuantities[pkg.id] || 0,
        subtotal: pkg.price * (packageQuantities[pkg.id] || 0)
      }))
      .filter(item => item.quantity > 0);
  });

  // Calculate total pax/quantity across all activities
  const hasAnyPackages = activities.some(act => act.packages && act.packages.length > 0);

  const totalQuantity = activities.reduce((sum, act) => {
    if (act.packages && act.packages.length > 0) {
      const actPkgQty = act.packages.reduce((pSum, pkg) => pSum + (packageQuantities[pkg.id] || 0), 0);
      return sum + actPkgQty;
    }
    return sum + adultCount + childCount;
  }, 0);

  // Compute raw subtotal from per-package quantities or adult/child pricing
  const subtotalAmount = activities.reduce((sum, act) => {
    if (act.packages && act.packages.length > 0) {
      const actPkgSubtotal = act.packages.reduce((pSum, pkg) => {
        const qty = packageQuantities[pkg.id] || 0;
        return pSum + (pkg.price * qty);
      }, 0);
      return sum + actPkgSubtotal;
    }
    return sum + (act.adultPrice || 0) * adultCount + (act.childPrice || 0) * childCount;
  }, 0);

  // Active discount percentage and cash discount amount calculation
  let activeDiscountPct = 0;
  let discountAmount = 0;

  if (discountType === 'individual_5') {
    activeDiscountPct = 5;
    discountAmount = Math.round((subtotalAmount * 5) / 100);
  } else if (discountType === 'group_10') {
    activeDiscountPct = 10;
    discountAmount = Math.round((subtotalAmount * 10) / 100);
  } else if (discountType === 'group_15') {
    activeDiscountPct = 15;
    discountAmount = Math.round((subtotalAmount * 15) / 100);
  } else if (discountType === 'bulk_30') {
    activeDiscountPct = 30;
    discountAmount = Math.round((subtotalAmount * 30) / 100);
  } else if (discountType === 'custom') {
    activeDiscountPct = Math.min(100, Math.max(0, customDiscountPct || 0));
    discountAmount = Math.round((subtotalAmount * activeDiscountPct) / 100);
  } else if (discountType === 'cash') {
    discountAmount = Math.min(subtotalAmount, Math.max(0, customCashDiscount || 0));
    activeDiscountPct = subtotalAmount > 0 ? Math.round((discountAmount / subtotalAmount) * 100) : 0;
  } else {
    activeDiscountPct = 0;
    discountAmount = 0;
  }

  const totalAmount = Math.max(0, subtotalAmount - discountAmount);

  // Human-readable details string that includes package names and quantities
  const buildDetailsString = () => {
    const parts: string[] = [];
    activities.forEach(act => {
      if (act.packages && act.packages.length > 0) {
        const sel = act.packages
          .map(pkg => ({ pkg, qty: packageQuantities[pkg.id] || 0 }))
          .filter(item => item.qty > 0);

        if (sel.length > 0) {
          const pkgStrings = sel.map(item => `${item.qty}x ${item.pkg.name} (₹${item.pkg.price * item.qty})`);
          parts.push(`${act.name}: ${pkgStrings.join(' + ')}`);
        } else {
          parts.push(`${act.name}: 0 Selected`);
        }
      } else {
        parts.push(`${act.name}: ${adultCount}x Adult${childCount > 0 ? `, ${childCount}x Child` : ''}`);
      }
    });
    return parts.join(' | ') || 'Standard Admission';
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
      discountType,
      discountPercentage: activeDiscountPct,
      discountAmount,
      originalAmount: subtotalAmount,
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

  // ── COMPLIMENTARY VIP PASS FLOW
  const handleComplimentaryPayment = async () => {
    if (!guestName || !guestPhone) return alert('Please fill in guest name and phone number.');
    setIsProcessing(true);
    setCounterError(null);

    const totalQuantity = adultCount + childCount;

    // 1. Create Booking with ₹0 (Complimentary VIP)
    const bookingResult = createBooking({
      customerName: guestName,
      customerEmail: guestEmail,
      customerPhone: guestPhone,
      activityId: combinedActivityIds,
      activityName: combinedActivityNames,
      date,
      timeSlot,
      ticketType: 'Complimentary VIP Pass',
      details: buildDetailsString(),
      quantity: totalQuantity,
      totalAmount: 0,
      paymentMethod: 'complimentary'
    });

    if (typeof bookingResult === 'string') {
      setCounterError(bookingResult);
      setIsProcessing(false);
      return;
    }

    // 2. Mark as confirmed in DB
    const confirmResult = markPaymentConfirmed({
      bookingId: bookingResult.booking.id,
      method: 'complimentary',
      staffId: currentUser?.id,
      amountReceived: 0,
      bookingData: { ...bookingResult.booking, totalAmount: 0, paymentStatus: 'paid' }
    });

    if (confirmResult.success) {
      setConfirmedBooking(confirmResult.booking || bookingResult.booking);
      setConfirmedTicket(confirmResult.ticket || null);
      setCounterStep('confirmed');
      setStep(4);
      setShowInvoiceModal(true);
    } else {
      setCounterError(confirmResult.message || 'Failed to issue complimentary pass.');
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
      discountType,
      discountPercentage: activeDiscountPct,
      discountAmount,
      originalAmount: subtotalAmount,
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
      discountType,
      discountPercentage: activeDiscountPct,
      discountAmount,
      originalAmount: subtotalAmount,
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
          discountType,
          discountPercentage: activeDiscountPct,
          discountAmount,
          originalAmount: subtotalAmount,
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
    if (m === 'complimentary') return <Gift className="w-5 h-5 text-amber-400" />;
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

                {/* Guest Count / Ticket Summary */}
                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C] space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[#94A3B8] font-mono text-sm font-bold">Guest & Pax Allocation</p>
                    <span className="text-xs font-mono font-bold bg-[#00ABAB]/15 text-[#00ABAB] px-2 py-0.5 rounded border border-[#00ABAB]/30">
                      {totalQuantity} Pax Total
                    </span>
                  </div>

                  {hasAnyPackages ? (
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      💡 Package quantities are configured individually on the right. You can assign different Pax counts to each package.
                    </p>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              </div>

              {/* Right column: Package selection per activity + total */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[#94A3B8] font-mono text-xs uppercase tracking-widest font-bold">
                    Activity Packages & Pax Selectors
                  </p>
                  <span className="text-xs font-mono text-[#00ABAB] font-bold">
                    {totalQuantity} Pax Selected
                  </span>
                </div>

                {activities.map(act => {
                  const hasPkgs = act.packages && act.packages.length > 0;
                  const actTotalQty = hasPkgs
                    ? act.packages!.reduce((sum, pkg) => sum + (packageQuantities[pkg.id] || 0), 0)
                    : totalQuantity;

                  return (
                    <div key={act.id} className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C] hover:border-[#00ABAB]/40 transition-colors space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#00ABAB]" />
                          <span className="font-bold text-sm text-white">{act.name}</span>
                        </div>
                        {hasPkgs && (
                          <span className="text-[11px] font-mono font-bold bg-[#00ABAB]/15 text-[#00ABAB] px-2.5 py-0.5 rounded-full border border-[#00ABAB]/30">
                            {actTotalQty} Pax
                          </span>
                        )}
                      </div>

                      {hasPkgs ? (
                        <div className="space-y-2.5 pt-1">
                          {act.packages!.map(pkg => {
                            const qty = packageQuantities[pkg.id] || 0;
                            const isSelected = qty > 0;

                            return (
                              <div
                                key={pkg.id}
                                className={`p-3 rounded-xl border transition-all ${
                                  isSelected
                                    ? 'bg-[#121E24]/80 border-[#00ABAB]/50 shadow-[0_0_12px_rgba(0,171,171,0.15)]'
                                    : 'bg-[#111111] border-[#222222] hover:border-[#333333]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-bold text-white">{pkg.name}</span>
                                      <span className="text-xs font-mono font-black text-[#00ABAB] bg-[#00ABAB]/10 px-2 py-0.5 rounded border border-[#00ABAB]/30">
                                        ₹{pkg.price} / pax
                                      </span>
                                    </div>
                                    {pkg.description && (
                                      <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{pkg.description}</p>
                                    )}
                                  </div>

                                  {/* Direct Interactive Pax Counter */}
                                  <div className="flex items-center gap-2 bg-[#0A0A0A] p-1 rounded-xl border border-[#262626]">
                                    <button
                                      type="button"
                                      onClick={() => updatePackageQty(pkg.id, -1)}
                                      disabled={qty <= 0}
                                      className="w-8 h-8 rounded-lg bg-[#1C1C1C] hover:bg-rose-500/20 hover:text-rose-400 text-white font-bold flex items-center justify-center transition-colors disabled:opacity-30 disabled:hover:bg-[#1C1C1C] disabled:hover:text-white cursor-pointer text-base"
                                      title="Decrease Pax"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      max="999"
                                      value={qty}
                                      onChange={e => {
                                        const parsed = parseInt(e.target.value, 10);
                                        setPackageDirectQty(pkg.id, isNaN(parsed) ? 0 : Math.max(0, parsed));
                                      }}
                                      className="w-12 text-center bg-transparent font-mono font-black text-sm text-white focus:outline-none focus:text-[#00ABAB]"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => updatePackageQty(pkg.id, 1)}
                                      className="w-8 h-8 rounded-lg bg-[#00ABAB] hover:bg-[#00ABAB]/80 text-black font-black flex items-center justify-center transition-colors cursor-pointer text-base"
                                      title="Increase Pax"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {isSelected && (
                                  <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-[#00ABAB]/20 text-xs font-mono">
                                    <span className="text-slate-400">
                                      {qty} Pax × ₹{pkg.price}
                                    </span>
                                    <span className="text-emerald-400 font-black">
                                      = ₹{pkg.price * qty}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex justify-between text-sm text-[#94A3B8] p-2 bg-[#111] rounded-lg">
                          <span>Adult: ₹{act.adultPrice} · Child: ₹{act.childPrice}</span>
                          <span className="font-mono font-bold text-white">×{totalQuantity} Pax</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ── DISCOUNTS & INSTANT CASH BILLING ENGINE ── */}
                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C] space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[#94A3B8] font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-1.5">
                      🏷️ Discounts & Instant Cash Offer
                    </p>
                    {discountAmount > 0 && (
                      <span className="text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full bg-[#14F1D9]/20 text-[#14F1D9] border border-[#14F1D9]/40 shadow-[0_0_10px_rgba(20,241,217,0.2)]">
                        {discountType === 'cash' 
                          ? `₹${discountAmount} CASH DISCOUNT APPLIED` 
                          : `${activeDiscountPct}% OFF APPLIED (-₹${discountAmount})`}
                      </span>
                    )}
                  </div>

                  {/* Smart Contextual Recommendation Prompt */}
                  {totalQuantity >= 100 ? (
                    <div className="p-3 bg-purple-500/15 border border-purple-500/40 rounded-xl flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-purple-300 font-bold">
                        🏢 100+ Mega Bulk Order! 30% Corporate Discount Eligible
                      </span>
                      <button
                        type="button"
                        onClick={() => setDiscountType('bulk_30')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black uppercase cursor-pointer transition-all ${
                          discountType === 'bulk_30'
                            ? 'bg-[#14F1D9] text-[#050816] shadow-[0_0_15px_rgba(20,241,217,0.4)]'
                            : 'bg-purple-500 text-white hover:bg-purple-400'
                        }`}
                      >
                        {discountType === 'bulk_30' ? '✓ 30% APPLIED' : 'APPLY 30%'}
                      </button>
                    </div>
                  ) : totalQuantity > 10 ? (
                    <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-emerald-300 font-bold">
                        👥 Group ({totalQuantity} Pax)! 10% or 15% Group Discount
                      </span>
                      <button
                        type="button"
                        onClick={() => setDiscountType(discountType === 'group_10' ? 'group_15' : 'group_10')}
                        className="px-3 py-1 rounded-lg text-xs font-mono font-black uppercase bg-emerald-500 text-[#050816] hover:bg-emerald-400 cursor-pointer"
                      >
                        {discountType === 'group_10' ? '✓ 10% APPLIED' : discountType === 'group_15' ? '✓ 15% APPLIED' : 'APPLY 10%'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-sky-300">
                        🏷️ 1–10 Pax: 5% Individual or Direct Cash Discount Available
                      </span>
                      <button
                        type="button"
                        onClick={() => setDiscountType(discountType === 'individual_5' ? 'none' : 'individual_5')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer ${
                          discountType === 'individual_5'
                            ? 'bg-[#14F1D9] text-black font-black'
                            : 'bg-sky-500/20 text-sky-300 hover:bg-sky-500/30'
                        }`}
                      >
                        {discountType === 'individual_5' ? '✓ 5% APPLIED' : 'APPLY 5%'}
                      </button>
                    </div>
                  )}

                  {/* Manual Tier Selection Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setDiscountType('individual_5')}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        discountType === 'individual_5'
                          ? 'bg-[#14F1D9] text-black font-black border-[#14F1D9]'
                          : 'bg-[#141414] text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      🏷️ 5% Individual
                    </button>

                    <button
                      type="button"
                      onClick={() => setDiscountType('group_10')}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        discountType === 'group_10'
                          ? 'bg-emerald-400 text-black font-black border-emerald-400'
                          : 'bg-[#141414] text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      👥 10% Group (10+)
                    </button>

                    <button
                      type="button"
                      onClick={() => setDiscountType('group_15')}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        discountType === 'group_15'
                          ? 'bg-teal-400 text-black font-black border-teal-400'
                          : 'bg-[#141414] text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      👥 15% VIP Group
                    </button>

                    <button
                      type="button"
                      onClick={() => setDiscountType('bulk_30')}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        discountType === 'bulk_30'
                          ? 'bg-purple-400 text-black font-black border-purple-400'
                          : 'bg-[#141414] text-slate-300 border-white/10 hover:border-white/20'
                      }`}
                    >
                      🏢 30% Bulk (100+)
                    </button>

                    <button
                      type="button"
                      onClick={() => setDiscountType('custom')}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        discountType === 'custom'
                          ? 'bg-amber-400 text-black font-black border-amber-400'
                          : 'bg-[#141414] text-amber-300/80 border-amber-500/20 hover:border-amber-500/40'
                      }`}
                    >
                      ⚡ Custom %
                    </button>

                    <button
                      type="button"
                      onClick={() => setDiscountType('cash')}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        discountType === 'cash'
                          ? 'bg-emerald-400 text-black font-black border-emerald-400'
                          : 'bg-[#141414] text-emerald-300/80 border-emerald-500/20 hover:border-emerald-500/40'
                      }`}
                    >
                      💵 Cash Discount (₹)
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDiscountType('none');
                        setCustomDiscountPct(0);
                        setCustomCashDiscount(0);
                      }}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer col-span-2 ${
                        discountType === 'none'
                          ? 'bg-slate-700 text-white font-black border-slate-600'
                          : 'bg-[#141414] text-slate-400 border-white/10 hover:text-white'
                      }`}
                    >
                      ✕ Clear Discount
                    </button>
                  </div>

                  {/* Direct Input Controls for Custom % or Instant Cash (₹) Discount */}
                  {discountType === 'custom' && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs text-amber-300 font-mono font-bold">
                        <span>Enter Custom Discount Percentage</span>
                        <span>{customDiscountPct}% OFF</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={customDiscountPct || ''}
                            onChange={e => setCustomDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))}
                            placeholder="Enter percentage (e.g. 12)"
                            className="w-full bg-[#141414] border border-amber-500/40 rounded-lg p-2 text-sm text-white font-mono focus:border-amber-400 outline-none pr-8"
                          />
                          <span className="absolute right-3 top-2 text-amber-400 font-bold font-mono">%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {discountType === 'cash' && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xs text-emerald-300 font-mono font-bold">
                        <span>Direct Cash Discount in Billing</span>
                        <span>-₹{discountAmount} Instant Off</span>
                      </div>

                      {/* Quick Cash Discount Presets */}
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                        <span className="text-slate-400 self-center mr-1">Quick Presets:</span>
                        {[50, 100, 200, 500].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setCustomCashDiscount(amt)}
                            className={`px-2.5 py-1 rounded-md border font-bold transition-all ${
                              customCashDiscount === amt
                                ? 'bg-emerald-400 text-black border-emerald-400'
                                : 'bg-[#141414] text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                            }`}
                          >
                            ₹{amt} OFF
                          </button>
                        ))}
                      </div>

                      {/* Cash Input */}
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-2.5 text-emerald-400 font-bold font-mono">₹</span>
                        <input
                          type="number"
                          min="0"
                          max={subtotalAmount}
                          value={customCashDiscount || ''}
                          onChange={e => setCustomCashDiscount(Math.max(0, Number(e.target.value)))}
                          placeholder="Type cash discount amount (e.g. 75)"
                          className="w-full bg-[#141414] border border-emerald-500/40 rounded-lg p-2 pl-8 text-sm text-white font-mono focus:border-emerald-400 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing Summary Card */}
                <div className="bg-[#00ABAB]/10 border border-[#00ABAB]/30 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs text-[#94A3B8] font-mono">
                    <span>Total Guests / Tickets</span>
                    <span className="text-white font-bold">{totalQuantity} Pax</span>
                  </div>

                  {selectedPackageItems.length > 0 ? (
                    <div className="py-2 border-y border-[#00ABAB]/20 space-y-1.5">
                      {selectedPackageItems.map(item => (
                        <div key={item.packageId} className="flex justify-between items-center text-xs">
                          <span className="text-slate-300 font-medium">
                            <span className="text-[#00ABAB] font-mono font-bold mr-1">{item.quantity}x</span> {item.packageName}
                          </span>
                          <span className="text-white font-mono font-bold">₹{item.subtotal}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center text-xs text-[#94A3B8]">
                      <span>Guests</span>
                      <span>{adultCount} Adult{adultCount !== 1 ? 's' : ''}{childCount > 0 ? ` + ${childCount} Child${childCount !== 1 ? 'ren' : ''}` : ''} ({totalQuantity} Total)</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-[#94A3B8]">
                    <span>Subtotal</span>
                    <span className="text-white font-mono font-bold">₹{subtotalAmount}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-400 font-bold">
                      <span>Discount {discountType === 'cash' ? '(Cash Instant)' : `(${activeDiscountPct}%)`}</span>
                      <span className="font-mono">-₹{discountAmount}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xl font-bold text-[#00ABAB] border-t border-[#00ABAB]/20 pt-2">
                    <span>Total Due</span>
                    <span className="font-black">₹{totalAmount}</span>
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
                  if (totalQuantity <= 0) {
                    alert('Please select at least 1 guest / package to continue.');
                    return;
                  }
                  setStep(2);
                }}
                disabled={totalQuantity <= 0}
                className="btn-glow px-8 py-2 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue ({totalQuantity} Pax • ₹{totalAmount})
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
            <div className="bg-[#0A0A0A] p-5 rounded-2xl border border-[#1C1C1C] space-y-2">
              <p className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-1">Order Summary</p>
              <div className="flex justify-between text-sm font-bold text-white">
                <span>{combinedActivityNames}</span>
                <span className="text-[#00ABAB] font-mono">{totalQuantity} Pax</span>
              </div>
              <div className="flex justify-between text-xs text-[#94A3B8]">
                <span>{date} • {timeSlot}</span>
                <span>{totalQuantity} tickets</span>
              </div>

              {selectedPackageItems.length > 0 && (
                <div className="py-2 border-y border-[#1C1C1C] space-y-1">
                  {selectedPackageItems.map(item => (
                    <div key={item.packageId} className="flex justify-between text-xs text-slate-300">
                      <span>{item.quantity}x {item.packageName}</span>
                      <span className="font-mono text-white font-bold">₹{item.subtotal}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-xs text-[#94A3B8] pt-1">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-white">₹{subtotalAmount}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-xs text-emerald-400 font-bold">
                  <span>Discount {discountType === 'cash' ? '(Cash Instant)' : `(${activeDiscountPct}%)`}</span>
                  <span className="font-mono">-₹{discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-[#00ABAB] border-t border-[#1C1C1C] pt-3">
                <span>Total Due</span>
                <span className="font-black">₹{totalAmount}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-3">Counter Payment Methods</p>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { key: 'cash', label: 'Cash', desc: 'Cash collection' },
                    { key: 'upi', label: 'UPI Collect', desc: 'Manual request' },
                    { key: 'qrcode', label: 'QR Code', desc: 'Scan dynamic QR' },
                    { key: 'complimentary', label: '🎁 Comp Pass', desc: 'VIP / Zero Charge' }
                  ] as { key: PaymentMethod; label: string; desc: string }[]).map(m => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setPaymentMethod(m.key)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                        paymentMethod === m.key 
                          ? m.key === 'complimentary'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                            : 'bg-[#00ABAB]/10 border-[#00ABAB] text-[#00ABAB] shadow-[0_0_15px_rgba(0,171,171,0.2)]' 
                          : 'bg-[#0A0A0A] border-[#1C1C1C] text-[#94A3B8] hover:border-white/30 hover:text-white'
                      }`}
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

            {/* ── COMPLIMENTARY VIP PASS FLOW ── */}
            {paymentMethod === 'complimentary' && counterStep === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="bg-[#0A0A0A] p-5 rounded-xl border border-amber-500/30 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto">
                    <Gift className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-amber-300">Complimentary VIP Access Pass</h4>
                  <p className="text-[#94A3B8] text-xs max-w-md mx-auto">
                    Issue a 100% complimentary guest of honor pass with <strong className="text-white">₹0 billing</strong> and full gate turnstile clearance for <strong className="text-amber-400">{guestName || 'Guest'}</strong>.
                  </p>
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl inline-block font-mono text-xs text-amber-300 font-bold">
                    Total Due: ₹0.00 (Zero Charge)
                  </div>
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setStep(2)} className="px-6 py-2 rounded-xl text-[#94A3B8] bg-[#1C1C1C] hover:bg-[#2C2C2C]">Back</button>
                  <button 
                    onClick={handleComplimentaryPayment} 
                    disabled={isProcessing} 
                    className="px-8 py-3 rounded-xl font-bold flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:scale-105 transition-transform shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                    Issue Complimentary VIP Pass
                  </button>
                </div>
              </motion.div>
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
                    const receiptItems = selectedPackageItems.length > 0
                      ? selectedPackageItems.map(item => ({
                          label: `${item.quantity}x ${item.packageName}`,
                          value: `₹${item.subtotal.toFixed(2)}`
                        }))
                      : [{ label: confirmedBooking.details || confirmedBooking.activityName, value: `₹${confirmedBooking.totalAmount.toFixed(2)}` }];

                    printTicket({
                      receiptId: `TKT-${confirmedBooking.id}`,
                      tokenNumber: confirmedTicket?.id || confirmedBooking.id,
                      activityName: combinedActivityNames || confirmedBooking.activityName,
                      packageName: confirmedBooking.details || 'Standard Package',
                      customerName: confirmedBooking.customerName,
                      customerPhone: confirmedBooking.customerPhone || guestPhone,
                      date: confirmedBooking.date,
                      slot: confirmedBooking.timeSlot,
                      items: receiptItems,
                      subtotalAmount: confirmedBooking.originalAmount || subtotalAmount,
                      discountPercentage: confirmedBooking.discountPercentage || activeDiscountPct,
                      discountAmount: confirmedBooking.discountAmount || discountAmount,
                      totalAmount: confirmedBooking.totalAmount,
                      paymentStatus: 'paid',
                      quantity: totalQuantity,
                      paymentMethod: pd.paymentMethod || 'CASH',
                      transactionId: pd.transactionId,
                      counterStaff: currentUser?.name || 'Counter Staff'
                    });
                  }} className="btn-glow px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print Gate Pass & Receipt
                  </button>
                  <button onClick={onCancel} className="bg-[#1C1C1C] hover:bg-[#2C2C2C] text-[#FFFFFF] px-6 py-3 rounded-xl font-bold">
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
              <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Guest</span><span className="font-bold text-[#FFFFFF]">{confirmedBooking.customerName}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Activity</span><span className="text-[#FFFFFF]">{confirmedBooking.activityName}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Date</span><span className="text-[#FFFFFF]">{confirmedBooking.date}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Time Slot</span><span className="text-[#FFFFFF]">{confirmedBooking.timeSlot}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#94A3B8]">Package / Details</span><span className="text-[#FFFFFF] text-right max-w-[60%]">{confirmedBooking.details}</span></div>
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
                const receiptItems = selectedPackageItems.length > 0
                  ? selectedPackageItems.map(item => ({
                      label: `${item.quantity}x ${item.packageName}`,
                      value: `₹${item.subtotal.toFixed(2)}`
                    }))
                  : [{ label: confirmedBooking.details || confirmedBooking.activityName, value: `₹${confirmedBooking.totalAmount.toFixed(2)}` }];

                printTicket({
                  receiptId: `TKT-${confirmedBooking.id}`,
                  tokenNumber: confirmedTicket?.id || confirmedBooking.id,
                  activityName: combinedActivityNames || confirmedBooking.activityName,
                  packageName: confirmedBooking.details || 'Standard Package',
                  customerName: confirmedBooking.customerName,
                  customerPhone: confirmedBooking.customerPhone || guestPhone,
                  date: confirmedBooking.date,
                  slot: confirmedBooking.timeSlot,
                  items: receiptItems,
                  subtotalAmount: confirmedBooking.originalAmount || subtotalAmount,
                  discountPercentage: confirmedBooking.discountPercentage || activeDiscountPct,
                  discountAmount: confirmedBooking.discountAmount || discountAmount,
                  totalAmount: confirmedBooking.totalAmount,
                  paymentStatus: 'paid',
                  quantity: totalQuantity,
                  paymentMethod: pd.paymentMethod || 'CASH',
                  transactionId: pd.transactionId,
                  counterStaff: currentUser?.name || 'Counter Staff'
                });
              }} className="btn-glow px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print Single Gate Pass & Receipt
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
