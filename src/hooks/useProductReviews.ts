import { useCallback, useEffect, useState } from "react";
import { fetchReviews, type ProductReview } from "@/lib/reviewsApi";

/**
 * Loads reviews for a product with a small module-level cache so the
 * rating summary (badges, JSON-LD) and the reviews section share one fetch.
 */
const cache = new Map<string, ProductReview[]>();

export function useProductReviews(productId: string | undefined) {
  const [reviews, setReviews] = useState<ProductReview[]>(() =>
    productId ? cache.get(productId) ?? [] : []
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    const { reviews: next } = await fetchReviews(productId);
    cache.set(productId, next);
    setReviews(next);
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    setReviews(productId ? cache.get(productId) ?? [] : []);
    refresh();
  }, [refresh, productId]);

  return { reviews, loading, refresh };
}
