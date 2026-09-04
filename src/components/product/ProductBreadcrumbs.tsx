import { memo } from "react";
import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface ProductBreadcrumbsProps {
  category: string;
  productName: string;
}

export const ProductBreadcrumbs = memo(function ProductBreadcrumbs({ category, productName }: ProductBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="py-3 overflow-x-auto scrollbar-hide">
      <ol className="flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground">
        <li>
          <Link
            to="/"
            className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:text-foreground transition-colors"
          >
            <Home className="w-3.5 h-3.5" aria-hidden />
            <span>Home</span>
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        </li>
        <li>
          <Link
            to={`/?category=${encodeURIComponent(category)}`}
            className="rounded-md px-1 py-0.5 hover:text-foreground transition-colors"
          >
            {category}
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        </li>
        <li>
          <span aria-current="page" className="px-1 py-0.5 font-medium text-foreground">
            {productName}
          </span>
        </li>
      </ol>
    </nav>
  );
});
