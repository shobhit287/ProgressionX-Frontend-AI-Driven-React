import { useState } from 'react';
import { usePreviousSession } from '@/api/sessions';
import { formatDate, formatWeight } from '@/utils/format';
import { History, ChevronDown, ChevronUp, Flame, ArrowDownCircle, Loader2 } from 'lucide-react';
import RestDivider from '@/components/RestDivider';
import type { ExerciseSet, SessionExercise } from '@/types';

interface LastSessionPanelProps {
  sessionId: string;
}

export default function LastSessionPanel({ sessionId }: LastSessionPanelProps) {
  const { data: prev, isLoading, isError } = usePreviousSession(sessionId);
  const [expanded, setExpanded] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<Record<string, boolean>>({});

  // Header stays mounted for all states — loading, no-data, AND error — so
  // the panel never just vanishes. Earlier versions returned null on error
  // or on `!prev`, which left the user wondering whether the section even
  // existed. The body distinguishes between states so the user knows what
  // happened.
  const hasData = !!prev && prev.exercises.length > 0;
  const exercises = prev?.exercises ?? [];

  const toggleExercise = (id: string) => {
    setExpandedExercise((p) => ({ ...p, [id]: !p[id] }));
  };

  return (
    <div className="max-w-lg mx-auto px-3 pt-3">
      <div className="bg-gradient-to-br from-surface-light/30 via-surface to-surface border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <button
          className="w-full flex items-center justify-between px-4 py-3 touch-manipulation"
          onClick={() => setExpanded((p) => !p)}
        >
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-text-muted" />
            <h3 className="text-sm font-bold text-text">Last Session</h3>
            {prev?.startedAt && (
              <span className="text-xs text-text-muted">
                — {formatDate(prev.startedAt)}
              </span>
            )}
            {!isLoading && !hasData && !isError && (
              <span className="text-xs text-text-muted italic">— none yet</span>
            )}
            {isError && (
              <span className="text-xs text-danger italic">— unavailable</span>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-text-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-text-muted" />
          )}
        </button>

        {expanded && (
          <div className="px-3 pb-3">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-text-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading last session...</span>
              </div>
            ) : isError ? (
              <p className="text-xs text-text-muted py-4 text-center">
                Couldn't load last session — check that the backend is up to date.
              </p>
            ) : hasData ? (
              <div className="space-y-1.5">
                {exercises
                  .slice()
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((exercise) => (
                    <ExerciseCard
                      key={exercise.id}
                      exercise={exercise}
                      isOpen={expandedExercise[exercise.id] !== false}
                      onToggle={() => toggleExercise(exercise.id)}
                    />
                  ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-4 text-center">
                No prior completed session for this split yet.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ExerciseCardProps {
  exercise: SessionExercise;
  isOpen: boolean;
  onToggle: () => void;
}

function ExerciseCard({ exercise, isOpen, onToggle }: ExerciseCardProps) {
  // Sort by setNumber, then build display labels and group drops under their
  // parent. Same scheme as ActiveSession: top sets count 1, 2, 3 and drops
  // render as 3.1, 3.2 indented under the parent.
  const sorted = [...exercise.sets].sort((a, b) => a.setNumber - b.setNumber);
  const labels: Record<string, string> = {};
  let parentNum = 0;
  let dropIdx = 0;
  for (const s of sorted) {
    if (s.parentSetId) {
      dropIdx += 1;
      labels[s.id] = `${parentNum}.${dropIdx}`;
    } else {
      parentNum += 1;
      dropIdx = 0;
      labels[s.id] = String(parentNum);
    }
  }
  const workingCount = sorted.filter((s) => !s.isWarmup && !s.parentSetId).length;
  const warmupCount = sorted.filter((s) => s.isWarmup).length;

  return (
    <div className="bg-background/60 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-3 py-2 touch-manipulation"
        onClick={onToggle}
      >
        <span className="text-sm font-semibold text-text truncate">
          {exercise.exerciseName}
        </span>
        <span className="text-xs text-text-muted shrink-0 ml-2">
          {warmupCount > 0 && <span className="text-warning mr-1">{warmupCount}W</span>}
          {workingCount}x
        </span>
      </button>

      {isOpen && (
        <div className="px-3 pb-2">
          {sorted.length === 0 ? (
            <p className="text-xs text-text-muted italic py-1">No sets logged</p>
          ) : (
            <>
              <div className="grid grid-cols-[32px_1fr_1fr_44px] gap-1 text-[10px] uppercase tracking-wider text-text-muted mb-0.5 px-1">
                <span>Set</span>
                <span>Weight</span>
                <span>Reps</span>
                <span>RIR</span>
              </div>
              {sorted.map((set) => (
                <SetRow key={set.id} set={set} label={labels[set.id]} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface SetRowProps {
  set: ExerciseSet;
  label: string;
}

function SetRow({ set, label }: SetRowProps) {
  const isDrop = !!set.parentSetId;
  return (
    <div className={isDrop ? 'ml-5 border-l-2 border-primary/40 pl-1.5' : ''}>
      {/* Rest taken before this set (between it and the one above) */}
      <RestDivider seconds={set.restSeconds} compact />
      <div
        className={`grid grid-cols-[32px_1fr_1fr_44px] gap-1 items-center px-1 py-0.5 ${
          set.isWarmup ? 'opacity-60' : ''
        }`}
      >
        <span
          className={`text-xs text-center ${
            isDrop ? 'text-primary font-semibold' : 'text-text-muted'
          }`}
        >
          {isDrop && <ArrowDownCircle className="w-2.5 h-2.5 inline mr-0.5" />}
          {label}
          {set.isWarmup && <Flame className="w-2.5 h-2.5 text-warning inline ml-0.5" />}
        </span>
        <span
          className={`text-sm text-center ${
            set.isWarmup ? 'text-text-muted' : 'text-text font-semibold'
          }`}
        >
          {formatWeight(set.weightKg)}
        </span>
        <span
          className={`text-sm text-center ${
            set.isWarmup ? 'text-text-muted' : 'text-text font-semibold'
          }`}
        >
          {set.reps}
        </span>
        <span className="text-xs text-text-muted text-center">
          {set.repsInReserve != null ? set.repsInReserve : '-'}
        </span>
      </div>
      {set.description && (
        <p className="text-[11px] text-text-muted italic px-1 pl-9 pb-0.5 break-words">
          {set.description}
        </p>
      )}
    </div>
  );
}
