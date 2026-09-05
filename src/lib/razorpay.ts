// ============================================================================
// Client-side Razorpay helpers.
// - Loads the official Checkout script on demand (never on page load).
// - Talks to the serverless functions under /api/* for order creation +
//   signature verification + payment-status rechecks.
// The KEY_SECRET never exists in this module.
// ============================================================================
import {
  RAZORPAY_CHECKOUT_SCRIPT_URL,
  PaymentApiError,
  type CreateOrderRequest,
  type CreateOrderResponse,
  type OrderDetailsResponse,
  type PaymentStatusResponse,
  type RazorpayConstructor,
  type VerifyPaymentRequest,
  type VerifyPaymentResponse,
} from "@/types/razorpay";

export const MERCHANT_NAME = "Food Factory";
export const MERCHANT_DESCRIPTION = "Food Factory – The Quality Taste";

let scriptLoadPromise: Promise<boolean> | null = null;

/** Loads https://checkout.razorpay.com/v1/checkout.js exactly once. */
export function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_SCRIPT_URL}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => {
      scriptLoadPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/** Typed access to the global Razorpay constructor after loading the script. */
export function getRazorpayConstructor(): RazorpayConstructor {
  if (!window.Razorpay) {
    throw new PaymentApiError("Payment provider failed to load.", "CHECKOUT_LOAD_FAILED");
  }
  return window.Razorpay;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<T>(response);
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new PaymentApiError("Something went wrong. Please try again.", "BAD_RESPONSE", response.status);
  }
  if (!response.ok || !body || (body as { success?: boolean }).success === false) {
    const err = body as { code?: string; message?: string };
    throw new PaymentApiError(
      err?.message || "Something went wrong. Please try again.",
      err?.code || "API_ERROR",
      response.status,
    );
  }
  return body as T;
}

export const paymentsApi = {
  createOrder(payload: CreateOrderRequest): Promise<CreateOrderResponse> {
    return apiPost<CreateOrderResponse>("/api/create-order", payload);
  },

  verifyPayment(payload: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    return apiPost<VerifyPaymentResponse>("/api/verify-payment", payload);
  },

  async getPaymentStatus(razorpayOrderId: string): Promise<PaymentStatusResponse> {
    const response = await fetch(`/api/order-status?razorpay_order_id=${encodeURIComponent(razorpayOrderId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return parseApiResponse<PaymentStatusResponse>(response);
  },

  async getOrderDetails(razorpayOrderId: string): Promise<OrderDetailsResponse> {
    const response = await fetch(`/api/order-details?razorpay_order_id=${encodeURIComponent(razorpayOrderId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return parseApiResponse<OrderDetailsResponse>(response);
  },
};