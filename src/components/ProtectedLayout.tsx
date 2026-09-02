import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { NotificationToast } from './NotificationToast';
import { LogOut, X, HelpCircle } from 'lucide-react';

export const ProtectedLayout: React.FC = () => {
  const { currentUser, setCurrentUser } = useAppContext();
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(true);

  if (!currentUser) return null;

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col text-[#FFFFFF] font-sans selection:bg-[#007B8B]/30 selection:text-white bg-transparent">
      
      {/* Top Banner and Navigation Bar (Glassmorphic) */}
      <header className="sticky top-0 z-30 glass-panel border-b border-[#00ABAB]/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <img 
              src="/deuce-logo.jpg" 
              alt="Deuce Logo" 
              className="w-10 h-10 rounded-xl object-cover shadow-[0_4px_12px_rgba(20,241,217,0.3)] border border-[#14F1D9]/40 transform hover:scale-105 transition-transform"
            />
            <div>
              <h1 className="font-black text-2xl leading-none tracking-tight text-gradient font-sans uppercase">Deuce</h1>
              <p className="text-[9px] text-[#40E0D0] tracking-widest font-mono uppercase font-bold mt-1">Live The Rush • Yelagiri</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#0A0A0A]/50 border border-[#00ABAB]/30 rounded-2xl px-3.5 py-1.5 ">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#007B8B] to-[#3E8EDE] text-white flex items-center justify-center font-black text-xs">
                {currentUser.name[0]}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[11px] font-bold text-white leading-tight">
                  {currentUser.name}
                </p>
                <span className="text-[8.5px] uppercase tracking-wider font-extrabold text-[#40E0D0] leading-none font-mono">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn-glow text-xs font-bold px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all flex items-center gap-2 "
              title="Logout Session"
            >
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        {showHelp && (
          <div className="glass-panel p-6 rounded-3xl relative shadow-[0_8px_32px_rgba(20,184,166,0.1)] overflow-hidden mb-6">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#00ABAB]/20 rounded-full blur-3xl pointer-events-none"></div>
            <button
              id="btn-close-help"
              onClick={() => setShowHelp(false)}
              className="absolute top-4 right-4 text-[#40E0D0] hover:text-[#99F6E4] transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <div className="flex gap-4 text-xs leading-relaxed relative z-10">
              <HelpCircle className="h-6 w-6 text-[#3E8EDE] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-white text-base">🛡️ Active Secure Dashboard:</p>
                <p className="mt-1 text-[#94A3B8]">
                  You are logged in as <strong className="text-[#40E0D0]">{currentUser.name}</strong>. Access permissions have been locked down for your role.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>

      <NotificationToast />

      <footer className="border-t border-[#00ABAB]/30 bg-[#0A0A0A]/80 py-6 mt-12 text-center text-[10px] text-[#40E0D0] font-mono tracking-wider">
        Deuce Racing & Deuce Park • Management Systems Platform
      </footer>
    </div>
  );
};








