/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { gamingClientEngine, LocalSessionState } from './gamingClientEngine';
import { GamingPCStatus, GamingPackage } from '../types';
import { Monitor, Play, Clock, Lock, Key, IndianRupee, QrCode, AlertTriangle, ShieldCheck, Gamepad2, Settings } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const GamingKioskApp: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<LocalSessionState | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [pcStatus, setPcStatus] = useState<GamingPCStatus>('AVAILABLE');

  // Config & Admin Modal
  const config = gamingClientEngine.getConfig();
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);
  const [isUnlockedForAdmin, setIsUnlockedForAdmin] = useState(false);

  // Packages list for QR Code direct purchase on PC
  const [packages, setPackages] = useState<GamingPackage[]>([]);
  const [selectedPkgForQr, setSelectedPkgForQr] = useState<GamingPackage | null>(null);

  // Keyboard shortcut listener for Admin PIN Recovery (CTRL + SHIFT + A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Subscribe to Gaming Client Engine
  useEffect(() => {
    const unsubscribe = gamingClientEngine.subscribe((session, remaining, status) => {
      setCurrentSession(session);
      setRemainingSeconds(remaining);
      setPcStatus(status);
    });
    return unsubscribe;
  }, []);

  // Load packages from server
  useEffect(() => {
    fetch(`${config.serverUrl}/api/gaming/packages`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPackages(data);
          setSelectedPkgForQr(data[0]);
        }
      })
      .catch(() => {});
  }, [config.serverUrl]);

  // Format seconds MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAdminPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPinInput === config.adminPin) {
      setIsUnlockedForAdmin(true);
      setIsAdminModalOpen(false);
      setAdminPinInput('');
      setAdminPinError(false);
    } else {
      setAdminPinError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 text-white font-sans overflow-hidden select-none">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-950/40 via-slate-950 to-slate-950 pointer-events-none" />

      {/* ─────────────────────────────────────────────────────────────
          CASE 1: ACTIVE SESSION — IN-GAME FLOATING OVERLAY TIMER
      ───────────────────────────────────────────────────────────── */}
      {pcStatus === 'PLAYING' && currentSession && !isUnlockedForAdmin && (
        <div className="fixed top-4 right-6 z-50 pointer-events-auto">
          <div className="bg-slate-900/90 border border-emerald-500/40 shadow-2xl backdrop-blur-md rounded-2xl p-4 flex items-center gap-4 text-emerald-400">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {currentSession.gameName || 'Active Gaming Session'}
              </div>
              <div className="text-3xl font-black font-mono tracking-tight text-white">
                {formatTime(remainingSeconds)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CASE 2: SESSION EXPIRED SCREEN
      ───────────────────────────────────────────────────────────── */}
      {pcStatus === 'EXPIRED' && !isUnlockedForAdmin && (
        <div className="fixed inset-0 z-40 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-900/80 border border-amber-500/40 rounded-3xl p-8 space-y-6 shadow-2xl backdrop-blur-lg">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">DEUCE GAMING</span>
              <h1 className="text-3xl font-black text-white mt-1">SESSION EXPIRED</h1>
              <p className="text-sm text-slate-400 mt-1">{config.pcId}</p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-500 font-semibold uppercase">TIME REMAINING</div>
              <div className="text-4xl font-black font-mono text-amber-400 mt-1">00:00</div>
            </div>

            <div className="pt-2">
              <p className="text-xs text-slate-300 font-semibold">PAY & PLAY AGAIN</p>
              <p className="text-[11px] text-slate-500 mt-1">Please make a payment at the counter or scan QR code to unlock machine.</p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CASE 3: AVAILABLE / IDLE KIOSK SCREEN
      ───────────────────────────────────────────────────────────── */}
      {pcStatus === 'AVAILABLE' && !isUnlockedForAdmin && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-between p-10">
          {/* Kiosk Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-wider uppercase">
              <Monitor className="w-4 h-4" /> DEUCE GAMING CLIENT
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white">{config.pcId}</h1>
            <p className="text-sm text-slate-400">Select a package or pay at counter to begin gaming</p>
          </div>

          {/* Package Selection & QR Payment Section */}
          <div className="w-full max-w-4xl bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-md grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Packages Selector */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" /> SELECT GAMING PACKAGE
              </h3>

              <div className="space-y-2.5">
                {packages.map(pkg => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPkgForQr(pkg)}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center justify-between ${
                      selectedPkgForQr?.id === pkg.id
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-white shadow-lg shadow-cyan-950/30'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm">{pkg.name}</div>
                      <div className="text-xs text-slate-400">{pkg.durationMinutes} Minutes Gaming Time</div>
                    </div>
                    <div className="text-lg font-black text-cyan-400 flex items-center">
                      <IndianRupee className="w-4 h-4" /> {pkg.price}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct QR Code Payment Generator */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 text-center space-y-4 flex flex-col items-center justify-center">
              {selectedPkgForQr ? (
                <>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    SCAN TO PAY & UNLOCK
                  </span>

                  <div className="p-3 bg-white rounded-2xl shadow-xl">
                    <QRCodeSVG
                      value={`upi://pay?pa=deucegaming@upi&pn=DeucePark&am=${selectedPkgForQr.price}&cu=INR&tn=Gaming_${config.pcId}_${selectedPkgForQr.id}`}
                      size={140}
                    />
                  </div>

                  <div>
                    <div className="text-xl font-extrabold text-white">{selectedPkgForQr.name}</div>
                    <div className="text-sm font-black text-cyan-400 mt-0.5">₹{selectedPkgForQr.price} for {selectedPkgForQr.durationMinutes} Mins</div>
                  </div>

                  <p className="text-[10px] text-slate-500 max-w-xs">
                    Machine unlocks automatically upon payment verification.
                  </p>
                </>
              ) : (
                <div className="text-slate-500 text-xs italic">Select a package to generate QR code</div>
              )}
            </div>
          </div>

          {/* Kiosk Footer Notice */}
          <div className="text-xs text-slate-500 flex items-center gap-6">
            <span>Server: Connected</span>
            <span>Local DB: Active</span>
            <span>Shortcut: CTRL + SHIFT + A (Admin PIN)</span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ADMIN RECOVERY MODAL (CTRL + SHIFT + A)
      ───────────────────────────────────────────────────────────── */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto border border-cyan-500/30">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Admin Kiosk Recovery</h3>
              <p className="text-xs text-slate-400">Enter Admin PIN to unlock system control</p>
            </div>

            <form onSubmit={handleAdminPinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  value={adminPinInput}
                  onChange={e => setAdminPinInput(e.target.value)}
                  placeholder="Enter Admin PIN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:border-cyan-500"
                />
                {adminPinError && (
                  <p className="text-xs text-red-400 text-center mt-1.5 font-medium">Incorrect Admin PIN</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold"
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamingKioskApp;
