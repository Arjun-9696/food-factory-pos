import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

interface CartFABProps {
  onClick: () => void;
}

export function CartFAB({ onClick }: CartFABProps) {
  const { totalItems, grandTotal } = useCart();

  if (totalItems === 0) return null;

  return (
    <button onClick={onClick} className="cart-fab">
      <ShoppingCart className="w-5 h-5" />
      <span className="font-bold">{totalItems}</span>
      <span className="text-primary-foreground/70">|</span>
      <span className="font-bold">₹{grandTotal}</span>
    </button>
  );
}
