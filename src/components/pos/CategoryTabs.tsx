import { useRef, useEffect, useState } from "react";
import { getCategoryEmoji } from "@/data/categories";

interface CategoryTabsProps {
  active: string;
  onSelect: (c: string) => void;
  categories?: string[];
  categoryEmojis?: Record<string, string>;
}

const categoryImages: Record<string, string> = {
  "All": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=120&h=120&fit=crop&q=80",
  "Fresh Juice": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=120&h=120&fit=crop&q=80",
  "Fresh Juices": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=120&h=120&fit=crop&q=80",
  "Fruite Milk Shake": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=120&h=120&fit=crop&q=80",
  "Milkshakes": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=120&h=120&fit=crop&q=80",
  "Milkshake": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=120&h=120&fit=crop&q=80",
  "Special Milkshake": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=120&h=120&fit=crop&q=80",
  "Food Factory Special": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=120&h=120&fit=crop&q=80",
  "Soda": "https://images.unsplash.com/photo-1581006852262-e4307cf6283a?w=120&h=120&fit=crop&q=80",
  "Lassi": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=120&h=120&fit=crop&q=80",
  "Smoothie": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=120&h=120&fit=crop&q=80",
  "Falooda": "https://images.unsplash.com/photo-1568901839119-631418a3910d?w=120&h=120&fit=crop&q=80",
  "Mojito": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=120&h=120&fit=crop&q=80",
  "Health Drinks": "https://images.unsplash.com/photo-1554433607-66b5a31b4766?w=120&h=120&fit=crop&q=80",
  "Sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=120&h=120&fit=crop&q=80",
  "Non Veg Sandwich": "https://images.unsplash.com/photo-1568901839119-631418a3910d?w=120&h=120&fit=crop&q=80",
  "Maggie": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=120&h=120&fit=crop&q=80",
  "Maggi": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=120&h=120&fit=crop&q=80",
  "Non Veg Maggi": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=120&h=120&fit=crop&q=80",
  "Cold Coffee": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=120&h=120&fit=crop&q=80",
  "Burgers": "https://images.unsplash.com/photo-1550547660-d9450f859349?w=120&h=120&fit=crop&q=80",
  "Momos": "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=120&h=120&fit=crop&q=80",
  "Noodles": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=120&h=120&fit=crop&q=80",
  "Fries": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=120&h=120&fit=crop&q=80",
  "Snacks": "https://images.unsplash.com/photo-1562967914-01b114e022a5?w=120&h=120&fit=crop&q=80",
  "Egg Items": "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=120&h=120&fit=crop&q=80",
  "Bakery": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=120&h=120&fit=crop&q=80",
  "Desserts": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=120&h=120&fit=crop&q=80",
  "Hot Beverages": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=120&h=120&fit=crop&q=80",
  "Juice": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=120&h=120&fit=crop&q=80",
  "Coffee": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=120&h=120&fit=crop&q=80",
  "Tea": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=120&h=120&fit=crop&q=80",
  "Shake": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=120&h=120&fit=crop&q=80",
  "Milk Shake": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=120&h=120&fit=crop&q=80",
  "Ice Cream": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=120&h=120&fit=crop&q=80",
};

export function CategoryTabs({ active, onSelect, categories = ["All"], categoryEmojis = {} }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const scrollPosRef = useRef(0);
  const frameRef = useRef<number>();
  const isPausedRef = useRef(false);

  // Single set of unique categories from database
  const uniqueCategories = [...new Set(categories)];

  // Smooth infinite scroll marquee with pause on hover
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || uniqueCategories.length <= 1) return;

    const speed = 0.5;
    
    const animate = () => {
      if (!isPausedRef.current) {
        scrollPosRef.current += speed;
        const maxScroll = container.scrollWidth / 2;
        
        if (scrollPosRef.current >= maxScroll) {
          scrollPosRef.current = 0;
        }
        
        container.scrollLeft = scrollPosRef.current;
      }
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [uniqueCategories.length]);

  // Handle mouse enter/leave for pause
  const handleMouseEnter = () => {
    isPausedRef.current = true;
    setIsHovering(true);
    if (scrollRef.current) {
      scrollPosRef.current = scrollRef.current.scrollLeft;
    }
  };

  const handleMouseLeave = () => {
    isPausedRef.current = false;
    setIsHovering(false);
    if (scrollRef.current) {
      scrollPosRef.current = scrollRef.current.scrollLeft;
    }
  };

  // Manual scroll handler
  const handleScroll = () => {
    if (scrollRef.current && !isPausedRef.current) {
      scrollPosRef.current = scrollRef.current.scrollLeft;
    }
  };

  // Duplicate categories for seamless loop
  const allCategories = [...uniqueCategories, ...uniqueCategories];

  return (
    <div 
      className="sticky top-[73px] md:top-[73px] z-30 glass-surface border-b border-border/30 overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-w-6xl mx-auto px-2 md:px-4 py-3 flex gap-2 md:gap-3 overflow-x-auto scrollbar-hide"
        style={{ scrollBehavior: "auto" }}
      >
        {allCategories.map((cat, idx) => (
          <button
            key={`${cat}-${idx}`}
            onClick={() => onSelect(cat)}
            className={`
              group flex-shrink-0 flex flex-col items-center justify-center
              min-w-[75px] md:min-w-[90px] p-2 md:p-2.5 rounded-xl
              transition-all duration-200 cursor-pointer select-none
              ${cat === active 
                ? "bg-gradient-to-br from-primary to-orange-500 text-white shadow-lg shadow-orange-500/20 -translate-y-0.5" 
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }
            `}
          >
            <div className="relative mb-1">
              <div 
                className={`
                  w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden
                  transition-transform duration-200
                  ${cat === active ? "scale-105 ring-2 ring-white/50" : "group-hover:scale-102"}
                `}
              >
                <img 
                  src={categoryImages[cat] || categoryImages["All"]}
                  alt={cat}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div 
                className={`
                  absolute -bottom-0.5 -right-0.5
                  w-4 h-4 md:w-5 md:h-5 rounded-full bg-card shadow-sm flex items-center justify-center text-[10px] md:text-xs
                  ${cat === active ? "scale-110" : ""}
                `}
                >
                  {categoryEmojis?.[cat] || getCategoryEmoji(cat)}
                </div>
            </div>
            <span className="text-[10px] md:text-xs font-medium whitespace-nowrap">
              {cat}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
