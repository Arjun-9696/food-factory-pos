// ============================================================================
// SERVER-SIDE delivery address model + validation.
//
// The delivery address follows the EXISTING `profiles` address columns
// (house_number, street, area, city, state, postal_code, country, latitude,
// longitude, full_address) so the cart, the profile page and the checkout all
// share ONE address model. There is deliberately no second "addresses" table.
//
// The server is the source of truth:
//   * authenticated customers   → address is pinned from THEIR profiles row
//     (ownership enforced by RLS + the user-scoped client);
//   * guests                   → a validated client-provided snapshot is
//     attached to the payment record and the order.
// ============================================================================

export interface DeliveryAddress {
  houseNumber: string;
  street: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  fullAddress: string;
}

const INDIAN_PIN_RE = /^\d{6}$/;

/** Compose the single-line full address from its parts (mirrors Profile.tsx). */
export function composeFullAddress(parts: {
  houseNumber: string;
  street: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}): string {
  return [parts.houseNumber, parts.street, parts.area, parts.city, parts.state, parts.postalCode, parts.country]
    .filter((part) => part.trim().length > 0)
    .join(", ");
}

export function coerceLatitude(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < -90 || n > 90) return null;
  return Math.round(n * 1e6) / 1e6;
}

export function coerceLongitude(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < -180 || n > 180) return null;
  return Math.round(n * 1e6) / 1e6;
}

/**
 * Validate an untrusted delivery-address payload. A complete serviceable
 * address requires a house/street line, area, city, state, a valid 6-digit
 * Indian PIN and a country. Coordinates stay optional — when absent the
 * delivery fee is treated as FREE (distance cannot be established).
 */
export function validateDeliveryAddress(raw: unknown): { error: string } | { address: DeliveryAddress } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { error: "Delivery address is required." };
  }
  const r = raw as Record<string, unknown>;

  const str = (key: string): string => (typeof r[key] === "string" ? String(r[key]).trim().slice(0, 200) : "");
  const houseNumber = str("houseNumber");
  const street = str("street");
  const area = str("area");
  const city = str("city");
  const state = str("state");
  const postalCode = str("postalCode");
  const country = str("country");

  if (!houseNumber && !street) {
    return { error: "House / flat number or street is required." };
  }
  if (!area) {
    return { error: "Area / locality is required." };
  }
  if (!city) {
    return { error: "City is required." };
  }
  if (!state) {
    return { error: "State is required." };
  }
  if (!INDIAN_PIN_RE.test(postalCode)) {
    return { error: "Enter a valid 6-digit postal code (PIN)." };
  }
  if (!country) {
    return { error: "Country is required." };
  }

  const latitude = coerceLatitude(r.latitude);
  const longitude = coerceLongitude(r.longitude);

  return {
    address: {
      houseNumber,
      street,
      area,
      city,
      state,
      postalCode,
      country,
      latitude,
      longitude,
      fullAddress: composeFullAddress({ houseNumber, street, area, city, state, postalCode, country }),
    },
  };
}

// ---------------------------------------------------------------------------
// profiles ←→ DeliveryAddress mapping
// ---------------------------------------------------------------------------

/** Map a `profiles` row to a DeliveryAddress (missing values → empty strings). */
export function addressFromProfileRow(row: Record<string, unknown> | null | undefined): DeliveryAddress {
  const s = (key: string): string => {
    const v = row?.[key];
    return v == null ? "" : String(v).trim();
  };
  const houseNumber = s("house_number");
  const street = s("street");
  const area = s("area");
  const city = s("city");
  const state = s("state");
  const postalCode = s("postal_code");
  const country = s("country") || "India";

  return {
    houseNumber,
    street,
    area,
    city,
    state,
    postalCode,
    country,
    latitude: coerceLatitude(row?.latitude),
    longitude: coerceLongitude(row?.longitude),
    fullAddress: composeFullAddress({ houseNumber, street, area, city, state, postalCode, country }),
  };
}

/** Update payload for `profiles` — only the address columns (never phone/name). */
export function addressToProfilePatch(address: DeliveryAddress): Record<string, unknown> {
  return {
    house_number: address.houseNumber,
    street: address.street,
    area: address.area,
    city: address.city,
    state: address.state,
    postal_code: address.postalCode,
    country: address.country,
    latitude: address.latitude ?? 0,
    longitude: address.longitude ?? 0,
    full_address: address.fullAddress,
    updated_at: new Date().toISOString(),
  };
}

/** Refuse to pin a blank/incomplete address as the authoritative one. */
export function isCompleteProfileAddress(address: DeliveryAddress): boolean {
  return (
    Boolean(address.houseNumber || address.street) &&
    Boolean(address.area) &&
    Boolean(address.city) &&
    Boolean(address.state) &&
    INDIAN_PIN_RE.test(address.postalCode) &&
    Boolean(address.country)
  );
}