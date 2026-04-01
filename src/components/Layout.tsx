import { Outlet } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';

export default function Layout() {
  return (
    <div className="min-h-screen bg-background text-text">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-primary">Progression</span>X
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-20 pt-4">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
