import { useCallback, useEffect, useState } from "react";
import { fetchGoogleTestimonials, type GoogleTestimonial } from "@/lib/googleTestimonialsApi";

/**
 * Loads the admin-curated Google reviews with a module-level cache so every
 * product page shares one fetch per session.
 */
const cache: GoogleTestimonial[] = [];

export function useGoogleTestimonials() {
  const [testimonials, setTestimonials] = useState<GoogleTestimonial[]>(cache);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { testimonials: next } = await fetchGoogleTestimonials();
    if (next.length > 0) {
      cache.length = 0;
      cache.push(...next);
    }
    setTestimonials(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { testimonials, loading, refresh };
}
