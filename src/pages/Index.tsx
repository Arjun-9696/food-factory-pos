import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { CartProvider, useCart } from "@/context/CartContext";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useProducts } from "@/hooks/useProducts";
import { POSHeader } from "@/components/pos/POSHeader";
import { CategoryTabs } from "@/components/pos/CategoryTabs";
import { CategoryDock } from "@/components/pos/CategoryDock";
import { MobileNav } from "@/components/pos/MobileNav";
import { ProductCard } from "@/components/pos/ProductCard";
import { CartDrawer } from "@/components/pos/CartDrawer";
import { CartFAB } from "@/components/pos/CartFAB";
import { ProductSkeleton } from "@/components/pos/ProductSkeleton";
import { Highlighter } from "@/components/magicui/highlighter";
import { Marquee } from "@/components/magicui/marquee";
import { ProductAnimatedList } from "@/components/pos/ProductAnimatedList";
import { MobileSearchResults } from "@/components/pos/MobileSearchResults";
import { FlyToCart, useFlyToCart } from "@/components/pos/FlyToCart";
import { LayoutGrid, List, ArrowUpDown } from "lucide-react";
import { getCategoryEmoji } from "@/data/categories";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BackgroundMedia from "@/components/ui/bg-media";

const ITEMS_PER_PAGE = 8;

type SortOption = "default" | "price-low" | "price-high" | "name-asc" | "name-desc";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function POSContent() {
  const [isDark, toggleDark] = useDarkMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cartOpen, setCartOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { products, categories, categoryEmojis, loading } = useProducts();
  const { totalItems, items: cartItems, addItem, updateQuantity } = useCart();
  const { flyingItems, triggerFlyToCart, removeFlyingItem } = useFlyToCart();
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeCategory]);

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);
    if (searchQuery) {
      setSearchQuery("");
    }
  };

  const filtered = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase().trim();
    let filteredProducts = products.filter((item) => {
      const isSearching = !!searchLower;
      const matchesCategory = !isSearching && (activeCategory === "All" || item.category === activeCategory);
      const matchesSearch = !searchLower || item.name.toLowerCase().includes(searchLower);
      return matchesSearch && (isSearching || matchesCategory);
    });

    // Apply sorting
    switch (sortBy) {
      case "price-low":
        filteredProducts = [...filteredProducts].sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        filteredProducts = [...filteredProducts].sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        filteredProducts = [...filteredProducts].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        filteredProducts = [...filteredProducts].sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }

    return filteredProducts;
  }, [activeCategory, debouncedSearch, products, sortBy]);

  const visibleProducts = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  const hasMore = visibleCount < filtered.length;

  const handleScroll = useCallback(() => {
    if (!isMobile) return;
    
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (scrollTop + windowHeight >= documentHeight - 300) {
      if (!loadingMore && hasMore) {
        setLoadingMore(true);
        setTimeout(() => {
          setVisibleCount(prev => prev + ITEMS_PER_PAGE);
          setLoadingMore(false);
        }, 300);
      }
    }
  }, [isMobile, loadingMore, hasMore]);

  useEffect(() => {
    if (!isMobile) return;
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, handleScroll]);

  return (
    <div className="min-h-screen bg-background relative">
      <div className="relative z-10">
        <POSHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isDark={isDark}
          onToggleDark={toggleDark}
          cartCount={totalItems}
        />
        
        {/* Mobile Search Results - positioned below header */}
        {isMobile && searchQuery.trim() && (
          <div className="relative">
            <MobileSearchResults
              query={searchQuery}
              products={products}
              cartItems={cartItems}
              onAddToCart={addItem}
              onUpdateQuantity={updateQuantity}
              onClose={() => setSearchQuery("")}
            />
          </div>
        )}

        <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-black dark:text-white">
              <span className="text-black dark:text-black">
              <Highlighter color="#fbbf24" action="highlight" animationDuration={800}>
                Fresh & Delicious
              </Highlighter>{" "}
              </span>
              Food await you!
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Order your favorite items from our wide selection
            </p>
          </div>
        </div>

      <div className="hidden xl:block">
        <div className="max-w-6xl mx-auto py-3">
          <Marquee pauseOnHover className="[--duration:30s]">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleCategorySelect(cat)}
          className={`
            flex-shrink-0
            mx-2 px-5 py-2.5 rounded-full text-sm font-semibold
            transition-all duration-300 cursor-pointer select-none
            flex items-center gap-2
            ${cat === activeCategory 
              ? "bg-gradient-to-br from-primary to-orange-500 text-white shadow-lg shadow-orange-500/20" 
              : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }
          `}
        >
          <span className="text-base">{categoryEmojis[cat] || getCategoryEmoji(cat)}</span>
          <span>{cat}</span>
        </button>
      ))}
    </Marquee>
  </div>
