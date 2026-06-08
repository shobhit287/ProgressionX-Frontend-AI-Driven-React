import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, RotateCcw, Flame, Calendar, Dumbbell, Trophy, CheckCircle, History, ClipboardEdit } from 'lucide-react';
import { useCurrentUser } from '@/api/auth';
import { useTodaySplit, useSplits } from '@/api/splits';
import {
  useActiveSession,
  useStartSession,
  useSessions,
  useReopenSession,
  useBackfillSession,
} from '@/api/sessions';
import { useDashboardSummary } from '@/api/analytics';
import { useAutoCompleteStaleSession } from '@/hooks/useAutoCompleteStaleSession';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Skeleton, { CardSkeleton, StatCardSkeleton, ListItemSkeleton } from '@/components/ui/Skeleton';
import { formatDate, formatWeight } from '@/utils/format';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: todaySplit, isLoading: splitLoading } = useTodaySplit();
  const { data: activeSession, isLoading: activeLoading } = useActiveSession();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const startSession = useStartSession();
  const reopenSession = useReopenSession();
  const backfillSession = useBackfillSession();
  const { data: allSplits } = useSplits();

  // Backfill modal — open via the "Log past session" link below.
  const [backfillOpen, setBackfillOpen] = useState(false);
  const yesterdayISO = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const [backfillDate, setBackfillDate] = useState(yesterdayISO);
  const [backfillSplitId, setBackfillSplitId] = useState('');
  const [backfillError, setBackfillError] = useState('');

  // When the modal opens, default the split to whichever split matches the
  // chosen date's day-of-week. Saves the user a tap in the common case.
  const dayOfWeekFor = (iso: string): string => {
    const d = new Date(iso + 'T00:00:00');
    return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][d.getDay()];
  };
  function openBackfill() {
    setBackfillError('');
    setBackfillDate(yesterdayISO);
    const dayMatch = allSplits?.find((s) => s.day === dayOfWeekFor(yesterdayISO));
    setBackfillSplitId(dayMatch?.id ?? allSplits?.[0]?.id ?? '');
    setBackfillOpen(true);
  }
  async function handleBackfillSubmit() {
    if (!backfillSplitId || !backfillDate) {
      setBackfillError('Pick a date and a split');
      return;
    }
    setBackfillError('');
    try {
      const session = await backfillSession.mutateAsync({
        splitId: backfillSplitId,
        date: backfillDate,
      });
      setBackfillOpen(false);
      navigate(`/session/${session.id}?edit=1`);
    } catch (err: unknown) {
      // Backend uses {error: {message}} via domain_exception_handler. FastAPI
      // validation errors still come back as {detail}. Read both so we surface
      // the actual reason (e.g. "A session already exists for this split on
      // that date") instead of the generic fallback.
      const data = (err as { response?: { data?: { detail?: string; error?: { message?: string } } } })
        ?.response?.data;
      const msg = data?.error?.message || data?.detail || 'Could not create backfill session.';
      setBackfillError(msg);
    }
  }

  // All today's sessions for this split — regardless of status — so we can
  // surface a "Reopen" affordance for accidentally completed/abandoned ones
  // instead of blindly offering "Start Session" again. Sorted desc by
  // started_at on the backend.
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { data: todaySessions, isLoading: todaySessionsLoading } = useSessions(
    todaySplit
      ? { splitId: todaySplit.id, fromDate: todayISO, toDate: todayISO, pageSize: 5 }
      : undefined,
  );
  const todayItems = todaySessions?.items ?? [];
  const todayCompleted = todayItems.some((s) => s.status === 'completed');
  // Most recent same-day session that is NOT in_progress — candidate for
  // reopen if the user accidentally abandoned/completed.
  const reopenCandidate = todayItems.find(
    (s) => s.status === 'abandoned' || s.status === 'completed',
  );

  // Auto-complete any session left open from a previous day
  const { isAutoCompleting } = useAutoCompleteStaleSession();

  // The workout card must wait on every query that decides which button to
  // render (Start / Resume / Completed). Otherwise a fast render with the
  // split loaded but the active session still pending shows "Start Session"
  // and an accidental tap creates a new session on top of yesterday's.
  const workoutCardLoading =
    splitLoading ||
    activeLoading ||
    (!!todaySplit && todaySessionsLoading) ||
    isAutoCompleting;

  const today = useMemo(() => formatDate(new Date().toISOString()), []);

  async function handleStartSession() {
    if (!todaySplit) return;
    if (startSession.isPending) return;
    if (workoutCardLoading) return;
    try {
      const session = await startSession.mutateAsync({ splitId: todaySplit.id });
      navigate(`/session/${session.id}`);
    } catch {
      // error handled by query
    }
  }

  async function handleReopen() {
    if (!reopenCandidate) return;
    if (reopenSession.isPending) return;
    try {
      await reopenSession.mutateAsync(reopenCandidate.id);
      navigate(`/session/${reopenCandidate.id}`);
    } catch {
      // error handled by query
    }
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-text">
          Hey, {user?.firstName || 'there'}!
        </h1>
        <p className="text-text-muted text-sm mt-1">{today}</p>
      </div>

      {/* Active session banner — only when we're sure the session is real
          and not about to be auto-completed as stale */}
      {!workoutCardLoading && activeSession && (
        <div
          className="bg-primary/15 border border-primary/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
          onClick={() => navigate(`/session/${activeSession.id}`)}
        >
          <div>
            <p className="text-primary font-semibold text-sm">Session in Progress</p>
            <p className="text-text text-xs mt-0.5">Tap to continue your workout</p>
          </div>
          <Button variant="primary" size="sm">
            Continue <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Today's split */}
      {workoutCardLoading ? (
        <CardSkeleton />
      ) : (
        <Card className="p-5">
          {todaySplit ? (
            <div className="space-y-4">
              <div>
                <p className="text-text-muted text-xs uppercase tracking-wide font-medium">
                  Today's Workout
                </p>
                <h2 className="text-xl font-bold text-text mt-1">{todaySplit.name}</h2>
                <p className="text-text-muted text-sm capitalize mt-0.5">{todaySplit.day}</p>
              </div>
              {activeSession ? (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={() => navigate(`/session/${activeSession.id}`)}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Resume Session
                </Button>
              ) : todayCompleted ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 py-2">
                    <CheckCircle className="w-6 h-6 text-success" />
                    <div>
                      <p className="text-success font-semibold">Workout Complete</p>
                      <p className="text-text-muted text-xs">Great job today!</p>
                    </div>
                  </div>
                  {/* Escape hatch: if the user accidentally tapped Complete,
                      same-day reopen brings the session back to in-progress. */}
                  {reopenCandidate && (
                    <button
                      onClick={handleReopen}
                      disabled={reopenSession.isPending}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      {reopenSession.isPending
                        ? 'Reopening…'
                        : 'Completed by mistake? Reopen this session'}
                    </button>
                  )}
                </div>
              ) : reopenCandidate ? (
                /* Today already has a non-active session (most likely
                   accidentally abandoned). Don't offer "Start fresh" — at
                   most one session per day per split. Only path forward
                   is to reopen the existing one. */
                <div className="space-y-3">
                  <div className="rounded-xl bg-warning/10 border border-warning/30 p-3 text-sm">
                    <p className="text-warning font-semibold">
                      Today's session was{' '}
                      {reopenCandidate.status === 'abandoned'
                        ? 'abandoned'
                        : 'completed'}
                    </p>
                    <p className="text-text-muted text-xs mt-0.5">
                      Reopen it to keep logging — your existing sets are
                      preserved.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={reopenSession.isPending}
                    onClick={handleReopen}
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Reopen Session
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  loading={startSession.isPending}
                  onClick={handleStartSession}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Session
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <h2 className="text-lg font-semibold text-text">Rest Day</h2>
              <p className="text-text-muted text-sm mt-1">
                No workout scheduled. Recover and grow.
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Quick stats */}
      {summaryLoading ? (
        <div className="grid grid-cols-3 gap-3">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-text">{summary.weekSessions}</p>
            <p className="text-text-muted text-xs">This Week</p>
          </Card>
          <Card className="p-4 text-center">
            <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-text">{summary.currentStreak}</p>
            <p className="text-text-muted text-xs">Day Streak</p>
          </Card>
          <Card className="p-4 text-center">
            <Dumbbell className="w-5 h-5 text-success mx-auto mb-1" />
            <p className="text-2xl font-bold text-text">{summary.totalSessions}</p>
            <p className="text-text-muted text-xs">Total</p>
          </Card>
        </div>
      ) : null}

      {/* Workout history shortcut */}
      <button
        onClick={() => navigate('/sessions')}
        className="w-full flex items-center justify-between rounded-2xl bg-surface border border-border px-4 py-3 active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <History className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <p className="text-text text-sm font-semibold">Workout History</p>
            <p className="text-text-muted text-xs">Look up past sessions by date or split</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
      </button>

      {/* Log a past session — forgot to log yesterday, etc. */}
      <button
        onClick={openBackfill}
        className="w-full flex items-center justify-between rounded-2xl bg-surface border border-border px-4 py-3 active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-warning/20 flex items-center justify-center">
            <ClipboardEdit className="w-4 h-4 text-warning" />
          </div>
          <div className="text-left">
            <p className="text-text text-sm font-semibold">Log a Missed Session</p>
            <p className="text-text-muted text-xs">Forgot to log yesterday? Backfill it now</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted" />
      </button>

      {/* Recent PRs */}
      {summaryLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 mb-3" />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : summary && summary.personalRecords.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Recent PRs
          </h3>
          <div className="space-y-2">
            {summary.personalRecords.slice(0, 5).map((pr, i) => (
              <Card key={i} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-text font-medium text-sm">
                      {pr.exerciseName || 'Exercise'}
                    </p>
                    <p className="text-text-muted text-xs">
                      {formatWeight(pr.weight)} x {pr.reps} reps
                    </p>
                  </div>
                </div>
                <p className="text-text-muted text-xs">{formatDate(pr.date)}</p>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {/* Backfill modal */}
      {backfillOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
          onClick={() => !backfillSession.isPending && setBackfillOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-surface rounded-2xl p-5 space-y-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-bold text-text">Log Past Session</h3>
              <p className="text-text-muted text-xs mt-1">
                Creates a completed session you can fill in with sets.
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">
                Date
              </label>
              <input
                type="date"
                value={backfillDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => {
                  setBackfillDate(e.target.value);
                  // Auto-pick split for the new day if it changed
                  const m = allSplits?.find((s) => s.day === dayOfWeekFor(e.target.value));
                  if (m) setBackfillSplitId(m.id);
                }}
                className="w-full h-11 rounded-lg bg-background border border-border text-text px-3 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">
                Split
              </label>
              <select
                value={backfillSplitId}
                onChange={(e) => setBackfillSplitId(e.target.value)}
                className="w-full h-11 rounded-lg bg-background border border-border text-text px-3 focus:border-primary outline-none"
              >
                {(allSplits ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.day})
                  </option>
                ))}
              </select>
            </div>

            {backfillError && (
              <p className="text-danger text-sm">{backfillError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setBackfillOpen(false)}
                disabled={backfillSession.isPending}
                className="flex-1 h-12 rounded-xl bg-surface-light text-text font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBackfillSubmit}
                disabled={backfillSession.isPending || !backfillSplitId}
                className="flex-1 h-12 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
              >
                {backfillSession.isPending ? 'Creating…' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
