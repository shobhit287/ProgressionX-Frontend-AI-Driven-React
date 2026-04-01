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
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9] pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4">Workout History</h1>

        {/* Filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-full h-12 rounded-xl bg-[#1e293b] border border-[#334155] px-4 text-[#f1f5f9] text-base focus:border-[#6366f1] outline-none appearance-none"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sessions list */}
      <div className="max-w-lg mx-auto px-4 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-[#6366f1] border-t-transparent rounded-full" />
          </div>
        )}

        {!isLoading && sessions.length === 0 && (
          <div className="text-center py-16 text-[#94a3b8]">
            <p className="text-lg">No sessions found</p>
            <p className="text-sm mt-1">Start a workout from the dashboard</p>
          </div>
        )}

        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => navigate(`/session/${session.id}`)}
            className="w-full bg-[#1e293b] rounded-2xl p-4 flex items-center justify-between hover:bg-[#334155]/60 active:bg-[#334155] transition-colors text-left"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-[#6366f1] shrink-0" />
                <span className="text-base font-semibold truncate">
                  {formatDate(session.startedAt)}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[session.status] ?? 'bg-[#334155] text-[#94a3b8]'}`}
                >
                  {session.status.replace('_', ' ')}
                </span>
              </div>
              {session.durationSeconds != null && (
                <div className="flex items-center gap-1.5 text-[#94a3b8] text-sm">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDuration(session.durationSeconds)}</span>
                </div>
              )}
            </div>
            <ChevronRight className="w-5 h-5 text-[#94a3b8] shrink-0 ml-2" />
          </button>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6 px-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="h-11 px-5 rounded-xl bg-[#1e293b] text-[#f1f5f9] font-semibold disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-[#94a3b8]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="h-11 px-5 rounded-xl bg-[#1e293b] text-[#f1f5f9] font-semibold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
