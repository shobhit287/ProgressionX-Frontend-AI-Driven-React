import { useState, useEffect } from 'react';
import { useCurrentUser, useUpdateProfile, useChangePassword } from '@/api/auth';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { User, Lock, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { APP_BUILD_TIME, refreshApp } from '@/utils/refreshApp';
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
  const changePassword = useChangePassword();

  // Profile form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<'bulking' | 'cutting' | 'maintenance'>('maintenance');
  const [trainingType, setTrainingType] = useState<TrainingType>('hypertrophy');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [activityLevel, setActivityLevel] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // Password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

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

  const handleChangePassword = () => {
    setPasswordError('');
    setPasswordSaved(false);

    if (!oldPassword) {
      setPasswordError('Enter your current password');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    changePassword.mutate(
      { oldPassword, newPassword },
      {
        onSuccess: () => {
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPasswordSaved(true);
          setTimeout(() => setPasswordSaved(false), 3000);
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.detail || 'Failed to change password';
          setPasswordError(msg);
        },
      },
    );
  };

  // Force-refresh the PWA (clear cached app files + service worker, reload)
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const handleRefreshApp = async () => {
    setRefreshError(null);
    setRefreshing(true);
    try {
      await refreshApp(); // reloads the page on success
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : 'Refresh failed. Try again.');
      setRefreshing(false);
    }
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
              <p className="text-text font-medium text-sm">{user?.email}</p>
              {user?.mobileNumber && (
                <p className="text-text-muted text-xs">{user.mobileNumber}</p>
              )}
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

      {/* Change password */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-text-muted" />
          <p className="text-text-muted text-xs uppercase tracking-wide font-medium">
            Change Password
          </p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Current Password</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none"
            />
          </div>

          {passwordError && (
            <div className="flex items-center gap-2 text-danger text-sm">
              <AlertCircle className="w-4 h-4" /> {passwordError}
            </div>
          )}

          {passwordSaved && (
            <div className="flex items-center gap-2 text-success text-sm">
              <Check className="w-4 h-4" /> Password changed successfully
            </div>
          )}

          <Button
            variant="primary"
            className="w-full"
            loading={changePassword.isPending}
            onClick={handleChangePassword}
          >
            Update Password
          </Button>
        </div>
      </Card>


      {/* Force-refresh the PWA to pick up the latest deploy */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw className="w-4 h-4 text-text-muted" />
          <p className="text-text-muted text-xs uppercase tracking-wide font-medium">App update</p>
        </div>
        <p className="text-xs text-text-muted mb-1">
          Not seeing the latest changes? This clears the app's cached files and reloads the newest
          version from the server. Your workouts and settings are not touched.
        </p>
        <p className="text-[11px] text-text-muted mb-3 tabular-nums">
          Current build: {new Date(APP_BUILD_TIME).toLocaleString()}
        </p>
        {refreshError && (
          <div className="flex items-start gap-2 text-danger text-sm mb-3">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {refreshError}
          </div>
        )}
        <Button
          variant="secondary"
          className="w-full"
          loading={refreshing}
          disabled={refreshing}
          onClick={handleRefreshApp}
        >
          Refresh App
        </Button>
      </Card>
    </div>
  );
}
