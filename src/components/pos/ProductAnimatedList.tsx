import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { type MenuItem } from "@/data/menu";
import { Plus, Minus } from "lucide-react";

interface ProductItemProps {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  index: number;
}

function ProductItem({ item, quantity, onAdd, onRemove, index }: ProductItemProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = "/placeholder.svg";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="w-full"
    >
      <figure
        className={cn(
          "relative mx-auto min-h-fit w-full max-w-[350px] cursor-pointer overflow-hidden rounded-xl p-3",
          "transition-all duration-200 ease-in-out hover:scale-[102%]",
          "bg-white dark:bg-gray-800",
          "[box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_4px_12px_rgba(0,0,0,.05)]",
          "dark:[box-shadow:0_-10px_40px_-15px_#ffffff1f_inset] dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)]"
        )}
      >
        <div className="flex flex-row items-center gap-3">
          {/* Product Image - Left */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
                onError={handleImageError}
                loading="lazy"
              />
            </div>
          </div>

          {/* Product Info - Middle */}
          <div className="flex-1 min-w-0">
            <figcaption className="flex flex-col">
              <span className="text-sm font-semibold truncate text-foreground dark:text-white">
                {item.name}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {item.category}
              </span>
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400 mt-0.5">
                ₹{item.price}
              </span>
            </figcaption>
          </div>

          {/* Quantity Controls - Right */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {quantity === 0 ? (
              <button
                onClick={onAdd}
                className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  onClick={onRemove}
                  className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 text-muted-foreground dark:text-gray-400" />
                </button>
                <span className="w-6 text-center text-sm font-bold text-foreground dark:text-white">
                  {quantity}
                </span>
                <button
                  onClick={onAdd}
                  className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </figure>
    </motion.div>
  );
}

interface ProductAnimatedListProps {
  products: MenuItem[];
  onAddToCart: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, qty: number) => void;
  cartItems: { item: MenuItem; quantity: number }[];
}

export function ProductAnimatedList({
  products,
  onAddToCart,
  onUpdateQuantity,
  cartItems,
}: ProductAnimatedListProps) {
  const getQuantity = useCallback(
    (itemId: string) => {
      const cartItem = cartItems.find((ci) => ci.item.id === itemId);
      return cartItem?.quantity || 0;
    },
    [cartItems]
  );

  const handleAdd = useCallback(
    (item: MenuItem) => {
      onAddToCart(item);
    },
    [onAddToCart]
  );

  const handleRemove = useCallback(
    (item: MenuItem) => {
      const qty = getQuantity(item.id);
      if (qty > 0) {
        onUpdateQuantity(item.id, qty - 1);
      }
    },
    [getQuantity, onUpdateQuantity]
  );

  if (products.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        <p>No products found</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[400px] py-2",
        "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
      )}
    >
      {products.map((item, idx) => (
        <ProductItem
          key={item.id}
          item={item}
          quantity={getQuantity(item.id)}
          onAdd={() => handleAdd(item)}
          onRemove={() => handleRemove(item)}
          index={idx}
        />
      ))}
    </div>
  );
}
