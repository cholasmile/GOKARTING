/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * DEUCE - Multi-Activity Combo Pack Sales Counter
 */

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { ComboPack, Booking, Ticket } from '../types';
import {
  Boxes, Sparkles, Tag, CheckCircle2, ShoppingCart, CreditCard,
  Banknote, QrCode, Search, Printer, ArrowRight, X, Clock,
  ShieldCheck, AlertCircle, ChevronRight, User, Phone, Check, RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { printTicket } from '../lib/printTicket';

export const ComboPackSalesCounter: React.FC = () => {
  const {
    comboPacks,
    createBooking,
    markPaymentConfirmed,
    currentUser,
    counterUpiId
  } = useAppContext();

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  
  // Per-pack selected quantities in catalog
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Active checkout state
  const [checkoutPack, setCheckoutPack] = useState<ComboPack | null>(null);
  const [checkoutQuantity, setCheckoutQuantity] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success Confirmation Modal
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [confirmedTicket, setConfirmedTicket] = useState<Ticket | null>(null);

  // Active combo packs only
  const activePacks = useMemo(() => {
    return comboPacks.filter(p => p.isActive);
  }, [comboPacks]);

  // Filtered by search
  const filteredPacks = useMemo(() => {
    if (!searchTerm.trim()) return activePacks;
    const term = searchTerm.toLowerCase();
    return activePacks.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term) ||
      p.items.some(i => i.activityName.toLowerCase().includes(term) || (i.packageName && i.packageName.toLowerCase().includes(term)))
    );
  }, [activePacks, searchTerm]);

  const getPackQuantity = (packId: string) => quantities[packId] || 1;

  const handleQuantityChange = (packId: string, delta: number) => {
    const current = getPackQuantity(packId);
    const updated = Math.max(1, Math.min(20, current + delta));
    setQuantities(prev => ({ ...prev, [packId]: updated }));
  };

  const openCheckout = (pack: ComboPack) => {
    setCheckoutPack(pack);
    const qty = getPackQuantity(pack.id);
    setCheckoutQuantity(qty);
    setAmountReceived(String(pack.comboPrice * qty));
    setGuestName('');
    setGuestPhone('');
    setPaymentMethod('cash');
    setErrorMessage(null);
  };

  const closeCheckout = () => {
    setCheckoutPack(null);
    setErrorMessage(null);
  };

  const handleCompleteSale = () => {
    if (!checkoutPack) return;
    if (!guestName.trim()) {
      setErrorMessage('Guest name is mandatory.');
      return;
    }
    if (!guestPhone.trim() || guestPhone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    const totalAmount = checkoutPack.comboPrice * checkoutQuantity;
    const receivedNum = Number(amountReceived) || 0;

    if (paymentMethod === 'cash' && receivedNum < totalAmount) {
      setErrorMessage(`Cash received (₹${receivedNum}) cannot be less than total amount due (₹${totalAmount}).`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeSlotStr = `${String(now.getHours()).padStart(2, '0')}:00`;

    // Itemized details string
    const detailsSummary = checkoutPack.items
      .map(item => `${item.activityName} (${item.unitOrDuration})`)
      .join(' + ');

    // 1. Create booking with Combo properties
    const bookingResult = createBooking({
      customerName: guestName.trim(),
      customerEmail: `${guestPhone.trim()}@guest.deuce.local`,
      customerPhone: guestPhone.trim(),
      activityId: checkoutPack.items.map(i => i.activityId).join(','),
      activityName: checkoutPack.name,
      date: dateStr,
      timeSlot: timeSlotStr,
      ticketType: 'Multi-Activity Combo Pass',
      details: `[COMBO] ${checkoutPack.name} | ${detailsSummary}`,
      quantity: checkoutQuantity,
      totalAmount,
      discountType: 'combo_special',
      discountAmount: Math.max(0, (checkoutPack.originalPrice - checkoutPack.comboPrice) * checkoutQuantity),
      originalAmount: checkoutPack.originalPrice * checkoutQuantity,
      paymentMethod,
      isComboPack: true,
      comboPackId: checkoutPack.id,
      comboPackName: checkoutPack.name,
      comboItems: checkoutPack.items
    });

    if (typeof bookingResult === 'string') {
      setErrorMessage(bookingResult);
      setIsProcessing(false);
      return;
    }

    // 2. Mark payment confirmed in database
    const confirmResult = markPaymentConfirmed({
      bookingId: bookingResult.booking.id,
      method: paymentMethod,
      staffId: currentUser?.id,
      amountReceived: paymentMethod === 'cash' ? receivedNum : totalAmount,
      bookingData: bookingResult.booking
    });

    if (!confirmResult.success) {
      setErrorMessage(confirmResult.message);
      setIsProcessing(false);
      return;
    }

    const confirmedB = confirmResult.booking || bookingResult.booking;
    const confirmedT = confirmResult.ticket || bookingResult.ticket || null;

    setConfirmedBooking(confirmedB);
    setConfirmedTicket(confirmedT);

    // Auto-trigger thermal receipt print
    try {
      printTicket({
        receiptId: confirmedT?.id || `tkt-${confirmedB.id}`,
        tokenNumber: confirmedT?.id || confirmedB.id,
        activityName: checkoutPack.name,
        packageName: `Combo Pack (${checkoutQuantity} Pass${checkoutQuantity > 1 ? 'es' : ''})`,
        customerName: guestName.trim(),
        customerPhone: guestPhone.trim(),
        date: dateStr,
        slot: timeSlotStr,
        items: checkoutPack.items.map(i => ({
          label: `${i.activityName} [${i.unitOrDuration}]`,
          value: `${i.quantity * checkoutQuantity} Entitlement${(i.quantity * checkoutQuantity) > 1 ? 's' : ''}`
        })),
        subtotalAmount: checkoutPack.originalPrice * checkoutQuantity,
        discountAmount: Math.max(0, (checkoutPack.originalPrice - checkoutPack.comboPrice) * checkoutQuantity),
        totalAmount,
        paymentStatus: 'paid',
        quantity: checkoutQuantity,
        paymentMethod: paymentMethod.toUpperCase(),
        counterStaff: currentUser?.name || 'Counter Operator'
      });
    } catch (e) {
      console.warn('Auto print error:', e);
    }

    setIsProcessing(false);
    setCheckoutPack(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── HEADER BANNER ── */}
      <div className="glass-panel rounded-2xl p-6 border border-[#FFD700]/30 relative overflow-hidden bg-gradient-to-r from-amber-950/30 via-[#0A0A0A] to-cyan-950/20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-xs font-black uppercase tracking-wider mb-2">
              <Boxes className="w-3.5 h-3.5" /> High-Value Bundle Passes
            </div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2.5">
              Multi-Activity Combo Packs
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl">
              Sell curated packages combining 2 or more activities (Go-Karting, Air Rifle, Simulators, Moto Simulation, Horse Riding) in one ticket with independent station check-in.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search combo packages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0A0A0A]/80 border border-[#FFD700]/30 rounded-xl text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#FFD700]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── COMBO PACKS GRID ── */}
      {filteredPacks.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center border border-[#1C1C1C]">
          <Boxes className="w-12 h-12 text-[#94A3B8] mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-white mb-1">No Active Combo Packs Found</h3>
          <p className="text-xs text-[#94A3B8] max-w-md mx-auto mb-4">
            {searchTerm 
              ? 'No combo packs match your search term. Clear the search or create a new pack.'
              : 'Create combo packs in the Admin Panel to start selling them here at the counter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPacks.map(pack => {
            const savings = Math.max(0, pack.originalPrice - pack.comboPrice);
            const savingsPercent = pack.originalPrice > 0 ? Math.round((savings / pack.originalPrice) * 100) : 0;
            const currentQty = getPackQuantity(pack.id);
            const packTotal = pack.comboPrice * currentQty;

            return (
              <div
                key={pack.id}
                className="glass-panel rounded-2xl border border-[#FFD700]/30 bg-[#0A0A0A] overflow-hidden flex flex-col justify-between hover:border-[#FFD700] hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] transition-all group"
              >
                <div>
                  {/* Card Header & Badge */}
                  <div className="p-5 pb-3 border-b border-[#1C1C1C] bg-gradient-to-br from-amber-500/10 to-transparent relative">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FFD700] text-black text-[10px] font-black uppercase tracking-wider shadow-sm">
                        {pack.badge || 'COMBO PASS'}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] font-mono">
                        {pack.items.length} Activities Included
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-white group-hover:text-[#FFD700] transition-colors leading-snug">
                      {pack.name}
                    </h3>
                    <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">
                      {pack.description}
                    </p>
                  </div>

                  {/* Included Entitlements List */}
                  <div className="p-5 space-y-2.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FFD700]" /> Included Activity Entitlements:
                    </div>

                    <div className="space-y-1.5 bg-[#050816]/60 p-3 rounded-xl border border-[#1C1C1C]">
                      {pack.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-b-0">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#14F1D9]" />
                            <span className="text-white font-medium">{item.activityName}</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[#14F1D9] text-[10px] font-bold">
                              {item.unitOrDuration}
                            </span>
                            <span className="text-[10px] text-[#94A3B8]">
                              ×{item.quantity}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Pricing, Quantity & Buy Action */}
                <div className="p-5 pt-3 border-t border-[#1C1C1C] bg-[#050816]/40 space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#94A3B8] line-through">
                          ₹{pack.originalPrice}
                        </span>
                        {savingsPercent > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                            {savingsPercent}% OFF
                          </span>
                        )}
                      </div>
                      <div className="text-2xl font-black text-[#FFD700] tracking-tight">
                        ₹{pack.comboPrice}
                        <span className="text-xs text-[#94A3B8] font-normal ml-1">/ pack</span>
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center border border-[#1C1C1C] rounded-xl bg-black/60 p-1">
                      <button
                        onClick={() => handleQuantityChange(pack.id, -1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white font-bold cursor-pointer text-sm"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-mono font-bold text-white">
                        {currentQty}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(pack.id, 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white font-bold cursor-pointer text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => openCheckout(pack)}
                    className="w-full py-2.5 bg-gradient-to-r from-[#FFD700] to-amber-500 text-black rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-[0_0_20px_rgba(255,215,0,0.25)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingCart className="w-4 h-4" /> Book Combo Pass (₹{packTotal})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FAST CHECKOUT MODAL ── */}
      {checkoutPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-lg bg-[#0A0A0A] border border-[#FFD700]/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#1C1C1C] bg-gradient-to-r from-amber-500/20 via-[#0A0A0A] to-cyan-500/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#FFD700] text-black text-[10px] font-black uppercase">
                    COMBO CHECKOUT
                  </span>
                  <span className="text-xs text-[#94A3B8]">Counter Terminal</span>
                </div>
                <h3 className="text-lg font-black text-white mt-1">
                  {checkoutPack.name}
                </h3>
              </div>
              <button
                onClick={closeCheckout}
                className="p-2 rounded-xl text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Guest Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-[#14F1D9]" /> Guest Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#94A3B8] mb-1 block">Customer Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Vikram Sharma"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#050816] border border-[#1C1C1C] rounded-xl text-xs text-white placeholder-[#64748B] focus:border-[#FFD700] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#94A3B8] mb-1 block">Mobile Number *</label>
                    <input
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full px-3.5 py-2 bg-[#050816] border border-[#1C1C1C] rounded-xl text-xs text-white placeholder-[#64748B] focus:border-[#FFD700] focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Package Summary & Quantity */}
              <div className="p-4 rounded-2xl bg-[#050816] border border-[#1C1C1C] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#94A3B8] font-bold">Quantity (Number of Passes)</span>
                  <div className="flex items-center border border-[#1C1C1C] rounded-lg bg-black/60 p-0.5">
                    <button
                      onClick={() => {
                        const newQ = Math.max(1, checkoutQuantity - 1);
                        setCheckoutQuantity(newQ);
                        setAmountReceived(String(checkoutPack.comboPrice * newQ));
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white font-bold cursor-pointer text-xs"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-mono font-bold text-white">
                      {checkoutQuantity}
                    </span>
                    <button
                      onClick={() => {
                        const newQ = Math.min(20, checkoutQuantity + 1);
                        setCheckoutQuantity(newQ);
                        setAmountReceived(String(checkoutPack.comboPrice * newQ));
                      }}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-white font-bold cursor-pointer text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1C1C1C] flex justify-between items-center">
                  <span className="text-xs text-[#94A3B8]">Included Entitlements:</span>
                  <span className="text-xs text-[#14F1D9] font-mono font-bold">
                    {checkoutPack.items.length} Activities × {checkoutQuantity} pax
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-[#1C1C1C]">
                  <div>
                    <span className="text-xs text-[#94A3B8]">Total Amount Due</span>
                    <div className="text-[10px] text-emerald-400 font-bold">
                      Guest saves ₹{(checkoutPack.originalPrice - checkoutPack.comboPrice) * checkoutQuantity}!
                    </div>
                  </div>
                  <span className="text-2xl font-black text-[#FFD700] font-mono">
                    ₹{checkoutPack.comboPrice * checkoutQuantity}
                  </span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">Select Payment Method</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('cash');
                      setAmountReceived(String(checkoutPack.comboPrice * checkoutQuantity));
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'border-[#FFD700] bg-amber-500/15 text-[#FFD700] font-bold'
                        : 'border-[#1C1C1C] bg-[#050816] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <Banknote className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs">CASH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentMethod === 'upi'
                        ? 'border-[#14F1D9] bg-teal-500/15 text-[#14F1D9] font-bold'
                        : 'border-[#1C1C1C] bg-[#050816] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <QrCode className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs">UPI QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'border-indigo-400 bg-indigo-500/15 text-indigo-400 font-bold'
                        : 'border-[#1C1C1C] bg-[#050816] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mx-auto mb-1" />
                    <span className="text-xs">CARD / EDC</span>
                  </button>
                </div>

                {/* Cash Calculation */}
                {paymentMethod === 'cash' && (
                  <div className="p-3.5 rounded-xl bg-[#050816] border border-[#1C1C1C] space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white">Cash Received (₹)</label>
                      <input
                        type="number"
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="w-32 px-3 py-1.5 bg-black border border-[#1C1C1C] rounded-lg text-right font-mono font-bold text-white focus:border-[#FFD700] focus:outline-none text-sm"
                      />
                    </div>
                    {Number(amountReceived) > checkoutPack.comboPrice * checkoutQuantity && (
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-[#1C1C1C]">
                        <span className="text-[#94A3B8]">Change to Return:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          ₹{Number(amountReceived) - (checkoutPack.comboPrice * checkoutQuantity)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* UPI QR Display */}
                {paymentMethod === 'upi' && (
                  <div className="p-3.5 rounded-xl bg-[#050816] border border-[#14F1D9]/30 text-center space-y-2">
                    <p className="text-xs text-[#94A3B8]">Guest can scan counter QR or pay to UPI ID:</p>
                    <div className="font-mono text-sm text-[#14F1D9] font-bold bg-black/60 p-2 rounded-lg border border-white/5">
                      {counterUpiId || 'deuce.yelagiri@icici'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-[#1C1C1C] bg-[#050816]/60 flex items-center gap-3">
              <button
                type="button"
                onClick={closeCheckout}
                disabled={isProcessing}
                className="flex-1 py-3 border border-[#1C1C1C] text-[#94A3B8] rounded-xl text-xs font-bold hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSale}
                disabled={isProcessing}
                className="flex-2 py-3 bg-gradient-to-r from-[#FFD700] to-amber-500 text-black rounded-xl font-black text-xs uppercase tracking-wider hover:opacity-95 transition-all shadow-[0_0_25px_rgba(255,215,0,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Issuing Pass...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" /> Complete Sale & Print Ticket
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS PASS CONFIRMATION MODAL ── */}
      {confirmedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="glass-panel w-full max-w-md bg-[#0A0A0A] border border-emerald-500/40 rounded-3xl p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                TICKET ISSUED SUCCESSFULLY
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                {confirmedBooking.activityName}
              </h3>
              <p className="text-xs text-[#94A3B8] mt-1 font-mono">
                Token / Ticket ID: {confirmedTicket?.id || `tkt-${confirmedBooking.id}`}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white text-black text-center space-y-2 max-w-xs mx-auto shadow-inner">
              <div className="inline-block p-1 bg-white border border-black rounded">
                <QRCodeSVG
                  value={confirmedTicket?.qrCodeValue || `DEUCE-PASS-${confirmedBooking.id}`}
                  size={120}
                  level="M"
                />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-black">
                {confirmedBooking.customerName}
              </div>
              <div className="text-[10px] text-gray-700 font-mono">
                {confirmedBooking.customerPhone} &bull; ₹{confirmedBooking.totalAmount} PAID
              </div>
            </div>

            <p className="text-xs text-[#94A3B8]">
              Separate redemption records have been created for each included activity. Attendants at each station can now check in this guest using the QR scanner.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  try {
                    printTicket({
                      receiptId: confirmedTicket?.id || `tkt-${confirmedBooking.id}`,
                      tokenNumber: confirmedTicket?.id || confirmedBooking.id,
                      activityName: confirmedBooking.activityName,
                      packageName: confirmedBooking.details,
                      customerName: confirmedBooking.customerName,
                      customerPhone: confirmedBooking.customerPhone,
                      date: confirmedBooking.date,
                      slot: confirmedBooking.timeSlot,
                      items: (confirmedBooking.comboItems || []).map(i => ({
                        label: `${i.activityName} [${i.unitOrDuration}]`,
                        value: `${i.quantity * confirmedBooking.quantity} Entitlements`
                      })),
                      totalAmount: confirmedBooking.totalAmount,
                      paymentStatus: 'paid',
                      quantity: confirmedBooking.quantity,
                      paymentMethod: (confirmedBooking as any).paymentMethod?.toUpperCase() || 'CASH',
                      counterStaff: currentUser?.name || 'Counter Operator'
                    });
                  } catch (e) {
                    console.warn(e);
                  }
                }}
                className="flex-1 py-2.5 bg-white text-black font-black text-xs uppercase tracking-wider rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Reprint
              </button>
              <button
                onClick={() => {
                  setConfirmedBooking(null);
                  setConfirmedTicket(null);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-black text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition-all cursor-pointer"
              >
                Done / Next Sale
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
