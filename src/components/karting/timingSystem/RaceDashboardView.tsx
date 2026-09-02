/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Race Dashboard Overview Component
 */

import React from 'react';
import { Play, Flag, Clock, Users, Plus, ShieldCheck, ChevronRight, Trophy } from 'lucide-react';
import { RaceModel } from '../../../lib/timingEngine';

interface RaceDashboardViewProps {
  onNavigateView: (view: string) => void;
  races: RaceModel[];
  onSelectRace: (race: RaceModel) => void;
}

export const RaceDashboardView: React.FC<RaceDashboardViewProps> = ({ onNavigateView, races, onSelectRace }) => {
  return (
    <div className="space-y-6 font-sans text-white select-none">
      
      {/* Top Banner */}
      <div className="p-6 bg-[#0B1120] border border-[#14F1D9]/30 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xl">
        <div>
          <span className="text-[10px] font-mono text-[#14F1D9] font-bold uppercase tracking-wider block mb-1">
            Indy Grand Prix Timing System
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <Flag className="w-8 h-8 text-[#14F1D9]" /> Race Timing & Display Hub
          </h1>
          <p className="text-xs text-[#9CA3AF] font-mono mt-1">Overview of today's race sessions, live display channels, and operator controls.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onNavigateView('create_race')}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all cursor-pointer shadow-[0_0_20px_rgba(20,241,217,0.3)] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Race
          </button>
        </div>
      </div>

      {/* Grid of Today's Races */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {races.map((race) => {
          const activeRacers = race.racers || race.drivers || [];
          return (
            <div 
              key={race.id}
              onClick={() => onSelectRace(race)}
              className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#0B1120] hover:border-[#14F1D9] transition-all cursor-pointer space-y-4 shadow-xl group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-[#9CA3AF] uppercase">RACE #{race.raceNumber} • {race.type}</span>
                  <h3 className="font-bold text-white text-lg group-hover:text-[#14F1D9] transition-colors">{race.name}</h3>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                  race.status === 'LIVE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' :
                  race.status === 'FINISHED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                  'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}>
                  {race.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-[#050816] rounded-2xl border border-white/5 font-mono text-xs text-[#9CA3AF]">
                <div>
                  <span className="text-[9px] uppercase block text-white/50">Racers</span>
                  <span className="text-white font-bold">{activeRacers.length} Racers</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase block text-white/50">Lap Limit</span>
                  <span className="text-white font-bold">{race.lapLimit} Laps</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs font-mono text-[#14F1D9]">
                <span>Open Race Control</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
