import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { type MenuItem } from "@/data/menu";
import { loadAllProducts, findProductBySlug } from "@/lib/productsApi";
import { productSlug } from "@/lib/slug";
import { summarizeReviews } from "@/lib/reviewsApi";
import { useCart } from "@/context/CartContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useProductReviews } from "@/hooks/useProductReviews";
import { useSeo } from "@/hooks/useSeo";
import { toast } from "sonner";
import { CartDrawer } from "@/components/pos/CartDrawer";
import { POSHeader } from "@/components/pos/POSHeader";
import { MobileNav } from "@/components/pos/MobileNav";
import { CartFAB } from "@/components/pos/CartFAB";

import { ProductBreadcrumbs } from "@/components/product/ProductBreadcrumbs";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import { ProductIngredients } from "@/components/product/ProductIngredients";
import { ProductNutrition } from "@/components/product/ProductNutrition";
import { ProductDietaryInfo } from "@/components/product/ProductDietaryInfo";
import { QualityPromise } from "@/components/product/QualityPromise";
import { ProductReviews } from "@/components/product/ProductReviews";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { recordRecentlyViewed } from "@/lib/recentlyViewed";
import { StickyMobileCTA } from "@/components/product/StickyMobileCTA";
import { ProductSkeleton } from "@/components/product/ProductSkeleton";
import { ProductErrorState, ProductNotFoundState } from "@/components/product/ProductErrorState";
import { getGalleryImages } from "@/components/product/helpers";
import { getOptimizedImageUrl } from "@/lib/uploadImage";

type LoadStatus = "loading" | "ready" | "not-found" | "error";

