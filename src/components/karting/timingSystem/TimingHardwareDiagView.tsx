/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Timing Hardware Diagnostic & Abstraction Page
 */

import React, { useState, useEffect } from 'react';
import { Wifi, Sliders, ShieldCheck, RefreshCw, Terminal, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';
import { HardwareConfig, timingEngine } from '../../../lib/timingEngine';

export const TimingHardwareDiagView: React.FC = () => {
  const [config, setConfig] = useState<HardwareConfig>(timingEngine.getConfig());
  const [eventLogs, setEventLogs] = useState<any[]>([
    { id: 1, time: '15:42:01.218', rfid: 'RFID001', kart: 'K01', event: 'VALID_LAP_DETECTED', duration: '42.218s' },
    { id: 2, time: '15:42:01.651', rfid: 'RFID002', kart: 'K05', event: 'VALID_LAP_DETECTED', duration: '42.651s' },
    { id: 3, time: '15:42:02.012', rfid: 'RFID003', kart: 'K03', event: 'DUPLICATE_READ_SUPPRESSED', duration: '0.450s (Filtered)' }
  ]);

  useEffect(() => {
    const unsub = timingEngine.subscribe((event, payload) => {
      if (event === 'hardware:config_updated') {
        setConfig(payload);
      }
    });

    return () => unsub();
  }, []);

  const handleUpdate = (fields: Partial<HardwareConfig>) => {
    timingEngine.updateConfig(fields);
    setConfig(timingEngine.getConfig());
  };

  return (
    <div className="space-y-6 font-sans text-white select-none">
      
      {/* Header */}
      <div className="p-6 bg-[#0B1120] border border-[#14F1D9]/30 rounded-3xl flex justify-between items-center shadow-2xl">
        <div>
          <span className="text-[10px] font-mono text-[#14F1D9] font-bold uppercase tracking-wider block mb-1">
            Hardware Abstraction Layer (HAL)
          </span>
          <h1 className="text-2xl font-black uppercase text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#14F1D9]" /> RFID / Transponder Timing Diagnostics
          </h1>
          <p className="text-xs text-[#9CA3AF] font-mono">Configure hardware loops, connection adapters, minimum lap filters, and inspect raw signals.</p>
        </div>

        <div className={`px-4 py-2 rounded-2xl border text-xs font-mono font-bold uppercase flex items-center gap-2 ${
          config.isConnected 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        }`}>
          <Wifi className="w-4 h-4" />
          {config.isConnected ? '● TIMING HARDWARE CONNECTED' : '⚠ HARDWARE DISCONNECTED'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Config & Filters */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#0B1120] space-y-4 shadow-xl">
            <h3 className="font-black text-sm uppercase text-[#14F1D9] tracking-tight flex items-center gap-2 border-b border-white/10 pb-3">
              <Sliders className="w-4 h-4" /> Mode & Connection Settings
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-[#9CA3AF] uppercase mb-1">Timing Adapter Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdate({ mode: 'simulator' })}
                    className={`py-2 rounded-xl border font-bold uppercase transition-all cursor-pointer ${
                      config.mode === 'simulator' ? 'bg-[#14F1D9] text-[#050816] border-[#14F1D9]' : 'bg-[#050816] text-[#9CA3AF] border-white/10'
                    }`}
                  >
                    Simulator
                  </button>
                  <button
                    onClick={() => handleUpdate({ mode: 'real_hardware' })}
                    className={`py-2 rounded-xl border font-bold uppercase transition-all cursor-pointer ${
                      config.mode === 'real_hardware' ? 'bg-[#14F1D9] text-[#050816] border-[#14F1D9]' : 'bg-[#050816] text-[#9CA3AF] border-white/10'
                    }`}
                  >
                    Real Hardware
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#9CA3AF] uppercase mb-1">Adapter Transport Protocol</label>
                <select
                  value={config.connectionType}
                  onChange={e => handleUpdate({ connectionType: e.target.value as any })}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                >
                  <option value="Simulator Loop">Simulator Loop (Dev Testing)</option>
                  <option value="Serial">Serial RS232 / USB Transponder</option>
                  <option value="TCP/IP">TCP/IP Socket Timing Loop</option>
                  <option value="UDP">UDP Broadcast Receiver</option>
                </select>
              </div>
            </div>
          </div>

          {/* Validation Rules */}
          <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#0B1120] space-y-4 shadow-xl">
            <h3 className="font-black text-sm uppercase text-[#14F1D9] tracking-tight flex items-center gap-2 border-b border-white/10 pb-3">
              <ShieldCheck className="w-4 h-4" /> Protection & Filtering Rules
            </h3>

            <div className="grid grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-[#9CA3AF] uppercase mb-1">Min Lap Filter (sec)</label>
                <input 
                  type="number"
                  value={config.minLapTimeSeconds}
                  onChange={e => handleUpdate({ minLapTimeSeconds: parseFloat(e.target.value) || 10 })}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#9CA3AF] uppercase mb-1">Max Lap Limit (sec)</label>
                <input 
                  type="number"
                  value={config.maxLapTimeSeconds}
                  onChange={e => handleUpdate({ maxLapTimeSeconds: parseFloat(e.target.value) || 300 })}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-center"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#9CA3AF] uppercase mb-1">Duplicate Suppression (ms)</label>
                <input 
                  type="number"
                  value={config.duplicateSuppressionMs}
                  onChange={e => handleUpdate({ duplicateSuppressionMs: parseInt(e.target.value) || 4000 })}
                  className="w-full bg-[#050816] border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-center"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Raw Event Stream */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-[#050816] space-y-4 shadow-xl">
          <h3 className="font-black text-xs uppercase text-[#14F1D9] font-mono tracking-tight flex items-center gap-2 border-b border-white/10 pb-3">
            <Terminal className="w-4 h-4" /> Live Raw Event Stream
          </h3>

          <div className="space-y-2 max-h-80 overflow-y-auto font-mono text-[10px]">
            {eventLogs.map(log => (
              <div key={log.id} className="p-2.5 bg-[#0B1120] rounded-xl border border-white/5 space-y-1">
                <div className="flex justify-between font-bold text-white">
                  <span>{log.event}</span>
                  <span className="text-[#9CA3AF]">{log.time}</span>
                </div>
                <div className="text-[#14F1D9]">RFID: {log.rfid} (Kart {log.kart}) • {log.duration}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
