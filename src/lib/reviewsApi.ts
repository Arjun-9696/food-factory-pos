import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

/**
 * Product reviews & ratings.
 * - Anyone can read reviews (public product pages).
 * - Signed-in users can create ONE review per product, and edit/delete
 *   ONLY their own (enforced by RLS + unique index on product_id/user_id).
 */

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingSummary {
  average: number;
  count: number;
  /** distribution[stars] = number of reviews with that rating */
  distribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
}

export function mapDbReview(doc: Record<string, unknown>): ProductReview {
  return {
    id: String(doc.id ?? ""),
    productId: String(doc.product_id ?? ""),
    userId: String(doc.user_id ?? ""),
    userName: typeof doc.user_name === "string" && doc.user_name ? doc.user_name : "Customer",
    rating: Math.min(5, Math.max(1, Number(doc.rating) || 0)),
    comment: typeof doc.comment === "string" ? doc.comment : "",
    createdAt: typeof doc.created_at === "string" ? doc.created_at : new Date().toISOString(),
    updatedAt: typeof doc.updated_at === "string" ? doc.updated_at : new Date().toISOString(),
  };
}

export async function fetchReviews(productId: string): Promise<{ reviews: ProductReview[]; ok: boolean }> {
  if (!productId) return { reviews: [], ok: true };
  if (!isSupabaseConfigured()) return { reviews: [], ok: false };
  try {
    const { data, error } = await supabase
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { reviews: (data || []).map(mapDbReview), ok: true };
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    return { reviews: [], ok: false };
  }
}

export interface SaveReviewInput {
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
}

/** Insert or update the current user's review for a product. */
export async function saveReview(input: SaveReviewInput): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Reviews are unavailable right now." };
  const { error } = await supabase.from("product_reviews").upsert(
    {
      product_id: input.productId,
      user_id: input.userId,
      user_name: input.userName || "Customer",
      rating: input.rating,
      comment: input.comment.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "product_id,user_id" }
  );
  if (error) {
    console.error("Error saving review:", error);
    return { error: error.message || "Could not save your review." };
  }
  return { error: null };
}

export async function removeReview(reviewId: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Reviews are unavailable right now." };
  const { error } = await supabase.from("product_reviews").delete().eq("id", reviewId);
  if (error) {
    console.error("Error deleting review:", error);
    return { error: error.message || "Could not delete your review." };
  }
  return { error: null };
}

/** Compute average / count / star distribution from real reviews. */
export function summarizeReviews(reviews: ProductReview[]): RatingSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingSummary["distribution"];
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) distribution[r.rating as 1 | 2 | 3 | 4 | 5] += 1;
  }
  const count = reviews.length;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return {
    average: count > 0 ? total / count : 0,
    count,
    distribution,
  };
}
