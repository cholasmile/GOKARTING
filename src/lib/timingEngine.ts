/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Go-Kart Live Race Timing & Hardware Abstraction Engine
 */

export type TimingMethod = 'GPS' | 'Transponder';

export interface GPSCoordinate {
  lat: number;
  lng: number;
  altitude?: number;
  speedKmh: number;
  heading: number; // 0-360 deg
  accuracyMeters: number;
  satellites: number;
  timestamp: number;
  trackProgressPercent: number; // 0 to 100% around the circuit
}

export interface TrackConfig {
  id: string;
  trackName: string;
  lengthMeters: number;
  
  // 🟢 Separate Start Line GPS Coordinates
  startLat: number;
  startLng: number;
  startZoneRadiusMeters: number;

  // 🏁 Separate Close / Finish Line GPS Coordinates
  finishLat: number;
  finishLng: number;
  finishZoneRadiusMeters: number;

  // Backward-compatibility aliases
  startFinishLat?: number;
  startFinishLng?: number;

  direction: 'Clockwise' | 'Counter-Clockwise';
  defaultLaps: number;
  minLapTimeSeconds: number;
  gpsAccuracyToleranceMeters: number;
}

export interface DeviceMapping {
  kartId: string;
  kartNumber: string;
  gpsDeviceId: string;
  transponderId: string;
  gpsStatus: 'ONLINE' | 'OFFLINE' | 'SEARCHING';
  transponderStatus: 'ONLINE' | 'OFFLINE';
  batteryPercent: number;
  satelliteCount: number;
  lastHeartbeat: number;
}

export interface TimingEvent {
  rfidId: string;
  kartId: string;
  timestamp: number;
  trackId: string;
  source: 'GPS' | 'Transponder';
  rawSignal?: string;
  speedKmh?: number;
  lat?: number;
  lng?: number;
}

export interface RacerState {
  racerId: string;
  racerName: string;
  driverId?: string; // alias
  driverName?: string; // alias
  kartId: string;
  kartNumber: string;
  gpsDeviceId?: string;
  transponderId: string;
  gridPosition: number;
  completedLaps: number;
  lastLapTime: number; // in seconds
  bestLapTime: number; // in seconds
  totalRaceTime: number; // in seconds
  lapHistory: Array<{ 
    lapNumber: number; 
    lapTime: number; 
    timestamp: number; 
    source: 'GPS' | 'Transponder';
    topSpeedKmh?: number;
  }>;
  position: number;
  gapToLeader: string;
  penaltySeconds: number;
  isNewPersonalBest?: boolean;
  
  // Real-time GPS & Telemetry
  gpsLocation?: GPSCoordinate;
  currentSpeedKmh?: number;
  topSpeedKmh?: number;
  gpsSignalStatus?: 'EXCELLENT' | 'GOOD' | 'WEAK' | 'DISCONNECTED';
  transponderSignalStatus?: 'ONLINE' | 'OFFLINE';
  lastCrossingSource?: 'GPS' | 'Transponder';
}

// Backward compatibility alias
export type DriverState = RacerState;

export type RaceStatus = 'READY' | 'COUNTDOWN' | 'LIVE' | 'PAUSED' | 'FINISHING' | 'FINISHED' | 'CANCELLED';

export interface RaceModel {
  id: string;
  raceNumber: string;
  name: string;
  type: 'Practice' | 'Sprint' | 'Time Trial' | 'Final';
  status: RaceStatus;
  durationSeconds: number;
  lapLimit: number;
  currentLap: number;
  timingMethod: TimingMethod;
  startTime?: number;
  endTime?: number;
  racers: RacerState[];
  drivers?: RacerState[]; // alias
  fastestLapRacer?: string;
  fastestLapDriver?: string; // alias
  fastestLapTime?: number;
  activeFlag: 'Green' | 'Yellow' | 'Red' | 'Checkered';
  trackConfig?: TrackConfig;
}

