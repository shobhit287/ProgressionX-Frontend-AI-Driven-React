import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronRight } from 'lucide-react';
import { useSplits, useCreateSplit } from '@/api/splits';
import type { WorkoutSplit } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
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

  function handleDayClick(day: DayEnum) {
    const split = splitByDay.get(day);
    if (split) {
      navigate(`/splits/${split.id}`);
    } else {
      openCreateModal(day);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 pt-6 pb-24">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#f1f5f9]">Weekly Splits</h1>
        </div>

        <div className="space-y-3">
          {DAYS.map((day) => {
            const split = splitByDay.get(day);
            return (
              <Card
                key={day}
                className="p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => handleDayClick(day)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0f172a] flex items-center justify-center">
                    <span className="text-[#6366f1] font-bold text-sm">{DAY_SHORT[day]}</span>
                  </div>
                  <div>
                    <p className="text-[#f1f5f9] font-medium">
                      {split ? split.name : 'Rest Day'}
                    </p>
                    <p className="text-[#94a3b8] text-xs capitalize">{capitalize(day)}</p>
                  </div>
                </div>
                {split ? (
                  <ChevronRight className="w-5 h-5 text-[#94a3b8]" />
                ) : (
                  <Plus className="w-5 h-5 text-[#94a3b8]" />
                )}
              </Card>
            );
          })}
        </div>
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
    </div>
  );
}
