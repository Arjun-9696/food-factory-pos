// ============================================================================
// Shop location + haversine distance — the SERVER-SIDE delivery-rule engine.
//
// The shop coordinates mirror the existing Food Factory Google Maps location
// (src/lib/googleReviews.ts embed: 12.8896366, 77.6010219). Deployments that
// move premises can override them with FOOD_FACTORY_LATITUDE / LONGITUDE.
//
// The delivery rule itself lives in api/lib/amounts.ts (FREE_DELIVERY_KM,
// DELIVERY_FEE_PAISE). This module only answers "how far is the customer".
// ============================================================================

export const SHOP_LATITUDE = readEnvFloat("FOOD_FACTORY_LATITUDE") ?? 12.8896366;
export const SHOP_LONGITUDE = readEnvFloat("FOOD_FACTORY_LONGITUDE") ?? 77.6010219;

const EARTH_RADIUS_KM = 6371;

function readEnvFloat(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : null;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two coordinate pairs, in kilometres. */
export function haversineDistanceKm(
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

/** Distance from the shop to the given coordinates, or null when invalid. */
export function distanceToShopKm(latitude: number | null | undefined, longitude: number | null | undefined): number | null {
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }
  return haversineDistanceKm(SHOP_LATITUDE, SHOP_LONGITUDE, latitude, longitude);
}