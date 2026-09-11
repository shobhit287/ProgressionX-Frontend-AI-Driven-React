import { Navigate, Outlet } from 'react-router-dom';
import { useCurrentUser } from '@/api/auth';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/** Sends a fresh install to /setup until a profile exists on the device. */
export default function SetupGuard() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <LoadingSpinner size={32} />
      </div>
    );
  }
  if (!user) return <Navigate to="/setup" replace />;
  return <Outlet />;
}
