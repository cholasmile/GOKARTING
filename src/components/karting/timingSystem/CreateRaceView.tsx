/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Create Race Screen Component
 */

import React, { useState } from 'react';
import { Flag, Clock, Users, Play, Plus, ChevronRight, Check } from 'lucide-react';
import { RaceModel, TimingMethod } from '../../../lib/timingEngine';

interface CreateRaceViewProps {
  onRaceCreated: (newRace: RaceModel) => void;
}

export const CreateRaceView: React.FC<CreateRaceViewProps> = ({ onRaceCreated }) => {
  const [raceNumber, setRaceNumber] = useState('025');
  const [raceName, setRaceName] = useState('Sunset Grand Prix Qualifier');
  const [raceType, setRaceType] = useState<'Practice' | 'Sprint' | 'Time Trial' | 'Final'>('Sprint');
  const [timingMethod, setTimingMethod] = useState<TimingMethod>('Transponder');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [maxRacers, setMaxRacers] = useState(8);
  const [lapLimit, setLapLimit] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mockRacers = [
      { racerId: 'd1', racerName: 'ARUN', driverId: 'd1', driverName: 'ARUN', kartId: 'K01', kartNumber: '01', transponderId: 'TP001', gridPosition: 1, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 1, gapToLeader: '-', penaltySeconds: 0 },
      { racerId: 'd2', racerName: 'RAJ', driverId: 'd2', driverName: 'RAJ', kartId: 'K05', kartNumber: '05', transponderId: 'TP005', gridPosition: 2, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 2, gapToLeader: '-', penaltySeconds: 0 },
      { racerId: 'd3', racerName: 'KUMAR', driverId: 'd3', driverName: 'KUMAR', kartId: 'K03', kartNumber: '03', transponderId: 'TP003', gridPosition: 3, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 3, gapToLeader: '-', penaltySeconds: 0 },
      { racerId: 'd4', racerName: 'VIJAY', driverId: 'd4', driverName: 'VIJAY', kartId: 'K07', kartNumber: '07', transponderId: 'TP007', gridPosition: 4, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 4, gapToLeader: '-', penaltySeconds: 0 }
    ];

    const newRace: RaceModel = {
      id: `race-${raceNumber}`,
      raceNumber,
      name: raceName,
      type: raceType,
      status: 'READY',
      durationSeconds: durationMinutes * 60,
      lapLimit,
      currentLap: 1,
      timingMethod,
      activeFlag: 'Green',
      racers: mockRacers,
      drivers: mockRacers
    };

    onRaceCreated(newRace);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans text-white select-none">
      <div className="glass-panel p-6 rounded-3xl border border-[#14F1D9]/30 bg-[#0B1120] text-center space-y-2 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-[#14F1D9]/10 border border-[#14F1D9]/30 text-[#14F1D9] flex items-center justify-center mx-auto text-2xl">
          🏁
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white">Create New Race Session</h2>
        <p className="text-xs text-[#9CA3AF] font-mono">Configure race parameters, duration, laps, and racer capacity.</p>
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-white/10 bg-[#050816] space-y-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Race Number *</label>
              <input 
                type="text"
                required
                value={raceNumber}
                onChange={e => setRaceNumber(e.target.value)}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Race Session Name *</label>
              <input 
                type="text"
                required
                value={raceName}
                onChange={e => setRaceName(e.target.value)}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-2">Race Type Category</label>
            <div className="grid grid-cols-4 gap-2">
              {(['Practice', 'Sprint', 'Time Trial', 'Final'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setRaceType(type)}
                  className={`py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${
                    raceType === type 
                      ? 'bg-[#14F1D9] text-[#050816] border-[#14F1D9] font-black shadow-md' 
                      : 'bg-[#0B1120] text-[#9CA3AF] border-white/10 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">
              Select Timing Method for this Race *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['GPS', 'Transponder'] as TimingMethod[]).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setTimingMethod(method)}
                  className={`py-2.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border ${
                    timingMethod === method 
                      ? 'bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] border-[#14F1D9] font-black shadow-md' 
                      : 'bg-[#0B1120] text-[#9CA3AF] border-white/10 hover:text-white'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Duration (Minutes)</label>
              <input 
                type="number"
                min={1}
                max={120}
                value={durationMinutes}
                onChange={e => setDurationMinutes(parseInt(e.target.value) || 10)}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Max Racers</label>
              <input 
                type="number"
                min={1}
                max={12}
                value={maxRacers}
                onChange={e => setMaxRacers(parseInt(e.target.value) || 8)}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-[#9CA3AF] mb-1">Number of Laps</label>
              <input 
                type="number"
                min={1}
                max={50}
                value={lapLimit}
                onChange={e => setLapLimit(parseInt(e.target.value) || 10)}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-3.5 py-2.5 text-white font-mono"
              />
            </div>
          </div>

          <div className="p-4 bg-[#0B1120] rounded-2xl border border-white/10 space-y-2">
            <span className="text-[10px] font-mono text-[#9CA3AF] uppercase font-bold block">Assigned Fleet Preview</span>
            <div className="flex flex-wrap gap-2 text-xs font-mono font-bold text-[#14F1D9]">
              {Array.from({ length: maxRacers }).map((_, i) => (
                <span key={i} className="px-2.5 py-1 bg-[#050816] rounded-lg border border-white/10">
                  K{ (i + 1).toString().padStart(2, '0') }
                </span>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-sm uppercase tracking-widest hover:scale-[1.01] transition-all cursor-pointer shadow-[0_0_25px_rgba(20,241,217,0.3)] flex items-center justify-center gap-2"
          >
            Assemble Race Grid & Proceed <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
