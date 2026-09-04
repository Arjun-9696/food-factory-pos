// ============================================================================
// OrderHistory — customer-facing "My Orders" page. Shows ACTIVE ORDERS
// (pending, preparing, ready) prominently at the top with live tracking,
// and PAST ORDERS (completed, cancelled) below with expandable details.
// Uses React Query + Supabase Realtime for live status updates.
// ============================================================================
import { useState, useCallback, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, ReceiptIndianRupee, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { MobileNav } from "@/components/pos/MobileNav";
import { CartDrawer } from "@/components/pos/CartDrawer";
import { ActiveOrderCard } from "@/components/order/ActiveOrderCard";
import { PastOrderCard } from "@/components/order/PastOrderCard";
import { OrderCardSkeleton } from "@/components/order/OrderCardSkeleton";
import { LiveIndicator } from "@/components/order/OrderStatusBadge";
import { useCustomerOrders, useInvalidateOrders } from "@/hooks/useOrders";
import { isOrderActive, isOrderTerminal } from "@/lib/orderStatus";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { OrderData } from "@/hooks/useOrders";

export default function OrderHistory() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const invalidateOrders = useInvalidateOrders();
  const [cartOpen, setCartOpen] = useState(false);
  const [previousStatuses, setPreviousStatuses] = useState<Record<string, string>>({});

  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useCustomerOrders();

  // Track status transitions for toast notifications
  useEffect(() => {
    if (!orders.length) return;

    orders.forEach((order: OrderData) => {
      const prevStatus = previousStatuses[order.id];
      if (prevStatus && prevStatus !== order.status) {
        const messages: Record<string, string> = {
          preparing: "Your Food Factory order is now being prepared.",
          ready: "Great news! Your Food Factory order is ready for delivery.",
          completed: "Your Food Factory order is completed. You earned +10 Coins! 🪙",
          cancelled: "Your Food Factory order has been cancelled.",
        };
        const msg = messages[order.status];
        if (msg) {
          if (order.status === "completed" || order.status === "cancelled") {
            toast.success(msg);
          } else {
            toast.info(msg);
          }
        }
      }
    });

    // Update previous statuses
    const newStatuses: Record<string, string> = {};
    orders.forEach((order: OrderData) => {
      newStatuses[order.id] = order.status;
    });
    setPreviousStatuses(newStatuses);
  }, [orders]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Clear cache on unmount (logout protection)
  useEffect(() => {
    return () => {
      invalidateOrders();
    };
  }, [invalidateOrders]);

  const { activeOrders, pastOrders } = useMemo(() => {
    const active: OrderData[] = [];
    const past: OrderData[] = [];
    orders.forEach((order: OrderData) => {
      if (isOrderActive(order.status) || order.status === "cancelled") {
        // cancelled orders that were recently active show at top briefly
        if (order.status === "cancelled") {
          // Check if it was cancelled recently (within last 5 min)
          const cancelledAt = order.cancelled_at
            ? new Date(order.cancelled_at).getTime()
            : 0;
          const fiveMinAgo = Date.now() - 5 * 60 * 1000;
          if (cancelledAt > fiveMinAgo) {
            active.push(order);
          } else {
            past.push(order);
          }
        } else {
          active.push(order);
        }
      } else {
        past.push(order);
      }
    });
    return { activeOrders: active, pastOrders: past };
  }, [orders]);

  if (authLoading || !user) return null;

  const hasActiveOrders = activeOrders.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">My Orders</h1>
              {hasActiveOrders && <LiveIndicator />}
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading..."
                : orders.length === 0
                  ? "No orders yet"
                  : `${orders.length} ${orders.length === 1 ? "order" : "orders"}`}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-50"
            aria-label="Refresh orders"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 pb-40">
        {/* Loading state */}
        {isLoading && orders.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          /* Error state */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
              <ReceiptIndianRupee className="w-7 h-7 text-red-400" />
            </div>
            <p className="font-medium text-foreground mb-1">
              Unable to load your orders
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Please check your connection and try again.
            </p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 rounded-xl cart-gradient text-primary-foreground text-sm font-semibold"
            >
              Try Again
            </button>
          </motion.div>
        ) : orders.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-4">
              <ReceiptIndianRupee className="w-8 h-8 text-orange-400" />
            </div>
            <p className="text-lg font-bold text-foreground mb-1">No Orders Yet</p>
            <p className="text-sm text-muted-foreground mb-5">
              Your next delicious order is waiting.
            </p>
            <Link
              to="/"
              className="px-6 py-2.5 rounded-xl cart-gradient text-primary-foreground text-sm font-semibold shadow-lg"
            >
              Start Ordering
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Active Orders
                  </h2>
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeOrders.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {activeOrders.map((order, i) => (
                    <ActiveOrderCard key={order.id} order={order} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Past Orders */}
            {pastOrders.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Past Orders
                </h2>
                <div className="space-y-2">
                  {pastOrders.map((order, i) => (
                    <PastOrderCard key={order.id} order={order} index={i} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <MobileNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
