import { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Minus, Trash2, ShoppingBag, Tag, Loader2, User, Phone, CheckCircle, CreditCard, ShieldCheck, MapPin, Locate, Navigation, Coins } from "lucide-react";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";
import { supabase } from "@/lib/supabaseClient";
import { paymentsApi } from "@/lib/razorpay";
import { normalizeIndianPhone } from "@/lib/phone";
import { composeFullAddress, formatAddressLines, isDeliveryAddressValid, loadGuestAddress, saveGuestAddress } from "@/lib/address";
import { deliveryChargeForAddress } from "@/lib/delivery";
import type { DeliveryAddress } from "@/types/address";
import { CoinRedemptionSection } from "@/components/coins/CoinRedemptionSection";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const triggerConfetti = () => {
  const colors = ["#ff6a00", "#ff9a00", "#ffd54f", "#ff3d00"];

  const shoot = (angle: number, x: number) => {
    confetti({
      particleCount: 30,
      angle,
      spread: 55,
      startVelocity: 50,
      gravity: 1,
      ticks: 180,
      origin: { x, y: 0.5 },
      colors,
      scalar: 1.1,
    });
  };

  // left burst
  shoot(60, 0);

  // right burst
  shoot(120, 1);

  // second wave (quick)
  setTimeout(() => {
    shoot(60, 0);
    shoot(120, 1);
  }, 150);
};

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface BillItem {
  name: string;
  price: number;
  quantity: number;
}

interface BillData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  gst: number;
  delivery: number;
  grandTotal: number;
  deliveryAddress?: DeliveryAddress | null;
  razorpayPaymentId?: string | null;
  whatsappInvoiceStatus?: string | null;
  /** Remaining coin balance after the order settles (coin checkouts). */
  remainingCoins?: number;
  /** Coins redeemed against this order (captured at settlement). */
  coinsUsed?: number;
  /** Payment method actually used ("razorpay" | "FOOD_FACTORY_COINS"). */
  paymentMethod?: string;
}

interface AddressFormState {
  houseNumber: string;
  street: string;
  area: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

const EMPTY_ADDRESS_FORM: AddressFormState = {
  houseNumber: "",
  street: "",
  area: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  latitude: null,
  longitude: null,
};

function addressToFormState(address: DeliveryAddress | null | undefined): AddressFormState {
  if (!address) return EMPTY_ADDRESS_FORM;
  return {
    houseNumber: address.houseNumber || "",
    street: address.street || "",
    area: address.area || "",
    city: address.city || "",
    state: address.state || "",
    postalCode: address.postalCode || "",
    country: address.country || "India",
    latitude: address.latitude,
    longitude: address.longitude,
  };
}

function formStateToAddress(form: AddressFormState): DeliveryAddress {
  return {
    ...form,
    fullAddress: composeFullAddress(form),
  };
}

function saveOrderLocally(orderData: Record<string, unknown>) {
  const stored = JSON.parse(localStorage.getItem("ff_orders") || "[]");
  stored.unshift(orderData);
  localStorage.setItem("ff_orders", JSON.stringify(stored.slice(0, 100)));
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const navigate = useNavigate();
  const {
    items, updateQuantity, removeItem, clearCart,
    subtotal, gst, discount, setDiscount, coinDiscount, setCoinDiscount,
    grandTotal,
    totalItems,
  } = useCart();
  const { user } = useAuth();

  const [discountInput, setDiscountInput] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showBill, setShowBill] = useState(false);
  const [billData, setBillData] = useState<BillData | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormState>(EMPTY_ADDRESS_FORM);
  const [gettingLocation, setGettingLocation] = useState(false);
  const identityAppliedForRef = useRef<string | null>(null);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const applyDiscount = useCallback(() => {
    const val = parseFloat(discountInput);
    setDiscount(!isNaN(val) && val > 0 ? val : 0);
  }, [discountInput, setDiscount]);

  // Reset the coin redemption toggle whenever the user or the cart changes,
  // so the customer re-confirms their choice per checkout session.
  const cartSig = items.map((i) => `${i.item.id}:${i.quantity}`).join("|");
  useEffect(() => {
    setUseCoinsEnabled(false);
    setCoinDiscount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartSig, user?.id]);

