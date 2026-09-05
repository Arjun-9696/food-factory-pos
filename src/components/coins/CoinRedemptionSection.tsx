// ============================================================================
// CoinRedemptionSection — checkout widget lets an authenticated customer opt in
// to redeeming Food Factory Coins against the current order. Mounted only when
// a user is signed in, so guest sessions never run wallet queries.
// ============================================================================
import { useEffect } from "react";
import { useCoinWallet } from "@/hooks/useCoins";
import { COIN_CONFIG } from "@/lib/coinConfig";

const MAX_REDEMPTION_RUPEES = COIN_CONFIG.MAX_REDEMPTION_PER_ORDER;

interface CoinRedemptionSectionProps {
  subtotal: number;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onDiscountChange: (discount: number) => void;
}

export function CoinRedemptionSection({
  subtotal,
  enabled,
  onEnabledChange,
  onDiscountChange,
}: CoinRedemptionSectionProps) {
  const { data: coinWallet } = useCoinWallet();

  const balance = coinWallet?.balance ?? 0;
  const rupeeValue = coinWallet?.rupeeValue ?? 0;
  // Server-authoritative gate: coin redemption requires a minimum balance on
  // the wallet (api/lib/coins.ts MINIMUM_REDEMPTION_COINS). We mirror it so the
  // UI never promises a discount the server will refuse.
  const canRedeem = coinWallet?.canRedeem ?? false;
  const coinsToNext = coinWallet?.coinsToNextReward ?? 0;
  const expectedDiscount = enabled && canRedeem
    ? Math.min(balance, MAX_REDEMPTION_RUPEES, Math.max(0, subtotal))
    : 0;

  // Report the expected discount upward so the bill break-down can show it.
  useEffect(() => {
    onDiscountChange(expectedDiscount);
  }, [expectedDiscount, onDiscountChange]);

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 transition-colors ${
        enabled && canRedeem
          ? "border-orange-400/60 bg-orange-500/5"
          : "border-border/50 bg-secondary/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold">🪙</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Redeem Food Factory Coins</p>
            <p className="text-xs text-muted-foreground">
              Balance: {balance} coins (worth ₹{rupeeValue})
            </p>
          </div>
        </div>
        {enabled && canRedeem ? (
          <button
            onClick={() => onEnabledChange(false)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive transition-colors"
          >
            Remove
          </button>
        ) : (
          <button
            onClick={() => onEnabledChange(true)}
            disabled={subtotal <= 0 || !canRedeem}
            className="px-3 py-1.5 rounded-lg cart-gradient text-primary-foreground text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use Coins
          </button>
        )}
      </div>
      {enabled && canRedeem && (
        <p className="text-xs text-foreground">
          Up to {Math.min(balance, MAX_REDEMPTION_RUPEES)} coins (worth ₹
          {Math.min(balance, MAX_REDEMPTION_RUPEES)}) will be deducted from your
          payable amount.
        </p>
      )}
      {!canRedeem && balance > 0 && (
        <p className="text-xs text-muted-foreground">
          Redemption unlocks at {coinWallet?.minimumRedemption ?? COIN_CONFIG.MINIMUM_REDEMPTION_COINS}{" "}
          Coins — {coinsToNext} more to go.
        </p>
      )}
    </div>
  );
}