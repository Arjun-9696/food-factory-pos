// ============================================================================
// DeliveryAddress — the shared customer delivery address model.
// Mirrors the `profiles` table address columns so the profile page, the cart
// and the checkout all use ONE address shape, stored on the server.
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