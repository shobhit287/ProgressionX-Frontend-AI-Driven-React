import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useCurrentUser } from '@/api/auth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Landing from '@/pages/landing/Landing';

export default function AuthGuard() {
  const token = useAuthStore((s) => s.token);
  const cachedUser = useAuthStore((s) => s.user);
  const { data: fetchedUser, isLoading } = useCurrentUser();
  const location = useLocation();

  if (!token) {
    // Anonymous visitors hitting `/` get the public landing page. This is
    // required so Google's OAuth consent-screen reviewer can see the app's
    // purpose and a link to the privacy policy without logging in. Any other
    // gated path still routes to login.
    if (location.pathname === '/') {
      return <Landing />;
    }
    return <Navigate to="/login" replace />;
  }

  const user = fetchedUser ?? cachedUser;

  // Wait for the user profile before deciding — otherwise a superadmin who
  // reloads on `/` briefly sees the regular dashboard.
  if (!user && isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a]">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (user?.role === 'superadmin') {
    return <Navigate to="/superadmin" replace />;
  }

  // First-time Google signup stubs — force the completion form before
  // anything else. Users can't bypass by typing another URL.
  if (
    user &&
    user.isProfileComplete === false &&
    location.pathname !== '/profile/complete'
  ) {
    return <Navigate to="/profile/complete" replace />;
  }

  return <Outlet />;
}
