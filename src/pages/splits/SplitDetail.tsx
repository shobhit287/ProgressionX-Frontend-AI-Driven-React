import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ArrowLeft, GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react';
import { useSplit, useUpdateSplit } from '@/api/splits';
import {
  useSplitExercises,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
  useReorderExercises,
} from '@/api/exercises';
import { useCustomizeSplit } from '@/api/ai';
import { useReplaceSingleSplit } from '@/api/splits';
import type { SplitExercise, WorkoutSplit, GeneratedDay } from '@/types';
import Button from '@/components/ui/Button';
import { Sparkles } from 'lucide-react';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Skeleton, { ListItemSkeleton } from '@/components/ui/Skeleton';
import { capitalize } from '@/utils/format';

type DayEnum = WorkoutSplit['day'];
const DAYS: DayEnum[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

type ExerciseType = SplitExercise['exerciseType'];
// Dropset is chosen per-set during the active session, not at split-creation time.
const EXERCISE_TYPES: ExerciseType[] = ['standard', 'superset', 'giant_set'];

interface ExerciseForm {
  name: string;
  defaultSets: string;
  exerciseType: ExerciseType;
  restSeconds: string;
  notes: string;
  supersetGroup: string;
}

const emptyForm: ExerciseForm = {
  name: '',
  defaultSets: '3',
  exerciseType: 'standard',
  restSeconds: '90',
  notes: '',
  supersetGroup: '',
};

export default function SplitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: split, isLoading: splitLoading } = useSplit(id!);
  const { data: exercises, isLoading: exLoading } = useSplitExercises(id!);
  const createExercise = useCreateExercise();
  const updateExercise = useUpdateExercise();
  const deleteExercise = useDeleteExercise();
  const reorderExercises = useReorderExercises();
  const updateSplit = useUpdateSplit();

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExerciseForm>(emptyForm);
  // Companion exercise names for superset/giant_set creation. One entry per
  // companion (main exercise name lives in form.name). Only used in create mode.
  const [companions, setCompanions] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [splitName, setSplitName] = useState('');
  const [splitDay, setSplitDay] = useState<DayEnum>('monday');
  const [splitDescription, setSplitDescription] = useState('');

  const customizeSplitAi = useCustomizeSplit();
  const replaceSplit = useReplaceSingleSplit();
  const [aiPreferences, setAiPreferences] = useState('');
  const [prefModalOpen, setPrefModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDay, setPreviewDay] = useState<GeneratedDay | null>(null);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [aiError, setAiError] = useState('');

  function updateField(field: keyof ExerciseForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openSplitEditModal() {
    if (!split) return;
    setSplitName(split.name);
    setSplitDay(split.day);
    setSplitDescription(split.description || '');
    setSplitModalOpen(true);
  }

  async function handleSplitUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!splitName.trim() || !id) return;
    try {
      await updateSplit.mutateAsync({
        id,
        name: splitName.trim(),
        day: splitDay,
        description: splitDescription.trim() || undefined,
      });
      setSplitModalOpen(false);
    } catch {
      // handled by query
    }
  }

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setCompanions([]);
    setModalOpen(true);
  }

  function openEditModal(ex: SplitExercise) {
    setEditingId(ex.id);
    setForm({
      name: ex.name,
      defaultSets: String(ex.defaultSets),
      exerciseType: ex.exerciseType,
      restSeconds: String(ex.restSeconds),
      notes: ex.notes || '',
      supersetGroup: ex.supersetGroup != null ? String(ex.supersetGroup) : '',
    });
    setCompanions([]);
    setModalOpen(true);
  }

  // When the user switches type in create mode, seed companion slots so the
  // UI matches the required pairing. Superset → 1 companion, giant_set → 2.
  function handleTypeChange(newType: ExerciseType) {
    updateField('exerciseType', newType);
    if (editingId) return; // don't touch companions in edit mode
    if (newType === 'superset' && companions.length === 0) {
      setCompanions(['']);
    } else if (newType === 'giant_set' && companions.length < 2) {
      setCompanions((prev) => {
        const needed = 2 - prev.length;
        return [...prev, ...Array(needed).fill('')];
      });
    } else if (newType !== 'superset' && newType !== 'giant_set') {
      setCompanions([]);
    }
  }

  function nextSupersetGroup(): number {
    const existing = (exercises || [])
      .map((e) => e.supersetGroup ?? 0)
      .filter((n) => n > 0);
    return existing.length > 0 ? Math.max(...existing) + 1 : 1;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const isGroupType = form.exerciseType === 'superset' || form.exerciseType === 'giant_set';
    const cleanedCompanions = companions.map((c) => c.trim()).filter(Boolean);

    // Validate companion count for new group-type exercises
    if (!editingId && isGroupType) {
      if (form.exerciseType === 'superset' && cleanedCompanions.length < 1) return;
      if (form.exerciseType === 'giant_set' && cleanedCompanions.length < 2) return;
    }

    const basePayload = {
      splitId: id!,
      name: form.name.trim(),
      defaultSets: Number(form.defaultSets) || 3,
      exerciseType: form.exerciseType,
      restSeconds: Number(form.restSeconds) || 90,
      notes: form.notes.trim() || undefined,
    };

    try {
      if (editingId) {
        // Edit mode — single row, manual group number
        await updateExercise.mutateAsync({
          id: editingId,
          ...basePayload,
          supersetGroup: form.supersetGroup ? Number(form.supersetGroup) : undefined,
        });
      } else if (isGroupType) {
        // Create mode with pairing — assign next group, POST main + companions
        const group = nextSupersetGroup();
        await createExercise.mutateAsync({ ...basePayload, supersetGroup: group });
        for (const compName of cleanedCompanions) {
          await createExercise.mutateAsync({
            ...basePayload,
            name: compName,
            supersetGroup: group,
          });
        }
      } else {
        // Standard / dropset — single row
        await createExercise.mutateAsync({
          ...basePayload,
          supersetGroup: form.supersetGroup ? Number(form.supersetGroup) : undefined,
        });
      }
      setModalOpen(false);
      setCompanions([]);
    } catch {
      // handled by query
    }
  }

  async function handleDrop(targetId: string) {
    if (!id || !draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const ordered = [...(exercises || [])].sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
    const fromIdx = ordered.findIndex((e) => e.id === draggedId);
    const toIdx = ordered.findIndex((e) => e.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    const [moved] = ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, moved);
    const orderedIds = ordered.map((e) => e.id);
    setDraggedId(null);
    setDragOverId(null);
    try {
      await reorderExercises.mutateAsync({ splitId: id, orderedIds });
    } catch {
      // handled by query
    }
  }

  async function handleMove(exerciseId: string, direction: 'up' | 'down') {
    if (!id || !exercises) return;
    const ordered = [...exercises].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = ordered.findIndex((e) => e.id === exerciseId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ordered.length) return;
    [ordered[idx], ordered[swapIdx]] = [ordered[swapIdx], ordered[idx]];
    try {
      await reorderExercises.mutateAsync({ splitId: id, orderedIds: ordered.map((e) => e.id) });
    } catch {
      // handled by query
    }
  }

  async function handleDelete(exerciseId: string) {
    try {
      await deleteExercise.mutateAsync({ splitId: id!, id: exerciseId });
      setDeleteConfirm(null);
    } catch {
      // handled by query
    }
  }

  async function handleCustomizeAi() {
    if (!id) return;
    setAiError('');
    setPrefModalOpen(false);
    try {
      const result = await customizeSplitAi.mutateAsync({
        splitId: id,
        preferences: aiPreferences.trim() || undefined,
      });
      setPreviewDay(result);
      setPreviewOpen(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Failed to customize split. Please try again.';
      setAiError(msg);
    }
  }

  async function handleApplyAi() {
    if (!id || !previewDay) return;
    try {
      await replaceSplit.mutateAsync({ id, data: previewDay });
      setConfirmReplaceOpen(false);
      setPreviewOpen(false);
      setPreviewDay(null);
    } catch {
      // handled by query
    }
  }

  const isLoading = splitLoading || exLoading;
  const isMutating = createExercise.isPending || updateExercise.isPending;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <div className="space-y-3">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      </div>
    );
  }

  if (!split) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-text-muted">Split not found</p>
      </div>
    );
  }

  const sortedExercises = [...(exercises || [])].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  return (
    <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/splits')}
            className="p-2 rounded-lg hover:bg-[#1e293b] transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#94a3b8]" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#f1f5f9]">{split.name}</h1>
            <p className="text-[#94a3b8] text-sm capitalize">{split.day}</p>
          </div>
          <button
            onClick={openSplitEditModal}
            className="p-2 rounded-lg hover:bg-[#1e293b] transition-colors"
            title="Edit split"
          >
            <Pencil className="w-5 h-5 text-[#94a3b8]" />
          </button>
          <button
            onClick={() => setPrefModalOpen(true)}
            className="p-2 rounded-lg hover:bg-[#6366f1]/10 transition-colors"
            title="Customize with AI"
          >
            <Sparkles className="w-5 h-5 text-[#6366f1]" />
          </button>
        </div>

        {aiError && (
          <div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 text-danger text-sm px-3 py-2">
            {aiError}
          </div>
        )}

        {split.description && (
          <p className="text-[#94a3b8] text-sm mb-4">{split.description}</p>
        )}

        {/* Exercise list */}
        <div className="space-y-3 mb-6">
          {sortedExercises.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#94a3b8]">No exercises yet</p>
              <p className="text-[#94a3b8] text-sm mt-1">Add your first exercise below</p>
            </div>
          ) : (
            sortedExercises.map((ex) => (
              <div
                key={ex.id}
                draggable
                onDragStart={(e) => {
                  setDraggedId(ex.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverId !== ex.id) setDragOverId(ex.id);
                }}
                onDragLeave={() => {
                  if (dragOverId === ex.id) setDragOverId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  void handleDrop(ex.id);
                }}
                onDragEnd={() => {
                  setDraggedId(null);
                  setDragOverId(null);
                }}
                className={`transition-opacity ${draggedId === ex.id ? 'opacity-40' : ''} ${
                  dragOverId === ex.id && draggedId !== ex.id
                    ? 'ring-2 ring-[#6366f1] rounded-xl'
                    : ''
                }`}
              >
              <Card className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Desktop: drag handle, Mobile: up/down buttons */}
                    <GripVertical className="w-5 h-5 text-[#334155] mt-0.5 flex-shrink-0 cursor-grab hidden sm:block" />
                    <div className="flex flex-col gap-0.5 flex-shrink-0 sm:hidden">
                      <button
                        onClick={() => handleMove(ex.id, 'up')}
                        disabled={ex === sortedExercises[0]}
                        className="p-0.5 rounded hover:bg-[#0f172a] transition-colors disabled:opacity-20"
                      >
                        <ChevronUp className="w-4 h-4 text-[#94a3b8]" />
                      </button>
                      <button
                        onClick={() => handleMove(ex.id, 'down')}
                        disabled={ex === sortedExercises[sortedExercises.length - 1]}
                        className="p-0.5 rounded hover:bg-[#0f172a] transition-colors disabled:opacity-20"
                      >
                        <ChevronDown className="w-4 h-4 text-[#94a3b8]" />
                      </button>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[#f1f5f9] font-medium">{ex.name}</p>
                        {ex.exerciseType !== 'standard' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#6366f1]/15 text-[#6366f1] font-medium">
                            {capitalize(ex.exerciseType.replace('_', ' '))}
                          </span>
                        )}
                      </div>
                      <p className="text-[#94a3b8] text-sm mt-1">
                        {ex.defaultSets} sets &middot; {ex.restSeconds}s rest
                      </p>
                      {ex.notes && (
                        <p className="text-[#94a3b8] text-xs mt-1 italic">{ex.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => openEditModal(ex)}
                      className="p-2 rounded-lg hover:bg-[#0f172a] transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-[#94a3b8]" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(ex.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </Card>
              </div>
            ))
          )}
        </div>

        {/* Add exercise button */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={openAddModal}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Exercise
        </Button>

      {/* Edit split modal */}
      <Modal
        open={splitModalOpen}
        onClose={() => setSplitModalOpen(false)}
        title="Edit Split"
      >
        <form onSubmit={handleSplitUpdate} className="space-y-4">
          <Input
            label="Split Name"
            placeholder="e.g. Push Day"
            value={splitName}
            onChange={(e) => setSplitName(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-1">Day</label>
            <select
              value={splitDay}
              onChange={(e) => setSplitDay(e.target.value as DayEnum)}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {capitalize(d)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-1">
              Description (optional)
            </label>
            <textarea
              value={splitDescription}
              onChange={(e) => setSplitDescription(e.target.value)}
              placeholder="Chest, shoulders, triceps..."
              rows={2}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] resize-none"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={updateSplit.isPending}
            className="w-full"
          >
            Update Split
          </Button>
        </form>
      </Modal>

      {/* Add/Edit exercise modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Exercise' : 'Add Exercise'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Exercise Name"
            placeholder="e.g. Bench Press"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Default Sets"
              type="number"
              placeholder="3"
              value={form.defaultSets}
              onChange={(e) => updateField('defaultSets', e.target.value)}
            />
            <Input
              label="Rest (seconds)"
              type="number"
              placeholder="90"
              value={form.restSeconds}
              onChange={(e) => updateField('restSeconds', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-1">
              Exercise Type
            </label>
            <select
              value={form.exerciseType}
              onChange={(e) => handleTypeChange(e.target.value as ExerciseType)}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            >
              {EXERCISE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {capitalize(t.replace('_', ' '))}
                </option>
              ))}
            </select>
          </div>

          {/* Create mode: paired superset/giant_set UX */}
          {!editingId &&
            (form.exerciseType === 'superset' || form.exerciseType === 'giant_set') && (
              <div className="rounded-lg border border-[#334155] bg-[#0f172a] p-3 space-y-2">
                <p className="text-xs text-[#94a3b8]">
                  {form.exerciseType === 'superset'
                    ? 'A superset pairs 2 exercises back-to-back.'
                    : 'A giant set chains 3 or more exercises back-to-back.'}{' '}
                  All will use the same sets & rest as above.
                </p>
                {companions.map((name, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={`Companion exercise ${i + 1}`}
                      value={name}
                      onChange={(e) =>
                        setCompanions((prev) =>
                          prev.map((c, j) => (j === i ? e.target.value : c)),
                        )
                      }
                      className="flex-1 h-10 rounded-lg bg-[#1e293b] border border-[#334155] text-[#f1f5f9] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#6366f1]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setCompanions((prev) => prev.filter((_, j) => j !== i))
                      }
                      disabled={
                        (form.exerciseType === 'superset' && companions.length <= 1) ||
                        (form.exerciseType === 'giant_set' && companions.length <= 2)
                      }
                      className="p-2 text-[#94a3b8] hover:text-red-400 disabled:opacity-30"
                      aria-label="Remove companion"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setCompanions((prev) => [...prev, ''])}
                  className="text-xs text-[#6366f1] hover:text-[#4f46e5] font-medium"
                >
                  + Add companion exercise
                </button>
              </div>
            )}

          {/* Edit mode: expose raw supersetGroup for manual adjustment */}
          {editingId &&
            (form.exerciseType === 'superset' || form.exerciseType === 'giant_set') && (
              <Input
                label="Superset Group"
                type="number"
                placeholder="1"
                value={form.supersetGroup}
                onChange={(e) => updateField('supersetGroup', e.target.value)}
              />
            )}

          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-1">
              Notes (optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any notes..."
              rows={2}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] resize-none"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isMutating}
            className="w-full"
          >
            {editingId ? 'Update Exercise' : 'Add Exercise'}
          </Button>
        </form>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Exercise"
      >
        <p className="text-[#94a3b8] mb-6">
          Are you sure you want to delete this exercise? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={() => setDeleteConfirm(null)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            className="flex-1"
            loading={deleteExercise.isPending}
            onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
          >
            Delete
          </Button>
        </div>
      </Modal>

      {/* AI Customization Preference Modal */}
      <Modal
        open={prefModalOpen}
        onClose={() => setPrefModalOpen(false)}
        title="Customize Split with AI"
      >
        <div className="space-y-4">
          <p className="text-text-muted text-sm">
            Focus on specific muscles, adjust intensity, or change the workout style.
          </p>
          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-1">
              Preferences & Context (optional)
            </label>
            <textarea
              value={aiPreferences}
              onChange={(e) => setAiPreferences(e.target.value)}
              placeholder="e.g. increase focus on biceps, add a dropset for bench press"
              rows={4}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] resize-none"
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleCustomizeAi}
            loading={customizeSplitAi.isPending}
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Generate New Plan
          </Button>
        </div>
      </Modal>

      {/* AI Preview Modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="AI-Generated Split Preview"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {previewDay && (
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-text font-semibold text-sm mb-1">
                {previewDay.name}
              </p>
              {previewDay.description && (
                <p className="text-text-muted text-xs mb-2">{previewDay.description}</p>
              )}
              {previewDay.exercises.length > 0 ? (
                <ul className="space-y-1 mt-2">
                  {previewDay.exercises.map((ex) => (
                    <li
                      key={ex.displayOrder}
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
              ) : (
                <p className="text-text-muted text-xs">No exercises / Rest day</p>
              )}
            </div>
          )}
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
            onClick={() => setConfirmReplaceOpen(true)}
          >
            Use This Plan
          </Button>
        </div>
      </Modal>

      {/* Confirm Replace Modal */}
      <Modal
        open={confirmReplaceOpen}
        onClose={() => setConfirmReplaceOpen(false)}
        title="Replace current split?"
      >
        <p className="text-text text-sm">
          Your current exercises for <span className="font-bold">{split.name}</span> will be{' '}
          <span className="text-danger font-semibold">overwritten</span>. This cannot be undone.
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
            loading={replaceSplit.isPending}
            onClick={handleApplyAi}
          >
            Yes, Replace
          </Button>
        </div>
      </Modal>
    </div>
  );
}
