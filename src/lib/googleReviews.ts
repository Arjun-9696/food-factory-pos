export interface GoogleReview {
  id: string;
  authorName: string;
  authorPhoto?: string;
  authorProfileUrl?: string;
  rating: number;
  text: string;
  relativeTime: string;
}

export interface GooglePlaceReviews {
  placeId: string;
  placeName: string;
  rating: number;
  totalReviews: number;
  mapsUrl: string;
  reviews: GoogleReview[];
}

export type GoogleReviewsResult =
  | { ok: true; data: GooglePlaceReviews }
  | { ok: false; error: string };

export const GOOGLE_MAPS_URL_FALLBACK =
  "https://www.google.com/maps/place/Food+Factory+-+The+Quality+Taste/@12.8896366,77.598447,932m/data=!3m1!1e3!4m8!3m7!1s0x3bae153e67ac16a1:0xec573c6b7d506e7b!8m2!3d12.8896366!4d77.6010219!9m1!1b1!16s%2Fg%2F11n4dgz5mq";

const PLACE_ID = import.meta.env.VITE_GOOGLE_PLACE_ID ?? "";
const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY ?? "";

const FIELD_MASK = [
  "id",
  "displayName",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "reviews.rating",
  "reviews.text",
  "reviews.originalText",
  "reviews.authorAttribution",
  "reviews.relativePublishTimeDescription",
].join(",");

interface RawPlaceDoc {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: Array<{
    name?: string;
    rating?: number;
    relativePublishTimeDescription?: string;
    text?: { text?: string };
    originalText?: { text?: string };
    authorAttribution?: { displayName?: string; uri?: string; photoUri?: string };
  }>;
}

function mapReview(raw: NonNullable<RawPlaceDoc["reviews"]>[number], index: number): GoogleReview {
  return {
    id: raw.name ?? `google-review-${index}`,
    authorName: raw.authorAttribution?.displayName || "Google user",
    authorPhoto: raw.authorAttribution?.photoUri,
    authorProfileUrl: raw.authorAttribution?.uri,
    rating: Math.min(5, Math.max(1, Math.round(raw.rating ?? 0))) || 5,
    text: raw.text?.text || raw.originalText?.text || "",
    relativeTime: raw.relativePublishTimeDescription || "",
  };
}

/** True when VITE_GOOGLE_PLACE_ID and VITE_GOOGLE_PLACES_API_KEY are both set. */
export function isGoogleReviewsConfigured(): boolean {
  return Boolean(PLACE_ID && API_KEY);
}

let cached: GoogleReviewsResult | null = null;

async function request(): Promise<GoogleReviewsResult> {
  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE_ID)}?languageCode=en`,
      {
        headers: {
          "X-Goog-Api-Key": API_KEY,
          "X-Goog-FieldMask": FIELD_MASK,
        },
      },
    );
    if (!res.ok) {
      return { ok: false, error: `Places API responded with HTTP ${res.status}` };
    }
    const doc = (await res.json()) as RawPlaceDoc;
    if (!doc.id) {
      return { ok: false, error: "Place not found — check VITE_GOOGLE_PLACE_ID" };
    }
    const reviews = (doc.reviews ?? []).map(mapReview);
    const data: GooglePlaceReviews = {
      placeId: doc.id,
      placeName: doc.displayName?.text || "Food Factory - The Quality Taste",
      rating: doc.rating ?? 0,
      totalReviews: doc.userRatingCount ?? reviews.length,
      mapsUrl: doc.googleMapsUri || GOOGLE_MAPS_URL_FALLBACK,
      reviews,
    };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Fetch the shop's live Google Maps rating + reviews via Places API (New).
 * Successful results are cached for the session so repeated product visits
 * don't burn API quota. Failures are not cached, allowing a retry on next mount.
 */
export async function fetchGoogleReviews(): Promise<GoogleReviewsResult> {
  if (!isGoogleReviewsConfigured()) {
    return { ok: false, error: "not-configured" };
  }
  if (cached?.ok) {
    return cached;
  }
  const result = await request();
  if (result.ok) {
    cached = result;
  }
  return result;
}
