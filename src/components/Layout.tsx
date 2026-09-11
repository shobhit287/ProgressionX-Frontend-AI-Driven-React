import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { UserCircle, HelpCircle, DatabaseBackup } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import InstallBanner from '@/components/InstallBanner';
import HelpModal from '@/components/HelpModal';

export default function Layout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isSessionPage = pathname.startsWith('/session/');

  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-background text-text">
      {!isSessionPage && (
        <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-12 max-w-lg items-center justify-between px-4">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-primary">Progression</span>X
            </h1>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsHelpOpen(true)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-border hover:text-text transition-colors"
                title="Help & FAQ"
              >
                <HelpCircle size={18} />
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-border hover:text-text transition-colors"
              >
                <UserCircle size={18} />
              </button>
              <button
                onClick={() => navigate('/export')}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted hover:bg-border hover:text-text transition-colors"
                title="Backup & restore"
              >
                <DatabaseBackup size={18} />
              </button>
            </div>
          </div>
        </header>
      )}

      {!isSessionPage && <InstallBanner />}

      <main className={`mx-auto max-w-lg pt-4 ${isSessionPage ? 'px-0 pb-0' : 'px-4 pb-24'}`}>
        <Outlet />
      </main>

      {!isSessionPage && <BottomNav />}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
