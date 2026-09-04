// ============================================================================
// Coin checkout integration flow — locks down the RULE that Razorpay is only
// ever involved when the server-calculated amount is positive, and that the
// server is the source of truth for coin math, ordering, and idempotency:
//
//   * coins fully cover the order (+ GST = 0)  → order placed, coins redeemed
//     atomically, paymentRequired FALSE, NO Razorpay order is created.
//   * coins partially cover the order          → Razorpay order is created for
//     exactly the server-computed remainder; coins are committed only at
//     settlement (NOT at create).
//   * no coins                                  → Razorpay order for the full
//     server amount (₹60 subtotal → ₹63 with 5% GST — the exact amount the
//     user reported when their running server never applied the coins).
//   * replayed paid coin transaction           → idempotent: same response,
//     NO second redemption, NO Razorpay order.
// ============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PassThrough } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import handler from "../../api/create-order";
import type { ServerPricedItem } from "../../api/lib/amounts";

const P60 = "00000000-0000-4000-8000-000000000001"; // ₹60
const P100 = "00000000-0000-4000-8000-000000000002"; // ₹100
const P150 = "00000000-0000-4000-8000-000000000003"; // ₹150
const TID = "testtxn-0001";

const VALID_ADDRESS = {
  houseNumber: "12",
  street: "Main Road",
  area: "Hebbal",
  city: "Bengaluru",
  state: "Karnataka",
  postalCode: "560024",
  country: "India",
  latitude: null,
  longitude: null,
  fullAddress: "12, Main Road, Hebbal, Bengaluru, Karnataka, 560024, India",
};

const productsByName = (name: string, price: number) => ({
  data: [
    {
      id: name === "P60" ? P60 : name === "P100" ? P100 : P150,
      name,
      price,
      available: true,
      category: "test",
    },
  ],
  error: null,
});

// ---------------------------------------------------------------------------
// Module mocks — everything networked is replaced with deterministic stubs.
// ---------------------------------------------------------------------------

const stubs = vi.hoisted(() => {
  const state = {
    productsResult: { data: null, error: null } as unknown,
    existingRecord: null as unknown,
    redemption: { success: true, redemptionId: "r1", coinsUsed: 60, discountAmount: 60, newBalance: 40 },
    redemptionInput: null as unknown,
    createdRazorpayOrders: [] as Array<{ amount?: unknown; currency?: unknown }>,
  };
  return { state };
});

type QueryChain = (() => unknown) & Record<string, (...args: never[]) => unknown>;

function chain(final: unknown): unknown {
  const target: QueryChain = () => final;
  target.then = (onFulfilled: (v: unknown) => unknown) => onFulfilled(final);
  const methods = [
    "select", "eq", "in", "is", "order", "or", "limit", "range",
    "update", "insert", "delete", "match", "not", "neq",
  ];
  for (const m of methods) target[m] = () => target;
  target.maybeSingle = () => target;
  target.single = () => target;
  return target;
}

vi.mock("../../api/lib/supabase", () => ({
  getServerSupabase: () => ({ from: () => chain(stubs.state.productsResult) }),
}));

vi.mock("../../api/lib/razorpay", async (importActual) => {
  const actual = await importActual<typeof import("../../api/lib/razorpay")>();
  return {
    ...actual,
    getRazorpay: () => ({
      orders: {
        create: (opts: { amount?: unknown; currency?: unknown }) => {
          stubs.state.createdRazorpayOrders.push(opts);
          return Promise.resolve({
            id: "rzp_test_0001",
            amount: opts.amount,
            currency: opts.currency,
            notes: {},
          });
        },
      },
    }),
  };
});

