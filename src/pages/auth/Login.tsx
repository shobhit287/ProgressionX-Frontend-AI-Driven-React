import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin, useCurrentUser } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function Login() {
  const navigate = useNavigate();
  const login = useLogin();
  const currentUser = useCurrentUser();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const tokenRes = await login.mutateAsync({ email, password });
      // Temporarily set token so the currentUser call is authenticated
      useAuthStore.getState().setAuth(tokenRes.accessToken, {} as never);
      const user = await currentUser.refetch();
      if (user.data) {
        setAuth(tokenRes.accessToken, user.data);
      }
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Invalid email or password';
      setError(msg);
    }
  }

  const isLoading = login.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#f1f5f9]">ProgressionX</h1>
          <p className="text-[#94a3b8] mt-2">Welcome back. Let's lift.</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#1e293b] rounded-2xl p-6 space-y-5 shadow-lg"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoading}
            className="w-full"
          >
            Login
          </Button>

          <p className="text-center text-sm text-[#94a3b8]">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#6366f1] hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
