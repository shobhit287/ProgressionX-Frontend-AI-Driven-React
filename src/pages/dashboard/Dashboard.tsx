import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, RotateCcw, Flame, Calendar, Dumbbell, Trophy, CheckCircle, History } from 'lucide-react';
import { useCurrentUser } from '@/api/auth';
import { useTodaySplit } from '@/api/splits';
import {
  useActiveSession,
  useStartSession,
  useSessions,
  useReopenSession,
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
    </div>
  );
}
