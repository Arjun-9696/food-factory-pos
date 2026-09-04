// ============================================================================
// ActiveOrderCard — premium hero card for the customer's active order(s).
// Features live tracking timeline, animated status, and real-time updates.
// ============================================================================
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ChevronDown, ChevronUp, Clock, CreditCard } from "lucide-react";
import {
  OrderTrackingTimeline,
  OrderTrackingTimelineHorizontal,
} from "./OrderTrackingTimeline";
import { OrderStatusBadge, LiveIndicator } from "./OrderStatusBadge";
import {
  ORDER_STATUS_CONFIG,
  isOrderActive,
  type OrderStatus,
} from "@/lib/orderStatus";
import { formatAddressLines } from "@/lib/address";
import { cn } from "@/lib/utils";
import type { OrderData } from "@/hooks/useOrders";

interface ActiveOrderCardProps {
  order: OrderData;
  index?: number;
}

function timeSince(isoString: string | null): string {
  if (!isoString) return "";
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ActiveOrderCard({ order, index = 0 }: ActiveOrderCardProps) {
  const [expanded, setExpanded] = useState(true);
  const config = ORDER_STATUS_CONFIG[order.status];
  const isActive = isOrderActive(order.status);
  const isCancelled = order.status === "cancelled";

  const timestamps = useMemo(
    () => ({
      pending_at: order.pending_at,
      preparing_at: order.preparing_at,
      ready_at: order.ready_at,
      completed_at: order.completed_at,
      cancelled_at: order.cancelled_at,
    }),
    [order.pending_at, order.preparing_at, order.ready_at, order.completed_at, order.cancelled_at],
  );

  const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const orderTime = new Date(order.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      className={cn(
        "glass-card rounded-2xl overflow-hidden",
        isActive && "ring-2 ring-orange-500/20 dark:ring-orange-400/20",
        isCancelled && "ring-2 ring-red-500/20 dark:red-400/20 opacity-80",
      )}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">
              #{order.order_number}
            </h3>
            {isActive && <LiveIndicator />}
          </div>
          <OrderStatusBadge status={order.status} size="md" />
        </div>

        {/* Status message */}
        <div className={cn("rounded-xl p-3 mb-3", config.bgColor)}>
          <div className="flex items-center gap-2">
            {isActive && !isCancelled && (
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="flex-shrink-0"
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm",
                    config.activeBgColor,
                  )}
                >
                  {order.status === "preparing" && "👨‍🍳"}
                  {order.status === "pending" && "📋"}
                  {order.status === "ready" && "✅"}
                </div>
              </motion.div>
            )}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-bold", config.activeColor)}>
                {config.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {config.customerDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {orderDate} • {orderTime}
          </span>
          <span className="flex items-center gap-1">
            <CreditCard className="w-3 h-3" />
            {order.payment_method === "razorpay" ? "Paid" : "Payment pending"}
          </span>
        </div>
      </div>

      {/* Expandable tracking */}
      <div className="px-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Order Tracking</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="pb-3"
          >
            {/* Mobile: vertical timeline */}
            <div className="md:hidden">
              <OrderTrackingTimeline status={order.status} timestamps={timestamps} />
            </div>
            {/* Desktop: horizontal timeline */}
            <OrderTrackingTimelineHorizontal
              status={order.status}
              timestamps={timestamps}
            />
          </motion.div>
        )}
      </div>

      {/* Order items */}
      <div className="px-4 pb-3">
        <div className="border-t border-border/50 pt-3 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Items
          </p>
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-foreground">
                {item.quantity}× {item.product_name}
              </span>
              <span className="font-medium text-foreground">₹{item.total}</span>
            </div>
          ))}
          <div className="border-t border-border/50 pt-2 mt-2">
            <div className="flex justify-between text-sm font-bold text-foreground">
              <span>Total</span>
              <span>₹{order.grand_total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      {order.delivery_address && (
        <div className="px-4 pb-3">
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground border-t border-border/50 pt-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5">
                Delivery to
              </p>
              {formatAddressLines(
                order.delivery_address as import("@/types/address").DeliveryAddress,
              ).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* View details link */}
      <div className="px-4 pb-4">
        <Link
          to={`/orders/${order.id}`}
          className="block w-full text-center py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/70 transition-colors"
        >
          View Full Details
        </Link>
      </div>
    </motion.div>
  );
}
