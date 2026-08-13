import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

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
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const ADMIN_EMAIL = "urbancodersofficial@gmail.com";

// Sentinel returned when Supabase requires email confirmation to be completed
// before the account can be used. Login.tsx turns this into a friendly message.
const CONFIRMATION_REQUIRED = "confirmation-required";

const friendlyAuthError = (error: unknown, fallback: string): string => {
  const msg = error instanceof Error ? error.message : String(error);
  const err = (error ?? {}) as Record<string, unknown>;
  const errCode = typeof err.code === "string" ? err.code : undefined;
  const errStatus = typeof err.status === "number" ? err.status : undefined;

  if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
    return "Cannot reach authentication server. Check your internet connection or Supabase project status.";
  }
  if (msg.includes("rate limit") || errCode === "429" || errStatus === 429) {
    return "Too many attempts. Please wait 5 minutes and try again.";
  }
  return msg || fallback;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const syncUserToDatabase = async (authId: string, email: string, name: string, avatarUrl: string) => {
    try {
      await supabase.from("users").upsert(
        { id: authId, name, email, role: "customer" },
        { onConflict: "id" }
      );

      await supabase.from("profiles").upsert(
        {
          user_id: authId,
          full_name: name,
          email,
          avatar_url: avatarUrl || null,
        },
        { onConflict: "user_id" }
      );
    } catch (error) {
      console.error("Failed to sync user to database:", error);
    }
  };

  const applyUser = (authUser: {
    id: string;
    email?: string;
    user_metadata?: {
      name?: string;
      full_name?: string;
      avatar_url?: string;
      picture?: string;
    };
  }) => {
    const name =
      authUser.user_metadata?.name ||
      authUser.user_metadata?.full_name ||
      authUser.email?.split("@")[0] ||
      "";
    const avatarUrl =
      authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || "";
    const isAdminEmail = (authUser.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
    setUser({
      id: authUser.id,
      email: authUser.email || "",
      name,
    });
    setIsAdmin(isAdminEmail);
    syncUserToDatabase(authUser.id, authUser.email || "", name, avatarUrl);
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      console.warn("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env");
      setLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session?.user) applyUser(session.user);
      })
      .catch(() => {
        // No session
      })
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        applyUser(session.user);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      if (!isSupabaseConfigured()) {
        return { error: "Supabase is not configured. Please check your environment variables." };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split("@")[0],
          },
        },
      });

      if (error) {
        const err = error as unknown as Record<string, unknown>;
        if (String(error.message).includes("already registered") || err.code === "user_already_exists") {
          return { error: "An account with this email already exists. Please sign in instead." };
        }
        return { error: friendlyAuthError(error, "Signup failed. Please try again.") };
      }

      if (!data.user) {
        return { error: "Signup failed. Please try again." };
      }

      if (data.session) {
        applyUser(data.user);
        return { error: null };
      }

      // Email confirmation is enabled on the Supabase project: the user must
      // click the confirmation link before the account becomes active.
      return { error: CONFIRMATION_REQUIRED };
    } catch (error: unknown) {
      console.error("Signup error:", error);
      return { error: friendlyAuthError(error, "Signup failed. Please try again.") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (!isSupabaseConfigured()) {
        return { error: "Supabase is not configured. Please check your environment variables." };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const err = error as unknown as Record<string, unknown>;
        if (String(error.message).includes("Invalid login credentials") || err.status === 400) {
          return { error: "Invalid email or password. Please try again." };
        }
        if (String(error.message).includes("Email not confirmed")) {
          return { error: CONFIRMATION_REQUIRED };
        }
        return { error: friendlyAuthError(error, "Login failed. Please try again.") };
      }

      if (!data.user) {
        return { error: "Login failed. Please try again." };
      }

      applyUser(data.user);
      return { error: null };
    } catch (error: unknown) {
      console.error("Login error:", error);
      return { error: friendlyAuthError(error, "Login failed. Please try again.") };
    }
  };

  const signInWithGoogle = async () => {
    try {
      if (!isSupabaseConfigured()) {
        return { error: "Supabase is not configured. Please check your environment variables." };
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return { error: friendlyAuthError(error, "Google sign-in failed. Please try again.") };
      }

      return { error: null };
    } catch (error: unknown) {
      console.error("Google sign-in error:", error);
      return { error: friendlyAuthError(error, "Google sign-in failed. Please try again.") };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Session may already be invalid
    }
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
