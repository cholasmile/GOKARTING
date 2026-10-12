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
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { CustomerMobileRaceView } from './components/karting/timingSystem/CustomerMobileRaceView';
import { CustomerTvDisplayView } from './components/karting/timingSystem/CustomerTvDisplayView';
import { RaceTimingMaster } from './components/karting/timingSystem/RaceTimingMaster';
import { INITIAL_USERS } from './data/initialData';
import { Mail, Lock, KeyRound, LogIn } from 'lucide-react';

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
      const rawInput = email.trim().toLowerCase();
      
      // Combine Supabase users with predefined staff credentials for login authentication
      const allAvailableUsers = [...users];
      INITIAL_USERS.forEach(init => {
        if (!allAvailableUsers.some(u => u.email.toLowerCase() === init.email.toLowerCase())) {
          allAvailableUsers.push(init);
        }
      });
      
      // Match credentials against users (supports full email or short username prefix e.g. kartingstaff, admin, staff)
      const matchedUser = allAvailableUsers.find(u => {
        const uEmail = u.email.toLowerCase();
        const uPrefix = uEmail.split('@')[0];
        return uEmail === rawInput || uPrefix === rawInput;
      });

      if (!matchedUser) {
        setError('Staff account not found. Please check your username or email address.');
        setLoading(false);
        return;
      }

      const isValidPassword = 
        (matchedUser.password && password === matchedUser.password) ||
        (matchedUser.role === 'super_admin' && (password === 'admin' || password === 'admin123')) ||
        (matchedUser.role === 'activity_staff' && password === 'staff') ||
        (matchedUser.role === 'food_vendor' && (password === 'vendor' || password === 'cafe' || password === 'staff')) ||
        (matchedUser.role === 'cafe_staff' && (password === 'cafe' || password === 'vendor' || password === 'staff')) ||
        (matchedUser.role === 'go_karting_manager' && (password === 'manager' || password === 'staff' || password === 'karting')) ||
        (matchedUser.role === 'go_karting_staff' && (password === 'staff' || password === 'karting')) ||
        (matchedUser.role === 'horse_riding_staff' && (password === 'staff' || password === 'horse')) ||
        (matchedUser.role === 'shooting_staff' && (password === 'staff' || password === 'shooting')) ||
        (matchedUser.role === 'ticket_counter_staff' && (password === 'staff' || password === 'ticketing'));

      if (isValidPassword) {
        setCurrentUser(matchedUser);
        
        if (matchedUser.role === 'super_admin') navigate('/admin');
        else if (matchedUser.role === 'go_karting_manager' || matchedUser.role === 'go_karting_staff') navigate('/staff/karting');
        else if (matchedUser.role === 'horse_riding_staff') navigate('/staff/horse-riding');
        else if (matchedUser.role === 'shooting_staff') navigate('/staff/shooting');
        else if (matchedUser.role === 'food_vendor' || matchedUser.role === 'cafe_staff') navigate('/staff/cafe');
        else if (matchedUser.role === 'ticket_counter_staff') navigate('/staff/ticketing');
        else navigate('/staff');
      } else {
        setError('Incorrect password. Access denied.');
        setLoading(false);
      }
    }, 300);
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
            
            {/* Email / Username Field */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 ml-1 font-mono">
                Email Address or Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#40E0D0]">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="kartingstaff or kartingstaff@deucepark.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#0A0A0A]/50 border border-[#00ABAB]/30 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#3E8EDE] focus:ring-1 focus:ring-[#40E0D0] transition-all font-medium font-mono"
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

            {/* Google Sign-in Alternative */}
            <div className="mt-4 pt-4 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={async () => {
                  setError(null);
                  setLoading(true);
                  try {
                    const defaultEmail = email.trim() || 'admin@deucepark.com';
                    const promptEmail = window.prompt('Sign in with Google - Enter your Google Account Email:', defaultEmail);
                    if (!promptEmail || !promptEmail.trim()) {
                      setLoading(false);
                      return;
                    }
                    const cleanEmail = promptEmail.trim().toLowerCase();
                    const userName = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                    let authUser: any = null;
                    try {
                      const res = await fetch('/api/auth/google', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: cleanEmail, name: userName, googleId: `gid_${Date.now()}` })
                      });
                      const data = await res.json();
                      if (data && data.success && data.user) {
                        authUser = data.user;
                      }
                    } catch (e) {
                      console.warn('Backend Google Auth error:', e);
                    }

                    if (!authUser) {
                      const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
                      if (existing) {
                        authUser = existing;
                        let role: any = 'customer';
                        if (cleanEmail.includes('admin') || cleanEmail.includes('director') || cleanEmail.includes('leader')) role = 'super_admin';
                        else if (cleanEmail.includes('kartingmanager') || cleanEmail.includes('karting_manager')) role = 'go_karting_manager';
                        else if (cleanEmail.includes('karting')) role = 'go_karting_staff';
                        else if (cleanEmail.includes('ticketing') || cleanEmail.includes('counter') || cleanEmail.includes('ticket')) role = 'ticket_counter_staff';
                        else if (cleanEmail.includes('horse')) role = 'horse_riding_staff';
                        else if (cleanEmail.includes('shooting')) role = 'shooting_staff';
                        else if (cleanEmail.includes('cafe') || cleanEmail.includes('vendor')) role = 'food_vendor';
                        else if (cleanEmail.includes('staff') || cleanEmail.endsWith('@deucepark.com') || cleanEmail.endsWith('@adventurepark.com')) role = 'activity_staff';

                        authUser = {
                          id: `usr-g-${Date.now()}`,
                          name: userName,
                          email: cleanEmail,
                          role,
                          organizationId: 'org_deuce_default'
                        };
                      }
                    }

                    setCurrentUser(authUser);
                    setLoading(false);

                    if (authUser.role === 'super_admin') navigate('/admin');
                    else if (authUser.role === 'go_karting_manager' || authUser.role === 'go_karting_staff') navigate('/staff/karting');
                    else if (authUser.role === 'horse_riding_staff') navigate('/staff/horse-riding');
                    else if (authUser.role === 'shooting_staff') navigate('/staff/shooting');
                    else if (authUser.role === 'food_vendor' || authUser.role === 'cafe_staff') navigate('/staff/cafe');
                    else if (authUser.role === 'ticket_counter_staff') navigate('/staff/ticketing');
                    else if (authUser.role === 'activity_staff') navigate('/staff');
                    else navigate('/');
                  } catch (err: any) {
                    setError('Google sign-in failed. Please try again.');
                    setLoading(false);
                  }
                }}
                className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-teal-400/40 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-3 transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Google
              </button>
            </div>
          </form>

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
          </div>
        </div>
      </header>
      <main className="flex-1 w-full mx-auto">
        {children}
      </main>
      <NotificationToast />
      <footer className="border-t border-[#00ABAB]/30 bg-[#0A0A0A]/90 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
          <div className="text-[#94A3B8]">
            Deuce Racing & Deuce Park • Premium Destination
          </div>
          <Link 
            to="/login" 
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-[#14F1D9]/10 border border-white/10 text-white hover:text-[#14F1D9] font-bold transition-all flex items-center gap-2 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#14F1D9]" />
            <span>Staff Portal Login</span>
          </Link>
        </div>
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
                  title="Horse Riding Staff Portal" 
                  subtitle="Manage horse riding queue, guide assignments, rider check-ins, and safety checks"
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
        <div className="fixed top-4 right-4 z-50">
          <PWAInstallPrompt />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
