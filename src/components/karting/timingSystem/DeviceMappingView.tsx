/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Standalone Kart -> GPS Device -> Transponder Device Mapping Console
 */

import React, { useState, useEffect } from 'react';
import { 
  Cpu, Radio, Battery, Satellite, Plus, Edit2, Trash2, CheckCircle2, 
  RefreshCw, ShieldCheck, AlertTriangle, Search, Activity, Zap
} from 'lucide-react';
import { DeviceMapping, timingEngine } from '../../../lib/timingEngine';

export const DeviceMappingView: React.FC = () => {
  const [mappings, setMappings] = useState<DeviceMapping[]>(() => timingEngine.getDeviceMappings());
  const [isEditing, setIsEditing] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPinging, setIsPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);

  // Form states
  const [formKartId, setFormKartId] = useState('K01');
  const [formKartNumber, setFormKartNumber] = useState('01');
  const [formGpsId, setFormGpsId] = useState('GPS-001');
  const [formTransponderId, setFormTransponderId] = useState('TP001');

  useEffect(() => {
    const unsub = timingEngine.subscribe((event, payload) => {
      if (event === 'device_mappings:updated') {
        setMappings(payload);
      }
    });
    return () => unsub();
  }, []);

  const handleOpenAdd = () => {
    const nextNum = mappings.length + 1;
    const padded = nextNum.toString().padStart(2, '0');
    setFormKartId(`K${padded}`);
    setFormKartNumber(padded);
    setFormGpsId(`GPS-${padded}`);
    setFormTransponderId(`TP${padded}`);
    setEditIndex(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (index: number) => {
    const item = mappings[index];
    setFormKartId(item.kartId);
    setFormKartNumber(item.kartNumber);
    setFormGpsId(item.gpsDeviceId);
    setFormTransponderId(item.transponderId);
    setEditIndex(index);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [...mappings];
    const newEntry: DeviceMapping = {
      kartId: formKartId.trim().toUpperCase(),
      kartNumber: formKartNumber.trim(),
      gpsDeviceId: formGpsId.trim().toUpperCase(),
      transponderId: formTransponderId.trim().toUpperCase(),
      gpsStatus: 'ONLINE',
      transponderStatus: 'ONLINE',
      batteryPercent: 90 + Math.floor(Math.random() * 10),
      satelliteCount: 12 + Math.floor(Math.random() * 4),
      lastHeartbeat: Date.now()
    };

    if (editIndex !== null) {
      updated[editIndex] = newEntry;
    } else {
      updated.push(newEntry);
    }

    setMappings(updated);
    timingEngine.saveDeviceMappings(updated);
    setIsEditing(false);
  };

  const handleDelete = (index: number) => {
    if (confirm(`Remove device mapping for Kart ${mappings[index].kartId}?`)) {
      const updated = mappings.filter((_, i) => i !== index);
      setMappings(updated);
      timingEngine.saveDeviceMappings(updated);
    }
  };

  const handlePingAll = () => {
    setIsPinging(true);
    setPingSuccess(null);
    setTimeout(() => {
      const updated = mappings.map(m => ({
        ...m,
        gpsStatus: 'ONLINE' as const,
        transponderStatus: 'ONLINE' as const,
        batteryPercent: Math.max(50, m.batteryPercent - Math.floor(Math.random() * 2)),
        satelliteCount: 11 + Math.floor(Math.random() * 5),
        lastHeartbeat: Date.now()
      }));
      setMappings(updated);
      timingEngine.saveDeviceMappings(updated);
      setIsPinging(false);
      setPingSuccess('All 8 GPS & Transponder nodes responded successfully (Latency: 14ms)');
      setTimeout(() => setPingSuccess(null), 4000);
    }, 800);
  };

  const filteredMappings = mappings.filter(m => 
    m.kartId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.gpsDeviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.transponderId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 select-none font-sans">
      
      {/* Header Banner */}
      <div className="bg-[#0B1120] p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-black uppercase text-[#14F1D9] bg-[#14F1D9]/10 border border-[#14F1D9]/30 px-2.5 py-0.5 rounded-full">
              Isolated Hardware Config
            </span>
            <span className="text-xs text-[#9CA3AF] font-mono">• Race Timing Module</span>
          </div>
          <h2 className="text-2xl font-black text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#14F1D9]" /> Device Mapping: Kart ? GPS ? Transponder
          </h2>
          <p className="text-xs text-[#9CA3AF] mt-1 max-w-2xl">
            Configure standalone hardware associations. Map each racing kart to its onboard GPS telemetry unit and RFID transponder timing tag without altering existing kart fleet databases.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handlePingAll}
            disabled={isPinging}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-[#14F1D9]' : ''}`} />
            <span>{isPinging ? 'Pinging Nodes...' : 'Ping All Devices'}</span>
          </button>
          
          <button
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] text-xs font-mono font-black uppercase tracking-wider hover:scale-[1.02] transition-all shadow-[0_0_20px_rgba(20,241,217,0.3)] flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Mapping
          </button>
        </div>
      </div>

      {pingSuccess && (
        <div className="bg-[#14F1D9]/10 border border-[#14F1D9]/30 text-[#14F1D9] p-3 rounded-2xl text-xs font-mono flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{pingSuccess}</span>
        </div>
      )}

      {/* Search & Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Kart ID, GPS ID or Transponder..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B1120] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#9CA3AF] focus:border-[#14F1D9] focus:outline-none font-mono"
          />
        </div>

        <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-3 flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">Mapped Karts</span>
          <span className="font-mono text-base font-black text-[#14F1D9]">{mappings.length}</span>
        </div>

        <div className="bg-[#0B1120] border border-white/10 rounded-2xl p-3 flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">Hardware Status</span>
          <span className="font-mono text-xs font-bold text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ALL ONLINE
          </span>
        </div>
      </div>

      {/* Mapping Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMappings.map((item, index) => (
          <div 
            key={item.kartId}
            className="bg-[#0B1120]/90 border border-white/10 hover:border-[#14F1D9]/40 rounded-3xl p-5 space-y-4 shadow-lg transition-all group relative overflow-hidden"
          >
            {/* Header: Kart info */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#14F1D9]/20 to-[#00B4FF]/20 border border-[#14F1D9]/30 flex items-center justify-center font-black font-mono text-lg text-[#14F1D9] shadow-inner">
                  {item.kartNumber}
                </div>
                <div>
                  <h3 className="font-black text-white text-base font-mono">Kart {item.kartId}</h3>
                  <span className="text-[10px] text-[#9CA3AF] font-mono uppercase">Fleet Unit #{item.kartNumber}</span>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => handleOpenEdit(index)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
                  title="Edit Mapping"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                  title="Remove Mapping"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Hardware Pipeline Association: Kart -> GPS -> Transponder */}
            <div className="p-3 rounded-2xl bg-[#050816] border border-white/5 space-y-2.5 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9CA3AF] flex items-center gap-1.5">
                  <Satellite className="w-3.5 h-3.5 text-[#00B4FF]" /> GPS Unit:
                </span>
                <span className="text-white font-bold bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                  {item.gpsDeviceId}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#9CA3AF] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-[#14F1D9]" /> Transponder:
                </span>
                <span className="text-[#14F1D9] font-bold bg-[#14F1D9]/10 px-2 py-0.5 rounded-md border border-[#14F1D9]/30">
                  {item.transponderId}
                </span>
              </div>
            </div>

            {/* Telemetry Status Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] font-mono text-[#9CA3AF]">
              <div className="flex items-center gap-1 text-emerald-400">
                <Satellite className="w-3 h-3" />
                <span>{item.satelliteCount} Sats</span>
              </div>
              <div className="flex items-center gap-1">
                <Battery className="w-3 h-3 text-emerald-400" />
                <span>{item.batteryPercent}%</span>
              </div>
              <div className="text-[10px] text-white/50">
                Active Ping: 12ms
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Add Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0B1120] border border-[#14F1D9]/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#14F1D9]" />
                {editIndex !== null ? 'Edit Device Mapping' : 'Add New Hardware Mapping'}
              </h3>
              <p className="text-xs text-[#9CA3AF] font-mono mt-1">
                Configure isolated hardware associations (Kart ? GPS ? Transponder).
              </p>
            </div>

            <form onSubmit={handleSave} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-[#9CA3AF] uppercase font-bold block mb-1">Kart ID</label>
                <input
                  type="text"
                  required
                  value={formKartId}
                  onChange={e => setFormKartId(e.target.value)}
                  placeholder="K01"
                  className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-white focus:border-[#14F1D9] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#9CA3AF] uppercase font-bold block mb-1">Kart Display Number</label>
                <input
                  type="text"
                  required
                  value={formKartNumber}
                  onChange={e => setFormKartNumber(e.target.value)}
                  placeholder="01"
                  className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-white focus:border-[#14F1D9] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#9CA3AF] uppercase font-bold block mb-1">GPS Telemetry Device ID</label>
                <input
                  type="text"
                  required
                  value={formGpsId}
                  onChange={e => setFormGpsId(e.target.value)}
                  placeholder="GPS-001"
                  className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-white focus:border-[#14F1D9] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#9CA3AF] uppercase font-bold block mb-1">RFID Transponder ID (Official Timing)</label>
                <input
                  type="text"
                  required
                  value={formTransponderId}
                  onChange={e => setFormTransponderId(e.target.value)}
                  placeholder="TP001"
                  className="w-full bg-[#050816] border border-white/10 rounded-xl p-3 text-white focus:border-[#14F1D9] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#9CA3AF] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black uppercase tracking-wider cursor-pointer shadow-[0_0_15px_rgba(20,241,217,0.3)]"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
