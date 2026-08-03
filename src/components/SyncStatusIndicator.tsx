import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const SyncStatusIndicator: React.FC = () => {
  const { isOnline, syncStatus, pendingSyncCount } = useAppContext();

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-[#050816]/90 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 shadow-lg">
      {isOnline ? (
        <Wifi className="w-4 h-4 text-emerald-400" />
      ) : (
        <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
      )}
      
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-white uppercase tracking-widest leading-none">
          {isOnline ? 'Online' : 'Offline Mode'}
        </span>
        {pendingSyncCount > 0 && (
          <span className="text-[9px] text-[#9CA3AF] font-mono leading-none mt-0.5">
            {pendingSyncCount} pending
          </span>
        )}
      </div>

      {syncStatus === 'syncing' && (
        <RefreshCw className="w-3.5 h-3.5 text-[#00B4FF] animate-spin ml-2" />
      )}
      {syncStatus === 'error' && (
        <span className="w-2 h-2 rounded-full bg-red-500 ml-2 animate-ping" title="Sync Error" />
      )}
    </div>
  );
};
