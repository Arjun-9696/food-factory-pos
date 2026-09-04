// ============================================================================
// Phone normalization — shared by all serverless handlers.
// Indian mobile numbers are canonicalized to E.164: +91XXXXXXXXXX.
// Non-Indian numbers (7-15 digits) are preserved with a leading +.
// Returns null for anything that is not a usable mobile number.
// ============================================================================

const PLAIN_DIGITS_RE = /^[0-9]{10,15}$/;
const INDIAN_MOBILE_PREFIX_RE = /^[6-9]/;

export function normalizeIndianPhone(input: string): string | null {
  if (typeof input !== "string") return null;

  let digits = input.replace(/[\s\-().]/g, "");
  digits = digits.replace(/^\++/, "");
  if (!PLAIN_DIGITS_RE.test(digits)) return null;

  // 10-digit Indian mobile (must start 6-9).
  if (digits.length === 10) {
    if (!INDIAN_MOBILE_PREFIX_RE.test(digits)) return null;
    return `+91${digits}`;
  }

  // 12 digits already prefixed with the Indian country code (91XXXXXXXXXX).
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  // 11 digits starting with 0 → trunk prefix dropped (0XXXXXXXXXX → 91XXXXXXXXXX).
  if (digits.length === 11 && digits.startsWith("0")) {
    const rest = digits.slice(1);
    if (INDIAN_MOBILE_PREFIX_RE.test(rest)) return `+91${rest}`;
    return null;
  }

  // Any other international mobile (7-15 digits) → keep the digits with a +.
  return `+${digits}`;
}