/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Race History & Lap Breakdown Archive
 */

import React, { useState } from 'react';
import { History, Trophy, Flame, Eye, X, Calendar, ChevronRight } from 'lucide-react';
import { RaceModel } from '../../../lib/timingEngine';

interface RaceHistoryViewProps {
  races: RaceModel[];
}

export const RaceHistoryView: React.FC<RaceHistoryViewProps> = ({ races }) => {
  const [selectedHistoryRace, setSelectedHistoryRace] = useState<RaceModel | null>(null);

  const completedRaces = races.filter(r => r.status === 'FINISHED' || r.status === 'LIVE' || r.status === 'READY');

  return (
    <div className="space-y-6 font-sans text-white select-none">
      
      {/* Header */}
      <div className="p-6 bg-[#0B1120] border border-[#14F1D9]/30 rounded-3xl flex justify-between items-center shadow-2xl">
        <div>
          <span className="text-[10px] font-mono text-[#14F1D9] font-bold uppercase tracking-wider block mb-1">
            Historical Timing Archive
          </span>
          <h1 className="text-2xl font-black uppercase text-white flex items-center gap-2">
            <History className="w-6 h-6 text-[#14F1D9]" /> Race History & Lap Logs
          </h1>
          <p className="text-xs text-[#9CA3AF] font-mono">View archived race records, winner podiums, fastest lap statistics, and complete lap-by-lap telemetry.</p>
        </div>
      </div>

      {/* History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {completedRaces.map((race) => {
          const activeRacers = race.racers || race.drivers || [];
          const winner = activeRacers.find(r => r.position === 1);
          const fastestName = race.fastestLapRacer || race.fastestLapDriver;
          return (
            <div 
              key={race.id}
              onClick={() => setSelectedHistoryRace(race)}
              className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#0B1120] hover:border-[#14F1D9] transition-all cursor-pointer space-y-4 shadow-xl group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-[#9CA3AF] uppercase">RACE #{race.raceNumber} • {race.type}</span>
                  <h3 className="font-bold text-white text-base group-hover:text-[#14F1D9] transition-colors">{race.name}</h3>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {race.status}
                </span>
              </div>

              <div className="p-3 bg-[#050816] rounded-2xl border border-white/5 space-y-1 text-xs font-mono">
                <div className="flex justify-between text-white">
                  <span className="text-[#9CA3AF]">Winner:</span>
                  <span className="font-bold text-amber-400">{winner ? `${winner.racerName || winner.driverName} (K${winner.kartNumber})` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-white">
                  <span className="text-[#9CA3AF]">Fastest Lap:</span>
                  <span className="font-bold text-[#14F1D9]">{race.fastestLapTime ? `${fastestName ? fastestName + ' ' : ''}(${race.fastestLapTime.toFixed(3)}s)` : 'N/A'}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs font-mono text-[#14F1D9]">
                <span>Inspect Lap-by-Lap History</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* LAP BY LAP BREAKDOWN MODAL */}
      {selectedHistoryRace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="glass-panel w-full max-w-2xl p-6 rounded-3xl border border-[#14F1D9]/40 bg-[#050816] text-white space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div>
                <h3 className="font-black text-lg text-white uppercase tracking-tight">{selectedHistoryRace.name}</h3>
                <p className="text-[10px] text-[#14F1D9] font-mono font-bold uppercase">RACE #{selectedHistoryRace.raceNumber} • LAP-BY-LAP BREAKDOWN</p>
              </div>
              <button 
                onClick={() => setSelectedHistoryRace(null)}
                className="p-1 rounded-full bg-white/5 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {(selectedHistoryRace.racers || selectedHistoryRace.drivers || []).map(racer => {
                const name = racer.racerName || racer.driverName;
                return (
                  <div key={racer.racerId || racer.driverId} className="p-4 bg-[#0B1120] rounded-2xl border border-white/10 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center text-sm font-bold text-white border-b border-white/5 pb-1">
                      <span>POS {racer.position}: {name} (Kart #{racer.kartNumber})</span>
                      <span className="text-[#14F1D9]">Best: {racer.bestLapTime > 0 ? `${racer.bestLapTime.toFixed(3)}s` : '--'}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-[10px]">
                      {racer.lapHistory.map(lap => (
                        <div key={lap.lapNumber} className={`p-1.5 rounded-lg border text-center ${
                          lap.lapTime === racer.bestLapTime ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold' : 'bg-[#050816] text-[#9CA3AF] border-white/5'
                        }`}>
                          <div>Lap {lap.lapNumber}</div>
                          <div className="font-bold text-white">{lap.lapTime.toFixed(3)}s</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setSelectedHistoryRace(null)}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase cursor-pointer"
            >
              Close History Breakdown
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
