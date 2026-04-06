import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@/styles/globals.css';
import App from '@/App';

// Auto-reload when a new service worker takes over
registerSW({
  onNeedRefresh() {
    // New content available — reload immediately
    window.location.reload();
  },
  onOfflineReady() {},
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
