import { describe, it, expect } from "vitest";
import { normalizeIndianPhone } from "./phone";

describe("normalizeIndianPhone", () => {
  it("normalizes a 10-digit Indian mobile to E.164", () => {
    expect(normalizeIndianPhone("9876543210")).toBe("+919876543210");
  });

  it("normalizes 10 digits already prefixed with the country code", () => {
    expect(normalizeIndianPhone("919876543210")).toBe("+919876543210");
  });

  it("drops the trunk 0 prefix from an 11-digit number", () => {
    expect(normalizeIndianPhone("09876543210")).toBe("+919876543210");
  });

  it("accepts a number formatted with spaces, dashes and parentheses", () => {
    expect(normalizeIndianPhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizeIndianPhone("(987) 654-3210")).toBe("+919876543210");
  });

  it("rejects a 10-digit number that does not start with 6-9", () => {
    expect(normalizeIndianPhone("1234567890")).toBeNull();
  });

  it("rejects non-mobile inputs", () => {
    expect(normalizeIndianPhone("")).toBeNull();
    expect(normalizeIndianPhone("abc")).toBeNull();
    expect(normalizeIndianPhone("123")).toBeNull();
    expect(normalizeIndianPhone("1234567890123456")).toBeNull();
  });

  it("preserves other international numbers with a leading +", () => {
    expect(normalizeIndianPhone("12125551234")).toBe("+12125551234");
  });
});