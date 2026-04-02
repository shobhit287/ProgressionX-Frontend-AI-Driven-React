import { memo } from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton = memo(function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-light/50 ${className}`}
    />
  );
});

export default Skeleton;

/** Pre-built skeleton patterns for common page sections */

export const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="rounded-xl bg-surface border border-border p-4 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
});

export const StatCardSkeleton = memo(function StatCardSkeleton() {
  return (
    <div className="rounded-xl bg-surface border border-border p-4 flex flex-col items-center gap-1">
      <Skeleton className="h-5 w-5 rounded-full" />
      <Skeleton className="h-7 w-12" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
});

export const ListItemSkeleton = memo(function ListItemSkeleton() {
  return (
    <div className="rounded-xl bg-surface border border-border p-4 flex items-center gap-3">
      <Skeleton className="h-5 w-5 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
});

export const ChartSkeleton = memo(function ChartSkeleton() {
  return (
    <div className="rounded-xl bg-surface p-3">
      <Skeleton className="h-[220px] w-full rounded-lg" />
    </div>
  );
});
