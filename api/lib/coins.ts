// ============================================================================
// COIN SERVICE — server-side business logic for Food Factory Coins.
// All coin operations (earning, redemption, reversal, admin adjustment) go
// through this module. Uses the Supabase service-role client for full access.
//
// Idempotency is enforced via unique constraints on coin_transactions:
//   @@unique([referenceType, referenceId, type])
// Duplicate inserts are caught and treated as "already processed".
// ============================================================================

import { getServerSupabase } from "./supabase";
import { hasServiceRoleKey } from "./env";
import { createUserScopedClient } from "./identity";

// ---------------------------------------------------------------------------
// Client selection.
// With a service-role key the server bypasses RLS (the intended design).
// Without one, customer-facing reads fall back to a user-scoped client that
// carries the caller's JWT, satisfying the `auth.uid() = id` RLS policies so
// the wallet still shows the customer's OWN rows.
// ---------------------------------------------------------------------------

function clientForAccess(accessToken?: string) {
  if (hasServiceRoleKey()) return getServerSupabase();
  if (accessToken) return createUserScopedClient(accessToken);
  return getServerSupabase();
}

// ---------------------------------------------------------------------------
// Configuration (duplicated here to avoid importing client code in server)
// ---------------------------------------------------------------------------

const COINS_PER_ORDER = 10;
const COIN_VALUE_IN_RUPEES = 1;
const MINIMUM_REDEMPTION_COINS = 100;
const MAX_REDEMPTION_PER_ORDER = 100;

const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CoinBalanceResult {
  balance: number;
  rupeeValue: number;
  minimumRedemption: number;
  canRedeem: boolean;
  nextRewardCoins: number;
  coinsToNextReward: number;
}

export interface CoinEarningResult {
  success: boolean;
  alreadyProcessed: boolean;
  coinsEarned: number;
  newBalance: number;
}

export interface CoinRedemptionResult {
  success: boolean;
  redemptionId: string;
  coinsUsed: number;
  discountAmount: number;
  newBalance: number;
}

export interface CoinTransactionRow {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_type: string;
  reference_id: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helper: check if an order is eligible for coin reward
// ---------------------------------------------------------------------------

export function isEligibleForCoinReward(order: {
  status: string;
  user_id: string | null;
}): boolean {
  return order.status === "completed" && !!order.user_id;
}

// ---------------------------------------------------------------------------
// earnCoinsForCompletedOrder — the core earning function
// ---------------------------------------------------------------------------

export async function earnCoinsForCompletedOrder(
  orderId: string,
): Promise<CoinEarningResult> {
  const supabase = getServerSupabase();

  // 1. Fetch order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, user_id, order_number")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    console.error("[COIN_EARN] Order not found:", orderId);
    return { success: false, alreadyProcessed: false, coinsEarned: 0, newBalance: 0 };
  }

  // 2. Validate eligibility
  if (!isEligibleForCoinReward(order)) {
    return { success: true, alreadyProcessed: false, coinsEarned: 0, newBalance: 0 };
  }

  const userId = order.user_id as string;

  // 3. Fetch current user balance
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, coin_balance")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !user) {
    console.error("[COIN_EARN] User not found:", userId);
    return { success: false, alreadyProcessed: false, coinsEarned: 0, newBalance: 0 };
  }

  const balanceBefore = user.coin_balance || 0;
  const coinsToAward = COINS_PER_ORDER;
  const balanceAfter = balanceBefore + coinsToAward;

  // 4. Create coin transaction (unique constraint enforces idempotency)
  const { error: txError } = await supabase
    .from("coin_transactions")
    .insert({
      user_id: userId,
      type: "ORDER_REWARD",
      amount: coinsToAward,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: `${coinsToAward} Food Factory Coins earned for completed order #${order.order_number}`,
      reference_type: "ORDER",
      reference_id: orderId,
      created_at: nowIso(),
    });

  if (txError) {
    // Unique constraint violation = duplicate reward = already processed
    if (txError.code === "23505") {
      // Fetch the existing transaction to get the balance
      const { data: existingTx } = await supabase
        .from("coin_transactions")
        .select("balance_after")
        .eq("reference_type", "ORDER")
        .eq("reference_id", orderId)
        .eq("type", "ORDER_REWARD")
        .maybeSingle();

      return {
        success: true,
        alreadyProcessed: true,
        coinsEarned: 0,
        newBalance: existingTx?.balance_after ?? balanceBefore,
      };
    }
    console.error("[COIN_EARN] Transaction create error:", txError);
    return { success: false, alreadyProcessed: false, coinsEarned: 0, newBalance: 0 };
  }

  // 5. Update user coin balance
  const { error: balanceError } = await supabase
    .from("users")
    .update({ coin_balance: balanceAfter })
    .eq("id", userId);

  if (balanceError) {
    console.error("[COIN_EARN] Balance update error:", balanceError);
    // Transaction was created but balance not updated — flag for admin review
    return { success: false, alreadyProcessed: false, coinsEarned: 0, newBalance: 0 };
  }

  console.log(`[COIN_EARNED] User ${userId} earned ${coinsToAward} coins for order ${orderId}. Balance: ${balanceBefore} -> ${balanceAfter}`);

  return {
    success: true,
    alreadyProcessed: false,
    coinsEarned: coinsToAward,
    newBalance: balanceAfter,
  };
}