export interface HardwareConfig {
  mode: 'simulator' | 'real_hardware';
  timingMethod: TimingMethod;
  minLapTimeSeconds: number; // e.g. 10s protection
  maxLapTimeSeconds: number; // e.g. 300s
  duplicateSuppressionMs: number; // e.g. 4000ms
  connectionType: 'Serial' | 'TCP/IP' | 'UDP' | 'Simulator Loop' | 'WebSockets';
  isConnected: boolean;
  gpsServerConnected: boolean;
  transponderLoopConnected: boolean;
  lastSignalTime: number;
  latencyMs: number;
}

class TimingEngineService {
  private listeners: Array<(event: string, payload: any) => void> = [];
  private hardwareConfig: HardwareConfig = {
    mode: 'simulator',
    timingMethod: 'Transponder',
    minLapTimeSeconds: 10,
    maxLapTimeSeconds: 300,
    duplicateSuppressionMs: 4000,
    connectionType: 'Simulator Loop',
    isConnected: true,
    gpsServerConnected: true,
    transponderLoopConnected: true,
    lastSignalTime: Date.now(),
    latencyMs: 18
  };

  private simulatorInterval: any = null;
  private gpsTelemetryInterval: any = null;
  private lastReads: Record<string, number> = {};
  private activeRaceRef: RaceModel | null = null;
  private racerProgress: Record<string, number> = {}; // racerId -> track progress % (0 to 100)

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('gokart_timing_channel');
        channel.onmessage = (evt) => {
          this.emitLocal(evt.data.event, evt.data.payload);
        };
      } catch (e) {
        // Fallback silently
      }
    }
  }

  public subscribe(fn: (event: string, payload: any) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private emitLocal(event: string, payload: any) {
    this.listeners.forEach(fn => fn(event, payload));
  }

  public broadcast(event: string, payload: any) {
    this.emitLocal(event, payload);
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('gokart_timing_channel');
        channel.postMessage({ event, payload });
      } catch (e) {
        // Fallback silently
      }
    }
  }

  public getConfig(): HardwareConfig {
    return { ...this.hardwareConfig };
  }

  public updateConfig(newConfig: Partial<HardwareConfig>) {
    this.hardwareConfig = { ...this.hardwareConfig, ...newConfig };
    this.broadcast('hardware:config_updated', this.hardwareConfig);
  }

  // -----------------------------------------------------------------
  // 1. DEVICE MAPPINGS (Isolated Configuration)
  // -----------------------------------------------------------------
  public getDeviceMappings(): DeviceMapping[] {
    try {
      const stored = localStorage.getItem('deuce_device_mappings');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // Fallback
    }

    return [
      { kartId: 'K01', kartNumber: '01', gpsDeviceId: 'GPS-001', transponderId: 'TP001', gpsStatus: 'ONLINE', transponderStatus: 'ONLINE', batteryPercent: 96, satelliteCount: 14, lastHeartbeat: Date.now() },
      { kartId: 'K02', kartNumber: '02', gpsDeviceId: 'GPS-002', transponderId: 'TP002', gpsStatus: 'ONLINE', transponderStatus: 'ONLINE', batteryPercent: 88, satelliteCount: 12, lastHeartbeat: Date.now() },
      { kartId: 'K03', kartNumber: '03', gpsDeviceId: 'GPS-003', transponderId: 'TP003', gpsStatus: 'ONLINE', transponderStatus: 'ONLINE', batteryPercent: 92, satelliteCount: 15, lastHeartbeat: Date.now() },
      { kartId: 'K04', kartNumber: '04', gpsDeviceId: 'GPS-004', transponderId: 'TP004', gpsStatus: 'ONLINE', transponderStatus: 'ONLINE', batteryPercent: 74, satelliteCount: 11, lastHeartbeat: Date.now() },
      { kartId: 'K05', kartNumber: '05', gpsDeviceId: 'GPS-005', transponderId: 'TP005', gpsStatus: 'ONLINE', transponderStatus: 'ONLINE', batteryPercent: 99, satelliteCount: 16, lastHeartbeat: Date.now() },
      { kartId: 'K06', kartNumber: '06', gpsDeviceId: 'GPS-006', transponderId: 'TP006', gpsStatus: 'ONLINE', transponderStatus: 'ONLINE', batteryPercent: 82, satelliteCount: 13, lastHeartbeat: Date.now() },
      { kartId: 'K07', kartNumber: '07', gpsDeviceId: 'GPS-007', transponderId: 'TP007', gpsStatus: 'ONLINE', transponderStatus: 'ONLINE', batteryPercent: 91, satelliteCount: 14, lastHeartbeat: Date.now() },
      { kartId: 'K08', kartNumber: '08', gpsDeviceId: 'GPS-008', transponderId: 'TP008', gpsStatus: 'ONLINE', transponderStatus: 'ONLINE', batteryPercent: 68, satelliteCount: 10, lastHeartbeat: Date.now() }
    ];
  }

  public saveDeviceMappings(mappings: DeviceMapping[]) {
    try {
      localStorage.setItem('deuce_device_mappings', JSON.stringify(mappings));
      this.broadcast('device_mappings:updated', mappings);
    } catch (e) {
      console.error('Failed to save device mappings:', e);
    }
  }

  // -----------------------------------------------------------------
  // 2. TRACK CONFIGURATION (Isolated Configuration)
  // -----------------------------------------------------------------
  public getTrackConfig(): TrackConfig {
    try {
      const stored = localStorage.getItem('deuce_track_config');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // Fallback
    }

    return {
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
  }

  public saveTrackConfig(config: TrackConfig) {
    try {
      localStorage.setItem('deuce_track_config', JSON.stringify(config));
      this.broadcast('track_config:updated', config);
    } catch (e) {
      console.error('Failed to save track config:', e);
    }
  }

  // -----------------------------------------------------------------
  // 3. TIMING ADAPTER - HARDWARE PROTECTION & FILTERING
  // -----------------------------------------------------------------
  public processRawTimingEvent(rawEvent: TimingEvent, currentRace: RaceModel): RaceModel | null {
    const now = Date.now();
    this.hardwareConfig.lastSignalTime = now;
    this.hardwareConfig.isConnected = true;
    this.hardwareConfig.latencyMs = Math.floor(10 + Math.random() * 12);

    const prevRead = this.lastReads[rawEvent.rfidId || rawEvent.kartId] || 0;
    if (now - prevRead < this.hardwareConfig.duplicateSuppressionMs) {
      return null;
    }
    this.lastReads[rawEvent.rfidId || rawEvent.kartId] = now;

    if (!currentRace || currentRace.status !== 'LIVE') return null;

    const activeRacers = currentRace.racers || currentRace.drivers || [];

    // Find racer matching transponder / RFID or Kart ID
    const racerIndex = activeRacers.findIndex(
      r => (rawEvent.rfidId && r.transponderId && r.transponderId.toLowerCase() === rawEvent.rfidId.toLowerCase()) ||
           (rawEvent.kartId && r.kartId.toLowerCase() === rawEvent.kartId.toLowerCase())
    );

    if (racerIndex === -1) return null;

    const racer = activeRacers[racerIndex];
    const prevLapTimestamp = racer.lapHistory.length > 0 
      ? racer.lapHistory[racer.lapHistory.length - 1].timestamp 
      : (currentRace.startTime || now);

    const rawLapSeconds = (now - prevLapTimestamp) / 1000;

    const minLapLimit = currentRace.trackConfig?.minLapTimeSeconds || this.hardwareConfig.minLapTimeSeconds;
    if (rawLapSeconds < minLapLimit || rawLapSeconds > this.hardwareConfig.maxLapTimeSeconds) {
      return null;
    }

    const lapNumber = racer.completedLaps + 1;
    const isBest = racer.bestLapTime === 0 || rawLapSeconds < racer.bestLapTime;
    
    const updatedRacer: RacerState = {
      ...racer,
      completedLaps: lapNumber,
      lastLapTime: Number(rawLapSeconds.toFixed(3)),
      bestLapTime: isBest ? Number(rawLapSeconds.toFixed(3)) : racer.bestLapTime,
      totalRaceTime: Number((racer.totalRaceTime + rawLapSeconds).toFixed(3)),
      isNewPersonalBest: isBest,
      lastCrossingSource: rawEvent.source || (currentRace.timingMethod === 'GPS' ? 'GPS' : 'Transponder'),
      lapHistory: [
        ...racer.lapHistory,
        { 
          lapNumber, 
          lapTime: Number(rawLapSeconds.toFixed(3)), 
          timestamp: now,
          source: rawEvent.source || (currentRace.timingMethod === 'GPS' ? 'GPS' : 'Transponder'),
          topSpeedKmh: racer.topSpeedKmh || Math.floor(58 + Math.random() * 12)
        }
      ]
    };

    const updatedRacers = [...activeRacers];
    updatedRacers[racerIndex] = updatedRacer;

    const calculatedRace = this.recalculateRacePositions({
      ...currentRace,
      currentLap: Math.max(...updatedRacers.map(r => r.completedLaps)),
      racers: updatedRacers,
      drivers: updatedRacers
    });

    this.activeRaceRef = calculatedRace;
    this.broadcast('race:update', calculatedRace);
    return calculatedRace;
  }

  // -----------------------------------------------------------------
  // 4. LIVE POSITION ENGINE
  // -----------------------------------------------------------------
  public recalculateRacePositions(race: RaceModel): RaceModel {
    const activeRacers = race.racers || race.drivers || [];
    const sortedRacers = [...activeRacers].sort((a, b) => {
      if (b.completedLaps !== a.completedLaps) {
        return b.completedLaps - a.completedLaps;
      }
      if (a.totalRaceTime !== b.totalRaceTime) {
        return (a.totalRaceTime + a.penaltySeconds) - (b.totalRaceTime + b.penaltySeconds);
      }
      return a.gridPosition - b.gridPosition;
    });

    const leader = sortedRacers[0];
    let overallFastestRacer = race.fastestLapRacer || race.fastestLapDriver;
    let overallFastestTime = race.fastestLapTime || 0;

    const indexedRacers = sortedRacers.map((racer, index) => {
      const position = index + 1;
      let gapToLeader = '-';

      if (position > 1 && leader) {
        const lapDiff = leader.completedLaps - racer.completedLaps;
        if (lapDiff > 0) {
          gapToLeader = `+${lapDiff} LAP${lapDiff > 1 ? 'S' : ''}`;
        } else {
          const timeDiff = (racer.totalRaceTime + racer.penaltySeconds) - (leader.totalRaceTime + leader.penaltySeconds);
          gapToLeader = `+${timeDiff > 0 ? timeDiff.toFixed(3) : '0.000'}s`;
        }
      }

      if (racer.bestLapTime > 0 && (overallFastestTime === 0 || racer.bestLapTime < overallFastestTime)) {
        overallFastestTime = racer.bestLapTime;
        overallFastestRacer = racer.racerName;
      }

      return {
        ...racer,
        position,
        gapToLeader
      };
    });

    return {
      ...race,
      racers: indexedRacers,
      drivers: indexedRacers,
      fastestLapRacer: overallFastestRacer,
      fastestLapDriver: overallFastestRacer,
      fastestLapTime: overallFastestTime
    };
  }

  // -----------------------------------------------------------------
  // 5. GPS TELEMETRY & MULTI-SOURCE TIMING SIMULATOR
  // -----------------------------------------------------------------
  public startSimulator(race: RaceModel, updateRaceCallback: (updated: RaceModel) => void) {
    this.stopSimulator();
    this.activeRaceRef = race;
    const track = race.trackConfig || this.getTrackConfig();

    // Initialize progress for all racers
    const activeRacers = race.racers || race.drivers || [];
    activeRacers.forEach((r, idx) => {
      this.racerProgress[r.racerId] = (idx * 6) % 100;
    });

    // 1. High-frequency GPS telemetry loop (updates every 300ms)
    this.gpsTelemetryInterval = setInterval(() => {
      if (!this.activeRaceRef || this.activeRaceRef.status !== 'LIVE') return;

      const current = this.activeRaceRef;
      const racers = current.racers || current.drivers || [];
      const updatedRacers: RacerState[] = [];

      for (let i = 0; i < racers.length; i++) {
        const racer = racers[i];
        let progress = (this.racerProgress[racer.racerId] || 0);
        
        // Speed in km/h based on race position and random variance (42 - 68 km/h)
        const speedKmh = Math.floor(48 + Math.sin(progress * 0.1) * 14 + (Math.random() * 6 - 3));
        const progressIncrement = (speedKmh / 60) * 0.9; // progress per tick
        
        const oldProgress = progress;
        progress = (progress + progressIncrement);

        // Check if kart crossed the Start/Finish line (100% boundary)
        let didCrossLine = false;
        if (progress >= 100) {
          progress = progress % 100;
          didCrossLine = true;
        }
        this.racerProgress[racer.racerId] = progress;

        // Calculate GPS coordinates along simulated track polygon
        const angle = (progress / 100) * 2 * Math.PI;
        // Oval / circuit math
        const latOffset = (Math.sin(angle) * 0.0018) + (Math.sin(angle * 2) * 0.0004);
        const lngOffset = (Math.cos(angle) * 0.0028) + (Math.cos(angle * 3) * 0.0003);

        const baseLat = track.finishLat || track.startFinishLat || 12.583321;
        const baseLng = track.finishLng || track.startFinishLng || 78.633412;

        const gpsCoords: GPSCoordinate = {
          lat: Number((baseLat + latOffset).toFixed(6)),
          lng: Number((baseLng + lngOffset).toFixed(6)),
          speedKmh,
          heading: Math.floor((angle * (180 / Math.PI) + 90) % 360),
          accuracyMeters: Number((1.8 + Math.random() * 1.5).toFixed(1)),
          satellites: Math.floor(12 + Math.random() * 4),
          timestamp: Date.now(),
          trackProgressPercent: Number(progress.toFixed(1))
        };

        const updatedRacerState: RacerState = {
          ...racer,
          gpsLocation: gpsCoords,
          currentSpeedKmh: speedKmh,
          topSpeedKmh: Math.max(racer.topSpeedKmh || 0, speedKmh),
          gpsSignalStatus: 'EXCELLENT',
          transponderSignalStatus: 'ONLINE'
        };

        updatedRacers.push(updatedRacerState);

        // If crossed start/finish line and GPS timing method is active, trigger timing crossing!
        if (didCrossLine && current.timingMethod === 'GPS') {
          const timingEvent: TimingEvent = {
            rfidId: racer.transponderId,
            kartId: racer.kartId,
            timestamp: Date.now(),
            trackId: track.id,
            source: 'GPS',
            speedKmh,
            lat: gpsCoords.lat,
            lng: gpsCoords.lng
          };

          this.processRawTimingEvent(timingEvent, current);
        }
      }

      const refreshed = {
        ...current,
        racers: updatedRacers,
        drivers: updatedRacers
      };
      this.activeRaceRef = refreshed;
      updateRaceCallback(refreshed);
      this.broadcast('race:telemetry_update', refreshed);

    }, 300);

    // 2. Transponder Pulse loop (if Transponder only method selected)
    if (race.timingMethod === 'Transponder') {
      this.simulatorInterval = setInterval(() => {
        if (!this.activeRaceRef || this.activeRaceRef.status !== 'LIVE') return;
        const racers = this.activeRaceRef.racers || this.activeRaceRef.drivers || [];
        const randomIndex = Math.floor(Math.random() * racers.length);
        const targetRacer = racers[randomIndex];

        if (targetRacer) {
          const rawEvent: TimingEvent = {
            rfidId: targetRacer.transponderId,
            kartId: targetRacer.kartId,
            timestamp: Date.now(),
            trackId: track.id,
            source: 'Transponder',
            rawSignal: `TP_LOOP_${targetRacer.transponderId}_${Date.now()}`
          };

          const updated = this.processRawTimingEvent(rawEvent, this.activeRaceRef);
          if (updated) {
            updateRaceCallback(updated);
          }
        }
      }, 2600);
    }
  }

  public stopSimulator() {
    if (this.simulatorInterval) {
      clearInterval(this.simulatorInterval);
      this.simulatorInterval = null;
    }
    if (this.gpsTelemetryInterval) {
      clearInterval(this.gpsTelemetryInterval);
      this.gpsTelemetryInterval = null;
    }
    this.activeRaceRef = null;
  }
}

export const timingEngine = new TimingEngineService();

