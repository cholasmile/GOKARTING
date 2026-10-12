/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';
import { Activity, MenuItem, Booking, FoodOrder, User } from '../types';
import { InvoiceModal } from './InvoiceModal';
import { UnifiedLoginModal } from './UnifiedLoginModal';
import { 
  Calendar as CalendarIcon, Clock, Users, Ticket, 
  ShoppingBag, Search, Plus, Minus, CreditCard, 
  Trash2, BookOpen, Utensils, History, Sparkles, 
  ArrowRight, ShieldCheck, Check, X, AlertTriangle,
  Compass, Crosshair, Flag, User as UserIcon, LogIn, LogOut, UserPlus, Key, Mail, Phone
} from 'lucide-react';
import { HorseRidingActivityPage } from './HorseRidingActivityPage';
import { ShootingActivityPage } from './ShootingActivityPage';
import { GoKartingActivityPage } from './GoKartingActivityPage';
import { AdventureHero } from './AdventureHero';
import { ReservationCalendar } from './ReservationCalendar';
import { getAvailableTimeSlots, getTodayDateString, isPastDate } from '../lib/slotUtils';

export const CustomerDashboard: React.FC = () => {
  const { 
    activities, vendors, menuItems, foodCart, timeSlots, bookings, orders, tickets,
    addToFoodCart, removeFromFoodCart, clearFoodCart, submitFoodOrder, createBooking,
    currentUser, setCurrentUser, users, addUser, razorpayKeyId
  } = useAppContext();

  // Navigation Subtabs
  const [activeSubTab, setActiveSubTab] = useState<string>('act-go-karting');
  const contentRef = useRef<HTMLDivElement>(null);

  // -----------------------------------------------------------------
  // MEMBER / GUEST AUTHENTICATION STATES
  // -----------------------------------------------------------------
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [memberTab, setMemberTab] = useState<'login' | 'register'>('login');
  const [loginEmailOrPhone, setLoginEmailOrPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [memberAuthError, setMemberAuthError] = useState<string | null>(null);

  // History Tab Email Retrieval Search
  const [historySearchEmail, setHistorySearchEmail] = useState('');

  const handleMemberLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setMemberAuthError(null);
    const input = loginEmailOrPhone.trim();
    if (!input) {
      setMemberAuthError('Please enter your Cell No or Email ID.');
      return;
    }
    if (!loginPassword) {
      setMemberAuthError('Please enter your password.');
      return;
    }

    const normalizedInput = input.toLowerCase();
    const cleanInputDigits = input.replace(/\D/g, '');

    const foundUser = users.find(u => {
      const emailMatch = u.email.toLowerCase() === normalizedInput;
      const phoneDigits = u.phone ? u.phone.replace(/\D/g, '') : '';
      const phoneMatch = cleanInputDigits.length > 3 && phoneDigits.endsWith(cleanInputDigits);
      return emailMatch || phoneMatch;
    });

    if (foundUser) {
      // Validate password if user has set a password or for demo accounts
      if (foundUser.password && foundUser.password !== loginPassword) {
        setMemberAuthError('Invalid password. Please check your credentials.');
        return;
      }
      setCurrentUser(foundUser);
      setIsMemberModalOpen(false);
    } else {
      setMemberAuthError('Account not found with this Cell No or Email ID. Please register for a new account.');
    }
  };

  const handleMemberRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setMemberAuthError(null);
    if (!regName.trim() || !regEmail.trim()) {
      setMemberAuthError('Name and Email ID are required to register.');
      return;
    }
    if (!regPassword) {
      setMemberAuthError('Please set a password for your account.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setMemberAuthError('Passwords do not match. Please verify your password.');
      return;
    }

    const normalizedEmail = regEmail.trim().toLowerCase();
    const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      setMemberAuthError('An account with this Email ID already exists. Please log in with your credentials.');
      return;
    }

    const newMember: User = {
      id: `usr-cust-${Date.now()}`,
      name: regName.trim(),
      email: normalizedEmail,
      phone: regPhone.trim() || undefined,
      password: regPassword,
      role: 'customer'
    };
    addUser(newMember);
    setCurrentUser(newMember);
    setIsMemberModalOpen(false);
  };

  const handleQuickDemoLogin = (user: User) => {
    setCurrentUser(user);
    setIsMemberModalOpen(false);
  };

  // -----------------------------------------------------------------
  // 1. ACTIVITY BOOKING FLOW STATES
  // -----------------------------------------------------------------
  const [selectedActivity, setSelectedActivity] = useState<Activity>(activities[0] || null);

  useEffect(() => {
    if (selectedActivity) {
      const updated = activities.find(a => a.id === selectedActivity.id);
      if (updated) {
        setSelectedActivity(updated);
      }
    } else if (activities.length > 0) {
      setSelectedActivity(activities[0]);
    }
  }, [activities]);

  const [bookingDate, setBookingDate] = useState<string>(() => getTodayDateString());
  
  const availableSlots = getAvailableTimeSlots(bookingDate);
  const [selectedSlot, setSelectedSlot] = useState<string>(() => availableSlots[0] || '');

  useEffect(() => {
    const handleOpenMemberModal = () => setIsMemberModalOpen(true);
    window.addEventListener('open-member-modal', handleOpenMemberModal);
    return () => window.removeEventListener('open-member-modal', handleOpenMemberModal);
  }, []);

  useEffect(() => {
    if (availableSlots.length > 0) {
      if (!availableSlots.includes(selectedSlot)) {
        setSelectedSlot(availableSlots[0]);
      }
    } else {
      setSelectedSlot('');
    }
  }, [bookingDate, availableSlots.length]);
  
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

  // Auto pre-fill customer details from member login state
  useEffect(() => {
    if (currentUser) {
      setCustomerName(currentUser.name || '');
      setCustomerEmail(currentUser.email || '');
      setCustomerPhone(currentUser.phone || '');
    }
  }, [currentUser]);

  // Booking Checkout & Payment Modal
  const [isBookingPaymentOpen, setIsBookingPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'net_banking' | 'cash' | 'complimentary'>('upi');
  const [isComplimentaryPass, setIsComplimentaryPass] = useState(false);
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
    if (isComplimentaryPass) return 0;
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

    if (isPastDate(bookingDate)) {
      setBookingErrorMessage('Booking for past dates is not allowed. Please select today or a future date.');
      return;
    }

    if (!selectedSlot || !availableSlots.includes(selectedSlot)) {
      setBookingErrorMessage('Please select a valid available time slot.');
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
      ticketType: isComplimentaryPass ? 'Complimentary VIP Pass' : bookingType,
      details: isComplimentaryPass ? `${details} (VIP Compliment)` : details,
      quantity: qty,
      totalAmount: isComplimentaryPass ? 0 : bookingTotal,
      paymentMethod: isComplimentaryPass ? 'complimentary' : paymentMethod,
      packageId: bookingType === 'package' ? selectedPackageId : undefined
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
      if (!navigator.onLine) {
        throw new Error('Online payments are not available offline. Please use Cash or another offline payment method.');
      }

      const amount = foodCart.reduce((s, i) => s + (i.price * i.quantity), 0);
      
      // 1. Create order on backend
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'INR' })
      });
      const order = await orderResponse.json();


      // 2. Open Razorpay Modal
      const options = {
        key: razorpayKeyId || 'rzp_live_TYnsYBkCUZzRR3',
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
    <div className="space-y-2 flex flex-col w-full">
      <div className="w-full overflow-hidden">
        <AdventureHero onOpenMemberModal={() => setIsMemberModalOpen(true)} />
      </div>
      
      {/* PREMIUM ACTIVITY SELECTION GRID */}
      <div id="activities-section" className="relative w-full py-6 bg-[#050816] rounded-3xl overflow-hidden border border-white/5 shadow-[0_0_50px_rgba(20,241,217,0.05)]">
        
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

          <div className="flex flex-wrap justify-center items-center gap-6 perspective-1000">
            {activities.filter(act => act.isActive !== false && act.id !== 'act-gaming-pc' && !act.id.toLowerCase().includes('gaming') && !(act.type as string)?.toLowerCase().includes('gaming') && !act.name?.toLowerCase().includes('gaming')).map((act, idx) => {
              let color = 'from-[#14F1D9]/80 to-[#00B4FF]/80';
              if (idx % 3 === 1) color = 'from-[#FFB703]/80 to-[#F59E0B]/80';
              if (idx % 3 === 2) color = 'from-purple-500/80 to-pink-500/80';
              const item = {
                id: act.id,
                name: act.name,
                image: act.image || '/gokart-night.png',
                icon: '🏎️',
                color
              };

              // Check for an active, valid offer to display a badge
              const todayStr = new Date().toISOString().split('T')[0];
              const activeOffer = (act.offers || []).find(
                o => o.isActive && o.validFrom <= todayStr && (!o.validUntil || o.validUntil >= todayStr)
              );

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 50, rotateX: 10 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{ duration: 0.6, delay: idx * 0.15, ease: "easeOut" }}
                  onClick={() => {
                    setActiveSubTab(item.id);
                    const actObj = activities.find(a => a.id === item.id);
                    if (actObj) {
                      setSelectedActivity(actObj);
                      if (actObj.packages && actObj.packages.length > 0) {
                        setBookingType('package');
                        setSelectedPackageId(actObj.packages[0].id);
                      } else {
                        setBookingType('standard');
                      }
                    }
                    setTimeout(() => {
                      contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                  className={`group relative h-[220px] w-full sm:w-[calc(50%-16px)] lg:w-[calc(33.333%-16px)] max-w-[360px] flex-1 min-w-[260px] rounded-3xl overflow-hidden cursor-pointer bg-[#0B1120]/80 backdrop-blur-xl border-2 transition-all duration-500 hover:shadow-[0_0_40px_rgba(20,241,217,0.2)] ${
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

                  {/* Active Offer Badge Overlay — shown only when there is a live offer */}
                  {activeOffer && (
                    <div className="absolute top-3 left-3 z-30 flex flex-col gap-1">
                      <div className="flex items-center gap-1 bg-gradient-to-r from-[#007B8B] to-[#00ABAB] text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-lg">
                        🏷️ {activeOffer.discountPercentage}% OFF
                      </div>
                      <div className="bg-black/70 backdrop-blur-sm text-white/90 text-[9px] font-mono px-2 py-0.5 rounded-full">
                        ₹{activeOffer.offerPrice} <span className="line-through text-white/50">₹{activeOffer.originalPrice}</span>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  <div className="absolute inset-0 z-20 flex flex-col justify-end p-6">
                    <h3 className="text-xl font-black text-white group-hover:text-[#14F1D9] transition-colors drop-shadow-md">
                      {item.name}
                    </h3>
                    {/* Live Package Pricing / Ticket Price */}
                    <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px] text-[#14F1D9] font-bold">
                      {act.packages && act.packages.length > 0 ? (
                        <span>Packages from ₹{Math.min(...act.packages.map(p => p.price))} ({act.packages.length} Plans)</span>
                      ) : (act.adultPrice !== undefined && act.adultPrice > 0) ? (
                        <span>Tickets from ₹{act.adultPrice}</span>
                      ) : null}
                    </div>
                    {/* Show shortDescription if available, otherwise skip */}
                    {act.shortDescription && (
                      <p className="text-[11px] text-white/70 mt-1 line-clamp-1">{act.shortDescription}</p>
                    )}
                    
                    {/* Shine Button Animation */}
                    <div className="mt-3 relative overflow-hidden rounded-xl bg-white/10 border border-white/20 px-4 py-2 text-xs font-bold text-white text-center w-full group-hover:bg-[#14F1D9] group-hover:text-[#050816] group-hover:border-[#14F1D9] transition-all duration-300">
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        Access Terminal <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </span>
                      <div className="absolute inset-0 -translate-x-full bg-white/40 skew-x-12 group-hover:animate-[shine_1s_ease-out]"></div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Anchor for scrolling to selected activity */}
      <div ref={contentRef} className="scroll-mt-24"></div>

      {activeSubTab === 'act-horse-riding' && <HorseRidingActivityPage onSuccessClose={() => setActiveSubTab('history')} />}
      {activeSubTab === 'act-air-gun' && <ShootingActivityPage onSuccessClose={() => setActiveSubTab('history')} />}
      {activeSubTab === 'act-go-karting' && <GoKartingActivityPage onSuccessClose={() => setActiveSubTab('history')} />}
      {/* Dynamic Activities */}
      {!['act-horse-riding', 'act-air-gun', 'act-go-karting', 'history'].includes(activeSubTab) && (
        <div className="p-6 md:p-8 glass-panel border border-[#14F1D9]/30 rounded-3xl space-y-6">
          {(() => {
            const dynamicAct = activities.find(a => a.id === activeSubTab);
            if (!dynamicAct) return null;
            const hasPackages = dynamicAct.packages && dynamicAct.packages.length > 0;

            // Find active offer for this activity
            const todayStr2 = new Date().toISOString().split('T')[0];
            const dynamicActiveOffer = (dynamicAct.offers || []).find(
              o => o.isActive && o.validFrom <= todayStr2 && (!o.validUntil || o.validUntil >= todayStr2)
            );

            return (
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-6 bg-[#14F1D9] rounded-full"></div>
                    <h2 className="text-2xl md:text-3xl font-black text-white">{dynamicAct.name}</h2>
                  </div>
                  <p className="text-[#9CA3AF] text-sm leading-relaxed">{dynamicAct.detailedDescription || dynamicAct.description}</p>

                  {/* Activity Meta Info */}
                  {(dynamicAct.duration || dynamicAct.ageRequirement) && (
                    <div className="flex flex-wrap gap-3">
                      {dynamicAct.duration && (
                        <div className="flex items-center gap-1.5 text-xs text-white/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                          ⏱️ {dynamicAct.duration}
                        </div>
                      )}
                      {dynamicAct.ageRequirement && (
                        <div className="flex items-center gap-1.5 text-xs text-white/70 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                          👥 {dynamicAct.ageRequirement}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Active Offer Banner */}
                  {dynamicActiveOffer && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-[#007B8B]/20 to-[#00ABAB]/20 border border-[#007B8B]/40">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-extrabold bg-[#007B8B] text-white px-2 py-0.5 rounded-full">🏷️ {dynamicActiveOffer.discountPercentage}% OFF</span>
                            <span className="text-xs font-bold text-[#40E0D0]">{dynamicActiveOffer.name}</span>
                          </div>
                          <p className="text-[11px] text-[#9CA3AF]">{dynamicActiveOffer.description}</p>
                          <p className="text-[10px] text-[#9CA3AF]/60 mt-1 font-mono">
                            Valid: {dynamicActiveOffer.validFrom} → {dynamicActiveOffer.validUntil}
                          </p>
                          {dynamicActiveOffer.termsAndConditions && (
                            <p className="text-[9px] text-[#9CA3AF]/50 mt-1">T&C: {dynamicActiveOffer.termsAndConditions}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[#9CA3AF] line-through text-sm font-mono">₹{dynamicActiveOffer.originalPrice}</span>
                          <div className="text-[#40E0D0] font-black text-2xl font-mono">₹{dynamicActiveOffer.offerPrice}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {hasPackages ? (
                    <div className="space-y-3 pt-2">
                      <h3 className="font-bold text-xs uppercase tracking-widest text-[#14F1D9]">Available Packages & Pricing</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {dynamicAct.packages!.map(pkg => (
                          <div
                            key={pkg.id}
                            onClick={() => {
                              setSelectedPackageId(pkg.id);
                              setBookingType('package');
                            }}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                              selectedPackageId === pkg.id && bookingType === 'package'
                                ? 'bg-[#14F1D9]/15 border-[#14F1D9] shadow-[0_0_20px_rgba(20,241,217,0.2)]'
                                : 'bg-[#050816]/60 border-white/10 hover:border-white/30'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <h4 className="font-black text-white text-sm">{pkg.name}</h4>
                              <span className="font-black font-mono text-[#14F1D9] text-base">₹{pkg.price}</span>
                            </div>
                            <p className="text-xs text-[#9CA3AF]">{pkg.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4 p-4 rounded-2xl bg-[#050816]/60 border border-white/10">
                      <div>
                        <span className="text-xs text-[#9CA3AF] block font-mono">Adult Ticket</span>
                        <span className="text-lg font-black text-white font-mono">₹{dynamicAct.adultPrice || 0}</span>
                      </div>
                      <div>
                        <span className="text-xs text-[#9CA3AF] block font-mono">Child Ticket</span>
                        <span className="text-lg font-black text-white font-mono">₹{dynamicAct.childPrice || 0}</span>
                      </div>
                    </div>
                  )}

                  {/* Rules & Safety */}
                  {(dynamicAct.rules && dynamicAct.rules.length > 0) && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-xs uppercase tracking-widest text-[#14F1D9] flex items-center gap-1.5">
                        🛡️ Rules & Safety Instructions
                      </h3>
                      <ul className="space-y-1.5">
                        {dynamicAct.rules.map((rule, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] text-[#9CA3AF]">
                            <span className="text-[#14F1D9] mt-0.5 flex-shrink-0">▸</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="w-full lg:w-96 bg-[#0B1120] p-6 rounded-2xl border border-white/10 space-y-4">
                  <h3 className="text-lg font-black text-white">Book Experience</h3>
                  <form onSubmit={(e) => {
                    setSelectedActivity(dynamicAct);
                    executeActivityBooking(e);
                  }} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Full Name"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#9CA3AF] focus:border-[#14F1D9] focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        placeholder="Email"
                        required
                        value={customerEmail}
                        onChange={e => setCustomerEmail(e.target.value)}
                        className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#9CA3AF] focus:border-[#14F1D9] focus:outline-none"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        required
                        value={customerPhone}
                        onChange={e => setCustomerPhone(e.target.value)}
                        className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#9CA3AF] focus:border-[#14F1D9] focus:outline-none"
                      />
                    </div>

                    {/* Interactive Reservation Calendar */}
                    <div className="space-y-3 pt-1">
                      <label className="text-[10px] uppercase font-mono font-bold text-[#14F1D9] block">
                        📅 Select Reservation Date
                      </label>
                      <ReservationCalendar
                        selectedDate={bookingDate}
                        onSelectDate={dateStr => setBookingDate(dateStr)}
                      />

                      {/* Time Slot Selection */}
                      <div className="space-y-1.5 pt-1">
                        <label className="text-[10px] uppercase font-mono font-bold text-[#9CA3AF] block">
                          ⏰ Select Time Slot
                        </label>
                        <select
                          value={selectedSlot}
                          onChange={e => setSelectedSlot(e.target.value)}
                          disabled={availableSlots.length === 0}
                          className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none font-mono disabled:opacity-50"
                        >
                          {availableSlots.length > 0 ? (
                            availableSlots.map(slot => (
                              <option key={slot} value={slot}>{slot}</option>
                            ))
                          ) : (
                            <option value="">No slots available</option>
                          )}
                        </select>
                      </div>

                      {availableSlots.length === 0 && (
                        <p className="text-red-400 text-[10px] mt-1 font-mono">No available slots for selected date. Please pick another date.</p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                      <span className="text-xs text-[#9CA3AF]">
                        Total
                      </span>
                      <span className="text-xl font-black font-mono text-[#14F1D9]">
                        ₹{(() => {
                          if (hasPackages) {
                            const p = dynamicAct.packages!.find(pkg => pkg.id === selectedPackageId) || dynamicAct.packages![0];
                            return p ? p.price * packageQuantity : 0;
                          }
                          return (adultCount * (dynamicAct.adultPrice || 0)) + (childCount * (dynamicAct.childPrice || 0));
                        })()}
                      </span>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 font-black text-xs uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all cursor-pointer shadow-lg bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] shadow-[0_0_15px_rgba(20,241,217,0.3)]"
                    >
                      Confirm Booking
                    </button>
                  </form>
                </div>
              </div>
            );
          })()}
        </div>
      )}



      {/* ----------------------------------------------------------------- */}
      {/* 3. HISTORY & WALLET SUB-TAB */}
      {/* ----------------------------------------------------------------- */}
      {activeSubTab === 'history' && (() => {
        const isStaffOrAdmin = currentUser && currentUser.role !== 'customer';
        const effectiveEmail = (
          historySearchEmail.trim() || 
          (isStaffOrAdmin ? '' : (currentUser?.email || customerEmail))
        ).toLowerCase();
        const userTickets = tickets.filter(t => !effectiveEmail || t.customerEmail?.toLowerCase().includes(effectiveEmail));
        const userOrders = orders.filter(o => !effectiveEmail || o.customerEmail?.toLowerCase().includes(effectiveEmail));

        return (
          <div className="space-y-6">
            
            {/* Email Data Retrieval Box for Guests & Members */}
            <div className="glass-panel p-4 rounded-2xl border border-[#00ABAB]/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#40E0D0]" /> Retrieve Booking Data & Admission Passes
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  {currentUser ? (isStaffOrAdmin ? `Logged in as authorized staff (${currentUser.email} - ${currentUser.role}). Showing shared records.` : `Showing verified member records for ${currentUser.email}`) : 'Enter your email below to retrieve guest tickets and food order status instantly.'}
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="Enter email to search..."
                  value={historySearchEmail}
                  onChange={e => setHistorySearchEmail(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-[#9CA3AF] focus:border-[#00ABAB] focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Active Gate passes with QR codes */}
            <div className="space-y-3">
              <span className="text-[10px] uppercase font-bold text-[#40E0D0] font-mono tracking-wider block">My Gate Admission Passes (QR Tickets)</span>
              {userTickets.length === 0 ? (
                <div className="text-center py-12 glass-panel border border-[#00ABAB]/30 rounded-2xl text-xs text-[#9CA3AF]">
                  {effectiveEmail ? `No active admission passes found for ${effectiveEmail}.` : 'No admission passes found. Enter your email above to look up passes.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {userTickets.map(ticket => {
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
                              Open Bill Receipt →
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
              {userOrders.length === 0 ? (
                <div className="text-center py-12 glass-panel border border-[#00ABAB]/30 rounded-2xl text-xs text-[#9CA3AF]">
                  No food orders found for {effectiveEmail || 'search query'}.
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrders.map(order => (
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
                          <span className="font-mono font-bold text-sm text-teal-950">₹{order.totalAmount.toFixed(2)}</span>
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
        );
      })()}





      {/* ----------------------------------------------------------------- */}
      {/* GLOBAL MOUNTED INVOICE MODAL LAUNCHERS */}
      {/* ----------------------------------------------------------------- */}
      {/* MEMBER LOGIN & REGISTER MODAL */}
      <AnimatePresence>
        {isMemberModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#050816]/90 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="glass-panel border border-[#14F1D9]/30 rounded-3xl shadow-[0_0_40px_rgba(20,241,217,0.2)] max-w-md w-full p-6 relative overflow-hidden text-white"
            >
              <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => { setMemberTab('login'); setMemberAuthError(null); }}
                    className={`font-black text-base pb-1 border-b-2 transition-all cursor-pointer ${
                      memberTab === 'login' ? 'border-[#14F1D9] text-[#14F1D9]' : 'border-transparent text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    Member Sign In
                  </button>
                  <button
                    onClick={() => { setMemberTab('register'); setMemberAuthError(null); }}
                    className={`font-black text-base pb-1 border-b-2 transition-all cursor-pointer ${
                      memberTab === 'register' ? 'border-[#14F1D9] text-[#14F1D9]' : 'border-transparent text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    New Registration
                  </button>
                </div>

                <button
                  onClick={() => setIsMemberModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {memberAuthError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs mb-4 flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{memberAuthError}</span>
                </div>
              )}

              {memberTab === 'login' ? (
                <form onSubmit={handleMemberLogin} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-[#9CA3AF] font-mono uppercase font-bold block mb-1">Cell No / Email ID</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={loginEmailOrPhone}
                        onChange={e => setLoginEmailOrPhone(e.target.value)}
                        placeholder="watson@baker.street or 9876543210"
                        className="w-full bg-[#050816] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#9CA3AF] font-mono uppercase font-bold block mb-1">Password</label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={e => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#050816] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black text-xs uppercase tracking-widest hover:scale-[1.01] transition-all cursor-pointer shadow-[0_0_15px_rgba(20,241,217,0.3)]"
                  >
                    Sign In
                  </button>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-gray-400 font-mono">OR</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      setMemberAuthError(null);
                      const defaultEmail = loginEmailOrPhone.trim() || 'customer@gmail.com';
                      const promptEmail = window.prompt('Sign in with Google - Enter your Google Account Email:', defaultEmail);
                      if (!promptEmail || !promptEmail.trim()) return;
                      const cleanEmail = promptEmail.trim().toLowerCase();
                      const userName = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                      let authUser: User | null = null;
                      try {
                        const res = await fetch('/api/auth/google', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: cleanEmail, name: userName, googleId: `gid_${Date.now()}` })
                        });
                        const data = await res.json();
                        if (data && data.success && data.user) {
                          authUser = data.user;
                        }
                      } catch (e) {
                        console.warn('Google Auth API call:', e);
                      }

                      if (!authUser) {
                        const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
                        if (existing) {
                          authUser = existing;
                        } else {
                          authUser = {
                            id: `usr-g-${Date.now()}`,
                            name: userName,
                            email: cleanEmail,
                            role: 'customer',
                            organizationId: 'org_deuce_default'
                          };
                          addUser(authUser);
                        }
                      }

                      setCurrentUser(authUser);
                      setIsMemberModalOpen(false);
                    }}
                    className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-400/40 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-3 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Continue with Google
                  </button>
                </form>
              ) : (
                <form onSubmit={handleMemberRegister} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-[#9CA3AF] font-mono uppercase font-bold block mb-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-[#050816] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#9CA3AF] font-mono uppercase font-bold block mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-[#050816] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#9CA3AF] font-mono uppercase font-bold block mb-1">Cell No / Phone Number</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
                      <input
                        type="tel"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full bg-[#050816] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#9CA3AF] font-mono uppercase font-bold block mb-1">Set Password</label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#050816] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#9CA3AF] font-mono uppercase font-bold block mb-1">Confirm Password</label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        value={regConfirmPassword}
                        onChange={e => setRegConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#050816] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:border-[#14F1D9] focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black text-xs uppercase tracking-widest hover:scale-[1.01] transition-all cursor-pointer shadow-[0_0_15px_rgba(20,241,217,0.3)]"
                  >
                    Create Member Account
                  </button>
                </form>
              )}

              <div className="mt-4 pt-3 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => setIsMemberModalOpen(false)}
                  className="text-xs text-[#9CA3AF] hover:text-white font-bold transition-colors cursor-pointer"
                >
                  Continue as Guest →
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};