// ---------------------------------------------------------------------------
// reverseCoinsForOrder — reverse coins when an order is refunded/cancelled
// ---------------------------------------------------------------------------

export async function reverseCoinsForOrder(
  orderId: string,
  reason: string,
): Promise<{ success: boolean; reversed: number; newBalance: number }> {
  const supabase = getServerSupabase();

  // Find the original reward transaction
  const { data: originalTx } = await supabase
    .from("coin_transactions")
    .select("id, user_id, amount, balance_after")
    .eq("reference_type", "ORDER")
    .eq("reference_id", orderId)
    .eq("type", "ORDER_REWARD")
    .maybeSingle();

  if (!originalTx) {
    return { success: true, reversed: 0, newBalance: 0 };
  }

  // Check if reversal already exists
  const { data: existingReversal } = await supabase
    .from("coin_transactions")
    .select("id")
    .eq("reference_type", "ORDER")
    .eq("reference_id", orderId)
    .eq("type", "REVERSAL")
    .maybeSingle();

  if (existingReversal) {
    return { success: true, reversed: 0, newBalance: originalTx.balance_after };
  }

  const userId = originalTx.user_id;
  const coinsToReverse = originalTx.amount;

  // Fetch current balance
  const { data: user } = await supabase
    .from("users")
    .select("coin_balance")
    .eq("id", userId)
    .maybeSingle();

  const currentBalance = user?.coin_balance || 0;
  const balanceAfter = Math.max(0, currentBalance - coinsToReverse);

  // Create reversal transaction
  const { error: txError } = await supabase
    .from("coin_transactions")
    .insert({
      user_id: userId,
      type: "REVERSAL",
      amount: -coinsToReverse,
      balance_before: currentBalance,
      balance_after: balanceAfter,
      description: reason,
      reference_type: "ORDER",
      reference_id: orderId,
      created_at: nowIso(),
    });

  if (txError) {
    if (txError.code === "23505") {
      return { success: true, reversed: 0, newBalance: currentBalance };
    }
    console.error("[COIN_REVERSE] Transaction error:", txError);
    return { success: false, reversed: 0, newBalance: currentBalance };
  }

  // Update balance
  await supabase
    .from("users")
    .update({ coin_balance: balanceAfter })
    .eq("id", userId);

  console.log(`[COIN_REVERSED] User ${userId} reversed ${coinsToReverse} coins for order ${orderId}. Balance: ${currentBalance} -> ${balanceAfter}`);

  return { success: true, reversed: coinsToReverse, newBalance: balanceAfter };
}

// ---------------------------------------------------------------------------
// getCoinBalance — fetch a user's coin wallet info
// ---------------------------------------------------------------------------

export async function getCoinBalance(userId: string, accessToken?: string): Promise<CoinBalanceResult> {
  const supabase = clientForAccess(accessToken);

  const { data: user } = await supabase
    .from("users")
    .select("coin_balance")
    .eq("id", userId)
    .maybeSingle();

  const balance = user?.coin_balance || 0;
  const rupeeValue = balance * COIN_VALUE_IN_RUPEES;
  const canRedeem = balance >= MINIMUM_REDEMPTION_COINS;

  // Progress to next reward
  const nextRewardCoins = MINIMUM_REDEMPTION_COINS;
  const coinsToNextReward = canRedeem ? 0 : nextRewardCoins - balance;

  return {
    balance,
    rupeeValue,
    minimumRedemption: MINIMUM_REDEMPTION_COINS,
    canRedeem,
    nextRewardCoins,
    coinsToNextReward,
  };
}

