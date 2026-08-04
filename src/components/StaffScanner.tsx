import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { useAppContext } from '../context/AppContext';
import { Ticket, Booking } from '../types';
import { CheckCircle, XCircle, AlertTriangle, ScanLine, Camera, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const StaffScanner: React.FC = () => {
  const { scanTicket, currentUser, bookings } = useAppContext();
  
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    message: string;
    ticket?: Ticket;
    isPendingPayment?: boolean;
    bookingId?: string;
  } | null>(null);
  
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(true);
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (isScannerActive) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true
        },
        /* verbose= */ false
      );
      
      scannerRef.current.render(onScanSuccess, onScanFailure);
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isScannerActive]);

  const processQrCode = (qrCodeMessage: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    // Simulate slight network delay for effect
    setTimeout(() => {
      const result = scanTicket(qrCodeMessage, currentUser?.name || 'Staff');
      setScanResult(result);
      setIsProcessing(false);
      setIsScannerActive(false); // Stop scanner on success/failure
    }, 500);
  };

  const onScanSuccess = (decodedText: string) => {
    processQrCode(decodedText);
  };

  const onScanFailure = (error: any) => {
    // We ignore failures as they happen continuously until a QR is found
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode) return;
    processQrCode(manualCode);
  };

  const resetScanner = () => {
    setScanResult(null);
    setManualCode('');
    setIsScannerActive(true);
  };

  return (
    <div className="flex flex-col text-white">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#1C1C1C]">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00ABAB] to-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(0,171,171,0.3)]">
          <ScanLine className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">Entry Scanner</h2>
          <p className="text-[#94A3B8] text-sm font-mono mt-1">Validate QR tickets & mark entries</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          {!scanResult ? (
            <motion.div key="scanner" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-6">
              
              <div className="glass-panel rounded-2xl overflow-hidden border border-[#00ABAB]/30 relative">
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 z-50 flex flex-col items-center justify-center backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-[#00ABAB] animate-spin mb-4" />
                    <p className="font-mono font-bold tracking-widest text-[#00ABAB]">VERIFYING TICKET...</p>
                  </div>
                )}
                
                {isScannerActive ? (
                  <div id="reader" className="w-full bg-[#0A0A0A] [&_video]:w-full [&_video]:object-cover" />
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center bg-[#0A0A0A]">
                    <Camera className="w-12 h-12 text-[#94A3B8] mb-4 opacity-50" />
                    <button onClick={() => setIsScannerActive(true)} className="btn-glow px-6 py-2 rounded-xl font-bold">Start Camera</button>
                  </div>
                )}
              </div>

              <div className="glass-panel p-6 rounded-2xl border border-[#1C1C1C]">
                <h3 className="text-sm font-bold text-[#94A3B8] uppercase tracking-wider mb-4">Manual Entry Fallback</h3>
                <form onSubmit={handleManualSubmit} className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Enter Ticket ID or QR Code..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="flex-1 bg-[#0A0A0A] border border-[#1C1C1C] rounded-xl px-4 py-2 text-white focus:border-[#00ABAB] focus:ring-1 focus:ring-[#00ABAB] outline-none font-mono"
                  />
                  <button type="submit" disabled={!manualCode || isProcessing} className="bg-[#1C1C1C] hover:bg-[#00ABAB] hover:text-black text-white px-6 py-2 rounded-xl font-bold transition-colors disabled:opacity-50">
                    Verify
                  </button>
                </form>
              </div>

            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-8 rounded-2xl border border-[#1C1C1C] flex-1 flex flex-col items-center justify-center text-center">
              
              {scanResult.success ? (
                <>
                  <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 border-2 border-emerald-500">
                    <CheckCircle className="w-12 h-12 text-emerald-400" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Access Granted</h3>
                  <p className="text-emerald-400 font-bold mb-8">{scanResult.message}</p>
                </>
              ) : scanResult.isPendingPayment ? (
                <>
                  <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center mb-6 border-2 border-amber-500">
                    <AlertTriangle className="w-12 h-12 text-amber-400" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Payment Required</h3>
                  <p className="text-amber-400 font-bold mb-8">{scanResult.message}</p>
                </>
              ) : (
                <>
                  <div className="w-24 h-24 rounded-full bg-rose-500/20 flex items-center justify-center mb-6 border-2 border-rose-500">
                    <XCircle className="w-12 h-12 text-rose-400" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-2 tracking-tight">Access Denied</h3>
                  <p className="text-rose-400 font-bold mb-8">{scanResult.message}</p>
                </>
              )}

              {scanResult.ticket && (
                <div className="bg-[#0A0A0A] p-6 rounded-2xl w-full max-w-sm text-left border border-[#1C1C1C] mb-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Guest</span>
                      <span className="text-white font-bold">{scanResult.ticket.customerName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Activity</span>
                      <span className="text-[#00ABAB] font-bold">{scanResult.ticket.activityName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Time Slot</span>
                      <span className="text-white font-bold">{scanResult.ticket.timeSlot}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#94A3B8] font-bold uppercase block">Quantity</span>
                      <span className="text-white font-bold">{scanResult.ticket.quantity} ({scanResult.ticket.ticketType})</span>
                    </div>
                  </div>
                </div>
              )}

              <button onClick={resetScanner} className="btn-glow px-8 py-3 rounded-xl font-bold w-full max-w-sm">
                Scan Next Ticket
              </button>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StaffScanner;
