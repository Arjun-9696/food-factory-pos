// ============================================================================
// Client-side delivery rule mirror.
//
// Shows the delivery fee the SERVER will charge (free within 2 km, ₹20
// beyond) so the cart's grand total matches the Razorpay amount exactly. The
// server stays the source of truth (api/lib/amounts.ts + api/lib/location.ts)
// — this module only mirrors the same constants + haversine for display.
// ============================================================================
import type { DeliveryAddress } from "@/types/address";

/** Food Factory shop location (matches the Google Maps embed + api/lib/location.ts). */
export const SHOP_LATITUDE = 12.8896366;
export const SHOP_LONGITUDE = 77.6010219;

/** Free within this many km from the shop; beyond that a flat fee applies. */
export const FREE_DELIVERY_KM = 2;
export const DELIVERY_FEE_RUPEES = 20;

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Straight-line distance between two coordinates in kilometres. */
export function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Delivery fee for a straight-line distance (Rupees). */
export function deliveryChargeRupees(distanceKmValue: number): number {
  return distanceKmValue > FREE_DELIVERY_KM ? DELIVERY_FEE_RUPEES : 0;
}

/**
 * Delivery fee for a customer address, or 0 when the customer has no usable
 * coordinates (distance unknown → FREE, matching the server's behaviour).
 */
export function deliveryChargeForAddress(address: DeliveryAddress | null | undefined): { distanceKm: number | null; charge: number } {
  if (
    !address ||
    address.latitude == null ||
    address.longitude == null ||
    !Number.isFinite(address.latitude) ||
    !Number.isFinite(address.longitude) ||
    address.latitude < -90 ||
    address.latitude > 90 ||
    address.longitude < -180 ||
    address.longitude > 180
  ) {
    return { distanceKm: null, charge: 0 };
  }
  const distance = distanceKm(SHOP_LATITUDE, SHOP_LONGITUDE, address.latitude, address.longitude);
  return { distanceKm: distance, charge: deliveryChargeRupees(distance) };
}