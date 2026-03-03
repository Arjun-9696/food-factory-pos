import { Search, ShoppingBag, Coffee } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserMenu } from "./UserMenu";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";
import { OrbitingCircles } from "@/components/magicui/orbiting-circles";
import { Sun, Moon } from "lucide-react";

interface POSHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDark: boolean;
  onToggleDark: () => void;
  cartCount?: number;
}

export function POSHeader({ searchQuery, onSearchChange, isDark, onToggleDark, cartCount = 0 }: POSHeaderProps) {
  const { isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 glass-surface border-b border-border/30">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Brand with OrbitingCircles */}
          <div className="flex-shrink-0 relative">
            <OrbitingCircles radius={30} speed={1.5} iconSize={12}>
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            </OrbitingCircles>
            
            <div className="relative pl-8">
              <h1 className="text-lg md:text-xl font-extrabold text-foreground hover:animate-glow-pulse transition-all flex items-center gap-2">
                <Coffee className="w-5 h-5 text-orange-500" />
                Food Factory
              </h1>
            </div>
            <p className="text-[10px] md:text-xs font-medium text-primary tracking-wider uppercase flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
              The Quality Taste
            </p>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/80 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Animated Theme Toggle with continuous spin */}
            <AnimatedThemeToggler
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 transition-all hover:scale-105"
            />

            {/* User Menu */}
            <UserMenu isAdmin={isAdmin} />
          </div>
        </div>

        {/* Mobile search */}
        <div className="mt-3 md:hidden relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/80 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
    </header>
  );
}
