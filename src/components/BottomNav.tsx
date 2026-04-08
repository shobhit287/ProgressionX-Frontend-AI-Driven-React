import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, BarChart3, Weight, Bot, UtensilsCrossed } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/splits', icon: Dumbbell, label: 'Splits' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/weight', icon: Weight, label: 'Weight' },
  { to: '/diet', icon: UtensilsCrossed, label: 'Diet' },
  { to: '/ai', icon: Bot, label: 'AI' },
];

const BottomNav = memo(function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-4 py-3 text-xs transition-colors touch-manipulation min-w-[64px] ${
                isActive ? 'text-primary' : 'text-text-muted'
              }`
            }
          >
            <Icon size={22} />
            <span className="text-[11px]">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
});

export default BottomNav;
