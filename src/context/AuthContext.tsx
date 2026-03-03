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
      
      // Create session
      await account.createEmailPasswordSession(email, password);
      
      const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setUser({ id: "", email, name: name || email.split("@")[0] });
      setIsAdmin(isAdminEmail);

      return { error: null };
    } catch (error: any) {
      console.error("Signup error:", error);
      return { error: error.message || "Signup failed" };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await account.createEmailPasswordSession(email, password);
      const session = await account.get();
      
      const isAdminEmail = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setUser({ id: session.$id, email: session.email, name: session.name || email.split("@")[0] });
      setIsAdmin(isAdminEmail);

      return { error: null };
    } catch (error: any) {
      console.error("Login error:", error);
      return { error: error.message || "Invalid email or password" };
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
