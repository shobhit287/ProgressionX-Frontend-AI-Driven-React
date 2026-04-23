import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { GoogleOAuthProvider } from '@react-oauth/google';
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

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Provider works fine with empty client id — the sign-in buttons
        simply won't render, but the rest of the app still boots. Keeps
        dev-without-Google-configured unbroken. */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);
