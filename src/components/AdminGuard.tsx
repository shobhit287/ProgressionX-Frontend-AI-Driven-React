import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { useCurrentUser } from '@/api/auth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AdminGuard() {
  const token = useAuthStore((s) => s.token);
  const { data: user, isLoading } = useCurrentUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a]">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (user?.role !== 'superadmin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
