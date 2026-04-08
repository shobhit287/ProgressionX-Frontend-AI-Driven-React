import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAnalyzeSessions, useAnalyzeExercise, useAnalyzeWeight } from '@/api/ai';
import { useExerciseNames } from '@/api/exercises';
import type { AIAnalysisResponse } from '@/types';
import AnalysisResult from '@/components/AnalysisResult';
import { Brain, Dumbbell, Scale, Activity } from 'lucide-react';

type AnalysisType = 'sessions' | 'exercise' | 'weight' | null;

interface FormState {
  dateFrom: string;
  dateTo: string;
  question: string;
  exerciseName: string;
}

const emptyForm: FormState = {
  dateFrom: '',
  dateTo: '',
  question: '',
  exerciseName: '',
};

export default function AIPage() {
  const [activeType, setActiveType] = useState<AnalysisType>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [result, setResult] = useState<AIAnalysisResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Exercise autocomplete
  const { data: allExerciseNames } = useExerciseNames();
  const [showDropdown, setShowDropdown] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const analyzeSessions = useAnalyzeSessions();
  const analyzeExercise = useAnalyzeExercise();
  const analyzeWeight = useAnalyzeWeight();

  const isPending =
    analyzeSessions.isPending || analyzeExercise.isPending || analyzeWeight.isPending;

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const updateForm = (patch: Partial<FormState>) =>
    setForm((p) => ({ ...p, ...patch }));

  // Debounced exercise name search
  const handleExerciseInput = useCallback((value: string) => {
    updateForm({ exerciseName: value });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim().toLowerCase());
      setShowDropdown(true);
    }, 300);
  }, []);

  const filteredExercises = useMemo(() => {
    if (!allExerciseNames || !debouncedQuery) return [];
    return allExerciseNames.filter((name) =>
      name.toLowerCase().includes(debouncedQuery),
    );
  }, [allExerciseNames, debouncedQuery]);

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

  const handleOpen = (type: AnalysisType) => {
    setActiveType(type);
    setForm(emptyForm);
    setResult(null);
    setErrorMsg('');
    setShowDropdown(false);
  };

  const handleSubmit = () => {
    setErrorMsg('');
    setResult(null);
    const params = {
      startDate: form.dateFrom || undefined,
      endDate: form.dateTo || undefined,
    };

    const onSuccess = (data: AIAnalysisResponse) => setResult(data);
    const onError = (err: any) => {
      setErrorMsg(err.userMessage || 'Something went wrong. Please try again.');
    };

    if (activeType === 'sessions') {
      analyzeSessions.mutate(params, { onSuccess, onError });
    } else if (activeType === 'exercise') {
      if (!form.exerciseName.trim()) return;
      analyzeExercise.mutate(
        { exerciseName: form.exerciseName.trim(), ...params },
        { onSuccess, onError },
      );
    } else if (activeType === 'weight') {
      analyzeWeight.mutate(params, { onSuccess, onError });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">AI Coach</h1>
        <p className="text-sm text-[#94a3b8]">
          Get AI-powered analysis and suggestions for your training
        </p>

        {/* Analysis cards */}
        <div className="space-y-3">
          {/* Workout analysis */}
          <button
            onClick={() => handleOpen('sessions')}
            className={`w-full rounded-2xl p-4 text-left transition-colors border ${
              activeType === 'sessions'
                ? 'bg-[#6366f1]/10 border-[#6366f1]'
                : 'bg-[#1e293b] border-transparent hover:border-[#334155]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#6366f1]/20 flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 text-[#6366f1]" />
              </div>
              <div>
                <h3 className="text-base font-bold">Analyze Workouts</h3>
                <p className="text-xs text-[#94a3b8]">
                  Volume trends, recovery, programming insights
                </p>
              </div>
            </div>
          </button>

          {/* Exercise analysis */}
          <button
            onClick={() => handleOpen('exercise')}
            className={`w-full rounded-2xl p-4 text-left transition-colors border ${
              activeType === 'exercise'
                ? 'bg-[#22c55e]/10 border-[#22c55e]'
                : 'bg-[#1e293b] border-transparent hover:border-[#334155]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#22c55e]/20 flex items-center justify-center shrink-0">
                <Dumbbell className="w-5 h-5 text-[#22c55e]" />
              </div>
              <div>
                <h3 className="text-base font-bold">Analyze Exercise</h3>
                <p className="text-xs text-[#94a3b8]">
                  Progression rate, form cues, plateau detection
                </p>
              </div>
            </div>
          </button>

          {/* Weight analysis */}
          <button
            onClick={() => handleOpen('weight')}
            className={`w-full rounded-2xl p-4 text-left transition-colors border ${
              activeType === 'weight'
                ? 'bg-[#f59e0b]/10 border-[#f59e0b]'
                : 'bg-[#1e293b] border-transparent hover:border-[#334155]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#f59e0b]/20 flex items-center justify-center shrink-0">
                <Scale className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <div>
                <h3 className="text-base font-bold">Analyze Weight</h3>
                <p className="text-xs text-[#94a3b8]">
                  Body composition trends, rate of change
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Form */}
        {activeType && (
          <div className="bg-[#1e293b] rounded-2xl p-4 space-y-3">
            {activeType === 'exercise' && (
              <div className="relative" ref={dropdownRef}>
                <label className="text-xs text-[#94a3b8] mb-1 block">
                  Exercise Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bench Press"
                  value={form.exerciseName}
                  onChange={(e) => handleExerciseInput(e.target.value)}
                  onFocus={() => form.exerciseName.trim() && setShowDropdown(true)}
                  className="w-full h-12 rounded-lg bg-[#0f172a] border border-[#334155] px-4 text-[#f1f5f9] text-base placeholder:text-[#475569] focus:border-[#6366f1] outline-none"
                />
                {showDropdown && form.exerciseName.trim() && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-[#1e293b] border border-[#334155] rounded-lg max-h-48 overflow-y-auto shadow-lg">
                    {filteredExercises.length > 0 ? (
                      filteredExercises.map((name) => (
                        <button
                          key={name}
                          onClick={() => {
                            updateForm({ exerciseName: name });
                            setShowDropdown(false);
                          }}
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
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94a3b8] mb-1 block">From</label>
                <input
                  type="date"
                  value={form.dateFrom}
                  max={form.dateTo || today}
                  onChange={(e) => updateForm({ dateFrom: e.target.value })}
                  className="w-full h-11 rounded-lg bg-[#0f172a] border border-[#334155] px-3 text-[#f1f5f9] text-sm focus:border-[#6366f1] outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#94a3b8] mb-1 block">To</label>
                <input
                  type="date"
                  value={form.dateTo}
                  min={form.dateFrom || undefined}
                  max={today}
                  onChange={(e) => updateForm({ dateTo: e.target.value })}
                  className="w-full h-11 rounded-lg bg-[#0f172a] border border-[#334155] px-3 text-[#f1f5f9] text-sm focus:border-[#6366f1] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#94a3b8] mb-1 block">
                Question (optional)
              </label>
              <textarea
                placeholder="Ask something specific..."
                value={form.question}
                onChange={(e) => updateForm({ question: e.target.value })}
                rows={3}
                className="w-full rounded-lg bg-[#0f172a] border border-[#334155] px-4 py-3 text-[#f1f5f9] text-sm placeholder:text-[#475569] focus:border-[#6366f1] outline-none resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="w-full h-12 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] active:bg-[#4338ca] text-white text-base font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Brain className="w-5 h-5" />
              {isPending ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        )}

        {/* Loading */}
        {isPending && (
          <div className="flex items-center justify-center gap-3 py-6 text-[#94a3b8]">
            <div className="animate-spin h-6 w-6 border-2 border-[#6366f1] border-t-transparent rounded-full" />
            <span className="text-base">AI is analyzing your data...</span>
          </div>
        )}

        {/* Error */}
        {errorMsg && !isPending && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
            {errorMsg}
          </div>
        )}

        {/* Result */}
        {result && !isPending && <AnalysisResult data={result} />}
    </div>
  );
}
