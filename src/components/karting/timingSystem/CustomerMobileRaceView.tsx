/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Go-Kart Customer Mobile Live Race Display Screen (URL: /race/live/:id)
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, Flag, Clock, Zap, RefreshCw, Trophy, Flame } from 'lucide-react';
import { RaceModel, timingEngine } from '../../../lib/timingEngine';

interface CustomerMobileRaceViewProps {
  raceId?: string;
  initialRace?: RaceModel;
}

export const CustomerMobileRaceView: React.FC<CustomerMobileRaceViewProps> = ({ raceId, initialRace }) => {
  const [race, setRace] = useState<RaceModel | null>(initialRace || null);

  useEffect(() => {
    const unsub = timingEngine.subscribe((event, payload) => {
      if (event === 'race:update') {
        if (!raceId || payload.id === raceId || payload.raceNumber === raceId) {
          setRace(payload);
        }
      }
    });

    return () => unsub();
  }, [raceId]);

  const remainingSeconds = race ? Math.max(0, race.durationSeconds - Math.floor((Date.now() - (race.startTime || Date.now())) / 1000)) : 600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTimer = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const activeRacers = race?.racers || race?.drivers || [];

  return (
    <div className="min-h-screen bg-[#050816] text-white font-sans select-none p-4 max-w-md mx-auto flex flex-col justify-between space-y-4">
      
      {/* Mobile Top Header */}
      <div className="p-4 bg-[#0B1120] border border-[#14F1D9]/30 rounded-2xl flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <img 
            src="/deuce-logo.jpg" 
            alt="Deuce" 
            className="w-10 h-10 rounded-xl object-cover border border-[#14F1D9]/40 shadow-md"
          />
          <div>
            <h1 className="font-black text-base uppercase text-white leading-tight">DEUCE LIVE SPECTATOR</h1>
            <p className="text-[10px] text-[#14F1D9] font-mono font-bold uppercase">{race ? `${race.name} (#${race.raceNumber})` : 'AWAITING TRACK FEED'}</p>
          </div>
        </div>
        <div className="text-right font-mono">
          <span className="text-[9px] text-[#9CA3AF] uppercase block font-bold">REMAINING</span>
          <span className="text-xl font-black text-[#14F1D9]">{formattedTimer}</span>
        </div>
      </div>

      {/* Mobile Live Positions List */}
      <div className="flex-1 space-y-3">
        {(!race || activeRacers.length === 0) ? (
          <div className="py-20 text-center text-[#9CA3AF] text-xs font-mono space-y-3 bg-[#0B1120] rounded-2xl border border-white/10 p-6">
            <Smartphone className="w-10 h-10 mx-auto text-[#14F1D9] animate-bounce" />
            <p className="font-bold text-white text-sm uppercase">CONNECTING TO TRACK WEBSOCKET FEED...</p>
            <p className="text-[10px] text-[#9CA3AF]">Scan QR code on trackside monitors to view real-time kart lap times instantly.</p>
          </div>
        ) : (
          activeRacers.map(racer => (
            <div 
              key={racer.racerId || racer.driverId}
              className={`p-3.5 rounded-2xl border flex justify-between items-center text-xs transition-all ${
                racer.position === 1 ? 'bg-gradient-to-r from-amber-500/20 to-[#0B1120] border-amber-500/50 text-white' :
                racer.position === 2 ? 'bg-gradient-to-r from-slate-400/20 to-[#0B1120] border-slate-400/40 text-white' :
                racer.position === 3 ? 'bg-gradient-to-r from-amber-800/20 to-[#0B1120] border-amber-700/40 text-white' :
                'bg-[#0B1120] border-white/10 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-sm ${
                  racer.position === 1 ? 'bg-amber-500 text-black' :
                  racer.position === 2 ? 'bg-slate-300 text-black' :
                  racer.position === 3 ? 'bg-amber-700 text-white' :
                  'bg-white/10 text-white'
                }`}>
                  {racer.position}
                </span>
                <div>
                  <div className="font-black text-sm text-white uppercase flex items-center gap-1.5">
                    {racer.racerName || racer.driverName}
                    {racer.isNewPersonalBest && (
                      <span className="text-[8px] bg-[#14F1D9] text-[#050816] px-1.5 py-0.2 rounded font-black uppercase font-mono">PB</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] font-mono">KART #{racer.kartNumber} • LAP {racer.completedLaps}</div>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="font-black text-sm text-[#14F1D9]">
                  {racer.bestLapTime > 0 ? `${racer.bestLapTime.toFixed(3)}s` : '--'}
                </div>
                <div className="text-[9px] text-[#9CA3AF]">GAP: {racer.gapToLeader}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Fastest Lap Badge Footer */}
      {(race?.fastestLapRacer || race?.fastestLapDriver) && (
        <div className="p-3 bg-gradient-to-r from-amber-500/20 to-[#0B1120] border border-amber-500/40 rounded-2xl flex items-center justify-between font-mono text-xs">
          <span className="flex items-center gap-1.5 text-amber-400 font-bold uppercase text-[10px]">
            <Flame className="w-4 h-4 text-amber-400" /> FASTEST LAP
          </span>
          <span className="text-white font-bold">{race.fastestLapRacer || race.fastestLapDriver} ({race.fastestLapTime?.toFixed(3)}s)</span>
        </div>
      )}

      {/* Mobile Footer */}
      <div className="text-center text-[9px] text-[#9CA3AF] font-mono uppercase tracking-widest py-2">
        GO-KART SPECTATOR LIVE CONNECTED • NO REFRESH NEEDED
      </div>
    </div>
  );
};
