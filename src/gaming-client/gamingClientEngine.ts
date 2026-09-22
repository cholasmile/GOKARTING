/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GamingPCStatus, GamingSession, GamingPCEvent, GamingGame, GamingPackage } from '../types';

export interface LocalClientConfig {
  pcId: string;
  serverUrl: string;
  adminPin: string;
  enableOverlayTimer: boolean;
  warningMinutes: number[];
}

export interface LocalSessionState {
  sessionId: string;
  pcId: string;
  customerName: string;
  packageName: string;
  gameId?: string;
  gameName?: string;
  executablePath?: string;
  processName?: string;
  startTime: string; // ISO string
  expiryTime: string; // ISO string (Trusted Server Expiry)
  durationMinutes: number;
  status: 'ACTIVE' | 'EXPIRED' | 'STOPPED';
  
  // Clock Tamper Verification Fields
  registeredUptimeAtStart: number; // performance.now() elapsed ms at session start
  lastTrustedRemainingSeconds: number;
}

class GamingClientEngine {
  private config: LocalClientConfig;
  private currentSession: LocalSessionState | null = null;
  private eventQueue: GamingPCEvent[] = [];
  private listeners: ((session: LocalSessionState | null, remainingSecs: number, status: GamingPCStatus) => void)[] = [];
  private activeProcessPid: number | null = null;
  private gameCrashed: boolean = false;
  private tickInterval: any = null;
  private heartbeatInterval: any = null;

  constructor() {
    this.config = this.loadConfig();
    this.currentSession = this.loadLocalSession();
    this.eventQueue = this.loadEventQueue();

    this.startEngineLoops();
  }

