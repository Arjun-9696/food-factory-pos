// ============================================================================
// AdminLoyalty — Admin Food Factory Coins dashboard at /admin/loyalty.
// Shows aggregate coin stats, customer balances, and manual adjustments.
// ============================================================================
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Coins, RefreshCw, Search, Users, TrendingUp,
  TrendingDown, Wallet, Gift, Loader2, Plus, Minus, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CoinAdjustmentDialog } from "@/components/admin/CoinAdjustmentDialog";

interface CoinStats {
  totalIssued: number;
  totalRedeemed: number;
  activeBalance: number;
  issuedToday: number;
  redeemedToday: number;
  participatingCustomers: number;
}

interface CustomerWithCoins {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  coin_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
}

const ADMIN_EMAIL = "urbancodersofficial@gmail.com";

export default function AdminLoyalty() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<CoinStats | null>(null);
  const [customers, setCustomers] = useState<CustomerWithCoins[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adjustCustomer, setAdjustCustomer] = useState<CustomerWithCoins | null>(null);

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/admin/coins/stats?accessToken=${encodeURIComponent(token || "")}`);
      if (!res.ok) throw new Error("Failed to load stats");
      return await res.json();
    } catch (error) {
      console.error("Error fetching coin stats:", error);
      throw error;
    }
  }, [getAccessToken]);

  const fetchCustomers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, phone, coin_balance")
        .neq("coin_balance", 0)
        .order("coin_balance", { ascending: false });

      if (error) throw error;
      return (data || []) as CustomerWithCoins[];
    } catch (error) {
      console.error("Error fetching customers:", error);
      return [];
    }
  }, []);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [statsResult, customersList] = await Promise.all([
        fetchStats(),
        fetchCustomers(),
      ]);
      setStats(statsResult);
      setCustomers(customersList);
    } catch (error) {
      toast.error("Failed to load loyalty data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchStats, fetchCustomers]);

  useEffect(() => {
    if (user && isAdmin) {
      loadAll();
    }
  }, [user, isAdmin, loadAll]);

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  const filteredCustomers = customers.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">Loyalty / Food Factory Coins</h1>
                <Coins className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-xs text-muted-foreground">Coin program overview</p>
            </div>
            <button
              onClick={() => loadAll(true)}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-50"
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white"
              >
                <TrendingUp className="w-5 h-5 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{stats?.totalIssued.toLocaleString("en-IN") ?? 0}</p>
                <p className="text-xs opacity-80">Total Coins Issued</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white"
              >
                <TrendingDown className="w-5 h-5 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{stats?.totalRedeemed.toLocaleString("en-IN") ?? 0}</p>
                <p className="text-xs opacity-80">Total Coins Redeemed</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 text-white"
              >
                <Wallet className="w-5 h-5 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{stats?.activeBalance.toLocaleString("en-IN") ?? 0}</p>
                <p className="text-xs opacity-80">Active Coin Balance</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white"
              >
                <TrendingUp className="w-5 h-5 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{stats?.issuedToday.toLocaleString("en-IN") ?? 0}</p>
                <p className="text-xs opacity-80">Coins Issued Today</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 text-white"
              >
                <TrendingDown className="w-5 h-5 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{stats?.redeemedToday.toLocaleString("en-IN") ?? 0}</p>
                <p className="text-xs opacity-80">Coins Redeemed Today</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 text-white"
              >
                <Users className="w-5 h-5 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{stats?.participatingCustomers.toLocaleString("en-IN") ?? 0}</p>
                <p className="text-xs opacity-80">Participating Customers</p>
              </motion.div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            {/* Customer List */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Customer Coin Balances
              </h2>

              {filteredCustomers.length === 0 ? (
                <div className="text-center py-10">
                  <Gift className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
                  <p className="text-muted-foreground">No customers with coin balances yet</p>
                </div>
              ) : (
                filteredCustomers.map((customer, idx) => (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="glass-card rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
                      className="w-full p-4 flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {(customer.name || "C")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{customer.name || "Guest"}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {customer.email || customer.phone || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <div className="text-right">
                          <p className="font-bold text-orange-500">
                            {customer.coin_balance.toLocaleString("en-IN")} 🪙
                          </p>
                          <p className="text-[10px] text-muted-foreground">Worth ₹{customer.coin_balance.toLocaleString("en-IN")}</p>
                        </div>
                        {expandedId === customer.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {expandedId === customer.id && (
                      <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl bg-secondary/50">
                            <p className="text-xs text-muted-foreground mb-1">Balance</p>
                            <p className="font-bold text-foreground">{customer.coin_balance}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-secondary/50">
                            <p className="text-xs text-muted-foreground mb-1">Lifetime Earned</p>
                            <p className="font-bold text-green-600 dark:text-green-400">+{customer.lifetime_earned}</p>
                          </div>
                          <div className="p-3 rounded-xl bg-secondary/50">
                            <p className="text-xs text-muted-foreground mb-1">Lifetime Redeemed</p>
                            <p className="font-bold text-red-600 dark:text-red-400">-{customer.lifetime_redeemed}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => setAdjustCustomer(customer)}
                          className="w-full py-2.5 rounded-xl cart-gradient text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          Adjust Coins
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      {/* Adjustment dialog */}
      <CoinAdjustmentDialog
        customer={adjustCustomer}
        onClose={() => setAdjustCustomer(null)}
        onSuccess={() => { loadAll(true); setAdjustCustomer(null); }}
      />
    </div>
  );
}
