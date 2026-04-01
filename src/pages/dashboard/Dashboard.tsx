import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, Flame, Calendar, Dumbbell, Trophy } from 'lucide-react';
import { useCurrentUser } from '@/api/auth';
import { useTodaySplit } from '@/api/splits';
import { useActiveSession, useStartSession } from '@/api/sessions';
import { useDashboardSummary } from '@/api/analytics';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatDate, formatWeight } from '@/utils/format';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: todaySplit, isLoading: splitLoading } = useTodaySplit();
  const { data: activeSession } = useActiveSession();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const startSession = useStartSession();

  const today = formatDate(new Date().toISOString());

  async function handleStartSession() {
    if (!todaySplit) return;
    try {
      const session = await startSession.mutateAsync({ splitId: todaySplit.id });
      navigate(`/session/${session.id}`);
    } catch {
      // error handled by query
    }
  }

  if (splitLoading && summaryLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] px-4 pt-6 pb-24">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">
            Hey, {user?.firstName || 'there'}!
          </h1>
          <p className="text-[#94a3b8] text-sm mt-1">{today}</p>
        </div>

        {/* Active session banner */}
        {activeSession && (
          <div
            className="bg-[#6366f1]/15 border border-[#6366f1]/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer"
            onClick={() => navigate(`/session/${activeSession.id}`)}
          >
            <div>
              <p className="text-[#6366f1] font-semibold text-sm">Session in Progress</p>
              <p className="text-[#f1f5f9] text-xs mt-0.5">Tap to continue your workout</p>
            </div>
            <Button variant="primary" size="sm">
              Continue <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Today's split */}
        <Card className="p-5">
          {todaySplit ? (
            <div className="space-y-4">
              <div>
                <p className="text-[#94a3b8] text-xs uppercase tracking-wide font-medium">
                  Today's Workout
                </p>
                <h2 className="text-xl font-bold text-[#f1f5f9] mt-1">{todaySplit.name}</h2>
                <p className="text-[#94a3b8] text-sm capitalize mt-0.5">{todaySplit.day}</p>
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
              <p className="text-2xl mb-2">rest day icon</p>
              <h2 className="text-lg font-semibold text-[#f1f5f9]">Rest Day</h2>
              <p className="text-[#94a3b8] text-sm mt-1">
                No workout scheduled. Recover and grow.
              </p>
            </div>
          )}
        </Card>

        {/* Quick stats */}
        {summary && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <Calendar className="w-5 h-5 text-[#6366f1] mx-auto mb-1" />
              <p className="text-2xl font-bold text-[#f1f5f9]">{summary.weekSessions}</p>
              <p className="text-[#94a3b8] text-xs">This Week</p>
            </Card>
            <Card className="p-4 text-center">
              <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-[#f1f5f9]">{summary.currentStreak}</p>
              <p className="text-[#94a3b8] text-xs">Day Streak</p>
            </Card>
            <Card className="p-4 text-center">
              <Dumbbell className="w-5 h-5 text-[#22c55e] mx-auto mb-1" />
              <p className="text-2xl font-bold text-[#f1f5f9]">{summary.totalSessions}</p>
              <p className="text-[#94a3b8] text-xs">Total</p>
            </Card>
          </div>
        )}

        {/* Recent PRs */}
        {summary && summary.personalRecords.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#94a3b8] uppercase tracking-wide mb-3">
              Recent PRs
            </h3>
            <div className="space-y-2">
              {summary.personalRecords.slice(0, 5).map((pr, i) => (
                <Card key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="text-[#f1f5f9] font-medium text-sm">
                        {pr.exerciseName || 'Exercise'}
                      </p>
                      <p className="text-[#94a3b8] text-xs">
                        {formatWeight(pr.weight)} x {pr.reps} reps
                      </p>
                    </div>
                  </div>
                  <p className="text-[#94a3b8] text-xs">{formatDate(pr.date)}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
