import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export default function InstallBanner() {
  const { canInstall, showFallback, install, platform, inAppBrowser } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  if (dismissed || (!canInstall && !showFallback)) return null;

  const instructions = inAppBrowser
    ? "This in-app browser can't install apps. Open this page in Chrome or Safari, then try again."
    : platform === 'ios'
      ? 'In Safari: tap the Share button, then "Add to Home Screen".'
      : 'Open the browser menu (⋮) and tap "Install app" or "Add to Home screen". If you don\'t see it, use Chrome.';

  return (
    <div className="mx-4 mt-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Download size={20} className="shrink-0 text-primary" />
          <p className="text-sm text-text truncate">
            Install <span className="font-semibold">ProgressionX</span> for a better experience
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canInstall ? (
            <button
              onClick={install}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Install
            </button>
          ) : (
            <button
              onClick={() => setShowInstructions((v) => !v)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              How to install
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg p-1 text-muted hover:bg-border hover:text-text transition-colors"
            aria-label="Dismiss install banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {showInstructions && !canInstall && (
        <p className="mt-2 text-xs text-muted leading-relaxed">{instructions}</p>
      )}
    </div>
  );
}
