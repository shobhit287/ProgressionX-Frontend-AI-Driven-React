import { useState } from 'react';
import { useAnalyzeSessions, useAnalyzeExercise, useAnalyzeWeight } from '@/api/ai';
import type { AIAnalysisResponse } from '@/types';
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

function AnalysisResult({ data }: { data: AIAnalysisResponse }) {
  return (
    <div className="bg-[#1e293b] rounded-xl p-4 space-y-4">
      <div>
        <h3 className="text-base font-bold flex items-center gap-2 mb-2">
          <Brain className="w-5 h-5 text-[#6366f1]" />
          Analysis
        </h3>
        <p className="text-sm text-[#94a3b8] leading-relaxed whitespace-pre-line">
          {data.analysis}
        </p>
      </div>
      {data.suggestions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Suggestions</h4>
          <ol className="list-decimal list-inside space-y-1.5">
            {data.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-[#94a3b8] leading-relaxed">
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function AIPage() {
  const [activeType, setActiveType] = useState<AnalysisType>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [result, setResult] = useState<AIAnalysisResponse | null>(null);

  const analyzeSessions = useAnalyzeSessions();
  const analyzeExercise = useAnalyzeExercise();
  const analyzeWeight = useAnalyzeWeight();

  const isPending =
    analyzeSessions.isPending || analyzeExercise.isPending || analyzeWeight.isPending;

  const updateForm = (patch: Partial<FormState>) =>
    setForm((p) => ({ ...p, ...patch }));

  const handleOpen = (type: AnalysisType) => {
    setActiveType(type);
    setForm(emptyForm);
    setResult(null);
  };

  const handleSubmit = () => {
    const params = {
      startDate: form.dateFrom || undefined,
      endDate: form.dateTo || undefined,
    };

    const onSuccess = (data: AIAnalysisResponse) => setResult(data);

    if (activeType === 'sessions') {
      analyzeSessions.mutate(params, { onSuccess });
    } else if (activeType === 'exercise') {
      if (!form.exerciseName.trim()) return;
      analyzeExercise.mutate(
        { exerciseName: form.exerciseName.trim(), ...params },
        { onSuccess },
      );
    } else if (activeType === 'weight') {
      analyzeWeight.mutate(params, { onSuccess });
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
              <div>
                <label className="text-xs text-[#94a3b8] mb-1 block">
                  Exercise Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bench Press"
                  value={form.exerciseName}
                  onChange={(e) => updateForm({ exerciseName: e.target.value })}
                  className="w-full h-12 rounded-lg bg-[#0f172a] border border-[#334155] px-4 text-[#f1f5f9] text-base placeholder:text-[#475569] focus:border-[#6366f1] outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94a3b8] mb-1 block">From</label>
                <input
                  type="date"
                  value={form.dateFrom}
                  onChange={(e) => updateForm({ dateFrom: e.target.value })}
                  className="w-full h-11 rounded-lg bg-[#0f172a] border border-[#334155] px-3 text-[#f1f5f9] text-sm focus:border-[#6366f1] outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-[#94a3b8] mb-1 block">To</label>
                <input
                  type="date"
                  value={form.dateTo}
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

        {/* Result */}
        {result && !isPending && <AnalysisResult data={result} />}
    </div>
  );
}
