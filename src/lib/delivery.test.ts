import { describe, expect, it } from "vitest";
import type { DeliveryAddress } from "@/types/address";
import {
  composeFullAddress,
  isDeliveryAddressValid,
  formatAddressLines,
} from "@/lib/address";
import {
  deliveryChargeForAddress,
  deliveryChargeRupees,
  distanceKm,
  FREE_DELIVERY_KM,
  DELIVERY_FEE_RUPEES,
  SHOP_LATITUDE,
  SHOP_LONGITUDE,
} from "@/lib/delivery";

function address(overrides: Partial<DeliveryAddress> = {}): DeliveryAddress {
  return {
    houseNumber: "12",
    street: "MG Road",
    area: "Shivaji Nagar",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560001",
    country: "India",
    latitude: 12.99,
    longitude: 77.58,
    fullAddress: "",
    ...overrides,
  };
}

describe("composeFullAddress", () => {
  it("joins non-empty parts with commas in the profile order", () => {
    const addr = address();
    expect(composeFullAddress(addr)).toBe("12, MG Road, Shivaji Nagar, Bengaluru, Karnataka, 560001, India");
  });

  it("drops blank parts", () => {
    const addr = address({ street: "", state: "" });
    expect(composeFullAddress(addr)).toBe("12, Shivaji Nagar, Bengaluru, 560001, India");
  });
});

describe("isDeliveryAddressValid", () => {
  it("accepts a complete serviceable address", () => {
    expect(isDeliveryAddressValid(address())).toBe(true);
  });

  it("accepts a house-number-less address when a street exists", () => {
    expect(isDeliveryAddressValid(address({ houseNumber: "" }))).toBe(true);
  });

  it("rejects when nothing distinguishes the location", () => {
    expect(isDeliveryAddressValid(address({ houseNumber: "", street: "" }))).toBe(false);
  });

  it("rejects missing area/city/state/country", () => {
    expect(isDeliveryAddressValid(address({ area: "" }))).toBe(false);
    expect(isDeliveryAddressValid(address({ city: "" }))).toBe(false);
    expect(isDeliveryAddressValid(address({ state: "" }))).toBe(false);
    expect(isDeliveryAddressValid(address({ country: "" }))).toBe(false);
  });

  it("rejects a non-6-digit postal code", () => {
    expect(isDeliveryAddressValid(address({ postalCode: "56-001" }))).toBe(false);
    expect(isDeliveryAddressValid(address({ postalCode: "12345" }))).toBe(false);
  });

  it("rejects null/undefined", () => {
    expect(isDeliveryAddressValid(null)).toBe(false);
    expect(isDeliveryAddressValid(undefined)).toBe(false);
  });
});

describe("formatAddressLines", () => {
  it("renders the address as short stacked lines", () => {
    const lines = formatAddressLines(address());
    expect(lines.join(" / ")).toBe("12, MG Road / Shivaji Nagar / Bengaluru, Karnataka / 560001, India");
  });
});

describe("delivery rule (mirrors the server)", () => {
  it("exposes the same constants as the server", () => {
    expect(FREE_DELIVERY_KM).toBe(2);
    expect(DELIVERY_FEE_RUPEES).toBe(20);
  });

  it("charges nothing within 2 km and ₹20 beyond", () => {
    expect(deliveryChargeRupees(0)).toBe(0);
    expect(deliveryChargeRupees(2)).toBe(0);
    expect(deliveryChargeRupees(2.1)).toBe(20);
    expect(deliveryChargeRupees(15)).toBe(20);
  });

  it("computes zero distance for the shop's own coordinates", () => {
    expect(distanceKm(SHOP_LATITUDE, SHOP_LONGITUDE, SHOP_LATITUDE, SHOP_LONGITUDE)).toBe(0);
  });

  it("returns FREE when the address has no usable coordinates", () => {
    expect(deliveryChargeForAddress(address({ latitude: null, longitude: null })).charge).toBe(0);
    expect(deliveryChargeForAddress(null).charge).toBe(0);
  });

  it("sizes the fee from the address coordinates", () => {
    const farAway = address({ latitude: 13.6, longitude: 77.6 }); // ~78 km north
    expect(deliveryChargeForAddress(farAway).charge).toBe(20);
  });
});