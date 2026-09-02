/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Racer Grid Setup Screen Component
 */

import React, { useState } from 'react';
import { Flag, ArrowUp, ArrowDown, Check, Plus, User, QrCode, Play } from 'lucide-react';
import { RaceModel, RacerState, timingEngine } from '../../../lib/timingEngine';

interface GridSetupViewProps {
  race: RaceModel;
  onGridConfirmed: (updatedRace: RaceModel) => void;
}

export const GridSetupView: React.FC<GridSetupViewProps> = ({ race: initialRace, onGridConfirmed }) => {
  const [race, setRace] = useState<RaceModel>(initialRace);

  const [readyMap, setReadyMap] = useState<Record<string, boolean>>({
    d1: true,
    d2: true,
    d3: true,
    d4: true
  });

  const activeRacers = race.racers || race.drivers || [];

  const moveGridPosition = (index: number, direction: 'up' | 'down') => {
    const newRacers = [...activeRacers];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newRacers.length) return;

    const temp = newRacers[index];
    newRacers[index] = newRacers[targetIndex];
    newRacers[targetIndex] = temp;

    const updatedRacers = newRacers.map((r, i) => ({
      ...r,
      gridPosition: i + 1,
      position: i + 1
    }));

    setRace({ ...race, racers: updatedRacers, drivers: updatedRacers });
  };

  const toggleReady = (id: string) => {
    setReadyMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirmGrid = () => {
    const confirmedRace: RaceModel = {
      ...race,
      status: 'READY'
    };
    timingEngine.broadcast('race:update', confirmedRace);
    onGridConfirmed(confirmedRace);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans text-white select-none">
      
      <div className="glass-panel p-6 rounded-3xl border border-[#14F1D9]/30 bg-[#0B1120] flex justify-between items-center shadow-2xl">
        <div>
          <span className="text-[10px] font-mono text-[#14F1D9] font-bold uppercase tracking-wider block mb-1">
            RACE #{race.raceNumber} • {race.type}
          </span>
          <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2">
            <Flag className="w-6 h-6 text-[#14F1D9]" /> Racer Grid Formation Setup
          </h2>
          <p className="text-xs text-[#9CA3AF] font-mono">Assign kart numbers, transponders, verify racer safety ready status, and adjust starting positions.</p>
        </div>
        <button
          onClick={handleConfirmGrid}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all cursor-pointer shadow-[0_0_20px_rgba(20,241,217,0.3)] flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-[#050816]" /> Launch to Operator Race Control
        </button>
      </div>

      {/* RACER GRID TABLE */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#050816] shadow-2xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[#9CA3AF] uppercase text-[10px]">
                <th className="p-3">POS</th>
                <th className="p-3">RACER NAME</th>
                <th className="p-3 text-center">KART</th>
                <th className="p-3 text-center">RFID / TRANSPONDER</th>
                <th className="p-3 text-center">READY</th>
                <th className="p-3 text-right">MOVE GRID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white">
              {activeRacers.map((racer, idx) => {
                const id = racer.racerId || racer.driverId;
                const name = racer.racerName || racer.driverName;
                return (
                  <tr key={id} className="hover:bg-white/5">
                    <td className="p-3">
                      <span className="w-7 h-7 rounded-lg bg-[#14F1D9]/10 text-[#14F1D9] font-black flex items-center justify-center border border-[#14F1D9]/30">
                        {racer.gridPosition}
                      </span>
                    </td>

                    <td className="p-3 font-bold text-sm text-white">
                      {name}
                    </td>

                    <td className="p-3 text-center font-bold text-[#14F1D9]">
                      K{racer.kartNumber}
                    </td>

                    <td className="p-3 text-center text-[#9CA3AF]">
                      {racer.transponderId}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => toggleReady(id)}
                        className={`w-7 h-7 rounded-xl inline-flex items-center justify-center transition-all cursor-pointer border ${
                          readyMap[id] 
                            ? 'bg-emerald-500 text-black border-emerald-400 font-bold' 
                            : 'bg-white/5 text-white/40 border-white/10'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </td>

                    <td className="p-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => moveGridPosition(idx, 'up')}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/20 disabled:opacity-30 text-white cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === activeRacers.length - 1}
                          onClick={() => moveGridPosition(idx, 'down')}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/20 disabled:opacity-30 text-white cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
