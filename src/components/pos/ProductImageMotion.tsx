import { type MenuItem } from "@/data/menu";

interface ProductImageMotionProps {
  item: MenuItem;
  children: React.ReactNode;
}

export function ProductImageMotion({ item, children }: ProductImageMotionProps) {
  return (
    <div className="relative overflow-hidden">
      {children}
    </div>
  );
}
