import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import SessionAnalytics from '@/pages/analytics/SessionAnalytics';
import ExerciseAnalytics from '@/pages/analytics/ExerciseAnalytics';
import { useExerciseNames } from '@/api/exercises';
import { Search, FileDown } from 'lucide-react';
import { Link } from 'react-router-dom';

type Tab = 'sessions' | 'exercises';

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('sessions');
  const [exerciseName, setExerciseName] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Exercise autocomplete
  const { data: allExerciseNames } = useExerciseNames();
  const [showDropdown, setShowDropdown] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleExerciseInput = useCallback((value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim().toLowerCase());
      setShowDropdown(true);
    }, 300);
  }, []);

  const filteredExercises = useMemo(() => {
    if (!allExerciseNames) return [];
    if (!debouncedQuery) return allExerciseNames;
    return allExerciseNames.filter((name) =>
      name.toLowerCase().includes(debouncedQuery),
    );
  }, [allExerciseNames, debouncedQuery]);

  const selectExercise = (name: string) => {
    setSearchInput(name);
    setExerciseName(name);
    setShowDropdown(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExerciseSearch = () => {
    const trimmed = searchInput.trim();
    if (trimmed) {
      setExerciseName(trimmed);
      setShowDropdown(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <Link
          to="/export"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#1e293b] border border-[#334155] text-[#cbd5e1] text-sm font-semibold hover:border-[#6366f1] hover:text-white transition-colors"
        >
          <FileDown size={16} />
          Backup
        </Link>
      </div>

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
            {/* Exercise search with autocomplete */}
            <div className="flex gap-2">
              <div className="relative flex-1" ref={dropdownRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94a3b8]" />
                <input
                  type="text"
                  placeholder="Start typing to search exercises..."
                  value={searchInput}
                  onChange={(e) => handleExerciseInput(e.target.value)}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExerciseSearch()}
                  autoComplete="off"
                  className="w-full h-12 rounded-xl bg-[#1e293b] border border-[#334155] pl-10 pr-4 text-[#f1f5f9] text-base placeholder:text-[#475569] focus:border-[#6366f1] outline-none"
                />
                {showDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1e293b] border border-[#334155] rounded-lg max-h-48 overflow-y-auto shadow-lg">
                    {filteredExercises.length > 0 ? (
                      filteredExercises.map((name) => (
                        <button
                          key={name}
                          onClick={() => selectExercise(name)}
                          className="w-full text-left px-4 py-2.5 text-sm text-[#f1f5f9] hover:bg-[#334155] transition-colors"
                        >
                          {name}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-[#94a3b8]">
                        No matching exercise found in your splits
                      </div>
                    )}
                  </div>
                )}
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
