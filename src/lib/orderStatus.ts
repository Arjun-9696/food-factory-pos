// ============================================================================
// Centralized order status configuration.
// Single source of truth for status labels, descriptions, colors, and
// display order. Both customer and admin UIs reference this module.
// ============================================================================

export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

export interface OrderStatusStep {
  key: OrderStatus;
  label: string;
  description: string;
  shortLabel: string;
}

/** Canonical ordering for the progress timeline. */
export const ORDER_STATUS_PROGRESS: OrderStatus[] = [
  "pending",
  "preparing",
  "ready",
  "completed",
];

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    shortLabel: string;
    description: string;
    customerDescription: string;
    color: string;
    bgColor: string;
    darkBgColor: string;
    borderColor: string;
    activeColor: string;
    activeBgColor: string;
    activeDarkBgColor: string;
    activeBorderColor: string;
    toastMessage: string;
  }
> = {
  pending: {
    label: "Order Received",
    shortLabel: "Received",
    description: "Your order has been placed and is waiting to be processed.",
    customerDescription: "We've received your order and sent it to the kitchen.",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    darkBgColor: "dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    activeColor: "text-amber-600 dark:text-amber-400",
    activeBgColor: "bg-amber-500",
    activeDarkBgColor: "dark:bg-amber-400",
    activeBorderColor: "border-amber-500 dark:border-amber-400",
    toastMessage: "Your Food Factory order has been received.",
  },
  preparing: {
    label: "Preparing Your Order",
    shortLabel: "Preparing",
    description: "Our kitchen is preparing your food fresh.",
    customerDescription: "Our chefs are preparing your food fresh.",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    darkBgColor: "dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    activeColor: "text-blue-600 dark:text-blue-400",
    activeBgColor: "bg-blue-500",
    activeDarkBgColor: "dark:bg-blue-400",
    activeBorderColor: "border-blue-500 dark:border-blue-400",
    toastMessage: "Your Food Factory order is now being prepared.",
  },
  ready: {
    label: "Ready for Delivery",
    shortLabel: "Ready",
    description: "Your order is ready and waiting for delivery.",
    customerDescription: "Your order is ready and waiting for pickup.",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    darkBgColor: "dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    activeColor: "text-purple-600 dark:text-purple-400",
    activeBgColor: "bg-purple-500",
    activeDarkBgColor: "dark:bg-purple-400",
    activeBorderColor: "border-purple-500 dark:border-purple-400",
    toastMessage: "Great news! Your Food Factory order is ready for delivery.",
  },
  completed: {
    label: "Order Completed",
    shortLabel: "Completed",
    description: "Your order has been completed.",
    customerDescription: "Your order has been completed. We hope you enjoyed it!",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    darkBgColor: "dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    activeColor: "text-green-600 dark:text-green-400",
    activeBgColor: "bg-green-500",
    activeDarkBgColor: "dark:bg-green-400",
    activeBorderColor: "border-green-500 dark:border-green-400",
    toastMessage: "Your Food Factory order has been completed. Enjoy!",
  },
  cancelled: {
    label: "Order Cancelled",
    shortLabel: "Cancelled",
    description: "This order has been cancelled.",
    customerDescription: "This order has been cancelled.",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    darkBgColor: "dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    activeColor: "text-red-600 dark:text-red-400",
    activeBgColor: "bg-red-500",
    activeDarkBgColor: "dark:bg-red-400",
    activeBorderColor: "border-red-500 dark:border-red-400",
    toastMessage: "Your Food Factory order has been cancelled.",
  },
};

/** Returns true if the status is in an "active" (not terminal) state. */
export function isOrderActive(status: OrderStatus): boolean {
  return status === "pending" || status === "preparing" || status === "ready";
}

/** Returns true if the order is in a terminal state. */
export function isOrderTerminal(status: OrderStatus): boolean {
  return status === "completed" || status === "cancelled";
}

/** Get the index of a status in the progress timeline. Returns -1 for cancelled. */
export function getStatusIndex(status: OrderStatus): number {
  return ORDER_STATUS_PROGRESS.indexOf(status);
}

/** Get the timestamp field name for a given status in the orders table. */
export function getStatusTimestampField(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending: "pending_at",
    preparing: "preparing_at",
    ready: "ready_at",
    completed: "completed_at",
    cancelled: "cancelled_at",
  };
  return map[status];
}

/** Customer-facing notification messages for status transitions. */
export const STATUS_TRANSITION_MESSAGES: Partial<Record<OrderStatus, string>> = {
  preparing: "Your Food Factory order is now being prepared.",
  ready: "Great news! Your Food Factory order is ready for delivery.",
  completed: "Your Food Factory order has been completed. Enjoy!",
  cancelled: "Your Food Factory order has been cancelled.",
};
