import { useMemo, useState } from 'react';
import { useSession, useSessions } from '@/api/sessions';
import { useSplits } from '@/api/splits';
import type { WorkoutSessionDetail, WorkoutSplit } from '@/types';
import { capitalize, formatDate, formatDuration, formatWeight } from '@/utils/format';
import {
  ArrowDownCircle,
  Calendar,
  Clock,
  Dumbbell,
  Flame,
} from 'lucide-react';

type Mode = 'date' | 'split';

const DAYS_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-[#22c55e]/20 text-[#22c55e]',
  in_progress: 'bg-[#6366f1]/20 text-[#6366f1]',
  abandoned: 'bg-[#ef4444]/20 text-[#ef4444]',
};

export default function SessionHistory() {
  const [mode, setMode] = useState<Mode>('date');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSplitId, setSelectedSplitId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { data: splits } = useSplits();

  const sortedSplits = useMemo(() => {
    if (!splits) return [];
    const idx = (d: string) => DAYS_ORDER.indexOf(d as (typeof DAYS_ORDER)[number]);
    return [...splits].sort((a, b) => idx(a.day) - idx(b.day));
  }, [splits]);

  const { data: dateSessions, isLoading: dateLoading } = useSessions(
    mode === 'date' && selectedDate
      ? { fromDate: selectedDate, toDate: selectedDate, pageSize: 10 }
      : null,
  );

  const { data: splitSessions, isLoading: splitLoading } = useSessions(
    mode === 'split' && selectedSplitId
      ? { splitId: selectedSplitId, pageSize: 100 }
      : null,
  );

  const dateSessionList = dateSessions?.items ?? [];
  const effectiveDateSessionId =
    selectedSessionId && dateSessionList.some((s) => s.id === selectedSessionId)
      ? selectedSessionId
      : dateSessionList[0]?.id ?? '';

  const detailId = mode === 'date' ? effectiveDateSessionId : selectedSessionId;
  const { data: sessionDetail, isLoading: detailLoading } = useSession(detailId);

  const splitDateOptions = useMemo(() => {
    if (!splitSessions?.items) return [];
    return splitSessions.items.map((s) => ({
      id: s.id,
      label: formatDate(s.startedAt),
      status: s.status,
    }));
  }, [splitSessions]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setSelectedSessionId('');
  };

  return (
    <div className="space-y-4 pb-8">
      <h1 className="text-2xl font-bold">Workout History</h1>
      <p className="text-sm text-text-muted -mt-2">
        Look up any past session by date or by split.
      </p>

      {/* Mode tabs */}
      <div className="flex bg-surface rounded-xl p-1 gap-1">
        <button
          onClick={() => switchMode('date')}
          className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors touch-manipulation ${
            mode === 'date' ? 'bg-primary text-white' : 'text-text-muted'
          }`}
        >
          By Date
        </button>
        <button
          onClick={() => switchMode('split')}
          className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors touch-manipulation ${
            mode === 'split' ? 'bg-primary text-white' : 'text-text-muted'
          }`}
        >
          By Split
        </button>
      </div>

      {mode === 'date' && (
        <div>
          <label className="text-xs text-text-muted mb-1 block">Pick a date</label>
          <input
            type="date"
            max={today}
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSessionId('');
            }}
            style={{ colorScheme: 'dark' }}
            className={`w-full h-12 rounded-xl bg-surface border border-border px-4 text-base focus:border-primary outline-none appearance-none ${
              selectedDate ? 'text-text' : 'text-text-muted'
            }`}
          />

          {dateSessionList.length > 1 && (
            <div className="mt-3">
              <label className="text-xs text-text-muted mb-1 block">
                {dateSessionList.length} sessions on this day
              </label>
              <select
                value={effectiveDateSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full h-11 rounded-lg bg-surface border border-border px-3 text-sm text-text focus:border-primary outline-none appearance-none"
              >
                {dateSessionList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.startedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    — {s.status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {mode === 'split' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-muted mb-1 block">Pick a split</label>
            <select
              value={selectedSplitId}
              onChange={(e) => {
                setSelectedSplitId(e.target.value);
                setSelectedSessionId('');
              }}
              className={`w-full h-12 rounded-xl bg-surface border border-border px-4 text-base focus:border-primary outline-none appearance-none ${
                selectedSplitId ? 'text-text' : 'text-text-muted'
              }`}
            >
              <option value="">— Select a split —</option>
              {sortedSplits.map((s) => (
                <option key={s.id} value={s.id}>
                  {capitalize(s.day)} — {s.name}
                </option>
              ))}
            </select>
          </div>

          {selectedSplitId && (
            <div>
              <label className="text-xs text-text-muted mb-1 block">
                Pick a session date
              </label>
              {splitLoading ? (
                <div className="h-12 rounded-xl bg-surface-light/50 animate-pulse" />
              ) : splitDateOptions.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No sessions found for this split yet.
                </p>
              ) : (
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className={`w-full h-12 rounded-xl bg-surface border border-border px-4 text-base focus:border-primary outline-none appearance-none ${
                    selectedSessionId ? 'text-text' : 'text-text-muted'
                  }`}
                >
                  <option value="">— Select a date —</option>
                  {splitDateOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label} ({o.status.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div>
        {mode === 'date' && !selectedDate && (
          <EmptyHint>Select a date to view that day's session.</EmptyHint>
        )}
        {mode === 'date' && selectedDate && dateLoading && <LoadingSkeleton />}
        {mode === 'date' && selectedDate && !dateLoading && dateSessionList.length === 0 && (
          <EmptyHint>
            No session data found for {formatDate(selectedDate)}.
          </EmptyHint>
        )}

        {mode === 'split' && !selectedSplitId && (
          <EmptyHint>Select a split to view its sessions.</EmptyHint>
        )}
        {mode === 'split' &&
          selectedSplitId &&
          !selectedSessionId &&
          !splitLoading &&
          splitDateOptions.length > 0 && (
            <EmptyHint>Pick a session date to view full details.</EmptyHint>
          )}

        {detailId && detailLoading && <LoadingSkeleton />}
        {detailId && !detailLoading && sessionDetail && (
          <SessionDetailCard session={sessionDetail} splits={splits ?? []} />
        )}
      </div>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-12 text-text-muted">
      <p className="text-sm">{children}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-surface p-4 space-y-2">
          <div className="h-5 w-1/3 rounded bg-surface-light/50 animate-pulse" />
          <div className="h-4 w-full rounded bg-surface-light/50 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function SessionDetailCard({
  session,
  splits,
}: {
  session: WorkoutSessionDetail;
  splits: WorkoutSplit[];
}) {
  const split = splits.find((s) => s.id === session.splitId);

  const sortedExercises = [...session.exercises].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  return (
    <div className="space-y-3">
      <div className="bg-surface rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="text-base font-semibold truncate">
              {formatDate(session.startedAt)}
            </span>
          </div>
          <span
            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
              STATUS_COLORS[session.status] ?? 'bg-surface-light text-text-muted'
            }`}
          >
            {session.status.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center gap-4 text-text-muted text-sm flex-wrap">
          {split && (
            <span className="flex items-center gap-1.5">
              <Dumbbell className="w-3.5 h-3.5" />
              {capitalize(split.day)} — {split.name}
            </span>
          )}
          {session.durationSeconds != null && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(session.durationSeconds)}
            </span>
          )}
        </div>
        {session.notes && (
          <p className="mt-2 text-xs text-text-muted italic break-words">
            {session.notes}
          </p>
        )}
      </div>

      {sortedExercises.length === 0 ? (
        <div className="text-center py-6 text-text-muted text-sm bg-surface rounded-2xl">
          No exercises logged in this session.
        </div>
      ) : (
        sortedExercises.map((ex) => (
          <div key={ex.id} className="bg-surface rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-base font-bold truncate">{ex.exerciseName}</h3>
              {ex.exerciseType !== 'standard' && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary shrink-0">
                  {ex.exerciseType.replace('_', ' ')}
                </span>
              )}
              <span className="ml-auto text-xs text-text-muted">
                {ex.sets.length} {ex.sets.length === 1 ? 'set' : 'sets'}
              </span>
            </div>

            {ex.sets.length === 0 ? (
              <p className="text-xs text-text-muted italic">
                No sets logged for this exercise.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-[28px_1fr_1fr_44px] gap-1.5 text-[10px] uppercase tracking-wider text-text-muted mb-1 px-1">
                  <span>Set</span>
                  <span>Weight</span>
                  <span>Reps</span>
                  <span>RIR</span>
                </div>
                {[...ex.sets]
                  .sort((a, b) => a.setNumber - b.setNumber)
                  .map((s) => (
                    <div key={s.id} className="mb-1">
                      <div className="grid grid-cols-[28px_1fr_1fr_44px] gap-1.5 items-center py-1.5 px-1">
                        <span className="text-sm text-text-muted text-center">
                          {s.setNumber}
                          {s.isWarmup && (
                            <Flame className="w-3 h-3 text-warning inline ml-0.5" />
                          )}
                        </span>
                        <span className="text-base font-semibold text-center">
                          {formatWeight(s.weightKg)}
                        </span>
                        <span className="text-base font-semibold text-center">
                          {s.reps}
                          {s.isDropset && (
                            <ArrowDownCircle className="w-3.5 h-3.5 text-primary inline ml-1" />
                          )}
                        </span>
                        <span className="text-sm text-text-muted text-center">
                          {s.repsInReserve != null ? s.repsInReserve : '-'}
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-xs text-text-muted italic px-1 -mt-0.5 mb-1 break-words">
                          &ldquo;{s.description}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
