// ============================================================================
// Settlement-time coin redemption (online-gated / Razorpay-settled orders).
//
// Locks the RULE that a PARTIAL coin payment's coins are deducted AFTER the
// gateway settles, using the AUTHORITATIVE snapshot coin discount (never the
// live wallet or the browser), and that the redemption is idempotent so
// concurrent verify-payment + webhook calls cannot deduct the wallet twice.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  redeemCoinsForPlacedOrder,
} from "../../api/lib/coins";

// ---------------------------------------------------------------------------
// Module mocks — the RPC call is the only network dependency.
// ---------------------------------------------------------------------------

const stubs = vi.hoisted(() => {
  const state = {
    rpcError: null as null | { message?: string; code?: string },
    rpcResult: 40 as number | Error,
    lastRpcFn: null as null | string,
    lastRpcArgs: null as null | Record<string, unknown>,
  };
  return { state };
});

vi.mock("../../api/lib/supabase", () => ({
  getServerSupabase: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      stubs.state.lastRpcFn = fn;
      stubs.state.lastRpcArgs = args;
      if (stubs.state.rpcError) {
        return { data: null, error: stubs.state.rpcError };
      }
      if (stubs.state.rpcResult instanceof Error) throw stubs.state.rpcResult;
      return { data: stubs.state.rpcResult, error: null };
    },
  }),
}));

beforeEach(() => {
  stubs.state.rpcError = null;
  stubs.state.rpcResult = 40;
  stubs.state.lastRpcFn = null;
  stubs.state.lastRpcArgs = null;
});

describe("redeemCoinsForPlacedOrder — authoritative, idempotent settlement redemption", () => {
  it("calls the service-role RPC with the authoritative snapshot amount (1 coin = ₹1)", async () => {
    const result = await redeemCoinsForPlacedOrder({
      userId: "user-1",
      coinsToUse: 100, // from snapshot.coinDiscount — NOT recomputed from the live wallet
      orderId: "order-1",
      orderNumber: "FF-20260904-0001",
      discountAmount: 100,
    });

    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(40);
    expect(stubs.state.lastRpcFn).toBe("ff_redeem_coins_service");
    expect(stubs.state.lastRpcArgs).toMatchObject({
      p_user_id: "user-1",
      p_coins: 100,
      p_order_id: "order-1",
      p_order_number: "FF-20260904-0001",
      p_discount_amount: 100,
    });
  });

  it("passes a non-integer authoritative coin amount floored to whole coins", async () => {
    await redeemCoinsForPlacedOrder({
      userId: "user-1",
      coinsToUse: 100.9,
      orderId: "order-1",
      orderNumber: "FF-1",
      discountAmount: 100.9,
    });
    expect(stubs.state.lastRpcArgs.p_coins).toBe(100);
  });

  it("rejects a non-positive authoritative amount without calling the network", async () => {
    const result = await redeemCoinsForPlacedOrder({
      userId: "user-1",
      coinsToUse: 0,
      orderId: "order-1",
      orderNumber: "FF-1",
      discountAmount: 0,
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_COINS");
    expect(stubs.state.lastRpcArgs).toBeNull();
  });

  it("maps the RPC idempotency guard (already redeemed) to a failure code, never a deduction", async () => {
    stubs.state.rpcError = { message: "ALREADY_REDEEMED" };
    const result = await redeemCoinsForPlacedOrder({
      userId: "user-1",
      coinsToUse: 100,
      orderId: "order-1",
      orderNumber: "FF-1",
      discountAmount: 100,
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe("ALREADY_REDEEMED");
  });

  it("maps an insufficient-balance rejection (balance changed at checkout) to a clear code", async () => {
    stubs.state.rpcError = { message: "INSUFFICIENT_BALANCE" };
    const result = await redeemCoinsForPlacedOrder({
      userId: "user-1",
      coinsToUse: 100,
      orderId: "order-1",
      orderNumber: "FF-1",
      discountAmount: 100,
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe("INSUFFICIENT_BALANCE");
  });
});
