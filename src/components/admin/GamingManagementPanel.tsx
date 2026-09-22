/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { GamingPC, GamingGame, GamingPackage, GamingSession, GamingPCStatus } from '../../types';
import {
  Monitor, Play, Square, Plus, Edit, Trash2, Clock, ShieldAlert, CheckCircle,
  AlertTriangle, RefreshCw, Key, Download, Settings, Gamepad2, Search, Filter,
  IndianRupee, Lock, Unlock, Zap, Server, Activity as ActivityIcon, ExternalLink
} from 'lucide-react';

export const GamingManagementPanel: React.FC = () => {
  const {
    gamingPcs, addGamingPC, updateGamingPC, deleteGamingPC,
    gamingGames, addGamingGame, updateGamingGame, deleteGamingGame,
    gamingPackages, addGamingPackage, updateGamingPackage, deleteGamingPackage,
    gamingSessions, startGamingSession, extendGamingSession, stopGamingSession,
    lockGamingPC, unlockGamingPC, togglePCMaintenance,
    refetchGamingDataFromBackend
  } = useAppContext();

  const [activeSubTab, setActiveSubTab] = useState<'grid' | 'packages' | 'games' | 'sessions' | 'reports' | 'installer'>('grid');

  // Modal States
  const [isPcModalOpen, setIsPcModalOpen] = useState(false);
  const [editingPc, setEditingPc] = useState<GamingPC | null>(null);
  const [pcForm, setPcForm] = useState({ id: '', pcName: '', ipAddress: '', notes: '' });

  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<GamingGame | null>(null);
  const [gameForm, setGameForm] = useState({ name: '', executablePath: '', processName: '', launchArguments: '', iconUrl: '', category: '', isEnabled: true });

  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<GamingPackage | null>(null);
  const [pkgForm, setPkgForm] = useState({ name: '', durationMinutes: 30, price: 90, description: '', isActive: true });

  const [isStartSessionModalOpen, setIsStartSessionModalOpen] = useState(false);
  const [selectedPcForSession, setSelectedPcForSession] = useState<GamingPC | null>(null);
  const [sessionForm, setSessionForm] = useState({ customerName: '', customerPhone: '', packageId: '', gameId: '', paymentMethod: 'cash' as 'cash' | 'upi' | 'card' | 'razorpay' });

  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [selectedSessionForExtend, setSelectedSessionForExtend] = useState<GamingSession | null>(null);
  const [extendMinutes, setExtendMinutes] = useState(15);

  const [searchFilter, setSearchFilter] = useState('');
  const [isRefetching, setIsRefetching] = useState(false);

  // Helper format seconds
  const formatTime = (seconds?: number) => {
    if (seconds === undefined || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: GamingPCStatus) => {
    switch (status) {
      case 'PLAYING':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />PLAYING</span>;
      case 'AVAILABLE':
      case 'ONLINE':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><span className="w-2 h-2 rounded-full bg-blue-500" />AVAILABLE</span>;
      case 'EXPIRED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertTriangle className="w-3.5 h-3.5" />EXPIRED</span>;
      case 'LOCKED':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20"><Lock className="w-3.5 h-3.5" />LOCKED</span>;
      case 'MAINTENANCE':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20"><Settings className="w-3.5 h-3.5" />MAINTENANCE</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20"><span className="w-2 h-2 rounded-full bg-gray-500" />OFFLINE</span>;
    }
  };

  // Save PC
  const handleSavePc = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPc) {
      updateGamingPC({ ...editingPc, pcName: pcForm.pcName, ipAddress: pcForm.ipAddress, notes: pcForm.notes, updatedAt: new Date().toISOString() });
    } else {
      addGamingPC({ id: pcForm.id.trim() || `DEUCE-PC-0${gamingPcs.length + 1}`, pcName: pcForm.pcName, ipAddress: pcForm.ipAddress, status: 'AVAILABLE', isKioskLocked: true, notes: pcForm.notes, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    setEditingPc(null);
    setIsPcModalOpen(false);
  };

  // Save Game
  const handleSaveGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGame) {
      updateGamingGame({ ...editingGame, ...gameForm });
    } else {
      addGamingGame({ ...gameForm, id: `game-${Date.now()}`, createdAt: new Date().toISOString() });
    }
    setEditingGame(null);
    setIsGameModalOpen(false);
  };

  // Save Package
  const handleSavePkg = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPkg) {
      updateGamingPackage({ ...editingPkg, ...pkgForm });
    } else {
      addGamingPackage({ ...pkgForm, id: `pkg-gaming-${Date.now()}`, createdAt: new Date().toISOString() });
    }
    setEditingPkg(null);
    setIsPkgModalOpen(false);
  };

  // Start Session
  const handleStartSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPcForSession || !sessionForm.packageId) return;

    const pkg = gamingPackages.find(p => p.id === sessionForm.packageId);
    if (!pkg) return;

    const game = gamingGames.find(g => g.id === sessionForm.gameId);

    startGamingSession({
      pcId: selectedPcForSession.id,
      customerName: sessionForm.customerName || 'Walk-in Gamer',
      customerPhone: sessionForm.customerPhone,
      packageId: pkg.id,
      packageName: pkg.name,
      gameId: game?.id,
      gameName: game?.name,
      durationMinutes: pkg.durationMinutes,
      price: pkg.price,
      paymentMethod: sessionForm.paymentMethod
    });

    setIsStartSessionModalOpen(false);
    setSelectedPcForSession(null);
  };

  // Extend Session
  const handleExtendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionForExtend) return;
    extendGamingSession(selectedSessionForExtend.id, extendMinutes);
    setIsExtendModalOpen(false);
    setSelectedSessionForExtend(null);
  };

  const handleManualSync = async () => {
    setIsRefetching(true);
    await refetchGamingDataFromBackend();
    setTimeout(() => setIsRefetching(false), 600);
  };

  return (
    <div className="space-y-6 text-gray-100">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-800/60 p-5 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
            <Monitor className="w-7 h-7 text-emerald-400" /> Standalone Gaming PC Module
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Independent Windows Client control, local timer countdowns, clock-tamper guard & offline event sync
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/gaming/kiosk"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl transition font-bold text-xs shadow-lg shadow-purple-900/30"
          >
            <ExternalLink className="w-4 h-4" /> Open Standalone Kiosk
          </a>

          <button
            onClick={handleManualSync}
            disabled={isRefetching}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-700/60 hover:bg-gray-700 text-gray-200 rounded-xl transition font-medium border border-gray-600/40 text-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-400 ${isRefetching ? 'animate-spin' : ''}`} />
            Sync PCs
          </button>

          <button
            onClick={() => {
              setEditingPc(null);
              setPcForm({ id: `DEUCE-PC-0${gamingPcs.length + 1}`, pcName: `Gaming Station 0${gamingPcs.length + 1}`, ipAddress: '', notes: '' });
              setIsPcModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition font-medium text-xs shadow-lg shadow-emerald-900/20"
          >
            <Plus className="w-4 h-4" /> Add Gaming PC
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-700/60 overflow-x-auto pb-1">
        {[
          { id: 'grid', label: 'PC Status Grid', icon: Monitor, badge: gamingPcs.length },
          { id: 'packages', label: 'Gaming Packages', icon: Clock, badge: gamingPackages.length },
          { id: 'games', label: 'Games Library', icon: Gamepad2, badge: gamingGames.length },
          { id: 'sessions', label: 'Session History', icon: ActivityIcon, badge: gamingSessions.length },
          { id: 'reports', label: 'Gaming Analytics', icon: IndianRupee },
          { id: 'installer', label: 'Client Setup / Installer', icon: Download }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-gray-800 text-gray-400'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 1: PC STATUS GRID
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'grid' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {gamingPcs.map(pc => {
              const activeSession = gamingSessions.find(s => s.pcId === pc.id && (s.status === 'ACTIVE' || s.status === 'AUTHORIZED'));
              return (
                <div
                  key={pc.id}
                  className={`bg-gray-800/70 border rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all hover:border-gray-600/70 ${
                    pc.status === 'PLAYING' ? 'border-emerald-500/40 shadow-lg shadow-emerald-950/20' : 'border-gray-700/60'
                  }`}
                >
                  {/* Top PC Card Header */}
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-semibold tracking-wider text-emerald-400 uppercase">{pc.id}</span>
                        <h3 className="text-lg font-bold text-gray-100">{pc.pcName}</h3>
                        {pc.ipAddress && <p className="text-xs text-gray-400 font-mono mt-0.5">{pc.ipAddress}</p>}
                      </div>
                      {getStatusBadge(pc.status)}
                    </div>

                    {/* Timer / Session Info */}
                    <div className="mt-4 p-3.5 bg-gray-900/60 rounded-xl border border-gray-800 space-y-2">
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Current Session</span>
                        <span className="font-mono text-gray-300">{pc.clientVersion || 'v1.0.0'}</span>
                      </div>

                      {activeSession ? (
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-200">{activeSession.customerName}</span>
                            <span className="text-xs text-emerald-400 font-medium">{activeSession.packageName}</span>
                          </div>

                          <div className="mt-2 flex items-baseline justify-between">
                            <div className="text-2xl font-black font-mono tracking-tight text-emerald-400">
                              {formatTime(pc.remainingSeconds)}
                            </div>
                            <span className="text-xs text-gray-400 truncate max-w-[120px]">
                              🎮 {activeSession.gameName || 'Any Game'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-center text-xs text-gray-500 italic">
                          No active gaming session
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="space-y-2 pt-2 border-t border-gray-700/40">
                    {pc.status === 'PLAYING' && activeSession ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setSelectedSessionForExtend(activeSession);
                            setIsExtendModalOpen(true);
                          }}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/30 transition"
                        >
                          <Plus className="w-3.5 h-3.5" /> Extend Time
                        </button>
                        <button
                          onClick={() => stopGamingSession(activeSession.id)}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs font-semibold border border-red-500/30 transition"
                        >
                          <Square className="w-3.5 h-3.5" /> End Session
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPcForSession(pc);
                          setSessionForm({
                            customerName: '',
                            customerPhone: '',
                            packageId: gamingPackages[0]?.id || '',
                            gameId: gamingGames[0]?.id || '',
                            paymentMethod: 'cash'
                          });
                          setIsStartSessionModalOpen(true);
                        }}
                        disabled={pc.status === 'MAINTENANCE'}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-40"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Start New Session
                      </button>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                      <button
                        onClick={() => togglePCMaintenance(pc.id)}
                        className={`hover:underline font-medium ${pc.status === 'MAINTENANCE' ? 'text-amber-400' : 'text-gray-400'}`}
                      >
                        {pc.status === 'MAINTENANCE' ? 'Exit Maintenance' : 'Maintenance'}
                      </button>

                      <div className="flex items-center gap-2">
                        {pc.isKioskLocked ? (
                          <button
                            onClick={() => unlockGamingPC(pc.id)}
                            className="text-gray-400 hover:text-emerald-400 transition"
                            title="Force Unlock Kiosk"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => lockGamingPC(pc.id)}
                            className="text-gray-400 hover:text-purple-400 transition"
                            title="Force Lock Kiosk"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setEditingPc(pc);
                            setPcForm({ id: pc.id, pcName: pc.pcName, ipAddress: pc.ipAddress || '', notes: pc.notes || '' });
                            setIsPcModalOpen(true);
                          }}
                          className="text-gray-400 hover:text-cyan-400 transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 2: GAMING PACKAGES
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'packages' && (
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-100">Gaming Packages & Pricing</h3>
              <p className="text-xs text-gray-400">Configured packages are synchronized with standalone PC clients.</p>
            </div>
            <button
              onClick={() => {
                setEditingPkg(null);
                setPkgForm({ name: '', durationMinutes: 30, price: 90, description: '', isActive: true });
                setIsPkgModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" /> Add Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {gamingPackages.map(pkg => (
              <div key={pkg.id} className="bg-gray-900/60 border border-gray-700/60 rounded-xl p-5 space-y-3 relative group">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-gray-100">{pkg.name}</h4>
                    <span className="text-xs text-emerald-400 font-semibold">{pkg.durationMinutes} Minutes</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-gray-100 flex items-center justify-end">
                      <IndianRupee className="w-4 h-4 text-emerald-400" /> {pkg.price}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-400 min-h-[32px]">{pkg.description || 'No description provided'}</p>

                <div className="flex items-center justify-between border-t border-gray-800 pt-3 text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pkg.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                    {pkg.isActive ? 'ACTIVE' : 'DISABLED'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingPkg(pkg);
                        setPkgForm({ name: pkg.name, durationMinutes: pkg.durationMinutes, price: pkg.price, description: pkg.description, isActive: pkg.isActive });
                        setIsPkgModalOpen(true);
                      }}
                      className="p-1 text-gray-400 hover:text-cyan-400 transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteGamingPackage(pkg.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 3: GAMES LIBRARY
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'games' && (
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-100">Configured Games Library</h3>
              <p className="text-xs text-gray-400">Executables and process names monitored by the PC Client.</p>
            </div>
            <button
              onClick={() => {
                setEditingGame(null);
                setGameForm({ name: '', executablePath: '', processName: '', launchArguments: '', iconUrl: '', category: 'Action', isEnabled: true });
                setIsGameModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
            >
              <Plus className="w-4 h-4" /> Add Game
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-900/60 text-gray-400 uppercase font-semibold text-[11px] border-b border-gray-700/60">
                <tr>
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Executable Path</th>
                  <th className="py-3 px-4">Process Name</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {gamingGames.map(game => (
                  <tr key={game.id} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-4 font-bold text-gray-100 flex items-center gap-3">
                      {game.iconUrl ? (
                        <img src={game.iconUrl} alt={game.name} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                          🎮
                        </div>
                      )}
                      {game.name}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{game.category || 'General'}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-gray-400 truncate max-w-[220px]">{game.executablePath}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-cyan-400">{game.processName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${game.isEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500'}`}>
                        {game.isEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingGame(game);
                            setGameForm({
                              name: game.name,
                              executablePath: game.executablePath,
                              processName: game.processName,
                              launchArguments: game.launchArguments || '',
                              iconUrl: game.iconUrl || '',
                              category: game.category || '',
                              isEnabled: game.isEnabled
                            });
                            setIsGameModalOpen(true);
                          }}
                          className="p-1 text-gray-400 hover:text-cyan-400 transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteGamingGame(game.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 4: SESSION HISTORY
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'sessions' && (
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-100">Gaming Session Log</h3>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="bg-gray-900/80 border border-gray-700 rounded-xl pl-9 pr-4 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-900/60 text-gray-400 uppercase font-semibold text-[11px] border-b border-gray-700/60">
                <tr>
                  <th className="py-3 px-4">Session ID</th>
                  <th className="py-3 px-4">PC</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4">Start Time</th>
                  <th className="py-3 px-4">Expiry Time</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {gamingSessions
                  .filter(s =>
                    s.id.toLowerCase().includes(searchFilter.toLowerCase()) ||
                    s.pcId.toLowerCase().includes(searchFilter.toLowerCase()) ||
                    s.customerName.toLowerCase().includes(searchFilter.toLowerCase())
                  )
                  .map(session => (
                    <tr key={session.id} className="hover:bg-gray-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{session.id}</td>
                      <td className="py-3 px-4 font-semibold text-gray-200">{session.pcId}</td>
                      <td className="py-3 px-4 font-medium text-gray-100">{session.customerName}</td>
                      <td className="py-3 px-4 text-gray-300">{session.packageName}</td>
                      <td className="py-3 px-4 text-cyan-400">{session.gameName || 'Any Game'}</td>
                      <td className="py-3 px-4 text-gray-400">{new Date(session.startTime).toLocaleTimeString()}</td>
                      <td className="py-3 px-4 text-gray-400">{new Date(session.expiryTime).toLocaleTimeString()}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          session.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                          session.status === 'EXPIRED' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 5: GAMING ANALYTICS & REPORTS
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-gray-800/60 border border-gray-700/50 p-5 rounded-2xl">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Gaming Revenue</span>
              <div className="text-3xl font-black text-emerald-400 mt-2 flex items-center">
                <IndianRupee className="w-6 h-6" />
                {gamingSessions.reduce((sum, s) => {
                  const pkg = gamingPackages.find(p => p.id === s.packageId);
                  return sum + (pkg?.price || 0);
                }, 0)}
              </div>
            </div>

            <div className="bg-gray-800/60 border border-gray-700/50 p-5 rounded-2xl">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Sessions Played</span>
              <div className="text-3xl font-black text-cyan-400 mt-2">
                {gamingSessions.length}
              </div>
            </div>

            <div className="bg-gray-800/60 border border-gray-700/50 p-5 rounded-2xl">
              <span className="text-xs text-gray-400 uppercase font-semibold">Active PCs Online</span>
              <div className="text-3xl font-black text-emerald-400 mt-2">
                {gamingPcs.filter(p => p.status !== 'OFFLINE').length} / {gamingPcs.length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SUB-TAB 6: INSTALLER & CLIENT SETUP
      ───────────────────────────────────────────────────────────── */}
      {activeSubTab === 'installer' && (
        <div className="bg-gray-800/60 rounded-2xl border border-gray-700/50 p-6 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" /> DEUCE Gaming PC Client & Standalone Access
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Access the Standalone Kiosk directly in browser or install the Windows Client launcher script on target Gaming PCs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-900/60 border border-purple-500/30 p-5 rounded-xl space-y-4">
              <h4 className="font-bold text-purple-300 text-sm flex items-center gap-2">
                <Monitor className="w-4 h-4 text-purple-400" /> Web Browser Kiosk Mode
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Run the Standalone Gaming PC client UI directly in Chrome/Edge browser on any gaming station:
              </p>
              <a
                href="/gaming/kiosk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs transition shadow-lg shadow-purple-900/40 w-full justify-center"
              >
                <ExternalLink className="w-4 h-4" /> Launch Standalone Kiosk (/gaming/kiosk)
              </a>
            </div>

            <div className="bg-gray-900/60 border border-gray-700/60 p-5 rounded-xl space-y-4">
              <h4 className="font-bold text-gray-200 text-sm">Quick Windows Batch Setup</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Execute the automated setup batch file on target Windows Gaming PCs for full auto-startup and process control:
              </p>
              <div className="bg-black/60 p-3 rounded-lg font-mono text-xs text-emerald-400 border border-gray-800">
                Install-Gaming-Client.bat
              </div>
            </div>

            <div className="bg-gray-900/60 border border-gray-700/60 p-5 rounded-xl space-y-4">
              <h4 className="font-bold text-gray-200 text-sm">Admin Emergency Recovery Key</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                To unlock a locked PC client or exit kiosk mode, press <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded text-gray-200 font-mono text-[11px]">CTRL + SHIFT + A</kbd> and enter the Admin PIN:
              </p>
              <div className="bg-black/60 p-3 rounded-lg font-mono text-base font-bold text-amber-400 border border-gray-800 tracking-wider text-center">
                DEUCE2026
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────── */}
      {/* PC ADD/EDIT MODAL */}
      {isPcModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-emerald-400" /> {editingPc ? 'Edit Gaming PC' : 'Add Gaming PC'}
            </h3>
            <form onSubmit={handleSavePc} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">PC Station ID</label>
                <input
                  type="text"
                  required
                  disabled={!!editingPc}
                  value={pcForm.id}
                  onChange={e => setPcForm({ ...pcForm, id: e.target.value })}
                  placeholder="e.g. DEUCE-PC-05"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">PC Name / Specs</label>
                <input
                  type="text"
                  required
                  value={pcForm.pcName}
                  onChange={e => setPcForm({ ...pcForm, pcName: e.target.value })}
                  placeholder="e.g. Gaming Station 05 (RTX 4080)"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">IP Address (Optional)</label>
                <input
                  type="text"
                  value={pcForm.ipAddress}
                  onChange={e => setPcForm({ ...pcForm, ipAddress: e.target.value })}
                  placeholder="192.168.1.105"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsPcModalOpen(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold">Save PC</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GAME ADD/EDIT MODAL */}
      {isGameModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-emerald-400" /> {editingGame ? 'Edit Game Config' : 'Add New Game'}
            </h3>
            <form onSubmit={handleSaveGame} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Game Name</label>
                  <input
                    type="text"
                    required
                    value={gameForm.name}
                    onChange={e => setGameForm({ ...gameForm, name: e.target.value })}
                    placeholder="e.g. Moto GP 24"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Category</label>
                  <input
                    type="text"
                    value={gameForm.category}
                    onChange={e => setGameForm({ ...gameForm, category: e.target.value })}
                    placeholder="e.g. Racing / Bike Simulator"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Executable Path (on PC)</label>
                <input
                  type="text"
                  required
                  value={gameForm.executablePath}
                  onChange={e => setGameForm({ ...gameForm, executablePath: e.target.value })}
                  placeholder="C:\Games\MotoGP\Game.exe"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Process Name (to monitor/close)</label>
                <input
                  type="text"
                  required
                  value={gameForm.processName}
                  onChange={e => setGameForm({ ...gameForm, processName: e.target.value })}
                  placeholder="MotoGP.exe"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100 font-mono text-[11px]"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Icon Image URL (Optional)</label>
                <input
                  type="text"
                  value={gameForm.iconUrl}
                  onChange={e => setGameForm({ ...gameForm, iconUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="gameEnabled"
                  checked={gameForm.isEnabled}
                  onChange={e => setGameForm({ ...gameForm, isEnabled: e.target.checked })}
                  className="rounded bg-gray-900 border-gray-700 text-emerald-500"
                />
                <label htmlFor="gameEnabled" className="text-gray-300 font-medium">Enable in PC Game Selector</label>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsGameModalOpen(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold">Save Game</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PACKAGE ADD/EDIT MODAL */}
      {isPkgModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" /> {editingPkg ? 'Edit Package' : 'Add Gaming Package'}
            </h3>
            <form onSubmit={handleSavePkg} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Package Name</label>
                <input
                  type="text"
                  required
                  value={pkgForm.name}
                  onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })}
                  placeholder="e.g. 30 Minutes Pro Gaming"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1">Duration (Minutes)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={pkgForm.durationMinutes}
                    onChange={e => setPkgForm({ ...pkgForm, durationMinutes: Number(e.target.value) })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Price (INR)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={pkgForm.price}
                    onChange={e => setPkgForm({ ...pkgForm, price: Number(e.target.value) })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-400 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={pkgForm.description}
                  onChange={e => setPkgForm({ ...pkgForm, description: e.target.value })}
                  placeholder="Package summary..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pkgActive"
                  checked={pkgForm.isActive}
                  onChange={e => setPkgForm({ ...pkgForm, isActive: e.target.checked })}
                  className="rounded bg-gray-900 border-gray-700 text-emerald-500"
                />
                <label htmlFor="pkgActive" className="text-gray-300 font-medium">Active for Sale</label>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setIsPkgModalOpen(false)} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-xl">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold">Save Package</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* START SESSION MODAL */}
      {isStartSessionModalOpen && selectedPcForSession && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-400" /> Start Gaming Session ({selectedPcForSession.id})
            </h3>

            <form onSubmit={handleStartSessionSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 font-medium mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  value={sessionForm.customerName}
                  onChange={e => setSessionForm({ ...sessionForm, customerName: e.target.value })}
                  placeholder="e.g. Alex Mercer"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Customer Phone (Optional)</label>
                <input
                  type="text"
                  value={sessionForm.customerPhone}
                  onChange={e => setSessionForm({ ...sessionForm, customerPhone: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Gaming Package</label>
                <select
                  value={sessionForm.packageId}
                  onChange={e => setSessionForm({ ...sessionForm, packageId: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
                >
                  {gamingPackages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.durationMinutes} Mins - ₹{pkg.price})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Preferred Game (Optional)</label>
                <select
                  value={sessionForm.gameId}
                  onChange={e => setSessionForm({ ...sessionForm, gameId: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Any Game (Customer Selects) --</option>
                  {gamingGames.map(game => (
                    <option key={game.id} value={game.id}>{game.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-medium mb-1">Payment Method</label>
                <select
                  value={sessionForm.paymentMethod}
                  onChange={e => setSessionForm({ ...sessionForm, paymentMethod: e.target.value as any })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-gray-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="cash">Cash Counter</option>
                  <option value="upi">UPI / QR Code</option>
                  <option value="card">Card Terminal</option>
                  <option value="razorpay">Razorpay Online</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsStartSessionModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30"
                >
                  Confirm & Start Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXTEND SESSION MODAL */}
      {isExtendModalOpen && selectedSessionForExtend && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-5">
            <h3 className="text-lg font-bold text-gray-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" /> Extend Session ({selectedSessionForExtend.pcId})
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 60].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setExtendMinutes(mins)}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    extendMinutes === mins
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                      : 'bg-gray-900 text-gray-400 border-gray-700 hover:text-gray-200'
                  }`}
                >
                  +{mins} Mins
                </button>
              ))}
            </div>

            <form onSubmit={handleExtendSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1">Custom Minutes</label>
                <input
                  type="number"
                  min={1}
                  value={extendMinutes}
                  onChange={e => setExtendMinutes(Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExtendModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  Add Time
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamingManagementPanel;
