// ============================================================================
// OrderTrackingTimeline — animated vertical (mobile) / horizontal (desktop)
// progress stepper showing order status progression. Supports all order
// statuses including cancelled with visual state for completed, active,
// and future steps.
// ============================================================================
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Clock,
  ChefHat,
  PackageCheck,
  XCircle,
} from "lucide-react";
import {
  ORDER_STATUS_PROGRESS,
  ORDER_STATUS_CONFIG,
  getStatusIndex,
  type OrderStatus,
} from "@/lib/orderStatus";
import { cn } from "@/lib/utils";

interface StatusTimestamps {
  pending_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
}

interface OrderTrackingTimelineProps {
  status: OrderStatus;
  timestamps: StatusTimestamps;
  className?: string;
}

const STEP_ICONS: Record<string, React.ElementType> = {
  pending: Clock,
  preparing: ChefHat,
  ready: PackageCheck,
  completed: Check,
};

function formatTime(isoString: string | null): string | null {
  if (!isoString) return null;
  try {
    return new Date(isoString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function TimelineStep({
  stepKey,
  isCompleted,
  isActive,
  isCancelled,
  timestamp,
  isLast,
}: {
  stepKey: OrderStatus;
  isCompleted: boolean;
  isActive: boolean;
  isCancelled: boolean;
  timestamp: string | null;
  isLast: boolean;
}) {
  const config = ORDER_STATUS_CONFIG[stepKey];
  const Icon = STEP_ICONS[stepKey] || Clock;
  const time = formatTime(timestamp);

  return (
    <div className="flex gap-3">
      {/* Indicator column */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={false}
          animate={{
            scale: isActive ? 1 : 0.85,
            opacity: isCompleted || isActive ? 1 : 0.4,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className={cn(
            "relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-colors duration-500",
            isCompleted &&
              "bg-green-500 border-green-500 text-white dark:bg-green-400 dark:border-green-400",
            isActive &&
              !isCancelled &&
              cn(
                config.activeBgColor,
                config.activeBorderColor,
                "text-white shadow-lg",
              ),
            !isCompleted &&
              !isActive &&
              "bg-muted border-border text-muted-foreground",
            isCancelled &&
              stepKey === "cancelled" &&
              "bg-red-500 border-red-500 text-white dark:bg-red-400 dark:border-red-400",
          )}
        >
          {isCompleted ? (
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <Check className="w-4 h-4" strokeWidth={3} />
            </motion.div>
          ) : isCancelled && stepKey === "cancelled" ? (
            <XCircle className="w-4 h-4" strokeWidth={2.5} />
          ) : (
            <Icon className="w-4 h-4" />
          )}

          {/* Active pulse ring */}
          {isActive && (
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full border-2",
                config.activeBorderColor,
              )}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          )}
        </motion.div>

        {/* Connector line */}
        {!isLast && (
          <div className="relative w-0.5 flex-1 min-h-[24px] my-1">
            <div className="absolute inset-0 bg-border" />
            <motion.div
              className={cn(
                "absolute inset-x-0 top-0 origin-top",
                isCompleted ? "bg-green-500 dark:bg-green-400" : "bg-border",
              )}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: isCompleted ? 1 : isActive ? 0.5 : 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              style={{ height: "100%" }}
            />
          </div>
        )}
      </div>

      {/* Content column */}
      <div className={cn("pb-6", isLast && "pb-0")}>
        <motion.p
          className={cn(
            "text-sm font-semibold transition-colors duration-300",
            isCompleted && "text-green-600 dark:text-green-400",
            isActive && !isCancelled && config.activeColor,
            !isCompleted && !isActive && "text-muted-foreground",
            isCancelled && stepKey === "cancelled" && "text-red-600 dark:text-red-400",
          )}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {config.label}
        </motion.p>
        {(isCompleted || isActive) && time && (
          <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
        )}
        {isActive && (
          <motion.p
            className="text-xs text-muted-foreground mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {config.customerDescription}
          </motion.p>
        )}
      </div>
    </div>
  );
}

export function OrderTrackingTimeline({
  status,
  timestamps,
  className,
}: OrderTrackingTimelineProps) {
  const isCancelled = status === "cancelled";
  const currentIndex = getStatusIndex(status);

  // For cancelled orders, we show steps up to where it was cancelled
  const stepsToShow = isCancelled
    ? ORDER_STATUS_PROGRESS.filter((_, i) => i <= Math.min(currentIndex, ORDER_STATUS_PROGRESS.length - 1))
    : ORDER_STATUS_PROGRESS;

  const getTimestampForStep = (step: OrderStatus): string | null => {
    const map: Record<OrderStatus, string | null> = {
      pending: timestamps.pending_at,
      preparing: timestamps.preparing_at,
      ready: timestamps.ready_at,
      completed: timestamps.completed_at,
      cancelled: timestamps.cancelled_at,
    };
    return map[step] || null;
  };

  return (
    <div className={cn("relative", className)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {stepsToShow.map((step, index) => {
            const isCompleted = isCancelled
              ? index < stepsToShow.length
              : index < currentIndex;
            const isActive = isCancelled
              ? false
              : index === currentIndex;

            return (
              <TimelineStep
                key={step}
                stepKey={step}
                isCompleted={isCompleted}
                isActive={isActive}
                isCancelled={isCancelled}
                timestamp={getTimestampForStep(step)}
                isLast={index === stepsToShow.length - 1}
              />
            );
          })}

          {/* Show cancelled step at the end */}
          {isCancelled && (
            <TimelineStep
              stepKey="cancelled"
              isCompleted={true}
              isActive={false}
              isCancelled={true}
              timestamp={timestamps.cancelled_at}
              isLast={true}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// OrderTrackingTimelineHorizontal — desktop horizontal stepper
// ============================================================================
export function OrderTrackingTimelineHorizontal({
  status,
  timestamps,
  className,
}: OrderTrackingTimelineProps) {
  const isCancelled = status === "cancelled";
  const currentIndex = getStatusIndex(status);
  const steps = ORDER_STATUS_PROGRESS;

  const getTimestampForStep = (step: OrderStatus): string | null => {
    const map: Record<OrderStatus, string | null> = {
      pending: timestamps.pending_at,
      preparing: timestamps.preparing_at,
      ready: timestamps.ready_at,
      completed: timestamps.completed_at,
      cancelled: timestamps.cancelled_at,
    };
    return map[step] || null;
  };

  return (
    <div className={cn("hidden md:flex items-start gap-0 w-full", className)}>
      {steps.map((step, index) => {
        const config = ORDER_STATUS_CONFIG[step];
        const isCompleted = isCancelled ? index < steps.length : index < currentIndex;
        const isActive = !isCancelled && index === currentIndex;
        const Icon = STEP_ICONS[step] || Clock;
        const time = formatTime(getTimestampForStep(step));

        return (
          <div key={step} className="flex-1 flex flex-col items-center relative">
            {/* Connector line */}
            {index > 0 && (
              <div className="absolute top-4 right-1/2 w-full h-0.5 -z-10">
                <div className="w-full h-full bg-border" />
                <motion.div
                  className={cn(
                    "absolute top-0 left-0 h-full origin-left",
                    isCompleted ? "bg-green-500 dark:bg-green-400" : "bg-border",
                  )}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isCompleted ? 1 : isActive ? 0.5 : 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{ width: "100%" }}
                />
              </div>
            )}

            {/* Step circle */}
            <motion.div
              initial={false}
              animate={{
                scale: isActive ? 1 : 0.85,
                opacity: isCompleted || isActive ? 1 : 0.4,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn(
                "relative w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-500 z-10",
                isCompleted && "bg-green-500 border-green-500 text-white dark:bg-green-400 dark:border-green-400",
                isActive && cn(config.activeBgColor, config.activeBorderColor, "text-white shadow-lg"),
                !isCompleted && !isActive && "bg-muted border-border text-muted-foreground",
              )}
            >
              {isCompleted ? (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                >
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </motion.div>
              ) : (
                <Icon className="w-3.5 h-3.5" />
              )}

              {isActive && (
                <motion.div
                  className={cn("absolute inset-0 rounded-full border-2", config.activeBorderColor)}
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 1.6, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
              )}
            </motion.div>

            {/* Label */}
            <p
              className={cn(
                "text-xs font-medium mt-2 text-center transition-colors duration-300",
                isCompleted && "text-green-600 dark:text-green-400",
                isActive && config.activeColor,
                !isCompleted && !isActive && "text-muted-foreground",
              )}
            >
              {config.shortLabel}
            </p>
            {time && (isCompleted || isActive) && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{time}</p>
            )}
          </div>
        );
      })}

      {/* Cancelled overlay */}
      {isCancelled && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <XCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
            <p className="text-sm font-bold text-red-600 dark:text-red-400">
              Order Cancelled
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
