"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { getCategoryEmoji } from "@/data/categories";

interface CategoryDockProps {
  active: string;
  onSelect: (c: string) => void;
  categories?: string[];
}

const isLongCategory = (cat: string) => cat.length > 8;

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
  const catBg = isDark ? "bg-gray-900" : "bg-gray-100";
  const activeClass = "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-md";
  const inactiveClass = isDark 
    ? "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white" 
    : "bg-white text-gray-600 hover:bg-orange-100 hover:text-gray-900";
  const tooltipClass = isDark 
    ? "bg-gray-700 text-white" 
    : "bg-gray-800 text-white";

  return (
    <div className="md:hidden fixed bottom-16 left-0 right-0 z-40">
      <div 
        ref={scrollRef}
        className={`flex items-center justify-start gap-2 px-2 py-2.5 overflow-x-auto scrollbar-hide ${catBg} ${borderClass} border-t border-b`}
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {categories.map((cat) => (
          <div key={cat} className="relative group flex-shrink-0">
            <motion.button
              onClick={() => onSelect(cat)}
              className={`
                flex flex-col items-center justify-center
                w-16 h-14 rounded-xl transition-all duration-200 cursor-pointer
                ${cat === active ? activeClass : inactiveClass}
              `}
            >
              <span className="text-lg">{getCategoryEmoji(cat)}</span>
              <span className="text-[9px] mt-0.5 font-medium truncate max-w-[90%]">
                {isLongCategory(cat) ? cat.slice(0, 6) + ".." : cat}
              </span>
            </motion.button>
            
            {isLongCategory(cat) && (
              <div className={`absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 ${tooltipClass}`}>
                {cat}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
