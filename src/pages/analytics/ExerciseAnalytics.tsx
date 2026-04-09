import { useState, useMemo } from 'react';
import { useExerciseAnalytics } from '@/api/analytics';
import { formatWeight } from '@/utils/format';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Trophy, Calendar } from 'lucide-react';
import { ChartSkeleton } from '@/components/ui/Skeleton';

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface Props {
  exerciseName: string;
}

export default function ExerciseAnalytics({ exerciseName }: Props) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useExerciseAnalytics(exerciseName, {
    startDate: dateFrom || undefined,
    endDate: dateTo || undefined,
  });

  const dataPoints = data ?? [];

  const pr = useMemo(
    () =>
      dataPoints.length > 0
        ? dataPoints.reduce((best, d) =>
            d.estimated1Rm > best.estimated1Rm ? d : best,
          )
        : null,
    [dataPoints],
  );

  return (
    <div className="space-y-6">
      {/* Date filters */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#94a3b8] mb-1 block">From</label>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className={`w-full h-11 rounded-lg bg-[#0f172a] border border-[#334155] px-3 text-sm focus:border-[#6366f1] outline-none ${dateFrom ? 'text-[#f1f5f9]' : 'text-[#475569]'}`}
            placeholder="Select start date"
          />
        </div>
        <div>
          <label className="text-xs text-[#94a3b8] mb-1 block">To</label>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ colorScheme: 'dark' }}
            className={`w-full h-11 rounded-lg bg-[#0f172a] border border-[#334155] px-3 text-sm focus:border-[#6366f1] outline-none ${dateTo ? 'text-[#f1f5f9]' : 'text-[#475569]'}`}
            placeholder="Select end date"
          />
        </div>
      </div>

      {/* Personal Record card */}
      {pr && (
        <div className="bg-gradient-to-r from-[#6366f1]/20 to-[#6366f1]/5 border border-[#6366f1]/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-[#f59e0b]" />
            <h3 className="text-base font-bold">Personal Record</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xl font-bold text-[#6366f1]">
                {formatWeight(pr.maxWeight)}
              </p>
              <p className="text-[10px] text-[#94a3b8] uppercase">Max Weight</p>
            </div>
            <div>
              <p className="text-xl font-bold">{pr.totalReps} reps</p>
              <p className="text-[10px] text-[#94a3b8] uppercase">Total Reps</p>
            </div>
            <div>
              <p className="text-xl font-bold text-[#22c55e]">
                {pr.estimated1Rm.toFixed(1)}
              </p>
              <p className="text-[10px] text-[#94a3b8] uppercase">Est 1RM</p>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-2 text-xs text-[#94a3b8]">
            <Calendar className="w-3 h-3" />
            <span>{pr.date}</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      )}

      {!isLoading && dataPoints.length === 0 && (
        <p className="text-center text-text-muted py-8">
          No data found for "{exerciseName}"
        </p>
      )}

      {!isLoading && dataPoints.length > 0 && (
        <>
          {/* Max weight chart */}
          <div>
            <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">
              Max Weight (kg)
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
                    dataKey="maxWeight"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#6366f1' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Estimated 1RM chart */}
          <div>
            <h3 className="text-sm font-semibold text-[#94a3b8] mb-2">
              Estimated 1RM (kg)
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
                    dataKey="estimated1Rm"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#22c55e' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Total volume chart */}
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
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#f59e0b' }}
                    activeDot={{ r: 5 }}
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
