import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { type MenuItem } from "@/data/menu";
import { ProductCard } from "@/components/pos/ProductCard";
import { productSlug } from "@/lib/slug";

interface RelatedProductsProps {
  product: MenuItem;
  allProducts: MenuItem[];
}

export const RelatedProducts = memo(function RelatedProducts({ product, allProducts }: RelatedProductsProps) {
  const navigate = useNavigate();

  const related = useMemo(() => {
    const sameCategory = allProducts.filter(
      (p) => p.id !== product.id && p.category === product.category && p.available !== false
    );
    const others = allProducts.filter(
      (p) => p.id !== product.id && p.category !== product.category && p.available !== false
    );
    return [...sameCategory, ...others].slice(0, 6);
  }, [product.id, product.category, allProducts]);

  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-heading" className="scroll-mt-24">
      <h2 id="related-heading" className="mb-1.5 flex items-center gap-2.5 text-lg font-bold text-foreground">
        <span className="h-5 w-1 rounded-full bg-gradient-to-b from-orange-500 to-amber-500" aria-hidden />
        You May Also Like
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">Pairs beautifully with your order.</p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
        {related.map((item) => (
          <ProductCard
            key={item.id}
            item={item}
            onOpen={() => navigate(`/product/${productSlug(item.name, item.id)}`)}
          />
        ))}
      </div>
    </section>
  );
});
