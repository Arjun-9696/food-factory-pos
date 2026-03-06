import { ShoppingBag, Home, User, Clock, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "next-themes";

interface MobileNavProps {
  onCartClick: () => void;
}

export function MobileNav({ onCartClick }: MobileNavProps) {
  const { totalItems } = useCart();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  const mainItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Clock, label: "Orders", path: "/orders" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  if (isAdmin) {
    mainItems.splice(2, 0, { icon: Settings, label: "Admin", path: "/admin" });
  }

  const dockBg = isDark ? "bg-gray-900/95" : "bg-white/95";
  const borderClass = isDark ? "border-gray-700/50" : "border-gray-200";
  const textClass = isDark ? "text-gray-400" : "text-gray-500";
  const activeTextClass = isDark ? "text-orange-400" : "text-orange-600";
  const iconColor = isDark ? "text-gray-400" : "text-gray-500";
  const activeIconColor = isDark ? "text-orange-400" : "text-orange-600";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${dockBg} ${borderClass} border-t backdrop-blur-xl`}>
      <div className="flex items-end justify-between px-2 h-20 relative max-w-md mx-auto">

        {mainItems.slice(0, 2).map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 py-2 ${
              isActive(item.path) ? activeTextClass : textClass
            } transition-all duration-200`}
          >
            <item.icon className={`w-5 h-5 ${isActive(item.path) ? activeIconColor : iconColor}`} />
            <span className="text-[11px] font-medium">{item.label}</span>
          </button>
        ))}

        {/* Cart Button - Only visible when items in cart */}
        {totalItems > 0 && (
          <button
            onClick={onCartClick}
            className="absolute left-1/2 -translate-x-1/2 -top-5 flex flex-col items-center"
          >
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/40 border-4 border-inherit">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
              {totalItems}
            </span>
          </button>
        )}

        {mainItems.slice(2).map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 py-2 ${
              isActive(item.path) ? activeTextClass : textClass
            } transition-all duration-200`}
          >
            <item.icon className={`w-5 h-5 ${isActive(item.path) ? activeIconColor : iconColor}`} />
            <span className="text-[11px] font-medium">{item.label}</span>
          </button>
        ))}

      </div>
    </div>
  );
}
