import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, Flame, Calendar, Dumbbell, Trophy } from 'lucide-react';
import { useCurrentUser } from '@/api/auth';
import { useTodaySplit } from '@/api/splits';
import { useActiveSession, useStartSession } from '@/api/sessions';
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
  const { data: activeSession } = useActiveSession();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const startSession = useStartSession();

  // Auto-complete any session left open from a previous day
  useAutoCompleteStaleSession();

  const today = useMemo(() => formatDate(new Date().toISOString()), []);

  async function handleStartSession() {
    if (!todaySplit) return;
    try {
      const session = await startSession.mutateAsync({ splitId: todaySplit.id });
      navigate(`/session/${session.id}`);
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

      {/* Active session banner */}
      {activeSession && (
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
      {splitLoading ? (
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
              {!activeSession && (
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
