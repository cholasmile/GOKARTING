import React, { useState } from 'react';
import { 
  Ticket, Users, CreditCard, CheckCircle, Smartphone, Printer, Search, FileText, Banknote, 
  Utensils, Plus, Minus, ShoppingBag, Trash2, ArrowRight, XCircle, RotateCcw, AlertTriangle, 
  Check, X, QrCode, Calendar, TrendingUp, Clock, Coins, Receipt, Wallet, ArrowUpRight,
  Flame, Store, Coffee, ChevronRight, Layers, Tag
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Activity, Payment, FoodOrder } from '../types';
import { UnifiedTicketingFlow } from './UnifiedTicketingFlow';
import { printTicket } from '../lib/printTicket';

const TicketingDashboard: React.FC = () => {
  const { 
    activities, currentUser, payments, orders, menuItems, vendors, 
    foodCart, addToFoodCart, removeFromFoodCart, clearFoodCart, submitFoodOrder,
    cancelAndRefundTicket, counterUpiId
  } = useAppContext();
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'new_booking' | 'food_street' | 'history'>('new_booking');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Current Day Transaction Filters (Cash & UPI Breakdown Only)
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'upi'>('all');

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

  const isDateToday = (timestampStr?: string | number) => {
    if (!timestampStr) return false;
    let d: Date;
    if (typeof timestampStr === 'number' || /^\d+$/.test(String(timestampStr))) {
      const num = Number(timestampStr);
      d = new Date(num < 10000000000 ? num * 1000 : num);
    } else {
      d = new Date(timestampStr);
    }
    if (isNaN(d.getTime())) return false;
    
    const now = new Date();
    const isSameLocalDate = d.getFullYear() === now.getFullYear() &&
                            d.getMonth() === now.getMonth() &&
                            d.getDate() === now.getDate();
    
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayLocalIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const todayIso = now.toISOString().split('T')[0];
    const itemIso = typeof timestampStr === 'string' && timestampStr.includes('-') ? timestampStr.split('T')[0] : '';
    
    return isSameLocalDate || itemIso === todayLocalIso || itemIso === todayIso;
  };

  const handlePrintReceipt = (p: any) => {
    const isFood = p.orderId || p.activityName === 'Food Street Dining' || p.activityName?.toLowerCase().includes('food') || p.activityName?.toLowerCase().includes('cafe') || p.activityName?.toLowerCase().includes('dining');
    if (isFood) {
      const matchingOrder = orders.find(o => o.id === p.orderId);
      const itemsList = matchingOrder && matchingOrder.items && matchingOrder.items.length > 0
        ? matchingOrder.items.map(i => ({ label: `${i.quantity}x ${i.name}`, value: `₹${(i.price * i.quantity).toFixed(2)}` }))
        : [{ label: p.activityName || 'Food Items', value: `₹${p.amount}` }];
      
      printTicket({
        receiptId: p.orderId || p.id,
        tokenNumber: p.orderId || p.id,
        activityName: 'DEUCE FOOD & BEVERAGES',
        packageName: 'Food Street Dining',
        customerName: p.customerName || 'Walk-in Guest',
        customerPhone: p.customerPhone,
        date: p.timestamp ? p.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
        slot: 'FOOD COUNTER',
        items: itemsList,
        totalAmount: p.amount,
        paymentStatus: 'paid',
        quantity: matchingOrder?.items?.reduce((s, i) => s + i.quantity, 0) || 1,
        paymentMethod: p.method
      });
      return;
    }

    printTicket({
      receiptId: p.ticketId || `TKT-${p.bookingId}`,
      tokenNumber: p.ticketId || p.bookingId,
      activityName: p.activityName || 'Adventure Activity',
      packageName: p.packageName || p.details || p.activityName || 'Standard Package',
      customerName: p.customerName || 'Walk-in Guest',
      customerPhone: p.customerPhone,
      date: p.timestamp ? p.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
      slot: 'Standard Session',
      items: [{ label: p.packageName || p.details || p.activityName || 'Activity Package', value: `₹${p.amount}` }],
      totalAmount: p.amount,
      paymentStatus: (p.status === 'refunded' || p.status === 'cancelled') ? 'refunded' : 'paid',
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
      bookingId: selectedRefundPayment.bookingId || selectedRefundPayment.orderId || selectedRefundPayment.id,
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
        receiptId: `REF-${selectedRefundPayment.ticketId || selectedRefundPayment.bookingId || selectedRefundPayment.orderId}`,
        activityName: `CANCELLED: ${selectedRefundPayment.activityName || 'Activity Ticket / Order'}`,
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

  const [isSubmittingFood, setIsSubmittingFood] = useState(false);

  const handleProcessFoodOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (foodCart.length === 0 || isSubmittingFood) return;
    setIsSubmittingFood(true);
    try {
      const order = submitFoodOrder(foodCustomerName, foodCustomerEmail, foodPaymentMethod);
      setFoodOrderSuccess(order);

      // Print Receipt with 5% GST breakdown
      printTicket({
        receiptId: order.invoiceNumber || order.id,
        tokenNumber: order.tokenNumber || order.id,
        activityName: 'DEUCE FOOD & BEVERAGES',
        packageName: 'Food Street Dining',
        customerName: foodCustomerName,
        customerPhone: order.customerPhone,
        date: new Date().toISOString().split('T')[0],
        slot: 'FOOD COUNTER',
        items: order.items.map(i => ({ label: `${i.quantity}x ${i.name}`, value: `₹${(i.price * i.quantity).toFixed(2)}` })),
        subtotalAmount: order.subtotal,
        totalAmount: order.totalAmount,
        paymentStatus: 'paid',
        quantity: order.items.reduce((s, i) => s + i.quantity, 0),
        paymentMethod: foodPaymentMethod
      });

      clearFoodCart();
    } catch (err: any) {
      alert(err.message || 'Failed to submit food order.');
    } finally {
      setIsSubmittingFood(false);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(foodSearch.toLowerCase()) || 
                          item.category.toLowerCase().includes(foodSearch.toLowerCase());
    const matchesVendor = selectedVendorId === 'all' || item.vendorId === selectedVendorId;
    return matchesSearch && matchesVendor && item.isAvailable;
  });

  // ── 1. Unified Deduplicated Payments Base ─────────────────────────────
  // Ensure all payments (tickets and food) link cleanly without loss
  const allDeduplicatedPaymentsMap = new Map<string, Payment>();
  payments.forEach(p => {
    const key = p.bookingId || p.orderId || p.id;
    const existing = allDeduplicatedPaymentsMap.get(key);
    if (!existing) {
      allDeduplicatedPaymentsMap.set(key, p);
    } else {
      const isCurrPaid = p.status === 'paid' || p.status === 'success';
      const isExistPaid = existing.status === 'paid' || existing.status === 'success';
      if (isCurrPaid && !isExistPaid) {
        allDeduplicatedPaymentsMap.set(key, p);
      } else if ((isCurrPaid === isExistPaid) && new Date(p.timestamp || p.created_at || 0).getTime() > new Date(existing.timestamp || existing.created_at || 0).getTime()) {
        allDeduplicatedPaymentsMap.set(key, p);
      }
    }
  });

  const allConsolidatedPayments = Array.from(allDeduplicatedPaymentsMap.values());

  // ── 2. Current Day Ticketing Sales & Cash / UPI Breakdown Calculations ───
  // Strictly filter for current day's ticketing transactions with Cash & UPI (excludes other days, food orders, and other transaction types)
  const todayTicketingPaymentsList = allConsolidatedPayments.filter(p => {
    const isToday = isDateToday(p.timestamp || p.created_at);
    const isFood = Boolean(
      p.orderId || 
      p.activityName === 'Food Street Dining' || 
      p.activityName?.toLowerCase().includes('food') || 
      p.activityName?.toLowerCase().includes('cafe') || 
      p.activityName?.toLowerCase().includes('dining')
    );
    const isCashOrUpi = p.method === 'cash' || p.method === 'upi' || p.method === 'qrcode';
    return isToday && !isFood && isCashOrUpi;
  });

  // Current day paid ticketing transactions for revenue breakdown
  const todayPaidTicketingList = todayTicketingPaymentsList.filter(
    p => p.status === 'paid' || p.status === 'success' || p.payment_status === 'PAID'
  );

  const todayCashList = todayPaidTicketingList.filter(p => p.method === 'cash');
  const todayUpiList = todayPaidTicketingList.filter(p => p.method === 'upi' || p.method === 'qrcode');

  const todayCashRevenue = todayCashList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const todayCashCount = todayCashList.length;

  const todayUpiRevenue = todayUpiList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const todayUpiCount = todayUpiList.length;

  const todayTotalRevenue = todayCashRevenue + todayUpiRevenue;
  const todayTotalCount = todayPaidTicketingList.length;

  // Filtered transactions for the Current Day Table (Search & Cash/UPI toggle)
  const counterPayments = todayTicketingPaymentsList.filter(p => {
    if (methodFilter === 'cash' && p.method !== 'cash') return false;
    if (methodFilter === 'upi' && p.method !== 'upi' && p.method !== 'qrcode') return false;

    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return p.customerName?.toLowerCase().includes(searchLower) ||
           p.customer_id?.toLowerCase().includes(searchLower) ||
           p.bookingId?.toLowerCase().includes(searchLower) ||
           p.ticketId?.toLowerCase().includes(searchLower) ||
           p.activityName?.toLowerCase().includes(searchLower) ||
           p.transactionId?.toLowerCase().includes(searchLower) ||
           p.referenceNumber?.toLowerCase().includes(searchLower);
  }).sort((a, b) => new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime());

  if (isCheckoutOpen && selectedActivities.length > 0) {
    const combinedName = selectedActivities.length === activities.length 
      ? 'All Activities Package' 
      : selectedActivities.map(a => a.name).join(' + ');

    return (
      <div className="fixed inset-0 z-50 bg-[#0A0A0A] text-white flex flex-col overflow-hidden m-0 p-0">
        <div className="p-4 border-b border-[#00ABAB]/30 flex justify-between items-center bg-[#1C1C1C]">
          <h2 className="text-xl font-bold font-sans">Ticketing POS - {combinedName}</h2>
          <button 
            onClick={() => setIsCheckoutOpen(false)}
            className="px-4 py-2 bg-rose-500/10 text-rose-400 rounded-lg font-bold hover:bg-rose-500/20 cursor-pointer"
          >
            Cancel POS
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 md:p-6">
          <UnifiedTicketingFlow activities={selectedActivities.map(s => activities.find(a => a.id === s.id) || s)} onCancel={() => setIsCheckoutOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white w-full m-0 p-0">
      <div className="flex justify-between items-center bg-[#1C1C1C] p-6 rounded-2xl border border-[#00ABAB]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3E8EDE]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <Ticket className="w-8 h-8 text-[#3E8EDE]" />
            Central <span className="text-[#00ABAB]">Ticketing & Food Street POS</span>
          </h1>
          <p className="text-[#94A3B8] font-mono text-sm mt-1 uppercase tracking-widest">
            Welcome, {currentUser?.name || 'Staff'} • Unified Counter Terminal
          </p>
        </div>
      </div>

      {/* Sub-tab selector */}
      <div className="flex border-b border-[#1C1C1C] gap-2 overflow-x-auto">
        <button 
          onClick={() => setActiveSubTab('new_booking')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 whitespace-nowrap ${activeSubTab === 'new_booking' ? 'border-[#00ABAB] text-[#00ABAB]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
        >
          New Walk-in Booking
        </button>
        <button 
          onClick={() => setActiveSubTab('food_street')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${activeSubTab === 'food_street' ? 'border-[#00ABAB] text-[#00ABAB]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
        >
          <Utensils className="w-4 h-4" /> Food Street Counter POS
        </button>
        <button 
          onClick={() => setActiveSubTab('history')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${activeSubTab === 'history' ? 'border-[#00ABAB] text-[#00ABAB]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
        >
          <Clock className="w-4 h-4" /> Today's Sales ({todayTotalCount})
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
                {selectedActivities.length === visibleActivities.length ? 'Deselect All' : 'Select All Package'}
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

          {/* Today's Combined Counter Quick Summary */}
          <div className="mt-8 pt-6 border-t border-[#1C1C1C] space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#00ABAB]/10 border border-[#00ABAB]/30 text-[#40E0D0]">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white font-sans">
                    Today's Total Sales Summary ({todayPaidCounterList.length} Transactions)
                  </h3>
                  <p className="text-[10px] text-[#94A3B8]">
                    Combined Activities & Food Street Total: <strong className="text-[#40E0D0]">₹{todayTotalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveSubTab('history');
                }}
                className="text-xs font-mono text-[#40E0D0] hover:underline flex items-center gap-1 cursor-pointer font-bold"
              >
                Open Full Sales Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-[#0A0A0A] border border-cyan-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-[#94A3B8]">Activity Tickets:</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-cyan-400">₹{todayActivityRevenue.toLocaleString('en-IN')}</span>
                  <div className="text-[9px] text-[#94A3B8] font-mono">{todayActivityPaidList.length} passes</div>
                </div>
              </div>

              <div className="p-3 bg-[#0A0A0A] border border-amber-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-[#94A3B8]">Food Street Sales:</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono text-amber-400">₹{todayFoodRevenue.toLocaleString('en-IN')}</span>
                  <div className="text-[9px] text-[#94A3B8] font-mono">{todayFoodPaidList.length} orders</div>
                </div>
              </div>

              <div className="p-3 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-[#94A3B8]">Today's Cash:</span>
                </div>
                <span className="text-sm font-bold font-mono text-emerald-400">₹{todayCashRevenue.toLocaleString('en-IN')}</span>
              </div>

              <div className="p-3 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-[#94A3B8]">Today's UPI:</span>
                </div>
                <span className="text-sm font-bold font-mono text-violet-400">₹{todayUpiRevenue.toLocaleString('en-IN')}</span>
              </div>
            </div>
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

              {/* Form & Settlement (Token generated automatically, no customer details required) */}
              <form onSubmit={handleProcessFoodOrder} className="space-y-3 pt-3 border-t border-[#1C1C1C]">
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

                {(() => {
                  const foodGrandTotal = Math.round(foodCart.reduce((s, i) => s + (i.price * i.quantity), 0) * 100) / 100;
                  const foodSubtotal = Math.round((foodGrandTotal / 1.05) * 100) / 100;
                  const foodGst = Math.round((foodGrandTotal - foodSubtotal) * 100) / 100;
                  return (
                    <div className="space-y-1.5 pt-2 border-t border-[#1C1C1C] text-xs font-mono">
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>Taxable Base:</span>
                        <span>₹{foodSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[#94A3B8]">
                        <span>GST (5% Incl.):</span>
                        <span className="text-[#00ABAB]">₹{foodGst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-white/10 font-bold">
                        <span className="text-xs uppercase text-white">Grand Total:</span>
                        <span className="text-xl font-black font-mono text-[#00ABAB]">
                          ₹{foodGrandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={foodCart.length === 0 || isSubmittingFood}
                  className="w-full py-3 rounded-xl bg-[#00ABAB] hover:bg-[#00ABAB]/80 text-black font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmittingFood ? 'Processing...' : 'Process & Print Receipt'}
                </button>
              </form>
            </div>

          </div>
        </div>
      ) : (
        /* ═══════════════════════════════════════════════════════════════════
            TRANSACTIONS & SALES DASHBOARD (TICKETS + FOOD STREET INTEGRATED)
           ═══════════════════════════════════════════════════════════════════ */
        <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30 space-y-6 animate-fade-in">
          
          {/* ── 1. HEADER & TODAY BADGE ── */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#1C1C1C] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#00ABAB]/10 border border-[#00ABAB]/30 text-[#40E0D0]">
                  <Receipt className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Current Day Ticketing Sales & Transactions
                    <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#00ABAB]/20 text-[#40E0D0] border border-[#00ABAB]/40 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Today Only
                    </span>
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    Real-time single-day counter sales with Cash and UPI breakdown
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date Indicator Badge */}
              <div className="flex items-center gap-2 bg-[#0A0A0A] px-3.5 py-2 rounded-xl border border-[#00ABAB]/30 text-[#40E0D0] text-xs font-bold font-mono">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className="bg-[#00ABAB]/20 px-2 py-0.5 rounded-md text-[10px] text-white">
                  {counterPayments.length} Tickets Today
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Search ticket / guest..."
                  className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#00ABAB] transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* ── 2. EXECUTIVE KPI CARDS: ONE DAY CURRENT SALES (CASH & UPI BREAKDOWN) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Current Day Total Sales */}
            <div className="p-5 bg-[#0A0A0A] border border-[#00ABAB]/40 rounded-2xl space-y-2 relative overflow-hidden shadow-[0_0_25px_rgba(0,171,171,0.08)]">
              <div className="absolute top-0 right-0 w-28 h-28 bg-[#00ABAB]/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-xs uppercase tracking-wider font-extrabold font-sans flex items-center gap-2 text-[#40E0D0]">
                  <TrendingUp className="w-4 h-4" /> Current Day Total Sales
                </span>
                <span className="p-1 bg-[#1C1C1C] text-[#40E0D0] border border-[#00ABAB]/30 rounded-md text-[11px] font-mono font-bold px-2">
                  {todayTotalCount} Paid
                </span>
              </div>
              <div className="text-3xl font-black text-[#40E0D0] font-mono tracking-tight">
                ₹{todayTotalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-[#94A3B8] font-mono">
                Combined Cash + UPI ticketing collection today
              </p>
            </div>

            {/* 2. Cash Breakdown */}
            <div className="p-5 bg-[#0A0A0A] border border-emerald-500/30 rounded-2xl space-y-2 relative overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.06)]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-xs uppercase tracking-wider font-extrabold font-sans flex items-center gap-2 text-emerald-400">
                  <Banknote className="w-4 h-4" /> Cash Sales Breakdown
                </span>
                <span className="p-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[11px] font-mono font-bold px-2">
                  {todayCashCount} Txns
                </span>
              </div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                ₹{todayCashRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-[#94A3B8] font-mono">
                Total physical cash received at counter today
              </p>
            </div>

            {/* 3. UPI Breakdown */}
            <div className="p-5 bg-[#0A0A0A] border border-violet-500/30 rounded-2xl space-y-2 relative overflow-hidden shadow-[0_0_25px_rgba(139,92,246,0.06)]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex items-center justify-between text-[#94A3B8]">
                <span className="text-xs uppercase tracking-wider font-extrabold font-sans flex items-center gap-2 text-violet-400">
                  <Smartphone className="w-4 h-4" /> UPI Sales Breakdown
                </span>
                <span className="p-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-md text-[11px] font-mono font-bold px-2">
                  {todayUpiCount} Txns
                </span>
              </div>
              <div className="text-3xl font-black text-white font-mono tracking-tight">
                ₹{todayUpiRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-[#94A3B8] font-mono">
                Total UPI QR & collect payments today
              </p>
            </div>

          </div>

          {/* ── 3. CASH & UPI METHOD FILTER ── */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#94A3B8] font-mono uppercase font-bold">Showing:</span>
              <span className="text-xs text-white font-bold font-mono">Current Day Ticketing Transactions ({counterPayments.length})</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-[#94A3B8] text-[11px] uppercase mr-1">Filter Method:</span>
              {(['all', 'cash', 'upi'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer border ${
                    methodFilter === m
                      ? 'bg-[#00ABAB] text-black border-[#00ABAB] shadow-sm'
                      : 'bg-[#0A0A0A] border-[#1C1C1C] text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {m === 'all' ? `All Today (${todayTicketingPaymentsList.length})` : m === 'cash' ? `Cash (${todayCashCount})` : `UPI (${todayUpiCount})`}
                </button>
              ))}
            </div>
          </div>

          {/* ── 4. CURRENT DAY TRANSACTION LEDGER TABLE ── */}
          <div className="overflow-x-auto rounded-xl border border-[#1C1C1C]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0A0A0A] border-b border-[#1C1C1C] text-[#94A3B8] font-mono uppercase tracking-wider">
                  <th className="p-4 font-bold">Time</th>
                  <th className="p-4 font-bold">Booking / Ticket ID</th>
                  <th className="p-4 font-bold">Guest Info</th>
                  <th className="p-4 font-bold">Activity / Package</th>
                  <th className="p-4 font-bold text-right">Amount (₹)</th>
                  <th className="p-4 font-bold">Payment Method & Settlement</th>
                  <th className="p-4 font-bold text-center">Status</th>
                  <th className="p-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]">
                {counterPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-[#94A3B8] font-mono space-y-2">
                      <Receipt className="w-8 h-8 mx-auto text-[#1C1C1C]" />
                      <p className="font-bold text-sm text-white">No Ticketing Transactions Found Today</p>
                      <p className="text-xs text-[#94A3B8]">
                        Only current day Cash and UPI ticketing sales are displayed here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  counterPayments.map(p => (
                    <tr key={p.id} className="hover:bg-[#1C1C1C]/40 transition-colors">
                      {/* 1. Time */}
                      <td className="p-4 text-[#94A3B8] font-mono whitespace-nowrap">
                        <div className="text-white font-bold">
                          {new Date(p.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-[#94A3B8] flex items-center gap-1 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-bold">Today</span>
                        </div>
                      </td>

                      {/* 2. Booking / Ticket ID */}
                      <td className="p-4 font-mono">
                        <div>
                          <div className="font-bold text-[#3E8EDE] flex items-center gap-1">
                            {p.bookingId}
                          </div>
                          <div className="text-[10px] text-[#00ABAB] font-semibold mt-0.5 flex items-center gap-1">
                            <Ticket className="w-3 h-3" />
                            <span>{p.ticketId || `tkt-${p.bookingId?.slice(-6) || ''}`}</span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Guest Info */}
                      <td className="p-4">
                        <p className="font-bold text-white text-xs">{p.customerName || 'Walk-in Guest'}</p>
                        <p className="text-[10px] text-[#94A3B8] font-mono">{p.customerPhone || p.customer_id || 'Counter'}</p>
                      </td>

                      {/* 4. Activity & Package */}
                      <td className="p-4 max-w-xs">
                        <div className="text-white font-semibold text-xs">{p.activityName || 'Adventure Sport'}</div>
                        {p.packageName && (
                          <div className="text-[10px] text-[#94A3B8] font-mono">{p.packageName}</div>
                        )}
                      </td>

                      {/* 5. Amount */}
                      <td className="p-4 text-right font-mono font-extrabold text-white text-sm whitespace-nowrap">
                        ₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 6. Payment Method & Settlement */}
                      <td className="p-4 font-mono text-xs">
                        {p.method === 'cash' ? (
                          <div className="space-y-1 bg-emerald-950/20 border border-emerald-500/20 p-2 rounded-xl">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                              <Banknote className="w-3.5 h-3.5" />
                              <span>CASH RECEIVED</span>
                            </div>
                            <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                              <div className="flex justify-between gap-2">
                                <span>Cash Tendered:</span>
                                <span className="text-white font-bold">
                                  ₹{p.amountReceived != null ? p.amountReceived.toFixed(2) : p.amount.toFixed(2)}
                                </span>
                              </div>
                              {p.changeGiven != null && p.changeGiven > 0 ? (
                                <div className="flex justify-between gap-2 text-amber-400 font-bold">
                                  <span>Change Given:</span>
                                  <span>₹{p.changeGiven.toFixed(2)}</span>
                                </div>
                              ) : (
                                <div className="text-[9px] text-slate-500">Exact Cash (₹0 Change)</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 bg-violet-950/20 border border-violet-500/20 p-2 rounded-xl">
                            <div className="flex items-center gap-1.5 font-bold text-violet-400">
                              {p.method === 'qrcode' ? <QrCode className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                              <span>UPI {p.method === 'qrcode' ? 'QR SCAN' : 'COLLECT'}</span>
                            </div>
                            <div className="text-[10px] text-[#94A3B8] space-y-0.5">
                              <div className="truncate max-w-[220px]" title={counterUpiId || 'deucepark@upi'}>
                                UPI VPA: <strong className="text-[#40E0D0] font-mono">{counterUpiId || 'deucepark@upi'}</strong>
                              </div>
                              <div className="text-[9px] text-slate-400 truncate max-w-[220px]" title={p.transactionId || p.referenceNumber || 'Approved'}>
                                Txn/UTR: <span className="text-white font-bold">{p.transactionId || p.referenceNumber || 'Counter Verified'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 7. Status */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black font-mono uppercase tracking-wider inline-block ${
                          p.status === 'paid' || p.status === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          p.status === 'refunded' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          p.status === 'cancelled' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {p.status === 'refunded' ? '🛑 REFUNDED' : p.status === 'cancelled' ? '🛑 CANCELLED' : 'PAID'}
                        </span>
                      </td>

                      {/* 8. Action */}
                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handlePrintReceipt(p)}
                            className="p-2 bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer border border-[#1C1C1C] hover:border-[#00ABAB]"
                            title="Print Activity Ticket"
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
                    CANCEL & REFUND
                  </h3>
                  <p className="text-[10px] font-mono text-rose-400">
                    Ref: {selectedRefundPayment.bookingId || selectedRefundPayment.orderId} · ID: {selectedRefundPayment.ticketId || selectedRefundPayment.id}
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
                <span className="text-slate-400">Item:</span>
                <span className="text-[#14F1D9] font-bold">{selectedRefundPayment.activityName || 'Adventure Pass / Order'}</span>
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
                  <option value="Food Order Cancelled">Food Order Cancelled / Modified</option>
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
              <span>This ticket/order will be permanently marked cancelled and cannot be scanned at check-in.</span>
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
