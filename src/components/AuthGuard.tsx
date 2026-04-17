import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useCurrentUser } from '@/api/auth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AuthGuard() {
  const token = useAuthStore((s) => s.token);
  const cachedUser = useAuthStore((s) => s.user);
  const { data: fetchedUser, isLoading } = useCurrentUser();

  if (!token) {
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

  return <Outlet />;
}
