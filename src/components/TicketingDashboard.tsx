import React, { useState } from 'react';
import { Ticket, Users, CreditCard, CheckCircle, Smartphone, Printer, Search, FileText, Banknote } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Activity } from '../types';
import { UnifiedTicketingFlow } from './UnifiedTicketingFlow';
import { printTicket } from '../lib/printTicket';

const TicketingDashboard: React.FC = () => {
  const { activities, currentUser, payments } = useAppContext();
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'new_booking' | 'history'>('new_booking');
  const [searchTerm, setSearchTerm] = useState('');

  const toggleActivity = (act: Activity) => {
    setSelectedActivities(prev => 
      prev.find(a => a.id === act.id) 
        ? prev.filter(a => a.id !== act.id)
        : [...prev, act]
    );
  };

  const selectAll = () => {
    if (selectedActivities.length === activities.length) {
      setSelectedActivities([]);
    } else {
      setSelectedActivities([...activities]);
    }
  };

  const handlePrintReceipt = (p: any) => {
    printTicket({
      receiptId: p.ticketId || `TKT-${p.bookingId}`,
      activityName: p.activityName || 'Adventure Activity',
      customerName: p.customerName || 'Walk-in Guest',
      date: p.timestamp ? p.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
      slot: 'Standard Session',
      items: [{ label: p.activityName || 'Activity Package', value: `₹${p.amount}` }],
      totalAmount: p.amount,
      paymentStatus: 'paid',
      quantity: 1,
      paymentMethod: p.method
    });
  };

  const counterPayments = payments.filter(p => {
    const isCounter = p.counterId === 'counter_1' || p.staffId || p.method === 'cash' || p.method === 'qrcode' || p.method.startsWith('card');
    if (!isCounter) return false;
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return p.customerName?.toLowerCase().includes(searchLower) ||
           p.bookingId?.toLowerCase().includes(searchLower) ||
           p.ticketId?.toLowerCase().includes(searchLower) ||
           p.activityName?.toLowerCase().includes(searchLower);
  }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (isCheckoutOpen && selectedActivities.length > 0) {
    const combinedName = selectedActivities.length === activities.length 
      ? 'All Activities Package' 
      : selectedActivities.map(a => a.name).join(' + ');

    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <div className="p-4 border-b border-[#00ABAB]/30 flex justify-between items-center bg-[#1C1C1C]">
          <h2 className="text-xl font-bold font-sans">Ticketing POS - {combinedName}</h2>
          <button 
            onClick={() => setIsCheckoutOpen(false)}
            className="px-4 py-2 bg-rose-500/10 text-rose-400 rounded-lg font-bold hover:bg-rose-500/20"
          >
            Cancel POS
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          <UnifiedTicketingFlow activities={selectedActivities} onCancel={() => setIsCheckoutOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-white min-h-screen">
      <div className="flex justify-between items-center bg-[#1C1C1C] p-6 rounded-2xl border border-[#00ABAB]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#3E8EDE]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
            <Ticket className="w-8 h-8 text-[#3E8EDE]" />
            Central <span className="text-[#00ABAB]">Ticketing</span>
          </h1>
          <p className="text-[#94A3B8] font-mono text-sm mt-1 uppercase tracking-widest">
            Welcome, {currentUser?.name || 'Staff'}
          </p>
        </div>
      </div>

      {/* Sub-tab selector */}
      <div className="flex border-b border-[#1C1C1C]">
        <button 
          onClick={() => setActiveSubTab('new_booking')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 ${activeSubTab === 'new_booking' ? 'border-[#00ABAB] text-[#00ABAB]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
        >
          New Walk-in Booking
        </button>
        <button 
          onClick={() => setActiveSubTab('history')}
          className={`px-5 py-3 font-bold text-sm transition-all border-b-2 ${activeSubTab === 'history' ? 'border-[#00ABAB] text-[#00ABAB]' : 'border-transparent text-[#94A3B8] hover:text-white'}`}
        >
          Counter Transaction History
        </button>
      </div>

      {activeSubTab === 'new_booking' ? (
        <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Select Activities to Book</h2>
            <div className="flex gap-4">
              <button 
                onClick={selectAll}
                className="px-4 py-2 border border-[#00ABAB] text-[#00ABAB] rounded-xl font-bold hover:bg-[#00ABAB]/10 transition-colors cursor-pointer"
              >
                {selectedActivities.length === activities.length ? 'Deselect All' : 'Select All Package'}
              </button>
              <button 
                onClick={() => setIsCheckoutOpen(true)}
                disabled={selectedActivities.length === 0}
                className="px-6 py-2 bg-[#00ABAB] text-black rounded-xl font-bold hover:bg-[#00ABAB]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Checkout ({selectedActivities.length})
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activities.map(act => {
              const isSelected = selectedActivities.some(a => a.id === act.id);
              return (
                <div 
                  key={act.id} 
                  onClick={() => toggleActivity(act)}
                  className={`bg-[#0A0A0A] p-6 rounded-2xl border transition-all cursor-pointer group relative ${isSelected ? 'border-[#00ABAB] ring-1 ring-[#00ABAB]' : 'border-[#1C1C1C] hover:border-[#00ABAB]/50'}`}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-[#00ABAB] text-black rounded-full p-1 z-10">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                  <div className="h-32 rounded-xl overflow-hidden mb-4 border border-[#1C1C1C] relative">
                    <img src={act.image} alt={act.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {isSelected && <div className="absolute inset-0 bg-[#00ABAB]/20" />}
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-[#40E0D0] transition-colors">{act.name}</h3>
                  <p className="text-[#94A3B8] text-sm mt-2 font-mono">
                    Adult: ₹{act.adultPrice} | Child: ₹{act.childPrice}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Counter Walk-in Ledger</h2>
            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#94A3B8]">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search guest or booking..."
                className="w-full bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#00ABAB] transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#1C1C1C]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0A0A0A] border-b border-[#1C1C1C] text-[#94A3B8] font-mono uppercase tracking-wider">
                  <th className="p-4 font-bold">Date/Time</th>
                  <th className="p-4 font-bold">Booking ID</th>
                  <th className="p-4 font-bold">Ticket ID</th>
                  <th className="p-4 font-bold">Guest</th>
                  <th className="p-4 font-bold">Activity</th>
                  <th className="p-4 font-bold">Amount</th>
                  <th className="p-4 font-bold">Method</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]">
                {counterPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[#94A3B8] font-mono">
                      No walk-in transactions found.
                    </td>
                  </tr>
                ) : (
                  counterPayments.map(p => (
                    <tr key={p.id} className="hover:bg-[#1C1C1C]/30 transition-colors">
                      <td className="p-4 text-[#94A3B8] font-mono">
                        {new Date(p.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 font-bold text-[#3E8EDE] font-mono">
                        {p.bookingId}
                      </td>
                      <td className="p-4 font-bold text-[#00ABAB] font-mono">
                        {p.ticketId || `tkt-${p.bookingId}`}
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-white">{p.customerName || 'Walk-in Guest'}</p>
                        <p className="text-[10px] text-[#94A3B8]">{p.customer_id}</p>
                      </td>
                      <td className="p-4 text-white font-medium">
                        {p.activityName || 'Adventure Activity'}
                      </td>
                      <td className="p-4 font-bold text-white font-mono">
                        ₹{p.amount}
                      </td>
                      <td className="p-4 font-mono font-bold uppercase tracking-wider text-[#00ABAB]">
                        {p.method === 'cash' ? (
                          <span className="flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5 text-emerald-400" /> Cash</span>
                        ) : p.method.startsWith('card') ? (
                          <span className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-blue-400" /> Card</span>
                        ) : (
                          <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-violet-400" /> UPI</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-[9px] font-bold font-mono uppercase tracking-wider ${p.status === 'paid' || p.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handlePrintReceipt(p)}
                          className="p-2 bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer"
                          title="Print Ticket & Receipt"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketingDashboard;
