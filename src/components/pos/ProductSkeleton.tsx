export function ProductSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-border/30">
      <div className="aspect-[4/3] skeleton-shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 skeleton-shimmer" />
        <div className="h-3 w-1/2 skeleton-shimmer" />
        <div className="flex justify-between items-center mt-2">
          <div className="h-5 w-12 skeleton-shimmer" />
          <div className="h-8 w-16 skeleton-shimmer rounded-xl" />
        </div>
      </div>
    </div>
  );
}
