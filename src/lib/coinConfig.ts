// ============================================================================
// COIN CONFIGURATION — central source of truth for all loyalty rules.
// Changing these values automatically adjusts earning/redemption behaviour
// without touching business logic.
// ============================================================================

export const COIN_CONFIG = {
  /** Number of coins awarded per eligible completed order. */
  COINS_PER_ORDER: 10,

  /** Value of one coin in rupees. 1 coin = ₹1. */
  COIN_VALUE_IN_RUPEES: 1,

  /** Minimum coins required to redeem a reward. */
  MINIMUM_REDEMPTION_COINS: 100,

  /** Maximum coins that can be redeemed per order. */
  MAX_REDEMPTION_PER_ORDER: 100,
} as const;

/** Types of coin transactions. */
export type CoinTransactionType =
  | "ORDER_REWARD"
  | "REDEMPTION"
  | "ADMIN_ADJUSTMENT"
  | "REFUND"
  | "REVERSAL"
  | "BONUS";

/** Reference types for coin transactions. */
export type CoinReferenceType = "ORDER" | "REDEMPTION" | "ADMIN" | "SYSTEM";

/** Redemption statuses. */
export type CoinRedemptionStatus = "PENDING" | "APPLIED" | "CANCELLED" | "REFUNDED";