// ---------------------------------------------------------------------------
// getCoinTransactions — paginated transaction history
// ---------------------------------------------------------------------------

export async function getCoinTransactions(
  userId: string,
  page = 1,
  limit = 20,
  accessToken?: string,
): Promise<{ transactions: CoinTransactionRow[]; total: number }> {
  const supabase = clientForAccess(accessToken);
  const offset = (page - 1) * limit;

  const [txResult, countResult] = await Promise.all([
    supabase
      .from("coin_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1),
    supabase
      .from("coin_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  return {
    transactions: (txResult.data || []) as CoinTransactionRow[],
    total: countResult.count || 0,
  };
}

// ---------------------------------------------------------------------------
// validateRedemption — check if a user can redeem coins
// ---------------------------------------------------------------------------

export async function validateRedemption(userId: string, accessToken?: string): Promise<{
  eligible: boolean;
  coinsAvailable: number;
  coinsToUse: number;
  discountAmount: number;
}> {
  const wallet = await getCoinBalance(userId, accessToken);

  if (!wallet.canRedeem) {
    return {
      eligible: false,
      coinsAvailable: wallet.balance,
      coinsToUse: 0,
      discountAmount: 0,
    };
  }

  const coinsToUse = Math.min(wallet.balance, MAX_REDEMPTION_PER_ORDER);
  const discountAmount = coinsToUse * COIN_VALUE_IN_RUPEES;

  return {
    eligible: true,
    coinsAvailable: wallet.balance,
    coinsToUse,
    discountAmount,
  };
}

// ---------------------------------------------------------------------------
// redeemCoins — deduct coins and create a redemption record
// ---------------------------------------------------------------------------

export async function redeemCoins(
  userId: string,
  orderSubtotal: number,
): Promise<CoinRedemptionResult> {
  const supabase = getServerSupabase();

  // Fetch current balance
  const { data: user } = await supabase
    .from("users")
    .select("id, coin_balance")
    .eq("id", userId)
    .maybeSingle();

  if (!user) {
    return { success: false, redemptionId: "", coinsUsed: 0, discountAmount: 0, newBalance: 0 };
  }

  const currentBalance = user.coin_balance || 0;

  // Validate minimum
  if (currentBalance < MINIMUM_REDEMPTION_COINS) {
    return { success: false, redemptionId: "", coinsUsed: 0, discountAmount: 0, newBalance: currentBalance };
  }

  // Calculate redemption amount
  let coinsToUse = Math.min(currentBalance, MAX_REDEMPTION_PER_ORDER);
  // Don't discount more than the subtotal
  const maxDiscountFromSubtotal = Math.floor(orderSubtotal);
  coinsToUse = Math.min(coinsToUse, maxDiscountFromSubtotal);
  const discountAmount = coinsToUse * COIN_VALUE_IN_RUPEES;

  if (coinsToUse < MINIMUM_REDEMPTION_COINS) {
    return { success: false, redemptionId: "", coinsUsed: 0, discountAmount: 0, newBalance: currentBalance };
  }

  const balanceAfter = currentBalance - coinsToUse;

  // Create redemption record
  const { data: redemption, error: redemptionError } = await supabase
    .from("coin_redemptions")
    .insert({
      user_id: userId,
      coins_used: coinsToUse,
      discount_amount: discountAmount,
      status: "PENDING",
      created_at: nowIso(),
    })
    .select("id")
    .maybeSingle();

  if (redemptionError || !redemption) {
    console.error("[COIN_REDEEM] Redemption create error:", redemptionError);
    return { success: false, redemptionId: "", coinsUsed: 0, discountAmount: 0, newBalance: currentBalance };
  }

  // Create coin transaction
  const { error: txError } = await supabase
    .from("coin_transactions")
    .insert({
      user_id: userId,
      type: "REDEMPTION",
      amount: -coinsToUse,
      balance_before: currentBalance,
      balance_after: balanceAfter,
      description: `Redeemed ${coinsToUse} Food Factory Coins for ₹${discountAmount} discount`,
      reference_type: "REDEMPTION",
      reference_id: redemption.id,
      created_at: nowIso(),
    });

  if (txError) {
    if (txError.code === "23505") {
      // Already redeemed — return the existing redemption
      const { data: existingTx } = await supabase
        .from("coin_transactions")
        .select("balance_after")
        .eq("reference_type", "REDEMPTION")
        .eq("reference_id", redemption.id)
        .eq("type", "REDEMPTION")
        .maybeSingle();

      return {
        success: true,
        redemptionId: redemption.id,
        coinsUsed: coinsToUse,
        discountAmount,
        newBalance: existingTx?.balance_after ?? balanceAfter,
      };
    }
    console.error("[COIN_REDEEM] Transaction error:", txError);
    // Rollback: delete the redemption record
    await supabase.from("coin_redemptions").delete().eq("id", redemption.id);
    return { success: false, redemptionId: "", coinsUsed: 0, discountAmount: 0, newBalance: currentBalance };
  }

  // Update balance
  const { error: balanceError } = await supabase
    .from("users")
    .update({ coin_balance: balanceAfter })
    .eq("id", userId);

  if (balanceError) {
    console.error("[COIN_REDEEM] Balance update error:", balanceError);
    return { success: false, redemptionId: "", coinsUsed: 0, discountAmount: 0, newBalance: currentBalance };
  }

  console.log(`[COIN_REDEEMED] User ${userId} redeemed ${coinsToUse} coins. Balance: ${currentBalance} -> ${balanceAfter}`);

  return {
    success: true,
    redemptionId: redemption.id,
    coinsUsed: coinsToUse,
    discountAmount,
    newBalance: balanceAfter,
  };
}

// ---------------------------------------------------------------------------
// redeemCoinsAtomicForOrder — atomically deduct coins for a zero-value order.
// Calls the ff_redeem_coins RPC (SECURITY DEFINER, row-locked) through a
// user-scoped client, so auth.uid() resolves to the caller and the deduction,
// redemption + ledger write happen in ONE database transaction.
// ---------------------------------------------------------------------------

export interface AtomicRedemptionResult {
  success: boolean;
  newBalance: number;
  code?: string;
}

const RPC_SENTINELS = [
  "NOT_AUTHENTICATED",
  "FORBIDDEN",
  "INVALID_COINS",
  "USER_NOT_FOUND",
  "INSUFFICIENT_BALANCE",
  "ALREADY_REDEEMED",
];

export function coinFailureMessage(code?: string): string {
  switch (code) {
    case "INSUFFICIENT_BALANCE":
      return "Your coin balance changed before checkout. Refresh and try again.";
    case "ALREADY_REDEEMED":
      return "These Food Factory Coins were already used for this order.";
    case "USER_NOT_FOUND":
      return "We couldn't find your account while applying coins.";
    case "FORBIDDEN":
    case "NOT_AUTHENTICATED":
      return "Please sign in again to pay with Food Factory Coins.";
    default:
      return "Food Factory Coins could not be applied. Please try again.";
  }
}

export async function redeemCoinsAtomicForOrder(input: {
  accessToken: string;
  userId: string;
  coinsToUse: number;
  orderId: string;
  orderNumber: string;
  discountAmount: number;
}): Promise<AtomicRedemptionResult> {
  try {
    const scoped = createUserScopedClient(input.accessToken);
    const { data, error } = await scoped.rpc("ff_redeem_coins", {
      p_user_id: input.userId,
      p_coins: input.coinsToUse,
      p_order_id: input.orderId,
      p_order_number: input.orderNumber,
      p_discount_amount: input.discountAmount,
    });
    if (error) {
      const raw = String(error.message ?? error.code ?? "");
      const code = RPC_SENTINELS.includes(raw) ? raw : "REDEMPTION_FAILED";
      return { success: false, newBalance: 0, code };
    }
    if (typeof data !== "number") {
      return { success: false, newBalance: 0, code: "REDEMPTION_FAILED" };
    }
    return { success: true, newBalance: data };
  } catch (err) {
    return {
      success: false,
      newBalance: 0,
      code: err instanceof Error ? err.message : "REDEMPTION_FAILED",
    };
  }
}

/**
 * Idempotent, atomic coin redemption for an ONLINE-gated (Razorpay-settled)
 * order. Runs under the SERVER's service-role key via ff_redeem_coins_service
 * (SECURITY DEFINER, row-locked, one REDEMPTION per order) — so concurrent
 * verify-payment + webhook calls can never deduct the wallet twice.
 *
 * All inputs come from the authoritative payment snapshot captured at checkout
 * (NOT recomputed from the live wallet or the browser). 1 coin = ₹1.
 *
 * Returns the post-redemption balance, or { success: false, code } when the
 * wallet could not cover the snapshot amount (e.g. an order settled after the
 * balance was spent elsewhere) or the order was already redeemed.
 */
export async function redeemCoinsForPlacedOrder(input: {
  userId: string;
  coinsToUse: number;
  orderId: string;
  orderNumber: string;
  discountAmount: number;
}): Promise<AtomicRedemptionResult> {
  const coinsToUse = Math.floor(input.coinsToUse);
  if (!input.userId || coinsToUse <= 0) {
    return { success: false, newBalance: 0, code: "INVALID_COINS" };
  }
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase.rpc("ff_redeem_coins_service", {
      p_user_id: input.userId,
      p_coins: coinsToUse,
      p_order_id: input.orderId,
      p_order_number: input.orderNumber,
      p_discount_amount: input.discountAmount,
    });
    if (error) {
      const raw = String(error.message ?? error.code ?? "");
      const code = RPC_SENTINELS.includes(raw) ? raw : "REDEMPTION_FAILED";
      return { success: false, newBalance: 0, code };
    }
    if (typeof data !== "number") {
      return { success: false, newBalance: 0, code: "REDEMPTION_FAILED" };
    }
    return { success: true, newBalance: data };
  } catch (err) {
    return {
      success: false,
      newBalance: 0,
      code: err instanceof Error ? err.message : "REDEMPTION_FAILED",
    };
  }
}

// ---------------------------------------------------------------------------
// confirmRedemption — mark redemption as APPLIED after order is created
// ---------------------------------------------------------------------------

export async function confirmRedemption(
  redemptionId: string,
  orderId: string,
): Promise<void> {
  const supabase = getServerSupabase();
  await supabase
    .from("coin_redemptions")
    .update({ order_id: orderId, status: "APPLIED" })
    .eq("id", redemptionId)
    .eq("status", "PENDING");
}

// ---------------------------------------------------------------------------
// cancelRedemption — refund coins if order creation fails
// ---------------------------------------------------------------------------

export async function cancelRedemption(
  redemptionId: string,
): Promise<{ refunded: number; newBalance: number }> {
  const supabase = getServerSupabase();

  // Fetch the redemption
  const { data: redemption } = await supabase
    .from("coin_redemptions")
    .select("id, user_id, coins_used, status")
    .eq("id", redemptionId)
    .maybeSingle();

  if (!redemption || redemption.status !== "PENDING") {
    return { refunded: 0, newBalance: 0 };
  }

  const userId = redemption.user_id;
  const coinsToRefund = redemption.coins_used;

  // Fetch current balance
  const { data: user } = await supabase
    .from("users")
    .select("coin_balance")
    .eq("id", userId)
    .maybeSingle();

  const currentBalance = user?.coin_balance || 0;
  const balanceAfter = currentBalance + coinsToRefund;

  // Create refund transaction
  await supabase.from("coin_transactions").insert({
    user_id: userId,
    type: "REFUND",
    amount: coinsToRefund,
    balance_before: currentBalance,
    balance_after: balanceAfter,
    description: `Coins refunded for cancelled redemption`,
    reference_type: "REDEMPTION",
    reference_id: redemptionId,
    created_at: nowIso(),
  });

  // Update balance
  await supabase
    .from("users")
    .update({ coin_balance: balanceAfter })
    .eq("id", userId);

  // Mark redemption as cancelled
  await supabase
    .from("coin_redemptions")
    .update({ status: "CANCELLED" })
    .eq("id", redemptionId);

  console.log(`[COIN_REFUND] User ${userId} refunded ${coinsToRefund} coins. Balance: ${currentBalance} -> ${balanceAfter}`);

  return { refunded: coinsToRefund, newBalance: balanceAfter };
}

// ---------------------------------------------------------------------------
// adminAdjustCoins — manual coin adjustment by admin
// ---------------------------------------------------------------------------

export async function adminAdjustCoins(
  userId: string,
  amount: number,
  reason: string,
): Promise<{ success: boolean; newBalance: number }> {
  const supabase = getServerSupabase();

  if (!reason || reason.trim().length === 0) {
    return { success: false, newBalance: 0 };
  }

  // Fetch current balance
  const { data: user } = await supabase
    .from("users")
    .select("id, coin_balance")
    .eq("id", userId)
    .maybeSingle();

  if (!user) {
    return { success: false, newBalance: 0 };
  }

  const currentBalance = user.coin_balance || 0;
  const balanceAfter = Math.max(0, currentBalance + amount);

  // Prevent negative balance
  if (balanceAfter < 0) {
    return { success: false, newBalance: currentBalance };
  }

  // Create transaction
  const { error: txError } = await supabase
    .from("coin_transactions")
    .insert({
      user_id: userId,
      type: "ADMIN_ADJUSTMENT",
      amount,
      balance_before: currentBalance,
      balance_after: balanceAfter,
      description: `Admin adjustment: ${reason}`,
      reference_type: "ADMIN",
      reference_id: null,
      created_at: nowIso(),
    });

  if (txError) {
    console.error("[COIN_ADMIN] Transaction error:", txError);
    return { success: false, newBalance: currentBalance };
  }

  // Update balance
  await supabase
    .from("users")
    .update({ coin_balance: balanceAfter })
    .eq("id", userId);

  console.log(`[COIN_ADMIN_ADJUSTMENT] User ${userId} adjusted by ${amount} coins. Balance: ${currentBalance} -> ${balanceAfter}. Reason: ${reason}`);

  return { success: true, newBalance: balanceAfter };
}

// ---------------------------------------------------------------------------
// adminGetAllCoins — aggregate stats for admin dashboard
// ---------------------------------------------------------------------------

export async function adminGetAllCoins(): Promise<{
  totalIssued: number;
  totalRedeemed: number;
  activeBalance: number;
  issuedToday: number;
  redeemedToday: number;
  participatingCustomers: number;
}> {
  const supabase = getServerSupabase();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [totalIssuedResult, totalRedeemedResult, activeResult, issuedTodayResult, redeemedTodayResult, customersResult] = await Promise.all([
    supabase
      .from("coin_transactions")
      .select("amount", { count: "exact" })
      .eq("type", "ORDER_REWARD"),
    supabase
      .from("coin_transactions")
      .select("amount", { count: "exact" })
      .eq("type", "REDEMPTION"),
    supabase
      .from("users")
      .select("coin_balance"),
    supabase
      .from("coin_transactions")
      .select("amount", { count: "exact" })
      .eq("type", "ORDER_REWARD")
      .gte("created_at", todayIso),
    supabase
      .from("coin_transactions")
      .select("amount", { count: "exact" })
      .eq("type", "REDEMPTION")
      .gte("created_at", todayIso),
    supabase
      .from("users")
      .select("id", { count: "exact" })
      .gt("coin_balance", 0),
  ]);

  const totalIssued = (totalIssuedResult.data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalRedeemed = Math.abs((totalRedeemedResult.data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0));
  const activeBalance = (activeResult.data || []).reduce((sum, u) => sum + (u.coin_balance || 0), 0);
  const issuedToday = (issuedTodayResult.data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const redeemedToday = Math.abs((redeemedTodayResult.data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0));
  const participatingCustomers = customersResult.count || 0;

  return {
    totalIssued,
    totalRedeemed,
    activeBalance,
    issuedToday,
    redeemedToday,
    participatingCustomers,
  };
}

// ---------------------------------------------------------------------------
// adminGetCustomerCoins — get a specific customer's coin details
// ---------------------------------------------------------------------------

export async function adminGetCustomerCoins(userId: string): Promise<{
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  transactions: CoinTransactionRow[];
} | null> {
  const supabase = getServerSupabase();

  const { data: user } = await supabase
    .from("users")
    .select("id, coin_balance")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return null;

  const [earnedResult, redeemedResult, txResult] = await Promise.all([
    supabase
      .from("coin_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "ORDER_REWARD"),
    supabase
      .from("coin_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "REDEMPTION"),
    supabase
      .from("coin_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const lifetimeEarned = (earnedResult.data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const lifetimeRedeemed = Math.abs((redeemedResult.data || []).reduce((sum, tx) => sum + (tx.amount || 0), 0));

  return {
    balance: user.coin_balance || 0,
    lifetimeEarned,
    lifetimeRedeemed,
    transactions: (txResult.data || []) as CoinTransactionRow[],
  };
}
