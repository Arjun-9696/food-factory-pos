// ============================================================================
// OrderDetail — detailed order tracking page at /orders/:id.
// Shows full order information with live tracking timeline.
// ============================================================================
import { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  MapPin,
  CreditCard,
  ReceiptIndianRupee,
  Package,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useOrderDetail } from "@/hooks/useOrders";
import {
  OrderTrackingTimeline,
  OrderTrackingTimelineHorizontal,
} from "@/components/order/OrderTrackingTimeline";
import { OrderStatusBadge, LiveIndicator } from "@/components/order/OrderStatusBadge";
import { OrderDetailSkeleton } from "@/components/order/OrderCardSkeleton";
import { ORDER_STATUS_CONFIG, isOrderActive } from "@/lib/orderStatus";
import { formatAddressLines } from "@/lib/address";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { OrderData } from "@/hooks/useOrders";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [previousStatus, setPreviousStatus] = useState<string | null>(null);

  const { data: order, isLoading, error } = useOrderDetail(id);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Track status transitions for toasts
  useEffect(() => {
    if (!order) return;
    if (previousStatus && previousStatus !== order.status) {
      const messages: Record<string, string> = {
        preparing: "Your Food Factory order is now being prepared.",
        ready: "Great news! Your Food Factory order is ready for delivery.",
        completed: "Your Food Factory order has been completed. Enjoy!",
        cancelled: "Your Food Factory order has been cancelled.",
      };
      const msg = messages[order.status];
      if (msg) {
        toast.info(msg);
      }
    }
    setPreviousStatus(order.status);
  }, [order?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const timestamps = useMemo(
    () =>
      order
        ? {
            pending_at: order.pending_at,
            preparing_at: order.preparing_at,
            ready_at: order.ready_at,
            completed_at: order.completed_at,
            cancelled_at: order.cancelled_at,
          }
        : null,
    [order],
  );

  if (authLoading || !user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Link
              to="/orders"
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-foreground">Order Details</h1>
          </div>
        </header>
        <OrderDetailSkeleton />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3">
            <Link
              to="/orders"
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-foreground">Order Details</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-4">
            <ReceiptIndianRupee className="w-7 h-7 text-red-400" />
          </div>
          <p className="font-medium text-foreground mb-1">Order not found</p>
          <p className="text-sm text-muted-foreground mb-4">
            This order may have been removed or you don't have access.
          </p>
          <Link
            to="/orders"
            className="px-5 py-2.5 rounded-xl cart-gradient text-primary-foreground text-sm font-semibold"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const config = ORDER_STATUS_CONFIG[order.status];
  const isActive = isOrderActive(order.status);

  const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const orderTime = new Date(order.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            to="/orders"
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">
                Order #{order.order_number}
              </h1>
              {isActive && <LiveIndicator />}
            </div>
            <p className="text-xs text-muted-foreground">
              {orderDate} • {orderTime}
            </p>
          </div>
          <OrderStatusBadge status={order.status} size="md" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 pb-8 space-y-4 max-w-2xl">
        {/* Status Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("rounded-2xl p-5", config.bgColor)}
        >
          <div className="flex items-center gap-3 mb-3">
            {isActive && (
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white",
                    config.activeBgColor,
                  )}
                >
                  {order.status === "preparing" && "👨‍🍳"}
                  {order.status === "pending" && "📋"}
                  {order.status === "ready" && "✅"}
                </div>
              </motion.div>
            )}
            <div>
              <h2 className={cn("text-base font-bold", config.activeColor)}>
                {config.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                {config.customerDescription}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tracking Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Order Tracking
            </h3>
          </div>
          <OrderTrackingTimeline status={order.status} timestamps={timestamps!} />
          <div className="hidden md:block mt-4">
            <OrderTrackingTimelineHorizontal
              status={order.status}
              timestamps={timestamps!}
            />
          </div>
        </motion.div>

        {/* Order Items */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">
            Order Items
          </h3>
          <div className="space-y-2.5">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground bg-secondary px-2 py-0.5 rounded-md text-xs font-medium">
                    {item.quantity}×
                  </span>
                  <span className="text-sm text-foreground">{item.product_name}</span>
                </div>
                <span className="text-sm font-medium text-foreground">₹{item.total}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bill Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-5"
        >
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide mb-3">
            Bill Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-foreground">
              <span>Subtotal</span>
              <span>₹{order.subtotal}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span>-₹{order.discount}</span>
              </div>
            )}
            {order.coin_discount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>{Math.round(order.coin_discount)} Food Factory Coins</span>
                <span>-₹{order.coin_discount}</span>
              </div>
            )}
            <div className="flex justify-between text-foreground">
              <span>GST (5%)</span>
              <span>₹{order.gst}</span>
            </div>
            <div className="flex justify-between text-foreground">
              <span>Delivery</span>
              <span
                className={order.delivery > 0 ? "" : "text-green-600 dark:text-green-400"}
              >
                {order.delivery > 0 ? `₹${order.delivery}` : "FREE"}
              </span>
            </div>
            <div className="flex justify-between text-foreground">
              <span>Payment</span>
              <span>
                {order.payment_method === "FOOD_FACTORY_COINS" ? "Food Factory Coins" : "Online (Razorpay)"}
              </span>
            </div>
            <div className="flex justify-between font-bold text-foreground pt-2 border-t border-border/50 text-base">
              <span>Total</span>
              <span>₹{order.grand_total}</span>
            </div>
          </div>
        </motion.div>

        {/* Delivery Address */}
        {order.delivery_address && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                Delivery Address
              </h3>
            </div>
            <div className="text-sm text-foreground">
              {formatAddressLines(
                order.delivery_address as import("@/types/address").DeliveryAddress,
              ).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </motion.div>
        )}

        {/* Payment */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Payment
            </h3>
          </div>
          <p className="text-sm text-foreground mt-2">
            {order.payment_method === "razorpay"
              ? "Paid Online"
              : order.payment_method || "Payment pending"}
          </p>
        </motion.div>

        {/* Back button */}
        <Link
          to="/orders"
          className="block w-full text-center py-3 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/70 transition-colors"
        >
          Keep Tracking
        </Link>
      </main>
    </div>
  );
}
