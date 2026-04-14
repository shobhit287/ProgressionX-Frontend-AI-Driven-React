// Rest-period alerts: beep, vibrate, and (optional) browser notification.
// Pure client-side, no backend or service worker required.

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
      .AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

/** Call once from a user gesture so iOS unlocks audio. */
export function primeRestAudio(): void {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

function beep(freq: number, durationMs: number, when: number): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + when + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + durationMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + when);
  osc.stop(ctx.currentTime + when + durationMs / 1000 + 0.02);
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

export function fireRestAlert(exerciseName: string, restSeconds: number): void {
  // Triple beep
  beep(880, 180, 0);
  beep(880, 180, 0.25);
  beep(1320, 260, 0.5);

  // Vibrate (Android / installed PWAs)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate?.([200, 100, 200, 100, 300]);
  }

  // Browser notification (works when tab backgrounded on desktop / Android PWA)
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Rest period over', {
        body: `${exerciseName} — ${restSeconds}s rest complete. Time for the next set.`,
        tag: `rest-${exerciseName}`,
        silent: false,
      });
    } catch {
      // ignore — notification may fail in some browsers without a service worker
    }
  }
}
