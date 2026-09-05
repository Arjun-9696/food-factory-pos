/**
 * Normalizes a free-form Indian mobile number to E.164 (+91XXXXXXXXXX).
 * Mirrors the server-side logic in api/lib/phone.ts so both ends agree.
 * Returns null when the input is not a usable mobile number.
 */
const PLAIN_DIGITS_RE = /^[0-9]{10,15}$/;
const INDIAN_MOBILE_PREFIX_RE = /^[6-9]/;

export function normalizeIndianPhone(input: string): string | null {
  if (typeof input !== "string") return null;

  let digits = input.replace(/[\s\-().]/g, "");
  digits = digits.replace(/^\++/, "");
  if (!PLAIN_DIGITS_RE.test(digits)) return null;

  if (digits.length === 10) {
    if (!INDIAN_MOBILE_PREFIX_RE.test(digits)) return null;
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    const rest = digits.slice(1);
    if (INDIAN_MOBILE_PREFIX_RE.test(rest)) return `+91${rest}`;
    return null;
  }

  return `+${digits}`;
}