import { describe, expect, it } from "vitest";
import {
  addressFromProfileRow,
  isCompleteProfileAddress,
  composeFullAddress,
  validateDeliveryAddress,
} from "../../api/lib/address";
import {
  haversineDistanceKm,
  distanceToShopKm,
  SHOP_LATITUDE,
  SHOP_LONGITUDE,
} from "../../api/lib/location";

describe("api/lib/address — server-side validation (source of truth)", () => {
  it("accepts a complete valid address and composes a full address", () => {
    const result = validateDeliveryAddress({
      houseNumber: "42",
      street: "Residency Road",
      area: "Central",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560025",
      country: "India",
      latitude: 12.9716,
      longitude: 77.5946,
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.address.fullAddress).toContain("560025");
    expect(result.address.latitude).toBe(12.9716);
  });

  it("rejects a payload with no house number and no street", () => {
    const result = validateDeliveryAddress({
      area: "Central",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560025",
      country: "India",
    });
    expect("error" in result).toBe(true);
  });

  it("rejects a malformed postal code", () => {
    const result = validateDeliveryAddress({
      street: "Residency Road",
      area: "Central",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "5602",
      country: "India",
    });
    expect("error" in result).toBe(true);
  });

  it("rejects missing required fields", () => {
    for (const partial of [
      { city: "Bengaluru" },
      { area: "Central" },
      { state: "Karnataka" },
      { country: "India" },
      {},
      null,
      "nope",
    ]) {
      const result = validateDeliveryAddress(partial as unknown);
      expect("error" in result).toBe(true);
    }
  });

  it("coerces invalid coordinates to null (→ FREE delivery)", () => {
    const result = validateDeliveryAddress({
      houseNumber: "1",
      area: "Central",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560025",
      country: "India",
      latitude: 9999,
      longitude: "abc",
    });
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.address.latitude).toBeNull();
    expect(result.address.longitude).toBeNull();
  });
});

describe("api/lib/address — profiles mapping", () => {
  it("maps a profiles row into a DeliveryAddress", () => {
    const addr = addressFromProfileRow({
      house_number: "7",
      street: "Church Street",
      area: "MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      postal_code: "560001",
      country: "India",
      latitude: 12.9756,
      longitude: 77.6066,
    });
    expect(addr.houseNumber).toBe("7");
    expect(addr.fullAddress).toBe("7, Church Street, MG Road, Bengaluru, Karnataka, 560001, India");
    expect(isCompleteProfileAddress(addr)).toBe(true);
  });

  it("flags an incomplete profile address", () => {
    const addr = addressFromProfileRow({ city: "Bengaluru" });
    expect(isCompleteProfileAddress(addr)).toBe(false);
    expect(composeFullAddress(addr)).toBe("Bengaluru, India");
  });
});

describe("api/lib/location — shop distance", () => {
  it("computes zero distance from the shop to itself", () => {
    expect(haversineDistanceKm(SHOP_LATITUDE, SHOP_LONGITUDE, SHOP_LATITUDE, SHOP_LONGITUDE)).toBe(0);
  });

  it("reports null distance for invalid coordinates", () => {
    expect(distanceToShopKm(null, null)).toBeNull();
    expect(distanceToShopKm(12.9, 480)).toBeNull();
  });

  it("returns a plausible distance to a nearby point", () => {
    // Same longitude, ~1 km directly north.
    const north = distanceToShopKm(SHOP_LATITUDE + 0.01, SHOP_LONGITUDE)!;
    expect(north).toBeGreaterThan(0.9);
    expect(north).toBeLessThan(1.2);
  });
});