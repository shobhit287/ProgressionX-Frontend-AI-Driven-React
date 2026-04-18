import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform = 'android' | 'ios' | 'desktop' | 'unsupported';

function detectPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'unsupported';
  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIos) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows|Macintosh|Linux|CrOS/.test(ua)) return 'desktop';
  return 'unsupported';
}

function detectInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  // Common in-app webviews that disable beforeinstallprompt
  return /FBAN|FBAV|Instagram|Line|Twitter|LinkedInApp|; wv\)/i.test(navigator.userAgent);
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [fallbackTimerElapsed, setFallbackTimerElapsed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    // Delay fallback so Chrome's beforeinstallprompt has a chance to fire first.
    const timer = window.setTimeout(() => setFallbackTimerElapsed(true), 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      window.clearTimeout(timer);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  const platform = detectPlatform();
  const inAppBrowser = detectInAppBrowser();
  const canInstall = !!deferredPrompt && !isInstalled;
  const showFallback =
    fallbackTimerElapsed &&
    !canInstall &&
    !isInstalled &&
    (platform === 'android' || platform === 'ios');

  return {
    canInstall,
    showFallback,
    isInstalled,
    install,
    platform,
    inAppBrowser,
  };
}
