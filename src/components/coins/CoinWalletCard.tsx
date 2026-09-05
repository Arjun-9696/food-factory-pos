// ============================================================================
// CoinWalletCard — hero card for the account coins page + reuse anywhere.
// Shows balance, rupee value, and a CTA to redeem at checkout.
// ============================================================================
import { motion } from "framer-motion";
import { Coins, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { CoinProgress } from "./CoinProgress";
import { cn } from "@/lib/utils";

interface CoinWalletCardProps {
  balance: number;
  rupeeValue: number;
  canRedeem: boolean;
  className?: string;
  showCta?: boolean;
}

export function CoinWalletCard({
  balance,
  rupeeValue,
  canRedeem,
  className,
  showCta = true,
}: CoinWalletCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-white shadow-xl shadow-orange-500/20",
        className,
      )}
    >
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-sm">Food Factory Coins</p>
            <p className="text-xs text-white/80">1 Coin = ₹1</p>
          </div>
        </div>

        <div className="flex items-end gap-1 mb-1">
          <span className="text-5xl font-extrabold tabular-nums leading-none">
            {balance.toLocaleString("en-IN")}
          </span>
          <span className="text-white/80 font-medium mb-1">Coins</span>
        </div>
        <p className="text-white/90 text-sm mb-4">Worth ₹{rupeeValue.toLocaleString("en-IN")}</p>

        <CoinProgress
          balance={balance}
          className="[&_p]:text-white/90 [&_p]:text-xs [&_p]:font-medium text-white/90"
        />

        {showCta && canRedeem && (
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 w-full justify-center py-2.5 rounded-xl bg-white text-orange-600 font-semibold text-sm shadow hover:bg-orange-50 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Redeem at Checkout
          </Link>
        )}
        {showCta && !canRedeem && (
          <Link
            to="/"
            className="mt-4 inline-flex items-center gap-1.5 w-full justify-center py-2.5 rounded-xl bg-white/20 text-white font-semibold text-sm hover:bg-white/30 transition-colors"
          >
            Start Earning
          </Link>
        )}
      </div>
    </motion.div>
  );
}
