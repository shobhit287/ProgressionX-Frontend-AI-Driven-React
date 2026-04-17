// Rest-period alerts: beep, vibrate, and browser notification.
// Pure client-side, no backend required.
//
// Mobile reliability notes:
// - Audio is pre-scheduled on AudioContext's own timeline so it fires even if
//   the JS setInterval is throttled by the browser when backgrounded.
// - Vibration + notification are scheduled via setTimeout, re-resuming the
//   AudioContext at fire time in case the OS suspended it.
// - Notifications are sent via the service worker registration when possible,
//   which is the only reliable path on Android Chrome / installed PWAs.
// - A screen Wake Lock keeps the screen on during rest, which prevents the
//   browser from suspending timers, audio, and vibration in the first place.

let audioCtx: AudioContext | null = null;
let wakeLock: WakeLockSentinel | null = null;

type AudioCtxCtor = typeof AudioContext;

function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (audioCtx) return audioCtx;
  const w = window as unknown as {
    AudioContext?: AudioCtxCtor;
    webkitAudioContext?: AudioCtxCtor;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

/** Call once from a user gesture so iOS unlocks audio. */
export function primeRestAudio(): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') void ctx.resume();
  // Play a tiny silent buffer to fully unlock audio on iOS Safari.
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {
    // ignore
  }
}

function scheduleBeep(
  ctx: AudioContext,
  whenAbsolute: number,
  freq: number,
  durationMs: number,
): OscillatorNode {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.0001, whenAbsolute);
  gain.gain.exponentialRampToValueAtTime(0.6, whenAbsolute + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, whenAbsolute + durationMs / 1000);
  osc.connect(gain).connect(ctx.destination);
  osc.start(whenAbsolute);
  osc.stop(whenAbsolute + durationMs / 1000 + 0.05);
  return osc;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

function showNotification(title: string, options: NotificationOptions): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Prefer the service worker registration — required for reliable delivery
  // on Android Chrome and installed PWAs. `new Notification(...)` throws
  // "Illegal constructor" on Android Chrome PWAs.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => reg.showNotification(title, options))
      .catch(() => {
        try {
          new Notification(title, options);
        } catch {
          // ignore
        }
      });
    return;
  }

  try {
    new Notification(title, options);
  } catch {
    // ignore
  }
}

export interface RestAlertHandle {
  cancel(): void;
}

/**
 * Schedule the rest-over alert to fire in `delaySeconds`.
 * - Audio beeps are scheduled on the AudioContext timeline (hardware-timed).
 * - Vibration + notification fire via setTimeout.
 * Call `.cancel()` to stop a pending alert (e.g. when a new set is logged).
 */
export function scheduleRestAlert(
  delaySeconds: number,
  exerciseName: string,
): RestAlertHandle {
  const delayMs = Math.max(0, delaySeconds * 1000);

  // Pre-schedule audio via AudioContext timeline.
  const ctx = getAudioCtx();
  const oscs: OscillatorNode[] = [];
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    const base = ctx.currentTime + Math.max(0, delaySeconds);
    oscs.push(scheduleBeep(ctx, base + 0.0, 880, 180));
    oscs.push(scheduleBeep(ctx, base + 0.25, 880, 180));
    oscs.push(scheduleBeep(ctx, base + 0.5, 1320, 260));
  }

  // Schedule vibration + notification via setTimeout.
  const timer = window.setTimeout(() => {
    // Try to resume in case the OS suspended the context while we were off.
    if (ctx && ctx.state === 'suspended') void ctx.resume();

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([250, 100, 250, 100, 400]);
      } catch {
        // ignore
      }
    }

    showNotification('Rest period over', {
      body: `${exerciseName} — time for the next set.`,
      tag: `rest-${exerciseName}`,
      silent: false,
      // `vibrate` is a non-standard extension honoured by Android Chrome.
      ...({ vibrate: [250, 100, 250, 100, 400] } as object),
    });
  }, delayMs);

  return {
    cancel() {
      oscs.forEach((o) => {
        try {
          o.stop(0);
          o.disconnect();
        } catch {
          // ignore
        }
      });
      clearTimeout(timer);
    },
  };
}

/** Acquire the screen wake lock. Safe to call repeatedly. */
export async function requestScreenWakeLock(): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & {
    wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> };
  };
  if (!nav.wakeLock) return;
  if (wakeLock && !wakeLock.released) return;
  try {
    wakeLock = await nav.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch {
    // May reject if page is not visible; caller re-tries on visibilitychange.
  }
}

export function releaseScreenWakeLock(): void {
  const w = wakeLock;
  wakeLock = null;
  if (!w) return;
  try {
    void w.release();
  } catch {
    // ignore
  }
}

/** Resume the AudioContext if it was suspended — call on visibilitychange. */
export function resumeAudioIfSuspended(): void {
  const ctx = audioCtx;
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}
