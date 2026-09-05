// ============================================================================
// Delivery address helpers (client).
// Shared between the cart drawer and (potentially) any other UI that needs to
// gate checkout on a complete serviceable delivery address. The server
// re-validates the same rules; this module exists so the cart can disable
// "Pay Online" and show the correct delivery fee BEFORE any server call.
// ============================================================================
import type { DeliveryAddress } from "@/types/address";

const INDIAN_PIN_RE = /^\d{6}$/;

const GUEST_ADDRESS_KEY = "ff_guest_address";

type AddressParts = Pick<DeliveryAddress, "houseNumber" | "street" | "area" | "city" | "state" | "postalCode" | "country">;

/** Compose the single-line full address from the address parts. */
export function composeFullAddress(address: AddressParts): string {
  return [
    address.houseNumber,
    address.street,
    address.area,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter((part) => part && part.trim().length > 0)
    .join(", ");
}

/** True when the address is complete enough to ship + charge for delivery. */
export function isDeliveryAddressValid(address: DeliveryAddress | null | undefined): boolean {
  if (!address) return false;
  return (
    (Boolean(address.houseNumber.trim()) || Boolean(address.street.trim())) &&
    Boolean(address.area.trim()) &&
    Boolean(address.city.trim()) &&
    Boolean(address.state.trim()) &&
    INDIAN_PIN_RE.test(address.postalCode) &&
    Boolean(address.country.trim())
  );
}

/** Multi-line rendering used in the cart summary / success bill. */
export function formatAddressLines(address: DeliveryAddress): string[] {
  const lines: string[] = [];
  const first = [address.houseNumber, address.street].filter(Boolean).join(", ");
  if (first) lines.push(first);
  if (address.area) lines.push(address.area);
  const cityLine = [address.city, address.state].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  const last = [address.postalCode, address.country].filter(Boolean).join(", ");
  if (last) lines.push(last);
  return lines;
}

// ---------------------------------------------------------------------------
// Guest address persistence (survives a refresh, mirroring the phone field).
// ---------------------------------------------------------------------------

export function loadGuestAddress(): DeliveryAddress | null {
  try {
    const raw = localStorage.getItem(GUEST_ADDRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DeliveryAddress;
    return parsed && typeof parsed === "object" && typeof parsed.city === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGuestAddress(address: DeliveryAddress): void {
  try {
    localStorage.setItem(GUEST_ADDRESS_KEY, JSON.stringify(address));
  } catch {
    // Best effort — insecure/private storage should not block checkout.
  }
}