  // -------------------------------------------------------------------------
  // Identity auto-fill: when the drawer opens for a logged-in user, pre-fill
  // name (from the session) and phone (from their own profile). Values the
  // customer has already typed are never overwritten.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!open || !user) return;
    const key = user.id;
    if (identityAppliedForRef.current === key) return;
    identityAppliedForRef.current = key;

    const identityName = user.name?.trim() || "";
    if (identityName) setCustomerName(identityName);

    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("phone")
          .eq("user_id", user.id)
          .maybeSingle();
        const storedPhone = typeof data?.phone === "string" ? data.phone.trim() : "";
        if (storedPhone) {
          const normalized = normalizeIndianPhone(storedPhone);
          setCustomerPhone((prev) => (prev.trim() ? prev : normalized ? normalized : storedPhone));
        }
      } catch {
        // Profile lookup is best-effort; checkout still works with manual entry.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  // -------------------------------------------------------------------------
  // Delivery address auto-fill: signed-in users get THEIR profile address (the
  // single source of truth); guests get the address they saved locally so it
  // survives a refresh. Re-loaded whenever the drawer opens.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    if (user) {
      (async () => {
        try {
          const { data } = await supabase
            .from("profiles")
            .select("house_number, street, area, city, state, postal_code, country, latitude, longitude, full_address")
            .eq("user_id", user.id)
            .maybeSingle();
          if (data) {
            setDeliveryAddress({
              houseNumber: String(data.house_number ?? ""),
              street: String(data.street ?? ""),
              area: String(data.area ?? ""),
              city: String(data.city ?? ""),
              state: String(data.state ?? ""),
              postalCode: String(data.postal_code ?? ""),
              country: String(data.country ?? "") || "India",
              latitude: typeof data.latitude === "number" ? data.latitude : null,
              longitude: typeof data.longitude === "number" ? data.longitude : null,
              fullAddress: String(data.full_address ?? ""),
            });
          }
        } catch {
          // Best effort — manual entry still works.
        }
      })();
    } else {
      setDeliveryAddress(loadGuestAddress());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const openAddressEditor = useCallback(() => {
    setAddressForm(addressToFormState(deliveryAddress));
    setEditingAddress(true);
  }, [deliveryAddress]);

  const setAddressField = useCallback((field: keyof AddressFormState, value: string | number | null) => {
    setAddressForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const persistDeliveryAddress = useCallback(async (address: DeliveryAddress) => {
    if (!user) {
      saveGuestAddress(address);
      return;
    }
    try {
      const patch = {
        house_number: address.houseNumber,
        street: address.street,
        area: address.area,
        city: address.city,
        state: address.state,
        postal_code: address.postalCode,
        country: address.country,
        latitude: address.latitude ?? 0,
        longitude: address.longitude ?? 0,
        full_address: address.fullAddress,
        updated_at: new Date().toISOString(),
      };
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing) {
        await supabase.from("profiles").update(patch).eq("user_id", user.id);
      } else {
        await supabase.from("profiles").insert({
          user_id: user.id,
          full_name: user.name || "",
          email: user.email || "",
          ...patch,
        });
      }
    } catch {
      toast.error("Could not save the address. Please try again.");
    }
  }, [user]);

  const saveDeliveryAddress = useCallback(async () => {
    const address = formStateToAddress(addressForm);
    if (!isDeliveryAddressValid(address)) {
      toast.error("Enter a complete delivery address (house/street, area, city, state and 6-digit PIN).");
      return;
    }
    await persistDeliveryAddress(address);
    setDeliveryAddress(address);
    setEditingAddress(false);
    toast.success("Delivery address saved.");
  }, [addressForm, persistDeliveryAddress]);

  const getCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setAddressForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        if (data.address) {
          setAddressForm((prev) => ({
            ...prev,
            houseNumber: data.address.house_number || prev.houseNumber,
            street: data.address.road || prev.street,
            area: data.address.suburb || data.address.neighbourhood || prev.area,
            city: data.address.city || data.address.town || data.address.village || prev.city,
            state: data.address.state || prev.state,
            postalCode: data.address.postcode || prev.postalCode,
            country: data.address.country || prev.country,
          }));
          toast.success("Location detected!");
        }
      } catch {
        toast.success(`Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (error: unknown) {
      const err = error as GeolocationPositionError;
      if (err.code === err.PERMISSION_DENIED) {
        toast.error("Location permission denied. Please enable location access.");
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        toast.error("Location information unavailable.");
      } else if (err.code === err.TIMEOUT) {
        toast.error("Location request timed out.");
      } else {
        toast.error("Failed to get location.");
      }
    } finally {
      setGettingLocation(false);
    }
  }, []);

  const resetAfterOrder = useCallback(() => {
    clearCart();
    setDiscountInput("");
    setCustomerName("");
    setCustomerPhone("");
  }, [clearCart]);

  // -------------------------------------------------------------------------
  // Razorpay online payment (Standard Checkout)
  // -------------------------------------------------------------------------
  const recheckedOnOpenRef = useRef(false);

  // Called ONLY after the server verifies the payment signature + captured
  // status. The success screen renders the SERVER-STORED order details when
  // available; local cart state is only a fallback. The cart is cleared here
  // — never before payment is confirmed.
  const handleRzpPaid = useCallback(
    async (orderNumber: string, razorpayOrderId?: string, remainingCoins?: number) => {
    if (items.length === 0) return;
    const currentDelivery = deliveryChargeForAddress(deliveryAddress).charge;
    const currentGrandTotal = grandTotal + currentDelivery;
    try {
      saveOrderLocally({
        order_number: orderNumber,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        subtotal,
        discount,
        gst,
        delivery: currentDelivery,
        grand_total: currentGrandTotal,
        delivery_address: deliveryAddress,
        status: "paid",
        payment_method: "razorpay",
        created_at: new Date().toISOString(),
        items: items.map(ci => ({
          product_name: ci.item.name,
          product_price: ci.item.price,
          quantity: ci.quantity,
          total: ci.item.price * ci.quantity,
        })),
      });
    } catch {
      // Local history is best-effort (server already has the order).
    }
    triggerConfetti();

    const localBill: BillData = {
      orderNumber,
      customerName,
      customerPhone,
      items: items.map(ci => ({ name: ci.item.name, price: ci.item.price, quantity: ci.quantity })),
      subtotal,
      discount,
      gst,
      delivery: currentDelivery,
      grandTotal: currentGrandTotal,
      deliveryAddress,
      remainingCoins,
      coinsUsed: Math.round(coinDiscount),
      paymentMethod: razorpayOrderId ? "razorpay" : "FOOD_FACTORY_COINS",
    };

    if (razorpayOrderId) {
      try {
        const details = await paymentsApi.getOrderDetails(razorpayOrderId);
        if (details.paymentStatus === "paid") {
          setBillData({
            orderNumber: details.orderNumber,
            customerName: details.customerName || customerName,
            customerPhone: details.customerPhone || customerPhone || "",
            items: details.items.map(it => ({ name: it.name, price: it.price, quantity: it.quantity })),
            subtotal: details.subtotal,
            discount: details.discount,
            gst: details.gst,
            delivery: details.delivery,
            grandTotal: details.grandTotal,
            deliveryAddress: details.deliveryAddress,
            razorpayPaymentId: details.razorpayPaymentId,
            whatsappInvoiceStatus: details.whatsappInvoiceStatus ?? null,
          });
          setShowBill(true);
          resetAfterOrder();
          return;
        }
      } catch (err) {
        console.error("order-details fetch failed", err);
      }
    }

    setBillData(localBill);
    setShowBill(true);
    resetAfterOrder();
  }, [customerName, customerPhone, items, subtotal, discount, gst, grandTotal, deliveryAddress, resetAfterOrder]);

  const rzp = useRazorpayCheckout(handleRzpPaid);
  const rzpBusy = ["starting", "checkout-open", "verifying", "rechecking"].includes(rzp.phase);
  const identityName = user?.name?.trim() || "";
  const deliveryInfo = deliveryChargeForAddress(deliveryAddress);
  const deliveryCharge = deliveryInfo.charge;
  const [useCoinsEnabled, setUseCoinsEnabled] = useState(false);
  const cartGrandTotal = grandTotal + deliveryCharge;
  const coinsToRedeem = Math.round(coinDiscount);
  const coinsCoverFood = useCoinsEnabled && coinDiscount > 0 && grandTotal === 0;
  const orderFreeWithCoins = coinsCoverFood && deliveryCharge === 0;
  const addressReady = isDeliveryAddressValid(deliveryAddress);
  const payOnlineReady = !rzpBusy && !!customerName.trim() && !!normalizeIndianPhone(customerPhone) && items.length > 0 && addressReady;

  // If a payment may have been interrupted (success + network loss / refresh),
  // re-check with the server when the drawer reopens. Only done once per
  // checkout session to avoid nagging after a deliberate cancel.
  useEffect(() => {
    if (open && rzp.hasPending && !recheckedOnOpenRef.current) {
      recheckedOnOpenRef.current = true;
      rzp.recheckPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handlePayOnline = useCallback(async () => {
    const cleanName = customerName.trim();
    if (!cleanName) {
      toast.error("Please enter your name.");
      return;
    }
    const cleanPhone = normalizeIndianPhone(customerPhone);
    if (!cleanPhone) {
      toast.error("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!isDeliveryAddressValid(deliveryAddress)) {
      toast.error("Please add a valid delivery address to continue.");
      return;
    }
    let accessToken: string | undefined;
    if (user) {
      try {
        const { data } = await supabase.auth.getSession();
        accessToken = data.session?.access_token ?? undefined;
      } catch {
        // Proceed as guest if the session token cannot be read.
      }
    }
    recheckedOnOpenRef.current = false;
    await rzp.startPayment({
      items: items.map(ci => ({ productId: ci.item.id, quantity: ci.quantity })),
      customerName: cleanName,
      customerPhone: cleanPhone,
      discount: discount || undefined,
      accessToken,
      deliveryAddress: deliveryAddress as DeliveryAddress,
      useCoins: useCoinsEnabled,
    });
  }, [customerName, customerPhone, items, discount, rzp, user, deliveryAddress, useCoinsEnabled]);

  const closeBill = () => {
    setShowBill(false);
    setBillData(null);
    onClose();
    navigate("/");
  };

  // Bill Modal
  if (showBill && billData) {
    return (
      <div className="fixed inset-0 z-[100] bg-background">
        {/* Top Bar */}
        <div className="sticky top-0 bg-gradient-to-r from-green-500 to-green-600 p-4 flex items-center justify-center text-white">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <span className="font-bold">Order Placed!</span>
          </div>
        </div>
        
        {/* Bill Content */}
        <div className="p-4 max-w-sm mx-auto pb-24">
          <div className="bg-card rounded-2xl p-4 shadow-lg border">
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-orange-400 pb-4 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 border-2 dark:border-orange-400 border-orange-600">
                <img src="/foodfactory.png" alt="FF" className="w-10 h-10 rounded-lg" />
              </div>
              <h2 className="text-xl font-bold text-orange-500">Food Factory</h2>
              <p className="text-xs text-muted-foreground">The Quality Taste</p>
            </div>
            
            {/* Order Info */}
            <div className="flex justify-between text-sm mb-3 pb-3 border-b">
              <div>
                <p className="font-bold text-lg">#{billData.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
            
            {/* Customer Info */}
            {(billData.customerName || billData.customerPhone) && (
              <div className="text-sm mb-3 pb-3 border-b">
                {billData.customerName && <p><strong>Customer:</strong> {billData.customerName}</p>}
                {billData.customerPhone && <p><strong>Phone:</strong> {billData.customerPhone}</p>}
              </div>
            )}

            {/* Delivery Address */}
            {billData.deliveryAddress && (
              <div className="text-sm mb-3 pb-3 border-b">
                <p className="font-semibold mb-0.5"><strong>Deliver to:</strong></p>
                {formatAddressLines(billData.deliveryAddress).map((line, i) => (
                  <p key={i} className="text-muted-foreground">
                    {i === 0 ? <MapPin className="w-3 h-3 inline mr-1" /> : null}
                    {line}
                  </p>
                ))}
              </div>
            )}
            
            {/* Items */}
            <div className="mb-3">
              {billData.items.map((ci, idx) => (
                <div key={idx} className="flex justify-between py-1 text-sm">
                  <span className="text-foreground">{ci.quantity}x {ci.name}</span>
                  <span className="text-muted-foreground">₹{ci.price * ci.quantity}</span>
                </div>
              ))}
            </div>
            
            {/* Totals */}
            <div className="border-t-2 border-dashed border-orange-400 pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{billData.subtotal}</span>
              </div>
              {billData.discount > 0 && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>Discount</span>
                  <span>-₹{billData.discount}</span>
                </div>
              )}
              {billData.coinsUsed != null && billData.coinsUsed > 0 && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>Food Factory Coins</span>
                  <span>-₹{billData.coinsUsed}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST (5%)</span>
                <span>₹{billData.gst}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className={billData.delivery > 0 ? "" : "text-veg"}>{billData.delivery > 0 ? `₹${billData.delivery}` : "FREE"}</span>
              </div>
              {billData.paymentMethod === "FOOD_FACTORY_COINS" && billData.remainingCoins != null && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Remaining Coins</span>
                  <span>{billData.remainingCoins} coins</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t">
                <span>Total</span>
                <span className="text-orange-500">₹{billData.grandTotal}</span>
              </div>
            </div>
            
{/* Payment */}
            {(billData.razorpayPaymentId || billData.whatsappInvoiceStatus === "SENT" || billData.paymentMethod === "FOOD_FACTORY_COINS") && (
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-0.5">
                {billData.paymentMethod === "FOOD_FACTORY_COINS" && (
                  <p>Paid with <span className="font-medium text-foreground">Food Factory Coins</span></p>
                )}
                {billData.razorpayPaymentId && (
                  <p>Paid via <span className="font-medium text-foreground">Razorpay Online Payment</span></p>
                )}
                {billData.razorpayPaymentId && (
                  <p>Razorpay ID: <span className="font-medium text-foreground">{billData.razorpayPaymentId}</span></p>
                )}
                {billData.whatsappInvoiceStatus === "SENT" && (
                  <p className="font-medium text-veg">Invoice sent to your WhatsApp &#10003;</p>
                )}
</div>
            )}

            {/* Footer */}
            <div className="text-center mt-4 pt-4 border-t-2 border-dashed border-orange-400 text-muted-foreground text-sm">
              <p>Thank you for your visit!</p>
              <p>Visit again 🙏</p>
            </div>
          </div>
        </div>
        
        {/* Bottom Close Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <button 
            onClick={closeBill}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg"
          >
            Close & Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50" onClick={onClose} />

      <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-card z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Your Order</h2>
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-foreground">{totalItems} items</span>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
            <X className="w-5 h-5 dark:text-gray-400 text-muted-foreground" />
          </button>
        </div>

        {/* Order info bar */}
        <div className="px-4 py-2 flex items-center justify-between text-xs bg-surface-warm text-foreground flex-shrink-0">
          <span>Order: <strong>---</strong></span>
          <span>{dateStr} • {timeStr}</span>
        </div>

        {/* Items list — Cart section */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-2">
          {items.length > 0 && (
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Cart Items</p>
          )}

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            items.map((ci) => (
              <div key={ci.item.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                <img src={ci.item.image} alt={ci.item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).src = `/placeholder.svg`; }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">{ci.item.name}</p>
                  <p className="text-xs text-muted-foreground">₹{ci.item.price} each</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => updateQuantity(ci.item.id, ci.quantity - 1)}
                    className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <Minus className="w-4 h-4 text-muted-foreground dark:text-gray-400" />
                  </button>
                  <span className="w-7 text-center text-sm font-bold text-foreground">{ci.quantity}</span>
                  <button onClick={() => updateQuantity(ci.item.id, ci.quantity + 1)}
                    className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                    <Plus className="w-4 h-4 dark:text-gray-400" />
                  </button>
                </div>
                <div className="text-right min-w-[50px] flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">₹{ci.item.price * ci.quantity}</p>
                </div>
                <button onClick={() => removeItem(ci.item.id)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-destructive flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer — Checkout section */}
        {items.length > 0 && (
          <div className="border-t flex-shrink-0">
            {/* Checkout section header */}
            <div className="px-4 pt-3 pb-1 bg-surface-warm">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary" />
                Checkout
              </h3>
            </div>

            <div className="p-4 space-y-3">
              {/* Customer Name (Required) */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Customer Name (Required)"
                  value={identityName || customerName}
                  onChange={(e) => { if (!identityName) setCustomerName(e.target.value); }}
                  readOnly={!!identityName}
                  title={identityName ? "Comes from your Food Factory account" : ""}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 read-only:opacity-90" 
                />
              </div>

              {/* Mobile Number (Required) */}
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="tel" 
                  inputMode="tel"
                  placeholder="Mobile Number (Required) *"
                  value={customerPhone} 
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" 
                />
              </div>

              {/* Delivery Address (required before checkout) */}
              <div className="rounded-xl border border-border/50 bg-secondary/40 p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-semibold text-foreground">Delivery Address</p>
                  </div>
                  {deliveryAddress && !editingAddress && (
                    <button onClick={openAddressEditor} className="text-xs font-semibold text-primary flex-shrink-0">
                      Change
                    </button>
                  )}
                </div>

                {editingAddress ? (
                  <div className="space-y-2.5">
                    <button
                      onClick={getCurrentLocation}
                      disabled={gettingLocation}
                      className="w-full py-2.5 rounded-lg border-2 border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {gettingLocation ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Locate className="w-3.5 h-3.5" />
                      )}
                      {gettingLocation ? "Detecting Location..." : "Use Current Location"}
                    </button>

                    {addressForm.latitude != null && addressForm.longitude != null && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        Coordinates: {addressForm.latitude.toFixed(6)}, {addressForm.longitude.toFixed(6)}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">House/Flat No.</label>
                        <input type="text" value={addressForm.houseNumber} placeholder="A-101"
                          onChange={(e) => setAddressField("houseNumber", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">Street</label>
                        <input type="text" value={addressForm.street} placeholder="Main Road"
                          onChange={(e) => setAddressField("street", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-muted-foreground block mb-1">Area / Locality *</label>
                      <input type="text" value={addressForm.area} placeholder="Near mall, market area"
                        onChange={(e) => setAddressField("area", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">City *</label>
                        <input type="text" value={addressForm.city} placeholder="City"
                          onChange={(e) => setAddressField("city", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">State *</label>
                        <input type="text" value={addressForm.state} placeholder="State"
                          onChange={(e) => setAddressField("state", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">PIN (6 digit) *</label>
                        <input type="text" inputMode="numeric" value={addressForm.postalCode} placeholder="560001"
                          onChange={(e) => setAddressField("postalCode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">Country</label>
                        <input type="text" value={addressForm.country} placeholder="India"
                          onChange={(e) => setAddressField("country", e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button onClick={saveDeliveryAddress}
                        className="flex-1 py-2.5 rounded-lg cart-gradient text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        Save Address
                      </button>
                      <button onClick={() => setEditingAddress(false)}
                        className="px-4 py-2.5 rounded-lg bg-secondary text-foreground text-xs font-semibold">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : deliveryAddress ? (
                  <div className="text-xs space-y-0.5">
                    {formatAddressLines(deliveryAddress).map((line, i) => (
                      <p key={i} className="text-muted-foreground">{line}</p>
                    ))}
                    <p className="mt-1 font-medium text-foreground">
                      {deliveryCharge > 0 ? `Delivery ₹${deliveryCharge}` : "Free Delivery"}
                      {deliveryInfo.distanceKm != null && ` • ${deliveryInfo.distanceKm.toFixed(1)} km from shop`}
                    </p>
                  </div>
                ) : (
                  <button onClick={openAddressEditor}
                    className="w-full py-2.5 rounded-lg bg-secondary text-foreground text-xs font-semibold flex items-center justify-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Add Delivery Address
                  </button>
                )}
              </div>

              {/* Discount */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input type="number" placeholder="Discount (₹)" value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" />
                </div>
                <button onClick={applyDiscount}
                  className="px-4 py-2.5 rounded-xl cart-gradient text-primary-foreground text-sm font-semibold">
                  Apply
                </button>
              </div>

              {/* Food Factory Coins redemption */}
              {user && (
                <CoinRedemptionSection
                  subtotal={subtotal}
                  enabled={useCoinsEnabled}
                  onEnabledChange={setUseCoinsEnabled}
                  onDiscountChange={setCoinDiscount}
                />
              )}

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-foreground"><span>Subtotal</span><span>₹{subtotal}</span></div>
                {discount > 0 && <div className="flex justify-between text-veg"><span>Discount</span><span>-₹{discount}</span></div>}
                {useCoinsEnabled && coinDiscount > 0 && (
                  <div className="flex justify-between text-orange-600 dark:text-orange-400">
                    <span>{coinsToRedeem} Coins</span>
                    <span>-₹{coinDiscount}</span>
                  </div>
                )}
                <div className="flex justify-between text-foreground"><span>GST (5%)</span><span>₹{gst}</span></div>
                <div className="flex justify-between text-foreground">
                  <span>Delivery</span>
                  <span className={deliveryCharge > 0 ? "" : "text-veg"}>
                    {deliveryCharge > 0 ? `₹${deliveryCharge}` : items.length > 0 ? "FREE" : "₹0"}
                  </span>
                </div>
                <div className="flex justify-between font-bold pt-1.5 border-t text-foreground">
                  <span>Grand Total</span><span>₹{orderFreeWithCoins ? 0 : cartGrandTotal}</span>
                </div>
              </div>

              {orderFreeWithCoins && (
                <p className="text-xs text-center text-veg bg-veg/10 rounded-lg px-2 py-1.5">
                  🪙 Your Food Factory Coins cover this order — you pay ₹0.
                </p>
              )}

              {coinsCoverFood && deliveryCharge > 0 && (
                <p className="text-xs text-center text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg px-2 py-1.5">
                  🪙 Coins cover your food. Pay only ₹{deliveryCharge} delivery online.
                </p>
              )}

              {/* Pay Online (Razorpay / Coins) */}
              <div className="space-y-1.5">
                <button onClick={handlePayOnline} disabled={!payOnlineReady}
                  className="w-full py-3 rounded-xl cart-gradient text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed transition-transform active:scale-[0.98]">
                  {rzpBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : orderFreeWithCoins ? <Coins className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                  {orderFreeWithCoins ? `Place Order with ${coinsToRedeem} Coins` : "Pay Online"}
                </button>

                {rzpBusy && (
                  <p className="text-xs text-center text-muted-foreground" role="status">
                    <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                    Processing payment...
                  </p>
                )}
                {!rzpBusy && !payOnlineReady && (
                  <p className="text-xs text-center text-muted-foreground">
                    {!customerName.trim()
                      ? "Your name is required to continue."
                      : !normalizeIndianPhone(customerPhone)
                        ? "Enter a valid 10-digit mobile number to continue."
                        : !addressReady
                          ? "Add a valid delivery address to continue (house/street, area, city, state, PIN)."
                          : "Add at least one item to the cart."}
                  </p>
                )}
                {rzp.phase === "cancelled" && (
                  <p className="text-xs text-center text-amber-500" role="status">Payment cancelled. Your cart is still saved.</p>
                )}
                {rzp.phase === "failed" && (
                  <p className="text-xs text-center text-destructive" role="alert">
                    {rzp.errorMessage || "Payment failed. Please try again."}
                  </p>
                )}
                {rzp.phase === "error" && (
                  <p className="text-xs text-center text-muted-foreground" role="alert">{rzp.errorMessage}</p>
                )}
                {(rzp.phase === "failed" || rzp.phase === "error") && (
                  <button onClick={handlePayOnline}
                    className="w-full py-2.5 rounded-xl bg-secondary text-foreground text-sm font-semibold flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Try Payment Again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
