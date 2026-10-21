import React, { useState } from 'react';
import { 
  Ticket, Users, CreditCard, CheckCircle, Smartphone, Printer, Search, FileText, Banknote, 
  Utensils, Plus, Minus, ShoppingBag, Trash2, ArrowRight, XCircle, RotateCcw, AlertTriangle, 
  Check, X, QrCode, Calendar, TrendingUp, Clock, Coins, Receipt, Wallet, ArrowUpRight,
  Flame, Store, Coffee, ChevronRight, Layers, Tag, Edit, Eye, Filter, Package, Upload,
  Sparkles, RefreshCw
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Activity, Payment, FoodOrder, MenuItem } from '../types';
import { UnifiedTicketingFlow } from './UnifiedTicketingFlow';
import { printTicket } from '../lib/printTicket';
import { BulkAddMenuModal } from './BulkAddMenuModal';
import { FoodStreetInventoryPanel } from './admin/FoodStreetInventoryPanel';
import { compressImageFile } from '../lib/imageUtils';

export const TicketingDashboard: React.FC = () => {
  const { 
    activities, currentUser, payments, orders, menuItems, vendors, inventory,
    foodCart, addToFoodCart, removeFromFoodCart, clearFoodCart, submitFoodOrder,
    addMenuItem, updateMenuItem, deleteMenuItem, adjustMenuItemStock, updateMenuItemStock,
    cancelAndRefundTicket, counterUpiId
  } = useAppContext();

  // Active top-level subtab
  const [activeSubTab, setActiveSubTab] = useState<'new_booking' | 'cafe_pos' | 'cafe_menu' | 'history'>('new_booking');
  
  // ── 1. Activity Booking State ───────────────────────────────────────────
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Visible activities excluding legacy gaming/arena
  const visibleActivities = activities.filter(a => 
    a.isActive !== false && 
    !a.id.toLowerCase().includes('gaming') && 
    !(a.type as string)?.toLowerCase().includes('gaming') && 
    !a.name?.toLowerCase().includes('gaming') && 
    !a.name?.toLowerCase().includes('arena')
  );

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

  // ── 2. Cafe POS State ───────────────────────────────────────────────────
  const [foodSearch, setFoodSearch] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [foodCustomerName, setFoodCustomerName] = useState('Walk-in Guest');
  const [foodCustomerPhone, setFoodCustomerPhone] = useState('');
  const [foodPaymentMethod, setFoodPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [isSubmittingFood, setIsSubmittingFood] = useState(false);
  const [generatedBillOrder, setGeneratedBillOrder] = useState<FoodOrder | null>(null);

  // ── 3. Cafe Menu & Inventory State ──────────────────────────────────────
  const [cafeMenuSubTab, setCafeMenuSubTab] = useState<'catalog' | 'inventory'>('catalog');
  const [menuCatalogSearch, setMenuCatalogSearch] = useState('');
  const [menuCatalogVendorFilter, setMenuCatalogVendorFilter] = useState('all');
  const [menuCatalogCategoryFilter, setMenuCatalogCategoryFilter] = useState('all');
  const [menuCatalogViewMode, setMenuCatalogViewMode] = useState<'table' | 'cards'>('table');
  const [isBulkMenuModalOpen, setIsBulkMenuModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: 50,
    purchasePrice: 30,
    category: 'Beverages',
    vendorId: vendors[0]?.id || 'vendor-forest-cafe',
    image: '',
    stockQuantity: 50,
    isAvailable: true
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // ── 5. Sales History & Refund State ─────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'upi'>('all');
  const [selectedRefundPayment, setSelectedRefundPayment] = useState<Payment | null>(null);
  const [refundReason, setRefundReason] = useState<string>('Customer Cancellation Request');
  const [customRefundReason, setCustomRefundReason] = useState<string>('');
  const [refundAmountInput, setRefundAmountInput] = useState<string>('');
  const [refundMethodInput, setRefundMethodInput] = useState<'cash' | 'upi' | 'card' | 'original'>('cash');
  const [isRefunding, setIsRefunding] = useState<boolean>(false);
  const [refundNotice, setRefundNotice] = useState<string | null>(null);
  const [refundSuccessReceipt, setRefundSuccessReceipt] = useState<any | null>(null);

  // Available food categories from existing menu items
  const availableCategories = Array.from(new Set(menuItems.map(m => m.category).filter(Boolean)));
  const allCategoryOptions = availableCategories.length > 0 
    ? availableCategories 
    : ['Beverages', 'Wood-Fired Pizza', 'Smash Burgers', 'Starters & Sides', 'Desserts & Shakes', 'Snacks & Fast Food', 'Main Course', 'Combos & Offers'];

  // Helper date checker
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

  // ── Cafe POS Order Process ──────────────────────────────────────────────
  const handleProcessFoodOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (foodCart.length === 0 || isSubmittingFood) return;
    setIsSubmittingFood(true);
    try {
      const order = submitFoodOrder({
        customerName: foodCustomerName || 'Walk-in Guest',
        customerEmail: 'counter@deucepark.com',
        customerPhone: foodCustomerPhone || undefined,
        paymentMethod: foodPaymentMethod
      });

      setGeneratedBillOrder(order);

      // Auto-trigger print
      printTicket({
        receiptId: order.invoiceNumber || order.id,
        tokenNumber: order.tokenNumber || order.id,
        activityName: 'DEUCE CAFE & FOOD STREET',
        packageName: 'Food Street Dining',
        customerName: foodCustomerName || 'Walk-in Guest',
        customerPhone: foodCustomerPhone || undefined,
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
      setFoodCustomerPhone('');
      setFoodCustomerName('Walk-in Guest');
    } catch (err: any) {
      alert(err.message || 'Failed to submit food order.');
    } finally {
      setIsSubmittingFood(false);
    }
  };

  // ── Save or Update Menu Item Modal ──────────────────────────────────────
  const handleSaveMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuForm.name.trim()) return alert('Item name is required');

    if (editingMenuItem) {
      updateMenuItem({
        ...editingMenuItem,
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
        purchasePrice: Number(menuForm.purchasePrice || 0),
        category: menuForm.category,
        vendorId: menuForm.vendorId,
        image: menuForm.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        stockQuantity: Number(menuForm.stockQuantity || 0),
        isAvailable: menuForm.isAvailable
      });
    } else {
      addMenuItem({
        name: menuForm.name,
        description: menuForm.description,
        price: Number(menuForm.price),
        purchasePrice: Number(menuForm.purchasePrice || 0),
        category: menuForm.category,
        vendorId: menuForm.vendorId,
        image: menuForm.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
        stockQuantity: Number(menuForm.stockQuantity || 0),
        isAvailable: menuForm.isAvailable
      });
    }

    setIsMenuModalOpen(false);
    setEditingMenuItem(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const compressed = await compressImageFile(file, 800, 800, 0.7);
      setMenuForm(prev => ({ ...prev, image: compressed }));
    } catch (err) {
      console.error('Image compression failed:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // ── Unified Deduplicated Payments Base ──────────────────────────────────
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

  // Current Day All Paid Transactions (Activities + Cafe Combined)
  const todayPaidCounterList = allConsolidatedPayments.filter(p => {
    const isPaid = p.status === 'paid' || p.status === 'success' || p.payment_status === 'PAID';
    return isPaid && isDateToday(p.timestamp || p.created_at);
  });

  const todayActivityPaidList = todayPaidCounterList.filter(p => {
    const isFood = Boolean(
      p.orderId || 
      p.activityName === 'Food Street Dining' || 
      p.activityName?.toLowerCase().includes('food') || 
      p.activityName?.toLowerCase().includes('cafe') || 
      p.activityName?.toLowerCase().includes('dining')
    );
    return !isFood;
  });

  const todayFoodPaidList = todayPaidCounterList.filter(p => {
    return Boolean(
      p.orderId || 
      p.activityName === 'Food Street Dining' || 
      p.activityName?.toLowerCase().includes('food') || 
      p.activityName?.toLowerCase().includes('cafe') || 
      p.activityName?.toLowerCase().includes('dining')
    );
  });

  const todayActivityRevenue = todayActivityPaidList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const todayFoodRevenue = todayFoodPaidList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const todayCombinedTotalRevenue = todayActivityRevenue + todayFoodRevenue;

  // Breakdown for Ticketing
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

  // Filtered transactions for the Current Day Table
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

  // Print receipt router
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
        activityName: 'DEUCE CAFE & FOOD STREET',
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
    setRefundNotice(null);

    const result = cancelAndRefundTicket(
      selectedRefundPayment.id,
      finalReason,
      refundMethodInput,
      refAmt
    );

    setIsRefunding(false);

    if (result.success) {
      setRefundSuccessReceipt(result.receipt);
      setRefundNotice(`Refund of ₹${refAmt} processed successfully via ${refundMethodInput.toUpperCase()}.`);
    } else {
      alert(result.message || 'Refund failed to process.');
    }
  };

  // Filtered menu items for POS
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(foodSearch.toLowerCase()) || 
                          item.category.toLowerCase().includes(foodSearch.toLowerCase());
    const matchesVendor = selectedVendorId === 'all' || item.vendorId === selectedVendorId;
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesVendor && matchesCategory && item.isAvailable;
  });


  // ── RENDER CHECKOUT OVERLAY IF TICKETING CHECKOUT OPEN ──────────────────
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
            className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" /> Close & Return
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <UnifiedTicketingFlow 
            activities={selectedActivities} 
            onCancel={() => setIsCheckoutOpen(false)} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Top Main Navigation Tabs */}
      <div className="flex border-b border-[#1C1C1C] gap-2 overflow-x-auto pb-1">
        <button 
          onClick={() => setActiveSubTab('new_booking')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'new_booking' 
              ? 'border-[#00ABAB] text-[#00ABAB] bg-white/5 rounded-t-xl' 
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <Ticket className="w-4 h-4" /> Activity Ticketing POS
        </button>

        <button 
          onClick={() => setActiveSubTab('cafe_pos')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'cafe_pos' 
              ? 'border-[#00ABAB] text-[#00ABAB] bg-white/5 rounded-t-xl' 
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <Coffee className="w-4 h-4 text-[#14F1D9]" /> Cafe & Food Street POS
          {foodCart.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#14F1D9] text-[#0A0A0A] text-xs font-black">
              {foodCart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>


        <button 
          onClick={() => setActiveSubTab('cafe_menu')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'cafe_menu' 
              ? 'border-[#00ABAB] text-[#00ABAB] bg-white/5 rounded-t-xl' 
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <Store className="w-4 h-4 text-emerald-400" /> Cafe Menu & Inventory
        </button>

        <button 
          onClick={() => setActiveSubTab('history')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeSubTab === 'history' 
              ? 'border-[#00ABAB] text-[#00ABAB] bg-white/5 rounded-t-xl' 
              : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" /> Today's Sales ({todayTotalCount})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 1. ACTIVITY TICKETING POS SUBTAB                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'new_booking' && (
        <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30 animate-fade-in space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Ticket className="w-6 h-6 text-[#00ABAB]" /> Select Park Activities to Book
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Multi-select one or multiple activities to generate synchronized passes or bundle passes.
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={selectAll}
                className="flex-1 sm:flex-none px-4 py-2 border border-[#00ABAB] text-[#00ABAB] rounded-xl font-bold text-xs hover:bg-[#00ABAB]/10 transition-colors cursor-pointer"
              >
                {selectedActivities.length === visibleActivities.length ? 'Deselect All' : 'Select All Package'}
              </button>
              <button 
                onClick={() => setIsCheckoutOpen(true)}
                disabled={selectedActivities.length === 0}
                className="flex-1 sm:flex-none px-6 py-2.5 bg-[#00ABAB] text-black rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#00ABAB]/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_20px_rgba(0,171,171,0.3)]"
              >
                Proceed to Checkout ({selectedActivities.length})
              </button>
            </div>
          </div>

          {/* Quick link banner to Cafe POS */}
          <div className="p-3.5 bg-gradient-to-r from-teal-950/40 via-[#0A0A0A] to-amber-950/20 border border-[#00ABAB]/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/30">
                <Coffee className="w-5 h-5" />
              </span>
              <div>
                <p className="text-xs font-bold text-white">Guest wants snacks, beverages, or meals?</p>
                <p className="text-[10px] text-[#94A3B8]">Food & Cafe POS is integrated right into your counter terminal.</p>
              </div>
            </div>
            <button
              onClick={() => setActiveSubTab('cafe_pos')}
              className="px-4 py-1.5 bg-[#14F1D9] text-[#0A0A0A] rounded-xl font-black text-xs uppercase tracking-wider hover:bg-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Utensils className="w-3.5 h-3.5" /> Open Cafe POS Terminal <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleActivities.map(act => {
              const isSelected = selectedActivities.some(a => a.id === act.id);
              return (
                <div 
                  key={act.id} 
                  onClick={() => toggleActivity(act)}
                  className={`bg-[#0A0A0A] p-6 rounded-2xl border transition-all cursor-pointer group relative ${
                    isSelected ? 'border-[#00ABAB] ring-2 ring-[#00ABAB]/40 shadow-[0_0_25px_rgba(0,171,171,0.2)]' : 'border-[#1C1C1C] hover:border-[#00ABAB]/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-[#00ABAB] text-black rounded-full p-1 z-10 shadow-lg">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                  <div className="h-36 rounded-xl overflow-hidden mb-4 border border-[#1C1C1C] relative">
                    <img src={act.image} alt={act.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {isSelected && <div className="absolute inset-0 bg-[#00ABAB]/20" />}
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#40E0D0] transition-colors">{act.name}</h3>
                  <p className="text-xs text-[#94A3B8] line-clamp-2 mt-1">{act.description}</p>
                  <div className="text-sm mt-3 font-mono pt-3 border-t border-[#1C1C1C]">
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

          {/* Today's Combined Counter Summary */}
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
                    Combined Activities & Food Street Total: <strong className="text-[#40E0D0]">₹{todayCombinedTotalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveSubTab('history')}
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
                  <span className="text-xs text-[#94A3B8]">Cafe & Food Sales:</span>
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
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 2. CAFE & FOOD STREET POS TERMINAL                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'cafe_pos' && (
        <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30 space-y-6 animate-fade-in">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* LEFT COLUMN: FOOD ITEMS CATALOG */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <Coffee className="w-5 h-5 text-[#14F1D9]" /> Cafe & Food Street POS Counter
                  </h2>
                  <p className="text-xs text-[#94A3B8]">Select items to bill, track live inventory, and generate receipts with 5% GST.</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  <div className="relative flex-1 sm:w-48 min-w-[140px]">
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search dish or drink..."
                      value={foodSearch}
                      onChange={e => setFoodSearch(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-[#94A3B8] focus:border-[#00ABAB] focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedVendorId}
                    onChange={e => setSelectedVendorId(e.target.value)}
                    className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl py-2 px-3 text-xs text-white focus:border-[#00ABAB] focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="all">All Food Outlets</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#14F1D9] text-[#0A0A0A]'
                      : 'bg-[#0A0A0A] text-[#94A3B8] border border-[#1C1C1C] hover:text-white'
                  }`}
                >
                  All Categories ({menuItems.length})
                </button>
                {allCategoryOptions.map(cat => {
                  const count = menuItems.filter(m => m.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#14F1D9] text-[#0A0A0A]'
                          : 'bg-[#0A0A0A] text-[#94A3B8] border border-[#1C1C1C] hover:text-white'
                      }`}
                    >
                      {cat} {count > 0 && `(${count})`}
                    </button>
                  );
                })}
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[560px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredMenuItems.length === 0 ? (
                  <div className="col-span-2 py-16 text-center text-[#94A3B8] bg-[#0A0A0A]/60 rounded-2xl border border-dashed border-[#1C1C1C] space-y-3">
                    <Coffee className="w-10 h-10 mx-auto text-[#1C1C1C]" />
                    <p className="text-xs">No menu items match your search or filter.</p>
                    <button
                      onClick={() => {
                        setEditingMenuItem(null);
                        setMenuForm({
                          name: '',
                          description: '',
                          price: 50,
                          purchasePrice: 30,
                          category: 'Beverages',
                          vendorId: vendors[0]?.id || 'vendor-forest-cafe',
                          image: '',
                          stockQuantity: 50,
                          isAvailable: true
                        });
                        setIsMenuModalOpen(true);
                      }}
                      className="px-4 py-2 bg-[#00ABAB] text-black font-bold text-xs rounded-xl hover:bg-white transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" /> Add New Item to Menu
                    </button>
                  </div>
                ) : (
                  filteredMenuItems.map(item => {
                    const vendor = vendors.find(v => v.id === item.vendorId);
                    const stockQty = item.stockQuantity ?? 50;
                    const isOutOfStock = stockQty <= 0 || !item.isAvailable;
                    const inCartItem = foodCart.find(c => c.menuItemId === item.id);

                    return (
                      <div 
                        key={item.id} 
                        className={`p-3 bg-[#0A0A0A] border rounded-xl flex gap-3 transition-all group ${
                          inCartItem ? 'border-[#14F1D9]/60 shadow-[0_0_15px_rgba(20,241,217,0.15)]' : 'border-[#1C1C1C] hover:border-[#00ABAB]/50'
                        }`}
                      >
                        <img 
                          src={item.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80'} 
                          alt={item.name} 
                          className="w-20 h-20 rounded-lg object-cover border border-[#1C1C1C]" 
                        />
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] uppercase font-mono font-bold text-[#00ABAB] bg-[#1C1C1C] px-1.5 py-0.5 rounded truncate mr-1">
                                {vendor?.name || 'Cafe Stall'}
                              </span>
                              <span className="font-mono text-sm font-black text-white">₹{item.price.toFixed(2)}</span>
                            </div>
                            <h4 className="font-bold text-xs text-white truncate mt-1">{item.name}</h4>
                            <p className="text-[10px] text-[#94A3B8] line-clamp-1 mt-0.5">{item.description}</p>
                            
                            {/* Stock Indicator and Quick Adjust */}
                            <div className="mt-1 flex items-center justify-between">
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded inline-block ${
                                stockQty > 10 
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                  : stockQty > 0 
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' 
                                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              }`}>
                                {stockQty > 0 ? `📦 Stock: ${stockQty}` : '🔴 Out of Stock'}
                              </span>

                              {/* Direct stock adjuster */}
                              <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    adjustMenuItemStock(item.id, -1);
                                  }}
                                  className="w-5 h-5 rounded bg-white/5 hover:bg-rose-500/20 text-[#94A3B8] hover:text-rose-400 text-[10px] font-bold flex items-center justify-center cursor-pointer"
                                  title="Reduce stock by 1"
                                >
                                  -
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    adjustMenuItemStock(item.id, 1);
                                  }}
                                  className="w-5 h-5 rounded bg-white/5 hover:bg-emerald-500/20 text-[#94A3B8] hover:text-emerald-400 text-[10px] font-bold flex items-center justify-center cursor-pointer"
                                  title="Add 1 to stock"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-end gap-2">
                            {inCartItem ? (
                              <div className="flex items-center gap-1.5 bg-[#14F1D9]/15 border border-[#14F1D9]/40 rounded-lg px-2 py-0.5">
                                <button
                                  onClick={() => removeFromFoodCart(item.id)}
                                  className="text-[#14F1D9] hover:text-rose-400 p-0.5"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-mono text-xs font-black text-white px-1">{inCartItem.quantity}</span>
                                <button
                                  onClick={() => addToFoodCart(item, 1)}
                                  disabled={isOutOfStock}
                                  className="text-[#14F1D9] hover:text-white p-0.5"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToFoodCart(item, 1)}
                                disabled={isOutOfStock}
                                className="px-3 py-1 rounded-lg bg-[#00ABAB]/10 hover:bg-[#00ABAB] text-[#00ABAB] hover:text-black font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-all border border-[#00ABAB]/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Plus className="h-3 w-3" /> {isOutOfStock ? 'Sold Out' : 'Add to Bill'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
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
                      Clear Cart
                    </button>
                  )}
                </div>

                {foodCart.length === 0 ? (
                  <div className="py-12 text-center text-[#94A3B8] text-xs space-y-2">
                    <ShoppingBag className="w-8 h-8 mx-auto text-[#1C1C1C]" />
                    <p>No food or drink items added to bill.</p>
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
                          <button
                            onClick={() => removeFromFoodCart(cartItem.menuItemId)}
                            className="text-[#94A3B8] hover:text-white p-0.5 rounded bg-white/5"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="font-mono text-[#00ABAB] font-bold px-1">{cartItem.quantity}</span>
                          <button
                            onClick={() => {
                              const itm = menuItems.find(m => m.id === cartItem.menuItemId);
                              if (itm) addToFoodCart(itm, 1);
                            }}
                            className="text-[#94A3B8] hover:text-white p-0.5 rounded bg-white/5"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <span className="font-mono font-bold text-white ml-1">₹{(cartItem.price * cartItem.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form & Settlement */}
              <form onSubmit={handleProcessFoodOrder} className="space-y-3 pt-3 border-t border-[#1C1C1C]">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Guest Name</label>
                    <input
                      type="text"
                      value={foodCustomerName}
                      onChange={e => setFoodCustomerName(e.target.value)}
                      placeholder="Walk-in Guest"
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00ABAB]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Mobile No (Optional)</label>
                    <input
                      type="tel"
                      value={foodCustomerPhone}
                      onChange={e => setFoodCustomerPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-[#1C1C1C] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#00ABAB] font-mono"
                    />
                  </div>
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
                  className="w-full py-3 rounded-xl bg-[#00ABAB] hover:bg-[#00ABAB]/80 text-black font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_20px_rgba(0,171,171,0.25)] flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  {isSubmittingFood ? 'Processing Bill...' : 'Charge & Print Thermal Receipt'}
                </button>
              </form>
            </div>

          </div>
        </div>
      )}


      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 4. CAFE MENU & INVENTORY MANAGEMENT SUBTAB                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'cafe_menu' && (
        <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30 space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Store className="w-6 h-6 text-emerald-400" /> Cafe Menu Catalog & Inventory Management
              </h2>
              <p className="text-xs text-[#94A3B8]">
                Add dishes, adjust live stock counters, configure prices, and review raw materials.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsBulkMenuModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black rounded-xl transition-all cursor-pointer shadow-lg"
              >
                <Plus className="h-4 w-4" /> ⚡ Bulk Add Menu Items
              </button>
              <button
                onClick={() => {
                  setEditingMenuItem(null);
                  setMenuForm({
                    name: '',
                    description: '',
                    price: 50,
                    purchasePrice: 30,
                    category: 'Beverages',
                    vendorId: vendors[0]?.id || 'vendor-forest-cafe',
                    image: '',
                    stockQuantity: 50,
                    isAvailable: true
                  });
                  setIsMenuModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#00ABAB] hover:bg-[#00ABAB]/80 text-black rounded-xl transition-all cursor-pointer shadow-lg"
              >
                <Plus className="h-4 w-4" /> + Add Dish
              </button>
            </div>
          </div>

          {/* Sub-tabs for Catalog vs Raw Inventory */}
          <div className="flex border-b border-[#1C1C1C] gap-4">
            <button
              onClick={() => setCafeMenuSubTab('catalog')}
              className={`pb-2.5 font-bold text-xs transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                cafeMenuSubTab === 'catalog' ? 'border-[#14F1D9] text-[#14F1D9]' : 'border-transparent text-[#94A3B8] hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" /> Dish & Beverage Catalog ({menuItems.length})
            </button>
            <button
              onClick={() => setCafeMenuSubTab('inventory')}
              className={`pb-2.5 font-bold text-xs transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                cafeMenuSubTab === 'inventory' ? 'border-[#14F1D9] text-[#14F1D9]' : 'border-transparent text-[#94A3B8] hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" /> Raw Materials & Stock Management
            </button>
          </div>

          {cafeMenuSubTab === 'catalog' ? (
            <div className="space-y-4">
              {/* Search and Filters */}
              <div className="glass-panel border border-[#00ABAB]/30 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={menuCatalogSearch}
                    onChange={e => setMenuCatalogSearch(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-[#14F1D9]"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={menuCatalogVendorFilter}
                    onChange={e => setMenuCatalogVendorFilter(e.target.value)}
                    className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-lg px-2.5 py-1.5 text-white focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="all">All Outlets</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>

                  <select
                    value={menuCatalogCategoryFilter}
                    onChange={e => setMenuCatalogCategoryFilter(e.target.value)}
                    className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-lg px-2.5 py-1.5 text-white focus:outline-none font-mono cursor-pointer"
                  >
                    <option value="all">All Categories</option>
                    {allCategoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <div className="flex border border-[#1C1C1C] rounded-lg overflow-hidden">
                    <button
                      onClick={() => setMenuCatalogViewMode('table')}
                      className={`px-3 py-1 text-xs font-bold cursor-pointer ${
                        menuCatalogViewMode === 'table' ? 'bg-[#00ABAB] text-black' : 'bg-[#0A0A0A] text-white'
                      }`}
                    >
                      Table
                    </button>
                    <button
                      onClick={() => setMenuCatalogViewMode('cards')}
                      className={`px-3 py-1 text-xs font-bold cursor-pointer ${
                        menuCatalogViewMode === 'cards' ? 'bg-[#00ABAB] text-black' : 'bg-[#0A0A0A] text-white'
                      }`}
                    >
                      Cards
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Display */}
              {(() => {
                const catalogItems = menuItems.filter(item => {
                  const matchesSearch = item.name.toLowerCase().includes(menuCatalogSearch.toLowerCase()) ||
                                        item.category.toLowerCase().includes(menuCatalogSearch.toLowerCase()) ||
                                        item.description.toLowerCase().includes(menuCatalogSearch.toLowerCase());
                  const matchesVendor = menuCatalogVendorFilter === 'all' || item.vendorId === menuCatalogVendorFilter;
                  const matchesCat = menuCatalogCategoryFilter === 'all' || item.category === menuCatalogCategoryFilter;
                  return matchesSearch && matchesVendor && matchesCat;
                });

                if (menuCatalogViewMode === 'table') {
                  return (
                    <div className="border border-[#1C1C1C] rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-[#0A0A0A] border-b border-[#1C1C1C] text-[#94A3B8] font-mono font-bold">
                              <th className="p-3">Dish / Item</th>
                              <th className="p-3">Stall / Outlet</th>
                              <th className="p-3">Category</th>
                              <th className="p-3">Selling Price</th>
                              <th className="p-3">Stock Counter</th>
                              <th className="p-3">Status</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1C1C1C] bg-[#0A0A0A]/50">
                            {catalogItems.map(item => {
                              const vendor = vendors.find(v => v.id === item.vendorId);
                              const stockQty = item.stockQuantity ?? 50;

                              return (
                                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                  <td className="p-3 flex items-center gap-3">
                                    <img 
                                      src={item.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80'} 
                                      alt={item.name} 
                                      className="w-10 h-10 rounded-lg object-cover border border-[#1C1C1C]" 
                                    />
                                    <div>
                                      <p className="font-bold text-white">{item.name}</p>
                                      <p className="text-[10px] text-[#94A3B8] line-clamp-1">{item.description}</p>
                                    </div>
                                  </td>
                                  <td className="p-3 font-mono text-[#94A3B8]">{vendor?.name || 'Stall'}</td>
                                  <td className="p-3 font-mono text-[#14F1D9]">{item.category}</td>
                                  <td className="p-3 font-mono font-black text-white">₹{item.price.toFixed(2)}</td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => adjustMenuItemStock(item.id, -1)}
                                        className="w-6 h-6 rounded bg-white/5 hover:bg-rose-500/20 text-[#94A3B8] hover:text-rose-400 font-bold flex items-center justify-center cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                                        stockQty > 10 ? 'text-emerald-400 bg-emerald-500/10' :
                                        stockQty > 0 ? 'text-amber-400 bg-amber-500/10' :
                                        'text-rose-400 bg-rose-500/10'
                                      }`}>
                                        {stockQty}
                                      </span>
                                      <button
                                        onClick={() => adjustMenuItemStock(item.id, 1)}
                                        className="w-6 h-6 rounded bg-white/5 hover:bg-emerald-500/20 text-[#94A3B8] hover:text-emerald-400 font-bold flex items-center justify-center cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <button
                                      onClick={() => updateMenuItem({ ...item, isAvailable: !item.isAvailable })}
                                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold cursor-pointer transition-all ${
                                        item.isAvailable 
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                      }`}
                                    >
                                      {item.isAvailable ? '✓ Available' : '✕ Disabled'}
                                    </button>
                                  </td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          setEditingMenuItem(item);
                                          setMenuForm({
                                            name: item.name,
                                            description: item.description,
                                            price: item.price,
                                            purchasePrice: item.purchasePrice || Math.round(item.price * 0.6),
                                            category: item.category,
                                            vendorId: item.vendorId,
                                            image: item.image,
                                            stockQuantity: item.stockQuantity || 50,
                                            isAvailable: item.isAvailable
                                          });
                                          setIsMenuModalOpen(true);
                                        }}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-[#14F1D9]/20 text-[#94A3B8] hover:text-[#14F1D9] transition-colors cursor-pointer"
                                        title="Edit Item"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (confirm(`Are you sure you want to delete ${item.name}?`)) {
                                            deleteMenuItem(item.id);
                                          }
                                        }}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-[#94A3B8] hover:text-rose-400 transition-colors cursor-pointer"
                                        title="Delete Item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {catalogItems.map(item => (
                      <div key={item.id} className="bg-[#0A0A0A] border border-[#1C1C1C] rounded-2xl p-4 flex flex-col justify-between space-y-3 group hover:border-[#14F1D9]/40 transition-all">
                        <div className="h-32 rounded-xl overflow-hidden border border-[#1C1C1C] relative">
                          <img 
                            src={item.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80'} 
                            alt={item.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-black/80 text-white border border-white/10">
                            {item.category}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                          <p className="text-[10px] text-[#94A3B8] line-clamp-1 mt-0.5">{item.description}</p>
                          <div className="flex justify-between items-center mt-2">
                            <span className="font-mono font-black text-base text-[#14F1D9]">₹{item.price.toFixed(2)}</span>
                            <span className="font-mono text-xs text-[#94A3B8]">Stock: {item.stockQuantity ?? 50}</span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-[#1C1C1C] flex justify-between items-center">
                          <button
                            onClick={() => updateMenuItem({ ...item, isAvailable: !item.isAvailable })}
                            className={`text-[10px] font-mono font-bold cursor-pointer ${
                              item.isAvailable ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {item.isAvailable ? '✓ Available' : '✕ Disabled'}
                          </button>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => {
                                setEditingMenuItem(item);
                                setMenuForm({
                                  name: item.name,
                                  description: item.description,
                                  price: item.price,
                                  purchasePrice: item.purchasePrice || Math.round(item.price * 0.6),
                                  category: item.category,
                                  vendorId: item.vendorId,
                                  image: item.image,
                                  stockQuantity: item.stockQuantity || 50,
                                  isAvailable: item.isAvailable
                                });
                                setIsMenuModalOpen(true);
                              }}
                              className="p-1 rounded bg-white/5 hover:bg-[#14F1D9]/20 text-[#94A3B8] hover:text-[#14F1D9]"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete ${item.name}?`)) deleteMenuItem(item.id);
                              }}
                              className="p-1 rounded bg-white/5 hover:bg-rose-500/20 text-[#94A3B8] hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : (
            <FoodStreetInventoryPanel isSubAdminPortal={true} />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* 5. CURRENT DAY TRANSACTIONS & SALES DASHBOARD                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'history' && (
        <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30 space-y-6 animate-fade-in">
          
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
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Live settlement ledger for counter receipts, Cash vs UPI breakdown, thermal reprints, and cancellation audits.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-64 min-w-[200px]">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search receipt, phone, name..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-[#94A3B8] focus:border-[#00ABAB] focus:outline-none font-mono"
                />
              </div>

              <div className="flex bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl p-1 gap-1">
                <button
                  onClick={() => setMethodFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all cursor-pointer ${
                    methodFilter === 'all' ? 'bg-[#00ABAB] text-black' : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  All ({todayTotalCount})
                </button>
                <button
                  onClick={() => setMethodFilter('cash')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all cursor-pointer flex items-center gap-1 ${
                    methodFilter === 'cash' ? 'bg-emerald-500 text-black' : 'text-emerald-400 hover:text-white'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" /> Cash ({todayCashCount})
                </button>
                <button
                  onClick={() => setMethodFilter('upi')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono uppercase transition-all cursor-pointer flex items-center gap-1 ${
                    methodFilter === 'upi' ? 'bg-violet-500 text-white' : 'text-violet-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" /> UPI ({todayUpiCount})
                </button>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0A0A0A] to-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">Today's Cash Collection</span>
                <span className="text-2xl font-black font-mono text-emerald-400">₹{todayCashRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{todayCashCount} physical cash bills</div>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <Banknote className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0A0A0A] to-violet-950/20 border border-violet-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-violet-400 font-bold block">Today's UPI Dynamic QR</span>
                <span className="text-2xl font-black font-mono text-violet-400">₹{todayUpiRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{todayUpiCount} bank app transactions</div>
              </div>
              <div className="p-3 bg-violet-500/10 rounded-2xl text-violet-400">
                <Smartphone className="w-6 h-6" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0A0A0A] to-teal-950/20 border border-[#00ABAB]/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#40E0D0] font-bold block">Total Today's Ticketing</span>
                <span className="text-2xl font-black font-mono text-[#00ABAB]">₹{todayTotalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <div className="text-[10px] text-[#94A3B8] font-mono mt-0.5">{todayTotalCount} total settled orders</div>
              </div>
              <div className="p-3 bg-[#00ABAB]/10 rounded-2xl text-[#00ABAB]">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="border border-[#1C1C1C] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0A0A0A] border-b border-[#1C1C1C] text-[#94A3B8] font-mono font-bold">
                    <th className="p-3">Time</th>
                    <th className="p-3">Receipt / Ticket #</th>
                    <th className="p-3">Guest Details</th>
                    <th className="p-3">Activity / Details</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C] bg-[#0A0A0A]/40 font-mono">
                  {counterPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-[#94A3B8]">
                        No ticketing transactions recorded for today matching the active filter.
                      </td>
                    </tr>
                  ) : (
                    counterPayments.map(p => {
                      const isCash = p.method === 'cash';
                      const isRefunded = p.status === 'refunded' || p.status === 'cancelled';

                      return (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-3 text-[#94A3B8] whitespace-nowrap">
                            {p.timestamp ? new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td className="p-3 font-bold text-white">
                            {p.ticketId || p.bookingId || p.id.slice(0, 8)}
                          </td>
                          <td className="p-3 font-sans">
                            <div className="font-bold text-white">{p.customerName || 'Walk-in Guest'}</div>
                            <div className="text-[10px] text-[#94A3B8] font-mono">{p.customerPhone || '—'}</div>
                          </td>
                          <td className="p-3 font-sans">
                            <span className="text-[#14F1D9] font-bold">{p.activityName || 'Adventure Pass'}</span>
                            {p.packageName && <span className="text-[10px] text-[#94A3B8] block">{p.packageName}</span>}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isCash ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                            }`}>
                              {p.method}
                            </span>
                          </td>
                          <td className="p-3 font-black text-white text-sm">
                            ₹{Number(p.amount).toFixed(2)}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isRefunded ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-teal-500/20 text-[#14F1D9] border border-teal-500/30'
                            }`}>
                              {isRefunded ? 'Refunded' : 'Paid'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handlePrintReceipt(p)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
                                title="Print Receipt"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {!isRefunded && (
                                <button
                                  onClick={() => handleInitiateRefund(p)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                                  title="Cancel & Refund"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: ADD / EDIT MENU ITEM                                         */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveMenuItem} className="glass-panel border border-[#00ABAB]/40 p-6 rounded-3xl max-w-lg w-full space-y-4 bg-[#0A0A0A]">
            <div className="flex justify-between items-center border-b border-[#1C1C1C] pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Store className="w-5 h-5 text-[#14F1D9]" />
                {editingMenuItem ? 'Edit Menu Dish' : 'Add New Cafe Dish'}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsMenuModalOpen(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Item / Dish Name *</label>
                <input
                  type="text"
                  required
                  value={menuForm.name}
                  onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                  placeholder="e.g. Hazelnut Cold Brew, Crispy Veg Burger"
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#14F1D9]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Short Description</label>
                <textarea
                  rows={2}
                  value={menuForm.description}
                  onChange={e => setMenuForm({ ...menuForm, description: e.target.value })}
                  placeholder="Ingredients, flavors, portion size..."
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#14F1D9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={menuForm.price}
                    onChange={e => setMenuForm({ ...menuForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#14F1D9]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Initial Stock Position</label>
                  <input
                    type="number"
                    min={0}
                    value={menuForm.stockQuantity}
                    onChange={e => setMenuForm({ ...menuForm, stockQuantity: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#14F1D9]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Category</label>
                  <select
                    value={menuForm.category}
                    onChange={e => setMenuForm({ ...menuForm, category: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none font-mono cursor-pointer"
                  >
                    {allCategoryOptions.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Stall / Outlet</label>
                  <select
                    value={menuForm.vendorId}
                    onChange={e => setMenuForm({ ...menuForm, vendorId: e.target.value })}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none font-mono cursor-pointer"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Dish Image URL or Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={menuForm.image}
                    onChange={e => setMenuForm({ ...menuForm, image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-[#1C1C1C] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-[#14F1D9]"
                  />
                  <label className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 border border-white/10">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploadingImage ? '...' : 'Upload'}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="menu-available-chk"
                  checked={menuForm.isAvailable}
                  onChange={e => setMenuForm({ ...menuForm, isAvailable: e.target.checked })}
                  className="rounded text-[#00ABAB] focus:ring-[#00ABAB] cursor-pointer"
                />
                <label htmlFor="menu-available-chk" className="text-white font-bold cursor-pointer">
                  Immediately available for billing at POS
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#1C1C1C]">
              <button
                type="button"
                onClick={() => setIsMenuModalOpen(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#00ABAB] hover:bg-[#00ABAB]/80 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
              >
                {editingMenuItem ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: GENERATED BILL RECEIPT                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {generatedBillOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-[#14F1D9]/40 relative bg-[#050816] text-center font-sans shadow-[0_0_40px_rgba(20,241,217,0.2)]">
            <CheckCircle className="w-12 h-12 text-[#14F1D9] mx-auto mb-2" />
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Food Bill Processed!</h3>
            <p className="text-xs text-[#94A3B8]">
              Token No: <span className="font-mono text-[#14F1D9] font-black text-base">#{generatedBillOrder.tokenNumber || generatedBillOrder.id.slice(-4)}</span>
            </p>

            <div className="my-4 p-4 bg-[#0B1120] border border-white/10 rounded-2xl text-left text-xs font-mono space-y-1.5">
              <div className="flex justify-between text-[#94A3B8]">
                <span>Invoice #:</span> 
                <span className="text-white font-bold">{generatedBillOrder.invoiceNumber || generatedBillOrder.id}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Time:</span> 
                <span className="text-white">{new Date(generatedBillOrder.createdAt).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>Guest:</span> 
                <span className="text-white">{generatedBillOrder.customerName}</span>
              </div>
              <div className="border-t border-white/10 my-2 pt-2 space-y-1">
                {generatedBillOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-white">
                    <span>{item.quantity}x {item.name}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-2 space-y-1 text-xs">
                <div className="flex justify-between text-[#94A3B8]">
                  <span>Subtotal:</span>
                  <span className="text-white">₹{(generatedBillOrder.subtotal != null ? generatedBillOrder.subtotal : (generatedBillOrder.totalAmount / 1.05)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#94A3B8]">
                  <span>GST (5%):</span>
                  <span className="text-[#14F1D9]">+₹{(generatedBillOrder.taxAmount != null ? generatedBillOrder.taxAmount : (generatedBillOrder.totalAmount - (generatedBillOrder.totalAmount / 1.05))).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm text-[#14F1D9] pt-1 border-t border-white/10">
                  <span>TOTAL PAID:</span>
                  <span>₹{generatedBillOrder.totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  printTicket({
                    receiptId: generatedBillOrder.invoiceNumber || generatedBillOrder.id,
                    tokenNumber: generatedBillOrder.tokenNumber || generatedBillOrder.id,
                    activityName: 'DEUCE CAFE & FOOD STREET',
                    packageName: 'Food Street Dining',
                    customerName: generatedBillOrder.customerName,
                    customerPhone: generatedBillOrder.customerPhone,
                    date: new Date(generatedBillOrder.createdAt).toISOString(),
                    slot: 'FOOD COUNTER',
                    items: generatedBillOrder.items.map(i => ({ label: `${i.quantity}x ${i.name}`, value: `₹${(i.price * i.quantity).toFixed(2)}` })),
                    subtotalAmount: generatedBillOrder.subtotal != null ? generatedBillOrder.subtotal : Math.round((generatedBillOrder.totalAmount / 1.05) * 100) / 100,
                    totalAmount: generatedBillOrder.totalAmount,
                    paymentStatus: 'paid',
                    quantity: generatedBillOrder.items.reduce((sum, item) => sum + item.quantity, 0),
                    paymentMethod: (generatedBillOrder.paymentMethod || 'CASH').toUpperCase()
                  });
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#14F1D9] text-[#050816] font-bold text-xs uppercase tracking-wider hover:bg-[#00B4FF] transition-all cursor-pointer shadow-[0_0_15px_rgba(20,241,217,0.3)] flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Thermal Print
              </button>
              <button
                type="button"
                onClick={() => setGeneratedBillOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-white/10"
              >
                Next Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: BULK ADD MENU ITEMS                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <BulkAddMenuModal
        isOpen={isBulkMenuModalOpen}
        onClose={() => setIsBulkMenuModalOpen(false)}
        defaultVendorId={selectedVendorId !== 'all' ? selectedVendorId : vendors[0]?.id}
      />

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: REFUND CONFIRMATION                                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {selectedRefundPayment && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="glass-panel border border-rose-500/30 p-6 rounded-3xl max-w-md w-full space-y-4 bg-[#0A0A0A]">
            <div className="flex justify-between items-center border-b border-[#1C1C1C] pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-400" /> Cancel & Refund Ticket
              </h3>
              <button 
                onClick={() => {
                  setSelectedRefundPayment(null);
                  setRefundNotice(null);
                  setRefundSuccessReceipt(null);
                }}
                className="text-[#94A3B8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {refundNotice ? (
              <div className="space-y-4 text-center py-4">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-emerald-400">{refundNotice}</p>
                {refundSuccessReceipt && (
                  <button
                    onClick={() => {
                      printTicket({
                        receiptId: refundSuccessReceipt.receiptId,
                        tokenNumber: refundSuccessReceipt.receiptId,
                        activityName: selectedRefundPayment.activityName || 'Cancelled Activity',
                        packageName: 'REFUND VOUCHER',
                        customerName: selectedRefundPayment.customerName || 'Walk-in Guest',
                        customerPhone: selectedRefundPayment.customerPhone,
                        date: new Date().toISOString().split('T')[0],
                        slot: 'CANCELLATION DESK',
                        items: [{ label: 'Refund Amount Disbursed', value: `₹${refundSuccessReceipt.refundAmount}` }],
                        totalAmount: refundSuccessReceipt.refundAmount,
                        paymentStatus: 'refunded',
                        quantity: 1,
                        paymentMethod: refundSuccessReceipt.refundMethod
                      });
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" /> Print Cancellation Voucher
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedRefundPayment(null);
                    setRefundNotice(null);
                    setRefundSuccessReceipt(null);
                  }}
                  className="w-full py-2 bg-[#00ABAB] text-black font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs font-sans">
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1 font-mono">
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Transaction / Ticket ID:</span>
                    <span className="text-white font-bold">{selectedRefundPayment.ticketId || selectedRefundPayment.id}</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Guest:</span>
                    <span className="text-white">{selectedRefundPayment.customerName || 'Walk-in Guest'}</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8]">
                    <span>Original Tender:</span>
                    <span className="text-white uppercase font-bold">{selectedRefundPayment.method}</span>
                  </div>
                  <div className="flex justify-between text-[#94A3B8] pt-1 border-t border-white/10">
                    <span>Original Amount Paid:</span>
                    <span className="text-emerald-400 font-black text-sm">₹{selectedRefundPayment.amount}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Refund Amount (₹)</label>
                  <input
                    type="number"
                    value={refundAmountInput}
                    onChange={e => setRefundAmountInput(e.target.value)}
                    max={selectedRefundPayment.amount}
                    min={1}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-rose-400 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Disbursement Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['cash', 'upi', 'card'] as const).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setRefundMethodInput(m)}
                        className={`py-2 rounded-xl text-xs font-bold uppercase font-mono border transition-all cursor-pointer ${
                          refundMethodInput === m
                            ? 'bg-rose-500 text-white border-rose-500'
                            : 'bg-[#1C1C1C] text-[#94A3B8] border-[#1C1C1C] hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#94A3B8] font-mono uppercase font-bold block mb-1">Reason for Cancellation</label>
                  <select
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="Customer Cancellation Request">Customer Cancellation Request</option>
                    <option value="Double Billing / Incorrect Amount">Double Billing / Incorrect Amount</option>
                    <option value="Weather / Rain Interruption">Weather / Rain Interruption</option>
                    <option value="Mechanical / Safety Stoppage">Mechanical / Safety Stoppage</option>
                    <option value="Other / Custom">Other / Custom</option>
                  </select>
                </div>

                {refundReason === 'Other / Custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom cancellation notes..."
                    value={customRefundReason}
                    onChange={e => setCustomRefundReason(e.target.value)}
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-400"
                  />
                )}

                <div className="flex justify-end gap-2 pt-3 border-t border-[#1C1C1C]">
                  <button
                    type="button"
                    onClick={() => setSelectedRefundPayment(null)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    disabled={isRefunding}
                    onClick={handleConfirmRefund}
                    className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {isRefunding ? 'Processing...' : 'Confirm Refund & Disburse'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
export default TicketingDashboard;