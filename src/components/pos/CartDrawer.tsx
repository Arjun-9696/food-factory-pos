import { useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { X, Plus, Minus, Trash2, ShoppingBag, Printer, Tag, Send, Loader2, QrCode, User, Phone, CheckCircle } from "lucide-react";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase, SUPABASE_CONFIG } from "@/lib/supabaseClient";
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
import { browserNotification } from "@/lib/notifications";
import { downloadBillPDF } from "@/lib/billGenerator";

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
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 15px; font-size: 11px; line-height: 1.4; max-width: 300px; margin: 0 auto; padding-top: 60px; }
    .top-bar { position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #22c55e, #16a34a); padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; z-index: 9999; }
    .success-text { color: white; font-weight: bold; font-size: 14px; }
    .close-btn { background: white; color: #22c55e; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-size: 14px; font-weight: bold; transition: all 0.3s ease; }
    .close-btn:hover { background: #f0f0f0; transform: scale(1.05); }
    .close-btn:active { transform: scale(0.95); }
    .bill-content { transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55); opacity: 1; transform: scale(1); }
    .bill-content.closing { opacity: 0; transform: scale(0.8) translateY(-20px); }
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
    @media print { .top-bar { display: none; } body { padding-top: 0; } }
  </style>
  <script>
    function closeBill() {
      const content = document.getElementById('billContent');
      const topBar = document.querySelector('.top-bar');
      content.classList.add('closing');
      topBar.style.opacity = '0';
      topBar.style.transform = 'scale(0.8)';
      setTimeout(function() {
        window.close();
      }, 400);
    }
  </script>
</head>
<body>
  <div class="top-bar">
    <span class="success-text">✓ Order Placed!</span>
    <button class="close-btn" onclick="closeBill()">Close</button>
  </div>
  <div class="bill-content" id="billContent">
    <div class="header">
      <div class="logo"><img src="/foodfactory.png" style="width:50px;height:50px;border-radius:10px;" /></div>
      <div class="brand">Food Factory</div>
      <div class="tagline">The Quality Taste</div>
    </div>
  <div class="header">
    <div class="logo"><img src="/foodfactory.png" style="width:50px;height:50px;border-radius:10px;" /></div>
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
    totalItems,
  } = useCart();
  const { user } = useAuth();

  const [discountInput, setDiscountInput] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [billData, setBillData] = useState<{orderNumber: string; customerName: string; customerPhone: string; items: any[]; subtotal: number; discount: number; gst: number; grandTotal: number} | null>(null);
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

  const saveOrderToAppwrite = useCallback(async (): Promise<{ id: string; order_number: number }> => {
    const now = new Date().toISOString();

    // Find or create customer first
    if (customerPhone) {
      const { data: existingCustomer } = await supabase
        .from("customers")
        .select("id, total_orders, total_spent, loyalty_points")
        .eq("phone", customerPhone)
        .maybeSingle();

      if (existingCustomer) {
        // Update existing customer
        await supabase
          .from("customers")
          .update({
            name: customerName || "Guest",
            total_orders: (existingCustomer.total_orders || 0) + 1,
            total_spent: (existingCustomer.total_spent || 0) + (grandTotal || 0),
            loyalty_points: (existingCustomer.loyalty_points || 0) + Math.floor((grandTotal || 0) / 10),
            last_order_date: now,
            updated_at: now,
          })
          .eq("id", existingCustomer.id);
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: customerName || "Guest",
            phone: customerPhone,
            email: null,
            total_orders: 1,
            total_spent: grandTotal || 0,
            loyalty_points: Math.floor((grandTotal || 0) / 10),
            last_order_date: now,
            created_at: now,
            updated_at: now,
          })
          .select("id")
          .single();
        
        if (!customerError && newCustomer) {
          // Customer created successfully
        }
      }
    }
    
    const orderData = {
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      subtotal: subtotal || 0, 
      discount: discount || 0, 
      gst: gst || 0, 
      grand_total: grandTotal || 0,
      status: "completed",
      created_at: now,
      updated_at: now,
    };
    try {
      const { data: orderResult, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select("id, order_number")
        .single();
      
      if (orderError) {
        console.error("Order insert error:", orderError);
        throw new Error(orderError.message);
      }

      if (orderResult && items.length > 0) {
        // Save order items
        const orderItemsData = items.map(item => ({
          order_id: orderResult.id,
          product_name: item.item.name,
          product_price: item.item.price,
          quantity: item.quantity,
          total: (item.item.price || 0) * (item.quantity || 1),
        }));

        await supabase
          .from("order_items")
          .insert(orderItemsData);
      }

      return orderResult;
    } catch (error: any) {
      console.error("Order save error:", error);
      toast.error(error.message || "Failed to save order");
      throw error;
    }
  }, [customerName, customerPhone, subtotal, discount, gst, grandTotal, items]);

  const resetAfterOrder = useCallback(() => {
    clearCart();
    setDiscountInput("");
    setCustomerName("");
    setCustomerPhone("");
  }, [clearCart]);

  const handlePrint = useCallback(async () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setSaving(true);
    try {
      const orderResult = await saveOrderToAppwrite();
      toast.success("Order saved!");
      triggerConfetti();
      
      // Show in-app bill instead of popup
      setBillData({
        orderNumber: String(orderResult.order_number),
        customerName,
        customerPhone,
        items,
        subtotal,
        discount,
        gst,
        grandTotal
      });
      setShowBill(true);
      resetAfterOrder();
      setSaving(false);
    } catch (error: any) {
      console.error("Print error:", error);
      toast.error(error?.message || "Failed to save order");
      setSaving(false);
    }
  }, [saveOrderToAppwrite, resetAfterOrder, customerName, customerPhone, items, subtotal, discount, gst, grandTotal]);

  const closeBill = () => {
    setShowBill(false);
    setBillData(null);
    onClose();
    navigate("/");
  };

  const handleWhatsApp = useCallback(async () => {
    if (!customerPhone.trim()) { 
      toast.error("Please enter WhatsApp number"); 
      return; 
    }
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setSaving(true);
    try {
      const orderResult = await saveOrderToAppwrite();
      const billText = formatBillText(String(orderResult.order_number), customerName, customerPhone, items, subtotal, discount, gst, grandTotal);
      const phone = customerPhone.replace(/\D/g, "");
      const fullPhone = phone.startsWith("91") ? phone : `91${phone}`;
      window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(billText)}`, "_blank");
      toast.success("Opening WhatsApp...");
      triggerConfetti();
      resetAfterOrder();
      navigate("/");
    } catch (error: any) {
      console.error("WhatsApp error:", error);
      toast.error(error?.message || "Failed to save order");
    } finally {
      setSaving(false);
    }
  }, [customerPhone, saveOrderToAppwrite, customerName, items, subtotal, discount, gst, grandTotal, resetAfterOrder, navigate]);

  const handleQRPaid = useCallback(async () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setSaving(true);
    try {
      await saveOrderToAppwrite();
      toast.success("Payment confirmed! Order saved 🎉");
      triggerConfetti();
      resetAfterOrder();
      onClose();
      navigate("/");
    } catch (error: any) {
      console.error("QR payment error:", error);
      toast.error(error?.message || "Failed to save order");
    } finally {
      setSaving(false);
    }
  }, [saveOrderToAppwrite, resetAfterOrder, onClose, navigate, items]);

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
            
            {/* Items */}
            <div className="mb-3">
              {billData.items.map((ci: any, idx: number) => (
                <div key={idx} className="flex justify-between py-1 text-sm">
                  <span className="text-foreground">{ci.quantity}x {ci.item.name}</span>
                  <span className="text-muted-foreground">₹{ci.item.price * ci.quantity}</span>
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
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST (5%)</span>
                <span>₹{billData.gst}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t">
                <span>Total</span>
                <span className="text-orange-500">₹{billData.grandTotal}</span>
              </div>
            </div>
            
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

  if (showOrderComplete) {
    return (
      <>
        <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-6 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Order Placed!</h2>
              <p className="text-white/80 text-sm">Thank you for your order</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-secondary rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Order Number</span>
                  <span className="font-bold text-foreground">#{completedOrder?.orderNumber || orderNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="font-bold text-orange-500 text-lg">₹{(completedOrder?.grandTotal || grandTotal).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {downloadingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download Bill (PDF)
                </button>
                
                <button
                  onClick={handleWhatsApp}
                  className="w-full py-3 rounded-xl bg-green-500 text-white font-semibold flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share on WhatsApp
                </button>
                
                <button
                  onClick={handleCloseOrderComplete}
                  className="w-full py-3 rounded-xl border-2 border-border text-foreground font-semibold"
                >
                  Continue Shopping
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                A push notification will be sent to update you about your order status.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

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
                          <PaymentQR grandTotal={grandTotal} orderNumber="PENDING"/>
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
