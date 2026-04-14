import { useMemo, useState } from 'react';
import { FileText, Loader2, Mail, Send } from 'lucide-react';
import { useExportFilters, useExportPdf } from '@/api/export';

export default function ExportPage() {
  const { data: filters, isLoading: filtersLoading } = useExportFilters();
  const exportPdf = useExportPdf();

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [splitId, setSplitId] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // When a split is selected we don't currently filter exercise list to that split
  // (backend doesn't expose it scoped). Show all exercises across the user's splits.
  const exercises = filters?.exercises ?? [];
  const splits = filters?.splits ?? [];

  const datesValid = !!startDate && !!endDate && startDate <= endDate;

  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);
    if (!startDate || !endDate) {
      setError('Start date and end date are required.');
      return;
    }
    if (startDate > endDate) {
      setError('End date must be on or after start date.');
      return;
    }

    try {
      const result = await exportPdf.mutateAsync({
        startDate,
        endDate,
        splitId: splitId || undefined,
        exerciseName: exerciseName || undefined,
      });
      setSuccessMsg(result.message);
    } catch (e) {
      const err = e as { userMessage?: string; message?: string };
      setError(err.userMessage || err.message || 'Failed to queue report.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="text-[#6366f1]" size={26} />
        <h1 className="text-2xl font-bold">Export Report</h1>
      </div>

      <p className="text-sm text-[#94a3b8]">
        Generate a PDF performance report with metrics, charts, and an AI-written
        summary &amp; suggestions. We'll email it to your registered address once
        it's ready.
      </p>

      <div className="space-y-4 rounded-2xl border border-[#334155] bg-[#1e293b] p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#94a3b8] mb-1.5">
              Start date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-11 rounded-xl bg-[#0f172a] border border-[#334155] px-3 text-[#f1f5f9] focus:border-[#6366f1] outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#94a3b8] mb-1.5">
              End date <span className="text-rose-400">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              max={today}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-11 rounded-xl bg-[#0f172a] border border-[#334155] px-3 text-[#f1f5f9] focus:border-[#6366f1] outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#94a3b8] mb-1.5">
            Split (optional)
          </label>
          <select
            value={splitId}
            onChange={(e) => setSplitId(e.target.value)}
            disabled={filtersLoading}
            className="w-full h-11 rounded-xl bg-[#0f172a] border border-[#334155] px-3 text-[#f1f5f9] focus:border-[#6366f1] outline-none"
          >
            <option value="">All splits</option>
            {splits.map((s) => (
              <option key={s.id} value={s.id}>
                {s.day.charAt(0).toUpperCase() + s.day.slice(1)} — {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#94a3b8] mb-1.5">
            Exercise (optional)
          </label>
          <select
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            disabled={filtersLoading}
            className="w-full h-11 rounded-xl bg-[#0f172a] border border-[#334155] px-3 text-[#f1f5f9] focus:border-[#6366f1] outline-none"
          >
            <option value="">All exercises (overall metrics)</option>
            {exercises.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[#64748b]">
            Pick an exercise to focus the report on its progression instead of
            overall metrics.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-3 text-sm text-emerald-200 flex items-start gap-2">
            <Mail size={18} className="mt-0.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!datesValid || exportPdf.isPending}
          className="w-full h-12 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] disabled:bg-[#334155] disabled:text-[#64748b] text-white font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {exportPdf.isPending ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Queuing report…
            </>
          ) : (
            <>
              <Send size={20} />
              Email me the PDF
            </>
          )}
        </button>
      </div>

      <div className="rounded-2xl border border-[#334155] bg-[#0f172a]/50 p-4 text-xs text-[#94a3b8]">
        <p className="font-semibold text-[#cbd5e1] mb-1">What's inside</p>
        <ul className="list-disc pl-5 space-y-0.5">
          <li>Summary metrics: sessions, volume, sets, reps, avg RIR, best 1RM</li>
          <li>Volume trend chart (and exercise progression chart when filtered)</li>
          <li>Top exercises breakdown by volume</li>
          <li>AI-written summary, highlights, and personalized suggestions</li>
          <li>Full session log table for the selected range</li>
        </ul>
      </div>
    </div>
  );
}
