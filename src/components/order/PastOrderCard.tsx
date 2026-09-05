// ============================================================================
// PastOrderCard — compact card for completed/cancelled orders.
// Shows key info with expandable details.
// ============================================================================
import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { ORDER_STATUS_CONFIG } from "@/lib/orderStatus";
import { formatAddressLines } from "@/lib/address";
import { cn } from "@/lib/utils";
import type { OrderData } from "@/hooks/useOrders";

interface PastOrderCardProps {
  order: OrderData;
  index?: number;
}

export function PastOrderCard({ order, index = 0 }: PastOrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = ORDER_STATUS_CONFIG[order.status];

  const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const orderTime = new Date(order.created_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="glass-card rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3.5 flex items-center justify-between text-left active:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              config.bgColor,
            )}
          >
            <span className={cn("text-base font-bold", config.color)}>
              {order.status === "completed" ? "✓" : order.status === "cancelled" ? "✕" : "•"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-foreground truncate">
                #{order.order_number}
              </p>
              <OrderStatusBadge status={order.status} size="sm" />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {orderDate} • {orderTime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <div className="text-right">
            <p className="text-sm font-bold text-foreground">₹{order.grand_total}</p>
            <p className="text-[10px] text-muted-foreground">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="px-3.5 pb-3.5 space-y-2 border-t border-border/50"
        >
          {/* Items */}
          <div className="pt-2.5 space-y-1.5">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {item.quantity}× {item.product_name}
                </span>
                <span className="font-medium text-foreground">₹{item.total}</span>
              </div>
            ))}
          </div>

          {/* Bill */}
          <div className="border-t border-border/50 pt-2 space-y-1 text-sm">
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
            <div className="flex justify-between text-foreground">
              <span>GST (5%)</span>
              <span>₹{order.gst}</span>
            </div>
            <div className="flex justify-between text-foreground">
              <span>Delivery</span>
              <span className={order.delivery > 0 ? "" : "text-green-600 dark:text-green-400"}>
                {order.delivery > 0 ? `₹${order.delivery}` : "FREE"}
              </span>
            </div>
            <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/50">
              <span>Total</span>
              <span>₹{order.grand_total}</span>
            </div>
          </div>

          {/* Coin activity */}
          {(order.status === "completed" || order.coin_discount > 0) && (
            <div className="border-t border-border/50 pt-2 space-y-1.5">
              {order.status === "completed" && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 flex items-center justify-center text-[10px]">🪙</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">+10 Coins earned</span>
                </div>
              )}
              {order.coin_discount > 0 && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="w-5 h-5 rounded-full bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-400 flex items-center justify-center text-[10px]">🪙</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {Math.round(order.coin_discount)} Coins used
                  </span>
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    -₹{order.coin_discount} discount
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Payment */}
          {order.payment_method && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <span className="font-medium">Payment:</span>
              <span className="capitalize">
                {order.payment_method === "razorpay"
                  ? "Paid Online"
                  : order.payment_method === "FOOD_FACTORY_COINS"
                    ? "Food Factory Coins"
                    : order.payment_method}
              </span>
            </div>
          )}

          {/* Address */}
          {order.delivery_address && (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/50">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5">
                  Delivery to
                </p>
                {formatAddressLines(
                  order.delivery_address as unknown as import("@/types/address").DeliveryAddress,
                ).map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
