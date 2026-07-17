import { Timer } from 'lucide-react';
import { formatDuration } from '@/utils/format';

interface RestDividerProps {
  /** Rest taken before this set, in seconds. null/undefined renders nothing —
   *  which is the correct behaviour for the first set of an exercise, dropset
   *  drops, and older sessions logged before rest was tracked. */
  seconds?: number | null;
  /** Tighter styling for dense panels (e.g. the Last Session card). */
  compact?: boolean;
}

/** A subtle "⏱ 1m 30s rest" line shown between two sets, representing the rest
 *  taken before the set it sits above. Keeps rest visible without adding a
 *  column to the already-tight set grids. */
export default function RestDivider({ seconds, compact = false }: RestDividerProps) {
  if (seconds == null) return null;
  return (
    <div
      className={`flex items-center gap-1 text-text-muted ${
        compact ? 'text-[9px] pl-6 py-px' : 'text-[10px] pl-8 py-0.5'
      }`}
    >
      <Timer className={compact ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0'} />
      <span className="tabular-nums">{formatDuration(seconds)} rest</span>
    </div>
  );
}
