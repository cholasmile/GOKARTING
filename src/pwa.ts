import { registerSW } from 'virtual:pwa-register';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[PWA] New content detected! Reloading page to apply updates...');
      updateSW(true);
      setTimeout(() => {
        window.location.reload();
      }, 300);
    },
    onOfflineReady() {
      console.log('[PWA] App ready to work offline');
    },
  });
}
