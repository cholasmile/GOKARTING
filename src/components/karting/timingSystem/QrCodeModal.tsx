import React from 'react';
import { X, QrCode as QrIcon, Smartphone, Share2, Copy } from 'lucide-react';

interface QrCodeModalProps {
  raceId: string;
  raceName: string;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ raceId, raceName, onClose }) => {
  const liveUrl = `${window.location.origin}/race/live/${raceId}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(liveUrl);
    alert('Live spectator URL copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-sans select-none">
      <div className="glass-panel w-full max-w-sm p-6 rounded-3xl border border-[#14F1D9]/40 bg-[#050816] text-white text-center space-y-4 shadow-[0_0_40px_rgba(20,241,217,0.25)] relative overflow-hidden">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#14F1D9]" />
            <span className="font-mono text-xs font-bold text-[#14F1D9] uppercase tracking-wider">Mobile Live Spectator Pass</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full bg-white/5 hover:bg-white/20 text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="font-black text-lg text-white uppercase tracking-tight">{raceName}</h3>
          <p className="text-[10px] text-[#9CA3AF] font-mono mt-0.5">SCAN TO WATCH LIVE RACE ON MOBILE</p>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white rounded-2xl inline-block shadow-2xl border-4 border-[#14F1D9]">
          <svg className="w-44 h-44" viewBox="0 0 100 100">
            <rect width="100" height="100" fill="white" />
            <rect x="5" y="5" width="25" height="25" fill="black" />
            <rect x="8" y="8" width="19" height="19" fill="white" />
            <rect x="12" y="12" width="11" height="11" fill="black" />
            
            <rect x="70" y="5" width="25" height="25" fill="black" />
            <rect x="73" y="8" width="19" height="19" fill="white" />
            <rect x="77" y="12" width="11" height="11" fill="black" />

            <rect x="5" y="70" width="25" height="25" fill="black" />
            <rect x="8" y="73" width="19" height="19" fill="white" />
            <rect x="12" y="77" width="11" height="11" fill="black" />

            {[...Array(30)].map((_, i) => (
              <rect key={i} x={35 + (i * 7) % 35} y={10 + (i * 3) % 55} width="4" height="4" fill="black" />
            ))}
            {[...Array(25)].map((_, i) => (
              <rect key={i} x={10 + (i * 9) % 55} y={35 + (i * 4) % 35} width="4" height="4" fill="black" />
            ))}
          </svg>
        </div>

        <div className="p-2.5 bg-[#0B1120] rounded-xl border border-white/10 text-[10px] font-mono text-[#9CA3AF] truncate">
          {liveUrl}
        </div>

        <div className="flex gap-2">
          <button 
            onClick={copyUrl}
            className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" /> Copy URL
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#14F1D9] text-[#050816] font-black text-xs uppercase cursor-pointer hover:bg-[#00B4FF]"
          >
            Close QR
          </button>
        </div>
      </div>
    </div>
  );
};
