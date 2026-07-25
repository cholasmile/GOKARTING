/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Scan, ClipboardList, CheckCircle2, AlertTriangle, Search, Activity as ActivityIcon } from 'lucide-react';

import GoKartingOpsDashboard from './karting/GoKartingOpsDashboard';

export const ActivityStaffDashboard: React.FC = () => {
  const { tickets, bookings, scanTicket, markBookingAsPaid, activities, timeSlots } = useAppContext();

  // Search and simulator inputs
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; customerName?: string; customerPhone?: string; activityName?: string; details?: string; isPendingPayment?: boolean; bookingId?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Active activity filter for check-ins
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<string>('all');

  const handleManualScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim()) return;

    const result = scanTicket(qrInput.trim(), 'Activity Ranger Smith');
    
    if (result.success && result.ticket) {
      setScanResult({
        success: true,
        message: result.message,
        customerName: result.ticket.customerName,
        customerPhone: result.ticket.customerPhone,
        activityName: result.ticket.activityName,
        details: result.ticket.ticketType
      });
      setQrInput('');
    } else {
      setScanResult({
        success: false,
        message: result.message,
        customerName: result.ticket?.customerName,
        customerPhone: result.ticket?.customerPhone,
        activityName: result.ticket?.activityName,
        details: result.ticket?.ticketType,
        isPendingPayment: result.isPendingPayment,
        bookingId: result.bookingId
      });
    }

    // Auto clear alert after 6 seconds
    setTimeout(() => {
      setScanResult(null);
    }, 6000);
  };

  const handleQuickCheckIn = (qrValue: string) => {
    const result = scanTicket(qrValue, 'Activity Ranger Smith');
    if (result.success && result.ticket) {
      setScanResult({
        success: true,
        message: result.message,
        customerName: result.ticket.customerName,
        customerPhone: result.ticket.customerPhone,
        activityName: result.ticket.activityName,
        details: result.ticket.ticketType
      });
    } else {
      setScanResult({
        success: false,
        message: result.message,
        customerName: result.ticket?.customerName,
        customerPhone: result.ticket?.customerPhone,
        activityName: result.ticket?.activityName,
        details: result.ticket?.ticketType,
        isPendingPayment: result.isPendingPayment,
        bookingId: result.bookingId
      });
    }
    setTimeout(() => setScanResult(null), 6000);
  };

  // Filter tickets lists
  const filteredTickets = tickets.filter(t => {
    const matchesSearch = 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.customerPhone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.bookingId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesActivity = selectedActivityFilter === 'all' || t.activityId === selectedActivityFilter;

    return matchesSearch && matchesActivity;
  });

  // Calculate today's occupancy statistics
  // ... (this part we leave alone, just replacing the functions above) ...

  // To easily do this, I will just replace the exact lines:
  const getOccupancyStats = () => {
    return activities.map(act => {
      // Calculate booked tickets today
      const totalBookedToday = bookings
        .filter(b => b.activityId === act.id)
        .reduce((sum, b) => sum + b.quantity, 0);

      const capacity = act.dailyLimit;
      const percentage = Math.min(100, Math.round((totalBookedToday / (capacity || 1)) * 100));

      return {
        id: act.id,
        name: act.name,
        booked: totalBookedToday,
        capacity,
        percentage
      };
    });
  };

  const occupancyStats = getOccupancyStats();

  return (
    <div className="space-y-6">
      
      {/* Global Staff Header */}
      <div className="flex justify-end px-6 pt-6">
        <select
          id="global-staff-activity-filter"
          value={selectedActivityFilter}
          onChange={e => setSelectedActivityFilter(e.target.value)}
          className="px-4 py-2 border border-[#00ABAB]/30 rounded-xl bg-[#1C1C1C] text-[#FFFFFF] focus:outline-none focus:border-[#3E8EDE] focus:ring-1 focus:ring-[#7DF9FF] cursor-pointer text-sm font-bold shadow-[0_0_15px_rgba(0,171,171,0.15)]"
        >
          <option value="all">All Activities Dashboard</option>
          {activities.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {selectedActivityFilter === 'act-go-karting' ? (
        <GoKartingOpsDashboard />
      ) : (
        <div className="px-6 space-y-6">
          {/* Ranger Briefing Panel */}
          <div className="glass-panel p-6 rounded-3xl border border-[#00ABAB]/30  flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full btn-glow animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#40E0D0] font-mono">Gate & Trail Operations</span>
              </div>
              <h2 className="text-xl font-bold font-sans tracking-tight mt-1 text-[#FFFFFF]">Staff Check-In Terminal</h2>
              <p className="text-[#9CA3AF] text-xs max-w-lg mt-0.5">
                Authenticate visitor entry passes instantly, monitor hourly ride occupancy levels, and avoid double check-ins.
              </p>
            </div>
            <div className="px-4 py-2 bg-[#0A0A0A] rounded-xl border border-[#00ABAB]/30 text-xs font-mono text-[#40E0D0]">
              Ranger: <span className="font-extrabold text-teal-950">Smith (ID #881)</span>
            </div>
          </div>

          {/* Grid: Occupancy levels & Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Col: Real-time capacity slots */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-5 glass-panel border border-[#00ABAB]/30 rounded-2xl  space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-[#FFFFFF] flex items-center gap-1.5 font-sans">
                    <ActivityIcon className="h-4.5 w-4.5 text-[#3E8EDE]" /> Hourly Trail Occupancy
                  </h3>
                  <p className="text-[11px] text-[#9CA3AF]">Live booking slots usage across active guides</p>
                </div>

                <div className="space-y-3.5">
                  {occupancyStats.map(stat => (
                    <div key={stat.id} className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-[#FFFFFF] font-sans font-semibold truncate">{stat.name}</span>
                        <span className="font-mono text-[#9CA3AF]">{stat.booked}/{stat.capacity} spots</span>
                      </div>
                      <div className="w-full bg-[#121A24] rounded-full h-2 overflow-hidden border border-[#00ABAB]/30">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            stat.percentage >= 90 
                              ? 'bg-red-500' 
                              : stat.percentage >= 65 
                              ? 'bg-teal-400' 
                              : 'btn-glow'
                          }`}
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-[#9CA3AF] font-mono">
                        <span>Peak slots remaining</span>
                        <span className="font-bold text-[#9CA3AF]">{stat.percentage}% capacity filled</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Manual Scanner Console */}
              <div className="p-5 bg-[#0A0A0A] border border-[#00ABAB]/30 text-teal-950 rounded-2xl  space-y-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-teal-100/40 rounded-full -mr-6 -mt-6 pointer-events-none" />
                
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5 font-sans text-teal-950">
                    <Scan className="h-4.5 w-4.5 text-teal-700" /> QR Barcode Simulator
                  </h3>
                  <p className="text-[11px] text-[#40E0D0]/80">Type or paste QR code strings from visitor passes to check in</p>
                </div>

                <form onSubmit={handleManualScan} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] text-[#40E0D0] uppercase font-bold font-mono">Enter Code String</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="input-qr-simulator"
                        value={qrInput}
                        onChange={e => setQrInput(e.target.value)}
                        placeholder="e.g. adventure-park-ticket-bk-1009"
                        className="flex-1 glass-panel border border-teal-300 px-3 py-2 rounded-lg text-xs font-mono text-[#FFFFFF] focus:outline-none focus:border-[#3E8EDE] focus:ring-1 focus:ring-[#7DF9FF]"
                      />
                      <button
                        type="submit"
                        id="btn-scan-qr"
                        className="bg-[#007B8B] hover:bg-[#0D5C56] font-bold text-[#0B0F14] px-3 py-1.5 rounded-lg text-xs flex items-center justify-center transition-colors cursor-pointer"
                      >
                        Scan
                      </button>
                    </div>
                  </div>
                </form>

                {/* Scanning feedback alert panel */}
                {scanResult && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    scanResult.success 
                      ? 'glass-panel border-teal-300 text-[#40E0D0]' 
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold">
                      {scanResult.success ? (
                        <CheckCircle2 className="h-4.5 w-4.5 text-[#3E8EDE] flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="h-4.5 w-4.5 text-red-600 flex-shrink-0" />
                      )}
                      <span className="text-[#FFFFFF] font-extrabold">{scanResult.success ? 'Access Approved' : 'Access Denied'}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">{scanResult.message}</p>
                    {scanResult.customerName && (
                      <div className="border-t border-[#00ABAB]/30 pt-1.5 text-[10px] font-mono opacity-80">
                        <div>Visitor: <strong className="text-[#40E0D0]">{scanResult.customerName}</strong> {scanResult.customerPhone && <span className="ml-1 text-[#3E8EDE]">({scanResult.customerPhone})</span>}</div>
                        <div>Item: {scanResult.activityName}</div>
                        <div>Detail: {scanResult.details}</div>
                      </div>
                    )}
                    {scanResult.isPendingPayment && scanResult.bookingId && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (scanResult.bookingId) {
                              markBookingAsPaid(scanResult.bookingId, 'Activity Ranger Smith');
                              setScanResult(null);
                            }
                          }}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold py-1.5 rounded text-xs transition-colors cursor-pointer"
                        >
                          Mark as Paid & Check In
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Ticket Stream search & check in */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 glass-panel border border-[#00ABAB]/30 rounded-2xl  space-y-4">
                
                {/* Headers & filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#00ABAB]/30 pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-[#FFFFFF] flex items-center gap-1.5 font-sans">
                      <ClipboardList className="h-4.5 w-4.5 text-[#FFFFFF]" /> Guest Booking Ledger
                    </h3>
                    <p className="text-[11px] text-[#9CA3AF] font-sans">Live feed of visitor purchases. Check in instantly using one-tap</p>
                  </div>

                  {/* Filters */}
                  <div className="flex gap-2 text-xs flex-wrap">
                    <div className="relative">
                      <input
                        type="text"
                        id="input-staff-search"
                        placeholder="Search name/ID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-7 pr-3 py-1.5 border border-[#00ABAB]/30 rounded-lg text-xs glass-panel text-[#FFFFFF] focus:outline-none focus:border-[#3E8EDE] focus:ring-1 focus:ring-[#7DF9FF]"
                      />
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Ticket Table */}
                <div className="overflow-x-auto">
                  {filteredTickets.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-sans">No guest bookings match current criteria.</div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#0A0A0A] text-[#9CA3AF] font-mono font-bold border-b border-[#00ABAB]/30">
                          <th className="p-3">Ticket ID / Name</th>
                          <th className="p-3">Phone No.</th>
                          <th className="p-3">Adventure Sport</th>
                          <th className="p-3">Scheduled Slot</th>
                          <th className="p-3">Payment</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-teal-100">
                        {filteredTickets.map(t => (
                          <tr key={t.id} id={`staff-ticket-row-${t.id}`} className="hover:bg-[#0A0A0A]/40 transition-colors">
                            <td className="p-3">
                              <span className="font-mono font-bold text-[#FFFFFF]">{t.id}</span>
                              <div className="font-sans font-medium text-[#FFFFFF] mt-0.5">{t.customerName}</div>
                              <div className="text-[10px] text-[#9CA3AF] font-mono truncate max-w-[150px]">{t.customerEmail}</div>
                            </td>
                            <td className="p-3 font-mono text-[#9CA3AF]">
                              {t.customerPhone || 'N/A'}
                            </td>
                            <td className="p-3 font-medium text-[#FFFFFF] font-sans">{t.activityName}</td>
                            <td className="p-3 font-mono">
                              <div className="text-[#9CA3AF] text-[11px]">{t.timeSlot}</div>
                              <div className="text-[#9CA3AF] text-[10px]">{t.date}</div>
                            </td>
                            <td className="p-3">
                              {(() => {
                                const b = bookings.find(x => x.id === t.bookingId);
                                const isPending = b?.paymentStatus === 'pending';
                                return (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${isPending ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-[#14F1D9]/10 text-[#14F1D9] border-[#14F1D9]/30'}`}>
                                    {isPending ? 'Pending' : 'Paid'}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                t.status === 'valid'
                                  ? 'bg-[#0A0A0A] text-teal-850 border-[#00ABAB]/30'
                                  : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                              }`}>
                                {t.status === 'valid' ? 'Valid' : 'Used'}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex justify-end gap-2 items-center">
                              {(() => {
                                const b = bookings.find(x => x.id === t.bookingId);
                                const isPending = b?.paymentStatus === 'pending';
                                
                                if (t.status === 'valid') {
                                  return (
                                    <>
                                      {isPending && (
                                        <button
                                          onClick={() => {
                                            markBookingAsPaid(b.id, 'Activity Ranger Smith');
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold text-[11px] transition-colors cursor-pointer"
                                        >
                                          Mark Paid
                                        </button>
                                      )}
                                      <button
                                        id={`btn-staff-checkin-${t.id}`}
                                        onClick={() => handleQuickCheckIn(t.qrCodeValue)}
                                        className={`px-2.5 py-1.5 rounded-lg font-semibold text-[11px] transition-colors ${isPending ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : 'bg-[#007B8B] hover:bg-[#0D5C56] text-[#0B0F14] cursor-pointer'}`}
                                        disabled={isPending}
                                      >
                                        Check In
                                      </button>
                                    </>
                                  );
                                } else {
                                  return (
                                    <div className="text-[10px] font-mono text-[#9CA3AF] text-right">
                                      Checked-In
                                      <div className="text-[8px] opacity-75">{new Date(t.scannedAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                  );
                                }
                              })()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};








