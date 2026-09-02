import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, Clock, Shield, Flag, Award, Gauge,
  ArrowRight, Check, X, CreditCard, AlertTriangle, Play, Minus, Plus,
  Info, ChevronRight, Zap, Target
} from 'lucide-react';
import { printTicket } from '../lib/printTicket';
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
  const { createBooking, timeSlots, activities } = useAppContext();
  const kartingActivity = activities.find(a => a.id === 'act-go-karting');

  const karts: KartType[] = [
    { id: 'kart-gt', name: 'GT Pro 200cc', engine: 'Honda GX200 Gasoline', topSpeed: 75, accel: 4.5, desc: 'Classic high-torque gasoline engine with incredible mechanical drift throttle response.', image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=400&q=80' },
    { id: 'kart-sodi', name: 'Sodi Sport 160cc', engine: 'Sodi GX160 Premium', topSpeed: 60, accel: 5.2, desc: 'Extremely forgiving handling, perfect for kids, amateurs, and learning apex lines.', image: 'https://images.unsplash.com/photo-1595246140625-573b715d11dc?auto=format&fit=crop&w=400&q=80' },
    { id: 'kart-volt', name: 'Storm Volt Electric', engine: 'Dual Lithium High-Torque', topSpeed: 82, accel: 3.7, desc: 'Eco-friendly hyper-acceleration with boost buttons and computerized vectoring.', image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=400&q=80' }
  ];

  const defaultPackages: KartPackage[] = [
    { id: 'pkg-kart-single', name: 'Single Rider Experience (10 Mins)', price: 100, description: 'Classic single-seat session. Includes complete electronic lap-time reporting. (100 per kart per slot)' },
    { id: 'pkg-kart-double', name: 'Double Co-Pilot Ride (10 Mins)', price: 150, description: 'Twin-seater kart. Great for parent and child side-by-side racing.' },
    { id: 'pkg-kart-race', name: 'Grand Prix Tournament (30 Mins)', price: 250, description: 'Warm-up lap, 5-minute qualification round, and 12-lap medal grand finale.' }
  ];

  const packages: KartPackage[] = (kartingActivity?.packages && kartingActivity.packages.length > 0)
    ? kartingActivity.packages
    : defaultPackages;

  const [selectedKart, setSelectedKart] = useState<KartType>(karts[0]);
  const [selectedPackage, setSelectedPackage] = useState<KartPackage>(packages[0] || defaultPackages[0]);

  React.useEffect(() => {
    if (packages.length > 0 && (!selectedPackage || !packages.some(p => p.id === selectedPackage.id))) {
      setSelectedPackage(packages[0]);
    }
  }, [packages]);
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

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'net_banking' | 'cash' | 'complimentary'>('upi');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  const bookingTotal = paymentMethod === 'complimentary' ? 0 : selectedPackage.price * bookingQuantity;

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

    if (bookingTotal <= 0) {
      setErrorMessage('Please select a valid tournament package.');
      return;
    }

    const details = `Kart: ${selectedKart.name} | Setup: ${tireCompound.toUpperCase()} Tires, ${aeroWing.toUpperCase()} Wing | Pkg: ${selectedPackage.name}`;

    const finalizeBooking = () => {
      const result = createBooking({
        customerName, customerPhone, customerEmail,
        activityId: 'act-go-karting',
        activityName: 'High-Octane Go-Karting',
        date: bookingDate,
        timeSlot: selectedSlot,
        ticketType: paymentMethod === 'complimentary' ? 'Complimentary VIP Pass' : 'package',
        details,
        quantity: bookingQuantity,
        totalAmount: paymentMethod === 'complimentary' ? 0 : bookingTotal,
        paymentMethod
      });
  
      if (typeof result === 'string') {
        setErrorMessage(result);
      } else {
        setSuccessBooking(result);
      }
    };

    if (paymentMethod === 'complimentary' || (paymentMethod !== 'upi' && paymentMethod !== 'card' && paymentMethod !== 'net_banking')) {
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
        body: JSON.stringify({ amount: bookingTotal, currency: 'INR' })
      });
      const order = await orderResponse.json();

      // 2. Open Razorpay Modal
      const options = {
        key: 'rzp_test_TI7eXiGfnUXpao',
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
          
          {/* 2. KART SELECTION */}
          <section className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-[#14F1D9] rounded-full shadow-[0_0_5px_#14F1D9]"></div>
              <h2 className="text-lg font-black text-white tracking-tight">Select Chassis</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {karts.map((kart) => (
                <motion.div 
                  key={kart.id}
                  whileHover={{ y: -2 }}
                  onClick={() => setSelectedKart(kart)}
                  className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                    selectedKart.id === kart.id 
                      ? 'ring-2 ring-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.2)]' 
                      : 'ring-1 ring-white/10 hover:ring-white/30'
                  }`}
                >
                  <div className="h-28 w-full relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] to-transparent z-10"></div>
                    <img src={kart.image} alt={kart.name} className="w-full h-full object-cover filter saturate-150" />
                    <div className="absolute top-2 right-2 z-20">
                      <span className="px-1.5 py-0.5 bg-[#050816]/80 backdrop-blur-sm border border-[#14F1D9]/50 rounded text-[9px] font-mono font-black text-[#14F1D9]">
                        {kart.topSpeed} KM/H
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 bg-[#0B1120] h-full ${selectedKart.id === kart.id ? 'bg-gradient-to-b from-[#0B1120] to-[#14F1D9]/10' : ''}`}>
                    <h3 className="font-black text-sm text-white mb-0.5 tracking-tight">{kart.name}</h3>
                    <p className="text-[9px] text-[#00B4FF] font-mono font-bold uppercase tracking-wider mb-1.5">{kart.engine}</p>
                    <p className="text-[10px] text-[#9CA3AF] leading-snug line-clamp-2">{kart.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

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

          {/* 4 & 7. PERFORMANCE ANALYTICS & SIMULATION */}
          <section className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-[#FFB703] rounded-full shadow-[0_0_5px_#FFB703]"></div>
              <h2 className="text-lg font-black text-white tracking-tight">Simulator</h2>
            </div>
            
            <div className="glass-panel p-[1px] rounded-xl border border-white/10 overflow-hidden relative group shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-[#14F1D9]/10 via-[#00B4FF]/5 to-[#FFB703]/10 opacity-60"></div>
              
              <div className="relative bg-[#0B1120]/90 backdrop-blur-xl rounded-[11px] p-4">
                
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
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: BOOKING & PACKAGES */}
        <div className="flex-1 min-w-0 flex flex-col gap-5 h-full overflow-y-auto pr-2 custom-scrollbar">
            
          {/* 5. PACKAGE SELECTION */}
          <div className="glass-panel p-4 rounded-xl border border-white/10 shadow-lg flex-shrink-0">
            <h3 className="font-black text-sm text-white mb-3 flex items-center gap-2 tracking-tight">
              <Award className="w-4 h-4 text-[#FFB703]" /> Select Package
            </h3>
            <div className="space-y-2">
              {packages.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-300 border relative overflow-hidden group cursor-pointer ${
                    selectedPackage.id === pkg.id 
                      ? 'bg-[#FFB703]/10 border-[#FFB703]/50 shadow-[0_0_15px_rgba(255,183,3,0.15)]' 
                      : 'bg-[#050816] border-white/5 hover:border-white/20'
                  }`}
                >
                  {selectedPackage.id === pkg.id && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#FFB703]/20 rounded-full blur-[20px] pointer-events-none"></div>
                  )}
                  <div className="flex justify-between items-start mb-1 relative z-10">
                    <h4 className={`font-black text-[11px] tracking-tight pr-2 ${selectedPackage.id === pkg.id ? 'text-[#FFB703]' : 'text-white'}`}>{pkg.name}</h4>
                    <span className="font-black font-mono text-sm text-white">₹{pkg.price}</span>
                  </div>
                  <p className="text-[9px] text-[#9CA3AF] leading-snug relative z-10 pr-2 line-clamp-1">{pkg.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 6. BOOKING PANEL */}
          <div className="glass-panel p-4 md:p-5 rounded-xl border border-[#14F1D9]/30 relative overflow-hidden shadow-[0_0_20px_rgba(20,241,217,0.1)] flex-1 flex flex-col">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#14F1D9]/20 rounded-full blur-[40px] pointer-events-none"></div>
            
            <h3 className="font-black text-lg text-white mb-2 tracking-tight">Reservation</h3>
            
            <form className="flex-1 flex flex-col justify-between" onSubmit={(e) => e.preventDefault()}>
              
              <div className="space-y-3">
              
              <div className="flex items-center justify-between p-3 bg-[#050816] rounded-xl border border-white/5 mb-1">
                <span className="font-bold text-[#9CA3AF] text-[10px] uppercase tracking-wider font-mono">Racers</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setBookingQuantity(Math.max(1, bookingQuantity - 1))} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/5">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-black font-mono text-sm text-white w-4 text-center">{bookingQuantity}</span>
                  <button type="button" onClick={() => setBookingQuantity(bookingQuantity + 1)} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white hover:bg-[#14F1D9] hover:text-[#0B1120] transition-colors cursor-pointer border border-white/5">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

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
              </div>

              <div className="pt-4 mt-4 border-t border-white/10">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest">Total</span>
                  <span className="text-2xl font-black font-mono text-white tracking-tighter">₹{bookingTotal.toFixed(2)}</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessBooking(null);
                    setIsPaymentOpen(true);
                  }}
                  disabled={bookingTotal <= 0}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 overflow-hidden relative group shadow-[0_0_20px_rgba(20,241,217,0.3)] cursor-pointer"
                >
                  <div className="absolute inset-0 w-full h-full animate-[shine_2s_ease-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    Reserve <ArrowRight className="w-4 h-4" />
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
                  <h4 className="font-black text-2xl text-white tracking-tight text-left">
                    {successBooking.booking.paymentStatus === 'pending' ? 'Payment Pending' : 'Booking Confirmed!'}
                  </h4>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }} className={`w-12 h-12 rounded-full flex items-center justify-center ${successBooking.booking.paymentStatus === 'pending' ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-gradient-to-br from-[#14F1D9] to-[#00B4FF] shadow-[0_0_20px_rgba(20,241,217,0.4)]'}`}>
                    {successBooking.booking.paymentStatus === 'pending' ? <AlertTriangle className="h-6 w-6 text-[#0B1120]" /> : <Check className="h-6 w-6 text-[#0B1120]" />}
                  </motion.div>
                </div>
                
                <p className="text-sm text-[#9CA3AF] mb-6 font-medium leading-relaxed text-left border-b border-white/10 pb-4">
                  {successBooking.booking.paymentStatus === 'pending' ? 'Your booking has been reserved successfully. Please arrive at least 30 minutes before your activity and complete your payment at the ticket counter. Your reservation will remain valid until the scheduled reporting time.' : 'Your paddock pass is ready. Please present the QR code below at the entry gates.'}
                </p>
                
                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  <div className="flex-1 p-5 bg-[#050816] rounded-xl border border-white/10 text-xs text-white text-left space-y-3 font-mono shadow-inner">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2"><span className="text-[#9CA3AF] font-bold">Ticket ID</span> <span className="font-black text-[#14F1D9]">TKT-{successBooking.booking.id}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Activity</span> <span className="font-bold">Pro Go-Karting</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Chassis</span> <span className="font-bold truncate max-w-[120px] text-right">{selectedKart.name}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Racers</span> <span className="font-bold">{bookingQuantity}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Session</span> <span className="font-bold">{bookingDate} @ {selectedSlot}</span></div>
                    {successBooking.booking.paymentStatus === 'pending' && (
                      <div className="flex justify-between items-center border-t border-white/5 pt-2"><span className="text-[#9CA3AF] font-bold">Amount Due</span> <span className="font-black text-amber-400">₹{bookingTotal.toFixed(2)} (Cash)</span></div>
                    )}
                  </div>
                  <div className="w-full md:w-32 flex flex-col justify-center items-center p-4 bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-300">
                    {/* Simulated QR Code for print view */}
                    <svg className="w-full h-auto text-black" viewBox="0 0 100 100">
                       <path d="M5 5h30v30H5V5zm5 5v20h20V10H10zm55-5h30v30H65V5zm5 5v20h20V10H70zM5 65h30v30H5V65zm5 5v20h20V70H10z" fill="currentColor"/>
                       <path d="M45 10h10v10H45V10zm20 45h10v10H65V55zm15 15h15v15H80V70zm-15 15h10v10H65V85zm-20-20h10v10H45V65zm20-20h10v10H65V45zm-10 10h10v10H55V55z" fill="currentColor"/>
                    </svg>
                    <span className="text-black font-bold text-[8px] font-mono mt-2 tracking-widest text-center">SCAN AT GATE</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button onClick={() => { setIsPaymentOpen(false); onSuccessClose?.(); }} className="w-full py-3 rounded-xl bg-[#14F1D9] text-[#0B1120] font-black uppercase tracking-widest text-xs hover:bg-[#00B4FF] transition-colors cursor-pointer shadow-lg shadow-[#14F1D9]/20">
                    Done & Return to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4 relative z-10">
                {errorMessage && (
                  <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl flex items-center gap-2 text-xs font-bold">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <div className="space-y-2">
                    <label className="text-[#9CA3AF] font-black text-[9px] uppercase tracking-widest font-mono block text-center">Payment / Pass Option</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      <button type="button" onClick={() => setPaymentMethod('upi')} className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${paymentMethod === 'upi' ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'}`}>
                        <span className="font-black text-[10px] font-mono uppercase tracking-wider">UPI</span>
                      </button>
                      <button type="button" onClick={() => setPaymentMethod('card')} className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${paymentMethod === 'card' ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'}`}>
                        <CreditCard className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setPaymentMethod('net_banking')} className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${paymentMethod === 'net_banking' ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'}`}>
                        <span className="font-black text-[10px] font-mono uppercase tracking-wider">Bank</span>
                      </button>
                      <button type="button" onClick={() => setPaymentMethod('complimentary')} className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${paymentMethod === 'complimentary' ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-amber-400/50 hover:text-amber-300'}`}>
                        <span className="font-black text-[9px] font-mono uppercase tracking-wider text-center">🎁 Comp</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#050816] rounded-xl border border-white/10 flex justify-between items-center mt-4">
                  <span className="text-[#9CA3AF] font-black text-[10px] uppercase tracking-widest font-mono">
                    {paymentMethod === 'complimentary' ? 'VIP Status' : 'Total'}
                  </span>
                  <span className={`text-2xl font-black font-mono tracking-tighter ${paymentMethod === 'complimentary' ? 'text-amber-400' : 'text-[#14F1D9]'}`}>
                    {paymentMethod === 'complimentary' ? '₹0.00 (FREE)' : `₹${bookingTotal.toFixed(2)}`}
                  </span>
                </div>

                <button type="submit" className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg mt-4 ${
                  paymentMethod === 'complimentary' 
                    ? 'bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-amber-500/20' 
                    : 'bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] shadow-[0_0_20px_rgba(20,241,217,0.3)]'
                }`}>
                  {paymentMethod === 'complimentary' ? '🎁 Issue Complimentary VIP Pass' : 'Pay with Razorpay'}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      </div>
    </>
  );
};
