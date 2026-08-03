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
import { Mail, Lock, KeyRound } from 'lucide-react';

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
        (matchedUser?.role === 'food_vendor' && password === 'vendor') ||
        (matchedUser?.role === 'go_karting_manager' && password === 'manager') ||
        (matchedUser?.role === 'go_karting_staff' && password === 'staff') ||
        (matchedUser?.role === 'ticket_counter_staff' && password === 'staff');

      if (matchedUser && isValidPassword) {
        setCurrentUser(matchedUser);
        
        if (matchedUser.role === 'super_admin') navigate('/admin');
        else if (matchedUser.role === 'activity_staff') navigate('/staff');
        else if (matchedUser.role === 'food_vendor') navigate('/vendor');
        else if (matchedUser.role === 'go_karting_manager') navigate('/staff/karting');
        else if (matchedUser.role === 'go_karting_staff') navigate('/staff/karting');
        else if (matchedUser.role === 'ticket_counter_staff') navigate('/staff/ticketing');
        else navigate('/');
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
            <div className="bg-gradient-to-tr from-[#007B8B] via-[#00ABAB] to-[#3E8EDE] text-white w-14 h-14 rounded-2xl flex items-center justify-center font-black text-3xl shadow-[0_8px_30px_rgba(20,184,166,0.4)] border border-white/20">
              D
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-black tracking-tight text-gradient uppercase leading-none">
                Deuce
              </h1>
              <p className="text-[11px] text-[#40E0D0] tracking-[0.3em] font-mono uppercase font-bold mt-1">
                Motorsport OS
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
                  placeholder="name@adventurepark.com"
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

// Wrapper for public layout with no explicit auth needed but some styling
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col text-[#FFFFFF] font-sans selection:bg-[#007B8B]/30 selection:text-white bg-transparent">
      <header className="sticky top-0 z-30 glass-panel border-b border-[#00ABAB]/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-[#007B8B] via-[#00ABAB] to-[#3E8EDE] text-white w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xl shadow-[0_4px_12px_rgba(20,184,166,0.3)] font-sans border border-white/20">
              D
            </div>
            <div>
              <h1 className="font-black text-2xl leading-none tracking-tight text-gradient font-sans uppercase">Deuce</h1>
              <p className="text-[9px] text-[#40E0D0] tracking-widest font-mono uppercase font-bold mt-1">Racing & Adventure</p>
            </div>
          </div>
          <Link to="/login" className="text-xs font-bold text-white px-4 py-2 rounded-lg btn-glow">
            Staff Portal
          </Link>
        </div>
      </header>
      <main className="flex-1 w-full mx-auto">
        {children}
      </main>
      <NotificationToast />
      <footer className="border-t border-[#00ABAB]/30 bg-[#0A0A0A]/80 py-6 text-center text-[10px] text-[#40E0D0] font-mono tracking-wider">
        Deuce Racing & Adventure Park • Premium Destination
      </footer>
    </div>
  );
};

import PublicLeaderboardScreen from './components/karting/PublicLeaderboardScreen';
import GoKartingOpsDashboard from './components/karting/GoKartingOpsDashboard';
import TicketingDashboard from './components/TicketingDashboard';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicLayout><CustomerDashboard /></PublicLayout>} />
          
          <Route path="/login" element={<LoginPage />} />
          
          <Route path="/leaderboard/karting" element={<PublicLeaderboardScreen />} />
          
          <Route element={<ProtectedLayout />}>
            <Route path="/admin/*" element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/staff/*" element={
              <ProtectedRoute allowedRoles={['activity_staff']}>
                <ActivityStaffDashboard />
              </ProtectedRoute>
            } />
            <Route path="/vendor/*" element={
              <ProtectedRoute allowedRoles={['food_vendor']}>
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







