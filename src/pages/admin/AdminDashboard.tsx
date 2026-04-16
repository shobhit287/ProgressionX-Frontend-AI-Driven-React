import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Activity,
  Brain,
  Clock,
  TrendingUp,
  LogOut,
  UserPlus,
  Zap,
  Timer,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import {
  useAdminDashboard,
  useAdminActiveHours,
  useAdminLlmUsage,
  useAdminUsers,
} from '@/api/admin';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDuration(seconds: number | null) {
  if (!seconds) return '-';
  const m = Math.round(seconds / 60);
  return `${m}m`;
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const { data: dashboard, isLoading: dashLoading } = useAdminDashboard();
  const { data: activeHours } = useAdminActiveHours(30);
  const { data: llmUsage } = useAdminLlmUsage(30);

  const [userPage, setUserPage] = useState(1);
  const [userSearch, setUserSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const { data: usersData } = useAdminUsers(userPage, userSearch);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUserSearch(searchInput);
    setUserPage(1);
  };

  if (dashLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f172a]">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-[#334155] bg-[#1e293b]/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-[#6366f1]">Progression</span>X
              <span className="ml-2 rounded-md bg-[#6366f1]/10 px-2 py-0.5 text-xs font-medium text-[#6366f1]">
                Admin
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#94a3b8]">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-[#94a3b8] hover:bg-[#334155] hover:text-[#f1f5f9] transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Users size={20} />}
            label="Total Users"
            value={dashboard?.totalUsers ?? 0}
            sub={`+${dashboard?.newUsersThisWeek ?? 0} this week`}
          />
          <StatCard
            icon={<Activity size={20} />}
            label="Active (7d)"
            value={dashboard?.activeUsers7d ?? 0}
            sub={`${dashboard?.totalUsers ? Math.round(((dashboard?.activeUsers7d ?? 0) / dashboard.totalUsers) * 100) : 0}% of users`}
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="Sessions Today"
            value={dashboard?.sessionsToday ?? 0}
            sub={`${formatNumber(dashboard?.totalSessions ?? 0)} total`}
          />
          <StatCard
            icon={<Brain size={20} />}
            label="LLM Calls Today"
            value={dashboard?.totalLlmCallsToday ?? 0}
            sub={`${formatNumber(dashboard?.totalLlmCallsMonth ?? 0)} this month`}
          />
        </div>

        {/* Second row stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<UserPlus size={20} />}
            label="New Today"
            value={dashboard?.newUsersToday ?? 0}
            sub={`${dashboard?.newUsersThisMonth ?? 0} this month`}
          />
          <StatCard
            icon={<Clock size={20} />}
            label="Active (30d)"
            value={dashboard?.activeUsers30d ?? 0}
            sub="monthly active"
          />
          <StatCard
            icon={<Timer size={20} />}
            label="Avg Duration"
            value={formatDuration(dashboard?.avgSessionDuration ?? null)}
            sub="last 30 days"
            raw
          />
          <StatCard
            icon={<Zap size={20} />}
            label="Tokens (Month)"
            value={formatNumber(dashboard?.totalTokensMonth ?? 0)}
            sub="input + output"
            raw
          />
        </div>

        {/* Active Hours Heatmap */}
        {activeHours && (
          <div className="rounded-2xl bg-[#1e293b] border border-[#334155] p-4">
            <h2 className="text-sm font-semibold text-[#94a3b8] mb-3">
              Peak Activity Hours (30d)
            </h2>
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">
                <div className="grid gap-1" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
                  {/* Header row */}
                  <div />
                  {DAY_LABELS.map((d) => (
                    <div key={d} className="text-center text-xs text-[#64748b]">{d}</div>
                  ))}

                  {/* Hour rows — show key hours */}
                  {Array.from({ length: 24 }, (_, hour) => {
                    // Only show every 2 hours for cleanliness
                    if (hour % 2 !== 0) return null;
                    return (
                      <div key={hour} className="contents">
                        <div className="text-xs text-[#64748b] flex items-center">
                          {hour.toString().padStart(2, '0')}
                        </div>
                        {Array.from({ length: 7 }, (_, dow) => {
                          const bucket = activeHours.buckets.find(
                            (b) => b.hour === hour && b.dayOfWeek === dow
                          );
                          const count = bucket?.count ?? 0;
                          const maxCount = Math.max(...activeHours.buckets.map((b) => b.count), 1);
                          const intensity = count / maxCount;
                          return (
                            <div
                              key={dow}
                              className="rounded h-6"
                              title={`${DAY_LABELS[dow]} ${hour}:00 — ${count} sessions`}
                              style={{
                                backgroundColor:
                                  intensity === 0
                                    ? '#1e293b'
                                    : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`,
                              }}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-[#64748b]">
              Peak: {DAY_LABELS[activeHours.peakDay]} at {activeHours.peakHour}:00
            </p>
          </div>
        )}

        {/* LLM Usage */}
        {llmUsage && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Daily calls chart */}
            <div className="rounded-2xl bg-[#1e293b] border border-[#334155] p-4">
              <h2 className="text-sm font-semibold text-[#94a3b8] mb-3">LLM Calls (30d)</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={llmUsage.daily}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 flex gap-4 text-xs text-[#94a3b8]">
                <span>Total: {formatNumber(llmUsage.totalCalls)}</span>
                <span>Errors: {llmUsage.totalErrors} ({llmUsage.errorRate}%)</span>
                <span>Avg: {llmUsage.avgDurationMs ? `${Math.round(llmUsage.avgDurationMs)}ms` : '-'}</span>
              </div>
            </div>

            {/* Endpoint breakdown */}
            <div className="rounded-2xl bg-[#1e293b] border border-[#334155] p-4">
              <h2 className="text-sm font-semibold text-[#94a3b8] mb-3">By Endpoint</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={llmUsage.byEndpoint} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis
                    dataKey="endpoint"
                    type="category"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 text-xs text-[#94a3b8]">
                Tokens: {formatNumber(llmUsage.totalInputTokens)} in / {formatNumber(llmUsage.totalOutputTokens)} out
              </div>
            </div>
          </div>
        )}

        {/* Top LLM Users */}
        {llmUsage && llmUsage.topUsers.length > 0 && (
          <div className="rounded-2xl bg-[#1e293b] border border-[#334155] p-4">
            <h2 className="text-sm font-semibold text-[#94a3b8] mb-3">Top AI Users (30d)</h2>
            <div className="space-y-2">
              {llmUsage.topUsers.map((u, i) => (
                <div key={u.userId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748b] w-5 text-right">{i + 1}.</span>
                    <span className="text-[#f1f5f9]">{u.name}</span>
                    <span className="text-[#64748b]">{u.email}</span>
                  </div>
                  <span className="text-[#6366f1] font-medium">{u.callCount} calls</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="rounded-2xl bg-[#1e293b] border border-[#334155] p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-semibold text-[#94a3b8]">
              Users {usersData ? `(${usersData.total})` : ''}
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="rounded-lg bg-[#0f172a] border border-[#334155] pl-8 pr-3 py-1.5 text-sm text-[#f1f5f9] placeholder-[#64748b] focus:outline-none focus:border-[#6366f1] w-56"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#6366f1]/90 transition-colors"
              >
                Search
              </button>
            </form>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#64748b] border-b border-[#334155]">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Goal</th>
                  <th className="pb-2 pr-4 text-right">Sessions</th>
                  <th className="pb-2 pr-4 text-right">AI Calls</th>
                  <th className="pb-2 text-right">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {usersData?.items.map((u) => (
                  <tr key={u.id} className="border-b border-[#334155]/50 hover:bg-[#334155]/20">
                    <td className="py-2.5 pr-4 text-[#f1f5f9]">{u.firstName} {u.lastName}</td>
                    <td className="py-2.5 pr-4 text-[#94a3b8]">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-full bg-[#6366f1]/10 px-2 py-0.5 text-xs text-[#6366f1] capitalize">
                        {u.goal}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-[#f1f5f9]">{u.totalSessions}</td>
                    <td className="py-2.5 pr-4 text-right text-[#f1f5f9]">{u.totalLlmCalls}</td>
                    <td className="py-2.5 text-right text-[#94a3b8]">{timeAgo(u.lastActive)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {usersData && usersData.total > 20 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-[#64748b]">
                Page {usersData.page} of {Math.ceil(usersData.total / usersData.pageSize)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                  disabled={userPage === 1}
                  className="rounded-lg border border-[#334155] p-1.5 text-[#94a3b8] hover:bg-[#334155] disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setUserPage((p) => p + 1)}
                  disabled={userPage >= Math.ceil(usersData.total / usersData.pageSize)}
                  className="rounded-lg border border-[#334155] p-1.5 text-[#94a3b8] hover:bg-[#334155] disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  raw = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
  raw?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#1e293b] border border-[#334155] p-4">
      <div className="flex items-center gap-2 text-[#6366f1] mb-2">{icon}</div>
      <p className="text-2xl font-bold text-[#f1f5f9]">
        {raw ? value : typeof value === 'number' ? formatNumber(value) : value}
      </p>
      <p className="text-xs text-[#64748b] mt-0.5">{label}</p>
      <p className="text-xs text-[#94a3b8] mt-1">{sub}</p>
    </div>
  );
}
