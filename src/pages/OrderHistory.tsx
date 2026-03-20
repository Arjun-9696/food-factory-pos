import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase, SUPABASE_CONFIG } from "@/lib/supabaseClient";
import { ArrowLeft, Clock, ReceiptIndianRupee, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { MobileNav } from "@/components/pos/MobileNav";
import { CartDrawer } from "@/components/pos/CartDrawer";

interface OrderItem {
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  gst: number;
  grand_total: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

function OrderSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-[72px] skeleton-shimmer rounded-xl" />
      ))}
    </div>
  );
}

export default function OrderHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>(() => {
    // Optimistic: load from localStorage immediately while fetching from server
    try {
      const stored = localStorage.getItem("ff_orders");
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      // Fetch orders
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;

      // Fetch order items for all orders
      const orderIds = (ordersData || []).map(o => o.id);
      let itemsMap: Record<string, OrderItem[]> = {};
      
      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from("order_items")
          .select("*")
          .in("order_id", orderIds);

        if (itemsData) {
          itemsData.forEach((item: any) => {
            if (!itemsMap[item.order_id]) {
              itemsMap[item.order_id] = [];
            }
            itemsMap[item.order_id].push({
              product_name: item.product_name,
              product_price: item.product_price,
              quantity: item.quantity,
              total: item.total,
            });
          });
        }
      }

      // Merge items into orders
      const fetched = (ordersData || []).map((order: any) => ({
        ...order,
        items: itemsMap[order.id] || [],
        grand_total: order.grand_total || 0,
        subtotal: order.subtotal || 0,
        gst: order.gst || 0,
        discount: order.discount || 0,
      })) as Order[];
      
      setOrders(fetched);
      localStorage.setItem("ff_orders", JSON.stringify(fetched.slice(0, 100)));
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchOrders();
  }, [user, fetchOrders, navigate]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Order History</h1>
              {/* Pulsing Live Dot */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{loading ? "Loading..." : `${orders.length} orders`}</p>
          </div>
          <button
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-3 pb-40">
        {loading && orders.length === 0 ? (
          <OrderSkeleton />
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ReceiptIndianRupee className="w-12 h-12 mb-3 opacity-30" />
            <p className="font-medium">No orders yet</p>
            <Link to="/" className="mt-3 px-5 py-2 rounded-xl cart-gradient text-primary-foreground text-sm font-semibold">
              Start Ordering
            </Link>
          </div>
        ) : (
          orders.map((order) => {
            const isExpanded = expandedId === order.id;
            return (
              <div key={order.id} className="glass-card rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleExpand(order.id)}
                  className="w-full p-4 flex items-center justify-between text-left active:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl cart-gradient flex items-center justify-center text-primary-foreground flex-shrink-0">
                      <ReceiptIndianRupee className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        {" • "}
                        {new Date(order.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-base font-bold text-foreground">₹{order.grand_total}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2 border-t border-border/50">
                    <div className="pt-3 space-y-1.5">
                      {Array.isArray(order.items) && order.items.map((item: OrderItem, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{item.quantity}x {item.product_name}</span>
                          <span className="font-medium text-foreground">₹{item.total}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border/50 pt-2 space-y-1 text-sm">
                      <div className="flex justify-between text-foreground"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
                      {order.discount > 0 && <div className="flex justify-between text-veg"><span>Discount</span><span>-₹{order.discount}</span></div>}
                      <div className="flex justify-between text-foreground"><span>GST (5%)</span><span>₹{order.gst}</span></div>
                      <div className="flex justify-between font-bold text-foreground pt-1 border-t border-border/50">
                        <span>Grand Total</span><span>₹{order.grand_total}</span>
                      </div>
                      {order.customer_phone && (
                        <p className="text-xs text-muted-foreground mt-1">📱 {order.customer_phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      <MobileNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
