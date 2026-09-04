// ============================================================================
// CoinProgress — progress bar toward the next ₹100 reward with friendly
// messaging. Respects reduced-motion preferences.
// ============================================================================
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { COIN_CONFIG } from "@/lib/coinConfig";

interface CoinProgressProps {
  balance: number;
  className?: string;
}

export function CoinProgress({ balance, className }: CoinProgressProps) {
  const minimum = COIN_CONFIG.MINIMUM_REDEMPTION_COINS;
  const progress = Math.min(100, (balance / minimum) * 100);
  const coinsToNext = Math.max(0, minimum - balance);
  const unlocked = balance >= minimum;

  let message: string;
  if (unlocked) {
    message = `🎉 You've unlocked ₹${minimum} OFF!`;
  } else if (coinsToNext <= 10) {
    message = `Just ${coinsToNext} more Coins! You're almost at ₹${minimum} OFF.`;
  } else {
    message = `Earn ${coinsToNext} more Coins to unlock ₹${minimum} OFF`;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full",
            unlocked
              ? "bg-gradient-to-r from-green-500 to-emerald-500"
              : "bg-gradient-to-r from-orange-500 to-amber-500",
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <p
        className={cn(
          "text-xs font-medium",
          unlocked ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
        )}
        role="status"
      >
        {message}
      </p>
    </div>
  );
}
