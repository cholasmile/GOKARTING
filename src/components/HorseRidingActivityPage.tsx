import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, Clock, Heart, Shield, Compass, Map,
  ChevronRight, ArrowRight, Check, X, CreditCard, AlertTriangle, Play, Minus, Plus, MapPin, Star
} from 'lucide-react';
import { printTicket } from '../lib/printTicket';

interface HorseBreed {
  id: string;
  name: string;
  type: string;
  spirit: 'Spirited' | 'Calm' | 'Focused' | 'Gentle';
  power: number; // out of 100
  temperament: string;
  image: string;
  favTreat: string;
}

interface TrailRoute {
  id: string;
  name: string;
  duration: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  description: string;
  scenicPoints: string[];
}

interface ActivityPageProps {
  onSuccessClose?: () => void;
}

export const HorseRidingActivityPage: React.FC<ActivityPageProps> = ({ onSuccessClose }) => {
  const { createBooking, timeSlots, activities } = useAppContext();
  const horseActivity = activities.find(a => a.id === 'act-horse-riding');

  const horses: HorseBreed[] = [
    {
      id: 'horse-thunder', name: 'Thunder Bolt', type: 'Arabian Stallion', spirit: 'Spirited', power: 88,
      temperament: 'Energetic & Prideful', image: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=400&q=80', favTreat: 'Crisp Red Apples 🍎'
    },
    {
      id: 'horse-bella', name: 'Bella Grace', type: 'Clydesdale', spirit: 'Gentle', power: 95,
      temperament: 'Extremely Patient', image: 'https://images.unsplash.com/photo-1598974357801-cbca100e6563?auto=format&fit=crop&w=400&q=80', favTreat: 'Sweet Carrots 🥕'
    },
    {
      id: 'horse-apollo', name: 'Apollo Crown', type: 'Thoroughbred', spirit: 'Focused', power: 91,
      temperament: 'Intelligent', image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80', favTreat: 'Sugarcane Sticks 🎋'
    }
  ];

  const routes: TrailRoute[] = [
    { id: 'route-redwood', name: 'Redwood Whisper Trail', duration: '1.5 Hrs', difficulty: 'Easy', description: 'Wander under giant sequoia trees, along soft fern-covered mossy riverbanks.', scenicPoints: ['Whispering Brook', 'Coyote Creek'] },
    { id: 'route-sunset', name: 'Sunset Crest Ridge', duration: '2.0 Hrs', difficulty: 'Moderate', description: 'Climb a gentle panoramic trail arriving at the Sunset Point peak.', scenicPoints: ['Golden Peak', 'Ocean Vista'] },
    { id: 'route-river', name: 'Riverfront Canopy', duration: '1.0 Hr', difficulty: 'Easy', description: 'A completely flat route exploring the scenic wetlands.', scenicPoints: ['Heron Flat', 'Sandy Shallows'] }
  ];

  const [selectedHorse, setSelectedHorse] = useState<HorseBreed>(horses[0]);
  const [selectedRoute, setSelectedRoute] = useState<TrailRoute>(routes[0]);
  const [adultCount, setAdultCount] = useState<number>(1);
  const [childCount, setChildCount] = useState<number>(0);
  const [selectedPkgId, setSelectedPkgId] = useState<string>(horseActivity?.packages?.[0]?.id || '');
  
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string>(timeSlots[0]);

  const [bondState, setBondState] = useState<string>('Ready to bond with your horse.');
  const [bondLevel, setBondLevel] = useState<number>(45);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simText, setSimText] = useState('System Online');

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'net_banking' | 'cash'>('upi');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  const packages = horseActivity?.packages || [];
  const selectedPkg = packages.find(p => p.id === selectedPkgId);

  const priceAdult = horseActivity?.adultPrice ?? 45;
  const priceChild = horseActivity?.childPrice ?? 25;
  const bookingTotal = selectedPkg 
    ? selectedPkg.price 
    : (adultCount * priceAdult) + (childCount * priceChild);

  const feedTreat = () => {
    setBondLevel(prev => Math.min(100, prev + 15));
    setBondState(`${selectedHorse.name} happily eats your treat! Bond increased!`);
  };

  const startSimulator = () => {
    setIsSimulating(true);
    setSimText(`Saddling ${selectedHorse.name}...`);
    
    setTimeout(() => setSimText(`Departing stable onto ${selectedRoute.name}...`), 1500);
    setTimeout(() => setSimText(`Trotting through ${selectedRoute.scenicPoints[0]}...`), 3200);
    setTimeout(() => {
      setSimText(`Ride finished! Synergized.`);
      setIsSimulating(false);
    }, 5500);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessBooking(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage('Full Name and Phone Number are required.');
      return;
    }

    if (bookingTotal <= 0) {
      setErrorMessage('Please select at least one admission ticket.');
      return;
    }

    const details = `Horse: ${selectedHorse.name} (${selectedHorse.type}) | Route: ${selectedRoute.name}`;

    const finalizeBooking = () => {
      const result = createBooking({
        customerName, customerEmail, customerPhone,
        activityId: 'act-horse-riding',
        activityName: 'Royal Horse Riding',
        date: bookingDate,
        timeSlot: selectedSlot,
        ticketType: 'standard',
        details,
        quantity: adultCount + childCount,
        totalAmount: bookingTotal,
        paymentMethod
      });
  
      if (typeof result === 'string') {
        setErrorMessage(result);
      } else {
        setSuccessBooking(result);
      }
    };

    if (paymentMethod !== 'upi' && paymentMethod !== 'card' && paymentMethod !== 'net_banking') {
      finalizeBooking();
      return;
    }

    try {
      if (!navigator.onLine) {
        throw new Error('Online payments are not available offline. Please use Cash or another offline payment method.');
      }

      fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: bookingTotal, currency: 'INR' })
      }).then(res => res.json()).then(order => {
        const options = {
          key: 'rzp_test_TI7eXiGfnUXpao',
          amount: order.amount,
          currency: order.currency,
          name: 'Deuce Adventure Park',
          description: 'Horse Riding Booking',
          order_id: order.id,
          handler: async function (response: any) {
            const verifyResponse = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            });
            if (verifyResponse.ok) finalizeBooking();
            else setErrorMessage('Payment verification failed');
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
        rzp1.on('payment.failed', (resp: any) => setErrorMessage(resp.error.description));
        rzp1.open();
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment initialization failed');
    }
  };

  return (
    <>
      <div className="w-full flex flex-col gap-5 pb-6 font-sans text-slate-100 h-full print:hidden">

      {/* 50:50 COLUMNS */}
      <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
        
        {/* LEFT COLUMN: HORSES, BONDING, SIMULATOR */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-5 h-full overflow-y-auto pr-2 custom-scrollbar">
          
          {/* 2. COMPANION SELECTION */}
          <section className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-[#14F1D9] rounded-full shadow-[0_0_5px_#14F1D9]"></div>
              <h2 className="text-lg font-black text-white tracking-tight">Select Companion</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {horses.map((horse) => (
                <motion.div 
                  key={horse.id}
                  whileHover={{ y: -2 }}
                  onClick={() => {
                    setSelectedHorse(horse);
                    setBondLevel(40 + Math.floor(Math.random() * 15));
                    setBondState(`You met ${horse.name}. Feed it!`);
                  }}
                  className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                    selectedHorse.id === horse.id 
                      ? 'ring-2 ring-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.2)]' 
                      : 'ring-1 ring-white/10 hover:ring-white/30'
                  }`}
                >
                  <div className="h-28 w-full relative">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1120] to-transparent z-10"></div>
                    <img src={horse.image} alt={horse.name} className="w-full h-full object-cover filter saturate-150" />
                    <div className="absolute top-2 right-2 z-20">
                      <span className="px-1.5 py-0.5 bg-[#050816]/80 backdrop-blur-sm border border-[#14F1D9]/50 rounded text-[9px] font-mono font-black text-[#14F1D9] uppercase">
                        {horse.spirit}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 bg-[#0B1120] h-full ${selectedHorse.id === horse.id ? 'bg-gradient-to-b from-[#0B1120] to-[#14F1D9]/10' : ''}`}>
                    <h3 className="font-black text-sm text-white mb-0.5 tracking-tight truncate">{horse.name}</h3>
                    <p className="text-[9px] text-[#00B4FF] font-mono font-bold uppercase tracking-wider mb-1.5 truncate">{horse.type}</p>
                    <p className="text-[10px] text-[#9CA3AF] leading-snug line-clamp-2 truncate">{horse.temperament}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* 3. STABLE PROFILE & BONDING */}
          <section className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-[#00B4FF] rounded-full shadow-[0_0_5px_#00B4FF]"></div>
              <h2 className="text-lg font-black text-white tracking-tight">Stable Bond Profile</h2>
            </div>
            
            <div className="glass-panel p-4 rounded-xl border border-white/10 shadow-lg relative overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {/* Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                      <Heart className="w-3 h-3 text-[#14F1D9]" /> Groom Level
                    </label>
                    <span className="text-[9px] text-[#14F1D9] font-mono tracking-wider font-bold">{selectedHorse.power}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#050816] rounded-full overflow-hidden border border-white/5">
                    <motion.div className="h-full bg-gradient-to-r from-[#14F1D9]/50 to-[#14F1D9] shadow-[0_0_5px_#14F1D9]" initial={{ width: 0 }} animate={{ width: `${selectedHorse.power}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] font-medium leading-snug">
                    <span className="text-white block font-black mb-0.5">Likes: {selectedHorse.favTreat}</span>
                    <span className="italic text-[#00B4FF] block">{bondState}</span>
                  </div>
                </div>

                {/* Feed Action */}
                <div className="flex flex-col justify-end space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="w-3 h-3 text-[#00B4FF]" /> Bond Synergy
                    </label>
                    <span className="text-[9px] text-white/40 font-mono tracking-wider">{bondLevel}/100</span>
                  </div>
                  <div className="h-1 w-full bg-[#050816] rounded-full overflow-hidden border border-white/5 mb-1">
                    <motion.div className="h-full bg-gradient-to-r from-[#00B4FF]/50 to-[#00B4FF] shadow-[0_0_5px_#00B4FF]" initial={{ width: 0 }} animate={{ width: `${bondLevel}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                  </div>
                  <button
                    onClick={feedTreat}
                    className="w-full py-2 rounded-md text-[10px] font-black uppercase tracking-wider transition-all duration-300 bg-[#00B4FF]/15 text-[#00B4FF] border border-[#00B4FF]/40 shadow-[0_0_10px_rgba(0,180,255,0.15)] hover:bg-[#00B4FF]/25 cursor-pointer"
                  >
                    Give Treat 🥕
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* 4. TRAIL SIMULATOR */}
          <section className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-[#FFB703] rounded-full shadow-[0_0_5px_#FFB703]"></div>
              <h2 className="text-lg font-black text-white tracking-tight">Trail Simulator</h2>
            </div>
            
            <div className="glass-panel p-[1px] rounded-xl border border-white/10 overflow-hidden relative group shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-[#14F1D9]/10 via-[#00B4FF]/5 to-[#FFB703]/10 opacity-60"></div>
              
              <div className="relative bg-[#0B1120]/90 backdrop-blur-xl rounded-[11px] p-4 flex items-center justify-between gap-4">
                
                <div>
                  <h3 className="font-mono text-[9px] text-[#9CA3AF] uppercase tracking-widest mb-0.5">Live Telemetry</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#14F1D9] z-10"></div>
                      <div className="w-2 h-2 rounded-full bg-[#14F1D9] absolute animate-ping opacity-75"></div>
                    </div>
                    <span className="font-black text-white text-xs tracking-tight uppercase line-clamp-1">{simText}</span>
                  </div>
                  <p className="text-[9px] text-[#00B4FF] font-mono">Simulating synergy on: {selectedRoute.name}</p>
                </div>

                <button onClick={startSimulator} disabled={isSimulating} className="relative group overflow-hidden rounded-lg bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] p-[1.5px] disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(20,241,217,0.2)] flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative px-4 py-3 bg-[#0B1120] rounded-lg flex items-center justify-center gap-2 group-hover:bg-transparent transition-colors duration-300">
                    {isSimulating ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <Play className="w-4 h-4 text-white fill-white group-hover:text-[#0B1120] transition-colors" />
                    )}
                  </div>
                </button>

              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: TRAILS & BOOKING */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-5 h-full overflow-y-auto pr-2 custom-scrollbar">
            
          {/* 5. TRAIL SELECTION */}
          <div className="glass-panel p-4 rounded-xl border border-white/10 shadow-lg flex-shrink-0">
            <h3 className="font-black text-sm text-white mb-3 flex items-center gap-2 tracking-tight">
              <Compass className="w-4 h-4 text-[#FFB703]" /> Select Trail Route
            </h3>
            <div className="space-y-2">
              {routes.map(route => (
                <button
                  key={route.id}
                  onClick={() => setSelectedRoute(route)}
                  className={`w-full text-left p-3 rounded-xl transition-all duration-300 border relative overflow-hidden group cursor-pointer ${
                    selectedRoute.id === route.id 
                      ? 'bg-[#FFB703]/10 border-[#FFB703]/50 shadow-[0_0_15px_rgba(255,183,3,0.15)]' 
                      : 'bg-[#050816] border-white/5 hover:border-white/20'
                  }`}
                >
                  {selectedRoute.id === route.id && (
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#FFB703]/20 rounded-full blur-[20px] pointer-events-none"></div>
                  )}
                  <div className="flex justify-between items-start mb-1 relative z-10">
                    <h4 className={`font-black text-[11px] tracking-tight pr-2 ${selectedRoute.id === route.id ? 'text-[#FFB703]' : 'text-white'}`}>{route.name}</h4>
                    <span className="font-black font-mono text-[10px] text-white/50 border border-white/10 px-1.5 py-0.5 rounded">{route.difficulty}</span>
                  </div>
                  <p className="text-[9px] text-[#9CA3AF] leading-snug relative z-10 pr-2 line-clamp-1 mb-1.5">{route.description}</p>
                  <div className="flex items-center gap-2 text-[8px] font-mono text-[#00B4FF] relative z-10 uppercase font-bold">
                    <span>⏱ {route.duration}</span>
                    <span>•</span>
                    <span className="truncate">📍 {route.scenicPoints.join(', ')}</span>
                  </div>
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
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center justify-between p-2 bg-[#050816] rounded-xl border border-white/5">
                    <span className="font-bold text-[#9CA3AF] text-[10px] uppercase tracking-wider font-mono">Adult</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setAdultCount(Math.max(0, adultCount - 1))} className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/5"><Minus className="w-3 h-3" /></button>
                      <span className="font-black font-mono text-xs text-white w-3 text-center">{adultCount}</span>
                      <button type="button" onClick={() => setAdultCount(adultCount + 1)} className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-white hover:bg-[#14F1D9] hover:text-[#0B1120] transition-colors cursor-pointer border border-white/5"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-between p-2 bg-[#050816] rounded-xl border border-white/5">
                    <span className="font-bold text-[#9CA3AF] text-[10px] uppercase tracking-wider font-mono">Child</span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setChildCount(Math.max(0, childCount - 1))} className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/5"><Minus className="w-3 h-3" /></button>
                      <span className="font-black font-mono text-xs text-white w-3 text-center">{childCount}</span>
                      <button type="button" onClick={() => setChildCount(childCount + 1)} className="w-5 h-5 rounded bg-white/5 flex items-center justify-center text-white hover:bg-[#14F1D9] hover:text-[#0B1120] transition-colors cursor-pointer border border-white/5"><Plus className="w-3 h-3" /></button>
                    </div>
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

                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <input type="date" required value={bookingDate} onChange={e => setBookingDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full bg-[#050816] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9]/50 focus:outline-none transition-all font-mono text-[10px]" />
                      <label className="absolute left-3 -top-2 bg-[#0B1120] px-1 text-[9px] font-black text-[#14F1D9] uppercase tracking-widest">Date</label>
                    </div>
                    <div className="relative">
                      <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)} className="w-full bg-[#050816] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9]/50 focus:outline-none transition-all font-mono text-[10px] appearance-none cursor-pointer">
                        {timeSlots.map((slot, idx) => (
                          <option key={idx} value={slot}>{slot}</option>
                        ))}
                      </select>
                      <label className="absolute left-3 -top-2 bg-[#0B1120] px-1 text-[9px] font-black text-[#14F1D9] uppercase tracking-widest">Slot</label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/10">
                <div className="flex justify-between items-end mb-4">
                  <span className="text-[#9CA3AF] font-bold text-[10px] uppercase tracking-widest">Total Bill</span>
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
                  {successBooking.booking.paymentStatus === 'pending' ? 'Your booking has been reserved successfully. Please arrive at least 30 minutes before your activity and complete your payment at the ticket counter. Your reservation will remain valid until the scheduled reporting time.' : 'Your trail pass is ready. Please present the QR code below at the entry gates.'}
                </p>
                
                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  <div className="flex-1 p-5 bg-[#050816] rounded-xl border border-white/10 text-xs text-white text-left space-y-3 font-mono shadow-inner">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2"><span className="text-[#9CA3AF] font-bold">Ticket ID</span> <span className="font-black text-[#14F1D9]">TKT-{successBooking.booking.id}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Activity</span> <span className="font-bold">Royal Trails</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Trail</span> <span className="font-bold truncate max-w-[120px] text-right">{selectedRoute.name}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Riders</span> <span className="font-bold">{adultCount + childCount}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Session</span> <span className="font-bold">{bookingDate} @ {selectedSlot}</span></div>
                    {successBooking.booking.paymentStatus === 'pending' && (
                      <div className="flex justify-between items-center border-t border-white/5 pt-2"><span className="text-[#9CA3AF] font-bold">Amount Due</span> <span className="font-black text-amber-400">₹{bookingTotal.toFixed(2)} (Cash)</span></div>
                    )}
                  </div>
                  <div className="w-full md:w-32 flex flex-col justify-center items-center p-4 bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-300">
                    <svg className="w-full h-auto text-black" viewBox="0 0 100 100">
                       <path d="M5 5h30v30H5V5zm5 5v20h20V10H10zm55-5h30v30H65V5zm5 5v20h20V10H70zM5 65h30v30H5V65zm5 5v20h20V70H10z" fill="currentColor"/>
                       <path d="M45 10h10v10H45V10zm20 45h10v10H65V55zm15 15h15v15H80V70zm-15 15h10v10H65V85zm-20-20h10v10H45V65zm20-20h10v10H65V45zm-10 10h10v10H55V55z" fill="currentColor"/>
                    </svg>
                    <span className="text-black font-bold text-[8px] font-mono mt-2 tracking-widest text-center">SCAN AT GATE</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <button onClick={() => printTicket({
                    receiptId: `TKT-${successBooking.booking.id}`,
                    activityName: 'Royal Horse Riding',
                    customerName: successBooking.booking.customerName,
                    date: successBooking.booking.date,
                    slot: selectedSlot,
                    items: [
                      { label: `Horse: ${selectedHorse.name}`, value: selectedRoute.name },
                      { label: 'Adults', value: `${adultCount} × ₹${priceAdult}` },
                      ...(childCount > 0 ? [{ label: 'Children', value: `${childCount} × ₹${priceChild}` }] : []),
                    ],
                    totalAmount: successBooking.booking.totalAmount,
                    paymentStatus: successBooking.booking.paymentStatus === 'pending' ? 'pending' : 'paid',
                    quantity: adultCount + childCount,
                  })} className="flex-1 py-3 rounded-lg bg-[#14F1D9] text-[#0B1120] font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(20,241,217,0.3)]">
                    Print Ticket
                  </button>
                  <button onClick={() => { setIsPaymentOpen(false); onSuccessClose?.(); }} className="flex-1 py-3 rounded-lg bg-transparent border border-[#14F1D9]/50 text-[#14F1D9] font-black uppercase tracking-widest text-xs hover:bg-[#14F1D9]/10 transition-colors">
                    Close & Go to Dashboard
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
                  <label className="text-[#9CA3AF] font-black text-[9px] uppercase tracking-widest font-mono block text-center">Payment Gateway</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setPaymentMethod('upi')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${paymentMethod === 'upi' ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'}`}>
                      <span className="font-black text-[10px] font-mono uppercase tracking-wider">UPI</span>
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('card')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${paymentMethod === 'card' ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'}`}>
                      <CreditCard className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('net_banking')} className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${paymentMethod === 'net_banking' ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'}`}>
                      <span className="font-black text-[10px] font-mono uppercase tracking-wider">Bank</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#050816] rounded-xl border border-white/10 flex justify-between items-center mt-5">
                  <span className="text-[#9CA3AF] font-black text-[10px] uppercase tracking-widest font-mono">Total</span>
                  <span className="text-2xl font-black font-mono text-[#14F1D9] tracking-tighter">₹{bookingTotal.toFixed(2)}</span>
                </div>

                <button type="submit" className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FFB703] to-[#F59E0B] text-[#0B1120] font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-[0_0_20px_rgba(255,183,3,0.3)] mt-4">
                  Pay with Razorpay
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
