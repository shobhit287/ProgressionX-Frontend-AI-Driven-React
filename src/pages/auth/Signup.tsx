import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSignup, useLogin, useCurrentUser } from '@/api/auth';
import { useAuthStore } from '@/store/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const GOALS = ['bulking', 'cutting', 'maintenance'] as const;
const GENDERS = ['male', 'female', 'other'] as const;
const TRAINING_TYPES = [
  { value: 'hypertrophy', label: 'Hypertrophy (Muscle Growth)' },
  { value: 'strength', label: 'Strength Focused' },
  { value: 'powerbuilding', label: 'Powerbuilding' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general_fitness', label: 'General Fitness' },
] as const;

export default function Signup() {
  const navigate = useNavigate();
  const signup = useSignup();
  const login = useLogin();
  const currentUser = useCurrentUser();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    age: '',
    weight: '',
    height: '',
    goal: 'bulking' as (typeof GOALS)[number],
    gender: 'male' as (typeof GENDERS)[number],
    trainingType: 'hypertrophy' as string,
    mobileNumber: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!form.age || Number(form.age) < 13) e.age = 'Valid age is required';
    if (!form.weight || Number(form.weight) <= 0) e.weight = 'Weight is required';
    if (!form.height || Number(form.height) <= 0) e.height = 'Height is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError('');
    if (!validate()) return;

    try {
      await signup.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        goal: form.goal,
        gender: form.gender,
        trainingType: form.trainingType,
        mobileNumber: form.mobileNumber.trim() || undefined,
      });

      // Auto-login
      const tokenRes = await login.mutateAsync({
        email: form.email.trim(),
        password: form.password,
      });
      useAuthStore.getState().setTokens(tokenRes.accessToken, tokenRes.refreshToken);
      const user = await currentUser.refetch();
      if (user.data) {
        setAuth(tokenRes.accessToken, tokenRes.refreshToken, user.data);
      }
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Something went wrong. Please try again.';
      setGlobalError(msg);
    }
  }

  const isLoading = signup.isPending || login.isPending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#f1f5f9]">ProgressionX</h1>
          <p className="text-[#94a3b8] mt-2">Create your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#1e293b] rounded-2xl p-6 space-y-4 shadow-lg"
        >
          {globalError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              {globalError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="John"
              value={form.firstName}
              onChange={(e) => updateField('firstName', e.target.value)}
              error={errors.firstName}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              value={form.lastName}
              onChange={(e) => updateField('lastName', e.target.value)}
              error={errors.lastName}
            />
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            error={errors.email}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Min 6 characters"
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            error={errors.password}
          />

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Age"
              type="number"
              placeholder="25"
              value={form.age}
              onChange={(e) => updateField('age', e.target.value)}
              error={errors.age}
            />
            <Input
              label="Weight (kg)"
              type="number"
              placeholder="75"
              value={form.weight}
              onChange={(e) => updateField('weight', e.target.value)}
              error={errors.weight}
            />
            <Input
              label="Height (cm)"
              type="number"
              placeholder="178"
              value={form.height}
              onChange={(e) => updateField('height', e.target.value)}
              error={errors.height}
            />
          </div>

          {/* Goal dropdown */}
          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-1">Goal</label>
            <select
              value={form.goal}
              onChange={(e) => updateField('goal', e.target.value)}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            >
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Training Type dropdown */}
          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-1">Training Type</label>
            <select
              value={form.trainingType}
              onChange={(e) => updateField('trainingType', e.target.value)}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            >
              {TRAINING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Gender dropdown */}
          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-1">Gender</label>
            <select
              value={form.gender}
              onChange={(e) => updateField('gender', e.target.value)}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Mobile Number (optional)"
            type="tel"
            placeholder="+1 555 000 0000"
            value={form.mobileNumber}
            onChange={(e) => updateField('mobileNumber', e.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoading}
            className="w-full"
          >
            Create Account
          </Button>

          <p className="text-center text-sm text-[#94a3b8]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#6366f1] hover:underline font-medium">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
