import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Upload, UserPlus, AlertCircle, Check } from 'lucide-react';
import { useCreateProfile, useCurrentUser } from '@/api/auth';
import { useRestoreBackup } from '@/api/export';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import type { ExperienceLevel, TrainingType } from '@/types';

const selectCls =
  'w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm focus:border-primary outline-none appearance-none';

export default function SetupPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const restore = useRestoreBackup();
  const createProfile = useCreateProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'choose' | 'fresh'>('choose');
  const [error, setError] = useState('');

  // Fresh-profile form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [goal, setGoal] = useState<'bulking' | 'cutting' | 'maintenance'>('maintenance');
  const [trainingType, setTrainingType] = useState<TrainingType>('hypertrophy');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');

  // Already set up (e.g. navigated here by hand) — go home.
  if (user) return <Navigate to="/" replace />;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      const summary = await restore.mutateAsync(file);
      navigate('/', { replace: true, state: { restored: summary } });
    } catch (e) {
      const err = e as { userMessage?: string; message?: string };
      setError(err.userMessage || err.message || 'Could not read that backup.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleCreate = async () => {
    setError('');
    const a = parseInt(age, 10);
    const w = parseFloat(weight);
    const h = parseInt(height, 10);
    if (!firstName.trim()) return setError('First name is required.');
    if (!Number.isFinite(w) || w <= 0) return setError('Enter your weight in kg.');
    try {
      await createProfile.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: '',
        age: Number.isFinite(a) ? a : null,
        weight: w,
        height: Number.isFinite(h) ? h : null,
        gender,
        goal,
        trainingType,
        experienceLevel,
      });
      navigate('/', { replace: true });
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || 'Could not save profile.');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-text px-4 py-8">
      <div className="mx-auto max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">Progression</span>X
          </h1>
          <p className="text-text-muted text-sm">
            Everything is stored on this device. No account, no server.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'choose' && (
          <>
            <Card className="space-y-3">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-primary" />
                <p className="font-semibold">Restore from a backup</p>
              </div>
              <p className="text-sm text-text-muted">
                Pick a <span className="text-text">progressionx-backup-….json</span> file to bring
                back your splits, sessions, weight logs and diet plan.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => void handleFile(e.target.files?.[0])}
              />
              <Button
                className="w-full"
                loading={restore.isPending}
                onClick={() => fileRef.current?.click()}
              >
                Choose backup file
              </Button>
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center gap-2">
                <UserPlus size={18} className="text-primary" />
                <p className="font-semibold">Start fresh</p>
              </div>
              <p className="text-sm text-text-muted">
                Set up a new profile. You can add splits and log your first session right after.
              </p>
              <Button variant="secondary" className="w-full" onClick={() => setMode('fresh')}>
                Create profile
              </Button>
            </Card>
          </>
        )}

        {mode === 'fresh' && (
          <Card className="space-y-3">
            <p className="font-semibold">Your profile</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Age" type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} />
              <Input label="Weight (kg)" type="number" inputMode="decimal" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
              <Input label="Height (cm)" type="number" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className={selectCls}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Goal</label>
              <select value={goal} onChange={(e) => setGoal(e.target.value as typeof goal)} className={selectCls}>
                <option value="bulking">Bulking</option>
                <option value="cutting">Cutting</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Training type</label>
              <select value={trainingType} onChange={(e) => setTrainingType(e.target.value as TrainingType)} className={selectCls}>
                <option value="hypertrophy">Hypertrophy (Muscle Growth)</option>
                <option value="strength">Strength Focused</option>
                <option value="powerbuilding">Powerbuilding</option>
                <option value="endurance">Endurance</option>
                <option value="general_fitness">General Fitness</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Experience</label>
              <select value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)} className={selectCls}>
                <option value="beginner">Beginner (0-1 year)</option>
                <option value="intermediate">Intermediate (1-3 years)</option>
                <option value="advanced">Advanced (3+ years)</option>
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" onClick={() => setMode('choose')}>Back</Button>
              <Button className="flex-1" loading={createProfile.isPending} onClick={() => void handleCreate()}>
                <Check size={16} /> Save & continue
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
