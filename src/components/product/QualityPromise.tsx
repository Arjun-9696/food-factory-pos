import { memo } from "react";
import { Leaf, ChefHat, Flame, Award } from "lucide-react";

const PROMISES = [
  {
    icon: Leaf,
    title: "100% Veg",
    description: "Every product is prepared as a vegetarian offering.",
  },
  {
    icon: ChefHat,
    title: "In-House Made",
    description: "Our buns, patties and selected components are prepared in-house.",
  },
  {
    icon: Flame,
    title: "Freshly Prepared",
    description: "Orders are prepared fresh for every customer.",
  },
  {
    icon: Award,
    title: "Quality Ingredients",
    description: "We focus on freshness, flavour and consistent quality.",
  },
];

export const QualityPromise = memo(function QualityPromise() {
  return (
    <section aria-labelledby="quality-heading" className="scroll-mt-24">
      <h2 id="quality-heading" className="mb-1.5 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" aria-hidden />
        Made With Care. Served With Quality.
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">The Food Factory promise, in every order.</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PROMISES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="rounded-2xl border border-border/60 bg-card p-4 transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-950/60 dark:to-amber-950/40">
              <Icon className="w-5 h-5 text-orange-600 dark:text-orange-400" aria-hidden />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
});
