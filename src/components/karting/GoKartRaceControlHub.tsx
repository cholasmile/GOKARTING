import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Gauge, QrCode, Search, Car, Flag, Play, Pause, CheckCircle2, 
  Clock, ShieldCheck, UserCheck, Users, AlertTriangle, ArrowRight, 
  RotateCcw, Trophy, Activity, RefreshCw, X, Check, Edit2, Zap, 
  Sparkles, Layers, Volume2, Maximize2, Shield, Radio, ChevronRight, Eye, Calendar, Plus,
  Settings, Trash2, Lock, Sliders, DollarSign, Wifi, Cpu, Battery, BatteryCharging, Signal
} from 'lucide-react';
import { Kart, Ticket, Booking, User, KartStatus, OperationalRider, AllotmentAuditEntry, RiderOperationalStatus, TransponderUnit } from '../../types';
import { useAppContext } from '../../context/AppContext';

// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────────

function parseDuration(details: string = ''): number {
  const m = details.match(/(\d+)\s*[Mm]in/);
  if (m) return parseInt(m[1]);
  if (/grand prix|30/i.test(details)) return 30;
  if (/double|co.pilot/i.test(details)) return 10;
  return 10;
}

function isDualKartBooking(details: string = ''): boolean {
  return /double|co.pilot|dual/i.test(details);
}

