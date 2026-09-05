export function ProductSkeleton() {
  return (
    <div className="animate-fade-in" aria-busy="true" aria-label="Loading product">
      <div className="h-5 w-64 max-w-full animate-pulse rounded-md bg-muted" />

      <div className="mt-6 grid gap-8 lg:grid-cols-[55%_45%] lg:gap-12">
        {/* Gallery */}
        <div>
          <div className="aspect-square w-full animate-pulse rounded-2xl bg-muted" />
          <div className="mt-3 hidden gap-2 md:flex">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="aspect-square w-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
          <div className="h-9 w-4/5 animate-pulse rounded-lg bg-muted" />
          <div className="flex items-center gap-2">
            <div className="h-5 w-28 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="h-10 w-36 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-11/12 animate-pulse rounded-md bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex gap-2 pt-1">
            <div className="h-8 w-32 animate-pulse rounded-full bg-muted" />
            <div className="h-8 w-28 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <div className="h-11 w-32 animate-pulse rounded-xl bg-muted" />
            <div className="h-[52px] min-w-[180px] flex-1 animate-pulse rounded-xl bg-muted" />
          </div>
        </div>
      </div>

      {/* Below-fold sections */}
      <div className="mt-14 space-y-10">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <div className="mb-4 h-6 w-44 animate-pulse rounded-md bg-muted" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-24 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
