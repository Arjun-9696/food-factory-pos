// ============================================================================
// Server-side environment access (never imported by the browser bundle).
// Lazily loads .env so the same code works under Vite dev, scripts, and Vercel
// serverless functions (where env vars are already injected at runtime).
// ============================================================================
import * as dotenv from "dotenv";

let loaded = false;

function ensureEnvLoaded(): void {
  if (loaded) return;
  loaded = true;
  // dotenv.config() does not override already-set environment variables.
  dotenv.config();
}

/** Public Razorpay Key ID — the only Razorpay credential that may reach the browser. */
export function razorpayPublicKeyId(): string {
  ensureEnvLoaded();
  return process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "";
}

/** Secret Razorpay Key — SERVER ONLY. Never expose. */
export function razorpayKeySecret(): string {
  ensureEnvLoaded();
  return process.env.RAZORPAY_KEY_SECRET || "";
}

/** Webhook signing secret — SERVER ONLY. Must match the Razorpay Dashboard. */
export function razorpayWebhookSecret(): string {
  ensureEnvLoaded();
  return process.env.RAZORPAY_WEBHOOK_SECRET || "";
}

export function isRazorpayConfigured(): boolean {
  ensureEnvLoaded();
  return Boolean(razorpayPublicKeyId() && razorpayKeySecret());
}

export function supabaseUrl(): string {
  ensureEnvLoaded();
  return process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
}

export function supabaseKey(): string {
  ensureEnvLoaded();
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""
  );
}

export function isSupabaseConfigured(): boolean {
  ensureEnvLoaded();
  return Boolean(supabaseUrl() && supabaseKey());
}

/**
 * Whether a privileged Supabase key (service role, RLS bypass) is configured.
 * Without it, RLS-scoped reads fall back to a user-scoped client so customers
 * can still read their OWN wallet rows (`auth.uid()` policies).
 */
export function hasServiceRoleKey(): boolean {
  ensureEnvLoaded();
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ---------------------------------------------------------------------------
// WhatsApp invoice delivery (see api/lib/whatsapp.ts).
// The default sender number mirrors the business WhatsApp used by the store.
// ---------------------------------------------------------------------------

export interface WhatsAppConfig {
  /** Business sender number, e.g. "919876543210" (WhatsApp format, no +). */
  businessPhone: string | null;
  /** Delivery provider: "none" | "meta" | "twilio". "none" never sends. */
  provider: "none" | "meta" | "twilio";
  // Meta Cloud API
  phoneNumberId: string | null;
  accessToken: string | null;
  templateName: string;
  // Twilio
  twilioSid: string | null;
  twilioAuthToken: string | null;
  twilioFrom: string | null;
}

export function whatsappConfig(): WhatsAppConfig {
  ensureEnvLoaded();

  const env = process.env as Record<string, string | undefined>;
  const rawProvider = (env.WHATSAPP_PROVIDER || "").toLowerCase().trim();
  const provider: WhatsAppConfig["provider"] =
    rawProvider === "meta" || rawProvider === "twilio" ? rawProvider : "none";

  let businessPhone: string | null = null;
  const rawBusinessPhone = (env.WHATSAPP_BUSINESS_PHONE || "7406969321").replace(/[^\d]/g, "");
  if (rawBusinessPhone) {
    businessPhone = rawBusinessPhone.startsWith("91") ? rawBusinessPhone : `91${rawBusinessPhone}`;
  }

  return {
    businessPhone,
    provider,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || null,
    accessToken: env.WHATSAPP_ACCESS_TOKEN || null,
    templateName: env.WHATSAPP_TEMPLATE_NAME || "food_factory_invoice",
    twilioSid: env.WHATSAPP_TWILIO_ACCOUNT_SID || null,
    twilioAuthToken: env.WHATSAPP_TWILIO_AUTH_TOKEN || null,
    twilioFrom: env.WHATSAPP_TWILIO_FROM || null,
  };
}