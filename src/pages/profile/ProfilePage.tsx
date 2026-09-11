import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCurrentUser, useUpdateProfile } from '@/api/auth';
import { DEFAULT_MODEL, getGroqApiKey, getGroqModel, setGroqApiKey, setGroqModel } from '@/local/ai/groq';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { User, KeyRound, Check, AlertCircle, DatabaseBackup, ExternalLink } from 'lucide-react';
import type { TrainingType, ExperienceLevel } from '@/types';

const TRAINING_TYPES: { value: TrainingType; label: string }[] = [
  { value: 'hypertrophy', label: 'Hypertrophy (Muscle Growth)' },
  { value: 'strength', label: 'Strength Focused' },
  { value: 'powerbuilding', label: 'Powerbuilding' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general_fitness', label: 'General Fitness' },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner (0-1 year)' },
  { value: 'intermediate', label: 'Intermediate (1-3 years)' },
  { value: 'advanced', label: 'Advanced (3+ years)' },
];

export default function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();
  const updateProfile = useUpdateProfile();

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<'bulking' | 'cutting' | 'maintenance'>('maintenance');
  const [trainingType, setTrainingType] = useState<TrainingType>('hypertrophy');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [activityLevel, setActivityLevel] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // AI settings (kept in localStorage, never in backups)
  const [apiKey, setApiKey] = useState(() => getGroqApiKey());
  const [model, setModel] = useState(() => getGroqModel());
  const [aiSaved, setAiSaved] = useState(false);

  // Populate form when user loads
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setWeight(String(user.weight));
      setGoal(user.goal || 'bulking');
      setTrainingType(user.trainingType || 'hypertrophy');
      setExperienceLevel(user.experienceLevel || 'beginner');
      setActivityLevel(user.activityLevel || '');
    }
  }, [user]);

  const handleUpdateProfile = () => {
    const w = parseFloat(weight);
    if (!firstName.trim() || !lastName.trim() || isNaN(w) || w <= 0) return;

    setProfileSaved(false);
    updateProfile.mutate(
      { firstName: firstName.trim(), lastName: lastName.trim(), weight: w, goal, trainingType, experienceLevel, activityLevel: activityLevel.trim() || undefined },
      {
        onSuccess: () => {
          setProfileSaved(true);
          setTimeout(() => setProfileSaved(false), 3000);
        },
      },
    );
  };

  const handleSaveAi = () => {
    setGroqApiKey(apiKey);
    setGroqModel(model);
    setAiSaved(true);
    setTimeout(() => setAiSaved(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pt-2">
        <div className="h-8 w-32 rounded bg-surface-light/50 animate-pulse" />
        <div className="h-64 rounded-xl bg-surface-light/50 animate-pulse" />
        <div className="h-48 rounded-xl bg-surface-light/50 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Profile</h1>

      {/* Read-only info */}
      <Card className="p-4">
        <div className="space-y-2">
          <p className="text-text-muted text-xs uppercase tracking-wide font-medium">Account</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-text font-medium text-sm">
                {user?.email || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
              </p>
              <p className="text-text-muted text-xs">Stored on this device only</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit basic details */}
      <Card className="p-4">
        <p className="text-text-muted text-xs uppercase tracking-wide font-medium mb-4">
          Basic Details
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1 block">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Weight (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Goal</label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as typeof goal)}
              className="w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm focus:border-primary outline-none appearance-none"
            >
              <option value="bulking">Bulking</option>
              <option value="cutting">Cutting</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Training Type</label>
            <select
              value={trainingType}
              onChange={(e) => setTrainingType(e.target.value as TrainingType)}
              className="w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm focus:border-primary outline-none appearance-none"
            >
              {TRAINING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Experience Level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel)}
              className="w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm focus:border-primary outline-none appearance-none"
            >
              {EXPERIENCE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Activity Level</label>
            <textarea
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              placeholder="e.g. 12km cycling, 2hr strength training, 5hr sitting office job"
              rows={3}
              className="w-full rounded-lg bg-background border border-border px-3 py-2 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none resize-none"
            />
          </div>

          {profileSaved && (
            <div className="flex items-center gap-2 text-success text-sm">
              <Check className="w-4 h-4" /> Profile updated
            </div>
          )}

          {updateProfile.isError && (
            <div className="flex items-center gap-2 text-danger text-sm">
              <AlertCircle className="w-4 h-4" /> Failed to update profile
            </div>
          )}

          <Button
            variant="primary"
            className="w-full"
            loading={updateProfile.isPending}
            onClick={handleUpdateProfile}
          >
            Save Changes
          </Button>
        </div>
      </Card>

      {/* AI settings */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-text-muted" />
          <p className="text-text-muted text-xs uppercase tracking-wide font-medium">
            AI Coach (Groq)
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-xs text-text-muted">
            AI analysis, session plans, the coach and diet chat call Groq directly from this
            device with your own key. Everything else works without it.{' '}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary"
            >
              Get a free key <ExternalLink size={12} />
            </a>
          </p>

          <div>
            <label className="text-xs text-text-muted mb-1 block">API key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="gsk_…"
              autoComplete="off"
              className="w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULT_MODEL}
              className="w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none"
            />
          </div>

          {aiSaved && (
            <div className="flex items-center gap-2 text-success text-sm">
              <Check className="w-4 h-4" /> AI settings saved
            </div>
          )}

          <Button variant="primary" className="w-full" onClick={handleSaveAi}>
            Save AI Settings
          </Button>
        </div>
      </Card>

      {/* Backup shortcut */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <DatabaseBackup className="w-4 h-4 text-text-muted" />
          <p className="text-text-muted text-xs uppercase tracking-wide font-medium">Your data</p>
        </div>
        <p className="text-xs text-text-muted mb-3">
          Everything lives in this phone's browser storage. Download a backup regularly.
        </p>
        <Link to="/export">
          <Button variant="secondary" className="w-full">Backup &amp; Restore</Button>
        </Link>
      </Card>
    </div>
  );
}
