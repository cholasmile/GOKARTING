/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Go-Kart Live Customer Display System (16:9 TV / LED Monitor Display)
 */

import React, { useState, useEffect } from 'react';
import { Flag, Trophy, Zap, Clock, Tv, Volume2, Award, Flame, AlertCircle } from 'lucide-react';
import { RaceModel, timingEngine } from '../../../lib/timingEngine';

interface CustomerTvDisplayProps {
  race?: RaceModel;
}

export const CustomerTvDisplayView: React.FC<CustomerTvDisplayProps> = ({ race: initialRace }) => {
  const [race, setRace] = useState<RaceModel | null>(initialRace || null);
  const [displayViewMode, setDisplayViewMode] = useState<'live_race' | 'current_lap' | 'fastest_lap' | 'race_finish'>('live_race');

  useEffect(() => {
    const unsub = timingEngine.subscribe((event, payload) => {
      if (event === 'race:update') {
        setRace(payload);
        if (payload.status === 'FINISHED') {
          setDisplayViewMode('race_finish');
        }
      }
    });

    return () => unsub();
  }, []);

  const remainingSeconds = race ? Math.max(0, race.durationSeconds - Math.floor((Date.now() - (race.startTime || Date.now())) / 1000)) : 600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTimer = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const activeRacers = race?.racers || race?.drivers || [];

  return (
    <div className="min-h-screen bg-[#030611] text-white font-sans select-none flex flex-col justify-between p-6 sm:p-10 relative overflow-hidden">
      
      {/* Ambient Track Glow Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#14F1D9]/10 rounded-full blur-[180px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#00B4FF]/10 rounded-full blur-[180px] pointer-events-none"></div>

      {/* TOP TV DISPLAY BAR WITH OFFICIAL DEUCE LOGO */}
      <div className="flex justify-between items-center bg-[#070D1E]/90 p-6 rounded-3xl border border-[#14F1D9]/30 backdrop-blur-xl shadow-[0_0_50px_rgba(20,241,217,0.15)] relative z-10">
        <div className="flex items-center gap-5">
          <img 
            src="/deuce-logo.jpg" 
            alt="Deuce Logo" 
            className="w-14 h-14 rounded-2xl object-cover border-2 border-[#14F1D9]/50 shadow-[0_0_25px_rgba(20,241,217,0.4)]"
          />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              DEUCE GRAND PRIX
            </h1>
            <p className="text-[#14F1D9] font-mono text-xs font-bold uppercase tracking-widest mt-0.5">
              {race ? `${race.name} • RACE #${race.raceNumber}` : 'YELAGIRI GP CIRCUIT • LIVE TV DISPLAY'}
            </p>
          </div>
        </div>

        {/* View Mode Toggle Controls */}
        <div className="flex gap-2 bg-[#030611] p-1.5 rounded-2xl border border-white/10">
          <button 
            onClick={() => setDisplayViewMode('live_race')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              displayViewMode === 'live_race' ? 'bg-[#14F1D9] text-[#050816] font-black shadow-md' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            Live Race
          </button>
          <button 
            onClick={() => setDisplayViewMode('current_lap')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              displayViewMode === 'current_lap' ? 'bg-[#14F1D9] text-[#050816] font-black shadow-md' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            Current Lap
          </button>
          <button 
            onClick={() => setDisplayViewMode('fastest_lap')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              displayViewMode === 'fastest_lap' ? 'bg-[#14F1D9] text-[#050816] font-black shadow-md' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            🔥 Fastest Lap
          </button>
          <button 
            onClick={() => setDisplayViewMode('race_finish')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
              displayViewMode === 'race_finish' ? 'bg-[#14F1D9] text-[#050816] font-black shadow-md' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            🏆 Podium Finish
          </button>
        </div>

        {/* Live Race Status & Timer */}
        <div className="flex items-center gap-6 text-right font-mono">
          <div>
            <span className="text-xs text-[#9CA3AF] block font-bold uppercase">FLAG STATUS</span>
            <span className={`text-base font-black px-3 py-0.5 rounded-full inline-block mt-0.5 ${
              race?.activeFlag === 'Green' ? 'bg-emerald-500 text-black' :
              race?.activeFlag === 'Yellow' ? 'bg-amber-400 text-black' :
              race?.activeFlag === 'Red' ? 'bg-rose-600 text-white' :
              'bg-white text-black'
            }`}>
              {race?.activeFlag || 'GREEN'} FLAG
            </span>
          </div>

          <div className="pl-6 border-l border-white/10">
            <span className="text-xs text-[#9CA3AF] block font-bold uppercase">TIME REMAINING</span>
            <span className="text-3xl font-black text-[#14F1D9] tracking-wider">{formattedTimer}</span>
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <div className="my-auto py-8 relative z-10">
        
        {/* 1. LIVE RACE TABLE */}
        {displayViewMode === 'live_race' && (
          <div className="bg-[#070D1E]/95 rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-2xl">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="bg-[#0B1120] text-[#9CA3AF] text-sm uppercase tracking-wider border-b border-white/10">
                  <th className="py-4 px-6">POS</th>
                  <th className="py-4 px-6">KART</th>
                  <th className="py-4 px-6">DRIVER NAME</th>
                  <th className="py-4 px-6">COMPLETED LAPS</th>
                  <th className="py-4 px-6 text-right">LAST LAP</th>
                  <th className="py-4 px-6 text-right">BEST LAP</th>
                  <th className="py-4 px-6 text-right">GAP TO LEADER</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-lg font-bold">
                {activeRacers.map((racer, idx) => {
                  const isLeader = idx === 0;
                  const isFastest = racer.bestLapTime > 0 && racer.bestLapTime === race?.fastestLapTime;

                  return (
                    <tr 
                      key={racer.racerId}
                      className={`transition-colors ${
                        isLeader ? 'bg-[#14F1D9]/15 text-white' : 
                        idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-4 px-6">
                        <span className={`w-10 h-10 rounded-xl inline-flex items-center justify-center font-black ${
                          idx === 0 ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' :
                          idx === 1 ? 'bg-slate-300 text-black' :
                          idx === 2 ? 'bg-amber-700 text-white' :
                          'bg-white/10 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-xl text-[#14F1D9] font-black">
                        #{racer.kartNumber || racer.kartId}
                      </td>
                      <td className="py-4 px-6 font-sans text-xl text-white font-black">
                        {racer.racerName || racer.driverName}
                        {isFastest && (
                          <span className="ml-3 text-xs bg-purple-500/20 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded font-mono font-bold">
                            🟣 FASTEST LAP
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {racer.completedLaps} / {race?.lapLimit || 10}
                      </td>
                      <td className="py-4 px-6 text-right text-[#CBD5E1]">
                        {racer.lastLapTime > 0 ? `${racer.lastLapTime.toFixed(3)}s` : '--'}
                      </td>
                      <td className={`py-4 px-6 text-right font-black ${isFastest ? 'text-purple-400' : 'text-[#14F1D9]'}`}>
                        {racer.bestLapTime > 0 ? `${racer.bestLapTime.toFixed(3)}s` : '--'}
                      </td>
                      <td className="py-4 px-6 text-right text-[#9CA3AF]">
                        {racer.gapToLeader || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. CURRENT LAP HIGHLIGHTS */}
        {displayViewMode === 'current_lap' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {activeRacers.map((racer, idx) => (
              <div 
                key={racer.racerId}
                className="bg-[#070D1E]/90 border border-white/10 p-6 rounded-3xl space-y-3 relative overflow-hidden"
              >
                <div className="flex justify-between items-center">
                  <span className="text-3xl font-black font-mono text-[#14F1D9]">#{racer.kartNumber || racer.kartId}</span>
                  <span className="px-3 py-1 bg-white/10 rounded-full font-mono text-xs font-bold">POS {idx + 1}</span>
                </div>
                <h3 className="font-black text-xl text-white truncate">{racer.racerName || racer.driverName}</h3>
                <div className="pt-2 border-t border-white/10 flex justify-between items-end font-mono">
                  <div>
                    <span className="text-[10px] text-[#9CA3AF] uppercase block">LAST LAP</span>
                    <span className="text-xl font-bold text-white">{racer.lastLapTime > 0 ? `${racer.lastLapTime.toFixed(3)}s` : '--'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#9CA3AF] uppercase block">LAPS</span>
                    <span className="text-xl font-bold text-[#14F1D9]">{racer.completedLaps}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 3. FASTEST LAP SHOWCASE */}
        {displayViewMode === 'fastest_lap' && (
          <div className="max-w-3xl mx-auto bg-gradient-to-br from-purple-950/40 via-[#070D1E] to-[#070D1E] border-2 border-purple-500/40 p-10 rounded-3xl text-center space-y-6 shadow-[0_0_60px_rgba(168,85,247,0.3)]">
            <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-300 border border-purple-500/40 px-4 py-1.5 rounded-full font-mono font-black text-sm uppercase tracking-widest">
              🟣 CIRCUIT SPEED RECORD OF THE DAY
            </div>
            
            <h2 className="text-5xl font-black text-white uppercase tracking-tight">
              {race?.fastestLapRacer || race?.fastestLapDriver || activeRacers[0]?.racerName || 'No Lap Recorded'}
            </h2>
            
            <div className="text-7xl font-mono font-black text-purple-400 tracking-wider">
              {race?.fastestLapTime ? `${race.fastestLapTime.toFixed(3)}s` : '--.---s'}
            </div>

            <p className="text-sm font-mono text-[#9CA3AF]">
              YELAGIRI GRAND PRIX CIRCUIT • OFFICIAL TIMING
            </p>
          </div>
        )}

        {/* 4. RACE FINISH PODIUM */}
        {displayViewMode === 'race_finish' && (
          <div className="text-center space-y-8 max-w-5xl mx-auto">
            <div className="inline-block bg-[#14F1D9]/10 text-[#14F1D9] border border-[#14F1D9]/30 px-6 py-2 rounded-full font-mono font-black text-sm uppercase tracking-widest">
              🏁 CHEQUERED FLAG • OFFICIAL FINAL RESULTS
            </div>

            <div className="grid grid-cols-3 gap-6 items-end">
              {/* 2ND PLACE */}
              {activeRacers[1] && (
                <div className="bg-slate-800/40 border border-slate-600/40 p-6 rounded-3xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-300 text-black font-black text-2xl flex items-center justify-center mx-auto">2</div>
                  <h4 className="font-black text-xl text-white uppercase truncate">{activeRacers[1].racerName || activeRacers[1].driverName}</h4>
                  <p className="text-xs text-[#9CA3AF] font-mono">KART #{activeRacers[1].kartNumber}</p>
                  <p className="text-lg font-mono font-black text-[#14F1D9]">BEST: {activeRacers[1].bestLapTime.toFixed(3)}s</p>
                </div>
              )}

              {/* 1ST PLACE WINNER */}
              {activeRacers[0] && (
                <div className="bg-gradient-to-t from-amber-500/30 to-amber-500/10 border-2 border-amber-400 p-8 rounded-3xl space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.4)] scale-105">
                  <Trophy className="w-12 h-12 text-amber-400 mx-auto" />
                  <div className="w-14 h-14 rounded-2xl bg-amber-400 text-black font-black text-3xl flex items-center justify-center mx-auto shadow-lg">1</div>
                  <h3 className="font-black text-2xl text-white uppercase truncate">{activeRacers[0].racerName || activeRacers[0].driverName}</h3>
                  <p className="text-xs text-amber-300 font-mono font-bold">WINNER • KART #{activeRacers[0].kartNumber}</p>
                  <p className="text-2xl font-mono font-black text-white">BEST: {activeRacers[0].bestLapTime.toFixed(3)}s</p>
                </div>
              )}

              {/* 3RD PLACE */}
              {activeRacers[2] && (
                <div className="bg-amber-900/30 border border-amber-700/40 p-6 rounded-3xl space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-700 text-white font-black text-2xl flex items-center justify-center mx-auto">3</div>
                  <h4 className="font-black text-xl text-white uppercase truncate">{activeRacers[2].racerName || activeRacers[2].driverName}</h4>
                  <p className="text-xs text-[#9CA3AF] font-mono">KART #{activeRacers[2].kartNumber}</p>
                  <p className="text-lg font-mono font-black text-[#14F1D9]">BEST: {activeRacers[2].bestLapTime.toFixed(3)}s</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* FOOTER BAR WITH LOGO */}
      <div className="bg-[#070D1E]/90 p-4 rounded-2xl border border-white/10 flex justify-between items-center text-xs font-mono text-[#9CA3AF] relative z-10">
        <div className="flex items-center gap-2">
          <img src="/deuce-logo.jpg" alt="Deuce" className="w-6 h-6 rounded-md object-cover border border-[#14F1D9]/40" />
          <span>DEUCE ADVENTURE PARK • <strong className="text-[#14F1D9]">LIVE TIMING LOOP ACTIVE</strong></span>
        </div>
        <div>GO-KART TIMING ENGINE v2.0 • 16:9 TV MONITOR MODE</div>
      </div>
    </div>
  );
};