  private loadConfig(): LocalClientConfig {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deuce_client_config');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return {
      pcId: 'DEUCE-PC-01',
      serverUrl: window.location.origin || 'http://localhost:3000',
      adminPin: 'DEUCE2026',
      enableOverlayTimer: true,
      warningMinutes: [10, 5, 1]
    };
  }

  public saveConfig(newConfig: Partial<LocalClientConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      localStorage.setItem('deuce_client_config', JSON.stringify(this.config));
    }
  }

  public getConfig(): LocalClientConfig {
    return this.config;
  }

  private loadLocalSession(): LocalSessionState | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem('deuce_client_local_session');
    if (!data) return null;
    try {
      const session: LocalSessionState = JSON.parse(data);
      // Validate expiry
      const remaining = this.calculateRemainingSeconds(session);
      if (remaining <= 0) {
        session.status = 'EXPIRED';
        this.saveLocalSession(session);
      }
      return session;
    } catch (e) {
      return null;
    }
  }

  private saveLocalSession(session: LocalSessionState | null) {
    this.currentSession = session;
    if (typeof window !== 'undefined') {
      if (session) {
        localStorage.setItem('deuce_client_local_session', JSON.stringify(session));
      } else {
        localStorage.removeItem('deuce_client_local_session');
      }
    }
  }

  private loadEventQueue(): GamingPCEvent[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('deuce_client_event_queue');
    if (!data) return [];
    try { return JSON.parse(data); } catch (e) { return []; }
  }

  private saveEventQueue() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('deuce_client_event_queue', JSON.stringify(this.eventQueue));
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CLOCK TAMPER TAMPER-PROOF REMAINING TIME CALCULATION
  // ─────────────────────────────────────────────────────────────
  public calculateRemainingSeconds(session: LocalSessionState = this.currentSession!): number {
    if (!session || session.status !== 'ACTIVE') return 0;

    const nowTime = Date.now();
    const expiryTime = new Date(session.expiryTime).getTime();
    const wallClockRemaining = Math.floor((expiryTime - nowTime) / 1000);

    // Monotonic Uptime Guard using performance.now()
    const currentUptimeMs = performance.now();
    const elapsedUptimeSecs = Math.floor((currentUptimeMs - session.registeredUptimeAtStart) / 1000);
    const monotonicRemaining = session.durationMinutes * 60 - elapsedUptimeSecs;

    // Detect system clock manipulation (rewind or jump)
    if (Math.abs(wallClockRemaining - monotonicRemaining) > 15) {
      // Clock anomaly detected! Record event and enforce strictly shorter monotonic timer
      this.recordEvent('CLOCK_ANOMALY', {
        wallClockRemaining,
        monotonicRemaining,
        detectedAt: new Date().toISOString()
      });
      return Math.max(0, Math.min(wallClockRemaining, monotonicRemaining));
    }

    return Math.max(0, wallClockRemaining);
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT RECORDING & OFFLINE QUEUE
  // ─────────────────────────────────────────────────────────────
  public recordEvent(
    eventType: GamingPCEvent['eventType'],
    eventData: Record<string, any> = {}
  ) {
    const event: GamingPCEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      eventId: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      pcId: this.config.pcId,
      sessionId: this.currentSession?.sessionId,
      eventType,
      eventData,
      timestamp: new Date().toISOString()
    };

    this.eventQueue.push(event);
    this.saveEventQueue();

    // Attempt immediately flush if online
    this.flushEventsToServer();
  }

  private async flushEventsToServer() {
    if (this.eventQueue.length === 0) return;

    try {
      const response = await fetch(`${this.config.serverUrl}/api/gaming/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: this.eventQueue })
      });

      if (response.ok) {
        this.eventQueue = [];
        this.saveEventQueue();
      }
    } catch (err) {
      // Server offline - events remain safely queued in local storage!
    }
  }

  // ─────────────────────────────────────────────────────────────
  // ENGINE LOOPS (TICK & HEARTBEAT)
  // ─────────────────────────────────────────────────────────────
  private startEngineLoops() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    // Countdown tick loop (every 1 second)
    this.tickInterval = setInterval(() => {
      if (this.currentSession && this.currentSession.status === 'ACTIVE') {
        const remaining = this.calculateRemainingSeconds();

        if (remaining <= 0) {
          this.handleSessionExpired();
        } else {
          this.notifyListeners(remaining, 'PLAYING');
        }
      } else {
        const status: GamingPCStatus = this.currentSession?.status === 'EXPIRED' ? 'EXPIRED' : 'AVAILABLE';
        this.notifyListeners(0, status);
      }
    }, 1000);

    // Heartbeat loop (every 3 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 3000);
  }

  private async sendHeartbeat() {
    const remaining = this.currentSession ? this.calculateRemainingSeconds() : 0;
    const currentStatus: GamingPCStatus = this.currentSession?.status === 'ACTIVE'
      ? 'PLAYING'
      : this.currentSession?.status === 'EXPIRED'
      ? 'EXPIRED'
      : 'AVAILABLE';

    try {
      const response = await fetch(`${this.config.serverUrl}/api/gaming/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pcId: this.config.pcId,
          clientVersion: '1.0.0',
          status: currentStatus,
          currentSessionId: this.currentSession?.sessionId,
          remainingSeconds: remaining,
          currentGameName: this.currentSession?.gameName
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Also flush offline queued events
        this.flushEventsToServer();

        // Check if server sent new active session authorization
        if (data.activeSession && (!this.currentSession || this.currentSession.sessionId !== data.activeSession.id)) {
          this.startLocalSessionFromAuthorization(data.activeSession);
        }
      }
    } catch (e) {
      // Offline mode - countdown continues locally!
    }
  }

  // ─────────────────────────────────────────────────────────────
  // LOCAL SESSION LIFECYCLE
  // ─────────────────────────────────────────────────────────────
  public startLocalSessionFromAuthorization(serverSession: GamingSession) {
    const now = new Date();
    const expiry = new Date(serverSession.expiryTime);

    const localSession: LocalSessionState = {
      sessionId: serverSession.id,
      pcId: serverSession.pcId,
      customerName: serverSession.customerName,
      packageName: serverSession.packageName,
      gameId: serverSession.gameId,
      gameName: serverSession.gameName,
      startTime: now.toISOString(),
      expiryTime: expiry.toISOString(),
      durationMinutes: serverSession.durationMinutes,
      status: 'ACTIVE',
      registeredUptimeAtStart: performance.now(),
      lastTrustedRemainingSeconds: Math.floor((expiry.getTime() - now.getTime()) / 1000)
    };

    this.saveLocalSession(localSession);
    this.gameCrashed = false;
    this.recordEvent('SESSION_STARTED', { sessionId: serverSession.id });

    // Attempt to launch game executable if configured
    if (serverSession.gameName) {
      this.launchGameExecutable(serverSession.gameName);
    }
  }

  public launchGameExecutable(gameName: string) {
    this.recordEvent('GAME_STARTED', { gameName });
    // In Electron environment, invoke child_process.spawn
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.launchGame(gameName);
    }
  }

  public handleSessionExpired() {
    if (!this.currentSession) return;
    this.currentSession.status = 'EXPIRED';
    this.saveLocalSession(this.currentSession);

    // Terminate game process
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.closeGame();
    }

    this.recordEvent('SESSION_EXPIRED', { sessionId: this.currentSession.sessionId });
    this.notifyListeners(0, 'EXPIRED');
  }

  public forceStopSession() {
    if (!this.currentSession) return;
    this.currentSession.status = 'STOPPED';
    this.saveLocalSession(null);
    this.recordEvent('SESSION_STOPPED');
    this.notifyListeners(0, 'AVAILABLE');
  }

  // ─────────────────────────────────────────────────────────────
  // SUBSCRIBERS
  // ─────────────────────────────────────────────────────────────
  public subscribe(listener: (session: LocalSessionState | null, remainingSecs: number, status: GamingPCStatus) => void) {
    this.listeners.push(listener);
    const remaining = this.currentSession ? this.calculateRemainingSeconds() : 0;
    const status: GamingPCStatus = this.currentSession?.status === 'ACTIVE' ? 'PLAYING' : this.currentSession?.status === 'EXPIRED' ? 'EXPIRED' : 'AVAILABLE';
    listener(this.currentSession, remaining, status);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(remainingSecs: number, status: GamingPCStatus) {
    this.listeners.forEach(l => l(this.currentSession, remainingSecs, status));
  }
}

export const gamingClientEngine = new GamingClientEngine();
