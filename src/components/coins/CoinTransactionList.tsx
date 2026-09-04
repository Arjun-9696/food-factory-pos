// ============================================================================
// CoinTransactionList — coin transaction history list with clear
// positive/negative styling, empty and loading states.
// ============================================================================
import { motion } from "framer-motion";
import { Coins } from "lucide-react";
import type { CoinTransaction } from "@/hooks/useCoins";

interface CoinTransactionListProps {
  transactions: CoinTransaction[];
  loading?: boolean;
}

const TRANSACTION_LABELS: Record<string, string> = {
  ORDER_REWARD: "Order reward",
  REDEMPTION: "Redeemed",
  ADMIN_ADJUSTMENT: "Admin adjustment",
  REFUND: "Refund",
  REVERSAL: "Reversal",
  BONUS: "Bonus",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const time = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (sameDay(date, today)) return `Today, ${time}`;
  if (sameDay(date, yesterday)) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}, ${time}`;
}

export function CoinTransactionList({ transactions, loading }: CoinTransactionListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 skeleton-shimmer rounded-xl" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center mb-3">
          <Coins className="w-7 h-7 text-orange-400" />
        </div>
        <p className="font-semibold text-foreground mb-1">No Coin Activity Yet</p>
        <p className="text-sm text-muted-foreground max-w-[240px]">
          Complete your first order and start earning Food Factory Coins.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {transactions.map((tx, i) => {
        const isPositive = tx.amount > 0;
        const label = TRANSACTION_LABELS[tx.type] || tx.type;
        return (
          <motion.li
            key={tx.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isPositive
                    ? "bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400"
                    : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
                }`}
              >
                <Coins className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                <p className="text-xs text-muted-foreground">{label} • {formatDate(tx.created_at)}</p>
              </div>
            </div>
            <span
              className={`font-bold tabular-nums whitespace-nowrap ${
                isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              }`}
              aria-label={`${tx.amount > 0 ? "plus" : "minus"} ${Math.abs(tx.amount)} coins`}
            >
              {isPositive ? "+" : ""}
              {tx.amount}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}
