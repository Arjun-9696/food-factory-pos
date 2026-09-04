import { memo } from "react";
import { Star, ExternalLink, Quote } from "lucide-react";
import type { GooglePlaceReviews, GoogleReview } from "@/lib/googleReviews";
import { GOOGLE_MAPS_URL_FALLBACK } from "@/lib/googleReviews";
import type { GoogleTestimonial } from "@/lib/googleTestimonialsApi";

function GoogleLogo({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29A7.2 7.2 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export function GoogleStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Rated ${rating} out of 5 on Google`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
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

interface ReviewItemProps {
  review: GoogleReview;
  curated?: boolean;
}

function ReviewItem({ review, curated }: ReviewItemProps) {
  const initial = review.authorName.charAt(0).toUpperCase();
  const avatar = review.authorPhoto ? (
    <img
      src={review.authorPhoto}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-9 w-9 shrink-0 rounded-full object-cover"
    />
  ) : (
    <span
      aria-hidden
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
        curated
          ? "bg-gradient-to-br from-blue-500/15 to-green-500/15 text-blue-600 dark:text-blue-400"
          : "bg-secondary text-muted-foreground"
      }`}
    >
      {initial}
    </span>
  );

  return (
    <li className="rounded-xl border border-border/40 bg-background/60 p-4">
      <div className="flex items-start gap-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{review.authorName}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <GoogleStars rating={review.rating} />
            {review.relativeTime && (
              <span className="text-xs text-muted-foreground">{review.relativeTime}</span>
            )}
          </div>
        </div>
        <Quote className="w-4 h-4 shrink-0 text-muted-foreground/30" aria-hidden />
      </div>
      {review.text && (
        <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-foreground/90">
          {review.text}
        </p>
      )}
    </li>
  );
}

function testimonialToReview(t: GoogleTestimonial): GoogleReview {
  return {
    id: t.id,
    authorName: t.authorName,
    rating: t.rating,
    text: t.comment,
    relativeTime: t.relativeTime,
  };
}

/**
 * The Google block inside "Customer Reviews".
 * - `data`: live shop rating from Places API (rating/count always free).
 * - `pinned`: admin-curated top reviews (used when the API does not return
 *   review texts, i.e. without Places billing).
 */
export const GoogleReviewsCard = memo(function GoogleReviewsCard({
  data,
  pinned = [],
}: {
  data?: GooglePlaceReviews | null;
  pinned?: GoogleTestimonial[];
}) {
  const hasLiveSummary = Boolean(data);
  const liveReviews = data?.reviews ?? [];
  const items: Array<GoogleReview & { curated?: boolean }> =
    liveReviews.length > 0 ? liveReviews : pinned.map(testimonialToReview);
  const showingCurated = liveReviews.length === 0;

  if (!hasLiveSummary && items.length === 0) return null;

  const mapsUrl = data?.mapsUrl || GOOGLE_MAPS_URL_FALLBACK;

  return (
    <div className="mb-4 rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <GoogleLogo />
          Google Reviews
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          View all on Google
          <ExternalLink className="w-3.5 h-3.5" aria-hidden />
        </a>
      </div>

      {data && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-3xl font-extrabold tabular-nums leading-none text-foreground">
            {data.rating > 0 ? data.rating.toFixed(1) : "—"}
          </span>
          <GoogleStars rating={data.rating} />
          <span className="text-xs text-muted-foreground">
            {data.totalReviews.toLocaleString("en-IN")} review{data.totalReviews === 1 ? "" : "s"} ·{" "}
            {data.placeName}
          </span>
        </div>
      )}

      {items.length > 0 && (
        <>
          {hasLiveSummary && <hr className="my-4 border-border/50" />}
          {!hasLiveSummary && (
            <p className="mb-3 mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
              Top reviews
            </p>
          )}
          <ul className="space-y-3">
            {items.map((r) => (
              <ReviewItem key={r.id} review={r} curated={showingCurated} />
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground/70">
            {showingCurated
              ? "Hand-picked reviews from our Google profile."
              : "Reviews sourced from Google Maps."}
          </p>
        </>
      )}
    </div>
  );
});
