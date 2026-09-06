import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, Clock, Target, Shield, Crosshair,
  ArrowRight, Check, X, CreditCard, AlertTriangle, RotateCcw, Minus, Plus, Zap
} from 'lucide-react';
import { printTicket } from '../lib/printTicket';
import { ReservationCalendar } from './ReservationCalendar';
import { getAvailableTimeSlots, getTodayDateString, isPastDate } from '../lib/slotUtils';

interface BulletHole {
  x: number;
  y: number;
  score: number;
  id: string;
}

interface ShootingPackage {
  id: string;
  name: string;
  price: number;
  description: string;
  shots: number;
}

interface ActivityPageProps {
  onSuccessClose?: () => void;
}

export const ShootingActivityPage: React.FC<ActivityPageProps> = ({ onSuccessClose }) => {
  const { createBooking, timeSlots, activities, razorpayKeyId } = useAppContext();
  const shootingActivity = activities.find(a => a.id === 'act-air-gun');

  const defaultPackages: ShootingPackage[] = [
    { id: 'pkg-shoot-1', name: 'Starter Aim (15 Shots)', price: 15, description: 'Perfect for beginners learning basic trigger control.', shots: 15 },
    { id: 'pkg-shoot-2', name: 'Sharp Shooter (30 Shots)', price: 25, description: 'Most popular. Includes electronic reactive target mode.', shots: 30 },
    { id: 'pkg-shoot-3', name: 'Marksman Elite (50 Shots)', price: 35, description: 'Advanced targets, competition grade pellets, full telemetry analysis.', shots: 50 }
  ];

  const packages: ShootingPackage[] = (shootingActivity?.packages && shootingActivity.packages.length > 0)
    ? shootingActivity.packages
    : defaultPackages;

  const [selectedPackage, setSelectedPackage] = useState<ShootingPackage>(packages[0] || defaultPackages[0]);

  React.useEffect(() => {
    if (packages.length > 0) {
      const match = packages.find(p => p.id === selectedPackage?.id);
      if (match) {
        setSelectedPackage(match);
      } else {
        setSelectedPackage(packages[0]);
      }
    }
  }, [packages]);
  const [packageQuantity, setPackageQuantity] = useState<number>(1);
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

  const [shots, setShots] = useState<BulletHole[]>([]);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [lastFeedback, setLastFeedback] = useState<string>('System ready. Aim and fire.');
  const targetContainerRef = useRef<HTMLDivElement>(null);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'net_banking' | 'cash' | 'complimentary'>('upi');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  const bookingTotal = paymentMethod === 'complimentary' ? 0 : selectedPackage.price * packageQuantity;

  const triggerShot = () => {
    setIsAiming(true);
    setLastFeedback('Calibrating aim...');

    setTimeout(() => {
      const jitterX = (Math.random() - 0.5) * 32;
      const jitterY = (Math.random() - 0.5) * 32;
      const x = 50 + jitterX;
      const y = 50 + jitterY;
      registerShotAtCoords(x, y);
      setIsAiming(false);
    }, 800);
  };

  const handleTargetClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isAiming) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const pctX = (clickX / rect.width) * 100;
    const pctY = (clickY / rect.height) * 100;
    registerShotAtCoords(pctX, pctY);
  };

  const registerShotAtCoords = (x: number, y: number) => {
    const dist = Math.sqrt(Math.pow(x - 50, 2) + Math.pow(y - 50, 2));
    
    let score = 0;
    let desc = 'Miss!';
    if (dist < 4) { score = 10; desc = 'BULLSEYE! 🎯'; }
    else if (dist < 10) { score = 9; desc = 'Excellent!'; }
    else if (dist < 18) { score = 8; desc = 'Great Aim!'; }
    else if (dist < 26) { score = 7; desc = 'On Target!'; }
    else if (dist < 36) { score = 6; desc = 'Outer Ring!'; }
    else if (dist < 46) { score = 5; desc = 'Clip!'; }
    else { score = 0; desc = 'Miss!'; }

    const newHole: BulletHole = {
      id: `hole-${Date.now()}-${Math.random()}`, x, y, score
    };

    setShots(prev => [...prev, newHole]);
    setTotalScore(prev => prev + score);
    setLastFeedback(`IMPACT: ${desc} (+${score} PTS)`);
  };

  const resetTarget = () => {
    setShots([]);
    setTotalScore(0);
    setLastFeedback('Target wiped clean. Ready.');
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
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

    if (bookingTotal <= 0 && paymentMethod !== 'complimentary') {
      setErrorMessage('Please select a valid range package.');
      return;
    }

    const details = `Package: ${selectedPackage.name} | Qty: ${packageQuantity} | Ammo: 4.5mm Pro Match`;

    const finalizeBooking = () => {
      const result = createBooking({
        customerName, customerPhone, customerEmail,
        activityId: 'act-air-gun',
        activityName: 'Precision Air Gun Shooting',
        date: bookingDate,
        timeSlot: selectedSlot,
        ticketType: paymentMethod === 'complimentary' ? 'Complimentary VIP Pass' : 'package',
        details,
        quantity: packageQuantity,
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

      fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: bookingTotal, currency: 'INR' })
      }).then(res => res.json()).then(order => {
        const options = {
          key: razorpayKeyId || 'rzp_live_TYnsYBkCUZzRR3',
          amount: order.amount,
          currency: order.currency,
          name: 'Deuce Adventure Park',
          description: 'Shooting Booking',
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
          theme: { color: '#a855f7' },
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
        
        {/* LEFT COLUMN: SIMULATOR STATION */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-5 h-full overflow-y-auto pr-2 custom-scrollbar">
          
          {/* SIMULATOR GAME */}
          <section className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-[#FFB703] rounded-full shadow-[0_0_5px_#FFB703]"></div>
              <h2 className="text-lg font-black text-white tracking-tight">Electronic Simulator</h2>
            </div>
            
            <div className="glass-panel p-4 rounded-xl border border-white/10 shadow-lg relative overflow-hidden flex-1 flex flex-col">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#14F1D9]/5 via-[#0B1120] to-[#0B1120] pointer-events-none"></div>
              
              <div className="flex justify-between items-center relative z-10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500 z-10"></div>
                    <div className="w-2 h-2 rounded-full bg-red-500 absolute animate-ping opacity-75"></div>
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#9CA3AF]">Range Active</span>
                </div>
                <button
                  onClick={resetTarget}
                  className="px-2.5 py-1 rounded-md bg-[#050816] border border-white/10 hover:border-white/30 text-[9px] font-mono font-bold uppercase text-[#9CA3AF] flex items-center gap-1 transition-all cursor-pointer shadow-inner"
                >
                  <RotateCcw className="h-3 w-3" /> Reset Target
                </button>
              </div>

              {/* Game Area */}
              <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-6 relative z-10">
                {/* SVG Target */}
                <div ref={targetContainerRef} className="relative w-64 h-64 md:w-72 md:h-72 p-2 rounded-full bg-[#050816] border-4 border-white/5 flex items-center justify-center overflow-hidden shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] cursor-crosshair shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full select-none" onClick={handleTargetClick}>
                    {/* Concentric targets */}
                    <circle cx="50" cy="50" r="48" fill="#0B1120" stroke="#14F1D9" strokeWidth="0.5" strokeOpacity="0.3" />
                    <circle cx="50" cy="50" r="40" fill="#050816" stroke="#14F1D9" strokeWidth="0.5" strokeOpacity="0.4" />
                    <circle cx="50" cy="50" r="32" fill="#0B1120" stroke="#14F1D9" strokeWidth="0.5" strokeOpacity="0.5" />
                    <circle cx="50" cy="50" r="24" fill="#050816" stroke="#14F1D9" strokeWidth="0.5" strokeOpacity="0.6" />
                    <circle cx="50" cy="50" r="16" fill="#0B1120" stroke="#14F1D9" strokeWidth="1" strokeOpacity="0.8" />
                    <circle cx="50" cy="50" r="8" fill="#14F1D9" fillOpacity="0.1" stroke="#FFB703" strokeWidth="1" />
                    <circle cx="50" cy="50" r="3" fill="#FFB703" />

                    {/* Concentric score labels */}
                    <text x="50" y="14" fill="#14F1D9" fontSize="4" textAnchor="middle" opacity="0.4">5</text>
                    <text x="50" y="22" fill="#14F1D9" fontSize="4" textAnchor="middle" opacity="0.4">6</text>
                    <text x="50" y="30" fill="#14F1D9" fontSize="4" textAnchor="middle" opacity="0.4">7</text>
                    <text x="50" y="38" fill="#14F1D9" fontSize="4" textAnchor="middle" opacity="0.4">8</text>
                    <text x="50" y="46" fill="#14F1D9" fontSize="4" textAnchor="middle" opacity="0.4">9</text>

                    {/* Simulated laser crosshair guides */}
                    <line x1="50" y1="2" x2="50" y2="98" stroke="#00B4FF" strokeWidth="0.2" strokeOpacity="0.5" strokeDasharray="1 2" />
                    <line x1="2" y1="50" x2="98" y2="50" stroke="#00B4FF" strokeWidth="0.2" strokeOpacity="0.5" strokeDasharray="1 2" />

                    {/* Bullet Holes Render */}
                    {shots.map(hole => (
                      <g key={hole.id}>
                        <circle cx={hole.x} cy={hole.y} r="1.5" fill="#FFB703" opacity="0.9" />
                        <circle cx={hole.x} cy={hole.y} r="3" fill="none" stroke="#FFB703" strokeWidth="0.5" opacity="0.7" className="animate-pulse" />
                        <circle cx={hole.x} cy={hole.y} r="0.6" fill="#050816" />
                      </g>
                    ))}
                  </svg>
                </div>

                {/* Telemetry Panel */}
                <div className="flex-1 w-full space-y-4">
                  <div className="p-4 bg-[#050816] border border-white/5 rounded-xl space-y-3 font-mono">
                    <div>
                      <span className="text-[#9CA3AF] block text-[9px] uppercase tracking-wider mb-0.5">Accuracy Ratio</span>
                      <span className="text-3xl font-black text-[#14F1D9] tracking-tighter">
                        {shots.length > 0 ? `${Math.round((shots.filter(h => h.score >= 8).length / shots.length) * 100)}` : '0'}%
                      </span>
                    </div>

                    <div className="h-[1px] w-full bg-white/10"></div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[#9CA3AF] block text-[9px] uppercase">Rounds</span>
                        <span className="text-sm font-bold text-white">{shots.length}</span>
                      </div>
                      <div>
                        <span className="text-[#9CA3AF] block text-[9px] uppercase">Score</span>
                        <span className="text-sm font-bold text-[#FFB703]">{totalScore}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={triggerShot}
                      disabled={isAiming}
                      className="w-full py-3 rounded-lg bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] disabled:opacity-50 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(20,241,217,0.2)] hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Crosshair className="h-4 w-4" /> Pull Trigger
                    </button>
                    <div className="p-2 bg-[#0B1120] border border-white/5 rounded-lg text-center shadow-inner">
                      <p className="text-[9px] text-[#00B4FF] font-mono font-bold uppercase">{lastFeedback}</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: PACKAGES & BOOKING */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-5 h-full overflow-y-auto pr-2 custom-scrollbar">
            
          {/* 5. PACKAGE SELECTION */}
          <div className="glass-panel p-4 rounded-xl border border-white/10 shadow-lg flex-shrink-0">
            <h3 className="font-black text-sm text-white mb-3 flex items-center gap-2 tracking-tight">
              <Target className="w-4 h-4 text-[#FFB703]" /> Select Ammunition Package
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
                  <p className="text-[9px] text-[#9CA3AF] leading-snug relative z-10 pr-2 line-clamp-1 mb-1.5">{pkg.description}</p>
                  <div className="text-[9px] font-mono text-[#14F1D9] relative z-10 uppercase font-bold">
                    <span>⚡ Includes {pkg.shots} Pro Match Pellets</span>
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
                <div className="flex items-center justify-between p-3 bg-[#050816] rounded-xl border border-white/5 mb-1">
                  <span className="font-bold text-[#9CA3AF] text-[10px] uppercase tracking-wider font-mono">Bays/Quantity</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setPackageQuantity(Math.max(1, packageQuantity - 1))} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/5">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-black font-mono text-sm text-white w-4 text-center">{packageQuantity}</span>
                    <button type="button" onClick={() => setPackageQuantity(packageQuantity + 1)} className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center text-white hover:bg-[#14F1D9] hover:text-[#0B1120] transition-colors cursor-pointer border border-white/5">
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
                      <select value={selectedSlot} onChange={e => setSelectedSlot(e.target.value)} disabled={availableSlots.length === 0} className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-white focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9]/50 focus:outline-none transition-all font-mono text-xs appearance-none cursor-pointer disabled:opacity-50">
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
                  {successBooking.booking.paymentStatus === 'pending' ? 'Your booking has been reserved successfully. Please arrive at least 30 minutes before your activity and complete your payment at the ticket counter. Your reservation will remain valid until the scheduled reporting time.' : 'Your range pass is ready. Please present the QR code below at the entry gates.'}
                </p>
                
                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  <div className="flex-1 p-5 bg-[#050816] rounded-xl border border-white/10 text-xs text-white text-left space-y-3 font-mono shadow-inner">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2"><span className="text-[#9CA3AF] font-bold">Ticket ID</span> <span className="font-black text-[#14F1D9]">TKT-{successBooking.booking.id}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Activity</span> <span className="font-bold">Air Rifle Range</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Package</span> <span className="font-bold text-right">{selectedPackage.name}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Bays</span> <span className="font-bold truncate max-w-[120px] text-right">{packageQuantity}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[#9CA3AF] font-bold">Session</span> <span className="font-bold">{bookingDate} @ {selectedSlot}</span></div>
                    {successBooking.booking.paymentStatus === 'pending' && (
                      <div className="flex justify-between items-center border-t border-white/5 pt-2"><span className="text-[#9CA3AF] font-bold">Amount Due</span> <span className="font-black text-amber-400">₹{bookingTotal.toFixed(2)} (Cash)</span></div>
                    )}
                  </div>
                  <div className="w-full md:w-32 flex flex-col justify-center items-center p-4 bg-white rounded-xl shadow-lg border-2 border-solid border-gray-300">
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
                  <label className="text-[#9CA3AF] font-black text-[9px] uppercase tracking-widest font-mono block text-center">Payment / Pass Option</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button type="button" onClick={() => setPaymentMethod('upi')} className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${paymentMethod === 'upi' ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'}`}>
                      <span className="font-black text-[10px] font-mono uppercase tracking-wider">UPI</span>
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('card')} className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${paymentMethod === 'card' ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'}`}>
                      <CreditCard className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setPaymentMethod('net_banking')} className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${paymentMethod === 'net_banking' ? 'bg-[#14F1D9]/10 border-[#14F1D9]/50 text-[#14F1D9] shadow-[0_0_15px_rgba(20,241,217,0.15)]' : 'bg-[#050816] border-white/10 text-[#9CA3AF] hover:border-white/30 hover:text-white'}`}>
                      <span className="font-black text-[10px] font-mono uppercase tracking-wider">Bank</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#050816] rounded-xl border border-white/10 space-y-2 mt-4 font-mono">
                  <div className="flex justify-between items-center text-xs text-[#9CA3AF]">
                    <span>Subtotal:</span>
                    <span>₹{bookingTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-[#40E0D0]">
                    <span>Razorpay Fee (2.36%):</span>
                    <span>+ ₹{(bookingTotal * 0.0236).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-2">
                    <span className="text-white font-black text-[10px] uppercase tracking-widest">
                      Total Payable
                    </span>
                    <span className="text-2xl font-black tracking-tighter text-[#14F1D9]">
                      ₹{(bookingTotal * 1.0236).toFixed(2)}
                    </span>
                  </div>
                </div>

                <button type="submit" className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-lg mt-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  Pay with Razorpay (₹{(bookingTotal * 1.0236).toFixed(2)})
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
