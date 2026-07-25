import { Kart, GoKartingSession, LapRecord } from '../types';

export const mockKarts: Kart[] = Array.from({ length: 15 }, (_, i) => ({
  id: `kart-${i + 1}`,
  kartNumber: `${(i + 1).toString().padStart(2, '0')}`,
  status: i < 10 ? 'Available' : i < 13 ? 'Maintenance' : 'Out of Service',
}));

export const mockSessions: GoKartingSession[] = [
  {
    id: 'sess-1001',
    name: 'Pro Qualifier',
    status: 'Scheduled',
    durationMinutes: 10,
    riders: ['rider-1', 'rider-2', 'rider-3', 'rider-4'],
    kartAssignments: {
      'rider-1': 'kart-1',
      'rider-2': 'kart-2',
      'rider-3': 'kart-3',
      'rider-4': 'kart-4',
    }
  },
  {
    id: 'sess-1002',
    name: 'Standard Heat 1',
    status: 'Active',
    startTime: new Date(Date.now() - 4 * 60000).toISOString(),
    durationMinutes: 10,
    riders: ['rider-5', 'rider-6'],
    kartAssignments: {
      'rider-5': 'kart-5',
      'rider-6': 'kart-6',
    }
  }
];

export const mockLapRecords: LapRecord[] = [
  {
    id: 'lap-1',
    sessionId: 'sess-1002',
    driverId: 'rider-5',
    driverName: 'Alex Mercer',
    kartNumber: '05',
    lapTime: 42500, // 42.5s
    lapNumber: 1,
    isFastestLap: false,
    timestamp: new Date(Date.now() - 3 * 60000).toISOString()
  },
  {
    id: 'lap-2',
    sessionId: 'sess-1002',
    driverId: 'rider-6',
    driverName: 'Sarah Chen',
    kartNumber: '06',
    lapTime: 41200, // 41.2s
    lapNumber: 1,
    isFastestLap: true,
    timestamp: new Date(Date.now() - 3 * 60000).toISOString()
  },
  {
    id: 'lap-3',
    sessionId: 'sess-1002',
    driverId: 'rider-5',
    driverName: 'Alex Mercer',
    kartNumber: '05',
    lapTime: 42100, // 42.1s
    lapNumber: 2,
    isFastestLap: false,
    timestamp: new Date(Date.now() - 2 * 60000).toISOString()
  }
];
