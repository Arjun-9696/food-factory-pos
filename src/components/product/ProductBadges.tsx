import { memo } from "react";
import type { MenuItem } from "@/data/menu";
import { deriveBadges } from "./helpers";

interface ProductBadgesProps {
  product: MenuItem;
  reviewSummary?: { average: number; count: number };
}

export const ProductBadges = memo(function ProductBadges({ product, reviewSummary }: ProductBadgesProps) {
  const badges = deriveBadges(product, reviewSummary);
  if (badges.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Product highlights">
      {badges.map((b) => (
        <li
          key={b.id}
          className="flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground/90 backdrop-blur-sm"
        >
          <span aria-hidden>{b.emoji}</span>
          {b.label}
        </li>
      ))}
    </ul>
  );
});
