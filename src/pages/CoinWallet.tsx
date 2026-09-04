// ============================================================================
// CoinWallet — Customer Food Factory Coins wallet page at /account/coins.
// Shows balance, ₹ value, progress to next reward, and transaction history.
// ============================================================================
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { MobileNav } from "@/components/pos/MobileNav";
import { CartDrawer } from "@/components/pos/CartDrawer";
import { CoinWalletCard } from "@/components/coins/CoinWalletCard";
import { CoinProgress } from "@/components/coins/CoinProgress";
import { CoinTransactionList } from "@/components/coins/CoinTransactionList";
import { CoinInfoCard } from "@/components/coins/CoinInfoCard";
import { useCoinWallet, useCoinTransactions, useInvalidateCoins } from "@/hooks/useCoins";

const PAGE_SIZE = 10;

export default function CoinWallet() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const invalidateCoins = useInvalidateCoins();
  const [cartOpen, setCartOpen] = useState(false);
  const [page, setPage] = useState(1);

  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
    refetch: refetchWallet,
    isRefetching,
  } = useCoinWallet();

  const {
    data: txData,
    isLoading: txLoading,
    error: txError,
    refetch: refetchTransactions,
  } = useCoinTransactions(page, PAGE_SIZE);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Clear cache on unmount (logout protection)
  useEffect(() => {
    return () => {
      invalidateCoins();
    };
  }, [invalidateCoins]);

  if (authLoading || !user) return null;

  const totalPages = txData ? Math.max(1, Math.ceil(txData.total / PAGE_SIZE)) : 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/profile"
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Food Factory Coins</h1>
              <Coins className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground">Your loyalty rewards</p>
          </div>
          <button
            onClick={() => { refetchWallet(); refetchTransactions(); }}
            disabled={isRefetching}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-50"
            aria-label="Refresh coins"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 pb-40 max-w-lg">
        {/* Wallet error state */}
        {walletError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
              <Coins className="w-7 h-7 text-red-400" />
            </div>
            <p className="font-medium text-foreground mb-1">Unable to load your coins</p>
            <p className="text-sm text-muted-foreground mb-4">
              Please check your connection and try again.
            </p>
            <button
              onClick={() => refetchWallet()}
              className="px-5 py-2.5 rounded-xl cart-gradient text-primary-foreground text-sm font-semibold"
            >
              Try Again
            </button>
          </motion.div>
        )}

        {/* Wallet card */}
        {!walletError && (walletLoading || !wallet) ? (
          <div className="h-64 skeleton-shimmer rounded-2xl" />
        ) : (
          wallet && <CoinWalletCard
            balance={wallet.balance}
            rupeeValue={wallet.rupeeValue}
            canRedeem={wallet.canRedeem}
          />
        )}

        {/* Progress summary (when below threshold) */}
        {!walletError && wallet && !wallet.canRedeem && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4 glass-card rounded-2xl p-5"
          >
            <CoinProgress balance={wallet.balance} />
          </motion.div>
        )}

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Coin History
            </h2>
            <span className="text-xs text-muted-foreground">
              {txData ? `${txData.total} ${txData.total === 1 ? "entry" : "entries"}` : ""}
            </span>
          </div>

          {txError ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-3">
                Failed to load transaction history.
              </p>
              <button
                onClick={() => refetchTransactions()}
                className="px-4 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : (
            <CoinTransactionList
              transactions={txData?.transactions || []}
              loading={txLoading}
            />
          )}

          {/* Pagination */}
          {!txLoading && txData && txData.total > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium disabled:opacity-40 hover:bg-secondary/70 transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary text-foreground text-sm font-medium disabled:opacity-40 hover:bg-secondary/70 transition-colors"
                aria-label="Next page"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Rules / Discoverability */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <CoinInfoCard />
        </motion.div>
      </main>

      <MobileNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
