import React, { useEffect, useState } from 'react';
import { Timer, Trophy, Zap } from 'lucide-react';
import { LapRecord } from '../../types';
import { useAppContext } from '../../context/AppContext';

interface LiveTimingTableProps {
  sessionId: string;
}

const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const tenths = Math.floor((ms % 1000) / 100);
  return `${seconds}.${tenths}`;
};

const LiveTimingTable: React.FC<LiveTimingTableProps> = ({ sessionId }) => {
  const { lapRecords } = useAppContext();
  const [records, setRecords] = useState<LapRecord[]>([]);

  useEffect(() => {
    // Read from global state instead of mock
    const sessionRecords = lapRecords.filter(r => r.sessionId === sessionId);
    // Sort by fastest lap
    const sorted = [...sessionRecords].sort((a, b) => a.lapTime - b.lapTime);
    setRecords(sorted);
  }, [sessionId, lapRecords]);

  if (records.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-[#94A3B8] border-2 border-dashed border-[#1C1C1C] rounded-xl bg-[#0A0A0A]">
        <Timer className="w-10 h-10 mb-3 opacity-20" />
        <p className="font-bold">Awaiting Telemetry</p>
        <p className="text-xs">Drivers have not completed their out-lap.</p>
      </div>
    );
  }

  const fastestOverall = records[0].lapTime;

  return (
    <div className="bg-[#0A0A0A] rounded-xl border border-[#1C1C1C] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-[#141414] text-[#94A3B8] text-[10px] uppercase tracking-wider font-mono border-b border-[#1C1C1C]">
            <tr>
              <th className="py-3 px-4 w-12">Pos</th>
              <th className="py-3 px-4">Driver Name</th>
              <th className="py-3 px-4 text-center">Kart</th>
              <th className="py-3 px-4 text-right">Best Lap</th>
              <th className="py-3 px-4 text-right">Gap</th>
              <th className="py-3 px-4 text-center">Laps</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C1C1C]">
            {records.map((record, index) => {
              const isP1 = index === 0;
              const gap = isP1 ? '-' : `+${formatTime(record.lapTime - fastestOverall)}`;
              
              return (
                <tr key={record.id} className="hover:bg-[#1C1C1C]/50 transition-colors">
                  <td className="py-3 px-4">
                    {isP1 ? (
                      <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold text-xs border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                        1
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#1C1C1C] text-[#94A3B8] flex items-center justify-center font-bold text-xs">
                        {index + 1}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-bold ${isP1 ? 'text-white' : 'text-[#E2E8F0]'}`}>
                      {record.driverName}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-mono text-xs bg-[#1C1C1C] text-[#40E0D0] px-2 py-1 rounded border border-[#00ABAB]/30">
                      {record.kartNumber}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {record.isFastestLap && <Zap className="w-3 h-3 text-purple-400" />}
                      <span className={`font-mono font-bold ${record.isFastestLap ? 'text-purple-400' : isP1 ? 'text-[#40E0D0]' : 'text-white'}`}>
                        {formatTime(record.lapTime)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-[#94A3B8]">
                    {gap}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-xs text-[#E2E8F0]">
                    {record.lapNumber}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="bg-[#141414] p-3 text-[10px] text-[#94A3B8] font-mono tracking-wider flex justify-between border-t border-[#1C1C1C]">
        <span>Status: GREEN FLAG</span>
        <span className="flex items-center gap-1 text-purple-400"><Zap className="w-3 h-3" /> Purple Sector = Session Fastest</span>
      </div>
    </div>
  );
};

export default LiveTimingTable;