vi.mock("../../api/lib/payments", () => ({
  findPaymentByTransactionId: async () => stubs.state.existingRecord,
  createPaymentRecord: async (record: Record<string, unknown>) => ({
    id: "pr-1",
    transaction_id: String(record.transactionId),
    razorpay_order_id: String(record.razorpayOrderId ?? null),
    razorpay_payment_id: null,
    razorpay_signature: null,
    ff_order_number: null,
    amount_paise: Number(record.amountPaise),
    amount_rupees: Number(record.amountRupees),
    currency: "INR",
    payment_status: "pending",
    customer_name: null,
    customer_phone: null,
    snapshot: null,
    delivery_address: null,
    metadata: {},
    paid_at: null,
    whatsapp_invoice_status: null,
    whatsapp_message_id: null,
    invoice_sent_at: null,
  }),
  buildPaymentSnapshot: (items: ServerPricedItem[], amounts: Record<string, number>) => ({
    currency: "INR",
    items,
    subtotal: amounts.subtotal,
    discount: amounts.discount,
    coinDiscount: amounts.coinDiscount,
    gst: amounts.gst,
    delivery: amounts.delivery,
    grandTotal: amounts.grandTotal,
  }),
  generateOrderNumber: () => "FF-20260901-ABC1",
  ensureOrderRowWithItems: async () => ({ id: "order-uuid-1", order_number: "FF-20260901-ABC1" }),
}));

vi.mock("../../api/lib/coins", () => ({
  validateRedemption: vi.fn(async () => ({
    eligible: true,
    coinsAvailable: 100,
    coinsToUse: 100,
    discountAmount: 100,
  })),
  redeemCoinsAtomicForOrder: vi.fn(async (input: Record<string, unknown>) => {
    stubs.state.redemptionInput = input;
    return stubs.state.redemption;
  }),
  coinFailureMessage: (code?: string) => `Coins could not be applied (${code}). Please try again.`,
}));

vi.mock("../../api/lib/identity", () => {
  const identityState = {
    override: null as null | { authenticated: boolean; userId?: string; name?: string; phone?: string; accessToken?: string },
  };
  return {
    __identityState: identityState,
    resolveIdentity: async () => identityState.override ?? {
      authenticated: true,
      userId: "user-1",
      name: "Test Customer",
      phone: "9999999999",
      accessToken: "jwt-token",
    },
    createUserScopedClient: () => ({ from: () => chain({ data: null, error: null }) }),
  };
});

// ---------------------------------------------------------------------------
// Harness — runs the raw handler against a fake req/res pair.
// ---------------------------------------------------------------------------

async function run(body: Record<string, unknown>): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  const req = new PassThrough() as unknown as IncomingMessage;
  req.method = "POST";
  req.headers = { "content-type": "application/json" };
  const captured: { statusCode?: number; body?: string } = {};
  const res = {
    setHeader: () => undefined,
    writeHead: (statusCode: number) => {
      captured.statusCode = statusCode;
    },
    end: (payload?: string) => {
      captured.body = payload;
    },
  } as unknown as ServerResponse;
  const pending = handler(req, res);
  req.end(JSON.stringify(body));
  await pending;
  return {
    statusCode: captured.statusCode ?? 0,
    body: captured.body ? (JSON.parse(captured.body) as Record<string, unknown>) : {},
  };
}

const baseBody = (items: Array<{ productId: string; quantity: number }>) => ({
  transactionId: TID,
  items,
  customerName: "Test Customer",
  customerPhone: "9999999999",
  accessToken: "jwt-token",
  deliveryAddress: VALID_ADDRESS,
});

beforeEach(async () => {
  stubs.state.productsResult = { data: null, error: null };
  stubs.state.existingRecord = null;
  stubs.state.redemption = { success: true, redemptionId: "r1", coinsUsed: 60, discountAmount: 60, newBalance: 40 };
  stubs.state.redemptionInput = null;
  stubs.state.createdRazorpayOrders = [];

  const identity = await import("../../api/lib/identity");
  identity.__identityState.override = null;

  const coins = await import("../../api/lib/coins");
  vi.mocked(coins.validateRedemption).mockReset();
  vi.mocked(coins.validateRedemption).mockResolvedValue({
    eligible: true,
    coinsAvailable: 100,
    coinsToUse: 100,
    discountAmount: 100,
  });
  vi.mocked(coins.redeemCoinsAtomicForOrder).mockReset();
  vi.mocked(coins.redeemCoinsAtomicForOrder).mockImplementation(async (input) => {
    stubs.state.redemptionInput = input;
    return stubs.state.redemption;
  });
  vi.clearAllMocks();
});

