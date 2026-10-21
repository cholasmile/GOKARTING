/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, Lock, KeyRound, LogIn, User as UserIcon, X, 
  ShieldCheck, AlertTriangle, UserPlus, Compass, ArrowRight
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { User, UserRole } from '../types';

interface UnifiedLoginModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  isPageMode?: boolean;
}

export const UnifiedLoginModal: React.FC<UnifiedLoginModalProps> = ({
  isOpen = true,
  onClose,
  isPageMode = false
}) => {
  const { users, setCurrentUser, addUser } = useAppContext();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  
  // Sign-in states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Registration states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Helper for staff redirection after login
  const handleRoleRedirection = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        navigate('/admin');
        break;
      case 'go_karting_manager':
      case 'go_karting_staff':
        navigate('/staff/karting');
        break;
      case 'horse_riding_staff':
        navigate('/staff/horse-riding');
        break;
      case 'shooting_staff':
        navigate('/staff/shooting');
        break;
      case 'food_vendor':
      case 'cafe_staff':
      case 'ticket_counter_staff':
        navigate('/staff/ticketing');
        break;
      case 'activity_staff':
        navigate('/staff');
        break;
      case 'customer':
      default:
        if (isPageMode) {
          navigate('/');
        } else if (onClose) {
          onClose();
        }
        break;
    }
  };

  // Sign In Handler
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const input = email.trim();
    if (!input) {
      setError('Please enter your Cell No or Email ID.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const normalizedInput = input.toLowerCase();
      const cleanDigits = input.replace(/\D/g, '');

      const matchedUser = users.find(u => {
        const emailMatch = u.email.toLowerCase() === normalizedInput;
        const phoneDigits = u.phone ? u.phone.replace(/\D/g, '') : '';
        const phoneMatch = cleanDigits.length > 3 && phoneDigits.endsWith(cleanDigits);
        return emailMatch || phoneMatch;
      });

      if (matchedUser) {
        // Staff password validation
        if (matchedUser.role !== 'customer') {
          const isValidStaffPassword =
            (matchedUser.role === 'super_admin' && password === 'admin') ||
            (matchedUser.role === 'activity_staff' && password === 'staff') ||
            ((matchedUser.role === 'food_vendor' || matchedUser.role === 'cafe_staff') && (password === 'vendor' || password === 'cafe' || password === 'staff')) ||
            (matchedUser.role === 'go_karting_manager' && (password === 'manager' || password === 'staff' || password === 'karting')) ||
            (matchedUser.role === 'go_karting_staff' && (password === 'staff' || password === 'karting')) ||
            (matchedUser.role === 'horse_riding_staff' && (password === 'staff' || password === 'horse')) ||
            (matchedUser.role === 'shooting_staff' && (password === 'staff' || password === 'shooting')) ||
            (matchedUser.role === 'ticket_counter_staff' && (password === 'staff' || password === 'ticketing'));

          if (!isValidStaffPassword) {
            setError('Invalid password for staff account. Please check your credentials.');
            setLoading(false);
            return;
          }
        } else {
          // Customer password validation
          if (matchedUser.password && matchedUser.password !== password) {
            setError('Invalid password. Please check your credentials.');
            setLoading(false);
            return;
          }
        }

        // Authenticated successfully
        setCurrentUser(matchedUser);
        setLoading(false);
        handleRoleRedirection(matchedUser.role);
      } else {
        setError('Account not found with this Cell No or Email ID. Please register for a new account.');
        setLoading(false);
      }
    }, 600);
  };

  // Google Sign In Handler
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const defaultEmail = email.trim() || 'googleuser@gmail.com';
      const promptEmail = window.prompt('Sign in with Google - Enter your Google Account Email:', defaultEmail);
      if (!promptEmail || !promptEmail.trim()) {
        setLoading(false);
        return;
      }
      const cleanEmail = promptEmail.trim().toLowerCase();
      const userName = cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      let authUser: User | null = null;
      try {
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            name: userName,
            googleId: `gid_${Date.now()}`
          })
        });
        const data = await res.json();
        if (data && data.success && data.user) {
          authUser = data.user;
        }
      } catch (err) {
        console.warn('Backend Google Auth endpoint unreachable, generating local user:', err);
      }

      if (!authUser) {
        const existing = users.find(u => u.email.toLowerCase() === cleanEmail);
        if (existing) {
          authUser = existing;
        } else {
          let role: UserRole = 'customer';
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

      addUser(authUser);
      setCurrentUser(authUser);
      setLoading(false);
      handleRoleRedirection(authUser.role);
    } catch (err) {
      console.error('Google Sign In error:', err);
      setError('Google Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  // Registration Handler
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regName.trim() || !regEmail.trim()) {
      setError('Full Name and Email Address are required.');
      return;
    }
    if (!regPassword) {
      setError('Please set a password for your account.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    const normalizedEmail = regEmail.trim().toLowerCase();
    const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      setError('An account with this Email ID already exists. Please log in.');
      return;
    }

    const newMember: User = {
      id: `usr-cust-${Date.now()}`,
      name: regName.trim(),
      email: normalizedEmail,
      phone: regPhone.trim() || undefined,
      password: regPassword,
      role: 'customer',
      organizationId: 'org_deuce_default'
    };

    addUser(newMember);
    setCurrentUser(newMember);
    handleRoleRedirection('customer');
  };

  // Quick Demo Account Click Handler
  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    const normalizedEmail = demoEmail.toLowerCase();
    const matchedUser = users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (matchedUser) {
      setCurrentUser(matchedUser);
      handleRoleRedirection(matchedUser.role);
    } else {
      const newMember: User = {
        id: `usr-cust-${Date.now()}`,
        name: demoEmail.split('@')[0],
        email: demoEmail,
        role: 'customer',
        organizationId: 'org_deuce_default'
      };
      addUser(newMember);
      setCurrentUser(newMember);
      handleRoleRedirection('customer');
    }
  };

  // Guest Mode Handler
  const handleContinueAsGuest = () => {
    setCurrentUser(null);
    if (isPageMode) {
      navigate('/');
    } else if (onClose) {
      onClose();
    }
  };

  if (!isOpen && !isPageMode) return null;

  const content = (
    <div className={`w-[#95%] ${isPageMode ? 'max-w-lg mx-auto' : 'max-w-md'} glass-panel rounded-3xl p-6 sm:p-8 border border-[#14F1D9]/30 shadow-[0_0_50px_rgba(20,241,217,0.15)] relative overflow-hidden text-white`}>
      
      {/* Background glow effects */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#14F1D9]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#00B4FF]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Close button for Modal Mode */}
      {!isPageMode && onClose && (
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer border border-white/10 z-20"
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Brand Header */}
      <div className="text-center mb-6 relative z-10">
        <div className="inline-flex items-center gap-3 mb-2">
          <img 
            src="/deuce-logo.jpg" 
            alt="Deuce Logo" 
            className="w-12 h-12 rounded-2xl object-cover shadow-[0_4px_20px_rgba(20,241,217,0.3)] border border-[#14F1D9]/40"
          />
          <div className="text-left">
            <h2 className="text-2xl font-black tracking-tight text-gradient uppercase leading-none">
              Deuce
            </h2>
            <p className="text-[9px] text-[#40E0D0] tracking-[0.2em] font-mono uppercase font-bold mt-1">
              Live The Rush • Yelagiri
            </p>
          </div>
        </div>
        <p className="text-xs text-[#94A3B8] max-w-xs mx-auto">
          System Login & Account Portal
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-[#050816]/80 p-1 rounded-2xl border border-white/10 mb-6 relative z-10">
        <button
          type="button"
          onClick={() => { setActiveTab('signin'); setError(null); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'signin'
              ? 'bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] shadow-[0_0_15px_rgba(20,241,217,0.3)]'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" />
          <span>Account Login</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('register'); setError(null); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'register'
              ? 'bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] shadow-[0_0_15px_rgba(20,241,217,0.3)]'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>New Registration</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs mb-5 flex items-center gap-2 font-medium animate-shake relative z-10">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Google Sign In Action */}
      <div className="mb-5 relative z-10">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold transition-all flex items-center justify-center gap-3 cursor-pointer shadow-sm hover:border-white/30"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0b101b] px-2 text-[#94A3B8] font-mono text-[9px]">Or use credentials</span>
          </div>
        </div>
      </div>

      {/* Tab Content: Sign In */}
      {activeTab === 'signin' ? (
        <form onSubmit={handleSignIn} className="space-y-4 relative z-10">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 ml-1 font-mono">
              Cell No / Email ID
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#40E0D0]">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                placeholder="email@example.com or 9876543210"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#050816]/90 border border-[#00ABAB]/30 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 ml-1 font-mono">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#40E0D0]">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#050816]/90 border border-[#00ABAB]/30 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9] transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black text-xs uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-[0_0_20px_rgba(20,241,217,0.3)] flex items-center justify-center gap-2 mt-5"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[#0B1120]/30 border-t-[#0B1120] rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* Tab Content: Register */
        <form onSubmit={handleRegister} className="space-y-4 relative z-10">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 ml-1 font-mono">
              Full Name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#40E0D0]">
                <UserIcon className="h-4 w-4" />
              </span>
              <input
                type="text"
                required
                placeholder="John Watson"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                className="w-full bg-[#050816]/90 border border-[#00ABAB]/30 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 ml-1 font-mono">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#40E0D0]">
                <Mail className="h-4 w-4" />
              </span>
              <input
                type="email"
                required
                placeholder="watson@baker.street"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                className="w-full bg-[#050816]/90 border border-[#00ABAB]/30 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 ml-1 font-mono">
              Cell No / Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={regPhone}
                onChange={e => setRegPhone(e.target.value)}
                className="w-full bg-[#050816]/90 border border-[#00ABAB]/30 rounded-2xl py-2.5 px-4 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 ml-1 font-mono">
              Set Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#40E0D0]">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                className="w-full bg-[#050816]/90 border border-[#00ABAB]/30 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-1.5 ml-1 font-mono">
              Confirm Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#40E0D0]">
                <Lock className="h-4 w-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={regConfirmPassword}
                onChange={e => setRegConfirmPassword(e.target.value)}
                className="w-full bg-[#050816]/90 border border-[#00ABAB]/30 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#14F1D9] focus:ring-1 focus:ring-[#14F1D9] transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#14F1D9] to-[#00B4FF] text-[#0B1120] font-black text-xs uppercase tracking-widest hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer shadow-[0_0_20px_rgba(20,241,217,0.3)] flex items-center justify-center gap-2 mt-5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Member Account</span>
          </button>
        </form>
      )}

      {/* Guest Mode Action Bar */}
      <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
        <span className="text-[10px] font-mono text-[#94A3B8] uppercase font-bold">Or Explore Without Login:</span>
        <button
          type="button"
          onClick={handleContinueAsGuest}
          className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer font-mono"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Continue as Guest</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

    </div>
  );

  if (isPageMode) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans select-none py-12">
        <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-[#007B8B]/10 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] bg-[#00ABAB]/10 rounded-full blur-[150px] pointer-events-none"></div>
        
        {content}

        <p className="text-center text-[9px] text-[#94A3B8] font-mono tracking-widest uppercase mt-6 flex justify-between px-2 w-full max-w-lg">
          <span>Deuce Operating System</span>
          <button 
            type="button" 
            onClick={() => navigate('/')} 
            className="text-[#3E8EDE] hover:text-[#40E0D0] transition-colors cursor-pointer"
          >
            Return to Track
          </button>
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#050816]/90 z-50 flex items-center justify-center p-4 backdrop-blur-xl overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="my-auto w-full flex justify-center"
        >
          {content}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
