/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Standalone Live Lap Display & GPS Track Map Viewer
 */

import React, { useState, useEffect } from 'react';
import { 
  Tv, Flag, Zap, Satellite, Radio, Clock, Award, Flame, 
  Compass, Maximize2, Minimize2, CheckCircle2, ShieldCheck, MapPin, Gauge
} from 'lucide-react';
import { RaceModel, RacerState, timingEngine } from '../../../lib/timingEngine';

interface LiveLapDisplayProps {
  race?: RaceModel;
}

export const LiveLapDisplayView: React.FC<LiveLapDisplayProps> = ({ race: initialRace }) => {
  const [race, setRace] = useState<RaceModel | null>(initialRace || null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGpsMap, setShowGpsMap] = useState(true);

  useEffect(() => {
    const unsub = timingEngine.subscribe((event, payload) => {
      if (event === 'race:update' || event === 'race:telemetry_update') {
        setRace(payload);
      }
    });

    return () => unsub();
  }, []);

  const activeRacers = race?.racers || race?.drivers || [];
  const timingMethod = race?.timingMethod || 'Transponder';

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const remainingSeconds = race 
    ? Math.max(0, race.durationSeconds - Math.floor((Date.now() - (race.startTime || Date.now())) / 1000)) 
    : 600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTimer = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="space-y-6 select-none font-sans text-white">
      
      {/* Top Banner & Mode Indicators */}
      <div className="bg-[#0B1120] p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <img 
            src="/deuce-logo.jpg" 
            alt="Deuce Logo" 
            className="w-12 h-12 rounded-2xl object-cover border border-[#14F1D9]/40 shadow-[0_0_15px_rgba(20,241,217,0.3)]"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                Live Lap Display & Real-Time Telemetry
              </h2>
              <span className="text-[10px] font-mono font-bold bg-[#14F1D9]/10 text-[#14F1D9] border border-[#14F1D9]/30 px-2.5 py-0.5 rounded-full uppercase">
                {race?.status || 'READY'}
              </span>
            </div>
            <p className="text-xs text-[#9CA3AF] font-mono mt-0.5">
              {race ? `${race.name} • Race #${race.raceNumber}` : 'Yelagiri Grand Prix Circuit • Live Display'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          {/* Timing Method Badge: GPS or Transponder */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            {timingMethod === 'GPS' ? (
              <Satellite className="w-3.5 h-3.5 text-[#00B4FF]" />
            ) : (
              <Radio className="w-3.5 h-3.5 text-[#14F1D9]" />
            )}
            <span className="text-white font-bold">{timingMethod} Timing</span>
          </div>

          <button
            onClick={() => setShowGpsMap(!showGpsMap)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              showGpsMap ? 'bg-[#14F1D9]/10 text-[#14F1D9] border-[#14F1D9]/30' : 'bg-white/5 text-[#9CA3AF] border-white/10'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{showGpsMap ? 'Hide Radar' : 'Show Radar'}</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Grid: Live Timing Table + Live GPS Track Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Real-Time Standings & Lap Table */}
        <div className={`${showGpsMap ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
          
          <div className="bg-[#0B1120]/90 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            
            {/* Table Header Bar */}
            <div className="p-4 bg-[#070D1E] border-b border-white/10 flex justify-between items-center font-mono">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#14F1D9]" />
                <span className="text-xs font-bold text-[#9CA3AF] uppercase">Live Session Timing</span>
              </div>
              <div className="text-sm font-black text-[#14F1D9]">
                {formattedTimer}
              </div>
            </div>

            {/* Live Timing Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="bg-[#050816] text-[11px] uppercase tracking-wider text-[#9CA3AF] border-b border-white/10">
                    <th className="py-3.5 px-4 font-black">Pos</th>
                    <th className="py-3.5 px-4 font-black">Kart</th>
                    <th className="py-3.5 px-4 font-black">Driver</th>
                    <th className="py-3.5 px-4 font-black">Lap</th>
                    <th className="py-3.5 px-4 font-black text-right">Last Lap</th>
                    <th className="py-3.5 px-4 font-black text-right">Best Lap</th>
                    <th className="py-3.5 px-4 font-black text-right">Speed</th>
                    <th className="py-3.5 px-4 font-black text-right">Total Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {activeRacers.map((racer, index) => {
                    const isLeader = racer.position === 1;
                    const isFastest = racer.bestLapTime > 0 && racer.bestLapTime === race?.fastestLapTime;

                    return (
                      <tr 
                        key={racer.racerId}
                        className={`transition-colors ${
                          isLeader ? 'bg-[#14F1D9]/10 font-bold' : index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                        } hover:bg-white/5`}
                      >
                        {/* Position */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                              racer.position === 1 ? 'bg-[#FFB703] text-[#050816]' :
                              racer.position === 2 ? 'bg-slate-300 text-[#050816]' :
                              racer.position === 3 ? 'bg-amber-600 text-white' :
                              'bg-white/5 text-[#9CA3AF]'
                            }`}>
                              {racer.position}
                            </span>
                          </div>
                        </td>

                        {/* Kart Number */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-white bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg">
                            {racer.kartId}
                          </span>
                        </td>

                        {/* Driver Name */}
                        <td className="py-3.5 px-4 font-sans font-black text-sm text-white">
                          <div className="flex items-center gap-2">
                            <span>{racer.racerName}</span>
                            {isFastest && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/40">
                                🟣 FASTEST
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Completed Laps */}
                        <td className="py-3.5 px-4 font-bold text-white">
                          {racer.completedLaps} / {race?.lapLimit || 10}
                        </td>

                        {/* Last Lap Time */}
                        <td className="py-3.5 px-4 text-right font-bold text-[#CBD5E1]">
                          {racer.lastLapTime > 0 ? `${racer.lastLapTime.toFixed(3)}s` : '--'}
                        </td>

                        {/* Best Lap Time */}
                        <td className={`py-3.5 px-4 text-right font-black ${
                          isFastest ? 'text-purple-400' : 'text-[#14F1D9]'
                        }`}>
                          {racer.bestLapTime > 0 ? `${racer.bestLapTime.toFixed(3)}s` : '--'}
                        </td>

                        {/* Current Speed */}
                        <td className="py-3.5 px-4 text-right text-emerald-400 font-bold">
                          {racer.currentSpeedKmh || Math.floor(45 + Math.random() * 10)} km/h
                        </td>

                        {/* Total Race Time */}
                        <td className="py-3.5 px-4 text-right font-bold text-white">
                          {racer.totalRaceTime > 0 ? `${racer.totalRaceTime.toFixed(3)}s` : '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Telemetry Footnote */}
          <div className="p-4 rounded-2xl bg-[#0B1120] border border-white/5 flex flex-wrap justify-between items-center text-[11px] font-mono text-[#9CA3AF] gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Timing Method: <strong>{timingMethod}</strong></span>
            </div>
            <div>
              Auto-updating in real-time
            </div>
          </div>

        </div>

        {/* Right: Live GPS Track Radar */}
        {showGpsMap && (
          <div className="lg:col-span-4 bg-[#0B1120]/90 border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-sm text-white flex items-center gap-2 font-mono">
                <Satellite className="w-4 h-4 text-[#00B4FF]" /> Live Track Radar
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                LIVE GPS
              </span>
            </div>

            {/* Radar Canvas with Animated Kart Coordinates */}
            <div className="relative w-full aspect-square bg-[#050816] rounded-2xl border border-white/10 p-4 flex items-center justify-center overflow-hidden shadow-inner">
              
              <svg viewBox="0 0 300 300" className="w-full h-full">
                {/* Circuit Track Path */}
                <path 
                  d="M 50 150 C 50 70, 100 50, 160 50 C 220 50, 260 80, 260 140 C 260 200, 220 250, 160 250 C 100 250, 50 220, 50 150 Z" 
                  fill="none" 
                  stroke="#14F1D9" 
                  strokeWidth="22" 
                  strokeLinecap="round"
                  className="opacity-20"
                />
                <path 
                  d="M 50 150 C 50 70, 100 50, 160 50 C 220 50, 260 80, 260 140 C 260 200, 220 250, 160 250 C 100 250, 50 220, 50 150 Z" 
                  fill="none" 
                  stroke="#14F1D9" 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                  className="opacity-50"
                />

                {/* Start / Finish Line Plane */}
                <line x1="40" y1="150" x2="65" y2="150" stroke="#FFB703" strokeWidth="4" strokeDasharray="2 2" />

                {/* Moving Kart Markers */}
                {activeRacers.map((racer) => {
                  const progress = racer.gpsLocation?.trackProgressPercent || (racer.gridPosition * 20);
                  const angle = (progress / 100) * 2 * Math.PI;
                  
                  // Position along parametric circuit
                  const cx = 155 + Math.sin(angle) * 105;
                  const cy = 150 - Math.cos(angle) * 95;

                  return (
                    <g key={racer.racerId} className="transition-all duration-300">
                      <circle 
                        cx={cx} 
                        cy={cy} 
                        r="11" 
                        fill={racer.position === 1 ? '#FFB703' : '#14F1D9'} 
                        stroke="#050816" 
                        strokeWidth="2" 
                        className="shadow-lg"
                      />
                      <text 
                        x={cx} 
                        y={cy + 3.5} 
                        fill="#050816" 
                        fontSize="9" 
                        fontWeight="900" 
                        fontFamily="monospace" 
                        textAnchor="middle"
                      >
                        {racer.kartNumber || racer.kartId}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Start / Finish Tag */}
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono text-[#FFB703] border border-[#FFB703]/30">
                S/F GATE
              </div>
            </div>

            {/* Kart Positions legend */}
            <div className="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto pr-1">
              {activeRacers.map((racer) => (
                <div key={racer.racerId} className="flex justify-between items-center p-2 rounded-xl bg-white/5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[#14F1D9]/20 text-[#14F1D9] font-bold flex items-center justify-center text-[10px]">
                      {racer.kartNumber || racer.kartId}
                    </span>
                    <span className="font-bold text-white truncate max-w-[100px]">{racer.racerName}</span>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    {racer.currentSpeedKmh || 54} km/h
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
