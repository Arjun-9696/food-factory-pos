import { useEffect, useState } from "react";
import { QuantitySelector } from "./QuantitySelector";
import { AddToCartButton, type AddToCartState } from "./AddToCartButton";

interface StickyMobileCTAProps {
  /** Ref for the sentinel element wrapping the main inline CTA. */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  quantity: number;
  onQuantityChange: (q: number) => void;
  state: AddToCartState;
  onAdd: () => void;
  totalLabel: string;
  inCart?: boolean;
}

/**
 * Mobile-only sticky purchase bar. Appears (with a smooth slide) only when
 * the main Add to Cart button has scrolled out of view, and respects the
 * bottom safe-area inset on notched devices.
 */
export function StickyMobileCTA({ sentinelRef, quantity, onQuantityChange, state, onAdd, totalLabel, inCart = false }: StickyMobileCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { rootMargin: "0px 0px -8px 0px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [sentinelRef]);

  if (state === "unavailable") return null;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-20 z-40 md:hidden transition-transform duration-300 ease-out ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="glass-surface border-t border-border/40 px-4 pt-3 pb-safe">
        <div className="mx-auto flex max-w-lg items-center gap-3 pb-3">
          <QuantitySelector value={quantity} onChange={onQuantityChange} compact />
          <AddToCartButton state={state} onClick={onAdd} totalLabel={totalLabel} compact inCart={inCart} className="min-w-0 flex-1" />
        </div>
      </div>
    </div>
  );
}
