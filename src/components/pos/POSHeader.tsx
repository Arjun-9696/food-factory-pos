import { Search, ShoppingBag, Bell, BellRing } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { UserMenu } from "./UserMenu";
import { AnimatedThemeToggler } from "@/components/magicui/animated-theme-toggler";
import { SearchResults } from "./MobileSearchResults";
import { type MenuItem } from "@/data/menu";
import { useState, useEffect } from "react";
import { browserNotification } from "@/lib/notifications";
import { toast } from "sonner";

interface POSHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isDark: boolean;
  onToggleDark: () => void;
  cartCount?: number;
  products?: MenuItem[];
  cartItems?: { item: MenuItem; quantity: number }[];
  onAddToCart?: (item: MenuItem) => void;
  onUpdateQuantity?: (itemId: string, qty: number) => void;
}

export function POSHeader({ 
  searchQuery, 
  onSearchChange, 
  isDark, 
  onToggleDark, 
  cartCount = 0,
  products = [],
  cartItems = [],
  onAddToCart,
  onUpdateQuantity,
}: POSHeaderProps) {
  const { isAdmin } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const checkNotificationStatus = () => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setNotificationsEnabled(Notification.permission === 'granted');
      }
    };
    checkNotificationStatus();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await browserNotification.requestPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      toast.success('Notifications enabled! You will receive order updates.');
      await browserNotification.show({ 
        title: 'Notifications Enabled!',
        body: 'You will receive order updates and promotions.',
      });
    } else {
      toast.error('Please enable notifications in browser settings');
    }
  };

  const handleCloseSearch = () => {
    onSearchChange("");
  };

  return (
    <header className="sticky top-0 z-40 glass-surface border-b border-border/30 safe-area-top">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Brand with OrbitingCircles */}
  <div className="flex items-center">
  <div className="flex items-center gap-2">
    
    {/* Logo */}
    <img
      src="/foodfactory.svg"
      alt="Food Factory Logo"
      className="w-[40px] h-[45px] object-contain pt-[1px]"
    />

    {/* Text Section */}
    <div className="flex flex-col">
      <h1 className="text-2xl font-extrabold text-foreground" style={{ fontFamily: 'Cinzel, serif' }}>
        Food Factory
      </h1>
       <p className="text-xs md:text-xs font-medium text-primary  flex items-center">
       {/* <span className="relative flex h-2.5 w-2.5">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
</span> */}
        <span className="flex-1 text-center tracking-[0.25em] md:tracking-[0.25em]" style={{ fontFamily: 'Cinzel, serif' }}>
          The Quality Taste
        </span>
      </p>
{/* <img
  src="/decoline.png"
  alt="decoline"
  className="w-[84%] h-full brightness-0"
/> */}
     
    </div>

  </div>
</div>

          {/* Search */}
          <div className="flex-1 max-w-md relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/80 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            {/* Desktop Search Results - positioned relative to search input */}
            {!isMobile && searchQuery.trim() && products.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2">
                <SearchResults
                  query={searchQuery}
                  products={products}
                  cartItems={cartItems}
                  onAddToCart={onAddToCart!}
                  onUpdateQuantity={onUpdateQuantity!}
                  onClose={handleCloseSearch}
                />
              </div>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button
              onClick={handleEnableNotifications}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary/80 transition-all hover:scale-105 relative"
              title={notificationsEnabled ? 'Notifications enabled' : 'Enable notifications'}
            >
              {notificationsEnabled ? (
                <BellRing className="w-5 h-5 text-orange-500" />
              ) : (
                <Bell className="w-5 h-5" />
              )}
            </button>

            {/* Animated Theme Toggle with continuous spin */}
            <AnimatedThemeToggler
              className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary/80 transition-all hover:scale-105"
            />

            {/* User Menu */}
            <UserMenu isAdmin={isAdmin} />
          </div>
        </div>

        {/* Mobile search */}
        <div className="mt-3 md:hidden relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <input
            type="text"
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/80 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
        </div>
      </div>
    </header>
  );
}
