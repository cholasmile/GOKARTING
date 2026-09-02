/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Standalone Track & Separate Start / Close (Finish) Line Configuration Console
 */

import React, { useState } from 'react';
import { 
  Compass, MapPin, Flag, Save, RotateCw, RotateCcw, 
  ShieldCheck, CheckCircle2, Sliders, AlertCircle, Info, Navigation, Link2, Unlink
} from 'lucide-react';
import { TrackConfig, timingEngine } from '../../../lib/timingEngine';

export const TrackConfigView: React.FC = () => {
  const [config, setConfig] = useState<TrackConfig>(() => {
    const loaded = timingEngine.getTrackConfig();
    return {
      ...loaded,
      startLat: loaded.startLat ?? loaded.startFinishLat ?? 12.583210,
      startLng: loaded.startLng ?? loaded.startFinishLng ?? 78.633250,
      startZoneRadiusMeters: loaded.startZoneRadiusMeters ?? 8.0,
      finishLat: loaded.finishLat ?? loaded.startFinishLat ?? 12.583321,
      finishLng: loaded.finishLng ?? loaded.startFinishLng ?? 78.633412,
      finishZoneRadiusMeters: loaded.finishZoneRadiusMeters ?? 10.0
    };
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const toSave: TrackConfig = {
      ...config,
      startFinishLat: config.finishLat,
      startFinishLng: config.finishLng
    };
    timingEngine.saveTrackConfig(toSave);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSyncCoordinates = () => {
    setConfig(prev => ({
      ...prev,
      startLat: prev.finishLat,
      startLng: prev.finishLng,
      startZoneRadiusMeters: prev.finishZoneRadiusMeters
    }));
  };

  const handleResetDefaults = () => {
    if (confirm('Reset Track Configuration to factory defaults with separate Start and Finish lines?')) {
      const defaults: TrackConfig = {
        id: 'trk-yelagiri-01',
        trackName: 'Yelagiri Grand Prix Circuit',
        lengthMeters: 850,
        startLat: 12.583210,
        startLng: 78.633250,
        startZoneRadiusMeters: 8.0,
        finishLat: 12.583321,
        finishLng: 78.633412,
        finishZoneRadiusMeters: 10.0,
        startFinishLat: 12.583321,
        startFinishLng: 78.633412,
        direction: 'Clockwise',
        defaultLaps: 10,
        minLapTimeSeconds: 12.0,
        gpsAccuracyToleranceMeters: 3.5
      };
      setConfig(defaults);
      timingEngine.saveTrackConfig(defaults);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* Header Banner */}
      <div className="bg-[#0B1120] p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-black uppercase text-[#14F1D9] bg-[#14F1D9]/10 border border-[#14F1D9]/30 px-2.5 py-0.5 rounded-full">
              Isolated Track Geometry
            </span>
            <span className="text-xs text-[#9CA3AF] font-mono">• Separate Start & Close Lines</span>
          </div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Compass className="w-6 h-6 text-[#14F1D9]" /> Track Configuration: Start Line & Close/Finish Coordinates
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-1 max-w-2xl">
            Independently configure and update GPS coordinates for both the <strong>Start Line</strong> and the <strong>Close / Finish Line</strong> geofences.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSyncCoordinates}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title="Copy Close Line coordinates to Start Line"
          >
            <Link2 className="w-3.5 h-3.5 text-[#14F1D9]" /> Sync Start & Finish
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-[#9CA3AF] hover:text-white transition-all cursor-pointer"
          >
            Reset Defaults
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-[#14F1D9]/10 border border-[#14F1D9]/30 text-[#14F1D9] p-4 rounded-2xl text-xs font-mono flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Track configuration saved! Start and Close line GPS coordinates updated successfully.</span>
        </div>
      )}

      {/* Main Grid: Form + Visual Track Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Configuration Form (7 cols) */}
        <div className="lg:col-span-7 bg-[#0B1120]/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSave} className="space-y-5 font-mono text-xs">
            
            {/* Track Name & Length */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[#9CA3AF] uppercase font-bold block mb-1.5">Track Circuit Name</label>
                <input
                  type="text"
                  required
                  value={config.trackName}
                  onChange={e => setConfig({ ...config, trackName: e.target.value })}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-white focus:border-[#14F1D9] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#9CA3AF] uppercase font-bold block mb-1.5">Circuit Length (Meters)</label>
                <input
                  type="number"
                  required
                  min={100}
                  max={5000}
                  value={config.lengthMeters}
                  onChange={e => setConfig({ ...config, lengthMeters: Number(e.target.value) })}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-white focus:border-[#14F1D9] focus:outline-none"
                />
              </div>
            </div>

            {/* 1. SEPARATE START LINE GPS COORDINATES */}
            <div className="p-4 rounded-2xl bg-[#050816] border border-emerald-500/20 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span>1. Start Line GPS Coordinates (Green Gate)</span>
                </div>
                <span className="text-[10px] text-emerald-400/80 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  START GATE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#9CA3AF] text-[10px] uppercase font-bold block mb-1">Start Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={config.startLat}
                    onChange={e => setConfig({ ...config, startLat: Number(e.target.value) })}
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#9CA3AF] text-[10px] uppercase font-bold block mb-1">Start Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={config.startLng}
                    onChange={e => setConfig({ ...config, startLng: Number(e.target.value) })}
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#9CA3AF] text-[10px] uppercase font-bold block mb-1">Start Zone Radius (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={2}
                    max={50}
                    value={config.startZoneRadiusMeters}
                    onChange={e => setConfig({ ...config, startZoneRadiusMeters: Number(e.target.value) })}
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl p-2.5 text-white focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. SEPARATE CLOSE / FINISH LINE GPS COORDINATES */}
            <div className="p-4 rounded-2xl bg-[#050816] border border-[#FFB703]/20 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-[#FFB703] font-bold text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFB703]"></span>
                  <span>2. Close / Finish Line GPS Coordinates (Checkered Gate)</span>
                </div>
                <span className="text-[10px] text-[#FFB703] font-mono bg-[#FFB703]/10 px-2 py-0.5 rounded-md border border-[#FFB703]/20">
                  CLOSE / FINISH GATE
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[#9CA3AF] text-[10px] uppercase font-bold block mb-1">Close Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={config.finishLat}
                    onChange={e => setConfig({ ...config, finishLat: Number(e.target.value) })}
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl p-2.5 text-white focus:border-[#FFB703] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#9CA3AF] text-[10px] uppercase font-bold block mb-1">Close Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={config.finishLng}
                    onChange={e => setConfig({ ...config, finishLng: Number(e.target.value) })}
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl p-2.5 text-white focus:border-[#FFB703] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[#9CA3AF] text-[10px] uppercase font-bold block mb-1">Finish Zone Radius (m)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={2}
                    max={50}
                    value={config.finishZoneRadiusMeters}
                    onChange={e => setConfig({ ...config, finishZoneRadiusMeters: Number(e.target.value) })}
                    className="w-full bg-[#0B1120] border border-white/10 rounded-xl p-2.5 text-white focus:border-[#FFB703] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Direction, Lap Count & Validation Rules */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[#9CA3AF] uppercase font-bold block mb-1.5">Track Direction</label>
                <div className="grid grid-cols-2 gap-1 bg-[#050816] p-1 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, direction: 'Clockwise' })}
                    className={`py-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      config.direction === 'Clockwise' ? 'bg-[#14F1D9] text-[#050816] font-black' : 'text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    <RotateCw className="w-3 h-3" /> CW
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, direction: 'Counter-Clockwise' })}
                    className={`py-2 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-all ${
                      config.direction === 'Counter-Clockwise' ? 'bg-[#14F1D9] text-[#050816] font-black' : 'text-[#9CA3AF] hover:text-white'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" /> CCW
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[#9CA3AF] uppercase font-bold block mb-1.5">Default Lap Count</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={config.defaultLaps}
                  onChange={e => setConfig({ ...config, defaultLaps: Number(e.target.value) })}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-white focus:border-[#14F1D9] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#9CA3AF] uppercase font-bold block mb-1.5">Min Valid Lap (s)</label>
                <input
                  type="number"
                  step="0.5"
                  min={5}
                  max={60}
                  value={config.minLapTimeSeconds}
                  onChange={e => setConfig({ ...config, minLapTimeSeconds: Number(e.target.value) })}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-white focus:border-[#14F1D9] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#14F1D9] via-[#00ABAB] to-[#00B4FF] text-[#0B1120] font-black text-xs uppercase tracking-widest hover:scale-[1.01] transition-all shadow-[0_0_20px_rgba(20,241,217,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Track Configuration
              </button>
            </div>
          </form>
        </div>

        {/* Right: Visual Track Map showing Separate Start & Close Gates (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-[#0B1120]/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2 font-mono">
              <Navigation className="w-4 h-4 text-[#14F1D9]" /> Visual Circuit Radar Preview
            </h3>

            {/* SVG Track Radar */}
            <div className="relative w-full aspect-square bg-[#050816] rounded-2xl border border-white/5 p-4 flex items-center justify-center overflow-hidden">
              <svg viewBox="0 0 300 300" className="w-full h-full">
                {/* Circuit Track Path */}
                <path 
                  d="M 50 150 C 50 70, 100 50, 160 50 C 220 50, 260 80, 260 140 C 260 200, 220 250, 160 250 C 100 250, 50 220, 50 150 Z" 
                  fill="none" 
                  stroke="#14F1D9" 
                  strokeWidth="24" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-20"
                />
                <path 
                  d="M 50 150 C 50 70, 100 50, 160 50 C 220 50, 260 80, 260 140 C 260 200, 220 250, 160 250 C 100 250, 50 220, 50 150 Z" 
                  fill="none" 
                  stroke="#14F1D9" 
                  strokeWidth="2" 
                  strokeDasharray="4 4"
                  className="opacity-60"
                />

                {/* 🟢 Start Line Gate */}
                <line x1="40" y1="185" x2="65" y2="185" stroke="#10B981" strokeWidth="4" strokeDasharray="2 2" />
                <circle cx="52" cy="185" r="8" fill="rgba(16,185,129,0.3)" stroke="#10B981" strokeWidth="1.5" />
                <text x="75" y="188" fill="#10B981" fontSize="9" fontWeight="900" fontFamily="monospace">🟢 START GATE</text>

                {/* 🏁 Close / Finish Line Gate */}
                <line x1="40" y1="140" x2="65" y2="140" stroke="#FFB703" strokeWidth="5" strokeDasharray="3 3" />
                <circle cx="52" cy="140" r="10" fill="rgba(255,183,3,0.3)" stroke="#FFB703" strokeWidth="1.5" />
                <text x="75" y="144" fill="#FFB703" fontSize="9" fontWeight="900" fontFamily="monospace">🏁 CLOSE GATE</text>

                {/* Direction arrow */}
                <path d="M 160 40 L 175 50 L 160 60" fill="#14F1D9" opacity="0.8" />
              </svg>

              <div className="absolute bottom-3 left-3 bg-[#0B1120]/90 border border-white/10 px-2.5 py-1 rounded-lg text-[10px] font-mono text-[#9CA3AF]">
                {config.direction} • {config.lengthMeters}m
              </div>
            </div>

            {/* Coordinate Summary Callout */}
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-[#9CA3AF] space-y-2 font-mono">
              <div className="text-white font-bold flex items-center gap-1.5 text-[11px]">
                <Info className="w-3.5 h-3.5 text-[#14F1D9]" /> Separate GPS Gate Detection
              </div>
              <div className="text-[10px] space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-emerald-400">🟢 Start Line:</span>
                  <span>{config.startLat.toFixed(5)}, {config.startLng.toFixed(5)} ({config.startZoneRadiusMeters}m)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#FFB703]">🏁 Close Line:</span>
                  <span>{config.finishLat.toFixed(5)}, {config.finishLng.toFixed(5)} ({config.finishZoneRadiusMeters}m)</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
