import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser, useUpdateProfile } from '@/api/auth';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// Required fields for a complete profile — mirrors the backend's check in
// UserService.update that flips is_profile_complete.
const GOALS = ['bulking', 'cutting', 'maintenance'] as const;
const GENDERS = ['male', 'female', 'other'] as const;
const TRAINING_TYPES = [
  { value: 'hypertrophy', label: 'Hypertrophy (Muscle Growth)' },
  { value: 'strength', label: 'Strength Focused' },
  { value: 'powerbuilding', label: 'Powerbuilding' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general_fitness', label: 'General Fitness' },
] as const;
const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner (0-1 year)' },
  { value: 'intermediate', label: 'Intermediate (1-3 years)' },
  { value: 'advanced', label: 'Advanced (3+ years)' },
] as const;

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const update = useUpdateProfile();

  const [form, setForm] = useState({
    age: '',
    weight: '',
    height: '',
    goal: 'bulking' as (typeof GOALS)[number],
    gender: 'male' as (typeof GENDERS)[number],
    trainingType: 'hypertrophy' as string,
    experienceLevel: 'beginner' as string,
    activityLevel: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
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
      await update.mutateAsync({
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        goal: form.goal,
        gender: form.gender,
        trainingType: form.trainingType,
        experienceLevel: form.experienceLevel,
        activityLevel: form.activityLevel || undefined,
      } as unknown as Parameters<typeof update.mutateAsync>[0]);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to save profile. Please try again.';
      setGlobalError(msg);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#f1f5f9]">
            Welcome{user?.firstName ? `, ${user.firstName}` : ''}!
          </h1>
          <p className="text-[#94a3b8] mt-2">
            Tell us a bit about you so we can tailor your training.
          </p>
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

          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-1">Experience Level</label>
            <select
              value={form.experienceLevel}
              onChange={(e) => updateField('experienceLevel', e.target.value)}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            >
              {EXPERIENCE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Activity Level (optional)"
            placeholder="sedentary / lightly active / …"
            value={form.activityLevel}
            onChange={(e) => updateField('activityLevel', e.target.value)}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={update.isPending}
            className="w-full"
          >
            Save & Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
