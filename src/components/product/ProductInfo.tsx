import { memo, forwardRef } from "react";
import { Star } from "lucide-react";
import type { MenuItem } from "@/data/menu";
import { ProductPrice } from "./ProductPrice";
import { ProductBadges } from "./ProductBadges";
import { QuantitySelector } from "./QuantitySelector";
import { AddToCartButton, type AddToCartState } from "./AddToCartButton";

interface ProductInfoProps {
  product: MenuItem;
  quantity: number;
  onQuantityChange: (q: number) => void;
  ctaState: AddToCartState;
  onAdd: () => void;
  reviewSummary?: { average: number; count: number };
  inCart?: boolean;
}

export const ProductInfo = memo(forwardRef<HTMLDivElement, ProductInfoProps>(function ProductInfo(
  { product, quantity, onQuantityChange, ctaState, onAdd, reviewSummary, inCart = false },
  ref
) {
  const d = product.details;
  const shortDescription = d?.shortDescription || product.description;
  // Prefer real customer reviews; fall back to admin-entered details only.
  const hasRating =
    reviewSummary && reviewSummary.count > 0
      ? true
      : typeof d?.rating === "number" && typeof d?.reviewCount === "number" && d.reviewCount > 0;
  const shownRating = hasRating && reviewSummary && reviewSummary.count > 0 ? reviewSummary.average : d?.rating ?? 0;
  const shownCount =
    reviewSummary && reviewSummary.count > 0 ? reviewSummary.count : typeof d?.reviewCount === "number" ? d.reviewCount : 0;
  const totalLabel = `₹${(product.price * quantity).toLocaleString("en-IN")}`;

  return (
    <div ref={ref} className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
      {/* Category eyebrow */}
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
        {product.category}
      </p>

      {/* Name */}
      <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-foreground md:text-3xl xl:text-4xl">
        {product.name}
      </h1>

      {/* Rating — only when real review data exists */}
      {hasRating && (
        <div className="flex items-center gap-2" aria-label={`Rated ${shownRating.toFixed(1)} out of 5 based on ${shownCount} reviews`}>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i <= Math.round(shownRating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted-foreground/30"
                }`}
                aria-hidden
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-foreground">{shownRating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">({shownCount} review{shownCount === 1 ? "" : "s"})</span>
        </div>
      )}

      {/* Price */}
      <ProductPrice product={product} />

      {/* Short description */}
      {shortDescription && (
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground md:text-[15px]">
          {shortDescription}
        </p>
      )}

      {/* Trust badges */}
      <ProductBadges product={product} reviewSummary={reviewSummary} />

      {/* Purchase row */}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <QuantitySelector value={quantity} onChange={onQuantityChange} id="pdp-qty" />
        <AddToCartButton state={ctaState} onClick={onAdd} totalLabel={totalLabel} inCart={inCart} />
      </div>

      {/* Quality line */}
      <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden>🛵</span>
        Prepared fresh after you order — quality checked before dispatch.
      </p>
    </div>
  );
}));
