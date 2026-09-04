/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Maps Place ID of the shop (starts with "ChIJ"). */
  readonly VITE_GOOGLE_PLACE_ID?: string;
  /** Google Cloud API key with "Places API (New)" enabled. */
  readonly VITE_GOOGLE_PLACES_API_KEY?: string;
  /** Razorpay public key id (starts with "rzp_"), used only in the browser. */
  readonly VITE_RAZORPAY_KEY_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
