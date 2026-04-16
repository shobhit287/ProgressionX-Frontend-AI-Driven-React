import { Download, X } from 'lucide-react';
import { useState } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export default function InstallBanner() {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Download size={20} className="shrink-0 text-primary" />
        <p className="text-sm text-text truncate">
          Install <span className="font-semibold">ProgressionX</span> for a better experience
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={install}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-muted hover:bg-border hover:text-text transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
