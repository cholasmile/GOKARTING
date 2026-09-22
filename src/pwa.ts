import { registerSW } from 'virtual:pwa-register';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onOfflineReady() {
        console.log('[PWA] App ready for offline use');
      }
    });
  } catch (e) {
    console.warn('[PWA] Service worker registration warning:', e);
  }
}
