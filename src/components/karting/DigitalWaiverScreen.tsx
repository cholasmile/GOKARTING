import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, PenTool, CheckCircle, X } from 'lucide-react';

interface DigitalWaiverScreenProps {
  ticketId: string;
  riderName: string;
  onComplete: (signature: string) => void;
  onCancel: () => void;
}

const DigitalWaiverScreen: React.FC<DigitalWaiverScreenProps> = ({ ticketId, riderName, onComplete, onCancel }) => {
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (agreed && signature.trim().length > 2) {
      onComplete(signature);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0A0A0A] p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#1C1C1C] border border-[#00ABAB]/30 rounded-3xl shadow-[0_0_50px_rgba(0,171,171,0.15)] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#40E0D0] text-[#0A0A0A] p-6 text-center relative">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-90" />
          <h2 className="text-2xl font-black uppercase tracking-tight">Digital Waiver & Release</h2>
          <p className="font-mono text-xs font-bold mt-1 opacity-80">Ticket: {ticketId}</p>
          <button onClick={onCancel} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-6 text-[#E2E8F0] h-[400px] overflow-y-auto custom-scrollbar">
          
          <div className="bg-[#0A0A0A]/50 border border-yellow-500/20 rounded-xl p-4 flex gap-4 text-yellow-500">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm">Motorsport activities involve inherent risks. By signing this document, you are assuming all risks associated with Go Karting at Deuce Racing.</p>
          </div>

          <div className="space-y-4 text-sm leading-relaxed text-[#94A3B8]">
            <h3 className="text-white font-bold text-lg">Terms & Conditions</h3>
            <p>1. <strong>Assumption of Risk:</strong> I understand that Go Karting is a high-speed motorsport that poses risks of serious injury or death. I voluntarily assume all such risks.</p>
            <p>2. <strong>Physical Condition:</strong> I certify that I am in good physical condition and have no medical conditions (e.g., heart conditions, back issues, pregnancy) that would prevent me from safely participating.</p>
            <p>3. <strong>Safety Rules:</strong> I agree to obey all track rules and follow instructions given by track marshals. I will wear the provided safety helmet and gear at all times while in the kart.</p>
            <p>4. <strong>Zero Tolerance:</strong> No bumper car driving, reckless behavior, or driving under the influence of alcohol or drugs. Track officials may remove me without refund for unsafe driving.</p>
            <p>5. <strong>Release of Liability:</strong> I hereby release, waive, and discharge Deuce Racing, its owners, operators, and staff from any liability for personal injury, property damage, or wrongful death.</p>
          </div>
        </div>

        {/* Signature Area */}
        <div className="bg-[#141414] p-6 border-t border-[#00ABAB]/20">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-1">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <div className="w-5 h-5 rounded border border-[#00ABAB] peer-checked:bg-[#40E0D0] peer-checked:border-[#40E0D0] transition-colors"></div>
                <CheckCircle className="absolute w-3.5 h-3.5 text-[#0A0A0A] opacity-0 peer-checked:opacity-100 transition-opacity" />
              </div>
              <span className="text-sm text-[#94A3B8] group-hover:text-white transition-colors">
                I, <strong className="text-white">{riderName}</strong>, have read, understood, and agree to the terms outlined in this Liability Waiver.
              </span>
            </label>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] font-bold mb-2 font-mono">
                Digital Signature (Type Full Name)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#40E0D0]">
                  <PenTool className="h-4.5 w-4.5" />
                </span>
                <input
                  type="text"
                  required
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type your name to sign"
                  className="w-full bg-[#0A0A0A] border border-[#00ABAB]/30 rounded-xl py-4 pl-11 pr-4 text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#40E0D0] transition-all font-serif italic text-lg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!agreed || signature.trim().length < 3}
              className="w-full btn-glow font-bold py-4 rounded-xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Waiver
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default DigitalWaiverScreen;
