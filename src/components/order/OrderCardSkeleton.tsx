// ============================================================================
// OrderCardSkeleton — loading skeleton for order cards.
// ============================================================================
import { cn } from "@/lib/utils";

export function OrderCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card rounded-xl p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 skeleton-shimmer rounded" />
          <div className="h-3 w-36 skeleton-shimmer rounded" />
        </div>
        <div className="h-5 w-16 skeleton-shimmer rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full skeleton-shimmer rounded" />
        <div className="h-3 w-3/4 skeleton-shimmer rounded" />
      </div>
    </div>
  );
}

export function OrderDetailSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-8 w-40 skeleton-shimmer rounded" />
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="h-6 w-32 skeleton-shimmer rounded" />
        <div className="h-20 w-full skeleton-shimmer rounded-xl" />
        <div className="h-4 w-48 skeleton-shimmer rounded" />
      </div>
      <div className="glass-card rounded-2xl p-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-9 h-9 rounded-full skeleton-shimmer" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-28 skeleton-shimmer rounded" />
              <div className="h-3 w-20 skeleton-shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
