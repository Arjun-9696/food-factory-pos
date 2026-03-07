import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Minus, Trash2, ShoppingBag, Printer, Tag, Send, Loader2, QrCode, User, Phone } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { databases, APPWRITE_CONFIG } from "@/lib/appwrite";
import { ID } from "appwrite";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { PaymentQR } from "./PaymentQR";
import { Logo } from "./Logo";
import {
  ExpandableScreen,
  ExpandableScreenContent,
  ExpandableScreenTrigger,
} from "@/components/ui/expandable-screen";

const triggerConfetti = () => {
  const end = Date.now() + 3 * 1000;
  const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];
  const frame = () => {
    if (Date.now() > end) return;
    confetti({ particleCount: 2, angle: 60, spread: 55, startVelocity: 60, origin: { x: 0, y: 0.5 }, colors });
    confetti({ particleCount: 2, angle: 120, spread: 55, startVelocity: 60, origin: { x: 1, y: 0.5 }, colors });
    requestAnimationFrame(frame);
  };
  frame();
};

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

function QRPaymentPanel({ grandTotal, orderNumber, onPaid, saving }: {
  grandTotal: number;
  orderNumber: string;
  onPaid: () => Promise<void>;
  saving: boolean;
}) {
  const [paying, setPaying] = useState(false);

  const handlePaid = async () => {
    setPaying(true);
    await onPaid();
    setPaying(false);
  };

  return (
    <div className="flex flex-col overflow-y-auto max-h-[90vh]">
      <div className="flex items-center justify-center pt-4 pb-2">
        <span className="px-5 py-1.5 rounded-full cart-gradient text-white font-bold text-base shadow-md shadow-orange-500/20">
          Pay ₹{grandTotal}
        </span>
      </div>

      <PaymentQR grandTotal={grandTotal} orderNumber={orderNumber} />

      <div className="px-4 pb-6 pt-2 flex-shrink-0">
        <button
          onClick={handlePaid}
          disabled={paying || saving}
          className="w-full py-3.5 rounded-xl cart-gradient text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-transform active:scale-95 disabled:opacity-50"
        >
          {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : "✅"}
          Payment Done — Complete Order
        </button>
      </div>
    </div>
  );
}

function formatBillText(
  orderNumber: string,
  customerName: string,
  customerPhone: string,
  items: { item: { name: string; price: number }; quantity: number }[],
  subtotal: number, discount: number, gst: number, grandTotal: number,
) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  
  let text = `🍔 *Food Factory - The Quality Taste*\n`;
  text += `📋 Order: *${orderNumber}*\n`;
  text += `📅 ${dateStr} • ${timeStr}\n`;
  
  if (customerName) {
    text += `👤 Customer: ${customerName}\n`;
  }
  if (customerPhone) {
    text += `📱 Phone: ${customerPhone}\n`;
  }
  
  text += `━━━━━━━━━━━━━━━━\n`;
  items.forEach((ci) => { 
    text += `${ci.quantity}x ${ci.item.name} — ₹${ci.item.price * ci.quantity}\n`; 
  });
  text += `━━━━━━━━━━━━━━━━\n`;
  text += `Subtotal: ₹${subtotal}\n`;
  if (discount > 0) text += `Discount: -₹${discount}\n`;
  text += `GST (5%): ₹${gst}\n`;
  text += `*Grand Total: ₹${grandTotal}*\n`;
  text += `━━━━━━━━━━━━━━━━\n`;
  text += `Thank you! Visit again 🙏`;
  return text;
}

