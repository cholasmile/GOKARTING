import React, { useState, useEffect } from 'react';
import { Trophy, Timer, Zap, Flag } from 'lucide-react';
import { mockLapRecords } from '../../data/kartingMockData';

const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${seconds}.${tenths}`;
};

const PublicLeaderboardScreen: React.FC = () => {
  const [fastestDrivers, setFastestDrivers] = useState<any[]>([]);

  useEffect(() => {
    // Deduplicate drivers, getting their fastest lap only
    const driverBest = new Map();
    
    mockLapRecords.forEach(record => {
      if (!driverBest.has(record.driverId) || driverBest.get(record.driverId).lapTime > record.lapTime) {
        driverBest.set(record.driverId, record);
      }
    });

    const sorted = Array.from(driverBest.values()).sort((a, b) => a.lapTime - b.lapTime).slice(0, 10);
    setFastestDrivers(sorted);
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden flex flex-col font-sans select-none">
      
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-[#007B8B]/10 rounded-full blur-[200px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-[#00ABAB]/10 rounded-full blur-[200px]"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDBoMXY0MEgweiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyKSIvPjxwYXRoIGQ9Ik0wIDBoNDB2MUgweiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjAyKSIvPjwvc3ZnPg==')] opacity-30"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#0A0A0A]/80 border-b border-[#00ABAB]/30 p-8 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-tr from-[#007B8B] via-[#00ABAB] to-[#3E8EDE] text-[#0A0A0A] w-20 h-20 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(20,184,166,0.4)]">
              <Trophy className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-6xl font-black uppercase tracking-tight text-gradient leading-none">Top Drivers</h1>
              <p className="text-[#40E0D0] font-mono text-xl tracking-[0.3em] uppercase font-bold mt-2">Track Record Leaderboard</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black font-mono text-white tracking-widest">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-[#94A3B8] font-mono text-lg uppercase tracking-wider">{new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </header>

      {/* Main Leaderboard */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full p-8">
        <div className="bg-[#1C1C1C]/80 backdrop-blur-md rounded-3xl border border-[#00ABAB]/30 shadow-[0_0_50px_rgba(0,171,171,0.1)] overflow-hidden">
          
          <table className="w-full text-left">
            <thead className="bg-[#0A0A0A] text-[#94A3B8] font-mono text-sm uppercase tracking-widest border-b border-[#1C1C1C]">
              <tr>
                <th className="py-6 px-8 w-24 text-center">Rank</th>
                <th className="py-6 px-8">Driver Name</th>
                <th className="py-6 px-8 text-center">Kart</th>
                <th className="py-6 px-8 text-right">Best Lap</th>
                <th className="py-6 px-8 text-right">Gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C1C1C]">
              {fastestDrivers.map((driver, index) => {
                const isP1 = index === 0;
                const gap = isP1 ? '-' : `+${formatTime(driver.lapTime - fastestDrivers[0].lapTime)}`;
                
                return (
                  <tr key={driver.id} className={`${isP1 ? 'bg-[#00ABAB]/10' : 'hover:bg-[#1A1A1A]'} transition-colors`}>
                    <td className="py-5 px-8 text-center">
                      {isP1 ? (
                        <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-yellow-600 to-yellow-400 text-[#0A0A0A] flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(234,179,8,0.4)] border-2 border-yellow-300">
                          1
                        </div>
                      ) : index < 3 ? (
                        <div className="w-10 h-10 mx-auto rounded-full bg-[#1C1C1C] text-white flex items-center justify-center font-black text-lg border border-white/20">
                          {index + 1}
                        </div>
                      ) : (
                        <div className="text-[#94A3B8] font-bold text-xl">{index + 1}</div>
                      )}
                    </td>
                    <td className="py-5 px-8">
                      <div className={`text-2xl font-black tracking-tight ${isP1 ? 'text-yellow-400' : 'text-white'}`}>
                        {driver.driverName}
                      </div>
                      <div className="text-[#94A3B8] font-mono text-xs uppercase tracking-wider mt-1">
                        Session: {driver.sessionId}
                      </div>
                    </td>
                    <td className="py-5 px-8 text-center">
                      <span className="inline-block bg-[#0A0A0A] text-[#40E0D0] font-mono text-lg font-bold px-4 py-2 rounded-lg border border-[#00ABAB]/30">
                        {driver.kartNumber}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <div className={`text-3xl font-black font-mono tracking-tight ${isP1 ? 'text-white' : 'text-[#40E0D0]'}`}>
                        {formatTime(driver.lapTime)}
                        {isP1 && <span className="text-sm ml-1 text-yellow-400">s</span>}
                      </div>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <div className="text-xl font-mono text-[#94A3B8] font-bold">
                        {gap}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

        </div>
      </main>

      {/* Footer Ticker */}
      <footer className="relative z-10 bg-[#40E0D0] text-[#0A0A0A] py-3 overflow-hidden border-t-4 border-white">
        <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite] items-center gap-12 font-black uppercase tracking-widest text-sm">
          <span>Track Conditions: Dry</span>
          <Zap className="w-4 h-4" />
          <span>Next Session: Heat 4 Starts in 5 Mins</span>
          <Flag className="w-4 h-4" />
          <span>Record Lap: 39.8s (Michael T. - July 2026)</span>
          <Timer className="w-4 h-4" />
          <span>Drive Safely!</span>
        </div>
      </footer>

    </div>
  );
};

export default PublicLeaderboardScreen;
