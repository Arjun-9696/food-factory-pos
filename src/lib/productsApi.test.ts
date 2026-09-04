import { describe, it, expect } from "vitest";
import { mapDbProduct, findProductBySlug } from "./productsApi";
import { type MenuItem } from "@/data/menu";

describe("mapDbProduct", () => {
  it("maps a database row to a MenuItem", () => {
    const item = mapDbProduct({
      id: "p1",
      name: "Veg Burger",
      description: "Tasty",
      category: "Burgers",
      price: 60,
      food_type: "veg",
      image: "https://example.com/a.jpg",
      available: true,
    });
    expect(item).toMatchObject({
      id: "p1",
      name: "Veg Burger",
      category: "Burgers",
      price: 60,
      foodType: "veg",
      available: true,
    });
  });

  it("preserves the details JSONB payload", () => {
    const item = mapDbProduct({
      id: "p2",
      name: "Paneer Fuel",
      category: "Burgers",
      price: 99,
      details: { calories: undefined, ingredients: ["Paneer"], nutrition: { calories: 480 } },
    });
    expect(item.details?.nutrition?.calories).toBe(480);
    expect(item.details?.ingredients).toEqual(["Paneer"]);
  });

  it("treats missing/invalid details as undefined and unavailable rows correctly", () => {
    const item = mapDbProduct({ id: "p3", name: "X", category: "Y", price: "12", available: false });
    expect(item.details).toBeUndefined();
    expect(item.available).toBe(false);
    expect(item.price).toBe(12);
    expect(item.foodType).toBe("veg");
  });
});

describe("findProductBySlug", () => {
  const products: MenuItem[] = [
    { id: "bg1", name: "Veg Burger", description: "", category: "Burgers", price: 60, foodType: "veg", image: "", available: true },
    { id: "fr2", name: "Peri Peri Fries", description: "", category: "Fries", price: 70, foodType: "veg", image: "", available: false },
  ];

  it("resolves by slugified name (case-insensitive)", () => {
    expect(findProductBySlug(products, "veg-burger")?.id).toBe("bg1");
    expect(findProductBySlug(products, "VEG-BURGER")?.id).toBe("bg1");
    expect(findProductBySlug(products, "peri-peri-fries")?.id).toBe("fr2");
  });

  it("falls back to raw id lookup", () => {
    expect(findProductBySlug(products, "bg1")?.name).toBe("Veg Burger");
  });

  it("returns undefined for unknown slugs", () => {
    expect(findProductBySlug(products, "chicken-biryani")).toBeUndefined();
    expect(findProductBySlug(products, "")).toBeUndefined();
  });
});
