import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { getOptimizedImageUrl } from "@/lib/uploadImage";
import { readRecentlyViewed } from "@/lib/recentlyViewed";
import { formatINR } from "./helpers";

interface RecentlyViewedProps {
  currentSlug: string;
}

/** Horizontal strip of previously viewed products (excludes the current one). */
export const RecentlyViewed = memo(function RecentlyViewed({ currentSlug }: RecentlyViewedProps) {
  const navigate = useNavigate();
  const items = readRecentlyViewed().filter((i) => i.slug !== currentSlug);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" aria-hidden />
        Recently Viewed
      </h2>
      <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {items.map((item) => (
          <li key={item.slug} className="w-36 flex-shrink-0">
            <button
              type="button"
              onClick={() => navigate(`/product/${item.slug}`)}
              className="group w-full overflow-hidden rounded-xl border border-border/60 bg-card text-left shadow-sm transition-all hover:shadow-md"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                <img
                  src={getOptimizedImageUrl(item.image, 200)}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  width={144}
                  height={108}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-2.5">
                <p className="truncate text-xs font-bold text-foreground">{item.name}</p>
                <p className="mt-0.5 text-xs font-extrabold text-orange-600 dark:text-orange-400">
                  {formatINR(item.price)}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
});
