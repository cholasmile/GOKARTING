import React, { useState } from 'react';
import { Ticket, Users, CreditCard, CheckCircle, Smartphone } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Activity } from '../types';
import { UnifiedTicketingFlow } from './UnifiedTicketingFlow';

const TicketingDashboard: React.FC = () => {
  const { activities, currentUser } = useAppContext();
  const [selectedActivities, setSelectedActivities] = useState<Activity[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

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

      <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Select Activities to Book</h2>
          <div className="flex gap-4">
            <button 
              onClick={selectAll}
              className="px-4 py-2 border border-[#00ABAB] text-[#00ABAB] rounded-xl font-bold hover:bg-[#00ABAB]/10 transition-colors"
            >
              {selectedActivities.length === activities.length ? 'Deselect All' : 'Select All Package'}
            </button>
            <button 
              onClick={() => setIsCheckoutOpen(true)}
              disabled={selectedActivities.length === 0}
              className="px-6 py-2 bg-[#00ABAB] text-black rounded-xl font-bold hover:bg-[#00ABAB]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};

export default TicketingDashboard;
