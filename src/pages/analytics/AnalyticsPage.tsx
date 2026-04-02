import { useState } from 'react';
import SessionAnalytics from '@/pages/analytics/SessionAnalytics';
import ExerciseAnalytics from '@/pages/analytics/ExerciseAnalytics';
import { Search } from 'lucide-react';

type Tab = 'sessions' | 'exercises';

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('sessions');
  const [exerciseName, setExerciseName] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const handleExerciseSearch = () => {
    const trimmed = searchInput.trim();
    if (trimmed) setExerciseName(trimmed);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Analytics</h1>

        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          {(['sessions', 'exercises'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 pb-3 text-base font-semibold transition-colors ${
                tab === t
                  ? 'text-[#6366f1] border-b-2 border-[#6366f1]'
                  : 'text-[#94a3b8]'
              }`}
            >
              {t === 'sessions' ? 'Sessions' : 'Exercises'}
            </button>
          ))}
        </div>

        {/* Sessions tab */}
        {tab === 'sessions' && <SessionAnalytics />}

        {/* Exercises tab */}
        {tab === 'exercises' && (
          <div className="space-y-6">
            {/* Exercise search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Exercise name (e.g. Bench Press)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExerciseSearch()}
                  className="w-full h-12 rounded-xl bg-[#1e293b] border border-[#334155] pl-10 pr-4 text-[#f1f5f9] text-base placeholder:text-[#475569] focus:border-[#6366f1] outline-none"
                />
              </div>
              <button
                onClick={handleExerciseSearch}
                className="h-12 px-5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white font-semibold shrink-0"
              >
                Go
              </button>
            </div>

            {exerciseName ? (
              <>
                <h2 className="text-lg font-bold">{exerciseName}</h2>
                <ExerciseAnalytics exerciseName={exerciseName} />
              </>
            ) : (
              <p className="text-center text-[#94a3b8] py-12">
                Search for an exercise to see analytics
              </p>
            )}
          </div>
        )}
    </div>
  );
}
