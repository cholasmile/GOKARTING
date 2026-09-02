/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { AppProvider, useAppContext } from './context/AppContext';
import { AdminDashboard } from './components/AdminDashboard';
import { ActivityStaffDashboard } from './components/ActivityStaffDashboard';
import { FoodVendorDashboard } from './components/FoodVendorDashboard';
import { CustomerDashboard } from './components/CustomerDashboard';
import { NotificationToast } from './components/NotificationToast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ProtectedLayout } from './components/ProtectedLayout';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import { CustomerMobileRaceView } from './components/karting/timingSystem/CustomerMobileRaceView';
import { CustomerTvDisplayView } from './components/karting/timingSystem/CustomerTvDisplayView';
import { RaceTimingMaster } from './components/karting/timingSystem/RaceTimingMaster';
import { Mail, Lock, KeyRound, LogIn, User as UserIcon } from 'lucide-react';

function LoginPage() {
  const { setCurrentUser, users } = useAppContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const normalizedEmail = email.trim().toLowerCase();
      
      // Match credentials against users in Context
      const matchedUser = users.find(
        u => u.email.toLowerCase() === normalizedEmail
      );

      // We still simulate a simple password check (matching password with role for now, or just 'admin', 'staff', 'vendor')
      // If the user's role is admin, password is 'admin' etc., or just check if user is found. 
      // For a proper system we'd use Supabase auth, but per plan we use hardcoded credentials check matching the user object.
      const isValidPassword = 
        (matchedUser?.role === 'super_admin' && password === 'admin') ||
        (matchedUser?.role === 'activity_staff' && password === 'staff') ||
        (matchedUser?.role === 'food_vendor' && (password === 'vendor' || password === 'cafe' || password === 'staff')) ||
        (matchedUser?.role === 'cafe_staff' && (password === 'cafe' || password === 'vendor' || password === 'staff')) ||
        (matchedUser?.role === 'go_karting_manager' && (password === 'manager' || password === 'staff' || password === 'karting')) ||
        (matchedUser?.role === 'go_karting_staff' && (password === 'staff' || password === 'karting')) ||
        (matchedUser?.role === 'horse_riding_staff' && (password === 'staff' || password === 'horse')) ||
        (matchedUser?.role === 'shooting_staff' && (password === 'staff' || password === 'shooting')) ||
        (matchedUser?.role === 'ticket_counter_staff' && (password === 'staff' || password === 'ticketing'));

      if (matchedUser && isValidPassword) {
        setCurrentUser(matchedUser);
        
        if (matchedUser.role === 'super_admin') navigate('/admin');
        else if (matchedUser.role === 'go_karting_manager' || matchedUser.role === 'go_karting_staff') navigate('/staff/karting');
        else if (matchedUser.role === 'horse_riding_staff') navigate('/staff/horse-riding');
        else if (matchedUser.role === 'shooting_staff') navigate('/staff/shooting');
        else if (matchedUser.role === 'food_vendor' || matchedUser.role === 'cafe_staff') navigate('/staff/cafe');
        else if (matchedUser.role === 'ticket_counter_staff') navigate('/staff/ticketing');
        else navigate('/staff');
      } else {
        setError('Invalid email or password. Access denied.');
        setLoading(false);
      }
    }, 800); // Premium micro-spinner feel
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans select-none">
      
      {/* Ambient background glows */}
      <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-[#007B8B]/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] bg-[#00ABAB]/10 rounded-full blur-[150px] pointer-events-none"></div>
      
      <div className="w-full max-w-md relative z-10 animate-fade-in">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <img 
              src="/deuce-logo.jpg" 
              alt="Deuce Logo" 
              className="w-16 h-16 rounded-2xl object-cover shadow-[0_8px_30px_rgba(20,241,217,0.3)] border border-[#14F1D9]/40"
            />
            <div className="text-left">
              <h1 className="text-3xl font-black tracking-tight text-gradient uppercase leading-none">
                Deuce
              </h1>
              <p className="text-[10px] text-[#40E0D0] tracking-[0.25em] font-mono uppercase font-bold mt-1">
                Live The Rush • Yelagiri
              </p>
            </div>
          </div>
          <p className="text-sm text-[#94A3B8] max-w-sm mx-auto">
            Secure Role-Based Portal for Staff and Management.
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-3xl p-8">
          <h2 className="text-lg font-bold text-[#0B0F14] mb-6 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-teal-400" /> Authorized Access Only
          </h2>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 ml-1 font-mono">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#40E0D0]">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@deucepark.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#0A0A0A]/50 border border-[#00ABAB]/30 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#3E8EDE] focus:ring-1 focus:ring-[#40E0D0] transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 ml-1 font-mono">
                Security Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#40E0D0]">
                  <Lock className="h-4.5 w-4.5" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#0A0A0A]/50 border border-[#00ABAB]/30 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#3E8EDE] focus:ring-1 focus:ring-[#40E0D0] transition-all font-medium"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3 text-xs text-center font-medium animate-shake">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-glow font-bold py-3 rounded-2xl flex items-center justify-center gap-2 mt-6 text-sm uppercase tracking-wide cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                'System Access'
              )}
            </button>
          </form>

          {/* Quick Staff Demo Portals */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-[10px] text-[#9CA3AF] font-mono uppercase font-bold text-center mb-2">Select Activity Staff Demo Login</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setEmail('kartingstaff@deucepark.com'); setPassword('staff'); }}
                className="p-2 rounded-xl bg-white/5 hover:bg-[#14F1D9]/10 border border-white/10 text-[10px] font-mono text-left font-bold text-white hover:text-[#14F1D9] transition-all cursor-pointer flex items-center gap-1"
              >
                🏎️ Go-Karting Ops
              </button>
              <button
                type="button"
                onClick={() => { setEmail('horseriding@deucepark.com'); setPassword('staff'); }}
                className="p-2 rounded-xl bg-white/5 hover:bg-[#14F1D9]/10 border border-white/10 text-[10px] font-mono text-left font-bold text-white hover:text-[#14F1D9] transition-all cursor-pointer flex items-center gap-1"
              >
                🐎 Horse Riding Ops
              </button>
              <button
                type="button"
                onClick={() => { setEmail('shooting@deucepark.com'); setPassword('staff'); }}
                className="p-2 rounded-xl bg-white/5 hover:bg-[#14F1D9]/10 border border-white/10 text-[10px] font-mono text-left font-bold text-white hover:text-[#14F1D9] transition-all cursor-pointer flex items-center gap-1"
              >
                🎯 Precision Shooting
              </button>
              <button
                type="button"
                onClick={() => { setEmail('cafe@deucepark.com'); setPassword('cafe'); }}
                className="p-2 rounded-xl bg-white/5 hover:bg-[#14F1D9]/10 border border-white/10 text-[10px] font-mono text-left font-bold text-white hover:text-[#14F1D9] transition-all cursor-pointer flex items-center gap-1"
              >
                ☕ Deuce Cafe Staff
              </button>
              <button
                type="button"
                onClick={() => { setEmail('ticketing@deucepark.com'); setPassword('staff'); }}
                className="p-2 rounded-xl bg-white/5 hover:bg-[#14F1D9]/10 border border-white/10 text-[10px] font-mono text-left font-bold text-white hover:text-[#14F1D9] transition-all cursor-pointer flex items-center gap-1"
              >
                🎫 Ticket Counter
              </button>
              <button
                type="button"
                onClick={() => { setEmail('admin@deucepark.com'); setPassword('admin'); }}
                className="p-2 rounded-xl bg-white/5 hover:bg-[#14F1D9]/10 border border-white/10 text-[10px] font-mono text-left font-bold text-white hover:text-[#14F1D9] transition-all cursor-pointer flex items-center gap-1"
              >
                🛡️ Super Admin
              </button>
            </div>
          </div>

        </div>

        {/* Footer info */}
        <p className="text-center text-[9px] text-[#94A3B8] font-mono tracking-widest uppercase mt-6 flex justify-between px-2">
          <span>Deuce Racing OS</span>
          <Link to="/" className="text-[#3E8EDE] hover:text-[#40E0D0] transition-colors">Return to Track</Link>
        </p>

      </div>
    </div>
  );
}

