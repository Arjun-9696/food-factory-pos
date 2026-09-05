import { Check } from "lucide-react";

export type AddToCartState = "idle" | "added" | "unavailable";

interface AddToCartButtonProps {
  state: AddToCartState;
  onClick: () => void;
  /** Total price shown inside the button, e.g. ₹318 */
  totalLabel?: string;
  compact?: boolean;
  className?: string;
  /** Item is already in the cart — the button confirms/updates the quantity. */
  inCart?: boolean;
}

/**
 * Single purchase action used by both the inline CTA and the sticky mobile bar.
 * Fixed min-width keeps the layout stable across all states (no jitter).
 */
export function AddToCartButton({ state, onClick, totalLabel, compact = false, className = "", inCart = false }: AddToCartButtonProps) {
  const unavailable = state === "unavailable";
  const added = state === "added";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={unavailable}
      aria-disabled={unavailable}
      aria-live="polite"
      className={`relative flex min-w-[180px] items-center justify-center gap-2 overflow-hidden rounded-xl cart-gradient font-bold text-white shadow-lg shadow-orange-500/25 transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none ${
        compact ? "h-12 px-5 text-sm" : "min-h-[52px] px-8 py-3.5 text-base"
      } ${className}`}
    >
      {unavailable ? (
        "Currently Unavailable"
      ) : added ? (
        <>
          <Check className="w-5 h-5" aria-hidden />
          {inCart ? "Cart Updated" : "Added to Cart"}
        </>
      ) : inCart ? (
        <>
          <span>Update Cart</span>
          {totalLabel && (
            <>
              <span className="h-4 w-px bg-white/40" aria-hidden />
              <span className="tabular-nums">{totalLabel}</span>
            </>
          )}
        </>
      ) : (
        <>
          <span>Add to Cart</span>
          {totalLabel && (
            <>
              <span className="h-4 w-px bg-white/40" aria-hidden />
              <span className="tabular-nums">{totalLabel}</span>
            </>
          )}
        </>
      )}
    </button>
  );
}
