import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Lens } from "@/components/ui/lens";
import { getOptimizedImageUrl } from "@/lib/uploadImage";
import type { MenuItem } from "@/data/menu";
import { getGalleryImages } from "./helpers";

interface ProductGalleryProps {
  product: MenuItem;
}

export function ProductGallery({ product }: ProductGalleryProps) {
  const images = getGalleryImages(product);
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const heroRef = useRef<HTMLImageElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Reset selection when product changes.
  useEffect(() => {
    setIndex(0);
  }, [product.id]);

  const count = images.length;
  const go = useCallback(
    (dir: 1 | -1) => setIndex((i) => (i + dir + count) % count),
    [count]
  );

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, go]);

  if (count === 0) {
    return (
      <div className="aspect-square w-full rounded-2xl bg-muted flex items-center justify-center" aria-hidden>
        <span className="text-6xl">🍽️</span>
      </div>
    );
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 48) go(delta < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  return (
    <div>
      {/* Main image — fixed aspect ratio reserves space, zero layout shift */}
      <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-border/60 bg-muted shadow-sm">
        {/* Mobile / tablet: swipeable snap carousel; desktop: single image with lens zoom */}
        <div
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide md:hidden"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={onTouchEnd}
          aria-roledescription="carousel"
          aria-label={`${product.name} images`}
        >
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              className="h-full w-full flex-shrink-0 snap-center"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Open image ${i + 1} of ${count}`}
            >
              <img
                src={getOptimizedImageUrl(src, 800)}
                alt={i === 0 ? product.name : `${product.name} — image ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                width={800}
                height={800}
                draggable={false}
                className="h-full w-full bg-muted object-contain p-1"
              />
            </button>
          ))}
        </div>

        <div className="hidden h-full w-full md:block">
          <Lens zoomFactor={1.8} lensSize={180} ariaLabel={`Zoom ${product.name}`}>
            <button
              type="button"
              className="block h-full w-full cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
              aria-label="Open full screen image"
            >
              <img
                ref={heroRef}
                src={getOptimizedImageUrl(images[index], 800)}
                alt={index === 0 ? product.name : `${product.name} — image ${index + 1}`}
                loading="eager"
                decoding="async"
                width={800}
                height={800}
                className="h-full w-full bg-muted object-contain p-1 transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              />
            </button>
          </Lens>
        </div>

        {/* Zoom hint (desktop) */}
        <div className="pointer-events-none absolute bottom-3 right-3 hidden items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm md:flex">
          <Expand className="w-3 h-3" aria-hidden />
          Tap to view
        </div>

        {/* Mobile dots */}
        {count > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:hidden" role="tablist" aria-label="Image position">
            {images.map((_, i) => (
              <span
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={`Image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails (desktop) */}
      {count > 1 && (
        <div className="mt-3 hidden gap-2 md:flex" role="listbox" aria-label="Product image thumbnails">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="option"
              aria-selected={i === index}
              aria-label={`View image ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`relative aspect-square w-20 overflow-hidden rounded-xl border-2 transition-all ${
                i === index
                  ? "border-orange-500 shadow-md shadow-orange-500/20"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={getOptimizedImageUrl(src, 200)}
                alt=""
                loading="lazy"
                decoding="async"
                width={80}
                height={80}
                className="h-full w-full bg-muted object-contain"
              />
            </button>
          ))}
        </div>
      )}

      <Lightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        images={images}
        index={index}
        onIndexChange={setIndex}
        productName={product.name}
      />
    </div>
  );
}

interface LightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  productName: string;
}

function Lightbox({ open, onOpenChange, images, index, onIndexChange, productName }: LightboxProps) {
  const count = images.length;
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (dir: 1 | -1) => onIndexChange((index + dir + count) % count),
    [index, count, onIndexChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-none h-[100dvh] w-screen max-h-none rounded-none border-none bg-black/95 p-0 [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">{productName} — full screen image</DialogTitle>

        {/* Click anywhere on the viewer (image or background) closes it */}
        <div
          className="flex h-full w-full items-center justify-center"
          onClick={() => onOpenChange(false)}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const delta = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(delta) > 48 && count > 1) go(delta < 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          <img
            src={getOptimizedImageUrl(images[index], 1200)}
            alt={`${productName} — image ${index + 1}`}
            loading="eager"
            decoding="async"
            className="max-h-[82dvh] w-auto max-w-full object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Close — large, always visible, respects notched screens */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(false);
          }}
          aria-label="Close image viewer"
          className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/25 active:scale-95"
        >
          <X className="w-6 h-6" aria-hidden />
        </button>
        <span className="pointer-events-none absolute right-[4.5rem] top-[max(1.65rem,calc(env(safe-area-inset-top)+0.65rem))] z-10 hidden text-xs font-semibold text-white/80 sm:block">
          Close
        </span>

        {/* Counter */}
        <div className="absolute left-[max(1rem,env(safe-area-inset-left))] top-[max(1.25rem,calc(env(safe-area-inset-top)+0.25rem))] z-10 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {index + 1} / {count}
        </div>

        {/* Prev / next */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
              aria-label="Next image"
              className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <ChevronRight className="w-5 h-5" aria-hidden />
            </button>

            {/* Thumbnails */}
            <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2 px-4" onClick={(e) => e.stopPropagation()}>
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => onIndexChange(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === index}
                  className={`h-14 w-14 overflow-hidden rounded-lg border-2 transition-all ${
                    i === index ? "border-orange-400" : "border-transparent opacity-50 hover:opacity-90"
                  }`}
                >
                  <img src={getOptimizedImageUrl(src, 200)} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
