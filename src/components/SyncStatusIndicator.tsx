import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Wifi, WifiOff, RefreshCw, Zap } from 'lucide-react';
import { syncEngine } from '../lib/syncEngine';

export const SyncStatusIndicator: React.FC = () => {
  const { isOnline, syncStatus, pendingSyncCount, isRealtimeActive } = useAppContext();

  const handleManualSync = () => {
    if (isOnline) {
      syncEngine.triggerSync();
    }
  };

  return (
    <div 
      onClick={handleManualSync}
      title={isOnline ? 'Connected to Cloud Realtime Data Stream. Click to force manual sync.' : 'Offline Mode. All actions saved locally to IndexedDB/System.'}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 bg-[#050816]/95 backdrop-blur-md border border-white/15 rounded-full px-3.5 py-2 shadow-2xl hover:border-white/30 transition-all cursor-pointer group"
    >
      {isOnline ? (
        <div className="relative">
          <Wifi className="w-4 h-4 text-emerald-400" />
          {isRealtimeActive && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
          )}
        </div>
      ) : (
        <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
      )}
      
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-extrabold text-white uppercase tracking-wider leading-none">
            {isOnline ? 'Online' : 'Offline OS'}
          </span>
          {isOnline && isRealtimeActive && (
            <span className="flex items-center gap-0.5 text-[8px] bg-emerald-500/20 text-emerald-300 font-semibold px-1 py-0.2 rounded border border-emerald-500/30">
              <Zap className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" /> Realtime
            </span>
          )}
        </div>
        
        <span className="text-[9px] text-[#9CA3AF] font-mono leading-none mt-1">
          {pendingSyncCount > 0 ? (
            <span className="text-amber-300 font-bold">{pendingSyncCount} offline queued items</span>
          ) : (
            isOnline ? 'All data synchronized' : 'Saved to system DB'
          )}
        </span>
      </div>

      {syncStatus === 'syncing' && (
        <RefreshCw className="w-3.5 h-3.5 text-[#00B4FF] animate-spin ml-1" />
      )}
      {syncStatus === 'error' && (
        <span className="w-2 h-2 rounded-full bg-red-500 ml-1 animate-ping" title="Sync Error - Retrying..." />
      )}
    </div>
  );
};
