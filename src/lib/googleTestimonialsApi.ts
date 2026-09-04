import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

/**
 * Admin-curated "Top Google Reviews".
 * The shop owner pastes favourite Google Maps reviews once via the Admin
 * page; every product page shows them under the live Google rating summary.
 * Fully free — no Places API billing required for review text.
 */

export interface GoogleTestimonial {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  relativeTime: string;
  displayOrder: number;
  visible: boolean;
}

export function mapDbTestimonial(doc: Record<string, unknown>): GoogleTestimonial {
  return {
    id: String(doc.id ?? ""),
    authorName: typeof doc.author_name === "string" && doc.author_name ? doc.author_name : "Google user",
    rating: Math.min(5, Math.max(1, Number(doc.rating) || 5)),
    comment: typeof doc.comment === "string" ? doc.comment : "",
    relativeTime: typeof doc.relative_time === "string" ? doc.relative_time : "",
    displayOrder: Number(doc.display_order) || 0,
    visible: doc.is_visible !== false,
  };
}

export async function fetchGoogleTestimonials(): Promise<{
  testimonials: GoogleTestimonial[];
  ok: boolean;
}> {
  if (!isSupabaseConfigured()) return { testimonials: [], ok: false };
  try {
    const { data, error } = await supabase
      .from("google_reviews")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { testimonials: (data || []).map(mapDbTestimonial), ok: true };
  } catch (error) {
    console.error("Error fetching Google testimonials:", error);
    return { testimonials: [], ok: false };
  }
}

export interface SaveTestimonialInput {
  id?: string;
  authorName: string;
  rating: number;
  comment: string;
  relativeTime: string;
  displayOrder?: number;
  visible?: boolean;
}

/** Insert a new curated review, or update an existing one when `id` is given. */
export async function saveGoogleTestimonial(
  input: SaveTestimonialInput
): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Database not connected." };
  const row: Record<string, unknown> = {
    author_name: input.authorName.trim() || "Google user",
    rating: input.rating,
    comment: input.comment.trim(),
    relative_time: input.relativeTime.trim(),
  };
  if (input.id) {
    row.id = input.id;
  }
  if (input.displayOrder !== undefined) {
    row.display_order = input.displayOrder;
  }
  if (input.visible !== undefined) {
    row.is_visible = input.visible;
  }
  const { error } = await supabase.from("google_reviews").upsert(row);
  if (error) {
    console.error("Error saving Google testimonial:", error);
    return { error: error.message || "Could not save the review." };
  }
  return { error: null };
}

export async function removeGoogleTestimonial(id: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: "Database not connected." };
  const { error } = await supabase.from("google_reviews").delete().eq("id", id);
  if (error) {
    console.error("Error deleting Google testimonial:", error);
    return { error: error.message || "Could not delete the review." };
  }
  return { error: null };
}
