import React, { useState } from 'react';
import { Ticket, Users, CreditCard, CheckCircle, Smartphone } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Activity } from '../types';
import { GoKartingActivityPage } from './GoKartingActivityPage';
import { ShootingActivityPage } from './ShootingActivityPage';
import { HorseRidingActivityPage } from './HorseRidingActivityPage';

const TicketingDashboard: React.FC = () => {
  const { activities, currentUser } = useAppContext();
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  if (selectedActivity) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white">
        <div className="p-4 border-b border-[#00ABAB]/30 flex justify-between items-center bg-[#1C1C1C]">
          <h2 className="text-xl font-bold font-sans">Ticketing POS - {selectedActivity.name}</h2>
          <button 
            onClick={() => setSelectedActivity(null)}
            className="px-4 py-2 bg-rose-500/10 text-rose-400 rounded-lg font-bold hover:bg-rose-500/20"
          >
            Cancel POS
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          {selectedActivity.id === 'act-go-karting' && <GoKartingActivityPage />}
          {selectedActivity.id === 'act-shooting' && <ShootingActivityPage />}
          {selectedActivity.id === 'act-horse-riding' && <HorseRidingActivityPage />}
          {/* For dynamic activities, we would add a generic POS screen here */}
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
        <h2 className="text-xl font-bold mb-6">Select Activity to Book</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activities.map(act => (
            <div 
              key={act.id} 
              onClick={() => setSelectedActivity(act)}
              className="bg-[#0A0A0A] p-6 rounded-2xl border border-[#1C1C1C] hover:border-[#00ABAB]/50 hover:-translate-y-1 transition-all cursor-pointer group"
            >
              <div className="h-32 rounded-xl overflow-hidden mb-4 border border-[#1C1C1C]">
                <img src={act.image} alt={act.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-[#40E0D0] transition-colors">{act.name}</h3>
              <p className="text-[#94A3B8] text-sm mt-2 font-mono">
                Adult: ₹{act.adultPrice} | Child: ₹{act.childPrice}
              </p>
              <button className="w-full mt-4 btn-glow py-2 rounded-xl font-bold text-sm">
                Open POS
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TicketingDashboard;
