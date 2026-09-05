// ============================================================================
// OrderStatusBadge — small inline badge showing order status.
// ============================================================================
import { cn } from "@/lib/utils";
import { ORDER_STATUS_CONFIG, type OrderStatus } from "@/lib/orderStatus";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: "sm" | "md";
  className?: string;
  showDot?: boolean;
}

export function OrderStatusBadge({
  status,
  size = "sm",
  className,
  showDot = true,
}: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full",
        config.bgColor,
        config.color,
        size === "sm" && "px-2 py-0.5 text-[11px]",
        size === "md" && "px-2.5 py-1 text-xs",
        className,
      )}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full flex-shrink-0",
            status === "pending" && "bg-amber-500 dark:bg-amber-400",
            status === "preparing" && "bg-blue-500 dark:bg-blue-400",
            status === "ready" && "bg-purple-500 dark:bg-purple-400",
            status === "completed" && "bg-green-500 dark:bg-green-400",
            status === "cancelled" && "bg-red-500 dark:bg-red-400",
            size === "sm" && "w-1.5 h-1.5",
            size === "md" && "w-2 h-2",
          )}
        />
      )}
      {config.label}
    </span>
  );
}

// ============================================================================
// LiveIndicator — subtle pulsing dot indicating live updates
// ============================================================================
export function LiveIndicator({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-orange-600 dark:text-orange-400", className)}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500 dark:bg-orange-400" />
      </span>
      LIVE
    </span>
  );
}
