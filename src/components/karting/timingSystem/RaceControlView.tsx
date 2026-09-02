/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Go-Kart Dedicated Race Control Dashboard & Operator Console
 */

import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, Square, RotateCcw, Flag, ShieldAlert, UserMinus, RefreshCw, 
  Wifi, ShieldCheck, Plus, CheckCircle2, ChevronRight, QrCode, Sliders, AlertTriangle, Zap
} from 'lucide-react';
import { RaceModel, RacerState, timingEngine } from '../../../lib/timingEngine';
import { QrCodeModal } from './QrCodeModal';

interface RaceControlViewProps {
  initialRace?: RaceModel;
  onNavigateToView?: (view: string) => void;
}

export const RaceControlView: React.FC<RaceControlViewProps> = ({ initialRace, onNavigateToView }) => {
  const [race, setRace] = useState<RaceModel>(initialRace || {
    id: 'race-024',
    raceNumber: '024',
    name: 'Afternoon Grand Prix Sprint',
    type: 'Sprint',
    status: 'READY',
    durationSeconds: 600,
    lapLimit: 10,
    currentLap: 1,
    activeFlag: 'Green',
    racers: [
      { racerId: 'd1', racerName: 'ARUN', driverId: 'd1', driverName: 'ARUN', kartId: 'K01', kartNumber: '01', transponderId: 'RFID001', gridPosition: 1, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 1, gapToLeader: '-', penaltySeconds: 0 },
      { racerId: 'd2', racerName: 'RAJ', driverId: 'd2', driverName: 'RAJ', kartId: 'K05', kartNumber: '05', transponderId: 'RFID002', gridPosition: 2, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 2, gapToLeader: '-', penaltySeconds: 0 },
      { racerId: 'd3', racerName: 'KUMAR', driverId: 'd3', driverName: 'KUMAR', kartId: 'K03', kartNumber: '03', transponderId: 'RFID003', gridPosition: 3, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 3, gapToLeader: '-', penaltySeconds: 0 },
      { racerId: 'd4', racerName: 'VIJAY', driverId: 'd4', driverName: 'VIJAY', kartId: 'K07', kartNumber: '07', transponderId: 'RFID004', gridPosition: 4, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 4, gapToLeader: '-', penaltySeconds: 0 }
    ]
  });

  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [hardwareState, setHardwareState] = useState(timingEngine.getConfig());

  const [selectedRacerId, setSelectedRacerId] = useState<string>('');
  const [penaltySecondsInput, setPenaltySecondsInput] = useState<number>(5);
  const [newKartIdInput, setNewKartIdInput] = useState<string>('K08');

  useEffect(() => {
    const unsub = timingEngine.subscribe((event, payload) => {
      if (event === 'race:update') {
        setRace(payload);
      } else if (event === 'hardware:config_updated') {
        setHardwareState(payload);
      }
    });

    return () => unsub();
  }, []);

  const activeRacers = race.racers || race.drivers || [];

  const startCountdownAndRace = () => {
    setCountdownValue(5);
    const timer = setInterval(() => {
      setCountdownValue(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setCountdownValue(null);
          const liveRace: RaceModel = {
            ...race,
            status: 'LIVE',
            startTime: Date.now(),
            activeFlag: 'Green'
          };
          setRace(liveRace);
          timingEngine.broadcast('race:update', liveRace);
          timingEngine.startSimulator(liveRace, (updated) => {
            setRace(updated);
          });
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handlePauseRace = () => {
    const paused = { ...race, status: 'PAUSED' as const, activeFlag: 'Yellow' as const };
    setRace(paused);
    timingEngine.broadcast('race:update', paused);
    timingEngine.stopSimulator();
  };

  const handleResumeRace = () => {
    const resumed = { ...race, status: 'LIVE' as const, activeFlag: 'Green' as const };
    setRace(resumed);
    timingEngine.broadcast('race:update', resumed);
    timingEngine.startSimulator(resumed, (updated) => {
      setRace(updated);
    });
  };

  const handleStopFinishRace = () => {
    timingEngine.stopSimulator();
    const calculated = timingEngine.recalculateRacePositions(race);
    const finished: RaceModel = {
      ...calculated,
      status: 'FINISHED',
      endTime: Date.now(),
      activeFlag: 'Checkered'
    };
    setRace(finished);
    timingEngine.broadcast('race:update', finished);
  };

  const handleRestartRace = () => {
    timingEngine.stopSimulator();
    const resetRacers = activeRacers.map(r => ({
      ...r,
      completedLaps: 0,
      lastLapTime: 0,
      bestLapTime: 0,
      totalRaceTime: 0,
      lapHistory: [],
      position: r.gridPosition,
      gapToLeader: '-',
      penaltySeconds: 0
    }));

    const resetRace: RaceModel = {
      ...race,
      status: 'READY',
      currentLap: 1,
      fastestLapRacer: undefined,
      fastestLapDriver: undefined,
      fastestLapTime: undefined,
      startTime: undefined,
      endTime: undefined,
      activeFlag: 'Green',
      racers: resetRacers,
      drivers: resetRacers
    };

    setRace(resetRace);
    timingEngine.broadcast('race:update', resetRace);
  };

  const handleApplyPenalty = () => {
    if (!selectedRacerId) return;
    const updatedRacers = activeRacers.map(r => 
      (r.racerId === selectedRacerId || r.driverId === selectedRacerId)
        ? { ...r, penaltySeconds: r.penaltySeconds + penaltySecondsInput } 
        : r
    );
    const updated = timingEngine.recalculateRacePositions({ ...race, racers: updatedRacers, drivers: updatedRacers });
    setRace(updated);
    timingEngine.broadcast('race:update', updated);
    const targetRacer = activeRacers.find(r => r.racerId === selectedRacerId || r.driverId === selectedRacerId);
    alert(`Applied ${penaltySecondsInput}s penalty to ${targetRacer?.racerName || targetRacer?.driverName}`);
  };

  const handleRemoveRacer = () => {
    if (!selectedRacerId) return;
    const updatedRacers = activeRacers.filter(r => r.racerId !== selectedRacerId && r.driverId !== selectedRacerId);
    const updated = timingEngine.recalculateRacePositions({ ...race, racers: updatedRacers, drivers: updatedRacers });
    setRace(updated);
    timingEngine.broadcast('race:update', updated);
    setSelectedRacerId('');
  };

  const handleChangeKart = () => {
    if (!selectedRacerId || !newKartIdInput) return;
    const updatedRacers = activeRacers.map(r => 
      (r.racerId === selectedRacerId || r.driverId === selectedRacerId)
        ? { ...r, kartId: newKartIdInput, kartNumber: newKartIdInput.replace('K', '') } 
        : r
    );
    const updated = { ...race, racers: updatedRacers, drivers: updatedRacers };
    setRace(updated);
    timingEngine.broadcast('race:update', updated);
    alert(`Changed Kart for racer to ${newKartIdInput}`);
  };

  const remainingSeconds = Math.max(0, race.durationSeconds - Math.floor((Date.now() - (race.startTime || Date.now())) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTimer = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="space-y-6 font-sans text-white select-none">
      
      {/* 1. HARDWARE CONNECTION & STATUS TOP BAR */}
      <div className="p-4 bg-[#0B1120] border border-white/10 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border font-bold ${
            hardwareState.isConnected 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
          }`}>
            <Wifi className="w-3.5 h-3.5" />
            {hardwareState.isConnected ? 'TIMING SYSTEM CONNECTED' : 'TIMING SYSTEM DISCONNECTED'}
          </div>
          <span className="text-[#9CA3AF]">
            Mode: <span className="text-white font-bold uppercase">{hardwareState.mode}</span> | Latency: <span className="text-[#14F1D9]">{hardwareState.latencyMs} ms</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowQrModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold flex items-center gap-1.5 cursor-pointer border border-white/10"
          >
            <QrCode className="w-3.5 h-3.5 text-[#14F1D9]" /> Mobile QR Pass
          </button>
          <button
            onClick={() => {
              const newMode = hardwareState.mode === 'simulator' ? 'real_hardware' : 'simulator';
              timingEngine.updateConfig({ mode: newMode });
            }}
            className="px-3 py-1.5 rounded-xl bg-[#14F1D9]/10 hover:bg-[#14F1D9] hover:text-[#050816] text-[#14F1D9] font-bold transition-all cursor-pointer border border-[#14F1D9]/30"
          >
            Toggle {hardwareState.mode === 'simulator' ? 'Real RFID Mode' : 'Simulator Mode'}
          </button>
        </div>
      </div>

      {/* 2. TIMING METHOD SELECTION & ACTIVE SESSION CONTROLS */}
      <div className="p-5 bg-[#0B1120] border border-white/10 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-[#14F1D9] tracking-wider block">
              Race Timing Method Selection
            </span>
            <h3 className="text-base font-black text-white">Select Timing & Telemetry Mode for this Race</h3>
          </div>

          {/* 2-Way Timing Method Selector */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#050816] p-1.5 rounded-2xl border border-white/10 font-mono text-xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                const updated: RaceModel = { ...race, timingMethod: 'GPS' };
                setRace(updated);
                timingEngine.broadcast('race:update', updated);
              }}
              className={`px-5 py-2 rounded-xl font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                race.timingMethod === 'GPS'
                  ? 'bg-[#00B4FF] text-[#050816] font-black shadow-lg'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" /> GPS
            </button>

            <button
              type="button"
              onClick={() => {
                const updated: RaceModel = { ...race, timingMethod: 'Transponder' };
                setRace(updated);
                timingEngine.broadcast('race:update', updated);
              }}
              className={`px-5 py-2 rounded-xl font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                (race.timingMethod || 'Transponder') === 'Transponder'
                  ? 'bg-[#14F1D9] text-[#050816] font-black shadow-lg'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Transponder
            </button>
          </div>
        </div>

        {/* Method Description Callout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className={`p-3.5 rounded-2xl border transition-all ${
            race.timingMethod === 'GPS' 
              ? 'bg-[#00B4FF]/10 border-[#00B4FF]/40 text-white' 
              : 'bg-white/[0.02] border-white/5 text-[#9CA3AF]'
          }`}>
            <div className="font-bold text-[#00B4FF] mb-1 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" /> GPS Timing Method
            </div>
            <p className="text-[11px] leading-relaxed">
              Connects GPS telemetry unit on each kart. Receives live coordinates, detects Start/Finish geofence crossing, and computes lap times.
            </p>
          </div>

          <div className={`p-3.5 rounded-2xl border transition-all ${
            (race.timingMethod || 'Transponder') === 'Transponder' 
              ? 'bg-[#14F1D9]/10 border-[#14F1D9]/40 text-white' 
              : 'bg-white/[0.02] border-white/5 text-[#9CA3AF]'
          }`}>
            <div className="font-bold text-[#14F1D9] mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Transponder Timing Method (Official)
            </div>
            <p className="text-[11px] leading-relaxed">
              Connects RFID transponder on each kart. Detects loop crossing with sub-millisecond precision. Official timing source.
            </p>
          </div>
        </div>
      </div>

      {/* 3. MAIN RACE CONTROLLER HEADER & TIMING OVERVIEW */}
      <div className="p-6 bg-gradient-to-r from-[#0B1120] via-[#050816] to-[#0B1120] border border-[#14F1D9]/30 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#14F1D9]/20 text-[#14F1D9] border border-[#14F1D9]/40 uppercase">
              RACE #{race.raceNumber} • {race.type}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
              race.status === 'LIVE' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse' :
              race.status === 'FINISHED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
              'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}>
              {race.status}
            </span>
            <span className="text-xs font-mono text-[#00B4FF] bg-[#00B4FF]/10 px-2.5 py-0.5 rounded-full border border-[#00B4FF]/30">
              {race.timingMethod || 'GPS + Transponder'}
            </span>
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight mt-2">{race.name}</h1>
          <p className="text-xs text-[#9CA3AF] font-mono mt-1">Operator Live Control Terminal • Yelagiri Grand Prix Circuit</p>
        </div>

        {/* Big Live Timer & Lap Indicator */}
        <div className="flex items-center gap-8 bg-[#050816] p-4 rounded-2xl border border-white/10 font-mono">
          <div>
            <span className="text-[10px] text-[#9CA3AF] uppercase block font-bold">Track Lap</span>
            <span className="text-2xl font-black text-white">LAP {race.currentLap} / {race.lapLimit}</span>
          </div>
          <div className="w-px h-10 bg-white/10"></div>
          <div>
            <span className="text-[10px] text-[#9CA3AF] uppercase block font-bold">Remaining Time</span>
            <span className="text-3xl font-black text-[#14F1D9] tracking-tight">{formattedTimer}</span>
          </div>
        </div>
      </div>

      {/* 3. OPERATOR COMMAND BUTTONS */}
      <div className="p-4 glass-panel border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-3 bg-[#0B1120]">
        <div className="flex items-center gap-2">
          {race.status === 'READY' && (
            <button
              onClick={startCountdownAndRace}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all cursor-pointer shadow-[0_0_20px_rgba(20,241,217,0.3)] flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-[#050816]" /> Start Race Countdown
            </button>
          )}

          {race.status === 'LIVE' && (
            <button
              onClick={handlePauseRace}
              className="px-5 py-3 rounded-xl bg-amber-500 text-black font-black text-xs uppercase tracking-widest hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
            >
              <Pause className="w-4 h-4 fill-black" /> Pause Race
            </button>
          )}

          {race.status === 'PAUSED' && (
            <button
              onClick={handleResumeRace}
              className="px-5 py-3 rounded-xl bg-emerald-500 text-black font-black text-xs uppercase tracking-widest hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-black" /> Resume Race
            </button>
          )}

          {(race.status === 'LIVE' || race.status === 'PAUSED') && (
            <button
              onClick={handleStopFinishRace}
              className="px-5 py-3 rounded-xl bg-rose-600 text-white font-black text-xs uppercase tracking-widest hover:scale-105 transition-all cursor-pointer flex items-center gap-2"
            >
              <Square className="w-4 h-4 fill-white" /> Finish Race Now
            </button>
          )}

          <button
            onClick={handleRestartRace}
            className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase transition-all cursor-pointer flex items-center gap-1.5 border border-white/10"
          >
            <RotateCcw className="w-4 h-4" /> Reset Race
          </button>
        </div>

        {/* Flag control triggers */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#9CA3AF] uppercase font-bold">Track Flag:</span>
          {(['Green', 'Yellow', 'Red', 'Checkered'] as const).map(flag => (
            <button
              key={flag}
              onClick={() => {
                const updated = { ...race, activeFlag: flag };
                setRace(updated);
                timingEngine.broadcast('race:update', updated);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all border ${
                race.activeFlag === flag 
                  ? 'bg-white text-black border-white font-black shadow-md' 
                  : 'bg-white/5 text-[#9CA3AF] border-white/10 hover:text-white'
              }`}
            >
              {flag}
            </button>
          ))}
        </div>
      </div>

      {/* 4. MAIN LIVE TIMING & RACER CORRECTIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Live Timing Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel p-6 rounded-3xl border border-[#00ABAB]/30 bg-[#0B1120]">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
              <h3 className="font-black text-sm text-white uppercase tracking-tight flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#14F1D9]" /> Live Race Operator Table
              </h3>
              {(race.fastestLapRacer || race.fastestLapDriver) && (
                <span className="text-xs font-mono text-amber-400 font-bold bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                  🔥 Fastest: {race.fastestLapRacer || race.fastestLapDriver} ({race.fastestLapTime?.toFixed(3)}s)
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-[#9CA3AF] uppercase text-[10px]">
                    <th className="p-3">POS</th>
                    <th className="p-3">RACER</th>
                    <th className="p-3 text-center">KART</th>
                    <th className="p-3 text-center">LAP</th>
                    <th className="p-3 text-right">LAST LAP</th>
                    <th className="p-3 text-right">BEST LAP</th>
                    <th className="p-3 text-right">GAP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {activeRacers.map((r) => {
                    const id = r.racerId || r.driverId;
                    const name = r.racerName || r.driverName;
                    return (
                      <tr 
                        key={id}
                        onClick={() => setSelectedRacerId(id)}
                        className={`cursor-pointer transition-all ${
                          selectedRacerId === id ? 'bg-[#14F1D9]/20 border-l-4 border-[#14F1D9]' : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="p-3 font-black text-sm">
                          <span className={`w-6 h-6 rounded-lg inline-flex items-center justify-center ${
                            r.position === 1 ? 'bg-amber-500 text-black font-black' :
                            r.position === 2 ? 'bg-slate-300 text-black font-black' :
                            r.position === 3 ? 'bg-amber-700 text-white font-black' :
                            'bg-white/10 text-white'
                          }`}>
                            {r.position}
                          </span>
                        </td>
                        <td className="p-3 font-bold">
                          {name}
                          {r.penaltySeconds > 0 && (
                            <span className="ml-2 text-[9px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                              +{r.penaltySeconds}s Penalty
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold text-[#14F1D9]">K{r.kartNumber}</td>
                        <td className="p-3 text-center font-bold">{r.completedLaps}</td>
                        <td className="p-3 text-right">{r.lastLapTime > 0 ? `${r.lastLapTime.toFixed(3)}s` : '--'}</td>
                        <td className="p-3 text-right text-[#14F1D9] font-bold">{r.bestLapTime > 0 ? `${r.bestLapTime.toFixed(3)}s` : '--'}</td>
                        <td className="p-3 text-right text-[#9CA3AF]">{r.gapToLeader}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Racer Correction & Operator Actions */}
        <div className="glass-panel p-6 rounded-3xl border border-[#00ABAB]/30 bg-[#0B1120] space-y-4">
          <h3 className="text-sm font-black uppercase text-white tracking-tight flex items-center gap-2 border-b border-white/10 pb-3">
            <Sliders className="w-4 h-4 text-[#14F1D9]" /> Racer Controls & Penalties
          </h3>

          <div>
            <label className="block text-[10px] font-mono uppercase text-[#9CA3AF] mb-1">Selected Racer</label>
            <select
              value={selectedRacerId}
              onChange={e => setSelectedRacerId(e.target.value)}
              className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
            >
              <option value="">-- Click table or choose Racer --</option>
              {activeRacers.map(r => {
                const id = r.racerId || r.driverId;
                const name = r.racerName || r.driverName;
                return (
                  <option key={id} value={id}>{name} (Kart #{r.kartNumber})</option>
                );
              })}
            </select>
          </div>

          {selectedRacerId && (
            <div className="space-y-4 pt-2 border-t border-white/10 text-xs">
              {/* Apply Penalty */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase text-[#9CA3AF]">Apply Track Penalty (Seconds)</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    value={penaltySecondsInput}
                    onChange={e => setPenaltySecondsInput(parseInt(e.target.value) || 5)}
                    className="w-20 bg-[#050816] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-center"
                  />
                  <button
                    onClick={handleApplyPenalty}
                    className="flex-1 py-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl font-bold font-mono uppercase cursor-pointer"
                  >
                    + Penalty Time
                  </button>
                </div>
              </div>

              {/* Swap Kart */}
              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase text-[#9CA3AF]">Swap Racer Kart Number</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newKartIdInput}
                    onChange={e => setNewKartIdInput(e.target.value)}
                    className="w-20 bg-[#050816] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-center"
                  />
                  <button
                    onClick={handleChangeKart}
                    className="flex-1 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-bold font-mono uppercase cursor-pointer"
                  >
                    Change Kart
                  </button>
                </div>
              </div>

              {/* Remove Racer */}
              <button
                onClick={handleRemoveRacer}
                className="w-full py-2.5 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/40 rounded-xl font-bold font-mono uppercase cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UserMinus className="w-4 h-4" /> Remove Racer from Race
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. COUNTDOWN OVERLAY ANIMATION */}
      {countdownValue !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
          <div className="text-center space-y-4">
            <p className="text-2xl font-mono font-bold text-[#14F1D9] uppercase tracking-widest">RACE STARTING</p>
            <div className="text-9xl font-black text-white font-mono animate-bounce drop-shadow-[0_0_50px_rgba(20,241,217,0.8)]">
              {countdownValue === 0 ? 'GO!' : countdownValue}
            </div>
          </div>
        </div>
      )}

      {/* 6. QR CODE MODAL */}
      {showQrModal && (
        <QrCodeModal 
          raceId={race.id}
          raceName={race.name}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  );
};
