import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

/**
 * Wraps public auth routes (/login, /signup). If the user already has a
 * session, send them straight to their landing page instead of showing the
 * login form again. Superadmins go to their console.
 */
export default function GuestGuard() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  if (token) {
    if (user?.role === 'superadmin') {
      return <Navigate to="/superadmin" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