</div>

        <div className="hidden md:block xl:hidden">
          <CategoryTabs 
            active={activeCategory} 
            onSelect={handleCategorySelect}
            categories={categories} 
            categoryEmojis={categoryEmojis} 
          />
        </div>

        {/* View Toggle & Sort Controls */}
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} items
          </p>
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-44 bg-secondary border-border/50 text-muted-foreground dark:text-gray-400 ">
                <ArrowUpDown className="w-4 h-4 mr-2 dark:text-gray-400 " />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent >
                <SelectItem value="default" >Default</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name-asc">Name: A-Z</SelectItem>
                <SelectItem value="name-desc">Name: Z-A</SelectItem>
              </SelectContent>
            </Select>

            {/* View Toggle - hidden on mobile */}
            <div className="hidden md:flex items-center bg-secondary rounded-lg p-0.5 border border-border/50">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-orange-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-orange-500 text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <main ref={scrollRef} className={`max-w-6xl mx-auto px-4 py-4 ${isMobile ? 'pb-40' : 'pb-24'}`}>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <p className="text-lg font-medium text-foreground">No items found</p>
              <p className="text-sm mt-1">Try a different search or category</p>
            </div>
          ) : isMobile ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {visibleProducts.map((item) => (
                    <ProductCard 
                      key={item.id} 
                      item={item}
                      onAddPosition={(pos) => triggerFlyToCart(pos, item.foodType === "veg" ? "#22c55e" : item.foodType === "egg" ? "#eab308" : "#ef4444")} 
                    />
                  ))}
                </div>
                {loadingMore && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <ProductSkeleton key={`loading-${i}`} />
                    ))}
                  </div>
                )}
                {!hasMore && filtered.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    You've reached the end
                  </p>
                )}
              </>
            ) : viewMode === "list" ? (
            <ProductAnimatedList
              products={filtered}
              onAddToCart={addItem}
              onUpdateQuantity={updateQuantity}
              cartItems={cartItems}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filtered.map((item, idx) => (
                <div key={item.id} style={{ animationDelay: `${idx * 30}ms` }}>
                  <ProductCard 
                    item={item}
                    onAddPosition={(pos) => triggerFlyToCart(pos, item.foodType === "veg" ? "#22c55e" : item.foodType === "egg" ? "#eab308" : "#ef4444")} 
                  />
                </div>
              ))}
            </div>
          )}
        </main>

        {totalItems > 0 && (
          <>
            <CartFAB onClick={() => setCartOpen(true)} />
            <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
            {flyingItems.map((item) => (
              <FlyToCart
                key={item.id}
                startPosition={item.startPosition}
                endPosition={item.endPosition}
                color={item.color}
                onComplete={() => removeFlyingItem(item.id)}
              />
            ))}
          </>
        )}

        {isMobile && (
          <>
            <CategoryDock 
              active={activeCategory} 
              onSelect={handleCategorySelect}
              categories={categories}
              categoryEmojis={categoryEmojis}
            />
            <MobileNav onCartClick={() => setCartOpen(true)} />
          </>
        )}
        
        {isMobile && (
          <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
        )}

        <footer className="hidden md:block border-t bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-orange-600">Food Factory POS</span> v1.0.0
              <span className="mx-2">•</span>
              © {new Date().getFullYear()} <span className="text-foreground">Food Factory – The Quality Taste</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

const Index = () => (
  <POSContent />
);

export default Index;
