import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const ADMIN_EMAIL = "urbancodersofficial@gmail.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkCurrentUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const isAdminEmail = session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "",
        });
        setIsAdmin(isAdminEmail);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const isAdminEmail = session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "",
        });
        setIsAdmin(isAdminEmail);
      }
    } catch {
      // No session
    }
    setLoading(false);
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split("@")[0],
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        setUser({
          id: data.user.id,
          email: data.user.email || email,
          name: name || email.split("@")[0],
        });
        setIsAdmin(isAdminEmail);
        return { error: null };
      }

      return { error: "Signup failed. Please try again." };
    } catch (error: any) {
      console.error("Signup error:", error);
      if (error.message?.includes("rate limit") || error.code === "429") {
        return { error: "Too many attempts. Please wait 5 minutes and try again." };
      }
      if (error.message?.includes("already registered") || error.code === "user_already_exists") {
        return { error: "An account with this email already exists. Please sign in instead." };
      }
      return { error: error.message || "Signup failed. Please try again." };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        setUser({
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || email.split("@")[0],
        });
        setIsAdmin(isAdminEmail);
        return { error: null };
      }

      return { error: "Login failed. Please try again." };
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.message?.includes("rate limit") || error.code === "429") {
        return { error: "Too many attempts. Please wait 5 minutes and try again." };
      }
      if (error.message?.includes("Invalid login credentials") || error.status === 400) {
        return { error: "Invalid email or password. Please try again." };
      }
      if (error.message?.includes("Email not confirmed")) {
        return { error: "Please confirm your email first." };
      }
      return { error: error.message || "Login failed. Please try again." };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
