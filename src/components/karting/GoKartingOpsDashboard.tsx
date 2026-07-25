import React, { useState } from 'react';
import { QrCode, Play, Square, Settings, UserCheck, Flag, Plus, FileSignature } from 'lucide-react';
import { Kart, GoKartingSession } from '../../types';
import { useAppContext } from '../../context/AppContext';
import DigitalWaiverScreen from './DigitalWaiverScreen';
import LiveTimingTable from './LiveTimingTable';

const GoKartingOpsDashboard: React.FC = () => {
  const { currentUser, karts, sessions, updateSessionStatus, scanTicket, submitWaiver } = useAppContext();
  const isManagerOrAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'go_karting_manager';

  const [activeTab, setActiveTab] = useState<'race_control' | 'kart_management' | 'check_in'>('race_control');
  
  // Check-In State
  const [scanInput, setScanInput] = useState('');
  const [showWaiver, setShowWaiver] = useState(false);
  const [activeTicket, setActiveTicket] = useState('');
  const [scannedTickets, setScannedTickets] = useState<Record<string, boolean>>({});

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    
    // Scan against the context
    const result = scanTicket(scanInput.toUpperCase(), currentUser?.name || 'Staff');
    if (result.success && result.ticket) {
      setActiveTicket(result.ticket.id);
      setShowWaiver(true);
    } else {
      alert(result.message);
    }
    setScanInput('');
  };

  const handleWaiverComplete = (signature: string) => {
    setScannedTickets(prev => ({...prev, [activeTicket]: true}));
    submitWaiver({
      ticketId: activeTicket,
      riderName: 'Customer Name', // Ideally pulled from activeTicket details
      signature,
      signedAt: new Date().toISOString(),
      staffId: currentUser?.id || 'sys',
      deviceId: 'Tablet-1'
    });
    setShowWaiver(false);
    setActiveTicket('');
    alert('Waiver signed and Rider checked in successfully.');
  };

  const activeSession = sessions.find(s => s.status === 'Active');
  const scheduledSessions = sessions.filter(s => s.status === 'Scheduled');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-[#1C1C1C] p-6 rounded-2xl border border-[#00ABAB]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#40E0D0]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Flag className="w-8 h-8 text-[#40E0D0]" />
            Race Control <span className="text-[#00ABAB]">Center</span>
          </h1>
          <p className="text-[#94A3B8] font-mono text-sm mt-1 uppercase tracking-widest">Go Karting Operations Module</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('race_control')} className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'race_control' ? 'bg-[#3E8EDE]/20 text-[#40E0D0] border border-[#40E0D0]/50' : 'text-[#94A3B8] hover:text-white'}`}>
            Live Race
          </button>
          {isManagerOrAdmin && (
            <button onClick={() => setActiveTab('kart_management')} className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'kart_management' ? 'bg-[#3E8EDE]/20 text-[#40E0D0] border border-[#40E0D0]/50' : 'text-[#94A3B8] hover:text-white'}`}>
              Kart Fleet
            </button>
          )}
          <button onClick={() => setActiveTab('check_in')} className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'check_in' ? 'bg-[#3E8EDE]/20 text-[#40E0D0] border border-[#40E0D0]/50' : 'text-[#94A3B8] hover:text-white'}`}>
            Check-In & Waiver
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'race_control' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Active Session Telemetry */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Play className="w-5 h-5 text-[#40E0D0]" /> Active Session Telemetry
                </h2>
                {activeSession && (
                  <div className="px-4 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-full text-xs font-mono font-bold animate-pulse">
                    RACE IN PROGRESS
                  </div>
                )}
              </div>

              {activeSession ? (
                <LiveTimingTable sessionId={activeSession.id} />
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-[#94A3B8] border-2 border-dashed border-[#1C1C1C] rounded-xl">
                  <Flag className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-bold text-lg">No Active Race</p>
                  <p className="text-sm">Start a scheduled session to view live telemetry.</p>
                </div>
              )}
            </div>
          </div>

          {/* Session Controls */}
          <div className="space-y-6">
            <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30">
              <h3 className="text-lg font-bold text-white mb-4">Session Management</h3>
              
              {activeSession ? (
                <div className="space-y-4">
                  <div className="p-4 bg-[#0A0A0A] rounded-xl border border-[#00ABAB]/20">
                    <p className="text-xs text-[#94A3B8] font-mono uppercase">Current Session</p>
                    <p className="text-lg font-bold text-white">{activeSession.name}</p>
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <p className="text-xs text-[#94A3B8]">Time Remaining</p>
                        <p className="text-2xl font-black text-[#40E0D0] font-mono">04:23</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-3 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 rounded-lg transition-colors border border-yellow-500/30">
                          <Square className="w-5 h-5" />
                        </button>
                        <button className="p-3 bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 rounded-lg transition-colors border border-rose-500/30">
                          <Flag className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <button className="w-full btn-glow font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Create New Session
                  </button>
                  <div className="pt-4 mt-4 border-t border-[#1C1C1C]">
                    <p className="text-xs text-[#94A3B8] uppercase font-bold mb-3 font-mono">Scheduled Sessions</p>
                    {scheduledSessions.map(session => (
                      <div key={session.id} className="flex justify-between items-center p-3 bg-[#0A0A0A] rounded-xl border border-[#1C1C1C] hover:border-[#00ABAB]/50 transition-colors cursor-pointer group">
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-[#40E0D0] transition-colors">{session.name}</p>
                          <p className="text-xs text-[#94A3B8]">{session.riders.length} Riders | {session.durationMinutes} Min</p>
                        </div>
                        <button className="text-[#3E8EDE] bg-[#3E8EDE]/10 p-2 rounded-lg hover:bg-[#3E8EDE]/20">
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'kart_management' && (
        <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30">
          <h2 className="text-xl font-bold text-white mb-6">Kart Fleet Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {karts.map(kart => (
              <div key={kart.id} className="bg-[#0A0A0A] p-4 rounded-xl border border-[#1C1C1C] flex flex-col items-center">
                <div className="text-4xl font-black font-mono text-white mb-2">{kart.kartNumber}</div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full 
                  ${kart.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 
                    kart.status === 'On Track' ? 'bg-[#3E8EDE]/10 text-[#40E0D0] border border-[#40E0D0]/30' : 
                    'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
                  {kart.status}
                </span>
                <button className="mt-4 text-xs text-[#94A3B8] hover:text-white flex items-center gap-1">
                  <Settings className="w-3 h-3" /> Configure
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'check_in' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30">
            <h2 className="text-xl font-bold text-white mb-2">QR Ticket Scanner</h2>
            <p className="text-sm text-[#94A3B8] mb-6">Scan customer ticket to verify and sign digital waiver.</p>
            
            <form onSubmit={handleScan} className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#40E0D0]">
                <QrCode className="h-6 w-6" />
              </span>
              <input
                type="text"
                autoFocus
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                placeholder="Awaiting QR Scan..."
                className="w-full bg-[#0A0A0A] border-2 border-[#00ABAB]/30 rounded-2xl py-4 pl-14 pr-4 text-white text-lg placeholder-[#94A3B8] focus:outline-none focus:border-[#40E0D0] transition-all font-mono shadow-[inset_0_0_20px_rgba(0,171,171,0.1)]"
              />
              <button type="submit" className="hidden">Scan</button>
            </form>

            <div className="mt-6 p-4 bg-[#1C1C1C] rounded-xl text-sm text-[#94A3B8] flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-[#40E0D0] flex-shrink-0" />
              <p>Ensure the rider matches the ticket details. Minors must have a guardian present during the waiver signing process.</p>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-[#00ABAB]/30">
            <h2 className="text-xl font-bold text-white mb-6">Recent Scans</h2>
            <div className="space-y-3">
              {Object.keys(scannedTickets).length === 0 ? (
                <div className="text-center text-[#94A3B8] py-8">No tickets scanned yet today.</div>
              ) : (
                Object.keys(scannedTickets).map(t => (
                  <div key={t} className="flex justify-between items-center p-3 bg-[#0A0A0A] rounded-xl border border-emerald-500/30">
                    <div className="flex items-center gap-3">
                      <FileSignature className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-bold text-white font-mono">{t}</p>
                        <p className="text-xs text-emerald-400">Waiver Signed â€¢ Checked In</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showWaiver && (
        <DigitalWaiverScreen 
          ticketId={activeTicket}
          riderName="Alex Mercer (Simulated)"
          onComplete={handleWaiverComplete}
          onCancel={() => { setShowWaiver(false); setActiveTicket(''); }}
        />
      )}
    </div>
  );
};

export default GoKartingOpsDashboard;
