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

  const dockBg = isDark ? "bg-black" : "bg-white";
  const borderClass = isDark ? "border-gray-800" : "border-gray-200";
  const textClass = isDark ? "text-gray-300" : "text-gray-600";
  const activeTextClass = isDark ? "text-orange-500" : "text-orange-600";
  const iconColor = isDark ? "text-gray-300" : "text-gray-600";
  const activeIconColor = isDark ? "text-orange-500" : "text-orange-600";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 md:hidden ${dockBg} ${borderClass} border-t`}>
      <div className="flex items-center justify-between px-4 h-16">
        {mainItems.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 ${isActive(item.path) ? activeTextClass : textClass} transition-colors`}
          >
            <item.icon className={`w-5 h-5 ${isActive(item.path) ? activeIconColor : iconColor}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
        
        {/* Cart Button - Center */}
        <button
          onClick={onCartClick}
          className="flex flex-col items-center justify-center gap-0.5"
        >
          <div className="relative">
            <div className="w-12 h-12 -mt-5 rounded-full cart-gradient flex items-center justify-center shadow-lg shadow-orange-500/30">
              <ShoppingBag className="w-5 h-5 text-white" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </div>
          </div>
          <span className={`text-[10px] font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>Cart</span>
        </button>

        {/* Empty space for symmetry */}
        <div className="w-12" />
      </div>
    </div>
  );
}
