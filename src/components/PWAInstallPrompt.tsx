import React, { useState, useEffect } from 'react';
import { Download, Monitor, CheckCircle, HelpCircle, X, ExternalLink } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already in standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // If browser hasn't fired beforeinstallprompt or on desktop browser
      setShowGuide(true);
    }
  };

  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium shadow-sm backdrop-blur-md">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Installed as App</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold rounded-lg text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer border border-amber-400/40"
        title="Install Deuce Park as a desktop application"
      >
        <Monitor className="w-3.5 h-3.5" />
        <span>Install App</span>
        <Download className="w-3.5 h-3.5" />
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative text-left text-white">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Monitor className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Install Deuce OS on PC</h3>
                <p className="text-xs text-white/60">Run as standalone software on your desktop</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-white/80 mb-5">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <p className="font-semibold text-amber-400 mb-1 flex items-center gap-1.5">
                  Option 1: Browser 1-Click Install
                </p>
                <p className="text-white/70">
                  Look at the <strong>right side of your browser address bar</strong> (near the bookmark star) and click the <strong>Install / App icon (⊕ or 💻)</strong>, then click <em>Install</em>.
                </p>
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <p className="font-semibold text-emerald-400 mb-1 flex items-center gap-1.5">
                  Option 2: Windows Desktop Shortcut (Instant)
                </p>
                <p className="text-white/70">
                  In your downloaded folder, double-click <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300 font-mono">INSTALL.bat</code> to create an official Windows desktop icon that opens borderless like native software.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