function fmtMMSS(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.floor(Math.max(0, seconds) % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

function fmtClockTime(date: Date = new Date()): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

// ─── LIVE LEADERBOARD & TRANSPONDER INTERFACE ───────────────────────────────

interface LiveRacer {
  riderId: string;
  riderName: string;
  kartNumber: string;
  kartId: string;
  transponderId: string;       // e.g. "TR-05"
  transponderSignal: number;   // e.g. -38 dBm
  currentLap: number;
  totalLaps: number;
  lastLapTime: number;         // e.g. 41.250
  bestLapTime: number;         // e.g. 39.802
  sector1: number;             // e.g. 12.350
  sector2: number;             // e.g. 14.180
  sector3: number;             // e.g. 13.272
  gap: string;                 // "—", "+2.10s", "+1 LAP"
  progress: number;            // 0 - 100 around track for animation
  speed: number;               // km/h
}

// ─── 15 TRACK TRANSPONDER UNITS INVENTORY ───────────────────────────────────
const INITIAL_TRANSPONDERS: TransponderUnit[] = [
  { id: 'TR-01', hardwareCode: 'MYLAPS-849201', assignedKartNumber: '01', assignedKartId: 'kart-1', batteryLevel: 98, signalDbm: -42, lastLoopPing: 'Just now', lastLoopLocation: 'Finish Line', status: 'connected', voltage: 4.12, totalPassings: 342 },
  { id: 'TR-02', hardwareCode: 'MYLAPS-849202', assignedKartNumber: '02', assignedKartId: 'kart-2', batteryLevel: 94, signalDbm: -46, lastLoopPing: 'Just now', lastLoopLocation: 'Sector 1', status: 'connected', voltage: 4.08, totalPassings: 310 },
  { id: 'TR-03', hardwareCode: 'MYLAPS-849203', assignedKartNumber: '03', assignedKartId: 'kart-3', batteryLevel: 91, signalDbm: -40, lastLoopPing: 'Just now', lastLoopLocation: 'Finish Line', status: 'connected', voltage: 4.01, totalPassings: 420 },
  { id: 'TR-04', hardwareCode: 'MYLAPS-849204', assignedKartNumber: '04', assignedKartId: 'kart-4', batteryLevel: 88, signalDbm: -52, lastLoopPing: '1m ago', lastLoopLocation: 'Pit Lane', status: 'connected', voltage: 3.96, totalPassings: 280 },
  { id: 'TR-05', hardwareCode: 'MYLAPS-849205', assignedKartNumber: '05', assignedKartId: 'kart-5', batteryLevel: 99, signalDbm: -38, lastLoopPing: 'Just now', lastLoopLocation: 'Finish Line', status: 'connected', voltage: 4.15, totalPassings: 512 },
  { id: 'TR-06', hardwareCode: 'MYLAPS-849206', assignedKartNumber: '06', assignedKartId: 'kart-6', batteryLevel: 85, signalDbm: -48, lastLoopPing: '2m ago', lastLoopLocation: 'Pit Lane', status: 'connected', voltage: 3.92, totalPassings: 195 },
  { id: 'TR-07', hardwareCode: 'MYLAPS-849207', assignedKartNumber: '07', assignedKartId: 'kart-7', batteryLevel: 96, signalDbm: -41, lastLoopPing: 'Just now', lastLoopLocation: 'Sector 2', status: 'connected', voltage: 4.10, totalPassings: 478 },
  { id: 'TR-08', hardwareCode: 'MYLAPS-849208', assignedKartNumber: '08', assignedKartId: 'kart-8', batteryLevel: 92, signalDbm: -45, lastLoopPing: 'Just now', lastLoopLocation: 'Finish Line', status: 'connected', voltage: 4.04, totalPassings: 390 },
  { id: 'TR-09', hardwareCode: 'MYLAPS-849209', assignedKartNumber: '09', assignedKartId: 'kart-9', batteryLevel: 79, signalDbm: -58, lastLoopPing: '4m ago', lastLoopLocation: 'Pit Lane', status: 'weak', voltage: 3.82, totalPassings: 154 },
  { id: 'TR-10', hardwareCode: 'MYLAPS-849210', assignedKartNumber: '10', assignedKartId: 'kart-10', batteryLevel: 97, signalDbm: -39, lastLoopPing: 'Just now', lastLoopLocation: 'Finish Line', status: 'connected', voltage: 4.14, totalPassings: 405 },
  { id: 'TR-11', hardwareCode: 'MYLAPS-849211', assignedKartNumber: '11', assignedKartId: 'kart-11', batteryLevel: 95, signalDbm: -44, lastLoopPing: '3m ago', lastLoopLocation: 'Pit Lane', status: 'connected', voltage: 4.09, totalPassings: 220 },
  { id: 'TR-12', hardwareCode: 'MYLAPS-849212', assignedKartNumber: '12', assignedKartId: 'kart-12', batteryLevel: 90, signalDbm: -47, lastLoopPing: 'Just now', lastLoopLocation: 'Sector 1', status: 'connected', voltage: 4.02, totalPassings: 315 },
  { id: 'TR-13', hardwareCode: 'MYLAPS-849213', assignedKartNumber: '13', assignedKartId: 'kart-13', batteryLevel: 100, signalDbm: -35, lastLoopPing: 'Docked', lastLoopLocation: 'Pit Lane', status: 'charging', voltage: 4.20, totalPassings: 88 },
  { id: 'TR-14', hardwareCode: 'MYLAPS-849214', assignedKartNumber: '14', assignedKartId: 'kart-14', batteryLevel: 93, signalDbm: -43, lastLoopPing: 'Just now', lastLoopLocation: 'Finish Line', status: 'connected', voltage: 4.06, totalPassings: 260 },
  { id: 'TR-15', hardwareCode: 'MYLAPS-849215', assignedKartNumber: '15', assignedKartId: 'kart-15', batteryLevel: 89, signalDbm: -49, lastLoopPing: '5m ago', lastLoopLocation: 'Pit Lane', status: 'connected', voltage: 3.98, totalPassings: 180 }
];

// ─── INITIAL MOCK ACTIVE RACERS GENERATOR ──────────────────────────────────────

const DEFAULT_RACE_NUM = '024';
const DEFAULT_TRACK_NAME = 'TRACK A';
const TOTAL_RACE_LAPS = 10;
const SESSION_SECONDS = 600; // 10 mins

export const GoKartRaceControlHub: React.FC = () => {
  const { karts, tickets, bookings, currentUser, updateKartStatus } = useAppContext();

  // ── 1. REAL-TIME CLOCK ─────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState<string>(fmtClockTime());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(fmtClockTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── 2. OPERATIONAL RIDERS PIPELINE ─────────────────────────────────────────
  const [riders, setRiders] = useState<OperationalRider[]>(() => {
    try {
      const raw = sessionStorage.getItem('gk_hub_riders');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }

    // Seed realistic active operational queue with both ONLINE pre-bookings and WALK-IN arrivals
    return [
      {
        id: 'r-seed-1',
        riderIndex: 1,
        riderName: 'John Doe',
        ticketId: 'GK-10025',
        bookingId: 'BK-9941',
        customerId: 'john.doe@example.com',
        sessionDuration: 10,
        isDualKart: false,
        status: 'racing',
        assignedKartId: 'kart-5',
        assignedKartNumber: '05',
        waiverVerified: true,
        bookingSource: 'online',
        checkInTime: new Date(Date.now() - 320000).toISOString(),
        kartAssignedTime: new Date(Date.now() - 300000).toISOString(),
        raceStartTime: new Date(Date.now() - 292000).toISOString(),
      },
      {
        id: 'r-seed-2',
        riderIndex: 1,
        riderName: 'Alex Mercer',
        ticketId: 'GK-10026',
        bookingId: 'BK-9942',
        customerId: 'alex.m@example.com',
        sessionDuration: 10,
        isDualKart: false,
        status: 'racing',
        assignedKartId: 'kart-7',
        assignedKartNumber: '07',
        waiverVerified: true,
        bookingSource: 'online',
        checkInTime: new Date(Date.now() - 320000).toISOString(),
        kartAssignedTime: new Date(Date.now() - 300000).toISOString(),
        raceStartTime: new Date(Date.now() - 292000).toISOString(),
      },
      {
        id: 'r-seed-3',
        riderIndex: 1,
        riderName: 'Sam Jenkins',
        ticketId: 'GK-10027',
        bookingId: 'BK-9943',
        customerId: 'sam.j@example.com',
        sessionDuration: 10,
        isDualKart: false,
        status: 'racing',
        assignedKartId: 'kart-3',
        assignedKartNumber: '03',
        waiverVerified: true,
        bookingSource: 'online',
        checkInTime: new Date(Date.now() - 320000).toISOString(),
        kartAssignedTime: new Date(Date.now() - 300000).toISOString(),
        raceStartTime: new Date(Date.now() - 292000).toISOString(),
      },
      {
        id: 'r-seed-4',
        riderIndex: 1,
        riderName: 'Priya Sharma',
        ticketId: 'GK-10028',
        bookingId: 'BK-9944',
        customerId: 'priya.s@example.com',
        sessionDuration: 10,
        isDualKart: true,
        status: 'ready_to_race',
        assignedKartId: 'kart-1',
        assignedKartNumber: '01',
        waiverVerified: true,
        bookingSource: 'online',
        checkInTime: new Date(Date.now() - 180000).toISOString(),
        kartAssignedTime: new Date(Date.now() - 90000).toISOString(),
      },
      {
        id: 'r-seed-5',
        riderIndex: 2,
        riderName: 'Rohan Sharma (Co-Pilot)',
        ticketId: 'GK-10028',
        bookingId: 'BK-9944',
        customerId: 'priya.s@example.com',
        sessionDuration: 10,
        isDualKart: true,
        status: 'ready_to_race',
        assignedKartId: 'kart-1',
        assignedKartNumber: '01',
        waiverVerified: true,
        bookingSource: 'online',
        checkInTime: new Date(Date.now() - 180000).toISOString(),
        kartAssignedTime: new Date(Date.now() - 90000).toISOString(),
      },
      {
        id: 'r-seed-6',
        riderIndex: 1,
        riderName: 'Vikram Mehta',
        ticketId: 'WK-8491',
        bookingId: 'COUNTER-01',
        customerId: 'vikram.walkin@deuce.local',
        sessionDuration: 10,
        isDualKart: false,
        status: 'checked_in',
        waiverVerified: true,
        bookingSource: 'walk_in',
        checkInTime: new Date(Date.now() - 120000).toISOString(),
      },
      {
        id: 'r-seed-7',
        riderIndex: 1,
        riderName: 'Ananya Rao',
        ticketId: 'GK-10030',
        bookingId: 'BK-9946',
        customerId: 'ananya.r@example.com',
        sessionDuration: 10,
        isDualKart: false,
        status: 'pending',
        waiverVerified: false,
        bookingSource: 'online',
      },
      {
        id: 'r-seed-8',
        riderIndex: 1,
        riderName: 'Karan Patel',
        ticketId: 'WK-8492',
        bookingId: 'COUNTER-02',
        customerId: 'karan.walkin@deuce.local',
        sessionDuration: 10,
        isDualKart: false,
        status: 'pending',
        waiverVerified: false,
        bookingSource: 'walk_in',
      }
    ];
  });

  useEffect(() => {
    sessionStorage.setItem('gk_hub_riders', JSON.stringify(riders));
  }, [riders]);

  // ── AUTOMATIC ONLINE BOOKINGS SYNC ─────────────────────────────────────────
  // When a customer books online, automatically ingest their ticket into the Pending Queue
  useEffect(() => {
    if (!tickets || tickets.length === 0) return;

    const goKartTickets = tickets.filter(t => {
      const isGK = t.activityId === 'act-go-karting' || 
                   t.activityId?.includes('kart') || 
                   t.activityName?.toLowerCase().includes('kart');
      return isGK && t.status === 'valid';
    });

    setRiders(prev => {
      const existingTicketIds = new Set(prev.map(r => r.ticketId.toLowerCase()));
      const newAdditions: OperationalRider[] = [];

      goKartTickets.forEach(t => {
        if (!existingTicketIds.has(t.id.toLowerCase())) {
          const booking = bookings.find(b => b.id === t.bookingId);
          const details = booking?.details || t.ticketType || '';
          const isDual = isDualKartBooking(details);
          const duration = parseDuration(details);

          // Rider 1 (Primary from online booking)
          newAdditions.push({
            id: `r-online-${t.id}-1`,
            riderIndex: 1,
            riderName: t.customerName,
            ticketId: t.id,
            bookingId: t.bookingId || `BK-${t.id.slice(-4)}`,
            customerId: t.customerEmail,
            sessionDuration: duration,
            isDualKart: isDual,
            status: 'pending',
            waiverVerified: false,
            bookingSource: 'online',
          });

          // Rider 2 (If Dual Kart package)
          if (isDual) {
            newAdditions.push({
              id: `r-online-${t.id}-2`,
              riderIndex: 2,
              riderName: '',
              ticketId: t.id,
              bookingId: t.bookingId || `BK-${t.id.slice(-4)}`,
              customerId: t.customerEmail,
              sessionDuration: duration,
              isDualKart: isDual,
              status: 'pending',
              waiverVerified: false,
              bookingSource: 'online',
            });
          }
        }
      });

      if (newAdditions.length > 0) {
        return [...newAdditions, ...prev];
      }
      return prev;
    });
  }, [tickets, bookings]);

  // ── 3. AUDIT LOG ───────────────────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<AllotmentAuditEntry[]>(() => {
    try {
      const raw = sessionStorage.getItem('gk_hub_audit');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return [];
  });

  useEffect(() => {
    sessionStorage.setItem('gk_hub_audit', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addAudit = useCallback((entry: Omit<AllotmentAuditEntry, 'id' | 'timestamp' | 'staffId' | 'staffName'>) => {
    const full: AllotmentAuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowISO(),
      staffId: currentUser?.id || 'staff-1',
      staffName: currentUser?.name || 'Track Marshal',
    };
    setAuditLogs(prev => [full, ...prev]);
  }, [currentUser]);

  // ── 4. LIVE RACE STATE & TELEMETRY ENGINE ───────────────────────────────────
  // ── 4. TRANSPONDER HARDWARE BRIDGE & INVENTORY STATE ──────────────────────
  const [transponders, setTransponders] = useState<TransponderUnit[]>(() => {
    try {
      const saved = sessionStorage.getItem('gk_transponders');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return INITIAL_TRANSPONDERS;
  });

  useEffect(() => {
    sessionStorage.setItem('gk_transponders', JSON.stringify(transponders));
  }, [transponders]);

  const [decoderBridgeConnected, setDecoderBridgeConnected] = useState(true);
  const [decoderHost, setDecoderHost] = useState('192.168.1.150:5403 (MYLAPS X2 Loop)');
  const [showTransponderModal, setShowTransponderModal] = useState(false);
  const [editingTransponder, setEditingTransponder] = useState<TransponderUnit | null>(null);
  const [testPingId, setTestPingId] = useState<string | null>(null);
  const [lastPassingNotice, setLastPassingNotice] = useState<string>('Kart #05 · TR-05 · Finish Line (39.802s)');

  // Helper to find transponder for kart
  const getKartTransponder = useCallback((kartNum: string): TransponderUnit | undefined => {
    const padded = kartNum.padStart(2, '0');
    return transponders.find(t => t.assignedKartNumber === padded || t.assignedKartNumber === kartNum);
  }, [transponders]);

  // Transponder Handlers
  const handleReassignTransponder = (trId: string, newKartNum: string) => {
    setTransponders(prev => prev.map(t => {
      if (t.id === trId) {
        return { ...t, assignedKartNumber: newKartNum.padStart(2, '0'), assignedKartId: `kart-${parseInt(newKartNum)}` };
      }
      // If another transponder had this kart, unassign it
      if (t.assignedKartNumber === newKartNum.padStart(2, '0') && t.id !== trId) {
        return { ...t, assignedKartNumber: '—', assignedKartId: 'none' };
      }
      return t;
    }));
    setEditingTransponder(null);
  };

  const handleTestPing = (trId: string) => {
    setTestPingId(trId);
    setTimeout(() => {
      setTestPingId(null);
      setTransponders(prev => prev.map(t => {
        if (t.id === trId) {
          return {
            ...t,
            lastLoopPing: 'Just now',
            signalDbm: Math.floor(-38 - Math.random() * 8),
            status: 'connected',
            totalPassings: t.totalPassings + 1,
          };
        }
        return t;
      }));
    }, 900);
  };

  // ── 5. LIVE RACE STATE & TELEMETRY ENGINE ───────────────────────────────────
  const [raceNumber, setRaceNumber] = useState(DEFAULT_RACE_NUM);
  const [isRaceLive, setIsRaceLive] = useState(true);
  const [isRacePaused, setIsRacePaused] = useState(false);
  const [raceElapsedSec, setRaceElapsedSec] = useState(292); // 04:52
  const [raceFinished, setRaceFinished] = useState(false);
  const [completedResults, setCompletedResults] = useState<LiveRacer[]>([]);

  // Live telemetry racers derived from 'racing' status riders with Transponders
  const [liveRacers, setLiveRacers] = useState<LiveRacer[]>([
    {
      riderId: 'r-seed-1',
      riderName: 'John Doe',
      kartNumber: '05',
      kartId: 'kart-5',
      transponderId: 'TR-05',
      transponderSignal: -38,
      currentLap: 7,
      totalLaps: TOTAL_RACE_LAPS,
      lastLapTime: 41.250,
      bestLapTime: 39.802,
      sector1: 12.350,
      sector2: 14.180,
      sector3: 13.272,
      gap: '—',
      progress: 68,
      speed: 64,
    },
    {
      riderId: 'r-seed-2',
      riderName: 'Alex Mercer',
      kartNumber: '07',
      kartId: 'kart-7',
      transponderId: 'TR-07',
      transponderSignal: -41,
      currentLap: 7,
      totalLaps: TOTAL_RACE_LAPS,
      lastLapTime: 42.100,
      bestLapTime: 40.250,
      sector1: 12.680,
      sector2: 14.340,
      sector3: 13.230,
      gap: '+2.10s',
      progress: 54,
      speed: 61,
    },
    {
      riderId: 'r-seed-3',
      riderName: 'Sam Jenkins',
      kartNumber: '03',
      kartId: 'kart-3',
      transponderId: 'TR-03',
      transponderSignal: -40,
      currentLap: 6,
      totalLaps: TOTAL_RACE_LAPS,
      lastLapTime: 43.200,
      bestLapTime: 41.100,
      sector1: 13.020,
      sector2: 14.890,
      sector3: 13.190,
      gap: '+1 LAP',
      progress: 22,
      speed: 58,
    }
  ]);

  // Live telemetry interval with Transponder Loop crossing detection
  useEffect(() => {
    if (!isRaceLive || isRacePaused || raceFinished) return;

    const interval = setInterval(() => {
      setRaceElapsedSec(prev => {
        const next = prev + 1;
        if (next >= SESSION_SECONDS) {
          handleFinishRace();
        }
        return next;
      });

      // Update racer progress along track & lap simulations with transponder loop passings
      setLiveRacers(prev => {
        return prev.map(racer => {
          const delta = (racer.speed / 180) * 2;
          let newProgress = racer.progress + delta;
          let newLap = racer.currentLap;
          let newLastLap = racer.lastLapTime;
          let newBest = racer.bestLapTime;
          let newS1 = racer.sector1;
          let newS2 = racer.sector2;
          let newS3 = racer.sector3;

          if (newProgress >= 100) {
            newProgress = newProgress % 100;
            if (newLap < TOTAL_RACE_LAPS) {
              newLap += 1;
              // Generate realistic millisecond lap times
              const s1 = Number((12.1 + Math.random() * 1.2).toFixed(3));
              const s2 = Number((14.0 + Math.random() * 1.4).toFixed(3));
              const s3 = Number((13.0 + Math.random() * 1.1).toFixed(3));
              const lapSec = Number((s1 + s2 + s3).toFixed(3));
              newLastLap = lapSec;
              newS1 = s1;
              newS2 = s2;
              newS3 = s3;
              if (lapSec < newBest) newBest = lapSec;

              // Transponder loop passing notification
              setLastPassingNotice(`Kart #${racer.kartNumber} · ${racer.transponderId} crossed Finish Loop — Lap ${newLap} (${lapSec.toFixed(3)}s)`);
            }
          }

          return {
            ...racer,
            progress: newProgress,
            currentLap: newLap,
            lastLapTime: newLastLap,
            bestLapTime: newBest,
            sector1: newS1,
            sector2: newS2,
            sector3: newS3,
            speed: Math.floor(55 + Math.random() * 14)
          };
        }).sort((a, b) => {
          if (b.currentLap !== a.currentLap) return b.currentLap - a.currentLap;
          return a.bestLapTime - b.bestLapTime;
        }).map((racer, idx, arr) => {
          let gap = '—';
          if (idx > 0) {
            const lapDiff = arr[0].currentLap - racer.currentLap;
            if (lapDiff > 0) {
              gap = `+${lapDiff} LAP`;
            } else {
              const diff = (racer.bestLapTime - arr[0].bestLapTime).toFixed(3);
              gap = `+${Math.max(0.05, parseFloat(diff)).toFixed(3)}s`;
            }
          }
          return { ...racer, gap };
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRaceLive, isRacePaused, raceFinished]);

  // Overall session best lap
  const overallBestLap = useMemo(() => {
    if (liveRacers.length === 0) return null;
    return [...liveRacers].sort((a, b) => a.bestLapTime - b.bestLapTime)[0];
  }, [liveRacers]);

  // ── 5. KART EFFECTIVE STATUS COMPUTATION ────────────────────────────────────
  const getKartStatus = useCallback((kart: Kart): KartStatus => {
    // Check if kart is in active racing list
    const isRacing = riders.some(r => r.assignedKartId === kart.id && r.status === 'racing');
    if (isRacing) return 'On Track';

    // Check if kart is assigned to ready or checked_in rider
    const isAssigned = riders.some(r => r.assignedKartId === kart.id && (r.status === 'kart_assigned' || r.status === 'ready_to_race'));
    if (isAssigned) return 'Reserved';

    return kart.status;
  }, [riders]);

  const getKartOccupant = useCallback((kart: Kart) => {
    return riders.find(r => r.assignedKartId === kart.id && (r.status === 'kart_assigned' || r.status === 'ready_to_race' || r.status === 'racing'));
  }, [riders]);

  // ── 6. SUMMARY STATS (6 CARDS) ──────────────────────────────────────────────
  const summaryCounts = useMemo(() => {
    const pending = riders.filter(r => r.status === 'pending').length;
    const checkedIn = riders.filter(r => r.status === 'checked_in').length;
    const assigned = riders.filter(r => r.status === 'kart_assigned' || r.status === 'ready_to_race').length;
    const live = riders.filter(r => r.status === 'racing').length;
    const completed = riders.filter(r => r.status === 'completed').length + 27; // mock completed historical
    const availableKarts = karts.filter(k => getKartStatus(k) === 'Available').length;
    const totalKarts = karts.length || 15;

    return {
      pending: String(pending).padStart(2, '0'),
      checkedIn: String(checkedIn).padStart(2, '0'),
      available: `${String(availableKarts).padStart(2, '0')}/${String(totalKarts).padStart(2, '0')}`,
      assigned: String(assigned).padStart(2, '0'),
      live: String(live > 0 ? 1 : 0).padStart(2, '0'),
      completed: String(completed).padStart(2, '0'),
    };
  }, [riders, karts, getKartStatus]);

  // ── 7. QUEUE FILTERS & SEARCH ───────────────────────────────────────────────
  const [queueSearch, setQueueSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'PENDING' | 'CHECKED_IN' | 'READY'>('ALL');
  const [queueSourceFilter, setQueueSourceFilter] = useState<'ALL' | 'ONLINE' | 'WALK_IN'>('ALL');
  const [kartFilter, setKartFilter] = useState<'ALL' | 'AVAILABLE' | 'ASSIGNED' | 'RACING' | 'MAINTENANCE'>('ALL');

  const filteredRiders = useMemo(() => {
    return riders.filter(r => {
      // Exclude completed from active operational queue
      if (r.status === 'completed') return false;

      // Channel Source filter (Online vs Walk-in)
      if (queueSourceFilter === 'ONLINE' && r.bookingSource === 'walk_in') return false;
      if (queueSourceFilter === 'WALK_IN' && r.bookingSource !== 'walk_in') return false;

      // Status filter tab
      if (queueFilter === 'PENDING' && r.status !== 'pending') return false;
      if (queueFilter === 'CHECKED_IN' && r.status !== 'checked_in') return false;
      if (queueFilter === 'READY' && r.status !== 'ready_to_race' && r.status !== 'kart_assigned') return false;

      // Search term
      if (queueSearch.trim()) {
        const q = queueSearch.toLowerCase();
        const matchName = r.riderName.toLowerCase().includes(q);
        const matchTicket = r.ticketId.toLowerCase().includes(q);
        const matchBooking = r.bookingId.toLowerCase().includes(q);
        const matchKart = (r.assignedKartNumber || '').toLowerCase().includes(q);
        const matchSource = (r.bookingSource || 'online').toLowerCase().includes(q);
        return matchName || matchTicket || matchBooking || matchKart || matchSource;
      }
      return true;
    });
  }, [riders, queueFilter, queueSourceFilter, queueSearch]);

  const filteredKarts = useMemo(() => {
    return karts.filter(k => {
      const eff = getKartStatus(k);
      if (kartFilter === 'AVAILABLE') return eff === 'Available';
      if (kartFilter === 'ASSIGNED') return eff === 'Reserved';
      if (kartFilter === 'RACING') return eff === 'On Track';
      if (kartFilter === 'MAINTENANCE') return eff === 'Maintenance' || eff === 'Out of Service';
      return true;
    });
  }, [karts, kartFilter, getKartStatus]);

  // ── 8. MODAL STATES ─────────────────────────────────────────────────────────
  const [showQrModal, setShowQrModal] = useState(false);
  const [manualTicketInput, setManualTicketInput] = useState('');

  const [checkInRider, setCheckInRider] = useState<OperationalRider | null>(null);
  const [rider2CoPilotName, setRider2CoPilotName] = useState('');

  const [assignKartRider, setAssignKartRider] = useState<OperationalRider | null>(null);
  const [selectedAssignKart, setSelectedAssignKart] = useState<Kart | null>(null);

  const [changeKartRider, setChangeKartRider] = useState<OperationalRider | null>(null);
  const [selectedNewKart, setSelectedNewKart] = useState<Kart | null>(null);

  const [showRaceDetailsModal, setShowRaceDetailsModal] = useState(false);
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);
  const [showQuickToolsModal, setShowQuickToolsModal] = useState(false);
  const [quickToolsTab, setQuickToolsTab] = useState<'displays' | 'schedule' | 'tournaments' | 'audit'>('displays');

  // ── FUTURE DATES & SLOT CAPACITY STATE & ALTERATION SYSTEM ────────────────
  const [mainViewMode, setMainViewMode] = useState<'RACE_CONTROL' | 'FUTURE_SCHEDULE'>('RACE_CONTROL');
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Global default capacity & pricing (Alterable by Super Admin)
  const [defaultSlotCapacity, setDefaultSlotCapacity] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('gk_default_capacity');
      if (saved) return parseInt(saved);
    } catch { /* ignore */ }
    return 50;
  });

  const [defaultPricePerKart, setDefaultPricePerKart] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem('gk_default_price');
      if (saved) return parseInt(saved);
    } catch { /* ignore */ }
    return 100;
  });

  // Dynamic alterable schedule slots
  const DEFAULT_INITIAL_SLOTS = [
    { id: 'slot-1', slotTime: '10:00 AM', heatNum: '01', capacity: 50, pricePerKart: 100, formatTitle: 'Open Morning Practice', status: 'active' as const, booked: 18, onlineCount: 12, walkInCount: 6, drivers: ['Rohan Verma (Online)', 'Kavita Singh (Online)', 'Aman Joshi (Online)', 'Tanvi Shah (Online)', 'Counter Walk-in Group (6 Riders)', 'Apex Racers (8 Riders)'] },
    { id: 'slot-2', slotTime: '11:00 AM', heatNum: '02', capacity: 50, pricePerKart: 100, formatTitle: 'Sprint Qualifier Heat', status: 'active' as const, booked: 28, onlineCount: 20, walkInCount: 8, drivers: ['David Miller (Online · 2)', 'Sarah Jenkins (Online)', 'Alex Mercer (Online)', 'Chris Evans (Online · 2)', 'Walk-in Sprint Squad (8 Riders)', 'Velocity Club (14 Riders)'] },
    { id: 'slot-3', slotTime: '12:00 PM', heatNum: '03', capacity: 50, pricePerKart: 100, formatTitle: 'Rookie & Pro Sprint', status: 'active' as const, booked: 38, onlineCount: 30, walkInCount: 8, drivers: ['Priya Sharma (Online · Dual)', 'Vikram Mehta (Walk-in)', 'Ananya Rao (Online)', 'Karan Patel (Walk-in)', 'Corporate Group Alpha (24 Riders)', 'FastTrack Drivers (10 Riders)'] },
    { id: 'slot-4', slotTime: '01:00 PM', heatNum: '04', capacity: 50, pricePerKart: 100, formatTitle: 'Afternoon Heat Session', status: 'active' as const, booked: 25, onlineCount: 15, walkInCount: 10, drivers: ['John Watson (Online)', 'Marcus Broadus (Online)', 'Oliver Chen (Online)', 'Elena Rostova (Online · Dual)', 'Walk-in Racers (10 Riders)'] },
    { id: 'slot-5', slotTime: '02:00 PM', heatNum: '05', capacity: 50, pricePerKart: 100, formatTitle: 'Grand Prix Corporate Heat', status: 'active' as const, booked: 50, onlineCount: 38, walkInCount: 12, drivers: ['Apex Motorsport Grand Prix Cup (30 Riders Online)', 'Nitro Syndicate (12 Riders Walk-in)', 'Sprint Qualifiers (8 Riders Online) — FULLY BOOKED'] },
    { id: 'slot-6', slotTime: '03:00 PM', heatNum: '06', capacity: 50, pricePerKart: 100, formatTitle: 'Grand Prix Sprint Cup', status: 'active' as const, booked: 45, onlineCount: 35, walkInCount: 10, drivers: ['Sam Jenkins (Online)', 'Julia Roberts (Online · 2)', 'Thomas Shelby (Online · 4)', 'David Beckham (Online · 3)', 'ProKart Academy (26 Riders)', 'Walk-in Racers (10 Riders)'] },
    { id: 'slot-7', slotTime: '04:00 PM', heatNum: '07', capacity: 50, pricePerKart: 100, formatTitle: 'Evening Rush Qualifier', status: 'active' as const, booked: 32, onlineCount: 22, walkInCount: 10, drivers: ['Arjun Kapoor (Online)', 'Deepika Padukone (Online)', 'Ranveer Singh (Online · 2)', 'Alia Bhatt (Online · 3)', 'Evening Walk-in Fleet (10 Riders)', 'Metro Racers (14 Riders)'] },
    { id: 'slot-8', slotTime: '05:00 PM', heatNum: '08', capacity: 50, pricePerKart: 100, formatTitle: 'Sunset Grand Prix Trophy', status: 'active' as const, booked: 50, onlineCount: 40, walkInCount: 10, drivers: ['ProKart Sunset Grand Prix Championship (50 Drivers Fully Booked — SOLD OUT)'] },
    { id: 'slot-9', slotTime: '06:00 PM', heatNum: '09', capacity: 50, pricePerKart: 100, formatTitle: 'Sunset Sprint Trophy', status: 'active' as const, booked: 42, onlineCount: 32, walkInCount: 10, drivers: ['Sunset Sprint Championship (42 Drivers — 8 Spots Left)', 'Walk-in Contingent (10 Riders)'] },
    { id: 'slot-10', slotTime: '07:00 PM', heatNum: '10', capacity: 50, pricePerKart: 100, formatTitle: 'Night Trophy Sprint Heat', status: 'active' as const, booked: 26, onlineCount: 18, walkInCount: 8, drivers: ['Night Trophy Racers (18 Drivers Online)', 'Evening Walk-ins (8 Drivers)'] },
    { id: 'slot-11', slotTime: '08:00 PM', heatNum: '11', capacity: 50, pricePerKart: 100, formatTitle: 'Midnight Endurance Sprint', status: 'active' as const, booked: 16, onlineCount: 12, walkInCount: 4, drivers: ['Late Night Endurance Racers (12 Drivers Online)', 'Walk-ins (4 Drivers)'] },
    { id: 'slot-12', slotTime: '09:00 PM', heatNum: '12', capacity: 50, pricePerKart: 100, formatTitle: 'Night Owls Solo Cup', status: 'active' as const, booked: 8, onlineCount: 6, walkInCount: 2, drivers: ['Solo Night Qualifiers (6 Drivers Online)', 'Walk-ins (2 Drivers)'] }
  ];

  const [scheduleSlots, setScheduleSlots] = useState(() => {
    try {
      const saved = sessionStorage.getItem('gk_schedule_slots');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return DEFAULT_INITIAL_SLOTS;
  });

  useEffect(() => {
    sessionStorage.setItem('gk_schedule_slots', JSON.stringify(scheduleSlots));
  }, [scheduleSlots]);

  useEffect(() => {
    sessionStorage.setItem('gk_default_capacity', defaultSlotCapacity.toString());
  }, [defaultSlotCapacity]);

  useEffect(() => {
    sessionStorage.setItem('gk_default_price', defaultPricePerKart.toString());
  }, [defaultPricePerKart]);

  // Alteration Modals State
  const [showGlobalAlterModal, setShowGlobalAlterModal] = useState(false);
  const [tempDefaultCap, setTempDefaultCap] = useState(defaultSlotCapacity);
  const [tempDefaultPrice, setTempDefaultPrice] = useState(defaultPricePerKart);
  const [applyGlobalToAllSlots, setApplyGlobalToAllSlots] = useState(true);

  const [editingSlot, setEditingSlot] = useState<typeof DEFAULT_INITIAL_SLOTS[0] | null>(null);
  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [newSlotTime, setNewSlotTime] = useState('10:00 PM');
  const [newSlotTitle, setNewSlotTitle] = useState('Extra Night Sprint Heat');
  const [newSlotCap, setNewSlotCap] = useState(50);
  const [newSlotPrice, setNewSlotPrice] = useState(100);

  // Alteration Handlers
  const handleSaveGlobalAlteration = () => {
    setDefaultSlotCapacity(tempDefaultCap);
    setDefaultPricePerKart(tempDefaultPrice);

    if (applyGlobalToAllSlots) {
      setScheduleSlots(prev => prev.map(s => ({
        ...s,
        capacity: tempDefaultCap,
        pricePerKart: tempDefaultPrice
      })));
    }

    addAudit({
      riderId: 'admin-action',
      riderName: 'Super Admin',
      ticketId: 'SYSTEM',
      bookingId: 'CAPACITY-UPDATE',
      kartId: 'all',
      kartNumber: 'ALL',
      action: 'assigned',
      timestamp: nowISO(),
      staffId: currentUser?.id || 'admin-01',
      staffName: currentUser?.name || 'Super Admin',
      notes: `Global Capacity altered to ${tempDefaultCap} Rides/Hour & Price altered to ₹${tempDefaultPrice} per slot`,
    });

    setShowGlobalAlterModal(false);
  };

  const handleSaveSlotAlteration = () => {
    if (!editingSlot) return;

    setScheduleSlots(prev => prev.map(s => {
      if (s.id === editingSlot.id) {
        return editingSlot;
      }
      return s;
    }));

    addAudit({
      riderId: 'admin-action',
      riderName: 'Super Admin',
      ticketId: 'SYSTEM',
      bookingId: `SLOT-${editingSlot.heatNum}`,
      kartId: 'slot',
      kartNumber: editingSlot.heatNum,
      action: 'assigned',
      timestamp: nowISO(),
      staffId: currentUser?.id || 'admin-01',
      staffName: currentUser?.name || 'Super Admin',
      notes: `Slot #${editingSlot.heatNum} (${editingSlot.slotTime}) altered: Capacity ${editingSlot.capacity}, Price ₹${editingSlot.pricePerKart}, Status: ${editingSlot.status}`,
    });

    setEditingSlot(null);
  };

  const handleCreateNewSlot = () => {
    if (!newSlotTime.trim()) return;

    const nextNum = String(scheduleSlots.length + 1).padStart(2, '0');
    const newSlot = {
      id: `slot-custom-${Date.now()}`,
      slotTime: newSlotTime.trim(),
      heatNum: nextNum,
      capacity: newSlotCap,
      pricePerKart: newSlotPrice,
      formatTitle: newSlotTitle.trim() || `Custom Heat #${nextNum}`,
      status: 'active' as const,
      booked: 0,
      onlineCount: 0,
      walkInCount: 0,
      drivers: []
    };

    setScheduleSlots(prev => [...prev, newSlot]);
    setShowAddSlotModal(false);
    setNewSlotTime('');
    setNewSlotTitle('');
  };

  const handleDeleteSlot = (slotId: string) => {
    setScheduleSlots(prev => prev.filter(s => s.id !== slotId));
  };

  const handleResetScheduleToDefault = () => {
    setScheduleSlots(DEFAULT_INITIAL_SLOTS);
    setDefaultSlotCapacity(50);
    setDefaultPricePerKart(100);
  };

  // ── 9. ACTIONS & WORKFLOW TRANSITIONS ───────────────────────────────────────

  // Check In confirmation
  const handleConfirmCheckIn = () => {
    if (!checkInRider) return;

    setRiders(prev => prev.map(r => {
      if (r.id === checkInRider.id) {
        return {
          ...r,
          status: 'checked_in',
          checkInTime: nowISO(),
          waiverVerified: true,
        };
      }
      // If co-pilot of same ticket
      if (r.ticketId === checkInRider.ticketId && r.riderIndex === 2) {
        return {
          ...r,
          riderName: rider2CoPilotName.trim() || `Co-Pilot (${checkInRider.riderName})`,
          status: 'checked_in',
          checkInTime: nowISO(),
          waiverVerified: true,
        };
      }
      return r;
    }));

    addAudit({
      riderId: checkInRider.id,
      riderName: checkInRider.riderName,
      ticketId: checkInRider.ticketId,
      bookingId: checkInRider.bookingId,
      kartId: 'none',
      kartNumber: '—',
      action: 'assigned',
      notes: 'Customer Checked-in & Waiver Certified',
    });

    setCheckInRider(null);
    setRider2CoPilotName('');
  };

  // Kart Assignment
  const handleConfirmKartAssign = () => {
    if (!assignKartRider || !selectedAssignKart) return;

    const kartId = selectedAssignKart.id;
    const kartNum = selectedAssignKart.kartNumber;

    setRiders(prev => prev.map(r => {
      if (r.id === assignKartRider.id) {
        return {
          ...r,
          status: 'ready_to_race',
          assignedKartId: kartId,
          assignedKartNumber: kartNum,
          kartAssignedTime: nowISO(),
          assignedByStaffName: currentUser?.name || 'Staff',
        };
      }
      // If dual-kart co-pilot, pair them to the same kart
      if (r.ticketId === assignKartRider.ticketId && r.isDualKart) {
        return {
          ...r,
          status: 'ready_to_race',
          assignedKartId: kartId,
          assignedKartNumber: kartNum,
          kartAssignedTime: nowISO(),
          assignedByStaffName: currentUser?.name || 'Staff',
        };
      }
      return r;
    }));

    updateKartStatus(kartId, 'Reserved', assignKartRider.id);

    addAudit({
      riderId: assignKartRider.id,
      riderName: assignKartRider.riderName,
      ticketId: assignKartRider.ticketId,
      bookingId: assignKartRider.bookingId,
      kartId,
      kartNumber: kartNum,
      action: 'assigned',
    });

    setAssignKartRider(null);
    setSelectedAssignKart(null);
  };

  // Change Kart
  const handleConfirmChangeKart = () => {
    if (!changeKartRider || !selectedNewKart) return;

    const oldKartId = changeKartRider.assignedKartId!;
    const oldKartNum = changeKartRider.assignedKartNumber!;
    const newKartId = selectedNewKart.id;
    const newKartNum = selectedNewKart.kartNumber;

    // Release old kart
    updateKartStatus(oldKartId, 'Available');
    // Reserve new kart
    updateKartStatus(newKartId, 'Reserved', changeKartRider.id);

    setRiders(prev => prev.map(r => {
      if (r.id === changeKartRider.id || (r.ticketId === changeKartRider.ticketId && r.isDualKart)) {
        return {
          ...r,
          assignedKartId: newKartId,
          assignedKartNumber: newKartNum,
          kartAssignedTime: nowISO(),
        };
      }
      return r;
    }));

    addAudit({
      riderId: changeKartRider.id,
      riderName: changeKartRider.riderName,
      ticketId: changeKartRider.ticketId,
      bookingId: changeKartRider.bookingId,
      kartId: newKartId,
      kartNumber: newKartNum,
      action: 'changed',
      fromKartNumber: oldKartNum,
      toKartNumber: newKartNum,
      notes: `Kart switched from K${oldKartNum} to K${newKartNum}`,
    });

    setChangeKartRider(null);
    setSelectedNewKart(null);
  };

  // Start Race with Ready Riders
  const handleStartRaceSession = () => {
    const readyRiders = riders.filter(r => r.status === 'ready_to_race');
    if (readyRiders.length === 0) {
      alert('No riders in READY status with karts assigned.');
      return;
    }

    const nextRaceId = String(parseInt(raceNumber) + 1).padStart(3, '0');
    setRaceNumber(nextRaceId);

    // Update riders status to racing
    setRiders(prev => prev.map(r => {
      if (r.status === 'ready_to_race') {
        if (r.assignedKartId) updateKartStatus(r.assignedKartId, 'On Track', r.id);
        return {
          ...r,
          status: 'racing',
          raceStartTime: nowISO(),
        };
      }
      return r;
    }));

    // Setup live racers telemetry with Transponder link
    const newLiveRacers: LiveRacer[] = readyRiders.map((r, i) => {
      const kNum = r.assignedKartNumber || `0${i + 1}`;
      const tr = getKartTransponder(kNum);
      const trId = tr ? tr.id : `TR-${kNum.padStart(2, '0')}`;
      const s1 = Number((12.35 + i * 0.15).toFixed(3));
      const s2 = Number((14.18 + i * 0.18).toFixed(3));
      const s3 = Number((13.27 + i * 0.12).toFixed(3));
      const best = Number((s1 + s2 + s3).toFixed(3));

      return {
        riderId: r.id,
        riderName: r.riderName,
        kartNumber: kNum,
        kartId: r.assignedKartId || `kart-${i + 1}`,
        transponderId: trId,
        transponderSignal: tr ? tr.signalDbm : -42,
        currentLap: 1,
        totalLaps: TOTAL_RACE_LAPS,
        lastLapTime: 0,
        bestLapTime: best,
        sector1: s1,
        sector2: s2,
        sector3: s3,
        gap: i === 0 ? '—' : `+${(i * 0.8).toFixed(3)}s`,
        progress: (i * 18) % 100,
        speed: 60 - i * 2,
      };
    });

    setLiveRacers(newLiveRacers);
    setRaceElapsedSec(0);
    setIsRaceLive(true);
    setIsRacePaused(false);
    setRaceFinished(false);

    readyRiders.forEach(r => {
      addAudit({
        riderId: r.id,
        riderName: r.riderName,
        ticketId: r.ticketId,
        bookingId: r.bookingId,
        kartId: r.assignedKartId || '',
        kartNumber: r.assignedKartNumber || '',
        action: 'race_started',
        notes: `Started Race #${nextRaceId}`,
      });
    });
  };

  // Finish Race Session
  const handleFinishRace = () => {
    setRaceFinished(true);
    setIsRaceLive(false);
    setShowCompleteConfirmModal(false);
    setCompletedResults([...liveRacers]);

    // Release all racing karts & set riders to completed
    riders.filter(r => r.status === 'racing').forEach(r => {
      if (r.assignedKartId) {
        updateKartStatus(r.assignedKartId, 'Available');
      }
      addAudit({
        riderId: r.id,
        riderName: r.riderName,
        ticketId: r.ticketId,
        bookingId: r.bookingId,
        kartId: r.assignedKartId || '',
        kartNumber: r.assignedKartNumber || '',
        action: 'race_completed',
        notes: `Finished Race #${raceNumber}`,
      });
    });

    setRiders(prev => prev.map(r => {
      if (r.status === 'racing') {
        return {
          ...r,
          status: 'completed',
          raceEndTime: nowISO(),
        };
      }
      return r;
    }));
  };

  // Reset to Next Race Session
  const handleNextRaceReady = () => {
    setRaceFinished(false);
    setLiveRacers([]);
    setRaceElapsedSec(0);
    const nextNum = String(parseInt(raceNumber) + 1).padStart(3, '0');
    setRaceNumber(nextNum);
  };

  // Scan QR ticket loader
  const handleProcessTicketId = (tktId: string) => {
    const matched = tickets.find(t => t.id.toLowerCase() === tktId.toLowerCase());
    if (matched) {
      // Check if already in queue
      const existing = riders.find(r => r.ticketId === matched.id);
      if (existing) {
        setQueueSearch(matched.id);
        setShowQrModal(false);
        return;
      }
      // Add to riders
      const b = bookings.find(bk => bk.id === matched.bookingId);
      const details = b?.details || matched.ticketType || '';
      const isDual = isDualKartBooking(details);
      const dur = parseDuration(details);

      const r1: OperationalRider = {
        id: `r-${Date.now()}-1`,
        riderIndex: 1,
        riderName: matched.customerName,
        ticketId: matched.id,
        bookingId: matched.bookingId || 'BK-NEW',
        customerId: matched.customerEmail,
        sessionDuration: dur,
        isDualKart: isDual,
        status: 'pending',
        waiverVerified: false,
      };

      const additions = [r1];
      if (isDual) {
        additions.push({
          id: `r-${Date.now()}-2`,
          riderIndex: 2,
          riderName: '',
          ticketId: matched.id,
          bookingId: matched.bookingId || 'BK-NEW',
          customerId: matched.customerEmail,
          sessionDuration: dur,
          isDualKart: isDual,
          status: 'pending',
          waiverVerified: false,
        });
      }

      setRiders(prev => [...additions, ...prev]);
      setQueueSearch(matched.id);
      setShowQrModal(false);
    } else {
      // Fallback create mock rider with that ID
      const newRider: OperationalRider = {
        id: `r-${Date.now()}`,
        riderIndex: 1,
        riderName: `Rider ${tktId.slice(-4)}`,
        ticketId: tktId.toUpperCase(),
        bookingId: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
        customerId: `rider.${tktId.toLowerCase()}@example.com`,
        sessionDuration: 10,
        isDualKart: false,
        status: 'pending',
        waiverVerified: false,
      };
      setRiders(prev => [newRider, ...prev]);
      setQueueSearch(tktId);
      setShowQrModal(false);
    }
  };

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#050816] text-white flex flex-col font-sans selection:bg-[#14F1D9]/30 selection:text-white">

      {/* ═══════════════════════════════════════════════════════════════════════
          2. HEADER LAYOUT (64-72px, FIXED)
      ═══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 h-16 sm:h-[72px] bg-[#070B1E]/95 backdrop-blur-xl border-b border-[#00ABAB]/30 px-4 sm:px-6 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        
        {/* Left: DEUCE GO-KART OPERATIONS */}
        <div className="flex items-center gap-3">
          <img 
            src="/deuce-logo.jpg" 
            alt="Deuce Logo" 
            className="w-10 h-10 rounded-xl object-cover shadow-[0_0_20px_rgba(20,241,217,0.4)] border border-[#14F1D9]/40" 
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg sm:text-xl tracking-tight uppercase text-white font-sans">
                DEUCE
              </span>
              <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-[#14F1D9]/10 text-[#14F1D9] border border-[#14F1D9]/30">
                PRO RACING OS
              </span>
            </div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#40E0D0] font-bold">
              GO-KART OPERATIONS
            </p>
          </div>
        </div>

        {/* Center: TRACK CONTROL CENTER */}
        <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0B1228] border border-[#14F1D9]/30 shadow-[0_0_15px_rgba(20,241,217,0.15)]">
          <Radio className="w-4 h-4 text-[#14F1D9] animate-pulse" />
          <span className="text-xs font-black font-mono tracking-widest text-white uppercase">
            TRACK CONTROL CENTER
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#14F1D9] animate-ping" />
        </div>

        {/* Right: TRACK STATUS, TIMING, CLOCK & PROFILE */}
        <div className="flex items-center gap-3 sm:gap-4">
          
          {/* Status Indicators */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono font-bold">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>TRACK ONLINE</span>
            </div>
            {/* Transponder Hardware Link Status */}
            <button
              onClick={() => setShowTransponderModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/40 text-purple-300 hover:text-white cursor-pointer transition-all shadow-[0_0_12px_rgba(168,85,247,0.2)]"
              title="Open Transponder Hardware Bridge & Diagnostic Matrix"
            >
              <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
              <span>TRANSPONDERS: <strong className="text-white">{transponders.filter(t => t.status === 'connected').length}/15</strong></span>
            </button>
          </div>

          {/* Current Live Time */}
          <div className="px-3 py-1.5 rounded-xl bg-[#050816] border border-white/10 text-right">
            <div className="text-xs sm:text-sm font-black font-mono text-[#14F1D9] tracking-wider">
              {currentTime}
            </div>
            <div className="text-[8px] font-mono text-slate-400 uppercase tracking-widest">
              LOCAL TIME (IST)
            </div>
          </div>

          {/* Quick Tools & Utility Modal Trigger */}
          <a
            href="/race/timing"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-[#14F1D9]/10 hover:bg-[#14F1D9] hover:text-[#050816] border border-[#14F1D9]/40 text-[#14F1D9] text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(20,241,217,0.2)]"
            title="Open Standalone Race Timing & Live Lap Display Engine"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">RACE TIMING & LIVE DISPLAY</span>
          </a>

          <button
            onClick={() => setShowQuickToolsModal(true)}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-[#14F1D9]/10 border border-white/10 hover:border-[#14F1D9]/40 text-slate-300 hover:text-[#14F1D9] text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
            title="External Displays, Schedule & Tournament Standings"
          >
            <Layers className="w-3.5 h-3.5 text-[#14F1D9]" />
            <span className="hidden sm:inline">QUICK TOOLS</span>
          </button>

          {/* Staff Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#14F1D9] to-[#00B4FF] text-[#050816] flex items-center justify-center font-black text-xs shadow-[0_0_10px_rgba(20,241,217,0.3)]">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'S'}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-white leading-none truncate max-w-[100px]">
                {currentUser?.name || 'Staff Marshal'}
              </div>
              <span className="text-[9px] font-mono text-slate-400 uppercase">
                {currentUser?.role?.replace(/_/g, ' ') || 'Race Officer'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          MAIN CONTENT SCROLLER
      ═══════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1800px] w-full mx-auto">

        {/* ─────────────────────────────────────────────────────────────────
            TOP MODE TOGGLE BAR: RACE CONTROL vs FUTURE SCHEDULE & CAPACITY
        ───────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#070B1E] p-2 rounded-2xl border border-white/10 shadow-lg">
          <div className="flex items-center gap-1.5 bg-[#050816] p-1 rounded-xl border border-white/10 w-full sm:w-auto">
            <button
              onClick={() => setMainViewMode('RACE_CONTROL')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-mono font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mainViewMode === 'RACE_CONTROL'
                  ? 'bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] shadow-[0_0_20px_rgba(20,241,217,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flag className="w-4 h-4" />
              <span>LIVE RACE CONTROL</span>
            </button>
            <button
              onClick={() => setMainViewMode('FUTURE_SCHEDULE')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-mono font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mainViewMode === 'FUTURE_SCHEDULE'
                  ? 'bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] shadow-[0_0_20px_rgba(20,241,217,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>FUTURE DATES & SLOT CAPACITY</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 px-2">
            <span className="w-2 h-2 rounded-full bg-[#14F1D9] animate-pulse" />
            <span>Track Max Capacity: <strong className="text-white">50 Rides / Hour (Per Slot)</strong></span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════
            VIEW 1: LIVE RACE CONTROL & ALLOTMENT
        ═════════════════════════════════════════════════════════════════════ */}
        {mainViewMode === 'RACE_CONTROL' && (
          <>
            {/* ═════════════════════════════════════════════════════════════════
                3. SUMMARY ROW (6 COMPACT HORIZONTAL CARDS)
            ═════════════════════════════════════════════════════════════════ */}
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          
          {/* Card 1: PENDING */}
          <div 
            onClick={() => setQueueFilter('PENDING')}
            className={`p-3 rounded-2xl bg-[#0B1124] border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-between ${
              queueFilter === 'PENDING' ? 'border-amber-400/60 ring-1 ring-amber-400/30' : 'border-white/10 hover:border-amber-400/30'
            }`}
          >
            <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
              <span>PENDING</span>
              <Clock className="w-3.5 h-3.5 opacity-80" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {summaryCounts.pending}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Awaiting Check-in</span>
            </div>
          </div>

          {/* Card 2: CHECK-IN */}
          <div 
            onClick={() => setQueueFilter('CHECKED_IN')}
            className={`p-3 rounded-2xl bg-[#0B1124] border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-between ${
              queueFilter === 'CHECKED_IN' ? 'border-sky-400/60 ring-1 ring-sky-400/30' : 'border-white/10 hover:border-sky-400/30'
            }`}
          >
            <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400">
              <span>CHECK-IN</span>
              <UserCheck className="w-3.5 h-3.5 opacity-80" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {summaryCounts.checkedIn}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Ready for Kart</span>
            </div>
          </div>

          {/* Card 3: AVAILABLE */}
          <div 
            onClick={() => setKartFilter('AVAILABLE')}
            className={`p-3 rounded-2xl bg-[#0B1124] border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-between ${
              kartFilter === 'AVAILABLE' ? 'border-emerald-400/60 ring-1 ring-emerald-400/30' : 'border-white/10 hover:border-emerald-400/30'
            }`}
          >
            <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
              <span>AVAILABLE</span>
              <Car className="w-3.5 h-3.5 opacity-80" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 tracking-tight">
                {summaryCounts.available}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Fleet Ready</span>
            </div>
          </div>

          {/* Card 4: ASSIGNED */}
          <div 
            onClick={() => setKartFilter('ASSIGNED')}
            className={`p-3 rounded-2xl bg-[#0B1124] border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-between ${
              kartFilter === 'ASSIGNED' ? 'border-blue-400/60 ring-1 ring-blue-400/30' : 'border-white/10 hover:border-blue-400/30'
            }`}
          >
            <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">
              <span>ASSIGNED</span>
              <Flag className="w-3.5 h-3.5 opacity-80" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {summaryCounts.assigned}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Grid Staged</span>
            </div>
          </div>

          {/* Card 5: LIVE */}
          <div 
            onClick={() => setKartFilter('RACING')}
            className={`p-3 rounded-2xl bg-[#0B1124] border transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-between ${
              kartFilter === 'RACING' ? 'border-orange-500/60 ring-1 ring-orange-500/30' : 'border-white/10 hover:border-orange-500/30'
            }`}
          >
            <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                LIVE
              </span>
              <Zap className="w-3.5 h-3.5 opacity-80 text-orange-400" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black font-mono text-orange-400 tracking-tight">
                {summaryCounts.live}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Active Session</span>
            </div>
          </div>

          {/* Card 6: COMPLETED */}
          <div 
            onClick={() => { setQueueFilter('ALL'); setKartFilter('ALL'); }}
            className="p-3 rounded-2xl bg-[#0B1124] border border-white/10 transition-all cursor-pointer hover:scale-[1.02] hover:border-emerald-400/30 flex flex-col justify-between"
          >
            <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400">
              <span>COMPLETED</span>
              <CheckCircle2 className="w-3.5 h-3.5 opacity-80" />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {summaryCounts.completed}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase">Today's Races</span>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════════
            4. MAIN OPERATIONAL AREA (60/40 SPLIT)
        ═════════════════════════════════════════════════════════════════════ */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ─────────────────────────────────────────────────────────────────
              5 & 6. LEFT PANEL — CUSTOMER / RIDER QUEUE (60% -> 7 Cols)
          ───────────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 rounded-3xl bg-[#090E20] border border-[#00ABAB]/30 p-4 sm:p-5 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
            
            {/* Header & Filter Pills */}
            <div className="flex flex-col gap-3 pb-3 border-b border-white/10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#14F1D9]" />
                  <h2 className="text-base font-black text-white uppercase tracking-tight font-sans">
                    RIDER QUEUE
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#14F1D9]/10 text-[#14F1D9] border border-[#14F1D9]/30">
                    {filteredRiders.length} ACTIVE
                  </span>
                </div>

                {/* Booking Source Tabs (Online vs Ticketing Counter) */}
                <div className="flex items-center gap-1 bg-[#050816] p-1 rounded-xl border border-white/10 text-[9px] font-mono font-bold uppercase">
                  <button
                    onClick={() => setQueueSourceFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      queueSourceFilter === 'ALL'
                        ? 'bg-[#14F1D9] text-[#050816] font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ALL ({riders.filter(r => r.status !== 'completed').length})
                  </button>
                  <button
                    onClick={() => setQueueSourceFilter('ONLINE')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      queueSourceFilter === 'ONLINE'
                        ? 'bg-[#00B4FF] text-[#050816] font-black'
                        : 'text-sky-400 hover:text-sky-300'
                    }`}
                  >
                    <span>🌐 ONLINE</span>
                    <span>({riders.filter(r => r.status !== 'completed' && r.bookingSource !== 'walk_in').length})</span>
                  </button>
                  <button
                    onClick={() => setQueueSourceFilter('WALK_IN')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      queueSourceFilter === 'WALK_IN'
                        ? 'bg-purple-500 text-white font-black'
                        : 'text-purple-400 hover:text-purple-300'
                    }`}
                    title="Tickets issued at Ticketing Counter"
                  >
                    <span>🎟️ COUNTER TICKET</span>
                    <span>({riders.filter(r => r.status !== 'completed' && r.bookingSource === 'walk_in').length})</span>
                  </button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="flex items-center gap-1 bg-[#050816] p-1 rounded-xl border border-white/10 text-[9px] font-mono font-bold uppercase">
                  {(['ALL', 'PENDING', 'CHECKED_IN', 'READY'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setQueueFilter(tab)}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        queueFilter === tab
                          ? 'bg-[#14F1D9] text-[#050816] font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Showing {filteredRiders.length} of {riders.filter(r => r.status !== 'completed').length} staged tickets
                </div>
              </div>
            </div>

            {/* Top Action Bar: [📷 SCAN TICKET / QR] & [🔍 SEARCH COUNTER / ONLINE TICKET] */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              
              {/* Primary Action: SCAN TICKET / QR */}
              <button
                onClick={() => setShowQrModal(true)}
                className="sm:col-span-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(20,241,217,0.35)] cursor-pointer"
                title="Scan QR Ticket or Barcode from Counter / Online"
              >
                <QrCode className="w-4 h-4" />
                <span>SCAN TICKET / QR</span>
              </button>

              {/* Search Bar for Ticket ID / Customer / Booking */}
              <div className="sm:col-span-8 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter Ticket ID (e.g. GK-10025, TCK-...), Name, or Mobile..."
                  value={queueSearch}
                  onChange={e => setQueueSearch(e.target.value)}
                  className="w-full bg-[#050816] border border-white/15 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:border-[#14F1D9] focus:outline-none transition-all"
                />
                {queueSearch && (
                  <button
                    onClick={() => setQueueSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Compact Rider Cards List */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredRiders.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/10 rounded-2xl bg-[#050816]/50">
                  <UserCheck className="w-10 h-10 mb-2 opacity-30 text-[#14F1D9]" />
                  <p className="text-sm font-bold text-slate-300">No Tickets in this Queue Filter</p>
                  <p className="text-[11px] text-slate-500 font-mono mt-1 text-center max-w-md">
                    All bookings are issued exclusively at the Ticketing Counter or Online. Scan a ticket QR or enter Ticket ID above to load.
                  </p>
                </div>
              ) : (
                filteredRiders.map(rider => {
                  const isPending = rider.status === 'pending';
                  const isCheckedIn = rider.status === 'checked_in';
                  const isReady = rider.status === 'ready_to_race' || rider.status === 'kart_assigned';
                  const isRacing = rider.status === 'racing';
                  const isCounter = rider.bookingSource === 'walk_in';

                  return (
                    <div
                      key={rider.id}
                      className={`p-3.5 rounded-2xl bg-[#050816] border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-[#14F1D9]/40 ${
                        isReady ? 'border-emerald-500/40 bg-emerald-950/10' :
                        isCheckedIn ? 'border-sky-500/40 bg-sky-950/10' :
                        isRacing ? 'border-orange-500/40 bg-orange-950/10' :
                        'border-white/10'
                      }`}
                    >
                      {/* Left: Info */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono font-black text-[#14F1D9] bg-[#14F1D9]/10 px-2 py-0.5 rounded border border-[#14F1D9]/20">
                            {rider.ticketId}
                          </span>

                          {/* Channel Badge: Online vs Ticket Counter */}
                          {isCounter ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              🎟️ COUNTER TICKET
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              🌐 ONLINE BOOKING
                            </span>
                          )}

                          <span className="font-bold text-white text-sm truncate">
                            {rider.riderName || <span className="text-slate-500 italic">Co-Pilot Name TBD</span>}
                          </span>

                          {/* Status Badge */}
                          {isPending && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30">
                              🟡 PENDING
                            </span>
                          )}
                          {isCheckedIn && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-sky-400/10 text-sky-400 border border-sky-400/30">
                              🔵 CHECKED IN
                            </span>
                          )}
                          {isReady && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/30">
                              🟢 READY
                            </span>
                          )}
                          {isRacing && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-orange-400/10 text-orange-400 border border-orange-400/30 animate-pulse">
                              🔴 RACING
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400 flex-wrap">
                          {rider.isDualKart ? (
                            <span className="text-purple-400 font-bold">2 Riders (Dual Kart)</span>
                          ) : (
                            <span>1 Rider</span>
                          )}
                          <span>·</span>
                          <span>{rider.sessionDuration} Min Session</span>
                          <span>·</span>
                          <span>{isCounter ? 'Ticket Counter' : 'Online Pre-Paid'}</span>
                          {rider.assignedKartNumber && (
                            <>
                              <span>·</span>
                              <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">
                                Kart #{rider.assignedKartNumber}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Operational Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isPending && (
                          <button
                            onClick={() => {
                              setCheckInRider(rider);
                              setRider2CoPilotName('');
                            }}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#050816] font-black text-[11px] font-mono uppercase tracking-wider transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] cursor-pointer flex items-center gap-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>CHECK IN</span>
                          </button>
                        )}

                        {isCheckedIn && (
                          <button
                            onClick={() => {
                              setAssignKartRider(rider);
                              setSelectedAssignKart(null);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-[#14F1D9] hover:bg-[#00B4FF] text-[#050816] font-black text-[11px] font-mono uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(20,241,217,0.3)] cursor-pointer flex items-center gap-1.5"
                          >
                            <Car className="w-3.5 h-3.5" />
                            <span>ASSIGN KART</span>
                          </button>
                        )}

                        {isReady && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setChangeKartRider(rider);
                                setSelectedNewKart(null);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-mono font-bold uppercase border border-white/10 transition-all cursor-pointer flex items-center gap-1"
                              title="Reassign to another available kart"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>CHANGE</span>
                            </button>
                            <button
                              onClick={handleStartRaceSession}
                              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-[#050816] font-black text-[11px] font-mono uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] cursor-pointer flex items-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5 fill-[#050816]" />
                              <span>START RACE</span>
                            </button>
                          </div>
                        )}

                        {isRacing && (
                          <span className="text-[10px] font-mono text-orange-400 font-bold px-2 py-1 bg-orange-500/10 rounded-lg border border-orange-500/20">
                            ON TRACK
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              7 & 8. RIGHT PANEL — KART STATUS (40% -> 5 Cols)
          ───────────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-5 rounded-3xl bg-[#090E20] border border-[#00ABAB]/30 p-4 sm:p-5 space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
            
            {/* Header & Filter Pills */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-[#14F1D9]" />
                <h2 className="text-base font-black text-white uppercase tracking-tight font-sans">
                  KART STATUS
                </h2>
                <span className="text-[10px] font-mono text-slate-400">
                  (15 KARTS FLEET)
                </span>
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1 bg-[#050816] p-1 rounded-xl border border-white/10 text-[8px] font-mono font-bold uppercase flex-wrap">
                {(['ALL', 'AVAILABLE', 'ASSIGNED', 'RACING', 'MAINTENANCE'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setKartFilter(tab)}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      kartFilter === tab
                        ? 'bg-[#14F1D9] text-[#050816] font-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* 3-Column Kart Grid (2-col on small screen) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredKarts.map(kart => {
                const effStatus = getKartStatus(kart);
                const occupant = getKartOccupant(kart);

                // Color tokens per specification:
                // 🟢 Available, 🔵 Assigned, 🔴 Racing, 🟠 Maintenance, ⚪ Unavailable
                const isAvailable = effStatus === 'Available';
                const isAssigned = effStatus === 'Reserved';
                const isRacing = effStatus === 'On Track';
                const isMaint = effStatus === 'Maintenance';
                const isOut = effStatus === 'Out of Service';

                const statusColor = 
                  isAvailable ? 'text-emerald-400' :
                  isAssigned ? 'text-sky-400' :
                  isRacing ? 'text-rose-500' :
                  isMaint ? 'text-amber-400' :
                  'text-slate-400';

                const statusDot = 
                  isAvailable ? '🟢' :
                  isAssigned ? '🔵' :
                  isRacing ? '🔴' :
                  isMaint ? '🟠' :
                  '⚪';

                const statusLabel = 
                  isAvailable ? 'AVAILABLE' :
                  isAssigned ? 'ASSIGNED' :
                  isRacing ? 'RACING' :
                  isMaint ? 'MAINTENANCE' :
                  'UNAVAILABLE';

                const tr = getKartTransponder(kart.kartNumber);

                return (
                  <div
                    key={kart.id}
                    className={`p-3 rounded-2xl bg-[#050816] border transition-all flex flex-col justify-between gap-1.5 hover:scale-[1.02] ${
                      isAvailable ? 'border-emerald-500/20 hover:border-emerald-500/50' :
                      isAssigned ? 'border-sky-500/30 bg-sky-950/10' :
                      isRacing ? 'border-rose-500/40 bg-rose-950/15 shadow-[0_0_15px_rgba(244,63,94,0.15)]' :
                      isMaint ? 'border-amber-500/20 opacity-75' :
                      'border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">KART</span>
                      <span className="text-xs">{statusDot}</span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <div className="text-2xl font-black font-mono text-white tracking-tight">
                        K{kart.kartNumber}
                      </div>

                      {/* Transponder Chip on Kart */}
                      {tr && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTransponder(tr);
                            setShowTransponderModal(true);
                          }}
                          className="flex items-center gap-1 text-[8px] font-mono bg-purple-500/15 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 hover:bg-purple-500/30 cursor-pointer"
                          title={`Transponder ${tr.id} (${tr.hardwareCode}) · ${tr.batteryLevel}% Battery · Click to Inspect`}
                        >
                          <Radio className="w-2.5 h-2.5 text-purple-400" />
                          <span>{tr.id}</span>
                          <span className="text-slate-400 font-normal">({tr.batteryLevel}%)</span>
                        </div>
                      )}
                    </div>

                    <div className={`text-[9px] font-mono font-bold uppercase tracking-wider ${statusColor}`}>
                      {statusLabel}
                    </div>

                    {/* Assigned Rider / Race Info */}
                    {occupant && (
                      <div className="pt-1.5 mt-0.5 border-t border-white/5 text-[9px] font-mono text-slate-300 truncate">
                        <span className="text-[#14F1D9] font-bold">R:</span> {occupant.riderName.split(' ')[0]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Kart Status & Transponder Legend */}
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 pt-2 border-t border-white/10 px-1 flex-wrap gap-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1">🟢 Avail</span>
                <span className="flex items-center gap-1">🔵 Assign</span>
                <span className="flex items-center gap-1">🔴 Race</span>
              </div>
              <button
                onClick={() => setShowTransponderModal(true)}
                className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Radio className="w-2.5 h-2.5" />
                <span>15 Transponders Linked &rarr;</span>
              </button>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════════
            9 - 15. LIVE RACE AREA (BELOW OPERATIONAL AREA)
        ═════════════════════════════════════════════════════════════════════ */}
        {isRaceLive && !raceFinished && (
          <section className="rounded-3xl bg-[#090E20] border-2 border-rose-500/40 p-4 sm:p-6 space-y-5 shadow-[0_0_40px_rgba(244,63,94,0.15)] animate-fade-in">
            
            {/* 9. Live Race Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-rose-500/30">
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono font-black text-xs uppercase tracking-wider animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <span>LIVE RACE</span>
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-sans flex items-center gap-2">
                    <span>RACE #{raceNumber}</span>
                    <span className="text-slate-500 font-normal">·</span>
                    <span className="text-[#14F1D9]">{DEFAULT_TRACK_NAME}</span>
                  </h2>
                  <p className="text-[10px] font-mono text-slate-400 uppercase">
                    10 LAP SPRINT HEAT · TRACK SURFACE DRY (34°C)
                  </p>
                </div>
              </div>

              {/* 12. Race Timer & Lap Information */}
              <div className="flex items-center gap-6 bg-[#050816] px-5 py-2.5 rounded-2xl border border-white/10">
                <div>
                  <div className="text-3xl sm:text-4xl font-black font-mono text-[#14F1D9] tracking-wider leading-none">
                    {fmtMMSS(raceElapsedSec)}
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 uppercase mt-0.5">
                    of {fmtMMSS(SESSION_SECONDS)}
                  </div>
                </div>

                <div className="h-9 w-px bg-white/10" />

                <div>
                  <div className="text-xl sm:text-2xl font-black font-mono text-white leading-none">
                    {liveRacers[0]?.currentLap || 7} / {TOTAL_RACE_LAPS}
                  </div>
                  <div className="text-[9px] font-mono text-[#40E0D0] uppercase font-bold mt-0.5">
                    LEAD LAPS
                  </div>
                </div>
              </div>
            </div>

            {/* ── TRANSPONDER DECODER LOOP STATUS BAR ───────────────────────── */}
            <div className="p-3 rounded-2xl bg-[#050816] border border-purple-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-2.5 text-xs font-mono">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  MYLAPS X2 DECODER ONLINE (1000 Hz)
                </span>
                <span className="text-slate-400 text-[11px]">
                  Host: <strong className="text-slate-200">{decoderHost}</strong>
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-purple-300 text-[11px]">
                  Loops: <strong>Loop 1 (Finish)</strong> · <strong>Loop 2 (S1)</strong> · <strong>Loop 3 (Pit)</strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-[10px] text-[#14F1D9] font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-ping text-[#14F1D9]" />
                  <span>{lastPassingNotice}</span>
                </div>
                <button
                  onClick={() => setShowTransponderModal(true)}
                  className="px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white text-[10px] font-bold border border-purple-500/40 cursor-pointer"
                >
                  TRANSPONDER RACK &rarr;
                </button>
              </div>
            </div>

            {/* 10. Live Race 2-Column Layout (55% / 45%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              
              {/* LEFT — 55% (7 Cols) -> Track Map Visualization */}
              <div className="lg:col-span-7 rounded-2xl bg-[#050816] border border-white/10 p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden">
                
                <div className="flex justify-between items-center mb-2 z-10">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#14F1D9]" />
                    <span className="text-xs font-black font-mono text-white uppercase tracking-wider">
                      CIRCUIT TELEMETRY MAP
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    TRANSPONDER SECTOR LOOPS ACTIVE
                  </span>
                </div>

                {/* SVG Circuit Diagram with Animated Gliding Karts */}
                <div className="relative w-full h-[240px] sm:h-[280px] flex items-center justify-center my-2">
                  <svg viewBox="0 0 500 240" className="w-full h-full drop-shadow-[0_0_20px_rgba(20,241,217,0.15)]">
                    {/* Track Circuit Path */}
                    <path
                      d="M 80,60 C 140,20 280,20 380,50 C 460,70 470,160 390,190 C 310,220 220,170 160,200 C 100,230 40,180 50,120 C 55,80 60,70 80,60 Z"
                      fill="none"
                      stroke="#0B132B"
                      strokeWidth="32"
                      strokeLinecap="round"
                    />
                    {/* Inner Track Line */}
                    <path
                      d="M 80,60 C 140,20 280,20 380,50 C 460,70 470,160 390,190 C 310,220 220,170 160,200 C 100,230 40,180 50,120 C 55,80 60,70 80,60 Z"
                      fill="none"
                      stroke="#14F1D9"
                      strokeWidth="4"
                      strokeDasharray="6 6"
                      strokeOpacity="0.4"
                    />

                    {/* Start/Finish Line */}
                    <line x1="70" y1="45" x2="90" y2="75" stroke="#FFFFFF" strokeWidth="4" />
                    <text x="50" y="40" fill="#14F1D9" fontSize="9" fontFamily="monospace" fontWeight="bold">
                      START / FINISH LOOP
                    </text>

                    {/* Sector Markers */}
                    <text x="360" y="30" fill="#A855F7" fontSize="8" fontFamily="monospace" fontWeight="bold">LOOP 2 (S1)</text>
                    <text x="420" y="215" fill="#64748B" fontSize="8" fontFamily="monospace">SECTOR 2</text>
                    <text x="140" y="225" fill="#A855F7" fontSize="8" fontFamily="monospace" fontWeight="bold">LOOP 3 (PIT)</text>

                    {/* Kart Markers on Track */}
                    {/* Lead Kart: K05 (John) */}
                    <g transform="translate(340, 40)">
                      <circle r="14" fill="#050816" stroke="#14F1D9" strokeWidth="2.5" />
                      <text x="0" y="3" textAnchor="middle" fill="#14F1D9" fontSize="9" fontFamily="monospace" fontWeight="900">
                        K05
                      </text>
                    </g>

                    {/* P2 Kart: K07 (Alex) */}
                    <g transform="translate(420, 140)">
                      <circle r="13" fill="#050816" stroke="#00B4FF" strokeWidth="2" />
                      <text x="0" y="3" textAnchor="middle" fill="#00B4FF" fontSize="9" fontFamily="monospace" fontWeight="900">
                        K07
                      </text>
                    </g>

                    {/* P3 Kart: K03 (Sam) */}
                    <g transform="translate(160, 190)">
                      <circle r="13" fill="#050816" stroke="#F59E0B" strokeWidth="2" />
                      <text x="0" y="3" textAnchor="middle" fill="#F59E0B" fontSize="9" fontFamily="monospace" fontWeight="900">
                        K03
                      </text>
                    </g>
                  </svg>
                </div>

                {/* Track Footer Note */}
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 pt-2 border-t border-white/5">
                  <span>RFID Transponder High-Frequency Telemetry Sync (.001s Accuracy)</span>
                  <span className="text-[#14F1D9]">3 Karts Active On-Track</span>
                </div>
              </div>

              {/* RIGHT — 45% (5 Cols) -> 11. Live Leaderboard */}
              <div className="lg:col-span-5 rounded-2xl bg-[#050816] border border-white/10 p-4 sm:p-5 flex flex-col justify-between space-y-3">
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black font-mono text-white uppercase tracking-wider">
                      LIVE LEADERBOARD (TRANSPONDER TIMING)
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    MILLISEC ACCURACY
                  </span>
                </div>

                {/* Classification Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                        <th className="pb-2">POS</th>
                        <th className="pb-2">RIDER</th>
                        <th className="pb-2">KART / TR</th>
                        <th className="pb-2">LAP</th>
                        <th className="pb-2">LAST LAP</th>
                        <th className="pb-2">BEST LAP</th>
                        <th className="pb-2 text-right">GAP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {liveRacers.map((racer, index) => {
                        const isP1 = index === 0;
                        const isP2 = index === 1;
                        const isP3 = index === 2;

                        const posBadge = 
                          isP1 ? '🥇' :
                          isP2 ? '🥈' :
                          isP3 ? '🥉' :
                          `#${index + 1}`;

                        return (
                          <tr key={racer.riderId} className={`hover:bg-white/5 transition-colors ${isP1 ? 'text-amber-300 font-bold' : 'text-slate-200'}`}>
                            <td className="py-2.5 font-black text-sm">{posBadge}</td>
                            <td className="py-2.5 font-bold uppercase truncate max-w-[95px]">
                              {racer.riderName}
                            </td>
                            <td className="py-2.5">
                              <div className="flex items-center gap-1">
                                <span className="font-black text-[#14F1D9]">K{racer.kartNumber}</span>
                                <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded border border-purple-500/30">
                                  {racer.transponderId}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 text-slate-300">
                              {racer.currentLap}/{racer.totalLaps}
                            </td>
                            <td className="py-2.5 text-slate-400">
                              {racer.lastLapTime.toFixed(3)}s
                            </td>
                            <td className={`py-2.5 font-black ${isP1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {racer.bestLapTime.toFixed(3)}s
                            </td>
                            <td className="py-2.5 text-right text-slate-400 font-bold">
                              {racer.gap}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Best Lap Highlight Banner */}
                {overallBestLap && (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs font-mono">
                    <span className="text-purple-300 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      TRANSPONDER BEST LAP
                    </span>
                    <span className="text-white font-black">
                      K{overallBestLap.kartNumber} ({overallBestLap.transponderId}) · {overallBestLap.riderName} — <span className="text-purple-400">{overallBestLap.bestLapTime.toFixed(3)}s</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 13. Race Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              
              {/* Flag Safety Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRacePaused(p => !p)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                    isRacePaused 
                      ? 'bg-amber-400 text-[#050816] shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                  }`}
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{isRacePaused ? 'RESUME RACE (GREEN FLAG)' : 'PAUSE / YELLOW FLAG'}</span>
                </button>
              </div>

              {/* Main Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRaceDetailsModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-bold uppercase border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>RACE DETAILS</span>
                </button>

                <button
                  onClick={() => setShowCompleteConfirmModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-90 text-[#050816] text-xs font-mono font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>COMPLETE RACE</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            14. RACE COMPLETION SCREEN
        ═════════════════════════════════════════════════════════════════════ */}
        {raceFinished && (
          <section className="rounded-3xl bg-[#090E20] border-2 border-emerald-500/50 p-6 space-y-6 shadow-[0_0_50px_rgba(16,185,129,0.2)] animate-fade-in text-center">
            
            <div className="max-w-xl mx-auto space-y-2">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight font-sans">
                🏁 RACE COMPLETE
              </h2>
              <p className="text-xs font-mono text-[#14F1D9] uppercase font-bold tracking-widest">
                OFFICIAL CLASSIFICATION · RACE #{raceNumber}
              </p>
            </div>

            {/* Results Table */}
            <div className="max-w-3xl mx-auto overflow-x-auto rounded-2xl border border-white/10 bg-[#050816] p-4">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-[10px] uppercase">
                    <th className="pb-2">POS</th>
                    <th className="pb-2">RIDER</th>
                    <th className="pb-2">KART</th>
                    <th className="pb-2">LAPS</th>
                    <th className="pb-2">BEST LAP</th>
                    <th className="pb-2 text-right">TOTAL TIME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {completedResults.map((r, i) => (
                    <tr key={r.riderId} className="hover:bg-white/5">
                      <td className="py-2.5 font-black text-sm">
                        {i === 0 ? '🥇 1st' : i === 1 ? '🥈 2nd' : i === 2 ? '🥉 3rd' : `#${i + 1}`}
                      </td>
                      <td className="py-2.5 font-bold text-white uppercase">{r.riderName}</td>
                      <td className="py-2.5 font-black text-[#14F1D9]">K{r.kartNumber}</td>
                      <td className="py-2.5 text-slate-300">{r.totalLaps}</td>
                      <td className="py-2.5 font-black text-emerald-400">{r.bestLapTime.toFixed(2)}s</td>
                      <td className="py-2.5 text-right font-bold text-slate-200">06:52.40</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Completion Buttons */}
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={handleNextRaceReady}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(20,241,217,0.3)] cursor-pointer flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                <span>NEXT RACE</span>
              </button>
              <button
                onClick={() => setShowRaceDetailsModal(true)}
                className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs font-mono uppercase border border-white/10 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>VIEW RESULT / EXPORT</span>
              </button>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════════
            15. EMPTY STATE (WHEN NO ACTIVE RACE)
        ═════════════════════════════════════════════════════════════════════ */}
        {!isRaceLive && !raceFinished && (
          <section className="rounded-3xl bg-[#090E20] border border-white/10 p-6 sm:p-8 text-center space-y-4 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-2xl">
              🏁
            </div>
            
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-sans">
                NO LIVE RACE
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Ready for the next session · Grid telemetry standby
              </p>
            </div>

            <div className="inline-flex items-center gap-4 px-4 py-2 rounded-2xl bg-[#050816] border border-white/10 text-xs font-mono">
              <span>Next Ready Race: <strong className="text-[#14F1D9]">#{String(parseInt(raceNumber) + 1).padStart(3, '0')}</strong></span>
              <span>·</span>
              <span>
                <strong className="text-emerald-400">{riders.filter(r => r.status === 'ready_to_race').length}</strong> Riders Ready
              </span>
            </div>

            <div>
              <button
                onClick={handleStartRaceSession}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_25px_rgba(20,241,217,0.4)] cursor-pointer inline-flex items-center gap-2"
              >
                <Play className="w-4 h-4 fill-[#050816]" />
                <span>START NEXT RACE</span>
              </button>
            </div>
          </section>
        )}
      </>
    )}

    {/* ═════════════════════════════════════════════════════════════════════
        VIEW 2: FUTURE DATES & NEXT SLOT CAPACITY DASHBOARD
    ═════════════════════════════════════════════════════════════════════ */}
    {mainViewMode === 'FUTURE_SCHEDULE' && (
      <section className="space-y-6 animate-fade-in">
        
        {/* ── 1. DATE PICKER & 7-DAY QUICK BAR ───────────────────────── */}
        <div className="rounded-3xl bg-[#090E20] border border-[#00ABAB]/30 p-5 space-y-4 shadow-2xl">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#14F1D9]" />
                <h2 className="text-lg font-black text-white uppercase tracking-tight font-sans">
                  FUTURE DATES & HEAT CAPACITY SCHEDULER
                </h2>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Inspect future date advance bookings, monitor sold-out slots, and track hourly heat availability.
              </p>
            </div>

            {/* Custom Date Input */}
            <div className="flex items-center gap-2 bg-[#050816] p-1.5 rounded-2xl border border-white/10">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase pl-2">Select Date:</span>
              <input
                type="date"
                value={selectedScheduleDate}
                onChange={e => setSelectedScheduleDate(e.target.value)}
                className="bg-[#090E20] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:border-[#14F1D9] focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* Quick Date Pills for the Next 7 Days */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Upcoming 7-Day Quick Select:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
                const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const isSelected = selectedScheduleDate === dateStr;

                // Mock dynamic driver loads per day for realistic forecast
                const bookedDrivers = i === 0 ? 28 : i === 1 ? 42 : i === 2 ? 36 : i === 5 || i === 6 ? 64 : 22 + i * 4;
                const isHeavy = bookedDrivers >= 50;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedScheduleDate(dateStr)}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 hover:scale-[1.02] ${
                      isSelected
                        ? 'bg-[#14F1D9] text-[#050816] border-[#14F1D9] shadow-[0_0_20px_rgba(20,241,217,0.3)] font-black'
                        : 'bg-[#050816] border-white/10 text-white hover:border-[#14F1D9]/40'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-mono font-bold uppercase">
                      <span>{dayName}</span>
                      {isHeavy && !isSelected && (
                        <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1 py-0.5 rounded border border-rose-500/30">
                          PEAK
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black font-mono">
                      {monthDay}
                    </div>
                    <div className={`text-[9px] font-mono ${isSelected ? 'text-[#050816]/80' : 'text-slate-400'}`}>
                      {bookedDrivers} Drivers
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 2. SELECTED DATE METRICS ROW ───────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-[#090E20] border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Advance Bookings</span>
            <div className="mt-2 text-3xl font-black font-mono text-white">
              {bookings.filter(b => b.date === selectedScheduleDate && (b.activityId === 'act-go-karting' || b.activityName?.toLowerCase().includes('kart'))).length + 24}
            </div>
            <span className="text-[9px] font-mono text-slate-500">Confirmed on {selectedScheduleDate}</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#090E20] border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Total Rides Scheduled</span>
            <div className="mt-2 text-3xl font-black font-mono text-[#14F1D9]">
              142 <span className="text-xs font-normal text-slate-400">/ 600 Max Day (50/Hr)</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400">50 Rides Max Capacity Per Slot</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#090E20] border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Peak Utilization</span>
            <div className="mt-2 text-3xl font-black font-mono text-amber-400">
              72%
            </div>
            <span className="text-[9px] font-mono text-amber-400">Prime Hours 02:00 PM – 07:00 PM</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#090E20] border border-white/10 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Slot Availability Status</span>
            <div className="mt-2 text-sm font-mono font-black space-y-0.5">
              <div className="text-emerald-400">🟢 7 Slots Open (&lt;35)</div>
              <div className="text-amber-400">🟠 3 Slots Limited (35–49)</div>
              <div className="text-rose-400">🔴 2 Slots SOLD OUT (50/50)</div>
            </div>
          </div>
        </div>

        {/* ── 3. HOURLY HEAT SLOTS & CAPACITY MATRIX (SUPER ADMIN ALTERABLE) ─── */}
        <div className="rounded-3xl bg-[#090E20] border border-[#00ABAB]/30 p-5 space-y-4 shadow-2xl">
          
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 pb-3 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-[#14F1D9]" />
                <h3 className="text-base font-black text-white uppercase tracking-tight font-sans">
                  HOURLY SLOT CAPACITY & DRIVER ROSTER — {selectedScheduleDate}
                </h3>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Default: <strong className="text-white">{defaultSlotCapacity} Rides/Hr</strong> · Price: <strong className="text-[#14F1D9]">₹{defaultPricePerKart}/Kart</strong> · Super Admin can alter any slot capacity & schedule.
              </p>
            </div>

            {/* Super Admin & Staff Alteration Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setTempDefaultCap(defaultSlotCapacity);
                  setTempDefaultPrice(defaultPricePerKart);
                  setShowGlobalAlterModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
                title="Alter Default Capacity & Pricing for All Slots"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>ALTER CAPACITY</span>
              </button>

              <button
                onClick={() => setShowAddSlotModal(true)}
                className="px-3 py-1.5 rounded-xl bg-[#14F1D9]/20 hover:bg-[#14F1D9]/30 border border-[#14F1D9]/40 text-[#14F1D9] hover:text-white text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
                title="Add a New Race Slot to the Daily Schedule"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ ADD SLOT</span>
              </button>

              <button
                onClick={handleResetScheduleToDefault}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white text-xs font-mono transition-all cursor-pointer"
                title="Reset Schedule to Standard 12 Slots"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Status Indicator Legend */}
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-400 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">🟢 &lt;{Math.round(defaultSlotCapacity * 0.7)} Booked (Open)</span>
              <span className="flex items-center gap-1">🟠 {Math.round(defaultSlotCapacity * 0.7)}–{defaultSlotCapacity - 1} Booked (Limited)</span>
              <span className="flex items-center gap-1">🔴 {defaultSlotCapacity}/{defaultSlotCapacity} (Sold Out)</span>
            </div>
            <span className="text-slate-500">{scheduleSlots.length} Scheduled Heats</span>
          </div>

          {/* Grid of Dynamic Alterable Slot Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {scheduleSlots.map(heat => {
              const maxCap = heat.capacity || defaultSlotCapacity;
              const isBlocked = heat.status === 'blocked';
              const isMaintenance = heat.status === 'maintenance';
              const isSoldOut = !isBlocked && !isMaintenance && heat.booked >= maxCap;
              const isLimited = !isBlocked && !isMaintenance && heat.booked >= Math.round(maxCap * 0.7) && heat.booked < maxCap;
              const isOpen = !isBlocked && !isMaintenance && heat.booked < Math.round(maxCap * 0.7);

              const percent = Math.min(100, Math.round((heat.booked / maxCap) * 100));

              return (
                <div
                  key={heat.id}
                  className={`p-4 rounded-2xl bg-[#050816] border transition-all flex flex-col justify-between gap-3 hover:scale-[1.01] ${
                    isBlocked ? 'border-rose-500/30 bg-rose-950/20' :
                    isMaintenance ? 'border-amber-500/30 bg-amber-950/20' :
                    isSoldOut ? 'border-rose-500/40 bg-rose-950/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]' :
                    isLimited ? 'border-amber-500/30 bg-amber-950/10' :
                    'border-white/10 hover:border-emerald-500/30'
                  }`}
                >
                  {/* Heat Header */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-[#14F1D9] font-bold">SLOT #{heat.heatNum}</span>
                        <span className="text-[9px] font-mono text-slate-400">({maxCap}/HR)</span>
                      </div>
                      <div className="text-base font-black font-mono text-white">
                        {heat.slotTime}
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[180px]">
                        {heat.formatTitle}
                      </p>
                    </div>

                    {/* Status Badges & Quick Alter Button */}
                    <div className="flex flex-col items-end gap-1.5">
                      {isBlocked && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> BLOCKED
                        </span>
                      )}
                      {isMaintenance && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5" /> TRACK WORK
                        </span>
                      )}
                      {isSoldOut && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                          🔴 SOLD OUT
                        </span>
                      )}
                      {isLimited && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          🟠 LIMITED ({maxCap - heat.booked} LEFT)
                        </span>
                      )}
                      {isOpen && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          🟢 OPEN ({maxCap - heat.booked} OPEN)
                        </span>
                      )}

                      {/* Alter Slot Trigger */}
                      <button
                        onClick={() => setEditingSlot({ ...heat })}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/40 text-[9px] font-mono text-purple-300 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                        title="Alter Slot Capacity, Timing, or Status"
                      >
                        <Edit2 className="w-2.5 h-2.5" />
                        <span>ALTER</span>
                      </button>
                    </div>
                  </div>

                  {/* Channel Breakdown Pill */}
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                      🌐 {heat.onlineCount} Online
                    </span>
                    <span className="text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                      🚶 {heat.walkInCount} Walk-In
                    </span>
                    <span className="text-[#14F1D9] bg-[#14F1D9]/10 px-2 py-0.5 rounded border border-[#14F1D9]/20 ml-auto">
                      ₹{heat.pricePerKart}/Kart
                    </span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Rides Capacity: <strong className="text-white">{heat.booked} / {maxCap} Rides</strong></span>
                      <span className={isBlocked || isSoldOut ? 'text-rose-400 font-bold' : isLimited ? 'text-amber-400' : 'text-emerald-400'}>
                        {percent}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isBlocked ? 'bg-rose-500/50' :
                          isMaintenance ? 'bg-amber-500/50' :
                          isSoldOut ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]' :
                          isLimited ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b]' :
                          'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Driver Roster Preview */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Scheduled Groups & Drivers:</span>
                    <div className="space-y-1 max-h-16 overflow-y-auto custom-scrollbar pr-1">
                      {heat.drivers.length > 0 ? (
                        heat.drivers.map((drv, dIdx) => (
                          <div key={dIdx} className="text-[11px] font-mono text-slate-300 flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#14F1D9]" />
                            <span className="truncate">{drv}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] font-mono text-slate-500 italic">No bookings staged yet for this slot.</span>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-2 flex justify-between items-center border-t border-white/5 text-[9px] font-mono text-slate-400">
                    <button
                      onClick={() => {
                        setMainViewMode('RACE_CONTROL');
                        setQueueSearch(heat.slotTime);
                      }}
                      className="text-[#14F1D9] hover:underline font-bold cursor-pointer"
                    >
                      View in Track Queue &rarr;
                    </button>

                    {scheduleSlots.length > 1 && (
                      <button
                        onClick={() => handleDeleteSlot(heat.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                        title="Delete this Slot from Schedule"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    )}
  </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 1: SCAN TICKET / QR (COUNTER & ONLINE)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#090E20] border border-[#14F1D9]/40 rounded-3xl p-6 text-white space-y-5 shadow-[0_0_50px_rgba(20,241,217,0.2)]">
            
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#14F1D9]" />
                <div>
                  <h3 className="text-base font-black uppercase text-white font-sans">
                    SCAN TICKET / QR CODE
                  </h3>
                  <p className="text-[10px] font-mono text-[#14F1D9]">Issued via Ticketing Counter / Online Portal</p>
                </div>
              </div>
              <button onClick={() => setShowQrModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Scanner Viewfinder */}
            <div className="relative w-full h-44 rounded-2xl bg-[#050816] border-2 border-dashed border-[#14F1D9]/50 flex flex-col items-center justify-center overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-[#14F1D9] shadow-[0_0_15px_#14F1D9] animate-pulse" />
              <QrCode className="w-14 h-14 text-[#14F1D9]/40 mb-2" />
              <p className="text-xs font-mono text-slate-300">Scan Counter Paper Ticket or Mobile QR</p>
              <p className="text-[10px] font-mono text-slate-500">Auto-identifies ticket ID & loads into Pending queue</p>
            </div>

            {/* Manual Ticket Input */}
            <div className="space-y-2">
              <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                Or Type Counter Ticket # / Booking ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. GK-10025 or TCK-1001"
                  value={manualTicketInput}
                  onChange={e => setManualTicketInput(e.target.value)}
                  className="flex-1 bg-[#050816] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#14F1D9] focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (manualTicketInput.trim()) {
                      handleProcessTicketId(manualTicketInput.trim());
                      setManualTicketInput('');
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-[#14F1D9] text-[#050816] font-black text-xs uppercase font-mono cursor-pointer"
                >
                  LOAD
                </button>
              </div>
            </div>

            {/* Quick Select Preset Tickets */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <p className="text-[9px] font-mono uppercase text-slate-500">Verified Ticketing Counter Passes:</p>
              <div className="flex flex-wrap gap-1.5">
                {tickets.slice(0, 4).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleProcessTicketId(t.id)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#14F1D9]/20 hover:text-[#14F1D9] text-[10px] font-mono text-slate-300 border border-white/10 cursor-pointer transition-all"
                  >
                    {t.id} ({t.customerName.split(' ')[0]})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 2: CHECK-IN MODAL (SINGLE + DUAL KART CO-PILOT)
      ═══════════════════════════════════════════════════════════════════════ */}
      {checkInRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#090E20] border border-amber-500/40 rounded-3xl p-6 text-white space-y-5 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-black uppercase text-amber-400 font-sans">
                  RIDER CHECK-IN
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  Ticket: {checkInRider.ticketId} · Booking: {checkInRider.bookingId}
                </p>
              </div>
              <button onClick={() => setCheckInRider(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rider 1 (Primary — Auto from Ticket) */}
            <div className="p-3.5 rounded-2xl bg-[#050816] border border-white/10 space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-amber-400 uppercase">
                <UserCheck className="w-3.5 h-3.5" />
                <span>RIDER 1 (PRIMARY)</span>
              </div>
              <p className="text-base font-bold text-white">{checkInRider.riderName}</p>
              <p className="text-[10px] font-mono text-slate-500">Auto-filled from verified ticket</p>
            </div>

            {/* Rider 2 (Only for Dual Kart packages — Staff enters co-pilot) */}
            {checkInRider.isDualKart && (
              <div className="p-3.5 rounded-2xl bg-[#050816] border border-purple-500/40 space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-purple-400 uppercase">
                  <Users className="w-3.5 h-3.5" />
                  <span>RIDER 2 (CO-PILOT — DUAL KART)</span>
                </div>
                <input
                  type="text"
                  placeholder="Enter Co-Pilot Name..."
                  value={rider2CoPilotName}
                  onChange={e => setRider2CoPilotName(e.target.value)}
                  className="w-full bg-[#090E20] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
                  autoFocus
                />
                <p className="text-[10px] font-mono text-slate-500">Manual entry for 2nd passenger</p>
              </div>
            )}

            {/* Waiver Confirmation */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Digital liability waiver certified & safety brief completed.</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setCheckInRider(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase font-mono cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleConfirmCheckIn}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#050816] font-black text-xs uppercase font-mono cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.3)]"
              >
                CONFIRM CHECK-IN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 3: ASSIGN KART MODAL (3-COLUMN MATRIX PICKER)
      ═══════════════════════════════════════════════════════════════════════ */}
      {assignKartRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-[#090E20] border border-[#14F1D9]/40 rounded-3xl p-6 text-white space-y-5 shadow-[0_0_50px_rgba(20,241,217,0.2)]">
            
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-black uppercase text-[#14F1D9] font-sans">
                  ASSIGN KART TO DRIVER
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  Rider: <strong className="text-white">{assignKartRider.riderName}</strong> ({assignKartRider.ticketId})
                </p>
              </div>
              <button onClick={() => setAssignKartRider(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-slate-300">
              Select an available kart (🟢) from the 15-kart fleet:
            </p>

            {/* 3-Column Visual Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
              {karts.map(kart => {
                const eff = getKartStatus(kart);
                const isAvail = eff === 'Available';
                const isSelected = selectedAssignKart?.id === kart.id;

                return (
                  <div
                    key={kart.id}
                    onClick={() => isAvail && setSelectedAssignKart(kart)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                      isSelected ? 'border-[#14F1D9] bg-[#14F1D9]/20 shadow-[0_0_20px_rgba(20,241,217,0.4)] scale-105' :
                      isAvail ? 'border-emerald-500/40 bg-emerald-950/10 hover:border-emerald-400 hover:scale-105 cursor-pointer' :
                      'border-white/5 bg-[#050816] opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-[9px] font-mono text-slate-400 uppercase">KART</span>
                    <span className="text-xl font-black font-mono text-white">K{kart.kartNumber}</span>
                    <span className={`text-[8px] font-mono font-bold uppercase ${isAvail ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {isAvail ? '🟢 READY' : eff}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Footer Summary & Confirm */}
            <div className="p-3 rounded-2xl bg-[#050816] border border-white/10 flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400">Selected Kart:</span>
              <span className="text-base font-black text-[#14F1D9]">
                {selectedAssignKart ? `K${selectedAssignKart.kartNumber}` : 'None Selected'}
              </span>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setAssignKartRider(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase font-mono cursor-pointer"
              >
                CANCEL
              </button>
              <button
                disabled={!selectedAssignKart}
                onClick={handleConfirmKartAssign}
                className="flex-1 py-2.5 rounded-xl bg-[#14F1D9] hover:bg-[#00B4FF] text-[#050816] font-black text-xs uppercase font-mono cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(20,241,217,0.3)]"
              >
                CONFIRM ALLOTMENT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 4: CHANGE KART MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {changeKartRider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#090E20] border border-sky-500/40 rounded-3xl p-6 text-white space-y-5 shadow-[0_0_50px_rgba(56,189,248,0.2)]">
            
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-black uppercase text-sky-400 font-sans">
                  CHANGE KART ASSIGNMENT
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  Current: <strong className="text-white">K{changeKartRider.assignedKartNumber}</strong> → Pick new kart
                </p>
              </div>
              <button onClick={() => setChangeKartRider(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {karts.filter(k => k.id !== changeKartRider.assignedKartId).map(kart => {
                const eff = getKartStatus(kart);
                const isAvail = eff === 'Available';
                const isSelected = selectedNewKart?.id === kart.id;

                return (
                  <div
                    key={kart.id}
                    onClick={() => isAvail && setSelectedNewKart(kart)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      isSelected ? 'border-sky-400 bg-sky-500/20' :
                      isAvail ? 'border-emerald-500/40 bg-emerald-950/10 cursor-pointer hover:border-emerald-400' :
                      'border-white/5 opacity-30 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-xl font-black font-mono text-white">K{kart.kartNumber}</span>
                    <span className={`block text-[8px] font-mono font-bold uppercase ${isAvail ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {isAvail ? '🟢 AVAILABLE' : eff}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setChangeKartRider(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase font-mono cursor-pointer"
              >
                CANCEL
              </button>
              <button
                disabled={!selectedNewKart}
                onClick={handleConfirmChangeKart}
                className="flex-1 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-[#050816] font-black text-xs uppercase font-mono cursor-pointer disabled:opacity-30"
              >
                CONFIRM CHANGE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 5: COMPLETE RACE CONFIRMATION
      ═══════════════════════════════════════════════════════════════════════ */}
      {showCompleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-[#090E20] border border-emerald-500/40 rounded-3xl p-6 text-white space-y-4 text-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            
            <h3 className="text-lg font-black uppercase text-white font-sans">
              FINISH RACE #{raceNumber}?
            </h3>
            
            <p className="text-xs font-mono text-slate-300">
              This will record final classification times and automatically release all {liveRacers.length} karts back to AVAILABLE status.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowCompleteConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase font-mono cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleFinishRace}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-[#050816] font-black text-xs uppercase font-mono cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              >
                FINISH & SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 6: RACE DETAILS / TELEMETRY MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showRaceDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-[#090E20] border border-[#14F1D9]/40 rounded-3xl p-6 text-white space-y-5 shadow-[0_0_50px_rgba(20,241,217,0.2)]">
            
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-black uppercase text-[#14F1D9] font-sans">
                  HEAT TELEMETRY AUDIT · RACE #{raceNumber}
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  Track: {DEFAULT_TRACK_NAME} · Marshal: {currentUser?.name || 'Staff'}
                </p>
              </div>
              <button onClick={() => setShowRaceDetailsModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {auditLogs.slice(0, 10).map(log => (
                <div key={log.id} className="p-3 rounded-xl bg-[#050816] border border-white/5 flex justify-between items-center text-xs font-mono">
                  <div>
                    <span className="font-bold text-white">{log.riderName}</span>
                    <span className="text-slate-500"> ({log.ticketId})</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{log.notes || `Action: ${log.action}`}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[#14F1D9] font-bold">K{log.kartNumber}</span>
                    <p className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-6 font-mono">
                  Operational events are recorded live as drivers check in and race.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRaceDetailsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#14F1D9] text-[#050816] font-black text-xs uppercase font-mono cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 7: QUICK TOOLS & EXTERNAL DISPLAYS MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showQuickToolsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-[#090E20] border border-[#14F1D9]/40 rounded-3xl p-6 text-white space-y-5 shadow-[0_0_50px_rgba(20,241,217,0.2)]">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#14F1D9]" />
                <h3 className="text-base font-black uppercase text-white font-sans">
                  QUICK TOOLS & EXTERNAL DISPLAYS
                </h3>
              </div>
              <button onClick={() => setShowQuickToolsModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex flex-wrap gap-1 bg-[#050816] p-1 rounded-xl border border-white/10 text-xs font-mono font-bold uppercase">
              <button
                onClick={() => setQuickToolsTab('displays')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickToolsTab === 'displays' ? 'bg-[#14F1D9] text-[#050816]' : 'text-slate-400 hover:text-white'
                }`}
              >
                📺 External Displays
              </button>
              <button
                onClick={() => setQuickToolsTab('schedule')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickToolsTab === 'schedule' ? 'bg-[#14F1D9] text-[#050816]' : 'text-slate-400 hover:text-white'
                }`}
              >
                📅 Daily Timetable
              </button>
              <button
                onClick={() => setQuickToolsTab('tournaments')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickToolsTab === 'tournaments' ? 'bg-[#14F1D9] text-[#050816]' : 'text-slate-400 hover:text-white'
                }`}
              >
                🏆 Tournaments
              </button>
              <button
                onClick={() => setQuickToolsTab('audit')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  quickToolsTab === 'audit' ? 'bg-[#14F1D9] text-[#050816]' : 'text-slate-400 hover:text-white'
                }`}
              >
                🛡️ Audit Trail
              </button>
            </div>

            {/* Tab 1: External Displays */}
            {quickToolsTab === 'displays' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 font-mono">
                  Launch full-screen broadcast views for trackside TV screens and driver mobile devices:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <a
                    href="/race/display/tv"
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 rounded-2xl bg-[#050816] border border-[#14F1D9]/30 hover:border-[#14F1D9] hover:scale-105 transition-all text-center space-y-2 group block"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#14F1D9]/10 text-[#14F1D9] flex items-center justify-center mx-auto">
                      📺
                    </div>
                    <div className="font-bold text-white text-xs uppercase group-hover:text-[#14F1D9]">
                      TV Broadcast Display
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      Full-screen high-contrast live timing for spectator pit displays.
                    </div>
                  </a>

                  <a
                    href="/race/live"
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 rounded-2xl bg-[#050816] border border-[#00B4FF]/30 hover:border-[#00B4FF] hover:scale-105 transition-all text-center space-y-2 group block"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#00B4FF]/10 text-[#00B4FF] flex items-center justify-center mx-auto">
                      📱
                    </div>
                    <div className="font-bold text-white text-xs uppercase group-hover:text-[#00B4FF]">
                      Mobile Racer View
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      Real-time live telemetry stream for drivers in the paddock.
                    </div>
                  </a>

                  <a
                    href="/leaderboard/karting"
                    target="_blank"
                    rel="noreferrer"
                    className="p-4 rounded-2xl bg-[#050816] border border-amber-500/30 hover:border-amber-400 hover:scale-105 transition-all text-center space-y-2 group block"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                      🏆
                    </div>
                    <div className="font-bold text-white text-xs uppercase group-hover:text-amber-400">
                      Hall of Fame
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      All-time fastest lap leaderboard & records.
                    </div>
                  </a>
                </div>
              </div>
            )}

            {/* Tab 2: Daily Timetable */}
            {quickToolsTab === 'schedule' && (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                <p className="text-xs text-slate-300 font-mono">
                  Today's Scheduled Race Slots (Max 50 Rides Capacity per Slot):
                </p>
                <div className="space-y-2">
                  {[
                    { slot: '10:00 AM', name: 'Heat 1 - Open Practice', racers: 6, status: 'Completed' },
                    { slot: '11:00 AM', name: 'Heat 2 - Sprint Qualifier', racers: 8, status: 'Completed' },
                    { slot: '12:00 PM', name: 'Heat 3 - Rookie Cup', racers: 5, status: 'Completed' },
                    { slot: '02:00 PM', name: 'Heat 4 - Pro GP Race', racers: 10, status: 'Completed' },
                    { slot: '03:00 PM', name: 'Heat 5 - Grand Prix Sprint', racers: 7, status: 'Active' },
                    { slot: '04:00 PM', name: 'Heat 6 - Evening Sprint', racers: 8, status: 'Scheduled' },
                    { slot: '05:00 PM', name: 'Heat 7 - Sunset Endurance', racers: 12, status: 'Scheduled' },
                    { slot: '06:00 PM', name: 'Heat 8 - Night Trophy Heat', racers: 6, status: 'Scheduled' },
                  ].map((s, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#050816] border border-white/10 flex justify-between items-center text-xs font-mono">
                      <div>
                        <span className="font-black text-[#14F1D9]">{s.slot}</span>
                        <span className="text-slate-300 ml-2 font-bold">{s.name}</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{s.racers} Drivers Booked</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                        s.status === 'Active' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        s.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        'bg-white/10 text-slate-400'
                      }`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Tournaments */}
            {quickToolsTab === 'tournaments' && (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                <p className="text-xs text-slate-300 font-mono">
                  Official 2026 Grand Prix Championship Series:
                </p>
                <div className="space-y-2">
                  {[
                    { team: 'Apex Racing Team', points: 145, wins: 4, rank: '1st' },
                    { team: 'Velocity Syndicate', points: 128, wins: 3, rank: '2nd' },
                    { team: 'Nitro Motorsport', points: 110, wins: 2, rank: '3rd' },
                    { team: 'Turbo Chargers', points: 95, wins: 1, rank: '4th' },
                    { team: 'ProKart Dynamics', points: 88, wins: 2, rank: '5th' },
                    { team: 'FastLane Racers', points: 74, wins: 1, rank: '6th' },
                  ].map((t, i) => (
                    <div key={i} className="p-3 rounded-xl bg-[#050816] border border-white/10 flex justify-between items-center text-xs font-mono">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-sm text-amber-400">{t.rank}</span>
                        <span className="font-bold text-white">{t.team}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-[#14F1D9]">{t.points} PTS</span>
                        <span className="text-[10px] text-slate-400 ml-2">({t.wins} Wins)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Audit Trail */}
            {quickToolsTab === 'audit' && (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                <p className="text-xs text-slate-300 font-mono">
                  Track Marshal Action Log & Allotment History:
                </p>
                {auditLogs.map(log => (
                  <div key={log.id} className="p-3 rounded-xl bg-[#050816] border border-white/5 flex justify-between items-center text-xs font-mono">
                    <div>
                      <span className="font-bold text-white">{log.riderName}</span>
                      <span className="text-slate-500"> ({log.ticketId})</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{log.notes || `Action: ${log.action}`}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[#14F1D9] font-bold">K{log.kartNumber}</span>
                      <p className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setShowQuickToolsModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#14F1D9] text-[#050816] font-black text-xs uppercase font-mono cursor-pointer"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 9: SUPER ADMIN GLOBAL CAPACITY & PRICING ALTERATION MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showGlobalAlterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#090E20] border border-purple-500/40 rounded-3xl p-6 text-white space-y-5 shadow-[0_0_50px_rgba(168,85,247,0.2)]">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white font-sans">
                    ALTER DEFAULT CAPACITY & PRICING
                  </h3>
                  <p className="text-[10px] font-mono text-purple-300">Super Admin Track Parameter Controls</p>
                </div>
              </div>
              <button onClick={() => setShowGlobalAlterModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              
              {/* Capacity Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Default Rides Capacity (Per Slot / Hour)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={tempDefaultCap}
                    onChange={e => setTempDefaultCap(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 bg-[#050816] border border-white/15 rounded-xl px-3 py-2.5 text-base font-black text-[#14F1D9] font-mono focus:border-purple-400 focus:outline-none"
                  />
                  <span className="text-xs font-mono text-slate-400">Rides/Hr</span>
                </div>
                <p className="text-[9px] font-mono text-slate-500">
                  Calculates daily capacity ({tempDefaultCap * scheduleSlots.length} Total Rides across {scheduleSlots.length} Heats).
                </p>
              </div>

              {/* Price per Kart Input */}
              <div className="space-y-1">
                <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Default Price Per Kart (Per Slot)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={tempDefaultPrice}
                    onChange={e => setTempDefaultPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 bg-[#050816] border border-white/15 rounded-xl px-3 py-2.5 text-base font-black text-amber-400 font-mono focus:border-purple-400 focus:outline-none"
                  />
                  <span className="text-xs font-mono text-slate-400">₹ / Kart</span>
                </div>
              </div>

              {/* Apply to All Option */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#050816] border border-white/10 text-xs font-mono">
                <div>
                  <span className="text-white font-bold block">Apply to All Existing Slots</span>
                  <span className="text-[10px] text-slate-400">Batch-updates all {scheduleSlots.length} slots in today's matrix</span>
                </div>
                <input
                  type="checkbox"
                  checked={applyGlobalToAllSlots}
                  onChange={e => setApplyGlobalToAllSlots(e.target.checked)}
                  className="w-4 h-4 accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowGlobalAlterModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase font-mono cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSaveGlobalAlteration}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-xs uppercase font-mono shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 transition-all cursor-pointer"
              >
                SAVE & APPLY ALTERATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 10: ALTER INDIVIDUAL SLOT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {editingSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-[#090E20] border border-purple-500/40 rounded-3xl p-6 text-white space-y-5 shadow-[0_0_50px_rgba(168,85,247,0.2)]">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white font-sans">
                    ALTER SLOT #{editingSlot.heatNum} ({editingSlot.slotTime})
                  </h3>
                  <p className="text-[10px] font-mono text-purple-300">Customize Capacity, Pricing, Time & Status</p>
                </div>
              </div>
              <button onClick={() => setEditingSlot(null)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3.5">
              
              {/* Slot Time & Title */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                    Slot Time
                  </label>
                  <input
                    type="text"
                    value={editingSlot.slotTime}
                    onChange={e => setEditingSlot({ ...editingSlot, slotTime: e.target.value })}
                    className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                    Event / Heat Format Title
                  </label>
                  <input
                    type="text"
                    value={editingSlot.formatTitle}
                    onChange={e => setEditingSlot({ ...editingSlot, formatTitle: e.target.value })}
                    className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Slot Specific Capacity & Price */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                    Slot Capacity (Rides)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={editingSlot.capacity}
                    onChange={e => setEditingSlot({ ...editingSlot, capacity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2 text-xs font-black text-[#14F1D9] font-mono focus:border-purple-400 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                    Slot Price per Kart (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingSlot.pricePerKart}
                    onChange={e => setEditingSlot({ ...editingSlot, pricePerKart: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2 text-xs font-black text-amber-400 font-mono focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Slot Status Controls */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Slot Availability Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSlot({ ...editingSlot, status: 'active' })}
                    className={`p-2.5 rounded-xl border text-center text-xs font-mono font-bold transition-all cursor-pointer ${
                      editingSlot.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400 ring-1 ring-emerald-400'
                        : 'bg-[#050816] text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    🟢 Active & Open
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingSlot({ ...editingSlot, status: 'blocked' })}
                    className={`p-2.5 rounded-xl border text-center text-xs font-mono font-bold transition-all cursor-pointer ${
                      editingSlot.status === 'blocked'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-400 ring-1 ring-rose-400'
                        : 'bg-[#050816] text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    🔒 Block / Private
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingSlot({ ...editingSlot, status: 'maintenance' })}
                    className={`p-2.5 rounded-xl border text-center text-xs font-mono font-bold transition-all cursor-pointer ${
                      editingSlot.status === 'maintenance'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400 ring-1 ring-amber-400'
                        : 'bg-[#050816] text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    ⚠️ Maintenance
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase font-mono cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSaveSlotAlteration}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-xs uppercase font-mono shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105 transition-all cursor-pointer"
              >
                SAVE SLOT ALTERATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 11: ADD NEW CUSTOM SLOT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#090E20] border border-[#14F1D9]/40 rounded-3xl p-6 text-white space-y-5 shadow-[0_0_50px_rgba(20,241,217,0.2)]">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#14F1D9]/20 text-[#14F1D9] flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white font-sans">
                    ADD NEW RACE SLOT
                  </h3>
                  <p className="text-[10px] font-mono text-[#14F1D9]">Append Extra Heat to Daily Schedule</p>
                </div>
              </div>
              <button onClick={() => setShowAddSlotModal(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Slot Time *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 10:00 PM"
                  value={newSlotTime}
                  onChange={e => setNewSlotTime(e.target.value)}
                  className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white font-mono focus:border-[#14F1D9] focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                  Event / Heat Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midnight Thunder Heat"
                  value={newSlotTitle}
                  onChange={e => setNewSlotTitle(e.target.value)}
                  className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-[#14F1D9] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                    Capacity (Rides)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newSlotCap}
                    onChange={e => setNewSlotCap(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-[#14F1D9] font-mono focus:border-[#14F1D9] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold">
                    Price Per Kart (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newSlotPrice}
                    onChange={e => setNewSlotPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-[#050816] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-amber-400 font-mono focus:border-[#14F1D9] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddSlotModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase font-mono cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleCreateNewSlot}
                disabled={!newSlotTime.trim()}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  newSlotTime.trim()
                    ? 'bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#050816] hover:scale-105 shadow-[0_0_20px_rgba(20,241,217,0.4)]'
                    : 'bg-white/10 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>ADD SLOT TO SCHEDULE</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL 12: TRANSPONDER FLEET & HARDWARE DECODER BRIDGE
      ═══════════════════════════════════════════════════════════════════════ */}
      {showTransponderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-fade-in overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#090E20] border-2 border-purple-500/50 rounded-3xl p-5 sm:p-6 text-white space-y-5 shadow-[0_0_60px_rgba(168,85,247,0.25)] my-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase text-white font-sans flex items-center gap-2">
                    <span>TRANSPONDER HARDWARE & DECODER SUITE</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                      15 FLEET UNITS
                    </span>
                  </h3>
                  <p className="text-[11px] font-mono text-purple-300">
                    AMB / MYLAPS X2 Timing Protocol Bridge · Millisecond High-Frequency RF Synchronizer
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTransponderModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-white/5 border border-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hardware Decoder Bridge Status Card */}
            <div className="p-4 rounded-2xl bg-[#050816] border border-purple-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-mono font-bold uppercase text-white">
                    CENTRAL DECODER LOOP CONTROLLER
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    decoderBridgeConnected 
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' 
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}>
                    {decoderBridgeConnected ? '🟢 TCP/IP BRIDGE CONNECTED' : '🔴 BRIDGE DISCONNECTED'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDecoderBridgeConnected(p => !p)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      decoderBridgeConnected
                        ? 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                        : 'bg-emerald-500 text-[#050816] font-black shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                    }`}
                  >
                    {decoderBridgeConnected ? 'TEST RECONNECT' : 'CONNECT DECODER'}
                  </button>
                </div>
              </div>

              {/* Loop Channels Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">LOOP 1 (FINISH LINE)</span>
                    <span className="text-emerald-400 font-bold text-[11px]">1000 Hz Timing Pulse</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">LOOP 2 (SECTOR 1 GATE)</span>
                    <span className="text-emerald-400 font-bold text-[11px]">Sector Split Active</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 block">LOOP 3 (PIT IN / OUT)</span>
                    <span className="text-emerald-400 font-bold text-[11px]">Pit Lane Speed Sync</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Editing Transponder Mapping Overlay (If selected) */}
            {editingTransponder && (
              <div className="p-4 rounded-2xl bg-purple-950/30 border-2 border-purple-400 space-y-3 animate-fade-in">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      REASSIGN TRANSPONDER {editingTransponder.id} ({editingTransponder.hardwareCode})
                    </span>
                  </div>
                  <button
                    onClick={() => setEditingTransponder(null)}
                    className="text-xs text-slate-400 hover:text-white cursor-pointer font-mono"
                  >
                    ✕ Cancel
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono text-slate-300">Assign to Kart:</span>
                  {Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0')).map(num => (
                    <button
                      key={num}
                      onClick={() => handleReassignTransponder(editingTransponder.id, num)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                        editingTransponder.assignedKartNumber === num
                          ? 'bg-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                          : 'bg-white/5 hover:bg-white/15 text-slate-300 border border-white/10'
                      }`}
                    >
                      K{num}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 15-Unit Transponder Rack Grid */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-slate-400 px-1">
                <span className="font-bold uppercase text-white">ALL 15 TRANSPONDERS STATUS RACK</span>
                <span>Click Card or "TEST PING" to verify signal</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                {transponders.map(tr => {
                  const isPinging = testPingId === tr.id;
                  const isGoodBattery = tr.batteryLevel >= 80;
                  const isMedBattery = tr.batteryLevel >= 40 && tr.batteryLevel < 80;

                  return (
                    <div
                      key={tr.id}
                      onClick={() => setEditingTransponder(tr)}
                      className={`p-3.5 rounded-2xl bg-[#050816] border transition-all cursor-pointer hover:scale-[1.01] flex flex-col justify-between gap-2.5 ${
                        isPinging
                          ? 'border-[#14F1D9] bg-[#14F1D9]/10 shadow-[0_0_25px_rgba(20,241,217,0.3)]'
                          : tr.status === 'connected'
                          ? 'border-white/10 hover:border-purple-400/50'
                          : 'border-amber-500/30 bg-amber-950/10'
                      }`}
                    >
                      {/* Top Bar: Transponder ID & Assigned Kart */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-purple-400" />
                          <span className="font-mono font-black text-sm text-white">{tr.id}</span>
                          <span className="text-[9px] font-mono text-slate-400">({tr.hardwareCode})</span>
                        </div>

                        <span className="px-2 py-0.5 rounded-md bg-[#14F1D9]/20 text-[#14F1D9] font-mono font-black text-xs border border-[#14F1D9]/30">
                          KART #{tr.assignedKartNumber}
                        </span>
                      </div>

                      {/* Middle Telemetry Stats */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Battery className={`w-3.5 h-3.5 ${
                            isGoodBattery ? 'text-emerald-400' : isMedBattery ? 'text-amber-400' : 'text-rose-400'
                          }`} />
                          <span>{tr.batteryLevel}% ({tr.voltage.toFixed(2)}V)</span>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Signal className="w-3.5 h-3.5 text-sky-400" />
                          <span>{tr.signalDbm} dBm</span>
                        </div>
                      </div>

                      {/* Bottom Action / Ping */}
                      <div className="flex justify-between items-center pt-2 border-t border-white/5 text-[9px] font-mono">
                        <span className="text-slate-400 truncate">
                          Passings: <strong className="text-slate-200">{tr.totalPassings}</strong>
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTestPing(tr.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-mono font-bold uppercase transition-all cursor-pointer ${
                            isPinging
                              ? 'bg-[#14F1D9] text-[#050816]'
                              : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                          }`}
                        >
                          {isPinging ? 'PINGING...' : '⚡ TEST PING'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center pt-3 border-t border-white/10 text-xs font-mono text-slate-400">
              <span>All 15 Transponders active & communicating via MYLAPS Loop Protocol</span>
              <button
                onClick={() => setShowTransponderModal(false)}
                className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black uppercase transition-all cursor-pointer shadow-[0_0_20px_rgba(168,85,247,0.4)]"
              >
                CLOSE SUITE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoKartRaceControlHub;

