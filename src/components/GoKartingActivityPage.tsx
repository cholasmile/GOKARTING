import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, Clock, Shield, Flag, Award, Gauge,
  ArrowRight, Check, X, CreditCard, AlertTriangle, Play, Minus, Plus,
  Info, ChevronRight, Zap, Target, MapPin, Navigation, Compass, Radio, Wifi,
  Printer, Percent, Tag, DollarSign, Trash2, PlusCircle, Ticket as TicketIcon, Eye, CheckCircle2
} from 'lucide-react';
import { printTicket } from '../lib/printTicket';
import TicketPass from './TicketPass';
import { ReservationCalendar } from './ReservationCalendar';
import { getAvailableTimeSlots, getTodayDateString, isPastDate } from '../lib/slotUtils';

interface KartType {
  id: string;
  name: string;
  engine: string;
  topSpeed: number;
  accel: number;
  desc: string;
  image: string;
}

interface KartPackage {
  id: string;
  name: string;
  price: number;
  description: string;
}

interface ActivityPageProps {
  onSuccessClose?: () => void;
}

export const GoKartingActivityPage: React.FC<ActivityPageProps> = ({ onSuccessClose }) => {
  const { createBooking, timeSlots, activities, razorpayKeyId } = useAppContext();
  const kartingActivity = activities.find(a => a.id === 'act-go-karting');

  const karts: KartType[] = [
    { id: 'kart-gt', name: 'GT Pro 200cc', engine: 'Honda GX200 Gasoline', topSpeed: 75, accel: 4.5, desc: 'Classic high-torque gasoline engine with incredible mechanical drift throttle response.', image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=400&q=80' },
    { id: 'kart-sodi', name: 'Sodi Sport 160cc', engine: 'Sodi GX160 Premium', topSpeed: 60, accel: 5.2, desc: 'Extremely forgiving handling, perfect for kids, amateurs, and learning apex lines.', image: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80' },
    { id: 'kart-volt', name: 'Storm Volt Electric', engine: 'Dual Lithium High-Torque', topSpeed: 82, accel: 3.7, desc: 'Eco-friendly hyper-acceleration with boost buttons and computerized vectoring.', image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=400&q=80' }
  ];

  const defaultKartPackages: KartPackage[] = [
    { id: 'pkg-kart-single', name: 'Single Kart (10 Mins)', price: 100, description: 'Single-seater pro-kart session with lap timing.' },
    { id: 'pkg-kart-double', name: 'Double Kart (10 Mins)', price: 150, description: 'Twin-seater tandem kart for dual riders.' },
    { id: 'pkg-kart-race', name: 'Grand Prix Tournament (30 Mins)', price: 250, description: 'Warm-up, qualifying session, and 8-lap medal race.' }
  ];

  const basePackages: KartPackage[] = (kartingActivity?.packages && kartingActivity.packages.length > 0)
    ? kartingActivity.packages
    : defaultKartPackages;

  const [customPackages, setCustomPackages] = useState<KartPackage[]>([]);
  const allPackages: KartPackage[] = [...basePackages, ...customPackages];

  const [selectedKart, setSelectedKart] = useState<KartType>(karts[0]);

  // Quantities per package in this single ticket: { [packageId]: quantity }
  const [packageQuantities, setPackageQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const single = basePackages.find(p => p.id.includes('single') || p.name.toLowerCase().includes('single')) || basePackages[0];
    if (single) {
      initial[single.id] = 1;
    }
    return initial;
  });

  // Provision for "Add Package Option" selector & custom package creator
  const [selectedPkgToAdd, setSelectedPkgToAdd] = useState<string>('');
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);
  const [newCustomName, setNewCustomName] = useState<string>('');
  const [newCustomPrice, setNewCustomPrice] = useState<number>(100);
  const [newCustomDesc, setNewCustomDesc] = useState<string>('');

  // ── Discount State: Custom % and Custom Cash ₹ ──
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'cash'>('none');
  const [customDiscountPct, setCustomDiscountPct] = useState<number>(0);
  const [customCashDiscount, setCustomCashDiscount] = useState<number>(0);

  // Sync package changes if base packages change
  useEffect(() => {
    if (basePackages.length > 0) {
      setPackageQuantities(prev => {
        const hasAny = Object.values(prev).some(qty => qty > 0);
        if (!hasAny) {
          const single = basePackages.find(p => p.id.includes('single') || p.name.toLowerCase().includes('single')) || basePackages[0];
          return { [single.id]: 1 };
        }
        return prev;
      });
    }
  }, [kartingActivity?.packages]);
  const [bookingQuantity, setBookingQuantity] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(() => getTodayDateString());

  const availableSlots = getAvailableTimeSlots(bookingDate);
  const [selectedSlot, setSelectedSlot] = useState<string>(() => availableSlots[0] || '');

  React.useEffect(() => {
    if (availableSlots.length > 0) {
      if (!availableSlots.includes(selectedSlot)) {
        setSelectedSlot(availableSlots[0]);
      }
    } else {
      setSelectedSlot('');
    }
  }, [bookingDate, availableSlots.length]);

  const [tireCompound, setTireCompound] = useState<'soft' | 'medium' | 'drift'>('medium');
  const [aeroWing, setAeroWing] = useState<'high' | 'balanced' | 'low'>('balanced');
  const [boostEnabled, setBoostEnabled] = useState<boolean>(false);

  const [isSimulating, setIsSimulating] = useState(false);
  const [simLapTime, setSimLapTime] = useState<string | null>(null);
  const [gpsTab, setGpsTab] = useState<'track' | 'telemetry'>('track');
  const [selectedTrackKart, setSelectedTrackKart] = useState<number>(1);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'net_banking' | 'cash' | 'complimentary'>('upi');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  const [showPassModal, setShowPassModal] = useState<boolean>(false);

  // ── Package manipulation handlers ──
  const updatePackageQty = (pkgId: string, delta: number) => {
    setPackageQuantities(prev => {
      const current = prev[pkgId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[pkgId];
        return copy;
      }
      return { ...prev, [pkgId]: next };
    });
  };

  const removePackage = (pkgId: string) => {
    setPackageQuantities(prev => {
      const copy = { ...prev };
      delete copy[pkgId];
      return copy;
    });
  };

  const handleAddPackageOption = (pkgId: string, qty: number = 1) => {
    if (!pkgId) return;
    setPackageQuantities(prev => ({
      ...prev,
      [pkgId]: (prev[pkgId] || 0) + qty
    }));
  };

  const handleCreateCustomPackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomName.trim()) return;
    const newId = `pkg-custom-${Date.now()}`;
    const newPkg: KartPackage = {
      id: newId,
      name: newCustomName.trim(),
      price: Math.max(0, Number(newCustomPrice) || 0),
      description: newCustomDesc.trim() || 'Custom Karting Package'
    };
    setCustomPackages(prev => [...prev, newPkg]);
    setPackageQuantities(prev => ({ ...prev, [newId]: 1 }));
    setNewCustomName('');
    setNewCustomPrice(100);
    setNewCustomDesc('');
    setShowAddCustomModal(false);
  };

  // ── Compute Active Packages, Quantities, Subtotal, and Discounts ──
  const activePackageItems = allPackages
    .filter(pkg => (packageQuantities[pkg.id] || 0) > 0)
    .map(pkg => ({
      ...pkg,
      quantity: packageQuantities[pkg.id] || 0,
      subtotal: pkg.price * (packageQuantities[pkg.id] || 0)
    }));

  const totalRacers = activePackageItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalAmount = activePackageItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Discount calculation
  let activeDiscountPct = 0;
  let discountAmount = 0;
  if (discountType === 'percentage') {
    activeDiscountPct = Math.min(100, Math.max(0, Number(customDiscountPct) || 0));
    discountAmount = Math.round((subtotalAmount * activeDiscountPct) / 100);
  } else if (discountType === 'cash') {
    discountAmount = Math.min(subtotalAmount, Math.max(0, Number(customCashDiscount) || 0));
    activeDiscountPct = subtotalAmount > 0 ? Math.round((discountAmount / subtotalAmount) * 100) : 0;
  }

  const grandTotal = (paymentMethod === 'complimentary' || totalRacers === 0) 
    ? 0 
    : Math.max(0, subtotalAmount - discountAmount);

  const calculateTuningSpecs = () => {
    let topSpeed = selectedKart.topSpeed;
    let accel = selectedKart.accel;
    let grip = 50;
    let driftFactor = 50;

    if (tireCompound === 'soft') {
      topSpeed -= 2; accel -= 0.3; grip = 90; driftFactor = 15;
    } else if (tireCompound === 'drift') {
      topSpeed += 3; accel += 0.4; grip = 20; driftFactor = 95;
    }

    if (aeroWing === 'high') {
      topSpeed -= 5; grip += 15;
    } else if (aeroWing === 'low') {
      topSpeed += 6; grip -= 15;
    }

    if (boostEnabled) {
      topSpeed += 8; accel -= 0.6;
    }

    let lapTime = 48.2;
    lapTime -= (topSpeed - 60) * 0.15;
    lapTime += (accel - 3.5) * 0.8;
    lapTime -= (grip / 100) * 2.5;

    return {
      topSpeed: Math.round(topSpeed),
      accel: parseFloat(accel.toFixed(2)),
      grip,
      driftFactor,
      lapTime: lapTime.toFixed(3)
    };
  };

  const currentSpecs = calculateTuningSpecs();

  const handleSimulateLap = () => {
    setIsSimulating(true);
    setSimLapTime(null);
    setTimeout(() => {
      setSimLapTime(currentSpecs.lapTime);
      setIsSimulating(false);
    }, 1800);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessBooking(null);

    if (activePackageItems.length === 0 || totalRacers === 0) {
      setErrorMessage('Please add at least one package (Single Kart, Double Kart, etc.) to your ticket.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Full Name and Phone Number are required.');
      return;
    }

    if (isPastDate(bookingDate)) {
      setErrorMessage('Booking for past dates is not allowed. Please select today or a future date.');
      return;
    }

    if (!selectedSlot || !availableSlots.includes(selectedSlot)) {
      setErrorMessage('Please select a valid available time slot.');
      return;
    }

    const pkgText = activePackageItems.map(p => `${p.quantity}x ${p.name} (₹${p.subtotal})`).join(' + ');
    const details = `Packages: ${pkgText} | Setup: ${tireCompound.toUpperCase()} Tires, ${aeroWing.toUpperCase()} Wing`;

    const finalizeBooking = () => {
      const result = createBooking({
        customerName, customerPhone, customerEmail,
        activityId: 'act-go-karting',
        activityName: 'High-Octane Go-Karting',
        date: bookingDate,
        timeSlot: selectedSlot,
        ticketType: paymentMethod === 'complimentary' 
          ? 'Complimentary VIP Pass' 
          : (activePackageItems.length > 1 ? 'Multi-Package Pass' : activePackageItems[0].name),
        details,
        quantity: totalRacers,
        originalAmount: subtotalAmount,
        discountType,
        discountPercentage: activeDiscountPct,
        discountAmount,
        totalAmount: paymentMethod === 'complimentary' ? 0 : grandTotal,
        paymentMethod,
        packageId: activePackageItems[0]?.id,
        isPackageBundle: activePackageItems.length > 1,
        packageBundleItems: activePackageItems.map(p => ({
          packageId: p.id,
          packageName: p.name,
          quantity: p.quantity,
          unitPrice: p.price,
          subtotal: p.subtotal,
          unitOrDuration: p.description
        }))
      });
  
      if (typeof result === 'string') {
        setErrorMessage(result);
      } else {
        setSuccessBooking(result);
      }
    };

    if (paymentMethod === 'complimentary' || paymentMethod === 'cash' || (paymentMethod !== 'upi' && paymentMethod !== 'card' && paymentMethod !== 'net_banking')) {
      finalizeBooking();
      return;
    }

    try {
      if (!navigator.onLine) {
        throw new Error('Online payments are not available offline. Please use Cash or another offline payment method.');
      }

      // 1. Create order on backend
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: grandTotal, currency: 'INR' })
      });
      const order = await orderResponse.json();

      // 2. Open Razorpay Modal
      const options = {
        key: razorpayKeyId || (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || '',
        amount: order.amount,
        currency: order.currency,
        name: 'Deuce Adventure Park',
        description: 'Go-Karting Booking',
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
             finalizeBooking();
          } else {
             setErrorMessage('Payment verification failed: ' + verifyData.message);
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
         setErrorMessage(response.error.description);
      });
      rzp1.open();
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment initialization failed');
    }
  };


  return (
    <>
      <div className="w-full flex flex-col gap-5 pb-6 font-sans text-slate-100 h-full print:hidden">

      {/* 50:50 COLUMNS */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
        
        {/* LEFT COLUMN: KARTS, TUNING, SIMULATOR */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-5 h-full overflow-y-auto pr-2 custom-scrollbar">
          


          {/* 3. TUNING & TELEMETRY */}
          <section className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-[#00B4FF] rounded-full shadow-[0_0_5px_#00B4FF]"></div>
              <h2 className="text-lg font-black text-white tracking-tight">Pitlane Config</h2>
            </div>
            
            <div className="glass-panel p-4 rounded-xl border border-white/10 shadow-lg relative overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {/* Tires */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                      <Target className="w-3 h-3 text-[#14F1D9]" /> Tire Compound
                    </label>
                    <span className="text-[9px] text-white/40 font-mono tracking-wider">GRIP/WEAR</span>
                  </div>
                  <div className="flex bg-[#050816] rounded-lg p-1 border border-white/5">
                    {(['soft', 'medium', 'drift'] as const).map(cmp => (
                      <button
                        key={cmp}
                        onClick={() => setTireCompound(cmp)}
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                          tireCompound === cmp 
                            ? 'bg-[#14F1D9]/15 text-[#14F1D9] border border-[#14F1D9]/40 shadow-[0_0_10px_rgba(20,241,217,0.15)]' 
                            : 'text-[#9CA3AF] hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {cmp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aero */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                      <Flag className="w-3 h-3 text-[#00B4FF]" /> Aerodynamics
                    </label>
                    <span className="text-[9px] text-white/40 font-mono tracking-wider">DOWNFORCE</span>
                  </div>
                  <div className="flex bg-[#050816] rounded-lg p-1 border border-white/5">
                    {(['high', 'balanced', 'low'] as const).map(wing => (
                      <button
                        key={wing}
                        onClick={() => setAeroWing(wing)}
                        className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                          aeroWing === wing 
                            ? 'bg-[#00B4FF]/15 text-[#00B4FF] border border-[#00B4FF]/40 shadow-[0_0_10px_rgba(0,180,255,0.15)]' 
                            : 'text-[#9CA3AF] hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        {wing}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4 & 7. PERFORMANCE ANALYTICS & GPS LIVE TRACKING */}
          <section className="flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-[#14F1D9] rounded-full shadow-[0_0_8px_#14F1D9]"></div>
                <h2 className="text-lg font-black text-white tracking-tight">GPS Live Tracking & Simulator</h2>
              </div>
              
              <div className="flex gap-1 bg-[#050816] p-1 rounded-lg border border-white/10 text-[10px] font-mono font-bold">
                <button
                  onClick={() => setGpsTab('track')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    gpsTab === 'track' ? 'bg-[#14F1D9] text-[#0B1120] font-black' : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  <Navigation className="w-3 h-3" /> GPS Track
                </button>
                <button
                  onClick={() => setGpsTab('telemetry')}
                  className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                    gpsTab === 'telemetry' ? 'bg-[#14F1D9] text-[#0B1120] font-black' : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  <Gauge className="w-3 h-3" /> Telemetry
                </button>
              </div>
            </div>
            
            <div className="glass-panel p-[1px] rounded-xl border border-white/10 overflow-hidden relative group shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-[#14F1D9]/10 via-[#00B4FF]/5 to-[#FFB703]/10 opacity-60"></div>
              
              <div className="relative bg-[#0B1120]/90 backdrop-blur-xl rounded-[11px] p-4">
                
                {/* GPS LIVE TRACK VISUALIZER TAB */}
                {gpsTab === 'track' ? (
                  <div>
                    {/* Live GPS Lock Banner */}
                    <div className="flex items-center justify-between gap-2 p-2.5 bg-[#050816] rounded-lg border border-[#14F1D9]/30 mb-3 text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <div className="relative flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 z-10"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 absolute animate-ping opacity-75"></div>
                        </div>
                        <div>
                          <span className="font-black text-emerald-400 text-[10px] uppercase block leading-none">GPS Live Tracking Active</span>
                          <span className="text-[9px] text-[#9CA3AF] font-bold">12.5841° N, 78.6322° E • 12 Satellites</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black border border-emerald-500/40 uppercase">
                        RTK-GPS (±0.1m)
                      </span>
                    </div>

                    {/* Interactive Animated Track Blueprint Map */}
                    <div className="relative w-full h-40 bg-[#050816] rounded-lg border border-white/10 overflow-hidden flex items-center justify-center mb-3">
                      {/* Grid Background Lines */}
                      <div className="absolute inset-0 bg-[radial-gradient(#14F1D9_1px,transparent_1px)] [background-size:16px_16px] opacity-10"></div>
                      
                      {/* Yelagiri Circuit Track Vector SVG */}
                      <svg className="w-full h-full p-3 text-[#14F1D9]/30" viewBox="0 0 300 140" fill="none">
                        {/* Track Outer Curve */}
                        <path 
                          d="M 30 70 C 30 20, 90 20, 150 40 C 210 60, 270 20, 270 70 C 270 120, 200 120, 140 100 C 80 80, 30 120, 30 70 Z" 
                          stroke="currentColor" 
                          strokeWidth="14" 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                        />
                        {/* Track Center Line */}
                        <path 
                          d="M 30 70 C 30 20, 90 20, 150 40 C 210 60, 270 20, 270 70 C 270 120, 200 120, 140 100 C 80 80, 30 120, 30 70 Z" 
                          stroke="#14F1D9" 
                          strokeWidth="2" 
                          strokeDasharray="4 4" 
                        />

                        {/* Animated Live GPS Karts on Track */}
                        {/* Kart #01 */}
                        <g>
                          <circle cx="150" cy="40" r="6" fill="#14F1D9" className="animate-pulse" />
                          <circle cx="150" cy="40" r="12" fill="#14F1D9" opacity="0.2" className="animate-ping" />
                          <text x="150" y="24" fill="#14F1D9" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">KART #01 (GT Pro)</text>
                        </g>

                        {/* Kart #02 */}
                        <g>
                          <circle cx="240" cy="95" r="5" fill="#FFB703" />
                          <text x="240" y="112" fill="#FFB703" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">KART #02</text>
                        </g>
                      </svg>

                      {/* GPS Telemetry Legend Overlay */}
                      <div className="absolute bottom-2 left-2 flex gap-2 font-mono text-[9px]">
                        <span className="bg-[#0B1120]/90 px-2 py-0.5 rounded border border-white/10 text-white font-bold flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-[#14F1D9]" /> Yelagiri Track (850m)
                        </span>
                      </div>
                    </div>

                    {/* Active Kart GPS Telemetry Strip */}
                    <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
                      <div className="p-2 bg-[#050816] rounded-lg border border-white/5">
                        <span className="text-[#9CA3AF] text-[8px] uppercase block">Live GPS Speed</span>
                        <span className="text-[#14F1D9] font-black text-xs">{currentSpecs.topSpeed} KM/H</span>
                      </div>
                      <div className="p-2 bg-[#050816] rounded-lg border border-white/5">
                        <span className="text-[#9CA3AF] text-[8px] uppercase block">Sector 1 Split</span>
                        <span className="text-[#FFB703] font-black text-xs">14.28s</span>
                      </div>
                      <div className="p-2 bg-[#050816] rounded-lg border border-white/5">
                        <span className="text-[#9CA3AF] text-[8px] uppercase block">GPS Accuracy</span>
                        <span className="text-emerald-400 font-black text-xs">0.12m</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* TELEMETRY & SIMULATOR TAB */
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-mono text-[9px] text-[#9CA3AF] uppercase tracking-widest mb-0.5">Live Telemetry</h3>
                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-red-500 z-10"></div>
                            <div className="w-2 h-2 rounded-full bg-red-500 absolute animate-ping opacity-75"></div>
                          </div>
                          <span className="font-black text-white text-xs tracking-tight uppercase">System Online</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setBoostEnabled(!boostEnabled)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-black font-mono text-[10px] uppercase tracking-wider border transition-all duration-300 cursor-pointer ${
                          boostEnabled 
                            ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                            : 'bg-[#050816] text-[#9CA3AF] border-white/10 hover:border-white/30 hover:text-white'
                        }`}
                      >
                        <Zap className={`w-3 h-3 ${boostEnabled ? 'fill-red-400 text-red-400' : ''}`} />
                        Kers {boostEnabled ? 'ON' : 'OFF'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black font-mono tracking-wider">
                          <span className="text-[#9CA3AF] uppercase">Speed</span>
                          <span className="text-[#14F1D9]">{currentSpecs.topSpeed}</span>
                        </div>
                        <div className="h-1 w-full bg-[#050816] rounded-full overflow-hidden border border-white/5">
                          <motion.div className="h-full bg-gradient-to-r from-[#14F1D9]/50 to-[#14F1D9] shadow-[0_0_5px_#14F1D9]" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (currentSpecs.topSpeed / 90) * 100)}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black font-mono tracking-wider">
                          <span className="text-[#9CA3AF] uppercase">Accel</span>
                          <span className="text-[#00B4FF]">{currentSpecs.accel}s</span>
                        </div>
                        <div className="h-1 w-full bg-[#050816] rounded-full overflow-hidden border border-white/5">
                          <motion.div className="h-full bg-gradient-to-r from-[#00B4FF]/50 to-[#00B4FF] shadow-[0_0_5px_#00B4FF]" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (6 / currentSpecs.accel) * 100)}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black font-mono tracking-wider">
                          <span className="text-[#9CA3AF] uppercase">Grip</span>
                          <span className="text-[#FFB703]">{currentSpecs.grip}%</span>
                        </div>
                        <div className="h-1 w-full bg-[#050816] rounded-full overflow-hidden border border-white/5">
                          <motion.div className="h-full bg-gradient-to-r from-[#FFB703]/50 to-[#FFB703] shadow-[0_0_5px_#FFB703]" initial={{ width: 0 }} animate={{ width: `${currentSpecs.grip}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-black font-mono tracking-wider">
                          <span className="text-[#9CA3AF] uppercase">Drift</span>
                          <span className="text-purple-400">{currentSpecs.driftFactor}%</span>
                        </div>
                        <div className="h-1 w-full bg-[#050816] rounded-full overflow-hidden border border-white/5">
                          <motion.div className="h-full bg-gradient-to-r from-purple-500/50 to-purple-500 shadow-[0_0_5px_#a855f7]" initial={{ width: 0 }} animate={{ width: `${currentSpecs.driftFactor}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 p-3 bg-[#050816] rounded-lg border border-white/5 shadow-inner">
                      <div>
                        <span className="text-[9px] text-[#9CA3AF] uppercase tracking-widest font-mono font-bold block mb-1">Est. Lap Time</span>
                        <div className="text-2xl md:text-3xl font-black font-mono tracking-tighter text-white">
                          {simLapTime ? (
                            <motion.span initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[#14F1D9] drop-shadow-[0_0_10px_rgba(20,241,217,0.5)]">
                              {simLapTime}<span className="text-lg text-white/40">s</span>
                            </motion.span>
                          ) : (
                            <span className="text-white/10">--.---<span className="text-lg">s</span></span>
                          )}
                        </div>
                      </div>
                      
                      <button onClick={handleSimulateLap} disabled={isSimulating} className="relative group overflow-hidden rounded-lg bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] p-[1.5px] disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(20,241,217,0.2)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative px-4 py-2 bg-[#0B1120] rounded-lg flex items-center justify-center gap-2 group-hover:bg-transparent transition-colors duration-300">
                          {isSimulating ? (
                            <span className="font-black text-white font-mono uppercase tracking-widest text-[10px] flex items-center gap-2">
                              <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                              Simulating...
                            </span>
                          ) : (
                            <>
                              <Play className="w-3 h-3 text-white fill-white group-hover:text-[#0B1120] group-hover:fill-[#0B1120] transition-colors" />
                              <span className="font-black text-white group-hover:text-[#0B1120] font-mono uppercase tracking-widest text-[10px] transition-colors">
                                Run Lap
                              </span>
                            </>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: BOOKING & PACKAGES */}
        <div className="flex-1 min-w-0 flex flex-col gap-5 h-full overflow-y-auto pr-2 custom-scrollbar">
            
          {/* 5. PACKAGE SELECTION & ADD PACKAGE PROVISION */}
          <div className="glass-panel p-4 rounded-xl border border-white/10 shadow-lg flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-sm text-white flex items-center gap-2 tracking-tight">
                <Award className="w-4 h-4 text-[#FFB703]" /> Packages in Ticket
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#14F1D9]/15 text-[#14F1D9] px-2.5 py-0.5 rounded-full border border-[#14F1D9]/30">
                {totalRacers} {totalRacers === 1 ? 'Racer / Kart' : 'Racers / Karts'}
              </span>
            </div>

            <div className="space-y-3">
              {activePackageItems.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold text-center font-mono">
                  No packages currently selected in this ticket. Please add Single Kart or Double Kart below.
                </div>
              ) : (
                <div className="space-y-2">
                  {activePackageItems.map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-[#050816] border border-[#14F1D9]/30 flex flex-col gap-2 hover:border-[#14F1D9]/50 transition-all shadow-inner"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-xs text-white truncate">{item.name}</h4>
                            <span className="font-black font-mono text-[11px] text-[#14F1D9] bg-[#14F1D9]/10 px-2 py-0.5 rounded border border-[#14F1D9]/30">
                              ₹{item.price} / kart
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-[9px] text-[#9CA3AF] line-clamp-1 mt-0.5">{item.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removePackage(item.id)}
                          className="text-[#9CA3AF] hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                          title="Remove from ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-[#9CA3AF] uppercase font-bold">Qty:</span>
                          <div className="flex items-center gap-1.5 bg-[#0B1120] px-2 py-0.5 rounded-lg border border-white/10">
                            <button
                              type="button"
                              onClick={() => updatePackageQty(item.id, -1)}
                              className="w-5 h-5 flex items-center justify-center rounded bg-white/5 text-white hover:bg-white/20 transition-colors cursor-pointer"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center font-black text-white">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updatePackageQty(item.id, 1)}
                              className="w-5 h-5 flex items-center justify-center rounded bg-white/5 text-white hover:bg-[#14F1D9] hover:text-[#0B1120] transition-colors cursor-pointer"
                              title="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[#9CA3AF] mr-1.5">{item.quantity} × ₹{item.price} =</span>
                          <span className="font-black text-[#14F1D9] text-sm">₹{item.subtotal}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── PROVISION FOR ADD PACKAGE OPTION ── */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#14F1D9] uppercase tracking-wider block font-bold flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5" /> Add Package Option
                  </span>
                  <span className="text-[9px] text-[#9CA3AF] font-mono">Book Single & Double Kart Together</span>
                </div>

                {/* Quick Add Buttons for Single Kart & Double Kart */}
                <div className="grid grid-cols-2 gap-2 font-mono">
                  {(() => {
                    const singlePkg = allPackages.find(p => p.id.includes('single') || p.name.toLowerCase().includes('single'));
                    const doublePkg = allPackages.find(p => p.id.includes('double') || p.name.toLowerCase().includes('double'));
                    return (
                      <>
                        {singlePkg && (
                          <button
                            type="button"
                            onClick={() => handleAddPackageOption(singlePkg.id, 1)}
                            className="p-2.5 rounded-xl bg-[#050816] border border-[#14F1D9]/40 hover:border-[#14F1D9] text-left transition-all group cursor-pointer shadow-sm"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black text-[#14F1D9] block truncate">+ Single Kart</span>
                              <span className="text-[9px] font-bold text-white bg-white/10 px-1 rounded font-mono">
                                {packageQuantities[singlePkg.id] || 0} in tkt
                              </span>
                            </div>
                            <span className="text-[10px] text-[#9CA3AF]">₹{singlePkg.price} / kart</span>
                          </button>
                        )}
                        {doublePkg && (
                          <button
                            type="button"
                            onClick={() => handleAddPackageOption(doublePkg.id, 1)}
                            className="p-2.5 rounded-xl bg-[#050816] border border-amber-500/40 hover:border-amber-400 text-left transition-all group cursor-pointer shadow-sm"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black text-[#FFB703] block truncate">+ Double Kart</span>
                              <span className="text-[9px] font-bold text-white bg-white/10 px-1 rounded font-mono">
                                {packageQuantities[doublePkg.id] || 0} in tkt
                              </span>
                            </div>
                            <span className="text-[10px] text-[#9CA3AF]">₹{doublePkg.price} / kart</span>
                          </button>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Dropdown to add any available or custom package */}
                <div className="flex gap-2">
                  <select
                    value={selectedPkgToAdd}
                    onChange={e => setSelectedPkgToAdd(e.target.value)}
                    className="flex-1 bg-[#050816] text-white border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-[#14F1D9] outline-none font-mono"
                  >
                    <option value="">-- Select Any Package to Add --</option>
                    {allPackages.map(pkg => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name} — ₹{pkg.price} {(packageQuantities[pkg.id] || 0) > 0 ? `(Already ${packageQuantities[pkg.id]}x)` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedPkgToAdd}
                    onClick={() => {
                      if (selectedPkgToAdd) {
                        handleAddPackageOption(selectedPkgToAdd, 1);
                        setSelectedPkgToAdd('');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black text-xs uppercase font-mono disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                <div className="flex justify-between items-center pt-1 text-[10px] font-mono">
                  <span className="text-[#9CA3AF]">Package Subtotal:</span>
                  <span className="text-[#14F1D9] font-black">₹{subtotalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. BOOKING & RESERVATION PANEL WITH CUSTOM CASH & PERCENT DISCOUNT */}
          <div className="glass-panel p-4 md:p-5 rounded-xl border border-[#14F1D9]/30 relative overflow-hidden shadow-[0_0_20px_rgba(20,241,217,0.1)] flex-1 flex flex-col">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#14F1D9]/20 rounded-full blur-[40px] pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-lg text-white tracking-tight">Reservation</h3>
              <div className="flex items-center gap-1.5 bg-[#050816] px-2.5 py-1 rounded-lg border border-white/10 font-mono text-[10px]">
                <span className="text-[#9CA3AF]">Selected:</span>
                <span className="text-[#14F1D9] font-black">{totalRacers} Racers ({activePackageItems.length} Pkgs)</span>
              </div>
            </div>
            
            <form className="flex-1 flex flex-col justify-between" onSubmit={(e) => e.preventDefault()}>
              
              <div className="space-y-3">
              
              <div className="space-y-2">
                <div className="relative">
                  <input type="text" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-[#050816] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-transparent peer focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9]/50 focus:outline-none transition-all text-xs" placeholder="Name" id="name" />
                  <label htmlFor="name" className="absolute left-3 -top-2 bg-[#0B1120] px-1 text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest peer-focus:text-[#14F1D9] transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-[11px] peer-placeholder-shown:bg-transparent peer-placeholder-shown:font-medium peer-focus:-top-2 peer-focus:text-[9px] peer-focus:bg-[#0B1120] peer-focus:font-black">Full Name</label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <input type="email" required value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full bg-[#050816] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-transparent peer focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9]/50 focus:outline-none transition-all text-xs" placeholder="Email" id="email" />
                    <label htmlFor="email" className="absolute left-3 -top-2 bg-[#0B1120] px-1 text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest peer-focus:text-[#14F1D9] transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-[11px] peer-placeholder-shown:bg-transparent peer-placeholder-shown:font-medium peer-focus:-top-2 peer-focus:text-[9px] peer-focus:bg-[#0B1120] peer-focus:font-black">Email</label>
                  </div>
                  <div className="relative">
                    <input type="tel" required value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-[#050816] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-transparent peer focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9]/50 focus:outline-none transition-all text-xs" placeholder="Phone" id="phone" />
                    <label htmlFor="phone" className="absolute left-3 -top-2 bg-[#0B1120] px-1 text-[9px] font-black text-[#9CA3AF] uppercase tracking-widest peer-focus:text-[#14F1D9] transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-[11px] peer-placeholder-shown:bg-transparent peer-placeholder-shown:font-medium peer-focus:-top-2 peer-focus:text-[9px] peer-focus:bg-[#0B1120] peer-focus:font-black">Phone</label>
                  </div>
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
                    <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)} disabled={availableSlots.length === 0} className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9]/50 focus:outline-none transition-all font-mono text-xs cursor-pointer disabled:opacity-50">
                      {availableSlots.length > 0 ? (
                        availableSlots.map((slot, idx) => (
                          <option key={idx} value={slot}>{slot}</option>
                        ))
                      ) : (
                        <option value="">No slots available</option>
                      )}
                    </select>
                  </div>
                  {availableSlots.length === 0 && (
                    <p className="text-red-400 text-[10px] font-mono mt-1">No available slots for selected date. Please pick another date.</p>
                  )}
                </div>
              </div>

              {/* ── DISCOUNT PROVISION: CUSTOM CASH DISCOUNT & CUSTOM PERCENTAGE DISCOUNT ── */}
              <div className="p-3 bg-[#050816] rounded-xl border border-white/10 space-y-2.5 font-mono">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-[#14F1D9] flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Discount Provision
                  </label>
                  {discountAmount > 0 && (
                    <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                      {discountType === 'cash' ? `₹${discountAmount} CASH OFF` : `${activeDiscountPct}% OFF (-₹${discountAmount})`}
                    </span>
                  )}
                </div>

                {/* Discount Type Selector Buttons */}
                <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDiscountType('none')}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      discountType === 'none'
                        ? 'bg-white/10 text-white border-white/40 font-black'
                        : 'bg-transparent text-[#9CA3AF] border-white/5 hover:border-white/20'
                    }`}
                  >
                    No Discount
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('percentage');
                      if (customDiscountPct === 0) setCustomDiscountPct(10);
                    }}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      discountType === 'percentage'
                        ? 'bg-[#14F1D9] text-[#0B1120] border-[#14F1D9] font-black shadow-[0_0_10px_rgba(20,241,217,0.3)]'
                        : 'bg-transparent text-cyan-300 border-white/5 hover:border-cyan-500/30'
                    }`}
                  >
                    % Custom Percent
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('cash');
                      if (customCashDiscount === 0) setCustomCashDiscount(50);
                    }}
                    className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                      discountType === 'cash'
                        ? 'bg-emerald-400 text-[#0B1120] border-emerald-400 font-black shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                        : 'bg-transparent text-emerald-300 border-white/5 hover:border-emerald-500/30'
                    }`}
                  >
                    💵 Custom Cash (₹)
                  </button>
                </div>

                {/* Percentage Discount Controls */}
                {discountType === 'percentage' && (
                  <div className="space-y-2 p-2.5 bg-[#0B1120] rounded-lg border border-[#14F1D9]/30 animate-fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#9CA3AF]">Custom Percentage Discount:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={customDiscountPct || ''}
                          onChange={e => setCustomDiscountPct(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                          placeholder="10"
                          className="w-16 bg-[#050816] text-[#14F1D9] font-black border border-white/20 rounded px-2 py-1 text-right text-xs outline-none focus:border-[#14F1D9]"
                        />
                        <span className="text-[#14F1D9] font-bold">%</span>
                      </div>
                    </div>
                    {/* Quick percentage presets */}
                    <div className="flex gap-1.5 text-[9px]">
                      {[5, 10, 15, 20].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setCustomDiscountPct(pct)}
                          className={`flex-1 py-1 rounded transition-colors cursor-pointer ${
                            customDiscountPct === pct
                              ? 'bg-[#14F1D9] text-[#0B1120] font-black'
                              : 'bg-white/5 text-[#9CA3AF] hover:text-white'
                          }`}
                        >
                          {pct}% Off
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-cyan-300 flex justify-between pt-1 border-t border-white/5">
                      <span>{activeDiscountPct}% Off on ₹{subtotalAmount}:</span>
                      <span className="font-black">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Cash Discount Controls */}
                {discountType === 'cash' && (
                  <div className="space-y-2 p-2.5 bg-[#0B1120] rounded-lg border border-emerald-500/30 animate-fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#9CA3AF]">Custom Cash Discount (₹):</span>
                      <div className="flex items-center gap-1">
                        <span className="text-emerald-400 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          max={subtotalAmount}
                          value={customCashDiscount || ''}
                          onChange={e => setCustomCashDiscount(Math.min(subtotalAmount, Math.max(0, parseFloat(e.target.value) || 0)))}
                          placeholder="50"
                          className="w-20 bg-[#050816] text-emerald-400 font-black border border-white/20 rounded px-2 py-1 text-right text-xs outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                    {/* Quick cash presets */}
                    <div className="flex gap-1.5 text-[9px]">
                      {[20, 50, 100, 200].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setCustomCashDiscount(amt)}
                          className={`flex-1 py-1 rounded transition-colors cursor-pointer ${
                            customCashDiscount === amt
                              ? 'bg-emerald-400 text-[#0B1120] font-black'
                              : 'bg-white/5 text-[#9CA3AF] hover:text-white'
                          }`}
                        >
                          ₹{amt} Off
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-emerald-300 flex justify-between pt-1 border-t border-white/5">
                      <span>Flat Cash Amount Deducted:</span>
                      <span className="font-black">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              </div>

              <div className="pt-4 mt-4 border-t border-white/10 font-mono">
                <div className="space-y-1 mb-4">
                  <div className="flex justify-between items-center text-xs text-[#9CA3AF]">
                    <span>Subtotal ({totalRacers} Racers):</span>
                    <span>₹{subtotalAmount.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-400">
                      <span>
                        Discount {discountType === 'cash' ? '(Cash)' : `(${activeDiscountPct}%)`}:
                      </span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end pt-2 border-t border-white/10">
                    <span className="text-white font-bold text-xs uppercase tracking-widest">Grand Total</span>
                    <span className="text-2xl font-black text-[#14F1D9] tracking-tighter">
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessBooking(null);
                    setShowPassModal(false);
                    setIsPaymentOpen(true);
                  }}
                  disabled={totalRacers <= 0 || grandTotal < 0}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden relative group shadow-[0_0_20px_rgba(20,241,217,0.3)] cursor-pointer"
                >
                  <div className="absolute inset-0 w-full h-full animate-[shine_2s_ease-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    Reserve Ticket (₹{grandTotal.toFixed(2)}) <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* LOCAL PAYMENT GATEWAY MODAL */}
      {/* ------------------------------------------------------------- */}
      <AnimatePresence>
      {isPaymentOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[#050816]/90 z-50 flex items-center justify-center p-4 backdrop-blur-xl"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`glass-panel border border-[#14F1D9]/30 rounded-2xl shadow-[0_0_30px_rgba(20,241,217,0.15)] w-full p-6 relative overflow-hidden ${successBooking ? 'max-w-lg' : 'max-w-sm'}`}
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#14F1D9]/10 rounded-full blur-[60px] pointer-events-none"></div>

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h3 className="font-black text-xl text-white tracking-tight">Checkout</h3>
                <p className="text-[9px] text-[#14F1D9] font-mono mt-1 font-bold tracking-widest uppercase">Secure Tx</p>
              </div>
              <button onClick={() => setIsPaymentOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/10">
                <X className="w-4 h-4" />
              </button>
            </div>

            {successBooking ? (
              <div className="text-center py-2 relative z-10" id="printable-ticket">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-black text-2xl text-white tracking-tight text-left">
                      {successBooking.booking.paymentStatus === 'pending' ? 'Reservation Confirmed!' : 'Ticket Pass Issued!'}
                    </h4>
                    <span className="text-[10px] text-[#14F1D9] font-mono uppercase tracking-wider block text-left">
                      Single & Double Kart Combined Ticket
                    </span>
                  </div>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }} className={`w-12 h-12 rounded-full flex items-center justify-center ${successBooking.booking.paymentStatus === 'pending' ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-gradient-to-br from-[#14F1D9] to-[#00B4FF] shadow-[0_0_20px_rgba(20,241,217,0.4)]'}`}>
                    {successBooking.booking.paymentStatus === 'pending' ? <AlertTriangle className="h-6 w-6 text-[#0B1120]" /> : <Check className="h-6 w-6 text-[#0B1120]" />}
                  </motion.div>
                </div>
                
                <p className="text-xs text-[#9CA3AF] mb-4 font-medium leading-relaxed text-left border-b border-white/10 pb-3">
                  {successBooking.booking.paymentStatus === 'pending' 
                    ? 'Your single ticket with selected kart packages is reserved. Please pay at the ticket counter upon arrival.' 
                    : 'Your single ticket with selected kart packages is paid and active for turnstile gate access.'}
                </p>
                
                <div className="flex flex-col md:flex-row gap-4 mb-5">
                  <div className="flex-1 p-4 bg-[#050816] rounded-xl border border-white/10 text-xs text-white text-left space-y-2.5 font-mono shadow-inner">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[#9CA3AF] font-bold">Ticket Token</span> 
                      <span className="font-black text-[#14F1D9]">TKT-{successBooking.booking.id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9CA3AF] font-bold">Customer</span> 
                      <span className="font-bold">{customerName} ({customerPhone})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9CA3AF] font-bold">Total Racers</span> 
                      <span className="font-bold text-[#14F1D9]">{totalRacers} Pax</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[#9CA3AF] font-bold">Date & Slot</span> 
                      <span className="font-bold">{bookingDate} @ {selectedSlot}</span>
                    </div>

                    {/* Itemized Packages Breakdown */}
                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <span className="text-[10px] text-[#9CA3AF] uppercase font-bold block">Packages Breakdown:</span>
                      {activePackageItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-[11px] text-gray-300">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="font-black text-white">₹{item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Subtotal and Discount */}
                    <div className="pt-2 border-t border-white/10 space-y-1 text-[11px]">
                      <div className="flex justify-between items-center text-[#9CA3AF]">
                        <span>Subtotal:</span>
                        <span>₹{subtotalAmount.toFixed(2)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center text-emerald-400 font-bold">
                          <span>
                            Discount {discountType === 'cash' ? '(Custom Cash)' : `(${activeDiscountPct}% Custom)`}:
                          </span>
                          <span>-₹{discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center border-t border-white/10 pt-1.5 text-sm font-black">
                        <span className="text-white">
                          {successBooking.booking.paymentStatus === 'pending' ? 'Amount Due (Counter):' : 'Amount Paid:'}
                        </span>
                        <span className={successBooking.booking.paymentStatus === 'pending' ? 'text-amber-400' : 'text-[#14F1D9]'}>
                          ₹{grandTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-32 flex flex-col justify-center items-center p-4 bg-white rounded-xl shadow-lg border-2 border-solid border-gray-300 flex-shrink-0">
                    <svg className="w-full h-auto text-black" viewBox="0 0 100 100">
                       <path d="M5 5h30v30H5V5zm5 5v20h20V10H10zm55-5h30v30H65V5zm5 5v20h20V10H70zM5 65h30v30H5V65zm5 5v20h20V70H10z" fill="currentColor"/>
                       <path d="M45 10h10v10H45V10zm20 45h10v10H65V55zm15 15h15v15H80V70zm-15 15h10v10H65V85zm-20-20h10v10H45V65zm20-20h10v10H65V45zm-10 10h10v10H55V55z" fill="currentColor"/>
                    </svg>
                    <span className="text-black font-bold text-[8px] font-mono mt-2 tracking-widest text-center">SCAN AT GATE</span>
                  </div>
                </div>

                {/* Printable Ticket Pass Modal Preview */}
                {showPassModal && (
                  <div className="mb-4 p-3 bg-[#0B1120] rounded-xl border border-white/20 animate-fade-in max-h-96 overflow-y-auto">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-white font-mono">Official Paddock Ticket Pass</span>
                      <button
                        type="button"
                        onClick={() => setShowPassModal(false)}
                        className="text-xs text-[#9CA3AF] hover:text-white"
                      >
                        ✕ Close Preview
                      </button>
                    </div>
                    <TicketPass
                      ticket={successBooking.ticket || {
                        id: successBooking.booking.id,
                        bookingId: successBooking.booking.id,
                        customerName,
                        customerPhone,
                        customerEmail,
                        activityId: 'act-go-karting',
                        activityName: 'High-Octane Go-Karting',
                        date: bookingDate,
                        timeSlot: selectedSlot,
                        ticketType: successBooking.booking.ticketType,
                        quantity: totalRacers,
                        qrCodeValue: `adventure-park-ticket-${successBooking.booking.id}`,
                        status: 'valid',
                        isPackageBundle: activePackageItems.length > 1,
                        packageBundleItems: activePackageItems.map(p => ({
                          packageId: p.id,
                          packageName: p.name,
                          quantity: p.quantity,
                          unitPrice: p.price,
                          subtotal: p.subtotal,
                          unitOrDuration: p.description
                        }))
                      }}
                      booking={successBooking.booking}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2 font-mono">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        printTicket({
                          receiptId: `TKT-${successBooking.booking.id}`,
                          tokenNumber: successBooking.booking.id,
                          activityName: 'High-Octane Go-Karting',
                          packageName: activePackageItems.map(p => `${p.quantity}x ${p.name}`).join(' + '),
                          customerName,
                          customerPhone,
                          date: bookingDate,
                          slot: selectedSlot,
                          items: activePackageItems.map(item => ({
                            label: `${item.name} (${item.quantity}x)`,
                            value: `₹${item.subtotal.toFixed(2)}`
                          })),
                          subtotalAmount,
                          discountPercentage: activeDiscountPct,
                          discountAmount,
                          totalAmount: grandTotal,
                          paymentStatus: successBooking.booking.paymentStatus === 'paid' ? 'paid' : 'pending',
                          quantity: totalRacers,
                          paymentMethod: paymentMethod.toUpperCase()
                        });
                      }}
                      className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/20 transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-[#14F1D9]" /> Print Ticket
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPassModal(!showPassModal)}
                      className="py-2.5 px-3 rounded-xl bg-[#00B4FF]/20 hover:bg-[#00B4FF]/30 text-[#00B4FF] font-bold text-xs flex items-center justify-center gap-1.5 border border-[#00B4FF]/40 transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4" /> {showPassModal ? 'Hide Pass' : 'View Pass'}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setIsPaymentOpen(false); onSuccessClose?.(); }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black uppercase tracking-widest text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-lg shadow-[#14F1D9]/20"
                  >
                    Done & Return to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4 relative z-10 font-mono">
                {errorMessage && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-2 text-xs font-bold">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-[#9CA3AF] font-black text-[9px] uppercase tracking-widest block text-center">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        paymentMethod === 'upi'
                          ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]'
                          : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <span className="font-black text-[10px] uppercase">UPI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]'
                          : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="text-[9px] uppercase font-bold">Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        paymentMethod === 'cash'
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className="text-[9px] uppercase font-bold">Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('complimentary')}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        paymentMethod === 'complimentary'
                          ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                          : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'
                      }`}
                    >
                      <TicketIcon className="w-3.5 h-3.5" />
                      <span className="text-[9px] uppercase font-bold">VIP Pass</span>
                    </button>
                  </div>
                </div>

                {/* Bill Summary */}
                <div className="p-3.5 bg-[#050816] rounded-xl border border-white/10 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[#9CA3AF]">
                    <span>Packages Subtotal ({totalRacers} Racers):</span>
                    <span>₹{subtotalAmount.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-emerald-400">
                      <span>Discount ({discountType === 'cash' ? 'Cash Discount' : `${activeDiscountPct}% Discount`}):</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {paymentMethod !== 'cash' && paymentMethod !== 'complimentary' && grandTotal > 0 && (
                    <div className="flex justify-between items-center text-[#40E0D0] text-[11px]">
                      <span>Razorpay Online Gateway Fee (2.36%):</span>
                      <span>+ ₹{(grandTotal * 0.0236).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t border-white/10 pt-2">
                    <span className="text-white font-black text-xs uppercase tracking-widest">
                      {paymentMethod === 'cash' ? 'Payable at Counter' : 'Total Payable'}
                    </span>
                    <span className="text-xl font-black tracking-tighter text-[#14F1D9]">
                      ₹{(paymentMethod === 'cash' || paymentMethod === 'complimentary' ? grandTotal : grandTotal * 1.0236).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-lg mt-2 bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] shadow-[0_0_20px_rgba(20,241,217,0.3)]"
                >
                  {paymentMethod === 'cash' 
                    ? `Confirm & Pay Cash at Counter (₹${grandTotal.toFixed(2)})`
                    : paymentMethod === 'complimentary'
                    ? 'Issue Free Complimentary Pass'
                    : `Pay Online (₹${(grandTotal * 1.0236).toFixed(2)})`}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── CUSTOM PACKAGE CREATOR MODAL ── */}
      <AnimatePresence>
        {showAddCustomModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-panel border border-[#14F1D9]/40 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl font-mono"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <h4 className="font-black text-sm text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-[#14F1D9]" /> Add Custom Kart Package
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomPackage} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#9CA3AF] mb-1 font-bold">Package Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomName}
                    onChange={e => setNewCustomName(e.target.value)}
                    placeholder="e.g. VIP Sprint Kart (15 Mins)"
                    className="w-full bg-[#050816] text-white border border-white/15 rounded-lg px-3 py-2 outline-none focus:border-[#14F1D9]"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] mb-1 font-bold">Price per Kart (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newCustomPrice}
                    onChange={e => setNewCustomPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#050816] text-[#14F1D9] font-black border border-white/15 rounded-lg px-3 py-2 outline-none focus:border-[#14F1D9]"
                  />
                </div>
                <div>
                  <label className="block text-[#9CA3AF] mb-1 font-bold">Description</label>
                  <input
                    type="text"
                    value={newCustomDesc}
                    onChange={e => setNewCustomDesc(e.target.value)}
                    placeholder="e.g. Dual motor tuning, exclusive track lane"
                    className="w-full bg-[#050816] text-white border border-white/15 rounded-lg px-3 py-2 outline-none focus:border-[#14F1D9]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomModal(false)}
                    className="flex-1 py-2 rounded-lg bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-[#14F1D9] text-[#0B1120] font-black hover:bg-[#00B4FF] transition-colors"
                  >
                    Add to Ticket
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
};
