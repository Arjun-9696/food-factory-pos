import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { account } from "@/lib/appwrite";

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
  }, []);

  const checkCurrentUser = async () => {
    try {
      const session = await account.get();
      const isAdminEmail = session.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setUser({ id: session.$id, email: session.email, name: session.name || session.email.split("@")[0] });
      setIsAdmin(isAdminEmail);
    } catch {
      // No session
    }
    setLoading(false);
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      // Create account
      await account.create("unique()", email, password, name || email.split("@")[0]);
      
      // Create session immediately after signup
      await account.createEmailPasswordSession(email, password);
      
      // Get the created user
      const session = await account.get();
      const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setUser({ id: session.$id, email: session.email, name: session.name || name || email.split("@")[0] });
      setIsAdmin(isAdminEmail);

      return { error: null };
    } catch (error: any) {
      console.error("Signup error:", error);
      // Check if user already exists
      if (error.code === 409 || error.message?.includes("already exists")) {
        return { error: "An account with this email already exists. Please sign in instead." };
      }
      return { error: error.message || "Signup failed. Please try again." };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Check if there's already an active session
      try {
        const existingSession = await account.get();
        // Already logged in, just update state
        const isAdminEmail = existingSession.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        setUser({ id: existingSession.$id, email: existingSession.email, name: existingSession.name || email.split("@")[0] });
        setIsAdmin(isAdminEmail);
        return { error: null };
      } catch {
        // No active session, create new one
      }
      
      await account.createEmailPasswordSession(email, password);
      const session = await account.get();
      
      const isAdminEmail = session.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setUser({ id: session.$id, email: session.email, name: session.name || email.split("@")[0] });
      setIsAdmin(isAdminEmail);

      return { error: null };
    } catch (error: any) {
      console.error("Login error:", error);
      // Check for specific error codes
      if (error.code === 401 || error.message?.includes("Invalid credentials")) {
        return { error: "Invalid email or password. Please try again." };
      }
      if (error.code === 429) {
        return { error: "Too many attempts. Please wait a moment and try again." };
      }
      if (error.message?.includes("session is active")) {
        // Already logged in, refresh the page
        window.location.reload();
        return { error: null };
      }
      return { error: error.message || "Login failed. Please try again." };
    }
  };

  const signOut = async () => {
    try {
      await account.deleteSession("current");
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
