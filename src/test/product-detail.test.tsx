import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProductDetail from "@/pages/ProductDetail";
import { CartProvider, useCart } from "@/context/CartContext";

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isAdmin: false,
    loading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signInWithGoogle: async () => ({ error: null }),
    signOut: async () => {},
  }),
}));

// Serve the local fallback catalog (which includes rich product details) so the
// test is hermetic and never depends on a live Supabase project.
vi.mock("@/lib/productsApi", async () => {
  const { menuItems } = await vi.importActual<typeof import("@/data/menu")>("@/data/menu");
  const actual = await vi.importActual<typeof import("@/lib/productsApi")>("@/lib/productsApi");
  return {
    mapDbProduct: actual.mapDbProduct,
    loadAllProducts: async () => ({ items: menuItems, ok: true }),
    findProductBySlug: actual.findProductBySlug,
  };
});

// No live review fetches in tests.
vi.mock("@/hooks/useProductReviews", () => ({
  useProductReviews: () => ({ reviews: [], loading: false, refresh: async () => {} }),
}));

// Keep Google Places API out of the test environment entirely.
vi.mock("@/hooks/useGoogleReviews", () => ({
  useGoogleReviews: () => ({ status: "unconfigured", data: null }),
}));

// Curated Google reviews come from Supabase — keep tests hermetic.
vi.mock("@/hooks/useGoogleTestimonials", () => ({
  useGoogleTestimonials: () => ({ testimonials: [], loading: false, refresh: async () => {} }),
}));

function CartProbe() {
  const { totalItems, items, updateQuantity } = useCart();
  return (
    <div>
      <span data-testid="cart-total">{totalItems}</span>
      <span data-testid="cart-rows">{items.length}</span>
      {/* Simulates the cart drawer decreasing the quantity externally */}
      <button type="button" onClick={() => { const first = items[0]; if (first) updateQuantity(first.item.id, 1); }}>
        force-cart-qty-1
      </button>
    </div>
  );
}

function renderPdp(slug: string) {
  return render(
    <CartProvider>
      <MemoryRouter initialEntries={[`/product/${slug}`]}>
        <Routes>
          <Route path="/product/:slug" element={<ProductDetail />} />
        </Routes>
        <CartProbe />
      </MemoryRouter>
    </CartProvider>
  );
}

describe("ProductDetail page", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    window.HTMLElement.prototype.scrollIntoView = () => {};
  });

  it("renders the product from fallback data with name and price", async () => {
    renderPdp("veg-burger");
    const heading = await screen.findByRole("heading", { level: 1, name: /veg burger/i });
    expect(heading).toBeInTheDocument();
    expect(screen.getAllByText(/₹60/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("100% Vegetarian").length).toBeGreaterThan(0);
    expect(screen.getAllByText("100% In-House Made").length).toBeGreaterThan(0);
  });

  it("adds to cart without navigation and merges rapid clicks into one row", async () => {
    renderPdp("veg-burger");

    const addButtons = await screen.findAllByRole("button", { name: /^add to cart/i });
    // Simulate rapid repeated clicks
    fireEvent.click(addButtons[0]);
    fireEvent.click(addButtons[0]);
    fireEvent.click(addButtons[0]);

    await waitFor(() => expect(screen.getByTestId("cart-rows")).toHaveTextContent("1"));
    // First click adds; once in the cart the button updates (never duplicates) the row.
    expect(screen.getByTestId("cart-total")).toHaveTextContent("1");
  });

  it("respects the selected quantity when adding", async () => {
    renderPdp("veg-burger");

    await screen.findByRole("heading", { level: 1, name: /veg burger/i });
    // Start at 1, click "+" once → quantity 2
    const increaseButtons = screen.getAllByRole("button", { name: "Increase quantity" });
    fireEvent.click(increaseButtons[0]);

    const addButtons = screen.getAllByRole("button", { name: /^add to cart/i });
    fireEvent.click(addButtons[0]);

    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("2"));
  });

  it("prevents quantity below 1", async () => {
    renderPdp("veg-burger");

    await screen.findByRole("heading", { level: 1, name: /veg burger/i });
    const decrease = screen.getAllByRole("button", { name: "Decrease quantity" })[0];
    expect(decrease).toBeDisabled();
  });

  it("syncs the PDP quantity when the cart quantity changes externally", async () => {
    renderPdp("veg-burger");

    await screen.findByRole("heading", { level: 1, name: /veg burger/i });
    // Add 2 from the PDP
    fireEvent.click(screen.getAllByRole("button", { name: "Increase quantity" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: /^add to cart/i })[0]);
    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("2"));

    // Decrease to 1 from the "cart drawer"
    fireEvent.click(screen.getByRole("button", { name: "force-cart-qty-1" }));
    await waitFor(() => expect(screen.getByTestId("cart-total")).toHaveTextContent("1"));

    // The PDP stepper must now show 1 as well
    const qtyValues = screen.getAllByText(/^1$/).filter((el) => el.tagName === "SPAN");
    expect(qtyValues.length).toBeGreaterThan(0);
  });

  it("shows the not-found state for unknown slugs", async () => {
    renderPdp("this-does-not-exist");
    expect(await screen.findByText("Product Not Found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /explore menu/i })).toBeInTheDocument();
  });

  it("sets SEO title from product data", async () => {
    renderPdp("veg-burger");
    await screen.findByRole("heading", { level: 1, name: /veg burger/i });
    await waitFor(() => expect(document.title).toMatch(/Veg Burger \| Food Factory/));
  });

  it("emits Product JSON-LD structured data without fabricated ratings", async () => {
    renderPdp("veg-burger");
    await screen.findByRole("heading", { level: 1, name: /veg burger/i });

    await waitFor(() => {
      expect(document.querySelector('script[type="application/ld+json"]')).toBeTruthy();
    });
    const ld = document.querySelector('script[type="application/ld+json"]')!;
    const parsed = JSON.parse(ld.textContent!);
    const productSchema = Array.isArray(parsed)
      ? parsed.find((b: Record<string, unknown>) => b["@type"] === "Product")
      : parsed;
    expect(productSchema.name).toBe("Veg Burger");
    expect(productSchema.offers.priceCurrency).toBe("INR");
    expect(productSchema.aggregateRating).toBeUndefined();
  });
});
