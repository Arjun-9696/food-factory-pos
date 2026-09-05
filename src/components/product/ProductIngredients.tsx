import { memo } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ProductIngredientsProps {
  ingredients: string[] | undefined;
}

export const ProductIngredients = memo(function ProductIngredients({ ingredients }: ProductIngredientsProps) {
  if (!ingredients || ingredients.length === 0) return null;

  return (
    <section aria-labelledby="ingredients-heading" className="scroll-mt-24">
      <h2 id="ingredients-heading" className="mb-4 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" aria-hidden />
        What's Inside
      </h2>

      <Accordion type="single" collapsible defaultValue="ingredients" className="rounded-2xl border border-border/60 bg-card shadow-sm">
        <AccordionItem value="ingredients" className="border-none">
          <AccordionTrigger className="px-5 py-4 text-sm font-semibold text-foreground hover:no-underline">
            {ingredients.length} fresh components
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5 pt-0">
            <ul className="flex flex-wrap gap-2" aria-label="Ingredients">
              {ingredients.map((ing, i) => (
                <li
                  key={`${ing}-${i}`}
                  className="rounded-lg border border-border/50 bg-secondary/50 px-3 py-1.5 text-xs font-medium text-foreground/90"
                >
                  {ing}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
});
