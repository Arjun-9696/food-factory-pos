import { memo } from "react";
import { Leaf, Milk, Wheat, Nut, Flame, Sprout, Egg } from "lucide-react";
import type { MenuItem } from "@/data/menu";

interface ProductDietaryInfoProps {
  product: MenuItem;
}

export const ProductDietaryInfo = memo(function ProductDietaryInfo({ product }: ProductDietaryInfoProps) {
  const d = product.details;
  if (!d) return null;

  const items: Array<{ icon: React.ReactNode; label: string; tone: string }> = [];

  if (d.isVegan) {
    items.push({
      icon: <Sprout className="w-4 h-4" aria-hidden />,
      label: "Vegan",
      tone: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    });
  }
  if (product.foodType === "veg") {
    items.push({
      icon: <Leaf className="w-4 h-4" aria-hidden />,
      label: "100% Vegetarian",
      tone: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    });
  }
  if (product.foodType === "egg") {
    items.push({
      icon: <Egg className="w-4 h-4" aria-hidden />,
      label: "Contains Egg",
      tone: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    });
  }
  if (d.containsDairy) {
    items.push({
      icon: <Milk className="w-4 h-4" aria-hidden />,
      label: "Contains Dairy",
      tone: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    });
  }
  if (d.containsGluten) {
    items.push({
      icon: <Wheat className="w-4 h-4" aria-hidden />,
      label: "Contains Gluten",
      tone: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    });
  }
  if (d.containsNuts) {
    items.push({
      icon: <Nut className="w-4 h-4" aria-hidden />,
      label: "Contains Nuts",
      tone: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
    });
  }
  if (d.isJainFriendly) {
    items.push({
      icon: <Leaf className="w-4 h-4" aria-hidden />,
      label: "Jain-friendly",
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    });
  }
  if (d.spiceLevel) {
    items.push({
      icon: <Flame className="w-4 h-4" aria-hidden />,
      label: `Spice level: ${d.spiceLevel}`,
      tone: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    });
  }

  // Hide when the only info is the veg marker already shown in the badges.
  const hasExtra =
    !!d.isVegan || !!d.containsDairy || !!d.containsGluten || !!d.containsNuts ||
    !!d.isJainFriendly || !!d.spiceLevel || product.foodType === "egg";
  if (items.length === 0 || !hasExtra) {
    return null;
  }

  return (
    <section aria-labelledby="dietary-heading" className="scroll-mt-24">
      <h2 id="dietary-heading" className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" aria-hidden />
        Food Information
      </h2>
      <ul className="flex flex-wrap gap-2.5">
        {items.map((item) => (
          <li
            key={item.label}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold ${item.tone}`}
          >
            {item.icon}
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
});
