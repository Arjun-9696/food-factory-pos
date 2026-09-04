import { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Star, MessageCircleHeart, Pencil, Trash2, X, LogIn } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  removeReview,
  saveReview,
  summarizeReviews,
  type ProductReview,
  type RatingSummary,
} from "@/lib/reviewsApi";
import { useGoogleReviews } from "@/hooks/useGoogleReviews";
import { useGoogleTestimonials } from "@/hooks/useGoogleTestimonials";
import { GoogleReviewsCard } from "@/components/product/GoogleReviewsCard";
import type { MenuItem } from "@/data/menu";

interface ProductReviewsProps {
  product: MenuItem;
  reviews: ProductReview[];
  loading: boolean;
  onRefresh: () => void;
}

function Stars({ rating, size = "w-4 h-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${
            i <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/30"
          }`}
          aria-hidden
        />
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

/** Interactive 1–5 star picker for the review form. */
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          aria-label={`${i} star${i > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
          className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              i <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
            }`}
            aria-hidden
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-semibold text-muted-foreground">
        {shown === 1 && "Poor"}
        {shown === 2 && "Fair"}
        {shown === 3 && "Good"}
        {shown === 4 && "Very good"}
        {shown === 5 && "Excellent"}
      </span>
    </div>
  );
}

export const ProductReviews = memo(function ProductReviews({ product, reviews, loading, onRefresh }: ProductReviewsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const google = useGoogleReviews();
  const { testimonials } = useGoogleTestimonials();
  const visibleTestimonials = testimonials.filter((t) => t.visible);
  const summary: RatingSummary = summarizeReviews(reviews);

  const myReview = user ? reviews.find((r) => r.userId === user.id) : undefined;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openForm = (existing?: ProductReview) => {
    setRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? "");
    setEditing(Boolean(existing));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(false);
    setRating(0);
    setComment("");
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (rating < 1) {
      toast.error("Please select a star rating");
      return;
    }
    setSubmitting(true);
    const displayName = user.name || user.email?.split("@")[0] || "Customer";
    const { error } = await saveReview({
      productId: product.id,
      userId: user.id,
      userName: displayName,
      rating,
      comment,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(myReview && editing ? "Your review was updated" : "Thanks for your review!");
    closeForm();
    onRefresh();
  };

  const handleDelete = async () => {
    if (!myReview) return;
    if (!window.confirm("Delete your review?")) return;
    const { error } = await removeReview(myReview.id);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Your review was deleted");
    closeForm();
    onRefresh();
  };

  const requireSignIn = () => {
    toast("Sign in to share your experience", {
      description: "You can rate this product after signing in.",
      action: {
        label: "Sign In",
        onClick: () => navigate("/login"),
      },
    });
  };

  return (
    <section aria-labelledby="reviews-heading" className="scroll-mt-24">
      <h2 id="reviews-heading" className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" aria-hidden />
        Customer Reviews
      </h2>

      {/* ---- Google Maps reviews (live rating + curated top reviews) ---- */}
      {google.status === "ready" && google.data ? (
        <GoogleReviewsCard data={google.data} pinned={visibleTestimonials} />
      ) : visibleTestimonials.length > 0 ? (
        <GoogleReviewsCard pinned={visibleTestimonials} />
      ) : null}

      {/* ---- Summary ---- */}
      {summary.count > 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="text-center">
              <p className="text-4xl font-extrabold tabular-nums leading-none text-foreground">
                {summary.average.toFixed(1)}
              </p>
              <Stars rating={summary.average} />
              <p className="mt-1 text-xs text-muted-foreground">{summary.count} review{summary.count === 1 ? "" : "s"}</p>
            </div>
            <div className="min-w-[180px] flex-1 space-y-1" aria-label="Rating distribution">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const pct = summary.count > 0 ? Math.round((summary.distribution[star] / summary.count) * 100) : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-8 shrink-0 tabular-nums">{star} ★</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right tabular-nums">{summary.distribution[star]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        !formOpen && (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border/70 bg-secondary/40 px-4 py-8 text-center">
            <MessageCircleHeart className="mb-2 w-6 h-6 text-orange-500" aria-hidden />
            <p className="text-sm font-medium text-foreground">Be the first to review this item.</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Tried {product.name}? Share your experience after your next order.
            </p>
          </div>
        )
      )}

      {/* ---- Write / edit controls ---- */}
      <div className="mt-4">
        {!user ? (
          <button
            type="button"
            onClick={requireSignIn}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-2.5 text-sm font-bold text-orange-600 transition-colors hover:bg-orange-500/20 dark:text-orange-400"
          >
            <LogIn className="w-4 h-4" aria-hidden />
            Sign in to write a review
          </button>
        ) : formOpen ? (
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                {editing ? "Edit your review" : `Review ${product.name}`}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Cancel review"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            </div>
            <StarInput value={rating} onChange={setRating} />
            <label htmlFor="review-comment" className="mt-3 block text-xs font-semibold text-muted-foreground">
              Your experience (optional)
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder={`What did you think of ${product.name}?`}
              className="mt-1 w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || rating < 1}
                className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving…" : editing ? "Update Review" : "Submit Review"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {myReview ? (
              <>
                <button
                  type="button"
                  onClick={() => openForm(myReview)}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
                >
                  <Pencil className="w-4 h-4" aria-hidden />
                  Edit your review
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" aria-hidden />
                  Delete
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openForm()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:shadow-lg"
              >
                <Star className="w-4 h-4" aria-hidden />
                Write a review
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---- Review list ---- */}
      {loading && reviews.length === 0 ? (
        <div className="mt-4 space-y-3" aria-hidden>
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary/50" />
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => {
            const isOwn = Boolean(user && r.userId === user.id);
            return (
              <li key={r.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 text-sm font-extrabold text-white"
                    >
                      {r.userName.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">
                        {isOwn ? "You" : r.userName}
                        {isOwn && (
                          <span className="ml-2 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-600 dark:text-orange-400">
                            Your review
                          </span>
                        )}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Stars rating={r.rating} size="w-3.5 h-3.5" />
                        <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
                        {isOwn && (
                          <span className="text-xs text-muted-foreground/70">(only you can edit this)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isOwn && (
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => openForm(r)}
                        aria-label="Edit your review"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="w-4 h-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        aria-label="Delete your review"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
                {r.comment && (
                  <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/90">
                    {r.comment}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
});
