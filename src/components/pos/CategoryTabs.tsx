import { useRef, useEffect, useState } from "react";

interface CategoryTabsProps {
  active: string;
  onSelect: (c: string) => void;
  categories?: string[];
}

const categoryImages: Record<string, string> = {
  "All": "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=120&h=120&fit=crop&q=80",
  "Fresh Juice": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=120&h=120&fit=crop&q=80",
  "Fruite Milk Shake": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=120&h=120&fit=crop&q=80",
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
  "Non Veg Maggi": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=120&h=120&fit=crop&q=80",
};

const categoryEmojis: Record<string, string> = {
  "All": "🍽️",
  "Fresh Juice": "🍊",
  "Fruite Milk Shake": "🥤",
  "Food Factory Special": "🧋",
  "Soda": "🥤",
  "Lassi": "🥛",
  "Smoothie": "🍹",
  "Falooda": "🍜",
  "Mojito": "🍃",
  "Health Drinks": "💪",
  "Sandwich": "🥪",
  "Non Veg Sandwich": "🥪",
  "Maggie": "🍜",
  "Non Veg Maggi": "🍜",
};

export function CategoryTabs({ active, onSelect, categories = ["All"] }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const scrollPosRef = useRef(0);
  const frameRef = useRef<number>();

  // Smooth infinite scroll marquee - isolated from page scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const speed = 0.5;
    
    const animate = () => {
      if (!isHovering) {
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
  }, [isHovering]);

  // Duplicate for seamless loop
  const allCategories = [...categories, ...categories];

  return (
    <div 
      className="sticky top-[73px] md:top-[73px] z-30 glass-surface border-b border-border/30 overflow-hidden"
      onMouseEnter={() => {
        setIsHovering(true);
        if (scrollRef.current) {
          scrollPosRef.current = scrollRef.current.scrollLeft;
        }
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        if (scrollRef.current) {
          scrollPosRef.current = scrollRef.current.scrollLeft;
        }
      }}
    >
      <div
        ref={scrollRef}
        className="container mx-auto px-2 md:px-4 py-3 flex gap-3 md:gap-4 overflow-scroll  scrollbar-hide"
        style={{ 
          scrollBehavior: 'auto',
          overflowY: 'hidden',
          height: 'auto',
        }}
      >
        {allCategories.map((cat, idx) => (
          <button
            key={`${cat}-${idx}`}
            onClick={() => onSelect(cat)}
            className={`
              group flex-shrink-0 flex flex-col items-center justify-center
              min-w-[80px] md:min-w-[100px] p-2.5 md:p-3.5 rounded-2xl
              transition-all duration-300 cursor-pointer select-none 
              ${cat === active 
                ? "bg-gradient-to-br from-primary to-orange-500 text-white shadow-lg shadow-orange-500/20 -translate-y-1" 
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }
            `}
          >
            {/* Image */}
            <div className="relative z-10 mb-1.5 md:mb-2">
              <div 
                className={`
                  w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden
                  transition-transform duration-300
                  ${cat === active ? "scale-110 ring-2 ring-white/60" : "group-hover:scale-105"}
                `}
              >
                <img 
                  src={categoryImages[cat] || categoryImages["All"]}
                  alt={cat}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              
              {/* Emoji Badge */}
              <div 
                className={`
                  absolute -bottom-0.5 -right-0.5 md:bottom-0 md:right-auto md:top-0 md:-right-1
                  w-5 h-5 md:w-6 md:h-6 rounded-full bg-card shadow-md flex items-center justify-center text-xs md:text-sm
                  transition-transform duration-300
                  ${cat === active ? "scale-110" : "group-hover:scale-110"}
                `}
              >
                {categoryEmojis[cat] || "🍴"}
              </div>
            </div>

            {/* Label */}
            <span 
              className={`
                relative z-10 text-[11px] md:text-xs font-bold whitespace-nowrap
                transition-colors duration-200
                ${cat === active ? "text-white" : "text-muted-foreground group-hover:text-foreground"}
              `}
            >
              {cat}
            </span>

            {/* Active Indicator */}
            {cat === active && (
              <div className="absolute bottom-1 md:bottom-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
