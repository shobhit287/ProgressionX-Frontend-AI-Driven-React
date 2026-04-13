import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { useSplits, useCreateSplit, useBulkReplaceSchedule } from '@/api/splits';
import { useGenerateWeeklySchedule } from '@/api/ai';
import type { WorkoutSplit, GeneratedDay } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import { capitalize } from '@/utils/format';

type DayEnum = WorkoutSplit['day'];

const DAYS: DayEnum[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

const DAY_SHORT: Record<DayEnum, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export default function SplitList() {
  const navigate = useNavigate();
  const { data: splits, isLoading } = useSplits();
  const createSplit = useCreateSplit();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayEnum>('monday');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const generateSchedule = useGenerateWeeklySchedule();
  const bulkReplace = useBulkReplaceSchedule();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDays, setPreviewDays] = useState<GeneratedDay[] | null>(null);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [aiError, setAiError] = useState('');

  // Map day → split
  const splitByDay = new Map<DayEnum, WorkoutSplit>();
  splits?.forEach((s: WorkoutSplit) => splitByDay.set(s.day, s));

  function openCreateModal(day: DayEnum) {
    setSelectedDay(day);
    setName('');
    setDescription('');
    setModalOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await createSplit.mutateAsync({
        name: name.trim(),
        day: selectedDay,
        description: description.trim() || undefined,
      });
      setModalOpen(false);
    } catch {
      // handled by query
    }
  }

  async function handleGenerateAI() {
    setAiError('');
    try {
      const result = await generateSchedule.mutateAsync();
      setPreviewDays(result.days);
      setPreviewOpen(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to generate schedule. Please try again.';
      setAiError(msg);
    }
  }

  function handleUseSchedule() {
    if (!previewDays) return;
    const hasExisting = (splits?.length ?? 0) > 0;
    if (hasExisting) {
      setConfirmReplaceOpen(true);
    } else {
      void applySchedule();
    }
  }

  async function applySchedule() {
    if (!previewDays) return;
    try {
      await bulkReplace.mutateAsync(previewDays);
      setConfirmReplaceOpen(false);
      setPreviewOpen(false);
      setPreviewDays(null);
    } catch {
      // handled by query
    }
  }

  function handleDayClick(day: DayEnum) {
    const split = splitByDay.get(day);
    if (split) {
      navigate(`/splits/${split.id}`);
    } else {
      openCreateModal(day);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">Weekly Splits</h1>
      </div>

      <button
        type="button"
        onClick={handleGenerateAI}
        disabled={generateSchedule.isPending}
        className="w-full rounded-xl p-4 bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/40 flex items-center gap-3 active:scale-[0.99] transition-transform disabled:opacity-60"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/30 flex items-center justify-center flex-shrink-0">
          {generateSchedule.isPending ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="text-left flex-1">
          <p className="text-text font-semibold text-sm">
            {generateSchedule.isPending ? 'Generating your schedule...' : 'Create Weekly Schedule by AI'}
          </p>
          <p className="text-text-muted text-xs">
            Personalized to your goal, training type & experience level
          </p>
        </div>
      </button>

      {aiError && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 text-danger text-sm px-3 py-2">
          {aiError}
        </div>
      )}

      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="rounded-xl bg-surface border border-border p-4 flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/5" />
                </div>
              </div>
            ))
          : DAYS.map((day) => {
              const split = splitByDay.get(day);
              return (
                <Card
                  key={day}
                  className="p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                  onClick={() => handleDayClick(day)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-background flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">{DAY_SHORT[day]}</span>
                    </div>
                    <div>
                      <p className="text-text font-medium">
                        {split ? split.name : 'Rest Day'}
                      </p>
                      <p className="text-text-muted text-xs capitalize">{capitalize(day)}</p>
                    </div>
                  </div>
                  {split ? (
                    <ChevronRight className="w-5 h-5 text-text-muted" />
                  ) : (
                    <Plus className="w-5 h-5 text-text-muted" />
                  )}
                </Card>
              );
            })}
      </div>

      {/* Create split modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Split">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Split Name"
            placeholder="e.g. Push Day"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-1">Day</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value as DayEnum)}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            >
              {DAYS.map((d) => (
                <option key={d} value={d} disabled={splitByDay.has(d)}>
                  {capitalize(d)} {splitByDay.has(d) ? '(assigned)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Chest, shoulders, triceps..."
              rows={2}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] resize-none"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={createSplit.isPending}
            className="w-full"
          >
            Create Split
          </Button>
        </form>
      </Modal>

      {/* AI preview modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Your AI-Generated Weekly Schedule"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {previewDays?.map((d) => (
            <div
              key={d.day}
              className="rounded-lg border border-border bg-background p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-text font-semibold text-sm">
                  {capitalize(d.day)} — {d.name}
                </p>
                {d.isRest && (
                  <span className="text-xs text-text-muted px-2 py-0.5 rounded-full bg-surface">
                    Rest
                  </span>
                )}
              </div>
              {d.description && (
                <p className="text-text-muted text-xs mb-2">{d.description}</p>
              )}
              {d.exercises.length > 0 && (
                <ul className="space-y-1 mt-2">
                  {d.exercises.map((ex) => (
                    <li
                      key={`${d.day}-${ex.displayOrder}`}
                      className="text-xs text-text flex justify-between"
                    >
                      <span>
                        {ex.displayOrder}. {ex.name}
                      </span>
                      <span className="text-text-muted">
                        {ex.defaultSets} sets · {ex.restSeconds}s rest
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setPreviewOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            loading={bulkReplace.isPending}
            onClick={handleUseSchedule}
          >
            Use This Schedule
          </Button>
        </div>
      </Modal>

      {/* Confirm overwrite modal */}
      <Modal
        open={confirmReplaceOpen}
        onClose={() => setConfirmReplaceOpen(false)}
        title="Replace existing schedule?"
      >
        <p className="text-text text-sm">
          Your current splits and exercises will be{' '}
          <span className="text-danger font-semibold">overwritten</span> by this new
          AI-generated schedule. This cannot be undone.
        </p>
        <p className="text-text-muted text-xs mt-2">
          Past workout sessions will be preserved.
        </p>
        <div className="flex gap-2 mt-4">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setConfirmReplaceOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            loading={bulkReplace.isPending}
            onClick={applySchedule}
          >
            Yes, Replace
          </Button>
        </div>
      </Modal>
    </div>
  );
}
