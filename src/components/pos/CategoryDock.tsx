import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";

interface CategoryDockProps {
  active: string;
  onSelect: (c: string) => void;
  categories?: string[];
}

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

export function CategoryDock({ active, onSelect, categories = ["All"] }: CategoryDockProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark') || theme === 'dark';
      setIsDark(isDarkMode);
    };
    
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, [theme]);

  const borderClass = isDark ? "border-gray-700" : "border-gray-200";
  const textClass = isDark ? "text-gray-300" : "text-gray-600";
  const activeTextClass = isDark ? "text-white" : "text-gray-900";
  const catBg = isDark ? "bg-gray-900" : "bg-gray-100";

  return (
    <div className="md:hidden fixed bottom-16 left-0 right-0 z-40">
      <div 
        ref={scrollRef}
        className={`flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide ${catBg} ${borderClass} border-t border-b`}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={`
              flex-shrink-0 flex flex-col items-center justify-center
              px-3 py-1.5 rounded-lg transition-all duration-200 cursor-pointer
              ${cat === active 
                ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md" 
                : `${textClass} hover:${activeTextClass} hover:bg-orange-100 dark:hover:bg-gray-700`
              }
            `}
          >
            <span className="text-sm">{categoryEmojis[cat] || "🍴"}</span>
            <span className="text-[8px] mt-0.5 font-medium">{cat.slice(0, 7)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
