/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Master Hub Component for Go-Kart Race Timing & Live Display System
 */

import React, { useState } from 'react';
import { 
  Play, Flag, Tv, Smartphone, Cpu, History, Plus, LayoutGrid, Sliders, 
  ShieldCheck, Compass, Radio, Satellite, Zap
} from 'lucide-react';
import { RaceModel } from '../../../lib/timingEngine';
import { RaceDashboardView } from './RaceDashboardView';
import { CreateRaceView } from './CreateRaceView';
import { GridSetupView } from './GridSetupView';
import { RaceControlView } from './RaceControlView';
import { CustomerTvDisplayView } from './CustomerTvDisplayView';
import { CustomerMobileRaceView } from './CustomerMobileRaceView';
import { TimingHardwareDiagView } from './TimingHardwareDiagView';
import { RaceHistoryView } from './RaceHistoryView';
import { DeviceMappingView } from './DeviceMappingView';
import { TrackConfigView } from './TrackConfigView';
import { LiveLapDisplayView } from './LiveLapDisplayView';

export const RaceTimingMaster: React.FC = () => {
  const [activePage, setActivePage] = useState<
    'dashboard' | 'create_race' | 'grid_setup' | 'race_control' | 'live_display' | 'tv_display' | 'mobile_display' | 'device_mapping' | 'track_config' | 'hardware_diag' | 'history'
  >('race_control');

  const defaultRacers = [
    { racerId: 'd1', racerName: 'ARUN', driverId: 'd1', driverName: 'ARUN', kartId: 'K01', kartNumber: '01', transponderId: 'TP001', gridPosition: 1, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 1, gapToLeader: '-', penaltySeconds: 0 },
    { racerId: 'd2', racerName: 'RAJ', driverId: 'd2', driverName: 'RAJ', kartId: 'K05', kartNumber: '05', transponderId: 'TP005', gridPosition: 2, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 2, gapToLeader: '-', penaltySeconds: 0 },
    { racerId: 'd3', racerName: 'KUMAR', driverId: 'd3', driverName: 'KUMAR', kartId: 'K03', kartNumber: '03', transponderId: 'TP003', gridPosition: 3, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 3, gapToLeader: '-', penaltySeconds: 0 },
    { racerId: 'd4', racerName: 'VIJAY', driverId: 'd4', driverName: 'VIJAY', kartId: 'K07', kartNumber: '07', transponderId: 'TP007', gridPosition: 4, completedLaps: 0, lastLapTime: 0, bestLapTime: 0, totalRaceTime: 0, lapHistory: [], position: 4, gapToLeader: '-', penaltySeconds: 0 }
  ];

  const [currentRace, setCurrentRace] = useState<RaceModel>({
    id: 'race-024',
    raceNumber: '024',
    name: 'Yelagiri Grand Prix Sprint',
    type: 'Sprint',
    status: 'READY',
    durationSeconds: 600,
    lapLimit: 10,
    currentLap: 1,
    timingMethod: 'Transponder',
    activeFlag: 'Green',
    racers: defaultRacers,
    drivers: defaultRacers
  });

  const [racesList, setRacesList] = useState<RaceModel[]>([currentRace]);

  const handleRaceCreated = (newRace: RaceModel) => {
    setCurrentRace(newRace);
    setRacesList(prev => [newRace, ...prev]);
    setActivePage('grid_setup');
  };

  const handleGridConfirmed = (confirmedRace: RaceModel) => {
    setCurrentRace(confirmedRace);
    setActivePage('race_control');
  };

  if (activePage === 'tv_display') {
    return (
      <div className="relative min-h-screen bg-[#030611]">
        <button
          onClick={() => setActivePage('race_control')}
          className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black text-white text-xs font-mono font-bold border border-white/20 cursor-pointer"
        >
          Exit TV Display Mode
        </button>
        <CustomerTvDisplayView race={currentRace} />
      </div>
    );
  }

  if (activePage === 'mobile_display') {
    return (
      <div className="relative min-h-screen bg-[#050816]">
        <button
          onClick={() => setActivePage('race_control')}
          className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black text-white text-xs font-mono font-bold border border-white/20 cursor-pointer"
        >
          Exit Mobile Mode
        </button>
        <CustomerMobileRaceView raceId={currentRace.id} initialRace={currentRace} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-white select-none">
      
      {/* Master System Navigation Bar */}
      <div className="bg-[#0B1120] p-3 rounded-3xl border border-white/10 flex flex-wrap items-center justify-between gap-2 shadow-2xl">
        <div className="flex items-center gap-3 px-3">
          <img 
            src="/deuce-logo.jpg" 
            alt="Deuce" 
            className="w-8 h-8 rounded-lg object-cover border border-[#14F1D9]/40" 
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-white uppercase tracking-wider">Race Timing Engine</span>
              <span className="text-[9px] font-mono font-bold bg-[#14F1D9]/10 text-[#14F1D9] px-2 py-0.5 rounded-md border border-[#14F1D9]/30">
                GPS | TRANSPONDER
              </span>
            </div>
            <p className="text-[9px] text-[#9CA3AF] font-mono">Standalone Timing & Live Lap Display</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 bg-[#050816] p-1.5 rounded-2xl border border-white/10 text-xs font-mono">
          <button 
            onClick={() => setActivePage('race_control')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activePage === 'race_control' ? 'bg-[#14F1D9] text-[#050816] font-black shadow-md' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Race Control
          </button>

          <button 
            onClick={() => setActivePage('live_display')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activePage === 'live_display' ? 'bg-[#14F1D9] text-[#050816] font-black shadow-md' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Flag className="w-3.5 h-3.5" /> Live Lap Display
          </button>

          <button 
            onClick={() => setActivePage('device_mapping')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activePage === 'device_mapping' ? 'bg-[#14F1D9] text-[#050816] font-black shadow-md' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> Device Mapping
          </button>

          <button 
            onClick={() => setActivePage('track_config')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activePage === 'track_config' ? 'bg-[#14F1D9] text-[#050816] font-black shadow-md' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Track Config
          </button>

          <button 
            onClick={() => setActivePage('tv_display')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activePage === 'tv_display' ? 'bg-[#14F1D9] text-[#050816] font-black shadow-md' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" /> TV Display (16:9)
          </button>

          <button 
            onClick={() => setActivePage('mobile_display')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activePage === 'mobile_display' ? 'bg-[#14F1D9] text-[#050816] font-black shadow-md' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" /> Mobile Spectator
          </button>

          <button 
            onClick={() => setActivePage('history')}
            className={`px-3 py-1.5 rounded-xl font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activePage === 'history' ? 'bg-[#14F1D9] text-[#050816] font-black shadow-md' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" /> Race History
          </button>
        </div>
      </div>

      {/* RENDER ACTIVE PAGE */}
      {activePage === 'race_control' && (
        <RaceControlView initialRace={currentRace} onNavigateToView={setActivePage as any} />
      )}

      {activePage === 'live_display' && (
        <LiveLapDisplayView race={currentRace} />
      )}

      {activePage === 'device_mapping' && (
        <DeviceMappingView />
      )}

      {activePage === 'track_config' && (
        <TrackConfigView />
      )}

      {activePage === 'dashboard' && (
        <RaceDashboardView 
          onNavigateView={setActivePage as any}
          races={racesList}
          onSelectRace={(race) => {
            setCurrentRace(race);
            setActivePage('race_control');
          }}
        />
      )}

      {activePage === 'create_race' && (
        <CreateRaceView onRaceCreated={handleRaceCreated} />
      )}

      {activePage === 'grid_setup' && (
        <GridSetupView race={currentRace} onGridConfirmed={handleGridConfirmed} />
      )}

      {activePage === 'hardware_diag' && (
        <TimingHardwareDiagView />
      )}

      {activePage === 'history' && (
        <RaceHistoryView races={racesList} />
      )}
    </div>
  );
};

