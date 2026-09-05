# Razorpay Standard Checkout — Deployment Guide

This document explains how Food Factory's online payments work and how to run,
test, and deploy them safely. It is written for whoever owns the Razorpay
Dashboard and the Vercel deployment.

---

## Architecture overview

Food Factory is a Vite + React SPA on **Vercel** with **Supabase** as the
database. There is no separate Node API server — the browser talks to Supabase
directly. To keep payment credentials (the KEY SECRET and webhook secret)
private, payment endpoints are implemented as **Vercel serverless functions**
under `api/`:

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/create-order` | POST | Validates cart + prices + customer identity server-side, then creates the Razorpay order |
| `/api/verify-payment` | POST | Verifies the checkout signature + payment status, then confirms the Food Factory order |
| `/api/order-status` | GET | Re-checks a payment status (used after network failures / page refresh) |
| `/api/order-details` | GET | Server-stored order snapshot for the success screen (never trusts local state) |
| `/api/webhooks/razorpay` | POST | Server-side payment confirmation webhook (signature verified) |

These same handlers are mounted into the Vite dev server (`vite.config.ts`
→ `paymentApiPlugin`), so `npm run dev` behaves exactly like production.
Restart the dev server after editing files under `api/`.

### Key security rules

- The **browser never sees `RAZORPAY_KEY_SECRET`** or `RAZORPAY_WEBHOOK_SECRET`.
  Only the public `VITE_RAZORPAY_KEY_ID` reaches `window.Razorpay`.
- All prices are computed **server-side** from the Supabase `products` table.
  The browser only sends product ids + quantities. A tampered client cannot
  lower the price.
- Money is converted to **paise** for Razorpay (Razorpay refuses `amount < 100`).
  GST 5% is rounded the same way on server and client so totals always match.
- `verify-payment` recomputes the HMAC-SHA256 signature from the *stored*
  order id and re-checks with Razorpay that the payment is `captured` and the
  amount/currency match before confirming anything.
- Order confirmation is **idempotent**: duplicate verify calls, webhooks, or
  dashboard retries can never create duplicate Food Factory orders.
- **Identity-aware checkout**: when a customer pays while logged in, the
  browser sends their Supabase JWT with `/api/create-order`. The server
  validates it (`auth.getUser`), reads the real account name/phone, and pins
  them to the order — the browser can never impersonate another account or
  attach a fake identity. An invalid/expired token just means guest checkout.
- **A valid delivery address is mandatory**: no address → no Razorpay order →
  no Food Factory order. The server validates and stores a snapshot of the
  address on the payment and order records.
- Name + phone are **required** at checkout and enforced server-side.
  Phone numbers are normalized to E.164 (`+91XXXXXXXXXX`).
- **Delivery distance + charge are computed server-side** from the shop
  coordinates and the customer's address coordinates. The browser only *shows*
  the fee estimate; the amount Razorpay charges is decided by the server.
- A **WhatsApp invoice** is delivered after a successful payment (optional,
  provider-configurable). It is never faked, is attempted at most once per
  payment, and never blocks payment success even when delivery fails.

### Money rules (must match on server + client)

| Rule | Value |
| --- | --- |
| Subtotal | sum of `price × qty` (server prices) |
| Discount | min(requested, subtotal), ₹ round numbers |
| GST | `Math.round((subtotal − discount) × 0.05)` |
| Delivery | ₹0 within 2 km of the shop, else ₹20 — computed from the delivery address coordinates (`api/lib/location.ts` + `api/lib/amounts.ts`). No coordinates → ₹20 |
| Minimum order | ₹1 (100 paise) |
| Max quantity per item | 99 |

---

## Required environment variables

Copy these into **Vercel → Project → Settings → Environment Variables** and
into your local `.env` (the `.gitignore` already excludes `.env`).

| Variable | Where used | Notes |
| --- | --- | --- |
| `VITE_RAZORPAY_KEY_ID` | browser | Public key, starts with `rzp_test_` / `rzp_live_` |
| `RAZORPAY_KEY_ID` | server | Server key id (same value as above) |
| `RAZORPAY_KEY_SECRET` | server | Secret key — **never** expose. Starts with `rzp_test_`/`rzp_live_` |
| `RAZORPAY_WEBHOOK_SECRET` | server | Secret copied from the Razorpay webhook settings |
| `VITE_SUPABASE_URL` | server + browser | Existing Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | server + browser | Public anon key (no service-role key is required) |
| `DATABASE_URL` | scripts | Optional — used only by tooling if present |
| `WHATSAPP_PROVIDER` | server | `''` (disabled) \| `meta` \| `twilio` — WhatsApp invoice delivery |
| `WHATSAPP_BUSINESS_PHONE` | server | Shop WhatsApp number (digits), e.g. `7406969321` |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_TEMPLATE_NAME` | server | Meta WhatsApp Cloud API credentials |
| `WHATSAPP_TWILIO_ACCOUNT_SID` / `WHATSAPP_TWILIO_AUTH_TOKEN` / `WHATSAPP_TWILIO_FROM` | server | Twilio WhatsApp credentials |
| `FOOD_FACTORY_LATITUDE` / `FOOD_FACTORY_LONGITUDE` | server | Shop coordinates for the delivery charge (defaults to the Bangalore shop: `12.8896366`, `77.6010219`) |

