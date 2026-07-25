/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Mail, MessageSquare, PhoneCall, Bell, X, ShieldAlert, Trash2 } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { notifications, resetAllData } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<'all' | 'email' | 'sms' | 'whatsapp'>('all');

  const filtered = notifications.filter(n => {
    if (activeChannel === 'all') return true;
    return n.channel === activeChannel;
  });

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4 text-[#1E88E5]" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4 text-[#4DD0A8]" />;
      case 'whatsapp':
        return <PhoneCall className="h-4 w-4 text-[#00A86B]" />;
      default:
        return <Bell className="h-4 w-4 text-amber-500" />;
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'email':
        return <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#1E88E5]/10 text-[#1E88E5] border border-[#1E88E5]/20">Email</span>;
      case 'sms':
        return <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#4DD0A8]/10 text-[#4DD0A8] border border-[#4DD0A8]/20">SMS</span>;
      case 'whatsapp':
        return <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#00A86B]/10 text-[#00A86B] border border-[#00A86B]/20">WhatsApp</span>;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Floating Trigger (Glassmorphic Glow Button) */}
      <div className="fixed bottom-24 right-6 z-40">
        <button
          id="btn-trigger-notifications"
          onClick={() => setIsOpen(true)}
          className="relative btn-glow text-[#0B0F14] rounded-full p-4  border border-[#3E8EDE] transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-pointer"
        >
          <Bell className="h-5.5 w-5.5 text-[#0B0F14]" />
          {notifications.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 font-mono font-extrabold text-[10px] w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 border-white  animate-bounce">
              {notifications.length}
            </span>
          )}
        </button>
      </div>

      {/* Slide-out Panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end transition-opacity">
          <div className="w-full max-w-md glass-panel h-full shadow-2xl flex flex-col border-l border-[#00ABAB]/30 animate-slide-in">
            
            {/* Header */}
            <div className="p-5 bg-teal-700 text-[#0B0F14] flex items-center justify-between border-b border-teal-800 ">
              <div className="flex items-center gap-3">
                <Bell className="h-5.5 w-5.5 text-teal-200" />
                <div>
                  <h3 className="font-extrabold text-sm tracking-wide">System Notification Hub</h3>
                  <p className="text-[10px] text-teal-100/90 font-mono">Real-time simulator logs</p>
                </div>
              </div>
              <button
                id="btn-close-notif-panel"
                onClick={() => setIsOpen(false)}
                className="hover:bg-teal-800 p-1.5 rounded-xl transition-colors text-teal-100 hover:text-[#0B0F14] cursor-pointer border border-transparent hover:border-teal-600"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Warning alerts / system resets */}
            <div className="p-3.5 bg-[#0A0A0A] border-b border-[#00ABAB]/30 flex items-center justify-between gap-3 text-xs text-[#9CA3AF]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4.5 w-4.5 text-[#3E8EDE] flex-shrink-0" />
                <span>Working in <strong className="text-[#FFFFFF] font-semibold">Vite Demo Sandbox</strong> mode.</span>
              </div>
              <button
                id="btn-reset-db"
                onClick={() => {
                  if (confirm('Are you sure you want to reset all data and clear custom bookings?')) {
                    resetAllData();
                    setIsOpen(false);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 transition-colors border border-red-200 text-red-700 text-[10px] font-mono font-bold cursor-pointer"
              >
                <Trash2 className="h-3 w-3 text-red-500" /> Reset DB
              </button>
            </div>

            {/* Filter Pills */}
            <div className="p-3 bg-[#121A24]/60 border-b border-[#00ABAB]/30 flex gap-2 overflow-x-auto text-xs">
              {(['all', 'email', 'sms', 'whatsapp'] as const).map(ch => (
                <button
                  key={ch}
                  id={`btn-filter-notif-${ch}`}
                  onClick={() => setActiveChannel(ch)}
                  className={`px-3.5 py-1.5 rounded-xl border transition-all text-[11px] font-bold capitalize cursor-pointer ${
                    activeChannel === ch
                      ? 'btn-glow text-[#0B0F14] border-none '
                      : 'glass-panel border-[#00ABAB]/30 text-[#9CA3AF] hover:text-teal-700 hover:bg-[#0A0A0A]/50'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {filtered.length === 0 ? (
                <div className="text-center py-24 text-[#9CA3AF] text-xs">
                  <Bell className="h-10 w-10 mx-auto mb-3 opacity-25 text-teal-300" />
                  <p className="font-sans">No notifications captured.</p>
                  <p className="text-[10px] mt-1.5 text-[#9CA3AF] leading-relaxed font-mono">Book guest tickets or dispatch concession orders to watch active alerts stream in real-time!</p>
                </div>
              ) : (
                filtered.map(notif => (
                  <div 
                    key={notif.id} 
                    id={`notif-card-${notif.id}`}
                    className="p-4 glass-panel border border-[#00ABAB]/30 rounded-xl  hover:border-teal-300 hover: transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-[#0A0A0A] border border-slate-100 flex items-center justify-center">
                          {getChannelIcon(notif.channel)}
                        </span>
                        <span className="font-mono text-[9px] text-[#9CA3AF]">
                          {new Date(notif.sentAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {getChannelBadge(notif.channel)}
                    </div>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-[#FFFFFF] text-xs">{notif.title}</div>
                      <div className="text-[#9CA3AF] font-mono text-[10px] truncate">Recipient: {notif.recipient}</div>
                      <p className="text-[#9CA3AF] mt-2 leading-relaxed bg-[#0A0A0A] p-2.5 rounded-lg border border-slate-100 font-sans">
                        {notif.body}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[#0A0A0A] border-t border-[#00ABAB]/30 text-[10px] text-center text-[#9CA3AF] font-mono tracking-wider">
              Simulation System Console â€¢ LocalStorage Persistence
            </div>
          </div>
        </div>
      )}
    </>
  );
};








