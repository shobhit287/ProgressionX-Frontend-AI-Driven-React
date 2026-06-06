import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useSession, useCompleteSession, useAbandonSession } from '@/api/sessions';
import { useAddSet, useUpdateSet, useDeleteSet, usePreviousSets } from '@/api/sets';
import SessionCoach from '@/components/SessionCoach';
import AiSessionPlan from '@/components/AiSessionPlan';
import LastSessionPanel from '@/components/LastSessionPanel';
import type { PreviousSetData } from '@/api/sets';
import type { SessionExercise, ExerciseSet } from '@/types';
import { formatDuration, formatWeight } from '@/utils/format';
import {
  primeRestAudio,
  ensureNotificationPermission,
  scheduleRestAlert,
  requestScreenWakeLock,
  releaseScreenWakeLock,
  resumeAudioIfSuspended,
  type RestAlertHandle,
} from '@/utils/restNotify';
import { Timer, ChevronDown, ChevronUp, MessageSquare, Flame, ArrowDownCircle, Check, X, Trash2, Bell, BellOff } from 'lucide-react';

const REST_DEFAULT_KEY = 'progressionx.restSeconds';
const REST_DEFAULT_FALLBACK = 90;

function loadDefaultRest(): number {
  if (typeof window === 'undefined') return REST_DEFAULT_FALLBACK;
  const raw = window.localStorage.getItem(REST_DEFAULT_KEY);
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : REST_DEFAULT_FALLBACK;
}

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
  const [searchParams] = useSearchParams();
  // Edit mode is set when the user opens this page to fill in a backfilled
  // (already-completed) session, or to retroactively edit an old session.
  // It unlocks add/edit/delete-set inputs without flipping the session back
  // to IN_PROGRESS, which would conflict with today's live session.
  const editMode = searchParams.get('edit') === '1';

  const { data: session, isLoading, error } = useSession(id ?? '');
  const elapsed = useElapsedTimer(session?.startedAt);

  const addSet = useAddSet();
  const updateSet = useUpdateSet();
  const deleteSet = useDeleteSet();
  const completeSession = useCompleteSession();
  const abandonSession = useAbandonSession();

  // Auto-complete if this session is from a previous day. Skipped in edit
  // mode — backfill sessions are intentionally past-dated and must not be
  // auto-completed (they already are completed, and we're editing them).
  const autoCompletedRef = useRef(false);
  useEffect(() => {
    if (!session || autoCompletedRef.current) return;
    if (editMode) return;
    if (session.status !== 'in_progress') return;

    const startedDay = new Date(session.startedAt);
    startedDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startedDay >= today) return;

    autoCompletedRef.current = true;
    completeSession.mutate(
      { id: session.id, notes: 'Auto-completed (session from previous day)' },
      { onSuccess: () => navigate('/') },
    );
  }, [session, completeSession, navigate, editMode]);

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
  // Dropset capture flow — active when user checks "Dropset" and logs a top
  // set. Remembers the top set id so subsequent drops are linked to it.
  const [dropFlow, setDropFlow] = useState<
    Record<string, { parentSetId: string; lastWeight: number } | null>
  >({});
  const [dropInputs, setDropInputs] = useState<Record<string, SetInput>>({});
  // Expand/collapse exercises
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  // Notes toggle per exercise
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});
  // Delete confirm for sets
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // Complete confirm
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  const nextSetRef = useRef<HTMLDivElement | null>(null);

  /* ---- Rest timer state ---- */
  const [restSeconds, setRestSeconds] = useState<number>(loadDefaultRest);
  const [restStartedAt, setRestStartedAt] = useState<Record<string, number>>({});
  const [now, setNow] = useState<number>(() => Date.now());
  const [notifGranted, setNotifGranted] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
  );
  // Scheduled alert handles per exercise — pre-scheduled at rest start so the
  // beep fires even if the browser throttles JS while backgrounded.
  const alertHandlesRef = useRef<Record<string, RestAlertHandle>>({});
  // The `startedAt` each alert was scheduled against, so we can detect when a
  // rest restarts (same exId, new startedAt) and reschedule.
  const alertStartedAtRef = useRef<Record<string, number>>({});

  // Tick every second only while at least one rest timer is active.
  useEffect(() => {
    const ids = Object.keys(restStartedAt);
    if (ids.length === 0) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [restStartedAt]);

  // Schedule a rest alert whenever a rest timer starts or restarts.
  useEffect(() => {
    Object.entries(restStartedAt).forEach(([exId, startedAt]) => {
      if (alertStartedAtRef.current[exId] === startedAt) return;
      // Cancel any prior scheduled alert for this exercise.
      alertHandlesRef.current[exId]?.cancel();
      const ex = session?.exercises.find((e) => e.id === exId);
      const delay = Math.max(0, restSeconds - (Date.now() - startedAt) / 1000);
      alertHandlesRef.current[exId] = scheduleRestAlert(delay, ex?.exerciseName ?? 'Set');
      alertStartedAtRef.current[exId] = startedAt;
    });
    // Drop tracking for removed rest timers.
    Object.keys(alertStartedAtRef.current).forEach((exId) => {
      if (!(exId in restStartedAt)) {
        alertHandlesRef.current[exId]?.cancel();
        delete alertHandlesRef.current[exId];
        delete alertStartedAtRef.current[exId];
      }
    });
  }, [restStartedAt, restSeconds, session]);

  // Cancel all pending alerts on unmount.
  useEffect(() => {
    return () => {
      Object.values(alertHandlesRef.current).forEach((h) => h.cancel());
      alertHandlesRef.current = {};
      alertStartedAtRef.current = {};
    };
  }, []);

  // Keep the screen awake while any rest timer is running so the browser
  // doesn't suspend audio / vibration / JS timers.
  useEffect(() => {
    const anyActive = Object.keys(restStartedAt).length > 0;
    if (!anyActive) {
      releaseScreenWakeLock();
      return;
    }
    void requestScreenWakeLock();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        resumeAudioIfSuspended();
        void requestScreenWakeLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [restStartedAt]);

  // Release wake lock on unmount.
  useEffect(() => {
    return () => releaseScreenWakeLock();
  }, []);

  // Persist rest setting
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(REST_DEFAULT_KEY, String(restSeconds));
  }, [restSeconds]);

  const handleEnableNotifications = async () => {
    primeRestAudio();
    const ok = await ensureNotificationPermission();
    setNotifGranted(ok);
  };

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

  /* ---- Log a new set ----
     If "Dropset" was checked, we save the TOP set without the dropset flag
     (it's the heavy set, not a drop), then open the drop-capture flow so
     the user can record each drop's weight/reps/RIR with the parent link. */
  const handleLogSet = (exercise: SessionExercise) => {
    const inp = getInput(exercise);
    const weightKg = parseFloat(inp.weightKg);
    const reps = parseInt(inp.reps, 10);
    if (isNaN(weightKg) || isNaN(reps) || reps <= 0) return;

    const wasDropset = inp.isDropset;

    addSet.mutate(
      {
        sessionId: id!,
        exerciseId: exercise.id,
        weightKg,
        reps,
        repsInReserve: inp.rir !== '' ? parseInt(inp.rir, 10) : undefined,
        isWarmup: inp.isWarmup,
        // The top set is NOT a drop itself — drops are separate rows.
        isDropset: false,
        description: inp.description || undefined,
      },
      {
        onSuccess: (saved) => {
          setInputs((prev) => ({ ...prev, [exercise.id]: emptySet(weightKg) }));
          primeRestAudio();
          setRestStartedAt((prev) => ({ ...prev, [exercise.id]: Date.now() }));

          if (wasDropset && saved?.id) {
            const dropW = Math.max(0.5, Math.round(weightKg * 0.7 * 2) / 2);
            setDropFlow((prev) => ({
              ...prev,
              [exercise.id]: { parentSetId: saved.id, lastWeight: weightKg },
            }));
            setDropInputs((prev) => ({ ...prev, [exercise.id]: emptySet(dropW) }));
          }
        },
      },
    );
  };

  /* ---- Log a drop under the current dropset chain ---- */
  const handleLogDrop = (exercise: SessionExercise) => {
    const flow = dropFlow[exercise.id];
    if (!flow) return;
    const inp = dropInputs[exercise.id] ?? emptySet();
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
        isWarmup: false,
        isDropset: true,
        parentSetId: flow.parentSetId,
        description: inp.description || undefined,
      },
      {
        onSuccess: () => {
          const nextW = Math.max(0.5, Math.round(weightKg * 0.7 * 2) / 2);
          setDropFlow((prev) => ({
            ...prev,
            [exercise.id]: { parentSetId: flow.parentSetId, lastWeight: weightKg },
          }));
          setDropInputs((prev) => ({ ...prev, [exercise.id]: emptySet(nextW) }));
        },
      },
    );
  };

  const finishDrops = (exerciseId: string) => {
    setDropFlow((prev) => ({ ...prev, [exerciseId]: null }));
    setDropInputs((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
  };

  const setDropInput = (exId: string, patch: Partial<SetInput>) => {
    setDropInputs((prev) => ({
      ...prev,
      [exId]: { ...(prev[exId] ?? emptySet()), ...patch },
    }));
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
    setDeleteConfirm(null);
  };

  const handleDeleteSet = (setId: string) => {
    deleteSet.mutate(
      { sessionId: id!, setId },
      {
        onSuccess: () => {
          setDeleteConfirm(null);
          cancelEdit(setId);
        },
      },
    );
  };

  const handleComplete = async () => {
    await completeSession.mutateAsync({ id: id! });
    navigate('/');
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
      <div className="space-y-4 pt-4">
        <div className="h-14 rounded-lg bg-surface-light/50 animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface rounded-2xl p-4 space-y-3">
            <div className="h-5 w-1/3 rounded bg-surface-light/50 animate-pulse" />
            <div className="h-4 w-full rounded bg-surface-light/50 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-surface-light/50 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-lg text-text">Session not found</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-primary rounded-xl text-base font-semibold text-white"
        >
          Go Home
        </button>
      </div>
    );
  }

  const isActive = session.status === 'in_progress';
  // Inputs/edit-on-tap are gated on this, NOT on isActive — backfill /
  // retroactive editing of a completed session uses ?edit=1 to opt in.
  const canEdit = isActive || editMode;

  return (
    <div className={canEdit ? 'pb-44' : 'pb-8'}>
      {/* ---- Timer header ---- */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto gap-3">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            <span className="text-2xl font-mono font-bold tracking-wider">
              {formatDuration(elapsed)}
            </span>
          </div>
          {isActive && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[11px] text-text-muted">
                Rest
                <input
                  type="number"
                  inputMode="numeric"
                  min={10}
                  step={5}
                  value={restSeconds}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (Number.isFinite(v) && v > 0) setRestSeconds(v);
                  }}
                  className="w-14 h-8 rounded-md bg-surface border border-border text-center text-text text-sm font-semibold focus:border-primary outline-none"
                />
                <span>s</span>
              </label>
              <button
                onClick={handleEnableNotifications}
                title={notifGranted ? 'Notifications enabled' : 'Enable rest notifications'}
                className="h-8 w-8 flex items-center justify-center rounded-md bg-surface border border-border active:bg-surface-light/40"
              >
                {notifGranted ? (
                  <Bell className="w-4 h-4 text-primary" />
                ) : (
                  <BellOff className="w-4 h-4 text-text-muted" />
                )}
              </button>
            </div>
          )}
          {!isActive && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-surface-light text-text-muted uppercase">
              {session.status}
            </span>
          )}
        </div>
      </div>

      {/* ---- Backfill / edit-mode banner ---- */}
      {!isActive && editMode && (
        <div className="max-w-lg mx-auto px-3 pt-3">
          <div className="rounded-xl bg-warning/10 border border-warning/30 px-4 py-3">
            <p className="text-warning text-sm font-semibold">
              Logging past session
            </p>
            <p className="text-text-muted text-xs mt-0.5">
              {session.startedAt && `Workout on ${new Date(session.startedAt).toLocaleDateString()}. `}
              Add sets you did that day. Tap Done when finished.
            </p>
          </div>
        </div>
      )}

      {/* ---- AI Recommended Plan ---- */}
      {isActive && <AiSessionPlan sessionId={id!} />}

      {/* ---- Last Session (collapsed by default) ---- */}
      {isActive && <LastSessionPanel sessionId={id!} />}

      {/* ---- Exercise cards ---- */}
      <div className="max-w-lg mx-auto px-3 pt-4 space-y-4">
        {session.exercises.map((exercise) => {
          const isCollapsed = collapsed[exercise.id] ?? false;
          const inp = getInput(exercise);
          const restStarted = restStartedAt[exercise.id];
          const restRemaining =
            restStarted != null ? Math.max(0, restSeconds - Math.floor((now - restStarted) / 1000)) : null;
          const restOverdue = restStarted != null && restRemaining === 0;

          // Compute display labels for every set so drops show as
          // <parent>.<n> (e.g. 3.1, 3.2) and regular sets count
          // sequentially 1, 2, 3 — independent of raw DB set_number which
          // jumps over drop rows. Same numbering scheme as the export PDF.
          const sortedSets = [...exercise.sets].sort(
            (a, b) => a.setNumber - b.setNumber,
          );
          const setLabels: Record<string, string> = {};
          let parentNum = 0;
          let dropIdx = 0;
          for (const s of sortedSets) {
            if (s.parentSetId) {
              dropIdx += 1;
              setLabels[s.id] = `${parentNum}.${dropIdx}`;
            } else {
              parentNum += 1;
              dropIdx = 0;
              setLabels[s.id] = String(parentNum);
            }
          }
          const regularSetCount = parentNum;
          const nextRegularLabel = String(regularSetCount + 1);

          // While a drop chain is active, compute the next drop's label
          // (e.g. 3.2 if one drop already exists for the top set 3).
          const flow = dropFlow[exercise.id];
          let nextDropLabel: string | null = null;
          if (flow) {
            const parentLabel = setLabels[flow.parentSetId] ?? '?';
            const existingDropCount = exercise.sets.filter(
              (s) => s.parentSetId === flow.parentSetId,
            ).length;
            nextDropLabel = `${parentLabel}.${existingDropCount + 1}`;
          }

          return (
            <div
              key={exercise.id}
              className="bg-surface rounded-2xl overflow-hidden"
            >
              {/* Exercise header */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 touch-manipulation"
                onClick={() =>
                  setCollapsed((p) => ({ ...p, [exercise.id]: !isCollapsed }))
                }
              >
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-base font-bold text-text truncate">
                    {exercise.exerciseName}
                  </h3>
                  {exercise.exerciseType !== 'standard' && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary shrink-0">
                      {exercise.exerciseType.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-text-muted shrink-0 ml-2">
                  {restRemaining != null && (
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full tabular-nums ${
                        restOverdue
                          ? 'bg-danger/20 text-danger animate-pulse'
                          : 'bg-primary/15 text-primary'
                      }`}
                    >
                      {restOverdue ? 'GO!' : `${restRemaining}s`}
                    </span>
                  )}
                  <span className="text-sm">{exercise.sets.length} sets</span>
                  {isCollapsed ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </div>
              </button>

              {!isCollapsed && (
                <div className="px-3 pb-4">
                  {/* Sets table header */}
                  <div className="grid grid-cols-[28px_1fr_1fr_44px] gap-1.5 text-[10px] uppercase tracking-wider text-text-muted mb-1 px-1">
                    <span>Set</span>
                    <span>Weight</span>
                    <span>Reps</span>
                    <span>RIR</span>
                  </div>

                  {/* Existing sets */}
                  {exercise.sets.map((set) => {
                    const isEditing = !!editing[set.id];
                    const editInp = editing[set.id];

                    if (isEditing && editInp) {
                      return (
                        <div key={set.id} className="mb-1">
                          <div className="grid grid-cols-[28px_1fr_1fr_44px] gap-1.5 items-center">
                            <span className="text-sm text-text-muted text-center">
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
                              className="h-11 min-w-0 rounded-lg bg-background border border-border text-center text-text text-sm font-semibold focus:border-primary outline-none"
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
                              className="h-11 min-w-0 rounded-lg bg-background border border-border text-center text-text text-sm font-semibold focus:border-primary outline-none"
                            />
                            <select
                              value={editInp.rir}
                              onChange={(e) =>
                                setEditing((p) => ({
                                  ...p,
                                  [set.id]: { ...p[set.id], rir: e.target.value },
                                }))
                              }
                              className="h-11 min-w-0 rounded-lg bg-background border border-border text-center text-text text-sm focus:border-primary outline-none appearance-none"
                            >
                              <option value="">-</option>
                              {[0, 1, 2, 3, 4, 5].map((v) => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex justify-end gap-2 mt-1 pr-1">
                            {deleteConfirm === set.id ? (
                              <>
                                <button
                                  onClick={() => handleDeleteSet(set.id)}
                                  disabled={deleteSet.isPending}
                                  className="flex items-center gap-1 text-danger text-sm font-medium px-3 py-1 rounded-lg active:bg-danger/10 disabled:opacity-50"
                                >
                                  {deleteSet.isPending ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="flex items-center gap-1 text-text-muted text-sm font-medium px-3 py-1 rounded-lg active:bg-surface-light/40"
                                >
                                  Back
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(exercise, set)}
                                  className="flex items-center gap-1 text-success text-sm font-medium px-3 py-1 rounded-lg active:bg-success/10"
                                >
                                  <Check className="w-4 h-4" /> Save
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(set.id)}
                                  className="flex items-center gap-1 text-danger text-sm font-medium px-3 py-1 rounded-lg active:bg-danger/10"
                                >
                                  <Trash2 className="w-4 h-4" /> Delete
                                </button>
                                <button
                                  onClick={() => cancelEdit(set.id)}
                                  className="flex items-center gap-1 text-text-muted text-sm font-medium px-3 py-1 rounded-lg active:bg-surface-light/40"
                                >
                                  <X className="w-4 h-4" /> Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    }

                    const prev = getPrevSet(exercise.exerciseName, set.setNumber);
                    const isDrop = !!set.parentSetId;
                    return (
                      <div key={set.id} className={`mb-1 ${isDrop ? 'ml-6 border-l-2 border-primary/40 pl-1' : ''}`}>
                        <button
                          className="grid grid-cols-[28px_1fr_1fr_44px] gap-1.5 items-center w-full text-left rounded-lg active:bg-surface-light/40 px-1 py-1.5 transition-colors touch-manipulation"
                          onClick={() => canEdit && startEdit(set)}
                        >
                          <span className={`text-sm text-center ${isDrop ? 'text-primary font-semibold' : 'text-text-muted'}`}>
                            {setLabels[set.id] ?? set.setNumber}
                            {set.isWarmup && (
                              <Flame className="w-3 h-3 text-warning inline ml-0.5" />
                            )}
                          </span>
                          <span className="text-base font-semibold text-center">
                            {formatWeight(set.weightKg)}
                          </span>
                          <span className="text-base font-semibold text-center">
                            {set.reps}
                          </span>
                          <span className="text-sm text-text-muted text-center">
                            {set.repsInReserve != null ? set.repsInReserve : '-'}
                          </span>
                        </button>
                        {prev && !isDrop && (
                          <>
                            <div className="grid grid-cols-[28px_1fr_1fr_44px] gap-1.5 px-1 -mt-0.5 mb-0.5">
                              <span />
                              <span className="text-[10px] text-surface-light text-center">
                                prev {prev.weight_kg}
                                {prev.is_warmup && (
                                  <Flame className="w-2.5 h-2.5 text-warning inline ml-0.5" />
                                )}
                              </span>
                              <span className="text-[10px] text-surface-light text-center">
                                prev {prev.reps}
                                {(prev.is_dropset || prev.had_drops) && (
                                  <ArrowDownCircle className="w-2.5 h-2.5 text-primary inline ml-0.5" />
                                )}
                              </span>
                              <span className="text-[10px] text-surface-light text-center">
                                {prev.reps_in_reserve != null ? prev.reps_in_reserve : ''}
                              </span>
                            </div>
                            {prev.description && (
                              <p className="text-[10px] text-surface-light italic px-1 -mt-0.5 mb-0.5 break-words pl-8">
                                prev note: {prev.description}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}

                  {/* New set row (only if editable and no drop chain in flight) */}
                  {canEdit && !flow && (
                    <>
                      {/* Previous session hint for the next set. Use the
                          regular-set count instead of total length so the
                          PREV lookup matches what the user expects (e.g.
                          working set 4) rather than the raw DB position
                          which jumps over drops. */}
                      {(() => {
                        const nextSetNum = regularSetCount + 1;
                        const prev = getPrevSet(exercise.exerciseName, nextSetNum);
                        if (!prev) return null;
                        return (
                          <>
                            <div className="grid grid-cols-[28px_1fr_1fr_44px] gap-1.5 items-center mt-2 px-1">
                              <span className="text-[10px] text-primary text-center font-semibold">PREV</span>
                              <span className="text-xs text-text-muted text-center">
                                {prev.weight_kg} kg
                                {prev.is_warmup && (
                                  <Flame className="w-3 h-3 text-warning inline ml-0.5" />
                                )}
                              </span>
                              <span className="text-xs text-text-muted text-center">
                                {prev.reps} reps
                                {(prev.is_dropset || prev.had_drops) && (
                                  <ArrowDownCircle className="w-3 h-3 text-primary inline ml-0.5" />
                                )}
                              </span>
                              <span className="text-xs text-text-muted text-center">
                                {prev.reps_in_reserve != null ? prev.reps_in_reserve : '-'}
                              </span>
                            </div>
                            {prev.description && (
                              <p className="text-[11px] text-text-muted italic px-1 mt-1 break-words pl-8">
                                prev note: {prev.description}
                              </p>
                            )}
                          </>
                        );
                      })()}
                      <div
                        ref={nextSetRef}
                        className="grid grid-cols-[28px_1fr_1fr_44px] gap-1.5 items-center mt-1"
                      >
                        <span className="text-sm text-primary text-center font-bold">
                          {nextRegularLabel}
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
                          className="h-12 min-w-0 rounded-lg bg-background border-2 border-border text-center text-text text-base font-bold placeholder:text-surface-light focus:border-primary outline-none"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="reps"
                          value={inp.reps}
                          onChange={(e) =>
                            setInput(exercise.id, { reps: e.target.value })
                          }
                          className="h-12 min-w-0 rounded-lg bg-background border-2 border-border text-center text-text text-base font-bold placeholder:text-surface-light focus:border-primary outline-none"
                        />
                        <select
                          value={inp.rir}
                          onChange={(e) =>
                            setInput(exercise.id, { rir: e.target.value })
                          }
                          className="h-12 min-w-0 rounded-lg bg-background border-2 border-border text-center text-text text-sm focus:border-primary outline-none appearance-none"
                        >
                          <option value="">RIR</option>
                          {[0, 1, 2, 3, 4, 5].map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      </div>

                      {/* Toggles + notes row */}
                      <div className="flex items-center gap-3 mt-2 ml-8">
                        <label className="flex items-center gap-1.5 text-sm text-text-muted touch-manipulation">
                          <input
                            type="checkbox"
                            checked={inp.isWarmup}
                            onChange={(e) =>
                              setInput(exercise.id, { isWarmup: e.target.checked })
                            }
                            className="w-5 h-5 rounded accent-warning"
                          />
                          Warmup
                        </label>
                        <label className="flex items-center gap-1.5 text-sm text-text-muted touch-manipulation">
                          <input
                            type="checkbox"
                            checked={inp.isDropset}
                            onChange={(e) =>
                              setInput(exercise.id, { isDropset: e.target.checked })
                            }
                            className="w-5 h-5 rounded accent-primary"
                          />
                          Dropset
                        </label>
                        <button
                          onClick={() =>
                            setShowNotes((p) => ({
                              ...p,
                              [exercise.id]: !p[exercise.id],
                            }))
                          }
                          className="ml-auto text-text-muted active:text-text touch-manipulation p-1"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
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
                          className="mt-2 w-full h-11 rounded-lg bg-background border border-border px-3 text-text text-sm placeholder:text-surface-light focus:border-primary outline-none"
                        />
                      )}

                      {/* Log set button */}
                      <button
                        onClick={() => handleLogSet(exercise)}
                        disabled={addSet.isPending}
                        className="mt-3 w-full h-12 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-hover text-white text-base font-bold transition-colors disabled:opacity-50 touch-manipulation"
                      >
                        {addSet.isPending ? 'Logging...' : 'Log Set'}
                      </button>
                    </>
                  )}

                  {/* Dropset capture — sibling of the new-set block (not
                      nested), so when a drop chain is active the user only
                      sees this panel. After "Finish drops" the regular new-
                      set input reappears with the next sequential number. */}
                  {canEdit && flow && (() => {
                    const dropInp = dropInputs[exercise.id] ?? emptySet();
                    return (
                      <>
                        <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-3 ml-6">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-primary font-semibold flex items-center gap-1">
                              <ArrowDownCircle className="w-3.5 h-3.5" /> Drop {nextDropLabel}
                              {' '}— enter dropped weight / reps / RIR
                            </p>
                            <button
                              type="button"
                              onClick={() => finishDrops(exercise.id)}
                              className="text-xs text-text-muted hover:text-text underline"
                            >
                              Finish drops
                            </button>
                          </div>
                            <div className="grid grid-cols-[1fr_1fr_44px] gap-1.5 items-center">
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.5"
                                placeholder="kg"
                                value={dropInp.weightKg}
                                onChange={(e) =>
                                  setDropInput(exercise.id, { weightKg: e.target.value })
                                }
                                className="h-11 min-w-0 rounded-lg bg-background border-2 border-border text-center text-text text-base font-bold placeholder:text-surface-light focus:border-primary outline-none"
                              />
                              <input
                                type="number"
                                inputMode="numeric"
                                placeholder="reps"
                                value={dropInp.reps}
                                onChange={(e) =>
                                  setDropInput(exercise.id, { reps: e.target.value })
                                }
                                className="h-11 min-w-0 rounded-lg bg-background border-2 border-border text-center text-text text-base font-bold placeholder:text-surface-light focus:border-primary outline-none"
                              />
                              <select
                                value={dropInp.rir}
                                onChange={(e) =>
                                  setDropInput(exercise.id, { rir: e.target.value })
                                }
                                className="h-11 min-w-0 rounded-lg bg-background border-2 border-border text-center text-text text-sm focus:border-primary outline-none appearance-none"
                              >
                                <option value="">RIR</option>
                                {[0, 1, 2, 3, 4, 5].map((v) => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => handleLogDrop(exercise)}
                              disabled={addSet.isPending}
                              className="mt-2 w-full h-11 rounded-lg bg-primary/80 hover:bg-primary active:bg-primary text-white text-sm font-bold transition-colors disabled:opacity-50 touch-manipulation"
                            >
                              {addSet.isPending ? 'Logging drop...' : 'Log Drop'}
                            </button>
                          </div>
                        </>
                      );
                    })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ---- Sticky bottom bar (edit mode: Done only) ---- */}
      {!isActive && editMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => navigate('/sessions')}
              className="w-full h-14 rounded-xl bg-success hover:bg-success/90 active:bg-success/80 text-white text-lg font-bold transition-colors touch-manipulation"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ---- Sticky bottom bar (live session) ---- */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-50">
          <div className="max-w-lg mx-auto space-y-2">
            {!showCompleteConfirm && !showAbandonConfirm && (
              <>
                <button
                  onClick={() => setShowCompleteConfirm(true)}
                  className="w-full h-14 rounded-xl bg-success hover:bg-success/90 active:bg-success/80 text-white text-lg font-bold transition-colors touch-manipulation"
                >
                  Complete Workout
                </button>
                <button
                  onClick={() => setShowAbandonConfirm(true)}
                  className="w-full text-center text-sm text-text-muted hover:text-danger py-2 transition-colors touch-manipulation"
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
                  className="flex-1 h-14 rounded-xl bg-success hover:bg-success/90 text-white text-lg font-bold disabled:opacity-50 touch-manipulation"
                >
                  {completeSession.isPending ? 'Completing...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  className="px-6 h-14 rounded-xl bg-surface-light text-text font-semibold touch-manipulation"
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
                  className="flex-1 h-14 rounded-xl bg-danger hover:bg-danger/90 text-white text-lg font-bold disabled:opacity-50 touch-manipulation"
                >
                  {abandonSession.isPending ? 'Abandoning...' : 'Confirm Abandon'}
                </button>
                <button
                  onClick={() => setShowAbandonConfirm(false)}
                  className="px-6 h-14 rounded-xl bg-surface-light text-text font-semibold touch-manipulation"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- AI Coach ---- */}
      {isActive && <SessionCoach sessionId={id!} />}
    </div>
  );
}
