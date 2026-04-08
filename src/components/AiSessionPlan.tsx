import { useState } from 'react';
import { useSessionPlan } from '@/api/ai';
import { formatWeight } from '@/utils/format';
import { Brain, ChevronDown, ChevronUp, Flame, Loader2 } from 'lucide-react';
import type { PlannedExercise } from '@/types';

interface AiSessionPlanProps {
  sessionId: string;
}

export default function AiSessionPlan({ sessionId }: AiSessionPlanProps) {
  const { data: plan, isLoading, isError } = useSessionPlan(sessionId);
  const [expanded, setExpanded] = useState(true);
  const [expandedExercise, setExpandedExercise] = useState<Record<number, boolean>>({});

  // Don't show anything if no plan or no exercises
  if (isError) return null;
  if (!isLoading && (!plan || plan.exercises.length === 0)) return null;

  const toggleExercise = (idx: number) => {
    setExpandedExercise((p) => ({ ...p, [idx]: !p[idx] }));
  };

  return (
    <div className="max-w-lg mx-auto px-3 pt-4">
      <div className="bg-gradient-to-br from-primary/10 via-surface to-surface border border-primary/25 rounded-2xl overflow-hidden">
        {/* Header */}
        <button
          className="w-full flex items-center justify-between px-4 py-3 touch-manipulation"
          onClick={() => setExpanded((p) => !p)}
        >
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-primary">AI Recommended Plan</h3>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-primary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-primary" />
          )}
        </button>

        {expanded && (
          <div className="px-3 pb-3">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-text-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Analyzing your history...</span>
              </div>
            ) : plan ? (
              <>
                {plan.note && (
                  <p className="text-xs text-text-muted px-1 mb-2 italic">{plan.note}</p>
                )}
                <div className="space-y-1.5">
                  {plan.exercises.map((exercise: PlannedExercise, idx: number) => {
                    const isOpen = expandedExercise[idx] !== false; // default open
                    const workingSets = exercise.sets.filter((s) => !s.isWarmup);
                    const warmupSets = exercise.sets.filter((s) => s.isWarmup);

                    return (
                      <div key={idx} className="bg-background/60 rounded-xl overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-3 py-2 touch-manipulation"
                          onClick={() => toggleExercise(idx)}
                        >
                          <span className="text-sm font-semibold text-text truncate">
                            {exercise.exerciseName}
                          </span>
                          <span className="text-xs text-text-muted shrink-0 ml-2">
                            {warmupSets.length > 0 && (
                              <span className="text-warning mr-1">{warmupSets.length}W</span>
                            )}
                            {workingSets.length}x
                          </span>
                        </button>

                        {isOpen && (
                          <div className="px-3 pb-2">
                            <div className="grid grid-cols-[24px_1fr_1fr] gap-1 text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
                              <span>Set</span>
                              <span>Weight</span>
                              <span>Reps</span>
                            </div>
                            {exercise.sets.map((set, si) => (
                              <div
                                key={si}
                                className={`grid grid-cols-[24px_1fr_1fr] gap-1 items-center py-0.5 ${
                                  set.isWarmup ? 'opacity-60' : ''
                                }`}
                              >
                                <span className="text-xs text-text-muted text-center">
                                  {set.setNumber}
                                  {set.isWarmup && (
                                    <Flame className="w-2.5 h-2.5 text-warning inline ml-0.5" />
                                  )}
                                </span>
                                <span className={`text-sm text-center ${set.isWarmup ? 'text-text-muted' : 'text-text font-semibold'}`}>
                                  {formatWeight(set.weightKg)}
                                </span>
                                <span className={`text-sm text-center ${set.isWarmup ? 'text-text-muted' : 'text-text font-semibold'}`}>
                                  {set.reps}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
