import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, UserPlus, Coffee } from "lucide-react";
import { toast } from "sonner";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTheme } from "next-themes";
import confetti from "canvas-confetti";
import { MobileNav } from "@/components/pos/MobileNav";
import { CartDrawer } from "@/components/pos/CartDrawer";

const triggerConfetti = () => {
  const end = Date.now() + 3 * 1000;
  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

  const frame = () => {
    if (Date.now() > end) return;

    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      startVelocity: 60,
      origin: { x: 0, y: 0.5 },
      colors: colors,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      startVelocity: 60,
      origin: { x: 1, y: 0.5 },
      colors: colors,
    });

    requestAnimationFrame(frame);
  };

  frame();
};

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!email || !password) {
      toast.error("Please fill in all fields");
      setSubmitting(false);
      return;
    }

    if (isSignUp) {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Account created successfully!");
        triggerConfetti();
        navigate("/");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error);
      } else {
        toast.success("Welcome back!");
        triggerConfetti();
        navigate("/");
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background with LightRays effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />
      
      <div 
        className="group"
        style={{ perspective: "1000px" }}
      >
        <MagicCard 
          className="w-full max-w-sm transition-transform duration-300 ease-out group-hover:rotate-x-2" 
          style={{ transformStyle: "preserve-3d" }}
          gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className="p-6 space-y-6 relative z-10">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-purple-600 mb-3">
                <Coffee className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-extrabold text-foreground">Food Factory</h1>
              <p className="text-xs text-primary font-medium tracking-wider uppercase mt-1">The Quality Taste</p>
              <p className="text-sm text-muted-foreground mt-3">{isSignUp ? "Create your account" : "Sign in to continue"}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <input
                  type="text"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              )}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl cart-gradient text-primary-foreground font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
              >
                {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                {submitting ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary font-semibold">
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </MagicCard>
      </div>

      <MobileNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