`.env.example` has templates for all Razorpay entries.

---

## Database setup (Supabase)

Run once (creates the additive `payment_records` table — safe to re-run):

```bash
npm run razorpay:db
```

The table stores one row per checkout attempt: `transaction_id` (unique,
idempotency key from the browser), `razorpay_order_id`, payment/signature ids,
amounts (paise + rupees), status (`pending`/`paid`/`failed`), customer info,
a JSON snapshot of the server-computed prices, the **delivery address**
(`delivery_address`, JSON snapshot of the ship-to address), the Food Factory
order number, `paid_at`, and the WhatsApp invoice state
(`whatsapp_invoice_status`, `whatsapp_message_id`, `invoice_sent_at`).

The migration also adds two columns to the existing `orders` table:
`orders.delivery` (₹, default 0) and `orders.delivery_address` (JSONB address
snapshot) so every confirmed order carries the delivery charge and the ship-to
address.

Server reads/writes use the project's public anon key; when account data
(`users`/`profiles`) is accessed it forwards the customer's JWT so the
database RLS policies apply as that user. **No Supabase service-role key is
needed.** The migration is additive and safe to re-run (`npm run razorpay:db`).

---

## Razorpay Dashboard setup

1. **Account mode**: start with **Test Mode** (toggle at the top of the
   dashboard). Test keys look like `rzp_test_...`.
2. **Standard Checkout / Payment Gateway**: no special activation needed in
   test mode. Razorpay issues `order_...` ids when `/api/create-order` runs.
3. **Webhooks → Settings** (`Developers → Webhooks`):
   - Webhook URL: `https://foodfactoryonline.com/api/webhooks/razorpay`
   - Events to enable: `order.paid`, `payment.captured`, `payment.failed`
   - Copy the generated **webhook secret** into `RAZORPAY_WEBHOOK_SECRET`.
   - This is the independent server-side confirmation that saves an order even
     if the customer's browser disconnects mid-payment.
4. Test cards (dashboards → Payment Links / payments use these):
   - UPI: `success@razorpay` (auto-success), `failure@razorpay` (auto-fail)
   - Cards: `4111 1111 1111 1111`, expiry any future date, CVV any, OTP `1234`
   - Netbanking: any demo bank → "Success"

---

## Local testing

```bash
npm install
npm run razorpay:db          # create payment_records (if not done)
npm run dev                  # starts Vite on :8080 with /api/* mounted
```

Open the POS, add items, fill in your **name** and **phone** (or log in — they
auto-fill from your account), and press **Pay Online**. The Checkout modal
opens with the cart total (test amounts are tiny). Use the test cards/UPI above.

Behavior you should see:

- **Success**: modal closes → confetti + bill screen with the server-stored
  order number, items and prices (`/api/order-details`); cart emptied. The
  order appears in Orders (kitchen) with `payment_method = razorpay`.
