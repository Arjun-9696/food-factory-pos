// ============================================================================
// AdminOrderTimeline — shows the full status lifecycle with timestamps
// and durations so the admin can track how long each step took.
// ============================================================================

import { Check, Clock, ChefHat, PackageCheck, XCircle } from "lucide-react";
import {
  ORDER_STATUS_PROGRESS,
  ORDER_STATUS_CONFIG,
  type OrderStatus,
} from "@/lib/orderStatus";
import { cn } from "@/lib/utils";

interface AdminOrderTimelineProps {
  status: OrderStatus;
  createdAt: string;
  pendingAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
}

const STEP_META: {
  key: OrderStatus;
  icon: React.ElementType;
  timestamp: string | null;
}[] = [
  { key: "pending", icon: Clock, timestamp: "" },
  { key: "preparing", icon: ChefHat, timestamp: "" },
  { key: "ready", icon: PackageCheck, timestamp: "" },
  { key: "completed", icon: Check, timestamp: "" },
];

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatDuration(startIso: string | null, endIso: string | null): string | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  const totalMinutes = Math.floor((end - start) / 60_000);
  if (totalMinutes < 1) return "<1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function AdminOrderTimeline({
  status,
  createdAt,
  pendingAt,
  preparingAt,
  readyAt,
  completedAt,
  cancelledAt,
}: AdminOrderTimelineProps) {
  const isCancelled = status === "cancelled";
  const cancelledIndex = isCancelled
    ? ORDER_STATUS_PROGRESS.indexOf(
        status === "cancelled"
          ? (["pending", "preparing", "ready", "completed"] as OrderStatus[]).findIndex(
              (s) => !s,
            ) || 0
          : status,
      )
    : -1;

  // Build timeline steps — only include steps up to current/cancelled state
  const currentIdx = ORDER_STATUS_PROGRESS.indexOf(status);
  const isComplete = status === "completed";

  // Determine which statuses to show
  const stepsToShow: {
    key: OrderStatus;
    icon: React.ElementType;
    ts: string | null;
    isDone: boolean;
    isCurrent: boolean;
    isCancelledStep: boolean;
  }[] = [];

  const tsMap: Record<string, string | null> = {
    pending: pendingAt || createdAt,
    preparing: preparingAt,
    ready: readyAt,
    completed: completedAt,
  };

  if (!isCancelled) {
    ORDER_STATUS_PROGRESS.forEach((s, i) => {
      if (i <= currentIdx) {
        stepsToShow.push({
          key: s,
          icon: STEP_META[i].icon,
          ts: tsMap[s],
          isDone: i < currentIdx || isComplete,
          isCurrent: i === currentIdx && !isComplete,
          isCancelledStep: false,
        });
      }
    });
  } else {
    // Show steps up to where it was cancelled, plus cancelled
    const lastActiveIdx = Math.max(
      0,
      [pendingAt, preparingAt, readyAt, completedAt].filter(Boolean).length - 1,
    );
    const showUpTo = Math.min(lastActiveIdx, 2); // at most ready
    ORDER_STATUS_PROGRESS.forEach((s, i) => {
      if (i <= showUpTo) {
        stepsToShow.push({
          key: s,
          icon: STEP_META[i].icon,
          ts: tsMap[s],
          isDone: true,
          isCurrent: false,
          isCancelledStep: false,
        });
      }
    });
    stepsToShow.push({
      key: "cancelled" as OrderStatus,
      icon: XCircle,
      ts: cancelledAt,
      isDone: true,
      isCurrent: false,
      isCancelledStep: true,
    });
  }

  // Compute total elapsed time
  const endTime = isCancelled
    ? cancelledAt
      ? new Date(cancelledAt).getTime()
      : Date.now()
    : isComplete && completedAt
      ? new Date(completedAt).getTime()
      : Date.now();
  const startTime = new Date(createdAt).getTime();
  const totalMs = endTime - startTime;
  const totalMinutes = Math.floor(totalMs / 60_000);
  const totalDisplay =
    totalMinutes < 1
      ? "<1 min"
      : totalMinutes < 60
        ? `${totalMinutes} min`
        : `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

  return (
    <div className="mt-3 mb-1">
      {/* Total time badge */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Timeline
        </p>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            isComplete
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : isCancelled
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
          )}
        >
          <Clock className="w-3 h-3" />
          {isComplete || isCancelled ? `Total: ${totalDisplay}` : `Elapsed: ${totalDisplay}`}
        </span>
      </div>

      {/* Timeline steps */}
      <div className="space-y-0">
        {stepsToShow.map((step, i) => {
          const config = ORDER_STATUS_CONFIG[step.key];
          const Icon = step.icon;
          const isLast = i === stepsToShow.length - 1;

          // Duration from previous step
          let durationFromPrev: string | null = null;
          if (i > 0 && step.ts) {
            const prevTs = stepsToShow[i - 1].ts;
            durationFromPrev = formatDuration(prevTs, step.ts);
          }

          return (
            <div key={step.key} className="flex gap-3">
              {/* Indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0",
                    step.isCancelledStep &&
                      "bg-red-500 border-red-500 text-white dark:bg-red-400 dark:border-red-400",
                    step.isDone &&
                      !step.isCancelledStep &&
                      "bg-green-500 border-green-500 text-white dark:bg-green-400 dark:border-green-400",
                    step.isCurrent &&
                      cn(config.activeBgColor, config.activeBorderColor, "text-white shadow-md"),
                    !step.isDone &&
                      !step.isCurrent &&
                      "bg-muted border-border text-muted-foreground",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {/* Connector */}
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[20px] my-1",
                      step.isDone ? "bg-green-500 dark:bg-green-400" : "bg-border",
                    )}
                  />
                )}
              </div>

              {/* Content */}
              <div className={cn("flex-1", isLast ? "pb-0" : "pb-3")}>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      step.isCancelledStep
                        ? "text-red-600 dark:text-red-400"
                        : step.isDone
                          ? "text-green-700 dark:text-green-400"
                          : step.isCurrent
                            ? config.activeColor
                            : "text-muted-foreground",
                    )}
                  >
                    {config.label}
                  </p>
                  {step.ts && (
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {formatTime(step.ts)}
                    </span>
                  )}
                </div>
                {durationFromPrev && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    +{durationFromPrev}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
