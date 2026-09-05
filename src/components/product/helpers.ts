import { type MenuItem, type ProductDetails } from "@/data/menu";

export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function getGalleryImages(product: MenuItem): string[] {
  const extra = (product.details?.images || []).filter(Boolean);
  const all = [product.image, ...extra].filter(Boolean);
  return Array.from(new Set(all));
}

export interface DerivedBadge {
  id: string;
  emoji: string;
  label: string;
}

/** Only badges that are actually true for this product — never assumed. */
export function deriveBadges(product: MenuItem, reviewSummary?: { average: number; count: number }): DerivedBadge[] {
  const d: ProductDetails | undefined = product.details;
  const badges: DerivedBadge[] = [];

  if (product.foodType === "veg") {
    badges.push({ id: "veg", emoji: "🌱", label: "100% Vegetarian" });
  }
  if (d?.isInHouseMade) {
    badges.push({ id: "inhouse", emoji: "🏠", label: "100% In-House Made" });
  }
  // "Most loved" is earned from real customer ratings only.
  if (reviewSummary && reviewSummary.count >= 3 && reviewSummary.average >= 4) {
    badges.push({
      id: "most-loved",
      emoji: "🔥",
      label: `Most Loved · ${reviewSummary.average.toFixed(1)}★ (${reviewSummary.count})`,
    });
  } else if (d?.isBestseller) {
    badges.push({ id: "bestseller", emoji: "⭐", label: "Customer Favourite" });
  }
  if (d?.spiceLevel === "spicy") {
    badges.push({ id: "spicy", emoji: "🔥", label: "Spicy" });
  } else if (d?.spiceLevel === "medium") {
    badges.push({ id: "medium", emoji: "🌶️", label: "Medium Spice" });
  } else if (d?.spiceLevel === "mild") {
    badges.push({ id: "mild", emoji: "🌿", label: "Mild" });
  }
  if (d?.prepTimeMinutes) {
    badges.push({ id: "fresh", emoji: "👨‍🍳", label: `Made Fresh in ${d.prepTimeMinutes} min` });
  }
  return badges;
}

export function hasDiscount(product: MenuItem): boolean {
  const compareAt = product.details?.compareAtPrice;
  return typeof compareAt === "number" && compareAt > product.price;
}
