// Force-refresh the installed PWA: drop the service worker and its cached app
// files, then reload so the latest build is fetched from the server.
//
// Only touches Cache Storage + service worker registrations. IndexedDB (all
// workout data) and localStorage (Groq key, settings) are left alone.

/** ISO timestamp of when this bundle was built (injected by Vite). */
export const APP_BUILD_TIME: string = __APP_BUILD_TIME__;

export class RefreshAppError extends Error {}

/** True if the server answers right now, bypassing every cache. */
async function serverReachable(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}index.html?refresh=${Date.now()}`, {
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function refreshApp(): Promise<void> {
  // Clearing the cache while offline would leave the app unable to load at
  // all, so refuse unless the server is reachable.
  if (!(await serverReachable())) {
    throw new RefreshAppError(
      "Can't reach the server. Connect to the internet and try again — nothing was cleared.",
    );
  }

  if ('serviceWorker' in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  // Fresh load from the network; the new service worker registers and
  // precaches the latest build on this load.
  window.location.reload();
}
