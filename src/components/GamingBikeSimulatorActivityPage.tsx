/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Monitor, Play, Clock, ShieldCheck, Gamepad2, Zap, 
  IndianRupee, Check, ArrowRight, AlertTriangle, Cpu, Gauge,
  RefreshCw, RotateCcw, Download, Sparkles
} from 'lucide-react';
import { ReservationCalendar } from './ReservationCalendar';
import { getAvailableTimeSlots, getTodayDateString, isPastDate } from '../lib/slotUtils';
import { printTicket } from '../lib/printTicket';

interface ActivityPageProps {
  onSuccessClose?: () => void;
}

export const GamingBikeSimulatorActivityPage: React.FC<ActivityPageProps> = ({ onSuccessClose }) => {
  const { createBooking, gamingPcs, gamingPackages, gamingGames, razorpayKeyId } = useAppContext();

  // Package & Game Selection
  const [selectedPkgId, setSelectedPkgId] = useState<string>(gamingPackages[0]?.id || 'pkg-gaming-30m');
  const [selectedGameId, setSelectedGameId] = useState<string>(gamingGames[0]?.id || 'game-gta5');
  const [packageQuantity, setPackageQuantity] = useState<number>(1);

  // Customer Form
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [bookingDate, setBookingDate] = useState<string>(() => getTodayDateString());

  const availableSlots = getAvailableTimeSlots(bookingDate);
  const [selectedSlot, setSelectedSlot] = useState<string>(() => availableSlots[0] || '10:00 AM - 11:00 AM');

  // Simulator Calibration Interactive Demo
  const [selectedStation, setSelectedStation] = useState<string>('DEUCE-PC-01');
  const [simSpeed, setSimSpeed] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Payment & Success States
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'cash' | 'complimentary'>('upi');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBooking, setSuccessBooking] = useState<any | null>(null);

  const selectedPkg = gamingPackages.find(p => p.id === selectedPkgId) || gamingPackages[0] || { id: 'pkg-gaming-30m', name: '30 Mins Pro Gaming', price: 90, durationMinutes: 30 };
  const selectedGame = gamingGames.find(g => g.id === selectedGameId) || gamingGames[0] || { name: 'GTA V' };

  const bookingTotal = paymentMethod === 'complimentary' ? 0 : (selectedPkg?.price || 90) * packageQuantity;

  // Simulate bike throttle accel
  const handleThrottleClick = () => {
    setIsSimulating(true);
    let s = simSpeed;
    const interval = setInterval(() => {
      s += 12;
      if (s >= 180) {
        s = 180;
        clearInterval(interval);
        setTimeout(() => setIsSimulating(false), 800);
      }
      setSimSpeed(s);
    }, 100);
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
      setErrorMessage('Booking for past dates is not allowed.');
      return;
    }

    const result = createBooking({
      customerName,
      customerEmail: customerEmail.trim() || `${customerName.toLowerCase().replace(/\s+/g, '')}@deucegaming.station`,
      customerPhone,
      activityId: 'act-gaming-pc',
      activityName: `VR Bike & Gaming Station (${selectedStation})`,
      date: bookingDate,
      timeSlot: selectedSlot,
      ticketType: paymentMethod === 'complimentary' ? 'Complimentary VIP Pass' : 'package',
      details: `Package: ${selectedPkg.name} (${selectedPkg.durationMinutes} Mins) - Game: ${selectedGame.name}`,
      quantity: packageQuantity,
      totalAmount: bookingTotal,
      paymentMethod,
      packageId: selectedPkg.id
    });

    if (typeof result === 'string') {
      setErrorMessage(result);
    } else {
      setSuccessBooking(result);
      setIsPaymentOpen(false);
    }
  };

  return (
    <div className="space-y-8 text-gray-100 font-sans">
      {/* ─────────────────────────────────────────────────────────────
          HERO BANNER
      ───────────────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden border border-emerald-500/30 bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 p-8 md:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Gamepad2 className="w-4 h-4" /> DEUCE VR BIKE SIMULATOR & GAMING RIGS
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">
            VR Moto GP Bike Simulator & RTX 4080 Gaming
          </h1>

          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            Experience realistic lean-angle telemetry, force-feedback handlebars, high refresh 240Hz monitors, and standalone local session control for Moto GP, GTA V, NFS, and Valorant.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-emerald-300 pt-2">
            <span className="flex items-center gap-1.5"><Cpu className="w-4 h-4" /> RTX 4080 Rigs</span>
            <span className="flex items-center gap-1.5"><Gauge className="w-4 h-4" /> Force Feedback Bike Telemetry</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Offline Monotonic Timer Guard</span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          INTERACTIVE MOTO GP BIKE SIMULATOR CALIBRATOR
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Gauge className="w-5 h-5 text-emerald-400" /> VR Bike Telemetry & Throttle Simulator
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Test simulated lean angle & throttle response before reserving your station.</p>
          </div>

          <button
            onClick={handleThrottleClick}
            disabled={isSimulating}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950/40 disabled:opacity-50 flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-current" /> Twist Throttle Test
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Speedometer Gauge */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
            <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">Simulated Velocity</span>
            <div className="text-5xl font-black font-mono text-emerald-400 tracking-tight">
              {simSpeed} <span className="text-sm font-normal text-gray-400">KM/H</span>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-cyan-400 h-full transition-all duration-300" style={{ width: `${(simSpeed / 180) * 100}%` }} />
            </div>
          </div>

          {/* Select Game / Experience */}
          <div className="md:col-span-2 space-y-3">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block">Choose Game Experience</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {gamingGames.map(game => (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGameId(game.id)}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                    selectedGameId === game.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-950/30'
                      : 'bg-slate-950/60 border-slate-800 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <div className="font-bold text-xs truncate">{game.name}</div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-2">{game.category || 'Simulator'}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          LIVE PC STATIONS STATUS GRID
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Monitor className="w-5 h-5 text-emerald-400" /> Live Station Status Monitor
          </h2>
          <span className="text-xs text-gray-400 font-mono">Real-time Heartbeat Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {gamingPcs.map(pc => (
            <div
              key={pc.id}
              onClick={() => setSelectedStation(pc.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                selectedStation === pc.id
                  ? 'bg-emerald-500/20 border-emerald-500 shadow-lg shadow-emerald-950/30'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white">{pc.id}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  pc.status === 'PLAYING' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {pc.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{pc.pcName}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BOOKING & PACKAGE SELECTION FORM
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" /> Select Package & Book Session
        </h2>

        {errorMessage && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Packages Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {gamingPackages.map(pkg => (
            <div
              key={pkg.id}
              onClick={() => setSelectedPkgId(pkg.id)}
              className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between space-y-3 ${
                selectedPkgId === pkg.id
                  ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-xl shadow-emerald-950/30'
                  : 'bg-slate-950/60 border-slate-800 text-gray-300 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="font-bold text-base text-white">{pkg.name}</div>
                <div className="text-xs text-emerald-400 font-semibold mt-0.5">{pkg.durationMinutes} Minutes Session</div>
              </div>
              <div className="text-2xl font-black text-white flex items-center">
                <IndianRupee className="w-5 h-5 text-emerald-400" /> {pkg.price}
              </div>
            </div>
          ))}
        </div>

        {/* Form Details */}
        <form onSubmit={handleBookingSubmit} className="space-y-6 pt-4 border-t border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Mercer"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Phone Number</label>
              <input
                type="text"
                required
                placeholder="e.g. +91 9876543210"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Email ID (Optional)</label>
              <input
                type="email"
                placeholder="alex@example.com"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Reservation Date</label>
              <ReservationCalendar selectedDate={bookingDate} onDateSelect={setBookingDate} />
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">Select Time Slot</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                      selectedSlot === slot
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="upi">UPI / QR Code</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Pay at Counter</option>
                  <option value="complimentary">Complimentary VIP Pass</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-950/40 transition flex items-center justify-center gap-2"
              >
                Confirm & Purchase Session (Total: ₹{bookingTotal})
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* SUCCESS TICKET PASS MODAL */}
      {successBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 w-full max-w-md space-y-5 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <Check className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white">Gaming Session Confirmed!</h3>
              <p className="text-xs text-gray-400 mt-1">Booking Ref: {successBooking.booking.id}</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between text-gray-400"><span>Customer:</span> <span className="text-white font-bold">{successBooking.booking.customerName}</span></div>
              <div className="flex justify-between text-gray-400"><span>Station:</span> <span className="text-emerald-400 font-bold">{selectedStation}</span></div>
              <div className="flex justify-between text-gray-400"><span>Package:</span> <span className="text-white font-bold">{selectedPkg.name}</span></div>
              <div className="flex justify-between text-gray-400"><span>Amount Paid:</span> <span className="text-emerald-400 font-bold">₹{bookingTotal}</span></div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => printTicket(successBooking.ticket || successBooking.booking)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Print Ticket Pass
              </button>
              <button
                onClick={() => {
                  setSuccessBooking(null);
                  if (onSuccessClose) onSuccessClose();
                }}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamingBikeSimulatorActivityPage;
