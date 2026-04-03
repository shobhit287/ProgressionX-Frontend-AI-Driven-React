import { Outlet, useLocation } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';

export default function Layout() {
  const { pathname } = useLocation();
  const isSessionPage = pathname.startsWith('/session/');

  return (
    <div className="min-h-[100dvh] bg-background text-text">
      {!isSessionPage && (
        <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-12 max-w-lg items-center px-4">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-primary">Progression</span>X
            </h1>
          </div>
        </header>
      )}

      <main className={`mx-auto max-w-lg pt-4 ${isSessionPage ? 'px-0 pb-0' : 'px-4 pb-24'}`}>
        <Outlet />
      </main>

      {!isSessionPage && <BottomNav />}
    </div>
  );
}