import PublicLeaderboardScreen from './components/karting/PublicLeaderboardScreen';
import GoKartingOpsDashboard from './components/karting/GoKartingOpsDashboard';
import TicketingDashboard from './components/TicketingDashboard';

// Wrapper for public layout with no explicit auth needed but some styling
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, setCurrentUser } = useAppContext();

  return (
    <div className="min-h-screen flex flex-col text-[#FFFFFF] font-sans selection:bg-[#007B8B]/30 selection:text-white bg-transparent">
      <header className="sticky top-0 z-40 glass-panel border-b border-[#00ABAB]/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3 group">
              <img 
                src="/deuce-logo.jpg" 
                alt="Deuce Logo" 
                className="w-11 h-11 rounded-xl object-cover shadow-[0_4px_12px_rgba(20,241,217,0.3)] border border-[#14F1D9]/40 group-hover:scale-105 transition-transform"
              />
              <div>
                <h1 className="font-black text-2xl leading-none tracking-tight text-gradient font-sans uppercase">Deuce</h1>
                <p className="text-[9px] text-[#40E0D0] tracking-widest font-mono uppercase font-bold mt-1">Live The Rush • Yelagiri</p>
              </div>
            </Link>
          </div>

          {/* Member Status & Guest Controls in Header */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 bg-[#050816]/90 border border-[#14F1D9]/40 rounded-2xl px-3 py-1.5 shadow-[0_0_15px_rgba(20,241,217,0.2)]">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#14F1D9] to-[#00B4FF] text-[#0B1120] flex items-center justify-center font-black text-xs">
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'M'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[11px] font-bold text-white leading-tight">{currentUser.name}</p>
                  <span className="text-[8px] uppercase tracking-wider font-mono font-bold text-[#14F1D9] block">Verified Member</span>
                </div>
                <button
                  onClick={() => setCurrentUser(null)}
                  className="text-[10px] text-rose-400 font-bold hover:underline font-mono ml-2 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>Guest Mode</span>
                </div>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-member-modal'))}
                  className="text-xs font-bold text-[#0B1120] bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(20,241,217,0.3)] hover:scale-[1.02] transition-all cursor-pointer font-sans"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Member Login</span>
                </button>
              </div>
            )}

            <Link to="/login" className="text-xs font-bold text-white px-3.5 py-2 rounded-xl btn-glow flex items-center gap-1">
              Staff Portal
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full mx-auto">
        {children}
      </main>
      <NotificationToast />
      <footer className="border-t border-[#00ABAB]/30 bg-[#0A0A0A]/80 py-6 text-center text-[10px] text-[#40E0D0] font-mono tracking-wider">
        Deuce Racing & Deuce Park • Premium Destination
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicLayout><CustomerDashboard /></PublicLayout>} />
          
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/leaderboard/karting" element={<PublicLeaderboardScreen />} />
          
          {/* Go-Kart Live Timing System Public Routes */}
          <Route path="/race/live/:id" element={<CustomerMobileRaceView />} />
          <Route path="/race/live" element={<CustomerMobileRaceView />} />
          <Route path="/race/display/tv" element={<CustomerTvDisplayView />} />
          <Route path="/race/timing/*" element={<RaceTimingMaster />} />
          
          <Route element={<ProtectedLayout />}>
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/staff/*" element={
              <ProtectedRoute allowedRoles={['activity_staff', 'super_admin']}>
                <ActivityStaffDashboard />
              </ProtectedRoute>
            } />
            <Route path="/staff/horse-riding/*" element={
              <ProtectedRoute allowedRoles={['horse_riding_staff', 'activity_staff', 'super_admin']}>
                <ActivityStaffDashboard 
                  activityIdFilter="act-horse-riding" 
                  title="Horse Riding Arena Staff Portal" 
                  subtitle="Manage horse arena queue, guide assignments, rider check-ins, and safety checks"
                />
              </ProtectedRoute>
            } />
            <Route path="/staff/shooting/*" element={
              <ProtectedRoute allowedRoles={['shooting_staff', 'activity_staff', 'super_admin']}>
                <ActivityStaffDashboard 
                  activityIdFilter="act-air-gun" 
                  title="Precision Air Gun Shooting Staff Portal" 
                  subtitle="Manage target shooting range lanes, pellet inventory, and shooter check-ins"
                />
              </ProtectedRoute>
            } />
            <Route path="/vendor/*" element={
              <ProtectedRoute allowedRoles={['food_vendor', 'cafe_staff', 'super_admin']}>
                <FoodVendorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/staff/cafe/*" element={
              <ProtectedRoute allowedRoles={['food_vendor', 'cafe_staff', 'super_admin']}>
                <FoodVendorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/staff/karting/*" element={
              <ProtectedRoute allowedRoles={['go_karting_manager', 'go_karting_staff', 'super_admin']}>
                <GoKartingOpsDashboard />
              </ProtectedRoute>
            } />
            <Route path="/staff/ticketing/*" element={
              <ProtectedRoute allowedRoles={['ticket_counter_staff', 'super_admin']}>
                <TicketingDashboard />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <SyncStatusIndicator />
      </BrowserRouter>
    </AppProvider>
  );
}


