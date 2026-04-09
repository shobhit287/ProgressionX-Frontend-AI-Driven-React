import { useState, useMemo } from 'react';
import { useSessionAnalytics } from '@/api/analytics';
import { formatDuration } from '@/utils/format';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Activity, TrendingUp, Clock, Calendar } from 'lucide-react';
import { ChartSkeleton } from '@/components/ui/Skeleton';

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function SessionAnalytics() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: points, isLoading } = useSessionAnalytics({
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
  });

  const dataPoints = points ?? [];

  const { totalSessions, avgVolume, avgDuration } = useMemo(() => {
    const total = dataPoints.length;
    return {
      totalSessions: total,
      avgVolume: total > 0
        ? Math.round(dataPoints.reduce((s, d) => s + d.totalVolume, 0) / total)
        : 0,
      avgDuration: total > 0
        ? Math.round(dataPoints.reduce((s, d) => s + (d.durationSeconds ?? 0), 0) / total)
        : 0,
    };
  }, [dataPoints]);

  return (
    <div className="space-y-6">
      {/* Date filters */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#94a3b8] mb-1 block">From</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="date"
              value={dateFrom}
              max={dateTo || new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`w-full h-11 rounded-lg bg-[#1e293b] border border-[#334155] pl-9 pr-3 text-sm focus:border-[#6366f1] outline-none appearance-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-75 ${dateFrom ? 'text-[#f1f5f9]' : 'text-[#475569]'}`}
              placeholder="Select start date"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-[#94a3b8] mb-1 block">To</label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8]" />
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDateTo(e.target.value)}
              className={`w-full h-11 rounded-lg bg-[#1e293b] border border-[#334155] pl-9 pr-3 text-sm focus:border-[#6366f1] outline-none appearance-none [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-75 ${dateTo ? 'text-[#f1f5f9]' : 'text-[#475569]'}`}
              placeholder="Select end date"
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1e293b] rounded-xl p-3 text-center">
          <Activity className="w-5 h-5 text-[#6366f1] mx-auto mb-1" />
          <p className="text-xl font-bold">{totalSessions}</p>
          <p className="text-[10px] text-[#94a3b8] uppercase">Sessions</p>
        </div>
        <div className="bg-[#1e293b] rounded-xl p-3 text-center">
          <TrendingUp className="w-5 h-5 text-[#22c55e] mx-auto mb-1" />
          <p className="text-xl font-bold">{avgVolume.toLocaleString()}</p>
          <p className="text-[10px] text-[#94a3b8] uppercase">Avg Vol (kg)</p>
        </div>
        <div className="bg-[#1e293b] rounded-xl p-3 text-center">
          <Clock className="w-5 h-5 text-[#f59e0b] mx-auto mb-1" />
          <p className="text-xl font-bold">{formatDuration(avgDuration)}</p>
          <p className="text-[10px] text-[#94a3b8] uppercase">Avg Duration</p>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      )}

      {!isLoading && dataPoints.length === 0 && (
        <p className="text-center text-text-muted py-8">No data for selected range</p>
      )}

      {!isLoading && dataPoints.length > 0 && (
        <>
          {/* Volume chart */}
          <div>
            <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">
              Total Volume (kg)
            </h3>
            <div className="bg-[#1e293b] rounded-xl p-3">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dataPoints}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} width={50} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f1f5f9',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalVolume"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#6366f1' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reps chart */}
          <div>
            <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">Total Reps</h3>
            <div className="bg-[#1e293b] rounded-xl p-3">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dataPoints}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} width={50} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f1f5f9',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalReps"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#22c55e' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Avg RIR chart */}
          <div>
            <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">
              Average RIR
            </h3>
            <div className="bg-[#1e293b] rounded-xl p-3">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dataPoints}>
                  <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    stroke="#94a3b8"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} width={50} domain={[0, 5]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: 8,
                      color: '#f1f5f9',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgRir"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#f59e0b' }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
