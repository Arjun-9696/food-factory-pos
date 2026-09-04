// ============================================================================
// CoinInfoCard — discoverability card explaining the Food Factory Coins rules.
// Used on account pages, checkout, and My Orders.
// ============================================================================
import { Coins } from "lucide-react";
import { COIN_CONFIG } from "@/lib/coinConfig";

export function CoinInfoCard() {
  return (
    <div className="rounded-2xl border border-orange-200 dark:border-orange-900/40 bg-orange-50 dark:bg-orange-950/20 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white">
          <Coins className="w-4 h-4" />
        </div>
        <div>
          <p className="font-bold text-foreground text-sm">Food Factory Coins</p>
          <p className="text-xs text-muted-foreground">Order. Earn. Enjoy.</p>
        </div>
      </div>
      <div className="space-y-1.5 text-sm text-foreground">
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
          Every completed order → <span className="font-semibold">+{COIN_CONFIG.COINS_PER_ORDER} Coins</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
          {COIN_CONFIG.MINIMUM_REDEMPTION_COINS} Coins → <span className="font-semibold">₹{COIN_CONFIG.MINIMUM_REDEMPTION_COINS} OFF</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
          1 Coin → <span className="font-semibold">₹{COIN_CONFIG.COIN_VALUE_IN_RUPEES}</span>
        </p>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Start earning with your next order.
      </p>
    </div>
  );
}
