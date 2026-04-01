import { NavLink } from 'react-router-dom';
import { Home, Dumbbell, BarChart3, Weight, Bot } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/splits', icon: Dumbbell, label: 'Splits' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/weight', icon: Weight, label: 'Weight' },
  { to: '/ai', icon: Bot, label: 'AI' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted hover:text-text'
              }`
            }
          >
            <Icon size={20} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
