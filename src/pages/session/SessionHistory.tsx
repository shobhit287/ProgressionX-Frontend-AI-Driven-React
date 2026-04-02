import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessions } from '@/api/sessions';
import { formatDate, formatDuration } from '@/utils/format';
import { Calendar, Clock, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Sessions' },
  { value: 'completed', label: 'Completed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'abandoned', label: 'Abandoned' },
];

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-[#22c55e]/20 text-[#22c55e]',
  in_progress: 'bg-[#6366f1]/20 text-[#6366f1]',
  abandoned: 'bg-[#ef4444]/20 text-[#ef4444]',
};

export default function SessionHistory() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useSessions({
    page,
    pageSize: 20,
    status: statusFilter || undefined,
  });

  const sessions = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Workout History</h1>

      {/* Filter */}
      <select
        value={statusFilter}
        onChange={(e) => {
          setStatusFilter(e.target.value);
          setPage(1);
        }}
        className="w-full h-12 rounded-xl bg-surface border border-border px-4 text-text text-base focus:border-primary outline-none appearance-none"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Sessions list */}
      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="rounded-2xl bg-surface border border-border p-4 flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-surface-light/50 animate-pulse" />
                <div className="h-3 w-1/3 rounded bg-surface-light/50 animate-pulse" />
              </div>
            </div>
          ))}

        {!isLoading && sessions.length === 0 && (
          <div className="text-center py-16 text-text-muted">
            <p className="text-lg">No sessions found</p>
            <p className="text-sm mt-1">Start a workout from the dashboard</p>
          </div>
        )}

        {!isLoading && sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => navigate(`/session/${session.id}`)}
            className="w-full bg-surface rounded-2xl p-4 flex items-center justify-between active:bg-surface-light transition-colors text-left touch-manipulation"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <span className="text-base font-semibold truncate">
                  {formatDate(session.startedAt)}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[session.status] ?? 'bg-surface-light text-text-muted'}`}
                >
                  {session.status.replace('_', ' ')}
                </span>
              </div>
              {session.durationSeconds != null && (
                <div className="flex items-center gap-1.5 text-text-muted text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDuration(session.durationSeconds)}</span>
                </div>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-text-muted shrink-0 ml-2" />
          </button>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="h-11 px-5 rounded-xl bg-surface text-text font-semibold disabled:opacity-40 touch-manipulation"
          >
            Prev
          </button>
          <span className="text-sm text-text-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="h-11 px-5 rounded-xl bg-surface text-text font-semibold disabled:opacity-40 touch-manipulation"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
