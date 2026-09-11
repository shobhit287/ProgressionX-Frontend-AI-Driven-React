import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@/styles/globals.css';
import App from '@/App';
import { requestPersistentStorage } from '@/local/backup';

// Auto-reload when a new service worker takes over
registerSW({
  onNeedRefresh() {
    // New content available — reload immediately
    window.location.reload();
  },
  onOfflineReady() {},
});

// Ask the browser to keep IndexedDB out of storage-pressure eviction. Best
// effort — the Profile page shows the outcome and lets the user retry.
void requestPersistentStorage();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
