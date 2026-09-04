// ============================================================================
// Razorpay Standard Checkout — typed browser API surface.
// Only the PUBLIC Key ID ever reaches the browser. The secret lives solely in
// the serverless functions under /api/*.
// ============================================================================

/** Payload Razorpay Checkout returns to `handler` on a successful payment. */
export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/** Payment-failure object passed to the `payment.failed` event. */
export interface RazorpayFailureResponse {
  error?: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  };
  description?: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  retry?: {
    enabled?: boolean;
    count?: number;
  };
  modal?: {
    ondismiss?: () => void;
  };
  handler?: (response: RazorpaySuccessResponse) => void;
}

export interface RazorpayCheckout {
  open: () => void;
  close: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailureResponse) => void) => void;
}

export interface RazorpayConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayCheckout;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export const RAZORPAY_CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

// ---------------------------------------------------------------------------
// API contract with our serverless functions
// ---------------------------------------------------------------------------

import type { DeliveryAddress } from "@/types/address";

export interface CreateOrderItemRequest {
  productId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  transactionId: string;
  items: CreateOrderItemRequest[];
  customerName?: string;
  customerPhone: string;
  discount?: number;
  /** Supabase session JWT — enables identity-aware checkout server-side. */
  accessToken?: string;
  /** Delivery address snapshot — required (no address, no payment). */
  deliveryAddress?: DeliveryAddress;
  /** When true, the server redeems up to 100 Food Factory Coins against this order. */
  useCoins?: boolean;
}

export interface CreateOrderResponse {
  success: boolean;
  alreadyPaid: boolean;
  orderId: string;
  keyId: string;
  amount: number;
  amountLabel: string;
  currency: string;
  transactionId: string;
  /** Food Factory order number — present when the order was already placed
   *  (zero-value Food Factory Coins checkout or an idempotent retry). */
  orderNumber?: string;
  /** "FOOD_FACTORY_COINS" for a zero-value coin checkout, omitted otherwise. */
  paymentMethod?: string;
  /** False when the server settled the order itself (e.g. coins fully covered
   *  it) and NO payment gateway is needed. The frontend MUST NOT open a
   *  Razorpay checkout when this is false. */
  paymentRequired?: boolean;
  /** Coins actually redeemed server-side (authoritative, 1 coin = ₹1). */
  coinsUsed?: number;
  /** Coin discount in rupees applied to the order (authoritative). */
  coinDiscount?: number;
  /** Amount paid at the gateway in paise (0 for a coin-only order). */
  amountPaid?: number;
  /** Remaining coin balance after the order settles (authoritative). */
  remainingCoinBalance?: number;
  /** Delivery fee actually charged (₹0 within 2 km, ₹20 beyond). */
  delivery?: number;
}

export interface VerifyPaymentRequest {
  transactionId?: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: true;
  paymentStatus: "paid";
  orderNumber: string;
  amount: number;
  amountLabel: string;
  currency: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "unknown";

export type WhatsappInvoiceStatus = "PENDING" | "SENT" | "FAILED" | null;

export interface PaymentStatusResponse {
  success: boolean;
  paymentStatus: PaymentStatus;
  orderNumber: string | null;
  razorpayOrderId: string | null;
  razorpayPaymentId?: string | null;
  amount: number;
  amountLabel: string;
  currency: string;
  paidAt?: string | null;
  delivery?: number;
  deliveryAddress?: DeliveryAddress | null;
  whatsappInvoiceStatus?: WhatsappInvoiceStatus;
}

// ---------------------------------------------------------------------------
// /api/order-details — server-side success-page data.
// ---------------------------------------------------------------------------

export interface OrderDetailsItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderDetailsResponse {
  success: true;
  paymentStatus: "paid";
  orderNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  items: OrderDetailsItem[];
  subtotal: number;
  discount: number;
  gst: number;
  delivery: number;
  grandTotal: number;
  deliveryAddress: DeliveryAddress | null;
  amountPaise: number;
  amountLabel: string;
  currency: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  paidAt: string | null;
  whatsappInvoiceStatus: WhatsappInvoiceStatus;
  invoiceSentAt: string | null;
}

/** Structured error surfaced from the payment API (safe message, no internals). */
export class PaymentApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PaymentApiError";
  }
}