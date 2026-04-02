import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ArrowLeft, GripVertical } from 'lucide-react';
import { useSplit } from '@/api/splits';
import {
  useSplitExercises,
  useCreateExercise,
  useUpdateExercise,
  useDeleteExercise,
} from '@/api/exercises';
import type { SplitExercise } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Skeleton, { ListItemSkeleton } from '@/components/ui/Skeleton';
import { capitalize } from '@/utils/format';

type ExerciseType = SplitExercise['exerciseType'];
const EXERCISE_TYPES: ExerciseType[] = ['standard', 'superset', 'dropset', 'giant_set'];

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

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExerciseForm>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function updateField(field: keyof ExerciseForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
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
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload = {
      splitId: id!,
      name: form.name.trim(),
      defaultSets: Number(form.defaultSets) || 3,
      exerciseType: form.exerciseType,
      restSeconds: Number(form.restSeconds) || 90,
      notes: form.notes.trim() || undefined,
      supersetGroup: form.supersetGroup ? Number(form.supersetGroup) : undefined,
    };

    try {
      if (editingId) {
        await updateExercise.mutateAsync({ id: editingId, ...payload });
      } else {
        await createExercise.mutateAsync(payload);
      }
      setModalOpen(false);
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
        </div>

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
              <Card key={ex.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <GripVertical className="w-5 h-5 text-[#334155] mt-0.5 flex-shrink-0" />
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
              onChange={(e) => updateField('exerciseType', e.target.value)}
              className="w-full rounded-lg bg-[#0f172a] border border-[#334155] text-[#f1f5f9] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
            >
              {EXERCISE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {capitalize(t.replace('_', ' '))}
                </option>
              ))}
            </select>
          </div>

          {(form.exerciseType === 'superset' || form.exerciseType === 'giant_set') && (
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
    </div>
  );
}
