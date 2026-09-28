import React, { useState } from 'react';
import { Ticket, Users, CreditCard, CheckCircle, Smartphone, Printer, Search, FileText, Banknote, Utensils, Plus, Minus, ShoppingBag, Trash2, ArrowRight, XCircle, RotateCcw, AlertTriangle, Check, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Activity, Payment } from '../types';
import { UnifiedTicketingFlow } from './UnifiedTicketingFlow';
import { printTicket } from '../lib/printTicket';

const TicketingDashboard: React.FC = () => {
  const { 
    activities, currentUser, payments, menuItems, vendors, 
    foodCart, addToFoodCart, removeFromFoodCart, clearFoodCart, submitFoodOrder,
    cancelAndRefundTicket
  } = useAppContext();
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'new_booking' | 'food_street' | 'history'>('new_booking');
  const [searchTerm, setSearchTerm] = useState('');

  // Cancel & Refund Modal States
  const [selectedRefundPayment, setSelectedRefundPayment] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState<string>('Customer Cancellation Request');
  const [customRefundReason, setCustomRefundReason] = useState<string>('');
  const [refundAmountInput, setRefundAmountInput] = useState<string>('');
  const [refundMethodInput, setRefundMethodInput] = useState<'cash' | 'upi' | 'card' | 'original'>('cash');
  const [isRefunding, setIsRefunding] = useState<boolean>(false);
  const [refundNotice, setRefundNotice] = useState<string | null>(null);
  const [refundSuccessReceipt, setRefundSuccessReceipt] = useState<any | null>(null);

  // Food Street POS states
  const [foodSearch, setFoodSearch] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('all');
  const [foodCustomerName, setFoodCustomerName] = useState('Walk-in Guest');
  const [foodCustomerEmail, setFoodCustomerEmail] = useState('counter@deucepark.com');
  const [foodPaymentMethod, setFoodPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [foodOrderSuccess, setFoodOrderSuccess] = useState<any>(null);

  // Visible activities excluding any legacy gaming/arena
  const visibleActivities = activities.filter(a => a.isActive !== false && !a.id.toLowerCase().includes('gaming') && !(a.type as string)?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('gaming') && !a.name?.toLowerCase().includes('arena'));

  // Auto-sync selectedActivities whenever activities updates in AppContext
  React.useEffect(() => {
    setSelectedActivities(prev => {
      if (prev.length === 0) return prev;
      return prev
        .filter(pAct => visibleActivities.some(a => a.id === pAct.id))
        .map(pAct => visibleActivities.find(a => a.id === pAct.id) || pAct);
    });
  }, [activities]);

  const toggleActivity = (act: Activity) => {
    setSelectedActivities(prev => 
      prev.find(a => a.id === act.id) 
        ? prev.filter(a => a.id !== act.id)
        : [...prev, act]
    );
  };

  const selectAll = () => {
    if (selectedActivities.length === visibleActivities.length) {
      setSelectedActivities([]);
    } else {
      setSelectedActivities([...visibleActivities]);
    }
  };

  const handlePrintReceipt = (p: any) => {
    printTicket({
      receiptId: p.ticketId || `TKT-${p.bookingId}`,
      activityName: p.activityName || 'Adventure Activity',
      packageName: p.details || p.activityName || 'Standard Package',
      customerName: p.customerName || 'Walk-in Guest',
      date: p.timestamp ? p.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
      slot: 'Standard Session',
      items: [{ label: p.details || p.activityName || 'Activity Package', value: `₹${p.amount}` }],
      totalAmount: p.amount,
      paymentStatus: 'paid',
      quantity: 1,
      paymentMethod: p.method
    });
  };

  const handleInitiateRefund = (p: Payment) => {
    setSelectedRefundPayment(p);
    setRefundAmountInput(String(p.amount));
    setRefundReason('Customer Cancellation Request');
    setCustomRefundReason('');
    setRefundNotice(null);
    const defaultMethod = p.method === 'cash' ? 'cash' : p.method.startsWith('card') ? 'card' : 'upi';
    setRefundMethodInput(defaultMethod);
  };

  const handleConfirmRefund = () => {
    if (!selectedRefundPayment) return;
    const finalReason = refundReason === 'Other / Custom' ? (customRefundReason.trim() || 'Staff Processed Cancellation') : refundReason;
    const refAmt = parseFloat(refundAmountInput) || selectedRefundPayment.amount;

    if (refAmt <= 0 || refAmt > selectedRefundPayment.amount) {
      alert(`Invalid refund amount. Must be between ₹1 and ₹${selectedRefundPayment.amount}`);
      return;
    }

    setIsRefunding(true);
    const result = cancelAndRefundTicket({
      ticketId: selectedRefundPayment.ticketId,
      bookingId: selectedRefundPayment.bookingId,
      reason: finalReason,
      refundAmount: refAmt,
      refundMethod: refundMethodInput,
      staffName: currentUser?.name || 'Counter Staff'
    });

    setIsRefunding(false);
    if (result.success) {
      setRefundSuccessReceipt(result.refundReceipt);
      setSelectedRefundPayment(null);

      // Print Cancellation Credit Note / Refund Receipt
      printTicket({
        receiptId: `REF-${selectedRefundPayment.ticketId || selectedRefundPayment.bookingId}`,
        activityName: `CANCELLED: ${selectedRefundPayment.activityName || 'Activity Ticket'}`,
        customerName: selectedRefundPayment.customerName || 'Guest',
        date: new Date().toISOString().split('T')[0],
        slot: 'REFUND RECEIPT',
        items: [
          { label: 'Original Charge', value: `₹${selectedRefundPayment.amount}` },
          { label: `Refund (${refundMethodInput.toUpperCase()})`, value: `-₹${refAmt}` },
          { label: 'Cancellation Reason', value: finalReason }
        ],
        totalAmount: 0,
        paymentStatus: 'refunded',
        quantity: 1,
        paymentMethod: refundMethodInput
      });
    } else {
      alert(result.message || 'Failed to process refund.');
    }
  };

  const handleProcessFoodOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (foodCart.length === 0) return;
    try {
      const order = submitFoodOrder(foodCustomerName, foodCustomerEmail, foodPaymentMethod);
      setFoodOrderSuccess(order);

      // Print Receipt
      printTicket({
        receiptId: order.id,
        activityName: 'Food Street Dining',
        customerName: foodCustomerName,
        date: new Date().toISOString().split('T')[0],
        slot: 'Counter POS',
        items: order.items.map(i => ({ label: `${i.quantity}x ${i.name}`, value: `₹${(i.price * i.quantity).toFixed(2)}` })),
        totalAmount: order.totalAmount,
        paymentStatus: 'paid',
        quantity: order.items.reduce((s, i) => s + i.quantity, 0),
        paymentMethod: foodPaymentMethod
      });

      clearFoodCart();
    } catch (err: any) {
      alert(err.message || 'Failed to submit food order.');
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(foodSearch.toLowerCase()) || 
                          item.category.toLowerCase().includes(foodSearch.toLowerCase());
    const matchesVendor = selectedVendorId === 'all' || item.vendorId === selectedVendorId;
    return matchesSearch && matchesVendor && item.isAvailable;
  });

  const filteredRawPayments = payments.filter(p => {
    const isCounter = p.counterId === 'counter_1' || p.staffId || p.method === 'cash' || p.method === 'qrcode' || p.method.startsWith('card');
    if (!isCounter) return false;
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return p.customerName?.toLowerCase().includes(searchLower) ||
           p.bookingId?.toLowerCase().includes(searchLower) ||
           p.ticketId?.toLowerCase().includes(searchLower) ||
           p.activityName?.toLowerCase().includes(searchLower);
  });

  // Deduplicate by bookingId (prefer 'paid' status over 'pending')
  const deduplicatedPaymentsMap = new Map<string, Payment>();
  filteredRawPayments.forEach(p => {
    const existing = deduplicatedPaymentsMap.get(p.bookingId);
    if (!existing) {
      deduplicatedPaymentsMap.set(p.bookingId, p);
    } else if (p.status === 'paid' && existing.status !== 'paid') {
      deduplicatedPaymentsMap.set(p.bookingId, p);
    } else if (new Date(p.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
      if (existing.status !== 'paid' || p.status === 'paid') {
        deduplicatedPaymentsMap.set(p.bookingId, p);
      }
    }
  });

  const counterPayments = Array.from(deduplicatedPaymentsMap.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (isCheckoutOpen && selectedActivities.length > 0) {
    const combinedName = selectedActivities.length === activities.length 
      ? 'All Activities Package' 
      : selectedActivities.map(a => a.name).join(' + ');

    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <div className="p-4 border-b border-[#00ABAB]/30 flex justify-between items-center bg-[#1C1C1C]">
          <h2 className="text-xl font-bold font-sans">Ticketing POS - {combinedName}</h2>
          <button 
            onClick={() => setIsCheckoutOpen(false)}
            className="px-4 py-2 bg-rose-500/10 text-rose-400 rounded-lg font-bold hover:bg-rose-500/20"
          >
            Cancel POS
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          <UnifiedTicketingFlow activities={selectedActivities.map(s => activities.find(a => a.id === s.id) || s)} onCancel={() => setIsCheckoutOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      <div className="flex justify-between items-center bg-[#1C1C1C] p-6 rounded-2xl border border-[#00ABAB]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3E8EDE]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <Ticket className="w-8 h-8 text-[#3E8EDE]" />
            Central <span className="text-[#00ABAB]">Ticketing & Food POS</span>
          </h1>
          <p className="text-[#94A3B8] font-mono text-sm mt-1 uppercase tracking-widest">
            Welcome, {currentUser?.name || 'Staff'}
          </p>
        </div>
      </div>

      {/* Sub-tab selector */}
      <div className="flex border-b border-[#1C1C1C]">
        <button 
          onClick={() => setActiveSubTab('new_booking')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 ${activeSubTab === 'new_booking' ? 'border-[#00ABAB] text-[#00ABAB]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
        >
          New Walk-in Booking
        </button>
        <button 
          onClick={() => setActiveSubTab('food_street')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${activeSubTab === 'food_street' ? 'border-[#00ABAB] text-[#00ABAB]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
        >
          <Utensils className="w-4 h-4" /> Food Street Counter POS
        </button>
        <button 
          onClick={() => setActiveSubTab('history')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 ${activeSubTab === 'history' ? 'border-[#00ABAB] text-[#00ABAB]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
        >
          Counter Transaction History
        </button>
      </div>

      {activeSubTab === 'new_booking' ? (
        <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Select Activities to Book</h2>
            <div className="flex gap-4">
              <button 
                onClick={selectAll}
                className="px-4 py-2 border border-[#00ABAB] text-[#00ABAB] rounded-xl font-bold hover:bg-[#00ABAB]/10 transition-colors cursor-pointer"
              >
                {selectedActivities.length === activities.length ? 'Deselect All' : 'Select All Package'}
              </button>
              <button 
                onClick={() => setIsCheckoutOpen(true)}
                disabled={selectedActivities.length === 0}
                className="px-6 py-2 bg-[#00ABAB] text-black rounded-xl font-bold hover:bg-[#00ABAB]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Checkout ({selectedActivities.length})
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleActivities.map(act => {
              const isSelected = selectedActivities.some(a => a.id === act.id);
              return (
                <div 
                  key={act.id} 
                  onClick={() => toggleActivity(act)}
                  className={`bg-[#0A0A0A] p-6 rounded-2xl border transition-all cursor-pointer group relative ${isSelected ? 'border-[#00ABAB] ring-1 ring-[#00ABAB]' : 'border-[#1C1C1C] hover:border-[#00ABAB]/50'}`}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-[#00ABAB] text-black rounded-full p-1 z-10">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                  <div className="h-32 rounded-xl overflow-hidden mb-4 border border-[#1C1C1C] relative">
                    <img src={act.image} alt={act.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {isSelected && <div className="absolute inset-0 bg-[#00ABAB]/20" />}
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#40E0D0] transition-colors">{act.name}</h3>
                  <div className="text-sm mt-2 font-mono">
                    {act.packages && act.packages.length > 0 ? (
                      <span className="text-[#00ABAB] font-bold">
                        Packages from ₹{Math.min(...act.packages.map(p => p.price))} ({act.packages.length} Options)
                      </span>
                    ) : (
                      <span className="text-[#94A3B8]">
                        Adult: ₹{act.adultPrice || 0} | Child: ₹{act.childPrice || 0}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeSubTab === 'food_street' ? (
        <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30 space-y-6 animate-fade-in">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* LEFT COLUMN: FOOD ITEMS CATALOG */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-[#00ABAB]" /> Food Street Stalls Catalog
                </h2>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <div className="relative flex-1 sm:w-48 min-w-[140px]">
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search dish..."
                      value={foodSearch}
                      onChange={e => setFoodSearch(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-[#94A3B8] focus:border-[#00ABAB] focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedVendorId}
                    onChange={e => setSelectedVendorId(e.target.value)}
                    className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl py-2 px-3 text-xs text-white focus:border-[#00ABAB] focus:outline-none font-mono"
                  >
                    <option value="all">All Stalls</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredMenuItems.map(item => {
                  const vendor = vendors.find(v => v.id === item.vendorId);
                  const stockQty = item.stockQuantity ?? 50;
                  const isOutOfStock = stockQty <= 0 || !item.isAvailable;

                  return (
                    <div 
                      key={item.id}
                      className="p-3 bg-[#0A0A0A] border border-[#1C1C1C] hover:border-[#00ABAB]/50 rounded-xl flex gap-3 transition-all group"
                    >
                      <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover border border-[#1C1C1C]" />
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] uppercase font-mono font-bold text-[#00ABAB] bg-[#1C1C1C] px-1.5 py-0.5 rounded truncate mr-1">
                              {vendor?.name || 'Stall'}
                            </span>
                            <span className="font-mono text-xs font-black text-white">₹{item.price.toFixed(2)}</span>
                          </div>
                          <h4 className="font-bold text-xs text-white truncate mt-1">{item.name}</h4>
                          <p className="text-[10px] text-[#94A3B8] line-clamp-1 mt-0.5">{item.description}</p>
                          <div className="mt-1">
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded inline-block ${
                              stockQty > 10 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                : stockQty > 0 
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}>
                              {stockQty > 0 ? `📦 Stock: ${stockQty}` : '🔴 Out of Stock'}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => addToFoodCart(item, 1)}
                          disabled={isOutOfStock}
                          className="mt-2 self-end px-3 py-1 rounded bg-[#00ABAB]/10 hover:bg-[#00ABAB] text-[#00ABAB] hover:text-black font-bold text-[10px] uppercase tracking-widest flex items-center gap-1 transition-all border border-[#00ABAB]/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="h-3 w-3" /> {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: FOOD BILL CART & PAYMENT */}
            <div className="w-full lg:w-96 bg-[#0A0A0A] p-5 rounded-2xl border border-[#00ABAB]/30 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-center border-b border-[#1C1C1C] pb-3 mb-3">
                  <h3 className="font-bold text-base text-white flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-[#00ABAB]" /> Counter Food Bill
                  </h3>
                  {foodCart.length > 0 && (
                    <button
                      onClick={clearFoodCart}
                      className="text-[10px] font-mono text-red-400 hover:underline cursor-pointer uppercase font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {foodCart.length === 0 ? (
                  <div className="py-12 text-center text-[#94A3B8] text-xs space-y-2">
                    <ShoppingBag className="w-8 h-8 mx-auto text-[#1C1C1C]" />
                    <p>No food items added to counter bill.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {foodCart.map((cartItem, idx) => (
                      <div key={idx} className="p-2.5 bg-[#1C1C1C]/50 border border-[#1C1C1C] rounded-xl text-xs flex justify-between items-center">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="font-bold text-white truncate">{cartItem.name}</div>
                          <div className="text-[9px] text-[#94A3B8] font-mono truncate">{cartItem.vendorName}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#00ABAB] font-bold">{cartItem.quantity}x</span>
                          <span className="font-mono font-bold text-white">₹{(cartItem.price * cartItem.quantity).toFixed(2)}</span>
                          <button
                            onClick={() => removeFromFoodCart(cartItem.menuItemId)}
                            className="text-white/40 hover:text-red-400 p-1 rounded cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form & Settlement */}
              <form onSubmit={handleProcessFoodOrder} className="space-y-3 pt-3 border-t border-[#1C1C1C]">
                <div>
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Guest Name</label>
                  <input
                    type="text"
                    value={foodCustomerName}
                    onChange={e => setFoodCustomerName(e.target.value)}
                    className="w-full bg-[#1C1C1C] border border-[#1C1C1C] rounded-xl px-3 py-2 text-xs text-white focus:border-[#00ABAB] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['cash', 'upi', 'card'] as const).map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setFoodPaymentMethod(method)}
                        className={`py-2 rounded-xl text-xs font-bold uppercase font-mono border transition-all cursor-pointer ${
                          foodPaymentMethod === method
                            ? 'bg-[#00ABAB] text-black border-[#00ABAB]'
                            : 'bg-[#1C1C1C] text-[#94A3B8] border-[#1C1C1C] hover:text-white'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs font-mono text-[#94A3B8] uppercase">Total Bill</span>
                  <span className="text-2xl font-black font-mono text-[#00ABAB]">
                    ₹{foodCart.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={foodCart.length === 0}
                  className="w-full py-3 rounded-xl bg-[#00ABAB] hover:bg-[#00ABAB]/80 text-black font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Process & Print Receipt
                </button>
              </form>
            </div>

          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Counter Walk-in Ledger</h2>
            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search guest or booking..."
                className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#00ABAB] transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1C1C1C]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0A0A0A] border-b border-[#1C1C1C] text-[#94A3B8] font-mono uppercase tracking-wider">
                  <th className="p-4 font-bold">Date/Time</th>
                  <th className="p-4 font-bold">Booking ID</th>
                  <th className="p-4 font-bold">Ticket ID</th>
                  <th className="p-4 font-bold">Guest</th>
                  <th className="p-4 font-bold">Activity</th>
                  <th className="p-4 font-bold">Amount</th>
                  <th className="p-4 font-bold">Method</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]">
                {counterPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[#94A3B8] font-mono">
                      No walk-in transactions found.
                    </td>
                  </tr>
                ) : (
                  counterPayments.map(p => (
                    <tr key={p.id} className="hover:bg-[#1C1C1C]/30 transition-colors">
                      <td className="p-4 text-[#94A3B8] font-mono">
                        {new Date(p.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 font-bold text-[#3E8EDE] font-mono">
                        {p.bookingId}
                      </td>
                      <td className="p-4 font-bold text-[#00ABAB] font-mono">
                        {p.ticketId || `tkt-${p.bookingId}`}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-white">{p.customerName || 'Walk-in Guest'}</p>
                        <p className="text-[10px] text-[#94A3B8]">{p.customer_id}</p>
                      </td>
                      <td className="p-4 text-white font-medium">
                        {p.activityName || 'Adventure Activity'}
                      </td>
                      <td className="p-4 font-bold text-white font-mono">
                        ₹{p.amount}
                      </td>
                      <td className="p-4 font-mono font-bold uppercase tracking-wider text-[#00ABAB]">
                        {p.method === 'cash' ? (
                          <span className="flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5 text-emerald-400" /> Cash</span>
                        ) : p.method.startsWith('card') ? (
                          <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-blue-400" /> Card</span>
                        ) : (
                          <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-violet-400" /> UPI</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black font-mono uppercase tracking-wider ${
                          p.status === 'paid' || p.status === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          p.status === 'refunded' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          p.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          p.status === 'pending' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {p.status === 'refunded' ? '🛑 REFUNDED' : p.status === 'cancelled' ? '🛑 CANCELLED' : p.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handlePrintReceipt(p)}
                            className="p-2 bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer"
                            title="Print Ticket & Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {p.status === 'refunded' || p.status === 'cancelled' ? (
                            <span className="text-[10px] font-mono text-slate-500 px-2 py-1 bg-white/5 rounded-lg border border-white/10">
                              REFUNDED
                            </span>
                          ) : (
                            <button
                              onClick={() => handleInitiateRefund(p)}
                              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg font-mono text-[11px] font-bold uppercase transition-all flex items-center gap-1 border border-rose-500/30 cursor-pointer shadow-sm"
                              title="Cancel Ticket & Issue Refund"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>REFUND</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CANCEL & REFUND MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {selectedRefundPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#090E20] border-2 border-rose-500/50 rounded-3xl p-6 text-white space-y-5 shadow-[0_0_50px_rgba(244,63,94,0.25)]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white font-sans">
                    CANCEL & REFUND TICKET
                  </h3>
                  <p className="text-[10px] font-mono text-rose-400">
                    Booking: {selectedRefundPayment.bookingId} · Ticket: {selectedRefundPayment.ticketId || `tkt-${selectedRefundPayment.bookingId}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRefundPayment(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Info Card */}
            <div className="p-4 rounded-2xl bg-[#050816] border border-white/10 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Guest:</span>
                <span className="text-white font-bold">{selectedRefundPayment.customerName || 'Walk-in Guest'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Activity:</span>
                <span className="text-[#14F1D9] font-bold">{selectedRefundPayment.activityName || 'Adventure Pass'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Amount Paid:</span>
                <span className="text-white font-bold text-sm">₹{selectedRefundPayment.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Payment Mode:</span>
                <span className="text-purple-400 font-bold uppercase">{selectedRefundPayment.method}</span>
              </div>
            </div>

            {/* Refund Options */}
            <div className="space-y-4">
              {/* Cancellation Reason */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Reason for Cancellation *
                </label>
                <select
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-rose-400 focus:outline-none"
                >
                  <option value="Customer Cancellation Request">Customer Cancellation Request</option>
                  <option value="Inclement Weather / Rain">Inclement Weather / Rain Condition</option>
                  <option value="Track Maintenance / Technical Delay">Track Maintenance / Technical Delay</option>
                  <option value="Duplicate Booking / Billing Error">Duplicate Booking / Billing Error</option>
                  <option value="Medical / Emergency Reason">Medical / Emergency Reason</option>
                  <option value="Group Size Changed">Group Size Changed</option>
                  <option value="Other / Custom">Other / Custom Reason</option>
                </select>

                {refundReason === 'Other / Custom' && (
                  <input
                    type="text"
                    placeholder="Enter specific cancellation reason..."
                    value={customRefundReason}
                    onChange={e => setCustomRefundReason(e.target.value)}
                    className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-rose-400 focus:outline-none mt-2"
                  />
                )}
              </div>

              {/* Refund Amount & Channel */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                    Refund Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedRefundPayment.amount}
                    value={refundAmountInput}
                    onChange={e => setRefundAmountInput(e.target.value)}
                    className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2 text-xs font-black text-rose-400 font-mono focus:border-rose-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                    Refund Method
                  </label>
                  <select
                    value={refundMethodInput}
                    onChange={e => setRefundMethodInput(e.target.value as any)}
                    className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-rose-400 focus:outline-none"
                  >
                    <option value="cash">Instant Cash Handover</option>
                    <option value="upi">Original UPI Account</option>
                    <option value="card">Card Reversal</option>
                    <option value="original">Original Payment Mode</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs text-rose-300 font-mono">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>This ticket will be permanently marked cancelled and cannot be scanned at activity check-in.</span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedRefundPayment(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase font-mono cursor-pointer"
              >
                BACK
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={isRefunding}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase font-mono transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.4)] disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isRefunding ? 'PROCESSING...' : 'CONFIRM CANCEL & REFUND'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          REFUND SUCCESS CREDIT NOTE RECEIPT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {refundSuccessReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#090E20] border-2 border-emerald-500/50 rounded-3xl p-6 text-white space-y-4 shadow-[0_0_50px_rgba(16,185,129,0.25)] text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Check className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black uppercase text-white font-sans">
              REFUND PROCESSED SUCCESSFULLY
            </h3>

            <div className="p-4 rounded-2xl bg-[#050816] border border-white/10 text-left text-xs font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Refund Amount:</span>
                <span className="text-emerald-400 font-bold text-base">₹{refundSuccessReceipt.refundAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Refund Channel:</span>
                <span className="text-white uppercase font-bold">{refundSuccessReceipt.refundMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Guest:</span>
                <span className="text-white">{refundSuccessReceipt.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reason:</span>
                <span className="text-slate-300 truncate max-w-[180px]">{refundSuccessReceipt.reason}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Staff Officer:</span>
                <span className="text-[#14F1D9]">{refundSuccessReceipt.staffName}</span>
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setRefundSuccessReceipt(null)}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase text-xs font-mono cursor-pointer transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                DONE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketingDashboard;
