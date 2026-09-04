// ============================================================================
// useRazorpayCheckout — orchestrates the full payment flow:
//
//   startPayment → server /api/create-order → Razorpay Checkout modal
//          └→ success → server /api/verify-payment (signature + status)
//          └→ cancel / fail → cart untouched, retry supported
//          └→ network loss after paying → poll /api/order-status
//
// The cart is ONLY cleared once the server confirms the payment (phase "paid",
// delivered through onPaid). Nothing here clears it earlier.
// ============================================================================
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MERCHANT_DESCRIPTION,
  MERCHANT_NAME,
  loadRazorpayCheckoutScript,
  paymentsApi,
  getRazorpayConstructor,
} from "@/lib/razorpay";
import {
  PaymentApiError,
  type CreateOrderItemRequest,
  type PaymentStatusResponse,
  type RazorpaySuccessResponse,
} from "@/types/razorpay";
import type { DeliveryAddress } from "@/types/address";

export type PaymentPhase =
  | "idle"
  | "starting"
  | "checkout-open"
  | "verifying"
  | "rechecking"
  | "paid"
  | "cancelled"
  | "failed"
  | "error";

export interface StartPaymentInput {
  items: CreateOrderItemRequest[];
  customerName: string;
  customerPhone: string;
  discount?: number;
  /** Supabase session JWT — sends with create-order for identity-aware checkout. */
  accessToken?: string;
  /** Delivery address snapshot — required by the server (no address, no payment). */
  deliveryAddress: DeliveryAddress;
  /** When true, the server redeems up to 100 Food Factory Coins against this order. */
  useCoins?: boolean;
}

export type PaymentOutcome = "paid" | "cancelled" | "failed" | "error";
export type RecheckOutcome = PaymentOutcome | "pending" | "none";

const PENDING_KEY = "ff-rzp-pending";
const POLL_INTERVAL_MS = 2500;
const POLL_MAX_ATTEMPTS = 6;

interface PendingRecord {
  transactionId: string;
  razorpayOrderId: string;
  fingerprint: string;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function cartFingerprint(items: CreateOrderItemRequest[]): string {
  return items
    .map((i) => `${i.productId}:${i.quantity}`)
    .sort()
    .join("|");
}

function readPending(): PendingRecord | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingRecord) : null;
  } catch {
    return null;
  }
}

function writePending(record: PendingRecord): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(record));
  } catch {
    // Session storage unavailable (private mode) — payment still works.
  }
}

function clearPending(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // ignore
  }
}

