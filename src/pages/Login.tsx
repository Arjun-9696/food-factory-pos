import { useEffect, useLayoutEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, UserPlus} from "lucide-react";
import { toast } from "sonner";
import { MagicCard } from "@/components/magicui/magic-card";
import { useTheme } from "next-themes";
import confetti from "canvas-confetti";
import { MobileNav } from "@/components/pos/MobileNav";
import { CartDrawer } from "@/components/pos/CartDrawer";

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

const triggerConfetti = () => {
  const colors = ["#ff6a00", "#ff9a00", "#ffd54f", "#ff3d00"];

  const shoot = (originX: number) => {
    confetti({
      particleCount: 30,
      spread: 70,
      startVelocity: 45,
      gravity: 1,
      ticks: 200,
      origin: { x: originX, y: 0.6 },
      colors,
      scalar: 1.1,
    });
  };

  // left burst
  shoot(0.1);

  // right burst
  shoot(0.9);

  // center burst for effect
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 100,
      startVelocity: 50,
      gravity: 0.9,
      origin: { x: 0.5, y: 0.5 },
      colors,
      scalar: 1.2,
    });
  }, 200);
};

export default function Login() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error(error);
      setGoogleLoading(false);
    }
    // On success the browser redirects to Google; state resets when the user returns.
  };

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
      if (error === "confirmation-required") {
        toast.info("Account created! Check your email to confirm it before signing in.");
      } else if (error) {
        toast.error(error);
      } else {
        toast.success("Account created successfully!");
        triggerConfetti();
        navigate("/");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error === "confirmation-required") {
        toast.info("Please confirm your email first. Check your inbox for the confirmation link.");
      } else if (error) {
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
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full 
bg-gradient-to-br from-[#e600ff] via-[#6427ff] to-[#1efffb] shadow-lg shadow-[#4e518753] mb-3">
                {/* <Coffee className="w-8 h-8 text-white" /> */}
                <img src="/foodfactory.svg"  className="w-8 h-8 contrast-100 saturate-150 brightness-125 drop-shadow-md" alt="" />
              </div>
              <h1 className="text-2xl font-extrabold text-foreground">Food Factory</h1>
              <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase mt-1">The Quality Taste</p>
              <p className="text-sm text-muted-foreground mt-3">{isSignUp ? "Create your account" : "Sign in to continue"}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <input
                  type="text"
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              )}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={4}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-10 rounded-xl bg-secondary border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
              <div className="h-px flex-1 bg-border/60" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || submitting}
              className="w-full py-3 rounded-xl bg-secondary border border-border/50 text-sm text-foreground font-semibold flex items-center justify-center gap-2.5 transition-all hover:border-border active:scale-95 disabled:opacity-60"
            >
              <GoogleIcon className="w-4 h-4" />
              {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
            </button>

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
