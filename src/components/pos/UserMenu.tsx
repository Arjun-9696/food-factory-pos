import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { 
  User, 
  ClipboardList, 
  LogOut, 
  MapPin, 
  Settings,
  ChevronDown,
  Loader2
} from "lucide-react";

interface UserMenuProps {
  isAdmin?: boolean;
}

export function UserMenu({ isAdmin }: UserMenuProps) {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut();
    setOpen(false);
    navigate("/");
  };

  if (!user) {
    return (
      <Link
        to="/login"
        className="px-3 py-1.5 rounded-lg cart-gradient text-primary-foreground text-sm font-semibold flex items-center gap-1.5"
      >
        <User className="w-4 h-4" />
        <span className="hidden md:inline">Sign In</span>
      </Link>
    );
  }

  const userInitial = user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-secondary/80 hover:bg-secondary transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
          {userInitial}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-card rounded-lg border border-border/50 shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-border/50">
            <p className="font-semibold text-sm text-foreground truncate">{user.name || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          
          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/80"
            >
              <User className="w-4 h-4" />
              My Profile
            </Link>
            <Link
              to="/orders"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/80"
            >
              <ClipboardList className="w-4 h-4" />
              My Orders
            </Link>
            <Link
              to="/profile?tab=addresses"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/80"
            >
              <MapPin className="w-4 h-4" />
              My Addresses
            </Link>
            
            {isAdmin && (
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground hover:bg-secondary/80 border-t border-border/50"
              >
                <Settings className="w-4 h-4" />
                Admin
              </Link>
            )}
          </div>

          <div className="border-t border-border/50 py-1">
            <button
              onClick={handleSignOut}
              disabled={loading}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