export function useRazorpayCheckout(
  onPaid?: (orderNumber: string, razorpayOrderId?: string, remainingCoins?: number) => void,
) {
  const [phase, setPhase] = useState<PaymentPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [failureReason, setFailureReason] = useState<string>("");
  const pendingRef = useRef<PendingRecord | null>(readPending());
  const settledRef = useRef(false);
  const onPaidRef = useRef(onPaid);
  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  const hasPending = Boolean(pendingRef.current);

  const setResult = useCallback((next: PaymentPhase, message = "") => {
    if (next === "error" || next === "cancelled" || next === "failed") {
      setErrorMessage(message);
    } else {
      setErrorMessage("");
    }
    if (next === "failed") {
      setFailureReason(message);
    }
    setPhase(next);
  }, []);

  const waitMs = useCallback((ms: number) => new Promise((r) => setTimeout(r, ms)), []);

  const resolvePaid = useCallback(
    async (orderNumber: string, razorpayOrderId?: string, remainingCoins?: number) => {
      clearPending();
      pendingRef.current = null;
      setResult("paid");
      onPaidRef.current?.(orderNumber, razorpayOrderId, remainingCoins);
    },
    [setResult],
  );

  /** Poll /api/order-status until terminal state (used after network hiccups). */
  const pollStatus = useCallback(
    async (razorpayOrderId: string): Promise<PaymentStatusResponse | null> => {
      let last: PaymentStatusResponse | null = null;
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        try {
          const result = await paymentsApi.getPaymentStatus(razorpayOrderId);
          last = result;
          if (last.paymentStatus === "paid" || last.paymentStatus === "failed") return last;
        } catch {
          // transient — keep polling
        }
        await waitMs(POLL_INTERVAL_MS);
      }
      return last;
    },
    [waitMs],
  );

  const verifyAndSettle = useCallback(
    async (response: RazorpaySuccessResponse, razorpayOrderId: string): Promise<PaymentOutcome> => {
      setResult("verifying");
      try {
        const verified = await paymentsApi.verifyPayment({
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature,
        });
        if (verified.paymentStatus === "paid") {
          await resolvePaid(verified.orderNumber, razorpayOrderId);
          return "paid";
        }
        setResult("error", "Payment verification is taking longer than expected. Please check your order status.");
        return "error";
      } catch {
        // Network or server issue AFTER Razorpay finished — re-check with the server.
        setResult("rechecking", "");
        const statusResult = await pollStatus(razorpayOrderId);
        if (statusResult?.paymentStatus === "paid" && statusResult.orderNumber) {
          await resolvePaid(statusResult.orderNumber, razorpayOrderId);
          return "paid";
        }
        if (statusResult?.paymentStatus === "failed") {
          setResult("failed", "Payment failed. Please try again.");
          return "failed";
        }
        setResult("error", "Payment may have been received. We are confirming your order — please re-check your order status shortly.");
        return "error";
      }
    },
    [pollStatus, resolvePaid, setResult],
  );

  const startPayment = useCallback(
    async (input: StartPaymentInput): Promise<PaymentOutcome> => {
      settledRef.current = false;
      setResult("starting");
      setFailureReason("");

      const fingerprint = cartFingerprint(input.items);

      // Reuse an in-flight session only if the cart is unchanged (idempotent retry).
      let transactionId: string;
      if (pendingRef.current && pendingRef.current.fingerprint === fingerprint) {
        transactionId = pendingRef.current.transactionId;
      } else {
        transactionId = uuid();
        pendingRef.current = null;
      }

      try {
        const order = await paymentsApi.createOrder({
          transactionId,
          items: input.items,
          customerName: input.customerName || undefined,
          customerPhone: input.customerPhone,
          discount: input.discount && input.discount > 0 ? input.discount : undefined,
          accessToken: input.accessToken || undefined,
          deliveryAddress: input.deliveryAddress,
          useCoins: input.useCoins || undefined,
        });

        if (order.paymentRequired === false || order.alreadyPaid) {
          // Server-authoritative: no payment gateway involved. Either a
          // zero-value Food Factory Coins checkout (server placed the order and
          // redeemed the coins) or a payment already confirmed server-side.
          if (order.paymentMethod === "FOOD_FACTORY_COINS" || order.orderNumber) {
            await resolvePaid(order.orderNumber, undefined, order.remainingCoinBalance);
            return "paid";
          }
          // Payment already confirmed server-side for this session.
          return await verifyAndSettle(
            { razorpay_payment_id: "", razorpay_order_id: order.orderId, razorpay_signature: "" },
            order.orderId,
          );
        }

        // Defense-in-depth: never open a Razorpay checkout unless the server
        // issued a real (positive) order. A fully coin-covered order MUST have
        // come back as paymentRequired: false above, so this path implies a
        // stale/misbehaving server — fail loudly instead of opening a bogus
        // dialog.
        if ((order.amount ?? 0) <= 0 || !order.orderId) {
          settledRef.current = true;
          setResult("error", "Unable to start payment. Please try again.");
          return "error";
        }

        const pending: PendingRecord = {
          transactionId,
          razorpayOrderId: order.orderId,
          fingerprint,
        };
        pendingRef.current = pending;
        writePending(pending);

        const loaded = await loadRazorpayCheckoutScript();
        if (!loaded) {
          setResult("error", "Unable to open secure payment. Please try again.");
          return "error";
        }
        const RazorpayConstructor = getRazorpayConstructor();

        setResult("checkout-open");

        const outcome = await new Promise<PaymentOutcome>((resolve) => {
          const settleOnce = (next: PaymentOutcome, message = "") => {
            if (settledRef.current) return;
            settledRef.current = true;
            setResult(next, message);
            resolve(next);
          };

          const checkout = new RazorpayConstructor({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: MERCHANT_NAME,
            description: MERCHANT_DESCRIPTION,
            order_id: order.orderId,
            prefill: {
              name: input.customerName || undefined,
              contact: input.customerPhone,
            },
            theme: { color: "#ea580c" },
            retry: { enabled: false },
            modal: {
              ondismiss: () => {
                // Cart stays intact; customer can try again.
                settleOnce("cancelled", "Payment cancelled. Your cart is still saved.");
              },
            },
            handler: async (response) => {
              try {
                const result = await verifyAndSettle(response, order.orderId);
                settleOnce(result);
              } catch {
                settleOnce("error", "Payment verification failed. Please try again.");
              }
            },
          });

          checkout.on("payment.failed", (failure) => {
            const reason =
              failure?.error?.description ||
              failure?.error?.reason ||
              failure?.description ||
              "Payment failed. Please try again.";
            settleOnce("failed", reason);
          });

          try {
            checkout.open();
          } catch {
            settledRef.current = true;
            settleOnce("error", "Unable to open secure payment. Please try again.");
          }
        });

        return outcome;
      } catch (err) {
        settledRef.current = true;
        if (err instanceof PaymentApiError) {
          setResult("error", err.message);
        } else {
          console.error("Payment start error:", err);
          setResult("error", "Unable to start payment. Please try again.");
        }
        return "error";
      }
    },
    [setResult, verifyAndSettle],
  );

  /** Re-check a payment that may have been interrupted (e.g. after a refresh). */
  const recheckPending = useCallback(async (): Promise<RecheckOutcome> => {
    const pending = pendingRef.current;
    if (!pending) return "none";

    settledRef.current = true;
    setResult("rechecking");
    try {
      const statusResult = await pollStatus(pending.razorpayOrderId);
      if (statusResult?.paymentStatus === "paid" && statusResult.orderNumber) {
        await resolvePaid(statusResult.orderNumber, pending.razorpayOrderId);
        return "paid";
      }
      if (statusResult?.paymentStatus === "failed") {
        clearPending();
        pendingRef.current = null;
        setResult("failed", "Payment failed. Please try again.");
        return "failed";
      }
      setResult("error", "Payment is still being confirmed. Please wait or check your order status.");
      return "pending";
    } catch {
      setResult("error", "Unable to check payment status. Please try again.");
      return "error";
    }
  }, [pollStatus, resolvePaid, setResult]);

  const reset = useCallback(() => {
    settledRef.current = false;
    setResult("idle");
  }, [setResult]);

  return {
    phase,
    errorMessage,
    failureReason,
    hasPending,
    startPayment,
    recheckPending,
    reset,
  };
}