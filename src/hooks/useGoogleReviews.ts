import { useEffect, useState } from "react";
import {
  fetchGoogleReviews,
  isGoogleReviewsConfigured,
  type GooglePlaceReviews,
} from "@/lib/googleReviews";

type GoogleReviewsStatus = "unconfigured" | "loading" | "ready" | "error";

export function useGoogleReviews() {
  const [status, setStatus] = useState<GoogleReviewsStatus>(() =>
    isGoogleReviewsConfigured() ? "loading" : "unconfigured",
  );
  const [data, setData] = useState<GooglePlaceReviews | null>(null);

  useEffect(() => {
    let active = true;
    if (!isGoogleReviewsConfigured()) {
      setStatus("unconfigured");
      return;
    }
    setStatus("loading");
    fetchGoogleReviews().then((result) => {
      if (!active) return;
      if (result.ok) {
        setData(result.data);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { status, data };
}
