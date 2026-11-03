/**
 * DEUCE ADVENTURE PARK - ONLINE BOOKINGS & QR CHECK-IN MANAGEMENT PANEL
 * Multi-tab support:
 * 1. Online Bookings (All)
 * 2. Upcoming Bookings
 * 3. Checked-in Bookings
 * 4. Pending Bookings
 * 5. Cancelled Bookings
 * 6. Refunds
 * 
 * Supports:
 * - Realtime cloud verification + Local SQLite offline check-in fallback
 * - Hardware USB Barcode / QR Wedge scanners (instant Enter key capture)
 * - Built-in Camera QR scanner
 * - Strict duplicate check-in prevention with alert banner
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle, 
  RotateCcw, QrCode, Camera, RefreshCw, Printer, User, Phone, 
  Sparkles, ShieldCheck, Download, Filter, Eye, Check, X, ArrowRight
} from 'lucide-react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { getTodayDateString } from '../lib/slotUtils';
import { getComputerId } from '../lib/deviceSetup';

export interface OnlineBookingItem {
  id: string;
  bookingRef: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  activityId: string;
  activityName: string;
  date: string;
  timeSlot: string;
  quantity: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded';
  paymentId?: string;
  qrPassCode: string;
  checkInStatus: 'CONFIRMED' | 'CHECKED_IN' | 'CANCELLED';
  checkedInAt?: string;
  checkedInBy?: string;
  computerId?: string;
  createdAt: string;
}

interface Props {
  staffName?: string;
}

export const OnlineBookingsManager: React.FC<Props> = ({ staffName = 'Counter Staff' }) => {
  const [filterView, setFilterView] = useState<'all' | 'upcoming' | 'checked_in' | 'pending' | 'cancelled' | 'refunds'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayDateString());
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState<OnlineBookingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Scanner State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [usbInput, setUsbInput] = useState('');
  const [scanModalResult, setScanModalResult] = useState<{
    status: 'success' | 'duplicate' | 'pending_payment' | 'not_found' | 'error';
    message: string;
    booking?: any;
    checkedInAt?: string;
    checkedInBy?: string;
  } | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const usbInputRef = useRef<HTMLInputElement>(null);

  // Fetch online bookings from API
  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/bookings/online?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);

        // Cache downloaded online bookings into local SQLite for offline operations
        try {
          await fetch('/api/local/sync-online-bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookings: data })
          });
        } catch (e) {
          // Non-critical local cache error
        }
      }
    } catch (err) {
      console.warn('[OnlineBookings] API offline, loading from local SQLite cache...');
      // Fallback: try fetching from local SQLite
      try {
        const localRes = await fetch(`/api/local/tickets?date=${selectedDate}`);
        if (localRes.ok) {
          const localData = await localRes.json();
          // Map local tickets if available
          setBookings(localData.map((t: any) => ({
            id: t.id,
            bookingRef: t.booking_id || `DEUCE-TKT-${t.id}`,
            customerName: t.customer_name,
            customerPhone: t.customer_phone,
            customerEmail: t.customer_email,
            activityId: t.activity_id,
            activityName: t.activity_name,
            date: t.date,
            timeSlot: t.time_slot,
            quantity: t.quantity,
            totalAmount: t.total_amount,
            paymentStatus: t.payment_status === 'completed' ? 'paid' : t.payment_status,
            qrPassCode: t.qr_code_value,
            checkInStatus: t.checked_in ? 'CHECKED_IN' : 'CONFIRMED',
            checkedInAt: t.checked_in_at,
            createdAt: t.created_at
          })));
        }
      } catch (localErr) {
        console.error('Failed to load offline bookings:', localErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedDate]);

  // Sync / Download Bookings Button
  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      await fetchBookings();
      setSyncMessage('Online bookings updated & cached into local SQLite!');
    } catch (err: any) {
      setSyncMessage('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  // Perform Check-in (Cloud first with automatic local SQLite offline fallback)
  const executeCheckIn = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    try {
      // 1. Try central API check-in
      const res = await fetch('/api/bookings/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrOrRef: trimmed,
          staffName,
          terminalId: getComputerId()
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.duplicate) {
          setScanModalResult({
            status: 'duplicate',
            message: data.message,
            checkedInAt: data.checkedInAt,
            checkedInBy: data.checkedInBy
          });
        } else if (!data.success) {
          setScanModalResult({
            status: 'error',
            message: data.message || 'Check-in validation failed.'
          });
        } else {
          setScanModalResult({
            status: 'success',
            message: data.message || 'Check-in confirmed successfully!',
            booking: data.booking
          });
          fetchBookings();
        }
        return;
      }
    } catch (networkErr) {
      console.warn('[CheckIn] Central API unreachable, trying local offline SQLite check-in...');
    }

    // 2. Offline fallback: Check in via local SQLite
    try {
      const localRes = await fetch('/api/local/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrOrRef: trimmed,
          staffName,
          computerId: getComputerId()
        })
      });

      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData.duplicate) {
          setScanModalResult({
            status: 'duplicate',
            message: localData.message,
            checkedInAt: localData.checkedInAt,
            checkedInBy: localData.checkedInBy
          });
        } else if (localData.success) {
          setScanModalResult({
            status: 'success',
            message: localData.message || 'Check-in confirmed locally (Offline Mode)',
            booking: localData.booking
          });
          fetchBookings();
        } else {
          setScanModalResult({
            status: 'not_found',
            message: localData.message || 'Pass not found in local offline database.'
          });
        }
        return;
      }
    } catch (e: any) {
      setScanModalResult({
        status: 'error',
        message: 'Could not validate pass: ' + e.message
      });
    }
  };

  // Handle USB Barcode / QR Wedge Scanner Submission
  const handleUsbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usbInput.trim()) return;
    executeCheckIn(usbInput);
    setUsbInput('');
  };

  // Camera Scanner Setup
  useEffect(() => {
    if (isCameraActive) {
      scannerRef.current = new Html5QrcodeScanner(
        'booking-qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true
        },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          setIsCameraActive(false);
          if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
          }
          executeCheckIn(decodedText);
        },
        () => {}
      );
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isCameraActive]);

  // Filter Bookings
  const filteredBookings = bookings.filter(b => {
    // 1. Search Query
    const q = searchQuery.toLowerCase();
    const matchSearch = 
      b.customerName.toLowerCase().includes(q) ||
      b.customerPhone.includes(q) ||
      b.bookingRef.toLowerCase().includes(q) ||
      b.qrPassCode.toLowerCase().includes(q);

    if (!matchSearch) return false;

    // 2. View Tab Filter
    if (filterView === 'upcoming') {
      return b.checkInStatus === 'CONFIRMED' && b.paymentStatus === 'paid';
    }
    if (filterView === 'checked_in') {
      return b.checkInStatus === 'CHECKED_IN';
    }
    if (filterView === 'pending') {
      return b.paymentStatus === 'pending';
    }
    if (filterView === 'cancelled') {
      return b.checkInStatus === 'CANCELLED';
    }
    if (filterView === 'refunds') {
      return b.paymentStatus === 'refunded';
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ── TOP HEADER & QUICK STATS ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-[#1C1C1C] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#14F1D9] to-[#00B4FF] flex items-center justify-center text-[#0B1120] font-black shadow-[0_0_15px_rgba(20,241,217,0.3)]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                Online Bookings & Entry Check-In
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#14F1D9]/10 text-[#14F1D9] border border-[#14F1D9]/30">
                  Counter: {getComputerId()}
                </span>
              </h2>
              <p className="text-[#94A3B8] text-xs font-mono mt-0.5">
                Atomic capacity verification & duplicate pass prevention
              </p>
            </div>
          </div>
        </div>

        {/* Sync & Date Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-[#050816] px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono">
            <Calendar className="w-3.5 h-3.5 text-[#14F1D9]" />
            <input 
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#14F1D9] ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Cloud & SQLite'}
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3 rounded-xl bg-[#14F1D9]/10 border border-[#14F1D9]/30 text-[#14F1D9] text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* ── FAST QR SCANNER BAR (USB WEDGE & CAMERA) ── */}
      <div className="glass-panel p-4 rounded-2xl border border-[#14F1D9]/30 bg-gradient-to-r from-[#0B1120] to-[#050816] shadow-lg">
        <div className="flex flex-col md:flex-row items-center gap-3">
          
          {/* USB Scanner Input Field */}
          <form onSubmit={handleUsbSubmit} className="flex-1 w-full relative">
            <input
              ref={usbInputRef}
              type="text"
              value={usbInput}
              onChange={e => setUsbInput(e.target.value)}
              placeholder="Scan QR Pass / Barcode with USB Scanner, or enter Booking Ref (DEUCE-BK-...)"
              className="w-full bg-[#050816] border border-[#14F1D9]/50 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#14F1D9]/50 transition-all pr-24"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#14F1D9] text-[#0B1120] rounded-lg font-black font-mono text-xs hover:bg-[#00B4FF] transition-all flex items-center gap-1 cursor-pointer"
            >
              Check In <ArrowRight className="w-3 h-3" />
            </button>
          </form>

          {/* Camera Scanner Trigger */}
          <button
            onClick={() => setIsCameraActive(!isCameraActive)}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap ${
              isCameraActive 
                ? 'bg-red-500/20 text-red-400 border-red-500/50' 
                : 'bg-white/5 text-white border-white/10 hover:border-white/30'
            }`}
          >
            <Camera className="w-4 h-4 text-[#14F1D9]" />
            {isCameraActive ? 'Close Camera' : 'Camera Scanner'}
          </button>
        </div>

        {/* Live Camera Scanner Box */}
        {isCameraActive && (
          <div className="mt-4 p-4 bg-[#050816] rounded-xl border border-white/10 flex flex-col items-center">
            <div id="booking-qr-reader" className="w-full max-w-sm rounded-lg overflow-hidden"></div>
            <p className="text-[10px] text-gray-400 font-mono mt-2 text-center">
              Position guest's phone QR pass within the camera box to validate entry
            </p>
          </div>
        )}
      </div>

      {/* ── CHECK-IN RESULT MODAL / BANNER ── */}
      {scanModalResult && (
        <div className={`p-4 rounded-2xl border text-sm animate-fade-in relative shadow-2xl ${
          scanModalResult.status === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-emerald-500/10'
            : scanModalResult.status === 'duplicate'
            ? 'bg-red-500/15 border-red-500/70 text-white shadow-red-500/20'
            : 'bg-amber-500/10 border-amber-500/50 text-white'
        }`}>
          <button 
            onClick={() => setScanModalResult(null)} 
            className="absolute top-3 right-3 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3">
            {scanModalResult.status === 'success' && (
              <CheckCircle2 className="w-7 h-7 text-emerald-400 flex-shrink-0" />
            )}
            {scanModalResult.status === 'duplicate' && (
              <AlertTriangle className="w-7 h-7 text-red-400 flex-shrink-0" />
            )}
            {scanModalResult.status !== 'success' && scanModalResult.status !== 'duplicate' && (
              <XCircle className="w-7 h-7 text-amber-400 flex-shrink-0" />
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-base uppercase tracking-tight">
                  {scanModalResult.status === 'success' && 'GATE ENTRY APPROVED'}
                  {scanModalResult.status === 'duplicate' && 'DUPLICATE CHECK-IN ATTEMPT DETECTED!'}
                  {scanModalResult.status === 'not_found' && 'PASS NOT FOUND'}
                  {scanModalResult.status === 'error' && 'CHECK-IN ERROR'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  scanModalResult.status === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                }`}>
                  {scanModalResult.status}
                </span>
              </div>

              <p className="text-xs text-gray-200 mt-1 font-mono leading-relaxed">
                {scanModalResult.message}
              </p>

              {scanModalResult.booking && (
                <div className="mt-3 p-3 bg-black/40 rounded-xl border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-gray-400 text-[10px] block uppercase">Guest</span>
                    <span className="font-bold text-white">{scanModalResult.booking.customerName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block uppercase">Activity</span>
                    <span className="font-bold text-[#14F1D9]">{scanModalResult.booking.activityName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block uppercase">Time Slot</span>
                    <span className="font-bold text-white">{scanModalResult.booking.timeSlot}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 text-[10px] block uppercase">Pax Count</span>
                    <span className="font-bold text-amber-400">{scanModalResult.booking.quantity} Pax</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MULTI-VIEW SUBTABS ── */}
      <div className="flex border-b border-[#1C1C1C] gap-1 overflow-x-auto pb-1 text-xs font-mono">
        {[
          { id: 'all', label: 'All Bookings', count: bookings.length },
          { id: 'upcoming', label: 'Upcoming (Confirmed)', count: bookings.filter(b => b.checkInStatus === 'CONFIRMED' && b.paymentStatus === 'paid').length },
          { id: 'checked_in', label: 'Checked In', count: bookings.filter(b => b.checkInStatus === 'CHECKED_IN').length },
          { id: 'pending', label: 'Pending Payment', count: bookings.filter(b => b.paymentStatus === 'pending').length },
          { id: 'cancelled', label: 'Cancelled', count: bookings.filter(b => b.checkInStatus === 'CANCELLED').length },
          { id: 'refunds', label: 'Refunds', count: bookings.filter(b => b.paymentStatus === 'refunded').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterView(tab.id as any)}
            className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              filterView === tab.id
                ? 'border-[#14F1D9] text-[#14F1D9] bg-white/5'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10 text-white">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── SEARCH & TABLE LIST ── */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, cell number, booking reference (DEUCE-BK-...) or QR code..."
            className="w-full bg-[#050816] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder-gray-500 font-mono text-xs focus:border-[#14F1D9] focus:outline-none"
          />
        </div>

        {/* Table of Online Bookings */}
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400 font-mono text-xs">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#14F1D9]" />
              Loading bookings...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-8 text-center text-gray-400 font-mono text-xs">
              No online bookings found for this date & filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#050816] text-gray-400 uppercase text-[10px] tracking-wider border-b border-white/10">
                  <tr>
                    <th className="p-3">Ref / Time</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Activity & Pax</th>
                    <th className="p-3">Total Amount</th>
                    <th className="p-3">Payment</th>
                    <th className="p-3">Gate Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredBookings.map(b => (
                    <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-white block">{b.bookingRef}</span>
                        <span className="text-[10px] text-[#14F1D9]">{b.timeSlot}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{b.customerName}</span>
                        <span className="text-[10px] text-gray-400">{b.customerPhone}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{b.activityName}</span>
                        <span className="text-[10px] text-amber-400 font-bold">{b.quantity} Pax</span>
                      </td>
                      <td className="p-3">
                        <span className="font-black text-white font-mono">₹{b.totalAmount}</span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          b.paymentStatus === 'paid' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : b.paymentStatus === 'refunded'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {b.paymentStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        {b.checkInStatus === 'CHECKED_IN' ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Checked In
                            </span>
                            {b.checkedInAt && (
                              <span className="block text-[9px] text-gray-500 mt-0.5">
                                {new Date(b.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        ) : b.checkInStatus === 'CANCELLED' ? (
                          <span className="text-red-400 font-bold text-[10px] bg-red-500/10 px-2 py-0.5 rounded border border-red-500/30">
                            Cancelled
                          </span>
                        ) : (
                          <span className="text-[#14F1D9] font-bold text-[10px] bg-[#14F1D9]/10 px-2 py-0.5 rounded border border-[#14F1D9]/30">
                            Confirmed
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {b.checkInStatus === 'CONFIRMED' && b.paymentStatus === 'paid' && (
                          <button
                            onClick={() => executeCheckIn(b.qrPassCode || b.bookingRef)}
                            className="px-3 py-1 bg-[#14F1D9] text-[#0B1120] rounded-lg font-black text-[10px] hover:bg-white transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" /> Admit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