describe("Food Factory Coins checkout — Razorpay involvement is server-controlled", () => {
  it("fully covered (₹60 order, 60 coins available) → order placed, PaymentRequired FALSE, NO Razorpay", async () => {
    stubs.state.productsResult = productsByName("P60", 60);
    vi.mocked((await import("../../api/lib/coins")).validateRedemption).mockResolvedValue({
      eligible: true,
      coinsAvailable: 100,
      coinsToUse: 60,
      discountAmount: 60,
    });

    const { statusCode, body } = await run({
      ...baseBody([{ productId: P60, quantity: 1 }]),
      useCoins: true,
    });

    expect(statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.alreadyPaid).toBe(true);
    expect(body.paymentRequired).toBe(false);
    expect(body.paymentMethod).toBe("FOOD_FACTORY_COINS");
    expect(body.orderNumber).toBeTruthy();
    expect(body.amount).toBe(0);
    expect(body.coinsUsed).toBe(60);
    expect(body.remainingCoinBalance).toBe(40);

    // THE core rule: no Razorpay order may ever be created.
    expect(stubs.state.createdRazorpayOrders).toHaveLength(0);
    // Coins redeemed atomically against the placed order.
    expect(stubs.state.redemptionInput).toMatchObject({ userId: "user-1", coinsToUse: 60 });
  });

  it("fully covered (₹100 order, 100 coins) → zero payable, PaymentRequired FALSE, NO Razorpay", async () => {
    stubs.state.productsResult = productsByName("P100", 100);
    vi.mocked((await import("../../api/lib/coins")).validateRedemption).mockResolvedValue({
      eligible: true,
      coinsAvailable: 100,
      coinsToUse: 100,
      discountAmount: 100,
    });
    stubs.state.redemption = { success: true, redemptionId: "r2", coinsUsed: 100, discountAmount: 100, newBalance: 0 };

    const { statusCode, body } = await run({
      ...baseBody([{ productId: P100, quantity: 1 }]),
      useCoins: true,
    });

    expect(statusCode).toBe(200);
    expect(body.paymentRequired).toBe(false);
    expect(body.amount).toBe(0);
    expect(body.coinsUsed).toBe(100);
    expect(body.remainingCoinBalance).toBe(0);
    expect(stubs.state.createdRazorpayOrders).toHaveLength(0);
  });

  it("partial coverage (₹150 order, 100 coins) → Razorpay for the exact server remainder (₹52.50), coins committed at settlement only", async () => {
    stubs.state.productsResult = productsByName("P150", 150);
    vi.mocked((await import("../../api/lib/coins")).validateRedemption).mockResolvedValue({
      eligible: true,
      coinsAvailable: 100,
      coinsToUse: 100,
      discountAmount: 100,
    });

    const { statusCode, body } = await run({
      ...baseBody([{ productId: P150, quantity: 1 }]),
      useCoins: true,
    });

    expect(statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.alreadyPaid).toBe(false);
    expect(body.paymentRequired).toBe(true);
    expect(body.amount).toBe(5250); // (150 - 100) + 5% GST = ₹52.50
    expect(body.orderId).toBeTruthy();
    expect(stubs.state.createdRazorpayOrders).toHaveLength(1);
    expect(stubs.state.createdRazorpayOrders[0].amount).toBe(5250);
    // Coins are NOT redeemed at create-time for a partial/online order —
    // they are committed in finalizePaidPayment once the payment settles.
    expect(stubs.state.redemptionInput).toBeNull();
  });

  it("no coins → Razorpay for the full server amount: ₹60 subtotal → ₹63 (explains the reported amount)", async () => {
    stubs.state.productsResult = productsByName("P60", 60);
    vi.mocked((await import("../../api/lib/coins")).validateRedemption).mockClear();

    const { statusCode, body } = await run(baseBody([{ productId: P60, quantity: 1 }]));

    expect(statusCode).toBe(200);
    expect(body.alreadyPaid).toBe(false);
    expect(body.paymentRequired).toBe(true);
    expect(body.amount).toBe(6300); // 60 + 5% GST = ₹63
    expect(stubs.state.createdRazorpayOrders[0]?.amount).toBe(6300);
    // Coins were never requested → the coin service must not be consulted.
    expect(vi.mocked((await import("../../api/lib/coins")).validateRedemption)).not.toHaveBeenCalled();
  });

  it("idempotent replay of a paid coin transaction → same order, NO second redemption, NO Razorpay", async () => {
    stubs.state.productsResult = productsByName("P60", 60);
    stubs.state.existingRecord = {
      id: "pr-paid-1",
      transaction_id: TID,
      razorpay_order_id: null,
      razorpay_payment_id: null,
      razorpay_signature: null,
      ff_order_number: "FF-20260901-ABC1",
      amount_paise: 0,
      amount_rupees: 0,
      currency: "INR",
      payment_status: "paid",
      customer_name: "Test Customer",
      customer_phone: "9999999999",
      snapshot: null,
      delivery_address: null,
      metadata: { payment_method: "FOOD_FACTORY_COINS" },
      paid_at: null,
      whatsapp_invoice_status: null,
      whatsapp_message_id: null,
      invoice_sent_at: null,
    };

    const { statusCode, body } = await run({
      ...baseBody([{ productId: P60, quantity: 1 }]),
      useCoins: true,
    });

    expect(statusCode).toBe(200);
    expect(body.alreadyPaid).toBe(true);
    expect(body.paymentRequired).toBe(false);
    expect(body.orderNumber).toBe("FF-20260901-ABC1");
    // Double-click / retry must not deduct the wallet again.
    expect(stubs.state.redemptionInput).toBeNull();
    expect(stubs.state.createdRazorpayOrders).toHaveLength(0);
  });

  it("useCoins requested but identity not authenticated → COINS_UNAVAILABLE error, NO Razorpay", async () => {
    stubs.state.productsResult = productsByName("P60", 60);
    const identity = await import("../../api/lib/identity");
    identity.__identityState.override = { authenticated: false };

    const { statusCode, body } = await run({
      ...baseBody([{ productId: P60, quantity: 1 }]),
      useCoins: true,
    });

    expect(statusCode).toBe(400);
    expect(body.code).toBe("COINS_UNAVAILABLE");
    expect(body.message).toContain("Coins");
    // Must NOT create a Razorpay order — reject instead of silently charging full amount.
    expect(stubs.state.createdRazorpayOrders).toHaveLength(0);
  });

  it("useCoins requested but validation ineligible (balance < 100) → COINS_UNAVAILABLE error, NO Razorpay", async () => {
    stubs.state.productsResult = productsByName("P60", 60);
    const coins = await import("../../api/lib/coins");
    vi.mocked(coins.validateRedemption).mockResolvedValueOnce({
      eligible: false,
      coinsAvailable: 50,
      coinsToUse: 0,
      discountAmount: 0,
    });

    const { statusCode, body } = await run({
      ...baseBody([{ productId: P60, quantity: 1 }]),
      useCoins: true,
    });

    expect(statusCode).toBe(400);
    expect(body.code).toBe("COINS_UNAVAILABLE");
    expect(stubs.state.createdRazorpayOrders).toHaveLength(0);
  });
});