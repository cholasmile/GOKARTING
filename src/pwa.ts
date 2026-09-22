import { registerSW } from 'virtual:pwa-register';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Force update service worker registrations
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.update().catch(() => {});
    }
  });

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[PWA] New update detected! Purging old caches and reloading...');
      if ('caches' in window) {
        caches.keys().then(names => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
      updateSW(true);
      setTimeout(() => {
        window.location.reload();
      }, 200);
    },
    onOfflineReady() {
      console.log('[PWA] App ready');
    },
  });
}
