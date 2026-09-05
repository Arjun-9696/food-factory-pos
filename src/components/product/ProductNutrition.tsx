import { memo } from "react";
import { Flame, Wheat, Droplet, Candy } from "lucide-react";
import type { NutritionInfo } from "@/data/menu";

interface ProductNutritionProps {
  nutrition: NutritionInfo | undefined;
}

export const ProductNutrition = memo(function ProductNutrition({ nutrition }: ProductNutritionProps) {
  const hasAny =
    nutrition &&
    [nutrition.calories, nutrition.protein, nutrition.carbs, nutrition.fat].some(
      (v) => typeof v === "number" && v > 0
    );

  return (
    <section aria-labelledby="nutrition-heading" className="scroll-mt-24">
      <h2 id="nutrition-heading" className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" aria-hidden />
        Nutrition {nutrition?.servingLabel ? <span className="text-sm font-medium text-muted-foreground">({nutrition.servingLabel})</span> : null}
      </h2>

      {!hasAny ? (
        <p className="rounded-2xl border border-dashed border-border/70 bg-secondary/40 px-4 py-6 text-center text-sm text-muted-foreground">
          Nutritional information coming soon.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {typeof nutrition!.calories === "number" && (
            <NutrientCard
              icon={<Flame className="w-4 h-4 text-orange-500" aria-hidden />}
              label="Calories"
              value={`${nutrition!.calories}`}
              unit="kcal"
              highlight
            />
          )}
          {typeof nutrition!.protein === "number" && (
            <NutrientCard
              icon={<Wheat className="w-4 h-4 text-blue-500" aria-hidden />}
              label="Protein"
              value={`${nutrition!.protein}`}
              unit="g"
            />
          )}
          {typeof nutrition!.carbs === "number" && (
            <NutrientCard
              icon={<Candy className="w-4 h-4 text-amber-500" aria-hidden />}
              label="Carbs"
              value={`${nutrition!.carbs}`}
              unit="g"
            />
          )}
          {typeof nutrition!.fat === "number" && (
            <NutrientCard
              icon={<Droplet className="w-4 h-4 text-rose-500" aria-hidden />}
              label="Fat"
              value={`${nutrition!.fat}`}
              unit="g"
            />
          )}
        </div>
      )}
    </section>
  );
});

function NutrientCard({ icon, label, value, unit, highlight = false }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 text-center transition-shadow hover:shadow-md ${
        highlight
          ? "border-orange-200 bg-gradient-to-b from-orange-50 to-amber-50/60 dark:border-orange-900/50 dark:from-orange-950/30 dark:to-amber-950/20"
          : "border-border/60 bg-card"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="text-xl font-extrabold tabular-nums text-foreground">
        {value}
        <span className="ml-0.5 text-xs font-semibold text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}
