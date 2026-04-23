import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useLogin, useGoogleLogin } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function Login() {
  const navigate = useNavigate();
  const login = useLogin();
  const googleLogin = useGoogleLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function routeAfterLogin(isProfileComplete: boolean) {
    const user = useAuthStore.getState().user;
    if (user?.role === 'superadmin') {
      navigate('/superadmin', { replace: true });
    } else if (!isProfileComplete) {
      navigate('/profile/complete', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    try {
      const data = await login.mutateAsync({ email, password });
      routeAfterLogin(data.isProfileComplete);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Invalid email or password';
      setError(msg);
    }
  }

  async function handleGoogleSuccess(credential: string | undefined) {
    if (!credential) {
      setError('Google sign-in failed — no credential returned.');
      return;
    }
    setError('');
    try {
      const data = await googleLogin.mutateAsync(credential);
      routeAfterLogin(data.isProfileComplete);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Google sign-in failed. Please try again.';
      setError(msg);
    }
  }

  const isLoading = login.isPending || googleLogin.isPending;

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

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#334155]" />
            <span className="text-xs text-[#94a3b8] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[#334155]" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={(res) => handleGoogleSuccess(res.credential)}
              onError={() => setError('Google sign-in failed. Please try again.')}
              theme="filled_black"
              size="large"
              shape="rectangular"
              text="continue_with"
              width="320"
            />
          </div>

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
