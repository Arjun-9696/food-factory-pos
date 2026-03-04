"use client"

import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedList } from "@/components/magicui/animated-list";
import { type MenuItem } from "@/data/menu";
import { Search, X, Plus, Minus } from "lucide-react";

interface SearchResultItemProps {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}

function SearchResultItem({ item, quantity, onAdd, onRemove }: SearchResultItemProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    (e.target as HTMLImageElement).src = "/placeholder.svg";
  };

  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-2xl p-3",
        "transition-all duration-200 ease-in-out hover:scale-[103%]",
        "bg-white dark:bg-gray-800",
        "[box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        "transform-gpu dark:bg-transparent dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)]"
      )}
    >
      <div className="flex flex-row items-center gap-3">
        {/* Product Image */}
        <div className="flex-shrink-0">
          <div 
            className="flex size-12 items-center justify-center rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={handleImageError}
              loading="lazy"
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="flex flex-col overflow-hidden flex-1">
          <figcaption className="flex flex-row items-center text-sm font-medium whitespace-pre dark:text-white">
            <span className="text-sm sm:text-base truncate">{item.name}</span>
          </figcaption>
          <p className="text-xs text-muted-foreground truncate">
            {item.category}
          </p>
          <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
            ₹{item.price}
          </p>
        </div>

        {/* Quantity Controls */}
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
                <Minus className="w-3.5 h-3.5 text-foreground dark:text-white" />
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
  );
}

interface MobileSearchResultsProps {
  query: string;
  products: MenuItem[];
  cartItems: { item: MenuItem; quantity: number }[];
  onAddToCart: (item: MenuItem) => void;
  onUpdateQuantity: (itemId: string, qty: number) => void;
  onClose: () => void;
}

export function MobileSearchResults({
  query,
  products,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onClose,
}: MobileSearchResultsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const searchLower = query.toLowerCase().trim();
    return products.filter((item) =>
      item.name.toLowerCase().includes(searchLower) ||
      item.category.toLowerCase().includes(searchLower)
    );
  }, [query, products]);

  const getQuantity = (itemId: string) => {
    const cartItem = cartItems.find((ci) => ci.item.id === itemId);
    return cartItem?.quantity || 0;
  };

  if (!query.trim()) return null;

  return (
    <div 
      ref={containerRef}
      className="relative flex flex-col overflow-hidden p-2"
    >
      {/* Results count */}
      <div className="flex items-center justify-between px-2 py-1 mb-1">
        <span className="text-xs text-muted-foreground">
          {searchResults.length} results found
        </span>
        <button 
          onClick={onClose}
          className="text-xs text-orange-500 hover:text-orange-600 font-medium"
        >
          Clear
        </button>
      </div>

      {/* Animated List */}
      {searchResults.length > 0 ? (
        <AnimatedList>
          {searchResults.map((item, idx) => (
            <SearchResultItem
              key={`${item.id}-${idx}`}
              item={item}
              quantity={getQuantity(item.id)}
              onAdd={() => onAddToCart(item)}
              onRemove={() => {
                const qty = getQuantity(item.id);
                if (qty > 0) onUpdateQuantity(item.id, qty - 1);
              }}
            />
          ))}
        </AnimatedList>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Search className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">No items found for "{query}"</p>
        </div>
      )}

      {/* Gradient fade at bottom */}
      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t" />
    </div>
  );
}
