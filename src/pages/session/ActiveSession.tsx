import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSession, useCompleteSession, useAbandonSession } from '@/api/sessions';
import { useAddSet, useUpdateSet, usePreviousSets } from '@/api/sets';
import type { PreviousSetData } from '@/api/sets';
import type { SessionExercise, ExerciseSet } from '@/types';
import { formatDuration, formatWeight } from '@/utils/format';
import { Timer, ChevronDown, ChevronUp, MessageSquare, Flame, ArrowDownCircle, Check, X } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Per-set input state                                                */
/* ------------------------------------------------------------------ */
interface SetInput {
  weightKg: string;
  reps: string;
  rir: string;
  isWarmup: boolean;
  isDropset: boolean;
  description: string;
}

const emptySet = (prefillWeight?: number): SetInput => ({
  weightKg: prefillWeight != null ? String(prefillWeight) : '',
  reps: '',
  rir: '',
  isWarmup: false,
  isDropset: false,
  description: '',
});

/* ------------------------------------------------------------------ */
/*  Elapsed timer hook                                                 */
/* ------------------------------------------------------------------ */
function useElapsedTimer(startedAt: string | undefined) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return elapsed;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function ActiveSession() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: session, isLoading, error } = useSession(id ?? '');
  const elapsed = useElapsedTimer(session?.startedAt);

  const addSet = useAddSet();
  const updateSet = useUpdateSet();
  const completeSession = useCompleteSession();
  const abandonSession = useAbandonSession();

  // Fetch previous session's sets for comparison
  const { data: previousSets } = usePreviousSets(id ?? '');

  /** Get previous set data for a given exercise + set number */
  const getPrevSet = (exerciseName: string, setNumber: number): PreviousSetData | undefined => {
    if (!previousSets) return undefined;
    const sets = previousSets[exerciseName.toLowerCase()];
    return sets?.find((s) => s.set_number === setNumber);
  };

  // Per-exercise pending input
  const [inputs, setInputs] = useState<Record<string, SetInput>>({});
  // Track which existing set is being edited (setId -> true)
  const [editing, setEditing] = useState<Record<string, SetInput>>({});
  // Expand/collapse exercises
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // Notes toggle per exercise
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});
  // Complete confirm
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const nextSetRef = useRef<HTMLDivElement | null>(null);

  /* Get or initialise input for an exercise */
  const getInput = useCallback(
    (exercise: SessionExercise): SetInput => {
      if (inputs[exercise.id]) return inputs[exercise.id];
      const lastSet = exercise.sets[exercise.sets.length - 1];
      return emptySet(lastSet?.weightKg);
    },
    [inputs],
  );

  const setInput = (exerciseId: string, patch: Partial<SetInput>) => {
    setInputs((prev) => ({
      ...prev,
      [exerciseId]: { ...getInputById(exerciseId, prev), ...patch },
    }));
  };

  /* helper that doesn't depend on getInput's closure over exercises */
  const getInputById = (exId: string, state: Record<string, SetInput>) =>
    state[exId] ?? emptySet();

  /* ---- Log a new set ---- */
  const handleLogSet = (exercise: SessionExercise) => {
    const inp = getInput(exercise);
    const weightKg = parseFloat(inp.weightKg);
    const reps = parseInt(inp.reps, 10);
    if (isNaN(weightKg) || isNaN(reps) || reps <= 0) return;

    addSet.mutate(
      {
        sessionId: id!,
        exerciseId: exercise.id,
        weightKg,
        reps,
        repsInReserve: inp.rir !== '' ? parseInt(inp.rir, 10) : undefined,
        isWarmup: inp.isWarmup,
        isDropset: inp.isDropset,
        description: inp.description || undefined,
      },
      {
        onSuccess: () => {
          // Reset input, pre-fill weight from just-logged set
          setInputs((prev) => ({ ...prev, [exercise.id]: emptySet(weightKg) }));
        },
      },
    );
  };

  /* ---- Save edited set ---- */
  const handleSaveEdit = (exercise: SessionExercise, set: ExerciseSet) => {
    const inp = editing[set.id];
    if (!inp) return;
    const weightKg = parseFloat(inp.weightKg);
    const reps = parseInt(inp.reps, 10);
    if (isNaN(weightKg) || isNaN(reps) || reps <= 0) return;

    updateSet.mutate(
      {
        sessionId: id!,
        exerciseId: exercise.id,
        setId: set.id,
        weightKg,
        reps,
        repsInReserve: inp.rir !== '' ? parseInt(inp.rir, 10) : undefined,
        isWarmup: inp.isWarmup,
        isDropset: inp.isDropset,
        description: inp.description || undefined,
      },
      {
        onSuccess: () => {
          setEditing((prev) => {
            const next = { ...prev };
            delete next[set.id];
            return next;
          });
        },
      },
    );
  };

  const startEdit = (set: ExerciseSet) => {
    setEditing((prev) => ({
      ...prev,
      [set.id]: {
        weightKg: String(set.weightKg),
        reps: String(set.reps),
        rir: set.repsInReserve != null ? String(set.repsInReserve) : '',
        isWarmup: set.isWarmup,
        isDropset: set.isDropset,
        description: set.description ?? '',
      },
    }));
  };

  const cancelEdit = (setId: string) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[setId];
      return next;
    });
  };

  const handleComplete = () => {
    completeSession.mutate(
      { id: id! },
      { onSuccess: () => navigate('/') },
    );
  };

  const handleAbandon = () => {
    abandonSession.mutate(id!, {
      onSuccess: () => navigate('/'),
    });
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
        <div className="animate-spin h-10 w-10 border-4 border-[#6366f1] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] text-[#f1f5f9] gap-4 p-6">
        <p className="text-lg">Session not found</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-[#6366f1] rounded-xl text-base font-semibold"
        >
          Go Home
        </button>
      </div>
    );
  }

  const isActive = session.status === 'in_progress';

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9] pb-32">
      {/* ---- Timer header ---- */}
      <div className="sticky top-0 z-30 bg-[#0f172a]/95 backdrop-blur border-b border-[#334155] px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-[#6366f1]" />
            <span className="text-2xl font-mono font-bold tracking-wider">
              {formatDuration(elapsed)}
            </span>
          </div>
          {!isActive && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#334155] text-[#94a3b8] uppercase">
              {session.status}
            </span>
          )}
        </div>
      </div>

      {/* ---- Exercise cards ---- */}
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {session.exercises.map((exercise) => {
          const isCollapsed = collapsed[exercise.id] ?? false;
          const inp = getInput(exercise);

          return (
            <div
              key={exercise.id}
              className="bg-[#1e293b] rounded-2xl overflow-hidden"
            >
              {/* Exercise header */}
              <button
                className="w-full flex items-center justify-between px-4 py-3"
                onClick={() =>
                  setCollapsed((p) => ({ ...p, [exercise.id]: !isCollapsed }))
                }
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#f1f5f9]">
                    {exercise.exerciseName}
                  </h3>
                  {exercise.exerciseType !== 'standard' && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#6366f1]/20 text-[#6366f1]">
                      {exercise.exerciseType.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[#94a3b8]">
                  <span className="text-sm">{exercise.sets.length} sets</span>
                  {isCollapsed ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </div>
              </button>

              {!isCollapsed && (
                <div className="px-4 pb-4">
                  {/* Sets table header */}
                  <div className="grid grid-cols-[32px_1fr_1fr_48px_28px] gap-1 text-[10px] uppercase tracking-wider text-[#94a3b8] mb-1 px-1 min-w-0">
                    <span>Set</span>
                    <span>Weight</span>
                    <span>Reps</span>
                    <span>RIR</span>
                    <span />
                  </div>

                  {/* Existing sets */}
                  {exercise.sets.map((set) => {
                    const isEditing = !!editing[set.id];
                    const editInp = editing[set.id];

                    if (isEditing && editInp) {
                      return (
                        <div
                          key={set.id}
                          className="grid grid-cols-[32px_1fr_1fr_48px_28px] gap-1 items-center mb-1"
                        >
                          <span className="text-sm text-[#94a3b8] text-center">
                            {set.setNumber}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            value={editInp.weightKg}
                            onChange={(e) =>
                              setEditing((p) => ({
                                ...p,
                                [set.id]: { ...p[set.id], weightKg: e.target.value },
                              }))
                            }
                            className="h-11 min-w-0 rounded-lg bg-[#0f172a] border border-[#334155] text-center text-[#f1f5f9] text-sm font-semibold focus:border-[#6366f1] outline-none"
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            value={editInp.reps}
                            onChange={(e) =>
                              setEditing((p) => ({
                                ...p,
                                [set.id]: { ...p[set.id], reps: e.target.value },
                              }))
                            }
                            className="h-11 min-w-0 rounded-lg bg-[#0f172a] border border-[#334155] text-center text-[#f1f5f9] text-sm font-semibold focus:border-[#6366f1] outline-none"
                          />
                          <select
                            value={editInp.rir}
                            onChange={(e) =>
                              setEditing((p) => ({
                                ...p,
                                [set.id]: { ...p[set.id], rir: e.target.value },
                              }))
                            }
                            className="h-11 min-w-0 rounded-lg bg-[#0f172a] border border-[#334155] text-center text-[#f1f5f9] text-sm focus:border-[#6366f1] outline-none appearance-none"
                          >
                            <option value="">-</option>
                            {[0, 1, 2, 3, 4, 5].map((v) => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                          <div className="flex gap-0.5">
                            <button
                              onClick={() => handleSaveEdit(exercise, set)}
                              className="text-[#22c55e]"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => cancelEdit(set.id)}
                              className="text-[#ef4444]"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    const prev = getPrevSet(exercise.exerciseName, set.setNumber);
                    return (
                      <div key={set.id} className="mb-1">
                        <button
                          className="grid grid-cols-[32px_1fr_1fr_48px_28px] gap-1 items-center w-full text-left rounded-lg hover:bg-[#334155]/40 px-1 py-1 transition-colors"
                          onClick={() => isActive && startEdit(set)}
                        >
                          <span className="text-sm text-[#94a3b8] text-center">
                            {set.setNumber}
                            {set.isWarmup && (
                              <Flame className="w-3 h-3 text-[#f59e0b] inline ml-0.5" />
                            )}
                          </span>
                          <span className="text-base font-semibold text-center">
                            {formatWeight(set.weightKg)}
                          </span>
                          <span className="text-base font-semibold text-center">
                            {set.reps}
                          </span>
                          <span className="text-sm text-[#94a3b8] text-center">
                            {set.repsInReserve != null ? set.repsInReserve : '-'}
                          </span>
                          <span>
                            {set.isDropset && (
                              <ArrowDownCircle className="w-4 h-4 text-[#6366f1]" />
                            )}
                          </span>
                        </button>
                        {prev && (
                          <div className="grid grid-cols-[32px_1fr_1fr_48px_28px] gap-1 px-1 -mt-0.5 mb-0.5">
                            <span />
                            <span className="text-[10px] text-[#475569] text-center">prev {prev.weight_kg}</span>
                            <span className="text-[10px] text-[#475569] text-center">prev {prev.reps}</span>
                            <span className="text-[10px] text-[#475569] text-center">
                              {prev.reps_in_reserve != null ? prev.reps_in_reserve : ''}
                            </span>
                            <span />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* New set row (only if active) */}
                  {isActive && (
                    <>
                      {/* Previous session hint for the next set */}
                      {(() => {
                        const nextSetNum = exercise.sets.length + 1;
                        const prev = getPrevSet(exercise.exerciseName, nextSetNum);
                        if (!prev) return null;
                        return (
                          <div className="grid grid-cols-[32px_1fr_1fr_48px_28px] gap-1 items-center mt-2 px-1">
                            <span className="text-[10px] text-[#6366f1] text-center font-semibold">PREV</span>
                            <span className="text-xs text-[#94a3b8] text-center">{prev.weight_kg} kg</span>
                            <span className="text-xs text-[#94a3b8] text-center">{prev.reps} reps</span>
                            <span className="text-xs text-[#94a3b8] text-center">
                              {prev.reps_in_reserve != null ? `${prev.reps_in_reserve} RIR` : '-'}
                            </span>
                            <span />
                          </div>
                        );
                      })()}
                      <div
                        ref={nextSetRef}
                        className="grid grid-cols-[32px_1fr_1fr_48px_28px] gap-1 items-center mt-1"
                      >
                        <span className="text-sm text-[#6366f1] text-center font-bold">
                          {exercise.sets.length + 1}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          placeholder="kg"
                          value={inp.weightKg}
                          onChange={(e) =>
                            setInput(exercise.id, { weightKg: e.target.value })
                          }
                          className="h-12 min-w-0 rounded-lg bg-[#0f172a] border-2 border-[#334155] text-center text-[#f1f5f9] text-base font-bold placeholder:text-[#475569] focus:border-[#6366f1] outline-none"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="reps"
                          value={inp.reps}
                          onChange={(e) =>
                            setInput(exercise.id, { reps: e.target.value })
                          }
                          className="h-12 min-w-0 rounded-lg bg-[#0f172a] border-2 border-[#334155] text-center text-[#f1f5f9] text-base font-bold placeholder:text-[#475569] focus:border-[#6366f1] outline-none"
                        />
                        <select
                          value={inp.rir}
                          onChange={(e) =>
                            setInput(exercise.id, { rir: e.target.value })
                          }
                          className="h-12 min-w-0 rounded-lg bg-[#0f172a] border-2 border-[#334155] text-center text-[#f1f5f9] text-sm focus:border-[#6366f1] outline-none appearance-none"
                        >
                          <option value="">RIR</option>
                          {[0, 1, 2, 3, 4, 5].map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                        <button
                          onClick={() =>
                            setShowNotes((p) => ({
                              ...p,
                              [exercise.id]: !p[exercise.id],
                            }))
                          }
                          className="text-[#94a3b8] hover:text-[#f1f5f9]"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Toggles row */}
                      <div className="flex items-center gap-4 mt-2 ml-10">
                        <label className="flex items-center gap-1.5 text-sm text-[#94a3b8]">
                          <input
                            type="checkbox"
                            checked={inp.isWarmup}
                            onChange={(e) =>
                              setInput(exercise.id, { isWarmup: e.target.checked })
                            }
                            className="w-5 h-5 rounded accent-[#f59e0b]"
                          />
                          Warmup
                        </label>
                        <label className="flex items-center gap-1.5 text-sm text-[#94a3b8]">
                          <input
                            type="checkbox"
                            checked={inp.isDropset}
                            onChange={(e) =>
                              setInput(exercise.id, { isDropset: e.target.checked })
                            }
                            className="w-5 h-5 rounded accent-[#6366f1]"
                          />
                          Dropset
                        </label>
                      </div>

                      {/* Notes input */}
                      {showNotes[exercise.id] && (
                        <input
                          type="text"
                          placeholder="Set notes..."
                          value={inp.description}
                          onChange={(e) =>
                            setInput(exercise.id, { description: e.target.value })
                          }
                          className="mt-2 w-full h-11 rounded-lg bg-[#0f172a] border border-[#334155] px-3 text-[#f1f5f9] text-sm placeholder:text-[#475569] focus:border-[#6366f1] outline-none"
                        />
                      )}

                      {/* Log set button */}
                      <button
                        onClick={() => handleLogSet(exercise)}
                        disabled={addSet.isPending}
                        className="mt-3 w-full h-12 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] active:bg-[#4338ca] text-white text-base font-bold transition-colors disabled:opacity-50"
                      >
                        {addSet.isPending ? 'Logging...' : 'Log Set'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- Sticky bottom bar ---- */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/95 backdrop-blur border-t border-[#334155] p-4 z-30">
          <div className="max-w-lg mx-auto space-y-2">
            {!showCompleteConfirm && !showAbandonConfirm && (
              <>
                <button
                  onClick={() => setShowCompleteConfirm(true)}
                  className="w-full h-14 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] active:bg-[#15803d] text-white text-lg font-bold transition-colors"
                >
                  Complete Workout
                </button>
                <button
                  onClick={() => setShowAbandonConfirm(true)}
                  className="w-full text-center text-sm text-[#94a3b8] hover:text-[#ef4444] py-2 transition-colors"
                >
                  Abandon Session
                </button>
              </>
            )}

            {showCompleteConfirm && (
              <div className="flex gap-3">
                <button
                  onClick={handleComplete}
                  disabled={completeSession.isPending}
                  className="flex-1 h-14 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-white text-lg font-bold disabled:opacity-50"
                >
                  {completeSession.isPending ? 'Completing...' : 'Confirm Complete'}
                </button>
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  className="px-6 h-14 rounded-xl bg-[#334155] text-[#f1f5f9] font-semibold"
                >
                  Cancel
                </button>
              </div>
            )}

            {showAbandonConfirm && (
              <div className="flex gap-3">
                <button
                  onClick={handleAbandon}
                  disabled={abandonSession.isPending}
                  className="flex-1 h-14 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white text-lg font-bold disabled:opacity-50"
                >
                  {abandonSession.isPending ? 'Abandoning...' : 'Confirm Abandon'}
                </button>
                <button
                  onClick={() => setShowAbandonConfirm(false)}
                  className="px-6 h-14 rounded-xl bg-[#334155] text-[#f1f5f9] font-semibold"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
