import { Search, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserMenu } from "./UserMenu";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";

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
  <div className="flex items-center">
  <div className="flex items-center gap-2">
    
    {/* Logo */}
    <img
      src="/foodfactory.svg"
      alt="Food Factory Logo"
      className="w-8 h-8 object-contain"
    />

    {/* Text Section */}
    <div className="flex flex-col">
      <h1 className="text-2xl font-extrabold text-foreground">
        Food Factory
      </h1>

      <p className="text-[10px] md:text-xs font-medium text-primary uppercase flex items-center justify-between w-full gap-1 ">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
        <span className="flex-1 text-center tracking-[0.33em] md:tracking-[0.15em] ">
          THE QUALITY TASTE
        </span>
      </p>
    </div>

  </div>
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
