/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { Activity, MenuItem, Booking, FoodOrder } from '../types';
import { InvoiceModal } from './InvoiceModal';
import { 
  Calendar as CalendarIcon, Clock, Users, Ticket, 
  ShoppingBag, Search, Plus, Minus, CreditCard, 
  Trash2, BookOpen, Utensils, History, Sparkles, 
  ArrowRight, ShieldCheck, Check, X, AlertTriangle,
  Compass, Crosshair, Flag
} from 'lucide-react';
import { HorseRidingActivityPage } from './HorseRidingActivityPage';
import { ShootingActivityPage } from './ShootingActivityPage';
import { GoKartingActivityPage } from './GoKartingActivityPage';
import { AdventureHero } from './AdventureHero';

export const CustomerDashboard: React.FC = () => {
  const { 
    activities, vendors, menuItems, foodCart, timeSlots, bookings, orders, tickets,
    addToFoodCart, removeFromFoodCart, clearFoodCart, submitFoodOrder, createBooking 
  } = useAppContext();

  // Navigation Subtabs
  const [activeSubTab, setActiveSubTab] = useState<string>('act-go-karting');
  const contentRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------
  // 1. ACTIVITY BOOKING FLOW STATES
  // -----------------------------------------------------------------
  const [selectedActivity, setSelectedActivity] = useState<Activity>(activities[0] || null);
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>(timeSlots[0]);
  
  // standard vs package selections
  const [bookingType, setBookingType] = useState<'standard' | 'package'>('standard');
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [adultCount, setAdultCount] = useState<number>(1);
  const [childCount, setChildCount] = useState<number>(0);
  const [packageQuantity, setPackageQuantity] = useState<number>(1);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Customer Details for Booking
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  // Booking Checkout & Payment Modal
  const [isBookingPaymentOpen, setIsBookingPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'net_banking' | 'cash'>('upi');
  const [bookingSuccessData, setBookingSuccessData] = useState<{ booking: Booking; ticket: any } | null>(null);
  const [bookingErrorMessage, setBookingErrorMessage] = useState<string | null>(null);
  const [isPaymentStage, setIsPaymentStage] = useState(false);

  // -----------------------------------------------------------------
  // 2. FOOD ORDERING FLOW STATES
  // -----------------------------------------------------------------
  const [foodSearch, setFoodSearch] = useState('');
  const [selectedFoodVendorId, setSelectedFoodVendorId] = useState<string>('all');
  const [isFoodCheckoutOpen, setIsFoodCheckoutOpen] = useState(false);
  const [foodSuccessOrder, setFoodSuccessOrder] = useState<FoodOrder | null>(null);

  // -----------------------------------------------------------------
  // 3. INVOICE MODAL LAUNCHER
  // -----------------------------------------------------------------
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<Booking | undefined>(undefined);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<FoodOrder | undefined>(undefined);

  // -----------------------------------------------------------------
  // DATA QUERIES
  // -----------------------------------------------------------------
  // Filter menu items
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(foodSearch.toLowerCase()) || 
                          item.category.toLowerCase().includes(foodSearch.toLowerCase());
    const matchesVendor = selectedFoodVendorId === 'all' || item.vendorId === selectedFoodVendorId;
    return matchesSearch && matchesVendor && item.isAvailable;
  });

  // Calculate activity price
  const calculateBookingTotal = () => {
    if (!selectedActivity) return 0;
    
    if (bookingType === 'standard') {
      const adultPrice = selectedActivity.adultPrice || 0;
      const childPrice = selectedActivity.childPrice || 0;
      return (adultCount * adultPrice) + (childCount * childPrice);
    } else {
      const pkg = selectedActivity.packages?.find(p => p.id === selectedPackageId);
      if (!pkg) return 0;
      return packageQuantity * pkg.price;
    }
  };

  const bookingTotal = calculateBookingTotal();

  // Handle actual payment & booking submission
  const executeActivityBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;

    if (!customerName || !customerPhone || !customerEmail) {
      setBookingErrorMessage('Please fill in your Name, Email, and Phone Number.');
      return;
    }

    let details = '';
    let qty = 1;

    if (bookingType === 'standard') {
      details = `${adultCount}x Adult, ${childCount}x Child`;
      qty = adultCount + childCount;
    } else {
      const pkg = selectedActivity.packages?.find(p => p.id === selectedPackageId);
      details = `Package: ${pkg?.name || 'Selected Ride'}`;
      qty = packageQuantity;
    }

    const result = createBooking({
      customerName,
      customerEmail,
      customerPhone,
      activityId: selectedActivity.id,
      activityName: selectedActivity.name,
      date: bookingDate,
      timeSlot: selectedSlot,
      ticketType: bookingType,
      details,
      quantity: qty,
      totalAmount: bookingTotal,
      paymentMethod
    });

    if (typeof result === 'string') {
      // Error
      setBookingErrorMessage(result);
    } else {
      // Success
      setBookingErrorMessage(null);
      setBookingSuccessData({
        booking: result.booking,
        ticket: result.ticket
      });
    }
  };

  // Handle food checkout submission
  const executeFoodCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentMethod !== 'upi' && paymentMethod !== 'card' && paymentMethod !== 'net_banking') {
      try {
        const order = submitFoodOrder('John Watson', 'watson@baker.street', paymentMethod);
        setFoodSuccessOrder(order);
        setIsFoodCheckoutOpen(false);
      } catch (err: any) {
        alert(err.message || 'Payment processing failed');
      }
      return;
    }

    try {
      const amount = foodCart.reduce((s, i) => s + (i.price * i.quantity), 0);
      
      // 1. Create order on backend
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'USD' })
      });
      const order = await orderResponse.json();

      // 2. Open Razorpay Modal
      const options = {
        key: 'rzp_test_TI7eXiGfnUXpao', // Using test key ID directly for frontend
        amount: order.amount,
        currency: order.currency,
        name: 'Deuce Adventure Park',
        description: 'Food Street Order',
        order_id: order.id,
        handler: async function (response: any) {
          // 3. Verify payment signature on backend
          const verifyResponse = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          });
          const verifyData = await verifyResponse.json();

          if (verifyResponse.ok) {
             const successOrder = submitFoodOrder('John Watson', 'watson@baker.street', paymentMethod);
             setFoodSuccessOrder(successOrder);
             setIsFoodCheckoutOpen(false);
          } else {
             alert('Payment verification failed: ' + verifyData.message);
          }
        },
        prefill: { name: customerName, email: customerEmail, contact: customerPhone },
        theme: { color: '#14F1D9' },
        config: {
          display: {
            blocks: { upi: { name: 'Pay via UPI QR', instruments: [{ method: 'upi' }] } },
            sequence: ['block.upi'],
            preferences: { show_default_blocks: true }
          }
        }
      };
      
      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
         alert(response.error.description);
      });
      rzp1.open();

    } catch (err: any) {
      alert(err.message || 'Payment initialization failed');
    }
  };

  return (
    <div className="space-y-6 flex flex-col w-full">
      <div className="w-full overflow-hidden">
        <AdventureHero />
      </div>
      
      {/* PREMIUM ACTIVITY SELECTION GRID */}
      <div id="activities-section" className="relative w-full py-8 bg-[#050816] rounded-3xl overflow-hidden border border-white/5 shadow-[0_0_50px_rgba(20,241,217,0.05)]">
        
        {/* Background Enhancements */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Electric blue radial glow */}
          <div className="absolute -left-[10%] top-0 w-[600px] h-[600px] bg-[#00B4FF]/10 rounded-full blur-[120px]" />
          {/* Teal radial glow */}
          <div className="absolute right-[10%] bottom-[-20%] w-[800px] h-[800px] bg-[#14F1D9]/10 rounded-full blur-[150px]" />
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e105_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e105_1px,transparent_1px)] bg-[size:32px_32px]"></div>
          {/* Noise texture */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] mix-blend-overlay"></div>
          {/* Racing motion streaks */}
          <motion.div 
            animate={{ x: ['-100%', '200%'] }} 
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1 }}
            className="absolute top-[30%] left-0 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#14F1D9]/30 to-transparent"
          />
          <motion.div 
            animate={{ x: ['-100%', '200%'] }} 
            transition={{ duration: 4, repeat: Infinity, ease: 'linear', delay: 0.5 }}
            className="absolute top-[70%] left-0 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-[#00B4FF]/20 to-transparent"
          />
        </div>

        <div className="relative z-10 px-6 sm:px-12 max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F8FAFC] to-[#CBD5E1] tracking-tight mb-4">
              Select Your Next Thrill
            </h2>
            <p className="text-[#9CA3AF] text-sm max-w-xl mx-auto">
              Secure dedicated slots for specialized sports activities, customize specs, and order multi-vendor street food items instantly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 perspective-1000">
            {[
              {
                id: 'act-go-karting',
                name: 'Pro Go-Karting',
                image: '/gokart-night.png',
                icon: '🏎️',
                color: 'from-[#14F1D9]/80 to-[#00B4FF]/80'
              },
              {
                id: 'act-horse-riding',
                name: 'Royal Trails',
                image: 'https://www.huntleyequestrian.com/cdn/shop/articles/Is-Horse-Riding-a-Sport-Huntley-Equestrian-110301396.jpg?crop=center&height=1200&v=1743859147&width=1200',
                icon: '🐎',
                color: 'from-[#FFB703]/80 to-[#F59E0B]/80'
              },
              {
                id: 'act-air-gun',
                name: 'Air Rifle',
                image: 'https://www.gunforglory.in/wp-content/uploads/2026/04/GFG-BLOG-FEATURE-3-1.png',
                icon: '🎯',
                color: 'from-purple-500/80 to-pink-500/80'
              },
              {
                id: 'dine',
                name: 'Food Street',
                image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80',
                icon: '☕',
                color: 'from-rose-500/80 to-orange-500/80'
              }
            ].map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 50, rotateX: 10 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
                onClick={() => {
                  setActiveSubTab(item.id);
                  setTimeout(() => {
                    contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 100);
                }}
                className={`group relative h-[220px] rounded-3xl overflow-hidden cursor-pointer bg-[#0B1120]/80 backdrop-blur-xl border-2 transition-all duration-500 hover:shadow-[0_0_40px_rgba(20,241,217,0.2)] ${
                  activeSubTab === item.id ? 'border-[#14F1D9] scale-[1.02]' : 'border-white/10 hover:border-white/30'
                }`}
                whileHover={{ y: -10, rotateY: 5, rotateX: -5 }}
              >
                {/* Parallax Background Image */}
                <div className="absolute inset-0 w-full h-full">
                  <div className={`absolute inset-0 bg-gradient-to-t ${item.color} mix-blend-overlay z-10 opacity-60 group-hover:opacity-40 transition-opacity duration-500`}></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050816] via-[#050816]/60 to-transparent z-10"></div>
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-full h-full object-cover filter brightness-75 group-hover:scale-125 transition-transform duration-[2000ms] ease-out"
                  />
                </div>

                {/* Floating Particles (CSS trick) */}
                <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-color-dodge"></div>

                {/* Content */}
                <div className="absolute inset-0 z-20 flex flex-col justify-end p-6">
                  <h3 className="text-xl font-black text-white group-hover:text-[#14F1D9] transition-colors drop-shadow-md">
                    {item.name}
                  </h3>
                  
                  {/* Shine Button Animation */}
                  <div className="mt-4 relative overflow-hidden rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-xs font-bold text-white text-center w-full group-hover:bg-[#14F1D9] group-hover:text-[#050816] group-hover:border-[#14F1D9] transition-all duration-300">
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Access Terminal <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 -translate-x-full bg-white/40 skew-x-12 group-hover:animate-[shine_1s_ease-out]"></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-8 text-center">
             <button
              onClick={() => setActiveSubTab('history')}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-extrabold text-xs transition-all cursor-pointer ${
                activeSubTab === 'history' 
                  ? 'bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] shadow-[0_0_20px_rgba(20,241,217,0.3)]' 
                  : 'glass-panel border border-white/10 hover:bg-white/5 text-white hover:border-[#14F1D9]/50'
              }`}
            >
              <History className="h-4 w-4" /> View Passes ({tickets.filter(t => t.customerEmail === 'watson@baker.street').length})
            </button>
          </div>
        </div>
      </div>

      {/* Anchor for scrolling to selected activity */}
      <div ref={contentRef} className="scroll-mt-24"></div>

      {activeSubTab === 'act-horse-riding' && <HorseRidingActivityPage onSuccessClose={() => setActiveSubTab('history')} />}
      {activeSubTab === 'act-air-gun' && <ShootingActivityPage onSuccessClose={() => setActiveSubTab('history')} />}
      {activeSubTab === 'act-go-karting' && <GoKartingActivityPage onSuccessClose={() => setActiveSubTab('history')} />}
      {/* Dynamic Activities */}
      {!['act-horse-riding', 'act-air-gun', 'act-go-karting', 'dine', 'history'].includes(activeSubTab) && (
        <div className="p-8 text-center glass-panel border border-[#00ABAB]/30 rounded-3xl">
          <Sparkles className="w-12 h-12 text-[#40E0D0] mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white">Select Packages & Book Tickets</h2>
          <p className="text-[#9CA3AF] mt-2 max-w-md mx-auto">Please proceed to the admin or staff desk to book dynamic activities, or use the standard checkout app when fully integrated.</p>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 2. DINE SUB-TAB (FOOD STREET) */}
      {/* ----------------------------------------------------------------- */}
      {activeSubTab === 'dine' && (
        <div className="w-full flex flex-col gap-5 pb-6 font-sans text-slate-100 h-full">
          {/* HERO SECTION */}
          <div className="relative rounded-2xl overflow-hidden group shadow-[0_0_30px_rgba(20,241,217,0.05)] border border-white/5 flex-shrink-0">
            <div className="absolute inset-0 bg-[#050816]/30 z-10"></div>
            <img 
              src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80" 
              alt="Food Street" 
              className="w-full h-[160px] md:h-[200px] object-cover filter saturate-150 transform group-hover:scale-105 transition-transform duration-[2000ms]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/60 to-transparent z-20"></div>
            
            <div className="absolute bottom-0 left-0 p-4 md:p-6 z-30 w-full">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 mb-2">
                <span className="px-2 py-0.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-[9px] uppercase tracking-widest font-bold text-[#14F1D9] flex items-center gap-1 shadow-sm">
                  <Utensils className="w-3 h-3" /> Multi-Vendor
                </span>
                <span className="px-2 py-0.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-[9px] uppercase tracking-widest font-bold text-[#FFB703] flex items-center gap-1 shadow-sm">
                  <Sparkles className="w-3 h-3" /> Fresh Made
                </span>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-2xl md:text-3xl font-black text-white mb-1 tracking-tighter leading-none">
                Food Street <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14F1D9] to-[#00B4FF]">Dining</span>
              </motion.h1>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-xs text-[#CBD5E1] max-w-xl font-medium">
                Fuel up for your next adventure. Browse gourmet street food stalls and place multi-vendor orders instantly.
              </motion.p>
            </div>
          </div>

          {/* 50:50 COLUMNS */}
          <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
            
            {/* LEFT COLUMN: BROWSE & FILTER */}
            <div className="flex-1 min-w-0 flex flex-col justify-start gap-5 h-full overflow-y-auto pr-2 custom-scrollbar">
              
              {/* Search and Stall Filter controls */}
              <div className="p-4 glass-panel border border-white/10 rounded-xl flex flex-col md:flex-row gap-3 shadow-lg flex-shrink-0">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    id="input-food-search"
                    placeholder="Search pizzas, lattes..."
                    value={foodSearch}
                    onChange={e => setFoodSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#050816] border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[#14F1D9] transition-all"
                  />
                  <Search className="absolute left-3 top-3 h-4 w-4 text-[#9CA3AF]" />
                </div>
                <select
                  id="select-food-vendor"
                  value={selectedFoodVendorId}
                  onChange={e => setSelectedFoodVendorId(e.target.value)}
                  className="px-3 py-2 bg-[#050816] border border-white/10 rounded-lg text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#14F1D9] cursor-pointer appearance-none"
                >
                  <option value="all">All Food Stalls</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Grid of menu items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {filteredMenuItems.map(item => {
                  const vendorName = vendors.find(v => v.id === item.vendorId)?.name || 'Food Stall';
                  
                  return (
                    <div 
                      key={item.id} 
                      id={`dine-item-card-${item.id}`}
                      className="p-3 glass-panel border border-white/5 hover:border-[#14F1D9]/50 rounded-xl flex gap-3 transition-all duration-300 group hover:shadow-[0_0_15px_rgba(20,241,217,0.15)] bg-[#0B1120]"
                    >
                      <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover border border-white/5" referrerPolicy="no-referrer" />
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] uppercase font-mono font-bold text-[#14F1D9] bg-[#050816] px-1.5 py-0.5 rounded border border-white/5 line-clamp-1 truncate mr-1">{vendorName}</span>
                            <span className="font-mono text-xs font-black text-white">${item.price.toFixed(2)}</span>
                          </div>
                          <h4 className="font-bold text-xs text-white truncate mt-2 tracking-tight group-hover:text-[#14F1D9] transition-colors">{item.name}</h4>
                          <p className="text-[9px] text-[#9CA3AF] line-clamp-2 mt-1 leading-snug">{item.description}</p>
                        </div>

                        <button
                          id={`btn-add-to-cart-${item.id}`}
                          onClick={() => addToFoodCart(item, 1)}
                          className="mt-2 self-end px-3 py-1.5 rounded bg-white/5 hover:bg-[#14F1D9] hover:text-[#0B1120] text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-all border border-white/5 hover:border-[#14F1D9]"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: CART PANEL */}
            <div className="flex-1 min-w-0 flex flex-col justify-between gap-5 h-full overflow-y-auto pr-2 custom-scrollbar">
              <div className="glass-panel border border-white/10 rounded-xl p-4 flex flex-col h-full shadow-[0_0_20px_rgba(20,241,217,0.05)] relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#14F1D9]/10 rounded-full blur-[40px] pointer-events-none"></div>

                <div className="border-b border-white/10 pb-3 flex justify-between items-center flex-shrink-0 relative z-10">
                  <div>
                    <h3 className="font-black text-sm text-white flex items-center gap-2 tracking-tight">
                      <ShoppingBag className="w-4 h-4 text-[#FFB703]" /> Food Court Cart
                    </h3>
                  </div>
                  {foodCart.length > 0 && (
                    <button
                      id="btn-clear-cart"
                      onClick={clearFoodCart}
                      className="text-[9px] font-mono text-red-400 font-bold flex items-center gap-0.5 hover:text-red-300 cursor-pointer uppercase tracking-widest"
                    >
                      <Trash2 className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>

                {/* Cart item loop */}
                <div className="flex-1 overflow-y-auto py-3 relative z-10 custom-scrollbar">
                  {foodCart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-[#9CA3AF] text-xs">
                      <ShoppingBag className="h-10 w-10 mb-3 text-white/10" />
                      <span className="font-medium text-white/50">Your cart is empty.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {foodCart.map((cartItem, idx) => (
                        <div key={idx} id={`cart-row-${cartItem.menuItemId}`} className="p-2.5 bg-[#050816] border border-white/5 rounded-lg text-xs flex justify-between items-center gap-2 group">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white truncate">{cartItem.name}</div>
                            <div className="text-[9px] text-[#9CA3AF] font-mono truncate">{cartItem.vendorName}</div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[#00B4FF] font-bold text-[10px]">{cartItem.quantity}x</span>
                            <span className="font-mono font-black text-white">${(cartItem.price * cartItem.quantity).toFixed(2)}</span>
                            <button
                              id={`btn-cart-remove-${cartItem.menuItemId}`}
                              onClick={() => removeFromFoodCart(cartItem.menuItemId)}
                              className="text-white/40 hover:text-red-400 p-1 rounded cursor-pointer transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Calculations & Submit button */}
                <div className="border-t border-white/10 pt-4 flex-shrink-0 relative z-10">
                  <div className="flex justify-between items-end mb-4">
                    <span className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest">Total Bill</span>
                    <span className="text-2xl font-black font-mono text-white tracking-tighter">
                      ${foodCart.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)}
                    </span>
                  </div>

                  <button
                    id="btn-dine-cart-checkout"
                    onClick={() => {
                      setFoodSuccessOrder(null);
                      setIsFoodCheckoutOpen(true);
                    }}
                    disabled={foodCart.length === 0}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden relative group shadow-[0_0_20px_rgba(20,241,217,0.3)] cursor-pointer"
                  >
                    <div className="absolute inset-0 w-full h-full animate-[shine_2s_ease-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"></div>
                    <span className="relative flex items-center justify-center gap-2">
                      Checkout <ArrowRight className="w-4 h-4" />
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 3. HISTORY & WALLET SUB-TAB */}
      {/* ----------------------------------------------------------------- */}
      {activeSubTab === 'history' && (
        <div className="space-y-6">
          
          {/* Active Gate passes with QR codes */}
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-bold text-[#40E0D0] font-mono tracking-wider block">My Gate Admission Passes (QR Tickets)</span>
            {tickets.filter(t => t.customerEmail === 'watson@baker.street').length === 0 ? (
              <div className="text-center py-12 glass-panel border border-[#00ABAB]/30 rounded-2xl text-xs text-[#9CA3AF]">
                No active trail tickets booked.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {tickets.filter(t => t.customerEmail === 'watson@baker.street').map(ticket => {
                  const correlatedBooking = bookings.find(b => b.id === ticket.bookingId);
                  
                  return (
                    <div 
                      key={ticket.id} 
                      id={`customer-ticket-${ticket.id}`}
                      className={`glass-panel border rounded-2xl overflow-hidden  flex ${
                        ticket.status === 'used' ? 'opacity-60 border-dashed border-[#00ABAB]/30' : 'border-[#00ABAB]/30 ring-1 ring-teal-100/30'
                      }`}
                    >
                      {/* Left: Info */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase font-mono font-bold text-teal-700 bg-[#0A0A0A] px-2 py-0.5 rounded border border-[#00ABAB]/30">
                              Pass ID: {ticket.id}
                            </span>
                            <span className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded ${
                              ticket.status === 'valid' ? 'bg-teal-100 text-[#40E0D0] border border-[#00ABAB]/30' : 'bg-neutral-100 text-neutral-500'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-[#FFFFFF] font-sans mt-2">{ticket.activityName}</h4>
                          <p className="text-[11px] text-[#9CA3AF] font-mono mt-0.5">{ticket.ticketType}</p>
                          <p className="text-[11px] text-[#9CA3AF] font-mono mt-1 flex items-center gap-1">
                            <CalendarIcon className="h-3.5 w-3.5 text-[#3E8EDE]" /> {ticket.date}
                          </p>
                          <p className="text-[11px] text-[#9CA3AF] font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="h-3.5 w-3.5 text-[#3E8EDE]" /> {ticket.timeSlot}
                          </p>
                        </div>

                        {correlatedBooking && (
                          <button
                            id={`btn-open-invoice-booking-${ticket.id}`}
                            onClick={() => setSelectedInvoiceBooking(correlatedBooking)}
                            className="mt-3 self-start text-[10px] font-mono text-teal-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            Open Bill Receipt â†’
                          </button>
                        )}
                      </div>

                      {/* Right: Simulated QR */}
                      <div className="p-4 bg-[#0A0A0A]/50 border-l border-[#00ABAB]/30 flex flex-col items-center justify-center gap-2">
                        <svg className="w-20 h-20 text-teal-950" viewBox="0 0 100 100">
                           <path d="M5 5h30v30H5V5zm5 5v20h20V10H10zm55-5h30v30H65V5zm5 5v20h20V10H70zM5 65h30v30H5V65zm5 5v20h20V70H10z" fill="currentColor"/>
                           <path d="M45 10h10v10H45V10zm20 45h10v10H65V55zm15 15h15v15H80V70zm-15 15h10v10H65V85zm-20-20h10v10H45V65zm20-20h10v10H65V45zm-10 10h10v10H55V55z" fill="currentColor"/>
                        </svg>
                        <span className="font-mono text-[8px] text-[#40E0D0] font-bold truncate max-w-[80px]">Scan at gate</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Food Order Tracking Histories */}
          <div className="space-y-3 pt-4 border-t border-[#00ABAB]/30">
            <span className="text-[10px] uppercase font-bold text-[#40E0D0] font-mono tracking-wider block">My Food Orders (Live Status tracking)</span>
            {orders.filter(o => o.customerEmail === 'watson@baker.street').length === 0 ? (
              <div className="text-center py-12 glass-panel border border-[#00ABAB]/30 rounded-2xl text-xs text-[#9CA3AF]">
                No food orders placed.
              </div>
            ) : (
              <div className="space-y-3">
                {orders.filter(o => o.customerEmail === 'watson@baker.street').map(order => (
                  <div 
                    key={order.id} 
                    id={`customer-order-row-${order.id}`}
                    className="p-4 glass-panel border border-[#00ABAB]/30 rounded-2xl  flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-[#FFFFFF]">{order.id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          order.status === 'pending'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200 animate-pulse'
                            : order.status === 'preparing'
                            ? 'bg-blue-50 text-blue-800 border border-blue-200 animate-pulse'
                            : order.status === 'ready'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 animate-bounce'
                            : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#FFFFFF] mt-1 leading-normal max-w-md font-medium">
                        {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                      </p>
                      <span className="text-[10px] text-[#9CA3AF] font-mono">{new Date(order.createdAt).toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-[#9CA3AF] uppercase font-bold block font-mono">Total Paid</span>
                        <span className="font-mono font-bold text-sm text-teal-950">${order.totalAmount.toFixed(2)}</span>
                      </div>
                      <button
                        id={`btn-open-invoice-order-${order.id}`}
                        onClick={() => setSelectedInvoiceOrder(order)}
                        className="px-3 py-1.5 rounded-lg border border-[#00ABAB]/30 hover:bg-[#0A0A0A] font-bold text-xs text-[#40E0D0] cursor-pointer"
                      >
                        Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}



      {/* FOOD STREET ORDER CHECKOUT MODAL */}
      <AnimatePresence>
      {isFoodCheckoutOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#050816]/90 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="glass-panel border border-[#14F1D9]/30 rounded-2xl shadow-[0_0_30px_rgba(20,241,217,0.15)] max-w-md w-full p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#14F1D9]/10 rounded-full blur-[60px] pointer-events-none"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h3 className="font-black text-xl text-white tracking-tight">Food Street Checkout</h3>
                <p className="text-[9px] text-[#14F1D9] font-mono mt-1 font-bold tracking-widest uppercase">Multi-Vendor Settlement</p>
              </div>
              <button 
                id="btn-close-food-checkout"
                onClick={() => setIsFoodCheckoutOpen(false)} 
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={executeFoodCheckout} className="space-y-4 relative z-10">
              <div className="bg-[#050816] p-4 rounded-xl border border-white/10 space-y-2 font-mono text-white shadow-inner">
                {foodCart.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span className="text-[#9CA3AF]">{item.quantity}x {item.name}</span>
                    <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-black text-white border-t border-white/10 pt-2 mt-2 text-sm">
                  <span className="font-sans text-xs uppercase tracking-widest text-[#9CA3AF]">Total Bill:</span>
                  <span className="text-[#14F1D9]">${foodCart.reduce((s, i) => s + (i.price * i.quantity), 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[#9CA3AF] font-black text-[9px] uppercase tracking-widest font-mono block text-center">Payment Gateway</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    key="upi"
                    type="button"
                    id="btn-food-pay-method-upi"
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'upi' 
                        ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' 
                        : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'
                    }`}
                  >
                    <span className="font-black text-[10px] font-mono uppercase tracking-wider">UPI</span>
                  </button>
                  <button
                    key="card"
                    type="button"
                    id="btn-food-pay-method-card"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'card' 
                        ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' 
                        : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                  </button>
                  <button
                    key="net"
                    type="button"
                    id="btn-food-pay-method-net"
                    onClick={() => setPaymentMethod('net_banking')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'net_banking' 
                        ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' 
                        : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'
                    }`}
                  >
                    <span className="font-black text-[10px] font-mono uppercase tracking-wider">Bank</span>
                  </button>
                  <button
                    key="cash"
                    type="button"
                    id="btn-food-pay-method-cash"
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer ${
                      paymentMethod === 'cash' 
                        ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' 
                        : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'
                    }`}
                  >
                    <span className="font-black text-[10px] font-mono uppercase tracking-wider">Cash</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="btn-submit-food-payment"
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_20px_rgba(20,241,217,0.3)] mt-4 flex items-center justify-center gap-2"
              >
                <ShieldCheck className="h-4 w-4 text-[#0B1120]" /> 
                {(paymentMethod === 'upi' || paymentMethod === 'card' || paymentMethod === 'net_banking') ? 'Pay with Razorpay' : 'Dispatch Kitchen Order'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* FOOD DINE SUCCESS SCREEN INTERSTITIAL */}
      <AnimatePresence>
      {foodSuccessOrder && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#050816]/90 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="glass-panel border border-[#14F1D9]/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(20,241,217,0.15)] max-w-sm w-full text-center space-y-4 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#14F1D9]/10 rounded-full blur-[60px] pointer-events-none"></div>

            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }} className="w-16 h-16 bg-gradient-to-br from-[#14F1D9] to-[#00B4FF] rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(20,241,217,0.4)] relative z-10">
              <Check className="h-8 w-8 text-[#0B1120] font-bold" />
            </motion.div>
            
            <div className="relative z-10">
              <h3 className="font-black text-xl text-white tracking-tight">Kitchen Order Dispatched!</h3>
              <p className="text-xs text-[#9CA3AF] max-w-xs mx-auto leading-normal mt-1 font-medium">
                Your orders have been assigned to respective vendor queues! You can track cooking updates dynamically in your dashboard.
              </p>
            </div>

            <div className="flex gap-2 justify-center pt-4 relative z-10">
              <button
                id="btn-food-view-rec"
                onClick={() => {
                  setSelectedInvoiceOrder(foodSuccessOrder);
                  setFoodSuccessOrder(null);
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(20,241,217,0.2)]"
              >
                View Receipt
              </button>
              <button
                id="btn-food-success-close"
                onClick={() => {
                  setActiveSubTab('history');
                  setFoodSuccessOrder(null);
                }}
                className="flex-1 px-4 py-3 border border-white/10 hover:bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest cursor-pointer transition-colors"
              >
                Track Order
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------- */}
      {/* GLOBAL MOUNTED INVOICE MODAL LAUNCHERS */}
      {/* ----------------------------------------------------------------- */}
      {selectedInvoiceBooking && (
        <InvoiceModal
          booking={selectedInvoiceBooking}
          onClose={() => setSelectedInvoiceBooking(undefined)}
        />
      )}

      {selectedInvoiceOrder && (
        <InvoiceModal
          order={selectedInvoiceOrder}
          onClose={() => setSelectedInvoiceOrder(undefined)}
        />
      )}

    </div>
  );
};