- **Logged-in success**: the account name/phone are pinned server-side, and a
  fresh phone entered at checkout is saved to that user's own profile (only if
  they had none).
- **Cancel** (close the modal): toast/banner "Payment cancelled. Your cart is
  still saved." — cart untouched, retry anytime.
- **Fail** (use `failure@razorpay`): red error + "Try Payment Again" button.
- **Network loss after paying**: the drawer re-checks `/api/order-status` when
  it reopens; if Razorpay confirms the payment, the order completes and the
  cart clears.

WhatsApp invoices are only sent when `WHATSAPP_PROVIDER` is configured; until
then the payment record is marked `FAILED`/not-configured and the customer is
still charged successfully.

---

## Going live

1. Finish any "go-live" steps inside the Razorpay Dashboard for your business
   (KYC, bank details, etc.).
2. In the Dashboard, switch to **Live Mode** and copy the **live** keys.
3. Update environment variables on Vercel:
   - `VITE_RAZORPAY_KEY_ID` + `RAZORPAY_KEY_ID` → live key id
   - `RAZORPAY_KEY_SECRET` → live secret
   - `RAZORPAY_WEBHOOK_SECRET` → live webhook secret (note: the webhook secret
     can differ between modes — re-copy it)
4. Confirm the webhook URL points at `.../api/webhooks/razorpay` for live
   events and that `order.paid` / `payment.captured` / `payment.failed` are
   enabled.
5. Redeploy Vercel, then place a small real order to smoke-test.
6. Keep live keys ONLY on Vercel / a secret manager — never in the repo.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| "Online payments are temporarily unavailable" (503 `PAYMENT_NOT_CONFIGURED`) | `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` missing or empty on the deployed environment |
| 401 from Razorpay (`PAYMENT_GATEWAY_AUTH`) | Wrong/mismatched key pair on the server |
| "Payment is not confirmed yet" (409) | The payment hasn't settled (e.g. UPI pending) — order-status will finalize it later |
| Webhook 400 `WEBHOOK_SIGNATURE_MISMATCH` | `RAZORPAY_WEBHOOK_SECRET` doesn't match the dashboard webhook secret |
| Amount shows ₹NaN / order-status "pending" with empty amounts | **Stale dev server** — restart `npm run dev` so the `/api/*` middleware reloads |
| Order created but Razorpay modal never opens | `VITE_RAZORPAY_KEY_ID` missing at build time (Vite env vars are baked into the bundle) |
| Missing payment_records table on orders | You haven't run `npm run razorpay:db` against the Supabase database Vercel uses |

### Recovering a paid-but-not-confirmed order

If a customer paid but you cannot see the order, hit the verification again —
it is idempotent and safe:

```bash
curl "https://foodfactoryonline.com/api/order-status?razorpay_order_id=order_XXXX"
```

You can query by `razorpay_order_id`, `transaction_id`, or `ff_order_number`
(the same references work on `/api/order-details`). When the payment is
confirmed, the Food Factory order is created exactly once.

---

## Files

- `api/create-order.ts`, `api/verify-payment.ts`, `api/order-status.ts`, `api/order-details.ts`, `api/webhooks/razorpay.ts` — serverless handlers
- `api/lib/{env,http,razorpay,supabase,amounts,payments,identity,phone,invoice,whatsapp}.ts` — server helpers (payments = idempotent order creation + invoice CAS; identity = JWT-based customer resolution; whatsapp = provider dispatch)
- `src/lib/razorpay.ts` — browser client (`loadRazorpayCheckoutScript`, `/api/*` fetchers)
- `src/lib/phone.ts` — shared client-side phone normalization (mirrors `api/lib/phone.ts`)
- `src/hooks/useRazorpayCheckout.ts` — payment flow orchestration
- `src/components/pos/CartDrawer.tsx` — the **Pay Online** button, identity auto-fill, success screen UI
- `src/types/razorpay.ts` — typed checkout + API contracts, `window.Razorpay` declaration
- `scripts/razorpay-payments.sql` + `scripts/whatsapp-invoice.sql` + `scripts/setup-razorpay-payments.ts` — DB migrations