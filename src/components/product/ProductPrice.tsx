import { memo } from "react";
import { formatINR, hasDiscount } from "./helpers";
import type { MenuItem } from "@/data/menu";

interface ProductPriceProps {
  product: MenuItem;
  quantity?: number;
  className?: string;
}

export const ProductPrice = memo(function ProductPrice({ product, quantity = 1, className = "" }: ProductPriceProps) {
  const unit = product.price;
  const total = unit * quantity;
  const discounted = hasDiscount(product);
  const compareAt = product.details?.compareAtPrice ?? 0;
  const savings = discounted ? (compareAt - unit) * quantity : 0;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="text-3xl font-extrabold tracking-tight text-orange-600 dark:text-orange-400">
          {formatINR(total)}
        </span>
        {discounted && (
          <>
            <span className="text-lg font-medium text-muted-foreground line-through">
              {formatINR(compareAt * quantity)}
            </span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-900/50 dark:text-green-300">
              Save {formatINR(savings)}
            </span>
          </>
        )}
        {quantity > 1 && (
          <span className="w-full text-xs text-muted-foreground">
            {formatINR(unit)} × {quantity}
          </span>
        )}
      </div>
    </div>
  );
});
