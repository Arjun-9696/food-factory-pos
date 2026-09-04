// ============================================================================
// WhatsApp invoice delivery — provider abstraction.
//
// The BUSINESS's WhatsApp number (7406969321) acts as the sender. The customer
// WhatsApp number comes from the customer's login profile OR the number they
// entered at checkout, and is always stored as part of the payment record.
//
// Rules (hard requirements):
//   * NEVER fake a delivery. If no provider + credentials are configured, the
//     result is `not_configured` (recorded as whatsapp_invoice_status=FAILED).
//     We do NOT fall back to wa.me links or pretend a message was sent.
//   * Payment success stays success even when the invoice cannot be delivered.
//   * Deliveries are idempotent at the caller level (see payments.ts).
//
// Providers:
//   meta    — WhatsApp Business Cloud API (requires an approved template for
//             business-initiated messages).
//   twilio  — Twilio WhatsApp API.
// Enable with WHATSAPP_PROVIDER=meta|twilio plus the credentials below.
// ============================================================================
import { formatInvoiceText, type OrderInvoice } from "./invoice";
import { whatsappConfig } from "./env";

export type WhatsAppSendStatus = "sent" | "failed" | "not_configured";

export interface WhatsAppSendResult {
  status: WhatsAppSendStatus;
  messageId?: string;
  error?: string;
}

/** E.164 digits for WhatsApp (no +, no spaces). Never mangles a real number. */
function toWhatsAppDigits(phone: string | null): string | null {
  if (!phone) return null;
  let digits = phone.replace(/[^\d]/g, "");
  // Bare 10-digit Indian mobile → prepend the Indian country code.
  if (digits.length === 10 && /^[6-9]/.test(digits)) digits = `91${digits}`;
  if (digits.length < 11 || digits.length > 15) return null;
  return digits;
}

// ---------------------------------------------------------------------------
// Meta Whatsapp Cloud API
// ---------------------------------------------------------------------------
async function sendViaMeta(
  config: ReturnType<typeof whatsappConfig>,
  invoice: OrderInvoice,
  to: string,
): Promise<WhatsAppSendResult> {
  if (!config.accessToken || !config.phoneNumberId) {
    return { status: "failed", error: "Meta credentials missing" };
  }

  const messageBody = formatInvoiceText(invoice);
  const url = `https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body: messageBody },
    }),
  });

  const body = (await response.json().catch(() => null)) as { messages?: Array<{ id?: string }> } | null;
  if (!response.ok || !body?.messages?.[0]?.id) {
    return { status: "failed", error: `Meta API error ${response.status}` };
  }
  return { status: "sent", messageId: body.messages[0].id };
}

// ---------------------------------------------------------------------------
// Twilio WhatsApp API
// ---------------------------------------------------------------------------
async function sendViaTwilio(
  config: ReturnType<typeof whatsappConfig>,
  invoice: OrderInvoice,
  to: string,
): Promise<WhatsAppSendResult> {
  if (!config.twilioSid || !config.twilioAuthToken || !config.twilioFrom) {
    return { status: "failed", error: "Twilio credentials missing" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioSid}/Messages.json`;
  const formBody = new URLSearchParams({
    From: config.twilioFrom,
    To: `whatsapp:+${to}`,
    Body: formatInvoiceText(invoice),
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.twilioSid}:${config.twilioAuthToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formBody.toString(),
  });

  if (!response.ok) {
    return { status: "failed", error: `Twilio API error ${response.status}` };
  }
  const body = (await response.json().catch(() => null)) as { sid?: string } | null;
  return { status: "sent", messageId: body?.sid || undefined };
}

/**
 * Deliver an invoice to the customer's WhatsApp. Never fakes delivery.
 * Exceptions are converted to { status: "failed" } — callers must continue
 * treating the payment as paid regardless of the outcome.
 */
export async function sendWhatsAppInvoice(input: {
  invoice: OrderInvoice;
  customerPhone: string | null;
}): Promise<WhatsAppSendResult> {
  const config = whatsappConfig();

  if (config.provider === "none") {
    // No provider wired up — this is a deliberate non-delivery, never a fake.
    return { status: "not_configured" };
  }

  const to = toWhatsAppDigits(input.customerPhone);
  if (!to) {
    return { status: "failed", error: "Customer WhatsApp number missing or invalid" };
  }

  try {
    if (config.provider === "meta") return await sendViaMeta(config, input.invoice, to);
    if (config.provider === "twilio") return await sendViaTwilio(config, input.invoice, to);
    return { status: "not_configured" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "whatsapp send error" };
  }
}