import { describe, it, expect } from "vitest";
import { slugify, productSlug } from "./slug";

describe("slugify", () => {
  it("converts product names to lowercase kebab-case", () => {
    expect(slugify("Veggie Loaded Signature Burger")).toBe("veggie-loaded-signature-burger");
  });

  it("strips special characters", () => {
    expect(slugify("Peri Peri Fries (Spicy)!")).toBe("peri-peri-fries-spicy");
    expect(slugify("Momos – 6 pcs")).toBe("momos-6-pcs");
  });

  it("collapses whitespace and repeated dashes", () => {
    expect(slugify("  Double   Cheese --- Burger  ")).toBe("double-cheese-burger");
  });

  it("handles apostrophes without leaving gaps", () => {
    expect(slugify("Farmer's Choice Shake")).toBe("farmers-choice-shake");
  });

  it("returns empty string for names with no usable characters", () => {
    expect(slugify("???")).toBe("");
  });
});

describe("productSlug", () => {
  it("falls back to an id-based slug when the name has no usable characters", () => {
    expect(productSlug("???", "abc123")).toBe("item-abc123");
  });
});
