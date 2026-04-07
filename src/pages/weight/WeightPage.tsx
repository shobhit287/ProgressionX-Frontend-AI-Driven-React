import { useState, useMemo } from 'react';
import { useWeightLogs, useWeightAnalytics, useCreateWeightLog, useDeleteWeightLog } from '@/api/weightLogs';
import { useAnalyzeWeight } from '@/api/ai';
import { formatDate, formatWeight } from '@/utils/format';
import type { AIAnalysisResponse } from '@/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Scale, TrendingDown, TrendingUp, Trash2, Brain, Minus } from 'lucide-react';
import Skeleton, { ChartSkeleton, ListItemSkeleton } from '@/components/ui/Skeleton';

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function WeightPage() {
  // Form state
  const [weightKg, setWeightKg] = useState('');
  const [waistInches, setWaistInches] = useState('');
  const [bodyFatPct, setBodyFatPct] = useState('');
  const [description, setDescription] = useState('');

  // AI
  const [aiResult, setAiResult] = useState<AIAnalysisResponse | null>(null);

  const { data: logs, isLoading: logsLoading } = useWeightLogs({});
  const { data: analytics } = useWeightAnalytics({});
  const createLog = useCreateWeightLog();
  const deleteLog = useDeleteWeightLog();
  const analyzeWeight = useAnalyzeWeight();

  const logItems = logs?.items ?? [];

  // Memoize expensive chart merge to avoid recomputing on every render
  const mergedChart = useMemo(() => {
    const chartData = logItems
      .slice()
      .reverse()
      .map((l) => ({
        date: l.loggedAt,
        weight: l.weightKg,
      }));

    const weeklyData =
      analytics?.weeklyAverages.map((w) => ({
        date: w.weekStart,
        avgWeight: w.averageWeight,
      })) ?? [];

    return chartData.map((point) => {
      const weekMatch = weeklyData.find((w) => {
        const ws = new Date(w.date).getTime();
        const we = ws + 7 * 86400 * 1000;
        const pd = new Date(point.date).getTime();
        return pd >= ws && pd < we;
      });
      return {
        ...point,
        weeklyAvg: weekMatch?.avgWeight,
      };
    });
  }, [logItems, analytics?.weeklyAverages]);

  const rateOfChange = analytics?.rateOfChange ?? 0;

  const handleSubmit = () => {
    const w = parseFloat(weightKg);
    if (isNaN(w) || w <= 0) return;
    createLog.mutate(
      {
        weightKg: w,
        waistCm: waistInches ? parseFloat(waistInches) * 2.54 : undefined,
        bodyFatPct: bodyFatPct ? parseFloat(bodyFatPct) : undefined,
        description: description || undefined,
      },
      {
        onSuccess: () => {
          setWeightKg('');
          setWaistInches('');
          setBodyFatPct('');
          setDescription('');
        },
      },
    );
  };

  const handleAnalyze = () => {
    analyzeWeight.mutate(
      {},
      {
        onSuccess: (data) => setAiResult(data),
      },
    );
  };

  const RateIcon =
    rateOfChange < -0.01 ? TrendingDown : rateOfChange > 0.01 ? TrendingUp : Minus;
  const rateColor =
    rateOfChange < -0.01 ? 'text-[#22c55e]' : rateOfChange > 0.01 ? 'text-[#f59e0b]' : 'text-[#94a3b8]';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Body Weight</h1>

        {/* Log form */}
        <div className="bg-[#1e293b] rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#94a3b8] mb-1 block">Weight (kg) *</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="75.0"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full h-12 rounded-lg bg-[#0f172a] border-2 border-[#334155] text-center text-lg font-bold text-[#f1f5f9] placeholder:text-[#475569] focus:border-[#6366f1] outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#94a3b8] mb-1 block">Waist (inches)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.25"
                placeholder="32"
                value={waistInches}
                onChange={(e) => setWaistInches(e.target.value)}
                className="w-full h-12 rounded-lg bg-[#0f172a] border border-[#334155] text-center text-base text-[#f1f5f9] placeholder:text-[#475569] focus:border-[#6366f1] outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#94a3b8] mb-1 block">Body Fat %</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="15"
                value={bodyFatPct}
                onChange={(e) => setBodyFatPct(e.target.value)}
                className="w-full h-12 rounded-lg bg-[#0f172a] border border-[#334155] text-center text-base text-[#f1f5f9] placeholder:text-[#475569] focus:border-[#6366f1] outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[#94a3b8] mb-1 block">Notes</label>
              <input
                type="text"
                placeholder="Optional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-12 rounded-lg bg-[#0f172a] border border-[#334155] px-3 text-base text-[#f1f5f9] placeholder:text-[#475569] focus:border-[#6366f1] outline-none"
              />
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={createLog.isPending}
            className="w-full h-12 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] active:bg-[#4338ca] text-white text-base font-bold transition-colors disabled:opacity-50"
          >
            {createLog.isPending ? 'Logging...' : 'Log Weight'}
          </button>
        </div>

        {/* Rate of change card */}
        {analytics && (
          <div className="bg-[#1e293b] rounded-xl p-4 flex items-center gap-3">
            <RateIcon className={`w-6 h-6 ${rateColor}`} />
            <div>
              <p className={`text-xl font-bold ${rateColor}`}>
                {rateOfChange > 0 ? '+' : ''}
                {rateOfChange.toFixed(2)} kg/week
              </p>
              <p className="text-xs text-[#94a3b8]">
                Total change: {analytics.totalChange > 0 ? '+' : ''}
                {analytics.totalChange.toFixed(1)} kg over {analytics.entries} entries
              </p>
            </div>
          </div>
        )}

        {/* Weight trend chart */}
        {logsLoading ? (
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <ChartSkeleton />
          </div>
        ) : mergedChart.length > 1 && (
          <div>
            <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">Weight Trend</h3>
            <div className="bg-[#1e293b] rounded-xl p-3">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={mergedChart}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                    width={50}
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f1f5f9',
                    }}
                    formatter={(val) => [`${Number(val).toFixed(1)} kg`]}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#6366f1' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weeklyAvg"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-[#94a3b8]">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-[#6366f1] inline-block" /> Weight
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-[#f59e0b] inline-block border-dashed" /> Weekly Avg
                </span>
              </div>
            </div>
          </div>
        )}

        {/* AI Analysis */}
        <button
          onClick={handleAnalyze}
          disabled={analyzeWeight.isPending}
          className="w-full h-12 rounded-xl bg-[#1e293b] border border-[#6366f1]/40 hover:border-[#6366f1] text-[#6366f1] text-base font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Brain className="w-5 h-5" />
          {analyzeWeight.isPending ? 'Analyzing...' : 'Analyze My Weight'}
        </button>

        {analyzeWeight.isPending && (
          <div className="flex items-center justify-center gap-3 py-4 text-[#94a3b8]">
            <div className="animate-spin h-5 w-5 border-2 border-[#6366f1] border-t-transparent rounded-full" />
            <span>AI is analyzing...</span>
          </div>
        )}

        {aiResult && (
          <div className="bg-[#1e293b] rounded-xl p-4 space-y-3">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#6366f1]" />
              Analysis
            </h3>
            <p className="text-sm text-[#94a3b8] leading-relaxed whitespace-pre-line">
              {aiResult.analysis}
            </p>
            {aiResult.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Suggestions</h4>
                <ol className="list-decimal list-inside space-y-1">
                  {aiResult.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-[#94a3b8]">
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Recent logs */}
        <div>
          <h3 className="text-sm font-semibold text-text-muted mb-2">Recent Logs</h3>
          {logsLoading ? (
            <div className="space-y-2">
              <ListItemSkeleton />
              <ListItemSkeleton />
              <ListItemSkeleton />
            </div>
          ) : (
            <div className="space-y-2">
              {logItems.map((log) => (
                <div
                  key={log.id}
                  className="bg-surface rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Scale className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-base font-semibold">
                        {formatWeight(log.weightKg)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatDate(log.loggedAt)}
                        {log.waistCm != null && ` · ${(log.waistCm / 2.54).toFixed(1)} in`}
                        {log.bodyFatPct != null && ` · ${log.bodyFatPct}%`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteLog.mutate(log.id)}
                    className="p-2 text-text-muted hover:text-danger transition-colors touch-manipulation"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