function generateBillHTML(
  orderNumber: string,
  customerName: string,
  customerPhone: string,
  items: { item: { name: string; price: number }; quantity: number }[],
  subtotal: number, discount: number, gst: number, grandTotal: number,
) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return `
<!DOCTYPE html>
<html>
<head>
  <title>Food Factory - Bill ${orderNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; font-size: 11px; line-height: 1.4; max-width: 300px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px dashed #f97316; }
    .logo { width: 50px; height: 50px; background: linear-gradient(135deg, #f97316, #fbbf24); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px; }
    .logo span { color: white; font-weight: bold; font-size: 18px; }
    .brand { font-size: 18px; font-weight: 800; color: #f97316; }
    .tagline { font-size: 8px; color: #666; letter-spacing: 1px; text-transform: uppercase; }
    .order-info { display: flex; justify-content: space-between; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee; font-size: 10px; }
    .order-number { font-size: 14px; font-weight: bold; }
    .customer-info { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #eee; font-size: 10px; color: #555; }
    .items { margin-bottom: 10px; }
    .item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted #eee; }
    .item:last-child { border-bottom: none; }
    .item-qty { color: #666; margin-right: 8px; font-weight: 500; }
    .item-name { flex: 1; }
    .item-price { font-weight: 500; }
    .totals { border-top: 2px dashed #f97316; padding-top: 10px; margin-top: 5px; }
    .total-row { display: flex; justify-content: space-between; padding: 3px 0; }
    .grand-total { font-size: 16px; font-weight: 800; border-top: 1px solid #333; padding-top: 8px; margin-top: 5px; color: #f97316; }
    .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 2px dashed #f97316; color: #666; font-size: 10px; }
    .footer p { margin: 2px 0; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo"><span>FF</span></div>
    <div class="brand">Food Factory</div>
    <div class="tagline">The Quality Taste</div>
  </div>
  
  <div class="order-info">
    <div>
      <div class="order-number">#${orderNumber}</div>
      <div>${dateStr} • ${timeStr}</div>
    </div>
  </div>
  
  ${customerName || customerPhone ? `
  <div class="customer-info">
    ${customerName ? `<div><strong>Customer:</strong> ${customerName}</div>` : ''}
    ${customerPhone ? `<div><strong>Phone:</strong> ${customerPhone}</div>` : ''}
  </div>
  ` : ''}
  
  <div class="items">
    ${items.map(ci => `
      <div class="item">
        <div>
          <span class="item-qty">${ci.quantity}x</span>
          <span class="item-name">${ci.item.name}</span>
        </div>
        <span class="item-price">₹${ci.item.price * ci.quantity}</span>
      </div>
    `).join('')}
  </div>
  
  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>₹${subtotal}</span></div>
    ${discount > 0 ? `<div class="total-row" style="color:#16a34a"><span>Discount</span><span>-₹${discount}</span></div>` : ''}
    <div class="total-row"><span>GST (5%)</span><span>₹${gst}</span></div>
    <div class="total-row grand-total"><span>Total</span><span>₹${grandTotal}</span></div>
  </div>
  
  <div class="footer">
    <p>Thank you for your visit!</p>
    <p>Visit again 🙏</p>
    <p style="margin-top: 5px; font-size: 8px;">Food Factory - The Quality Taste</p>
  </div>
</body>
</html>`;
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
    subtotal, gst, discount, setDiscount, grandTotal,
    totalItems, orderNumber,
  } = useCart();
  const { user } = useAuth();

  const [discountInput, setDiscountInput] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const applyDiscount = useCallback(() => {
    const val = parseFloat(discountInput);
    setDiscount(!isNaN(val) && val > 0 ? val : 0);
  }, [discountInput, setDiscount]);

  const handleClear = useCallback(() => {
    clearCart();
    setShowClearConfirm(false);
    setDiscountInput("");
    setCustomerName("");
    setCustomerPhone("");
    onClose();
  }, [clearCart, onClose]);

  const saveOrderToAppwrite = useCallback(async () => {
    const orderData = {
      orderNumber,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      subtotal, discount, gst, grandTotal,
      status: "completed",
      userId: user?.id,
      createdAt: new Date().toISOString(),
      items: items.map(ci => ({
        productName: ci.item.name,
        productPrice: ci.item.price,
        quantity: ci.quantity,
        total: ci.item.price * ci.quantity,
      })),
    };
    try {
      await databases.createDocument(
        APPWRITE_CONFIG.DATABASE_ID,
        APPWRITE_CONFIG.ORDERS_COLLECTION,
        ID.unique(),
        orderData
      );
    } catch {
      saveOrderLocally({ ...orderData, id: "ord_" + Math.random().toString(36).substr(2, 9) });
    }
  }, [orderNumber, customerName, customerPhone, subtotal, discount, gst, grandTotal, user, items]);

  const resetAfterOrder = useCallback(() => {
    clearCart();
    setDiscountInput("");
    setCustomerName("");
    setCustomerPhone("");
  }, [clearCart]);

  const handlePrint = useCallback(async () => {
    setSaving(true);
    await saveOrderToAppwrite();
    toast.success("Order saved!");
    triggerConfetti();
    resetAfterOrder();
    setSaving(false);

    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) { toast.error("Please allow popups for printing"); return; }
    printWindow.document.write(generateBillHTML(orderNumber, customerName, customerPhone, items, subtotal, discount, gst, grandTotal));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      navigate("/");
    }, 250);
  }, [saveOrderToAppwrite, resetAfterOrder, orderNumber, customerName, customerPhone, items, subtotal, discount, gst, grandTotal, navigate]);

  const handleWhatsApp = useCallback(async () => {
    if (!customerPhone.trim()) { 
      toast.error("Please enter WhatsApp number"); 
      return; 
    }
    setSaving(true);
    await saveOrderToAppwrite();
    const billText = formatBillText(orderNumber, customerName, customerPhone, items, subtotal, discount, gst, grandTotal);
    const phone = customerPhone.replace(/\D/g, "");
    const fullPhone = phone.startsWith("91") ? phone : `91${phone}`;
    window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(billText)}`, "_blank");
    toast.success("Opening WhatsApp...");
    triggerConfetti();
    resetAfterOrder();
    setSaving(false);
    navigate("/");
  }, [customerPhone, saveOrderToAppwrite, orderNumber, customerName, items, subtotal, discount, gst, grandTotal, resetAfterOrder, navigate]);

  const handleQRPaid = useCallback(async () => {
    await saveOrderToAppwrite();
    toast.success("Payment confirmed! Order saved 🎉");
    triggerConfetti();
    resetAfterOrder();
    onClose();
    navigate("/");
  }, [saveOrderToAppwrite, resetAfterOrder, onClose, navigate]);

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
          <span>Order: <strong>{orderNumber}</strong></span>
          <span>{dateStr} • {timeStr}</span>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-foreground">{ci.quantity}</span>
                  <button onClick={() => updateQuantity(ci.item.id, ci.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 dark:text-gray-400" />
                  </button>
                </div>
                <div className="text-right min-w-[50px] flex-shrink-0">
                  <p className="text-sm font-bold text-foreground">₹{ci.item.price * ci.quantity}</p>
                </div>
                <button onClick={() => removeItem(ci.item.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-destructive flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div ref={printRef} className="hidden" />

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t flex-shrink-0">
            <div className="p-4 space-y-3">
              {/* Customer Name (Optional) */}
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Customer Name (Optional)"
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" 
                />
              </div>

              {/* WhatsApp Number (Required) */}
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="tel" 
                  placeholder="WhatsApp Number (Required) *"
                  value={customerPhone} 
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" 
                />
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

              {/* Totals */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-foreground"><span>Subtotal</span><span>₹{subtotal}</span></div>
                {discount > 0 && <div className="flex justify-between text-veg"><span>Discount</span><span>-₹{discount}</span></div>}
                <div className="flex justify-between text-foreground"><span>GST (5%)</span><span>₹{gst}</span></div>
                <div className="flex justify-between font-bold pt-1.5 border-t text-foreground">
                  <span>Grand Total</span><span>₹{grandTotal}</span>
                </div>
              </div>

              {/* Clear + Print */}
              <div className="flex gap-2 pt-1">
                {!showClearConfirm ? (
                  <button onClick={() => setShowClearConfirm(true)}
                    className="flex-1 py-3 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold">
                    Clear
                  </button>
                ) : (
                  <div className="flex-1 flex gap-2">
                    <button onClick={handleClear}
                      className="flex-1 py-3 rounded-xl bg-destructive text-white text-sm font-semibold">Confirm</button>
                    <button onClick={() => setShowClearConfirm(false)}
                      className="flex-1 py-3 rounded-xl bg-secondary text-sm font-semibold">Cancel</button>
                  </div>
                )}
                <button onClick={handlePrint} disabled={saving}
                  className="flex-1 py-3 rounded-xl cart-gradient text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                  Print
                </button>
              </div>

              {/* WhatsApp + Scan & Pay */}
              <div className="flex gap-2">
                <button onClick={handleWhatsApp} disabled={saving || !customerPhone.trim()}
                  className="flex-1 py-3 rounded-xl bg-veg text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                  <Send className="w-4 h-4" /> WhatsApp
                </button>

                <ExpandableScreen>
                  <ExpandableScreenTrigger
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <QrCode className="w-4 h-4" />
                    Scan & Pay
                  </ExpandableScreenTrigger>

                  <ExpandableScreenContent>
                    <div className="flex flex-col h-full p-6">
                      <div className="flex justify-center">
                        <div className="p-4 bg-white rounded-xl shadow-inner">
                          <PaymentQR grandTotal={grandTotal} orderNumber={orderNumber}/>
                        </div>
                      </div>

                      <div className="mt-auto">
                        <button
                          onClick={handleQRPaid}
                          disabled={saving}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-sm shadow-lg transition active:scale-95 disabled:opacity-50"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          ) : (
                            "Payment Done"
                          )}
                        </button>
                      </div>
                    </div>
                  </ExpandableScreenContent>
                </ExpandableScreen>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