const SITE_NAME = "Food Factory – The Quality Taste";

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem, updateQuantity, items: cartItems } = useCart();
  const [isDark, toggleDark] = useDarkMode();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [product, setProduct] = useState<MenuItem | null>(null);
  const [allProducts, setAllProducts] = useState<MenuItem[]>([]);
  // Quantity shown = live cart quantity when the item is already in the cart,
  // otherwise a local "pending" quantity for the first add.
  const [pendingQty, setPendingQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const ctaSentinelRef = useRef<HTMLDivElement>(null);
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const productId = product?.id;
  const { reviews, loading: reviewsLoading, refresh: refreshReviews } = useProductReviews(productId);
  const reviewSummary = useMemo(
    () => (reviews.length > 0 ? summarizeReviews(reviews) : undefined),
    [reviews]
  );

  // ---- Load product (shared cached loader — no duplicate network calls) ----
  const load = useCallback(() => {
    setStatus("loading");
    setPendingQty(1);
    setAdded(false);
    loadAllProducts()
      .then(({ items }) => {
        const found = findProductBySlug(items, slug || "");
        setAllProducts(items);
        if (found) {
          setProduct(found);
          setStatus("ready");
        } else {
          setStatus("not-found");
        }
      })
      .catch(() => setStatus("error"));
  }, [slug]);

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    };
  }, [load]);

  // Canonical URL: redirect /product/<id> to the readable slug.
  useEffect(() => {
    if (status === "ready" && product && slug !== productSlug(product.name, product.id)) {
      navigate(`/product/${productSlug(product.name, product.id)}`, { replace: true });
    }
  }, [status, product, slug, navigate]);

  // Record in recently viewed (once per product view).
  useEffect(() => {
    if (status === "ready" && product) {
      recordRecentlyViewed({
        slug: productSlug(product.name, product.id),
        name: product.name,
        image: product.image,
        price: product.price,
        category: product.category,
        ts: Date.now(),
      });
    }
  }, [status, product]);

  // ---- SEO: title, meta, canonical, structured data ----
  const canonicalPath = product ? `/product/${productSlug(product.name, product.id)}` : undefined;
  const heroImage = useMemo(
    () => (product && getGalleryImages(product)[0]) || undefined,
    [product]
  );

  const jsonLd = useMemo(() => {
    if (!product) return undefined;
    const url = `${window.location.origin}/product/${productSlug(product.name, product.id)}`;
    const images = getGalleryImages(product);

    const productSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.details?.shortDescription || product.description || undefined,
      image: images.map((src) => (src.startsWith("http") ? src : `${window.location.origin}${src}`)),
      category: product.category,
      brand: { "@type": "Brand", name: "Food Factory" },
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "INR",
        price: product.price,
        availability:
          product.available === false
            ? "https://schema.org/OutOfStock"
            : "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
      },
    };
    // AggregateRating only when real review data exists (customer reviews first,
    // then admin-entered details as fallback).
    const ratingCount =
      reviewSummary && reviewSummary.count > 0
        ? reviewSummary.count
        : typeof product.details?.reviewCount === "number"
          ? product.details.reviewCount
          : 0;
    const ratingValue =
      reviewSummary && reviewSummary.count > 0
        ? reviewSummary.average
        : typeof product.details?.rating === "number"
          ? product.details.rating
          : 0;
    if (ratingCount > 0 && ratingValue > 0) {
      productSchema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Math.round(ratingValue * 10) / 10,
        reviewCount: ratingCount,
      };
    }

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${window.location.origin}/` },
        {
          "@type": "ListItem",
          position: 2,
          name: product.category,
          item: `${window.location.origin}/?category=${encodeURIComponent(product.category)}`,
        },
        { "@type": "ListItem", position: 3, name: product.name, item: url },
      ],
    };

    return [productSchema, breadcrumbSchema];
  }, [product, reviewSummary]);

  const metaDescription = product
    ? (() => {
        const base =
          product.details?.shortDescription ||
          product.description ||
          `Order ${product.name} from Food Factory – The Quality Taste.`;
        const veg = product.foodType === "veg" ? " 100% vegetarian," : "";
        return `${base}${base.endsWith(".") ? "" : "."}${veg} freshly prepared and made with quality ingredients.`;
      })()
    : "Browse the Food Factory menu — fresh, handcrafted food made with quality ingredients.";

  useSeo({
    title: product ? `${product.name} | Food Factory` : `Menu | ${SITE_NAME}`,
    description: metaDescription,
    canonicalPath,
    ogImage: heroImage,
    jsonLd,
  });

  // Preload hero image for a fast LCP.
  useEffect(() => {
    if (!heroImage) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = getOptimizedImageUrl(heroImage, 800);
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [heroImage]);

  // ---- Quantity stays in sync with the cart (two-way) ----
  const cartQty = product ? cartItems.find((i) => i.item.id === product.id)?.quantity ?? 0 : 0;
  const quantity = cartQty > 0 ? cartQty : pendingQty;

  // When the item leaves the cart (removed / qty dropped to 0 elsewhere),
  // reset the pending quantity for a clean first-add experience.
  const prevCartQtyRef = useRef(0);
  useEffect(() => {
    if (prevCartQtyRef.current > 0 && cartQty === 0) setPendingQty(1);
    prevCartQtyRef.current = cartQty;
  }, [cartQty]);

  const handleQuantityChange = useCallback(
    (q: number) => {
      if (!product) return;
      if (cartQty > 0) updateQuantity(product.id, q);
      else setPendingQty(q);
    },
    [product, cartQty, updateQuantity]
  );

  // ---- Add to cart: instant local update via shared cart store ----
  const handleAdd = useCallback(() => {
    if (!product || product.available === false) return;
    if (cartQty > 0) {
      // Already in the cart — the stepper edits the live quantity, this confirms it.
      updateQuantity(product.id, quantity);
      toast.success(`${product.name} cart updated`, { duration: 2000 });
    } else {
      addItem(product, quantity);
      toast.success(`${product.name} added to cart`, { duration: 2000 });
    }
    setAdded(true);
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current);
    addedTimerRef.current = setTimeout(() => setAdded(false), 1600);
  }, [product, quantity, cartQty, addItem, updateQuantity]);

  const ctaState = product?.available === false ? ("unavailable" as const) : added ? ("added" as const) : ("idle" as const);
  const totalLabel = product ? `₹${(product.price * quantity).toLocaleString("en-IN")}` : "";

  // ---- Shared chrome: same navbar as the home screen (search hidden here) ----
  const pageHeader = (
    <POSHeader
      searchQuery=""
      onSearchChange={() => {}}
      isDark={isDark}
      onToggleDark={toggleDark}
      showSearch={false}
    />
  );
  const mobileBottomNav = <MobileNav onCartClick={() => setCartOpen(true)} />;

  // ---- States ----
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        {pageHeader}
        <main className="mx-auto max-w-6xl px-4 pb-24">
          <ProductSkeleton />
        </main>
        {mobileBottomNav}
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background">
        {pageHeader}
        <main className="mx-auto max-w-6xl px-4">
          <ProductErrorState onRetry={load} />
        </main>
        {mobileBottomNav}
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </div>
    );
  }

  if (status === "not-found" || !product) {
    return (
      <div className="min-h-screen bg-background">
        {pageHeader}
        <main className="mx-auto max-w-6xl px-4">
          <ProductNotFoundState />
        </main>
        {mobileBottomNav}
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </div>
    );
  }

  const d = product.details;

  // ---- Ready ----
  return (
    <div className="min-h-screen bg-background">
      {pageHeader}

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-1 md:pb-20">
        <ProductBreadcrumbs category={product.category} productName={product.name} />

        {/* Hero: image left / info right on desktop; stacked image-first on mobile */}
        <section className="grid gap-8 lg:grid-cols-[55%_45%] lg:gap-12">
          <div className="animate-fade-in">
            <ProductGallery product={product} />
          </div>

          <div className="animate-fade-in">
            <ProductInfo
              product={product}
              quantity={quantity}
              onQuantityChange={handleQuantityChange}
              ctaState={ctaState}
              onAdd={handleAdd}
              reviewSummary={reviewSummary}
              inCart={cartQty > 0}
            />
            {/* Sentinel tracks whether the main CTA is still on screen */}
            <div ref={ctaSentinelRef} aria-hidden className="h-px" />
          </div>
        </section>

        {/* Details */}
        <div className="mt-14 space-y-12 md:space-y-14">
          {(d?.ingredients?.length || d?.nutrition) && (
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              {d?.ingredients?.length ? <ProductIngredients ingredients={d.ingredients} /> : null}
              <ProductNutrition nutrition={d?.nutrition} />
            </div>
          )}

          <ProductDietaryInfo product={product} />

          <QualityPromise />

          <ProductReviews
            product={product}
            reviews={reviews}
            loading={reviewsLoading}
            onRefresh={refreshReviews}
          />

          <RelatedProducts product={product} allProducts={allProducts} />

          <RecentlyViewed currentSlug={slug || ""} />
        </div>
      </main>

      {/* Mobile sticky purchase bar — same cart action, different surface.
          Sits above the mobile bottom nav. */}
      <StickyMobileCTA
        sentinelRef={ctaSentinelRef}
        quantity={quantity}
        onQuantityChange={handleQuantityChange}
        state={ctaState}
        onAdd={handleAdd}
        totalLabel={totalLabel}
        inCart={cartQty > 0}
      />

      {/* Cart access mirrors the home screen: floating button on desktop,
          centre cart button in the bottom nav on mobile. */}
      {cartQty > 0 && (
        <div className="hidden md:block">
          <CartFAB onClick={() => setCartOpen(true)} />
        </div>
      )}
      {mobileBottomNav}

      {/* Screen-reader announcement for cart feedback */}
      <div aria-live="polite" role="status" className="sr-only">
        {added ? `${product.name} added to cart` : ""}
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
