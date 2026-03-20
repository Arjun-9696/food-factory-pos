"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { supabase, SUPABASE_CONFIG } from "@/lib/supabaseClient";
import { 
  ArrowLeft, RefreshCw, Search, Clock, CheckCircle, XCircle, ChefHat, 
  UtensilsCrossed, Phone, User, ChevronDown, ChevronUp, Bell
} from "lucide-react";
import { toast } from "sonner";
import { MobileNav } from "@/components/pos/MobileNav";
import { CartDrawer } from "@/components/pos/CartDrawer";
import { useTheme } from "next-themes";

type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

interface OrderItem {
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  gst: number;
  grand_total: number;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bgColor: string; icon: React.ElementType; next: OrderStatus | null }> = {
  pending: { 
    label: "New Order", 
    color: "text-amber-600 dark:text-amber-400", 
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    icon: Bell,
    next: "preparing"
  },
  preparing: { 
    label: "Preparing", 
    color: "text-blue-600 dark:text-blue-400", 
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    icon: ChefHat,
    next: "ready"
  },
  ready: { 
    label: "Ready for Pickup", 
    color: "text-purple-600 dark:text-purple-400", 
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    icon: CheckCircle,
    next: "completed"
  },
  completed: { 
    label: "Completed", 
    color: "text-green-600 dark:text-green-400", 
    bgColor: "bg-green-100 dark:bg-green-900/30",
    icon: UtensilsCrossed,
    next: null
  },
  cancelled: { 
    label: "Cancelled", 
    color: "text-red-600 dark:text-red-400", 
    bgColor: "bg-red-100 dark:bg-red-900/30",
    icon: XCircle,
    next: null
  },
};

const STATUS_PROGRESS: OrderStatus[] = ["pending", "preparing", "ready", "completed"];

function OrderSkeleton() {
  return (
    <div className="h-24 skeleton-shimmer rounded-xl" />
  );
}

export default function Orders() {
  const { user, isAdmin } = useAuth();
  const { theme } = useTheme();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
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

      // Fetch order items
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
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) {
      return;
    }
    fetchOrders();
  }, [user, isAdmin, fetchOrders]);

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);
      
      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      toast.success(`Order marked as ${STATUS_CONFIG[newStatus].label}`);
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order status");
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    const currentIndex = STATUS_PROGRESS.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < STATUS_PROGRESS.length - 1) {
      return STATUS_PROGRESS[currentIndex + 1] as OrderStatus;
    }
    return null;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone?.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    preparing: orders.filter(o => o.status === "preparing").length,
    ready: orders.filter(o => o.status === "ready").length,
    completed: orders.filter(o => o.status === "completed").length,
    cancelled: orders.filter(o => o.status === "cancelled").length,
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  const isDark = theme === "dark" || (!theme && typeof window !== "undefined" && document.documentElement.classList.contains("dark"));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Link to="/admin" className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-foreground">Orders</h1>
                  {/* Pulsing Live Dot */}
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {loading ? "Loading..." : `${filteredOrders.length} orders`}
                </p>
              </div>
            </div>
            <button 
              onClick={() => fetchOrders(true)}
              disabled={refreshing}
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            <button
              onClick={() => setStatusFilter("all")}
              className={`p-2 rounded-lg text-center transition-all ${statusFilter === "all" ? "bg-orange-500 text-white" : "bg-secondary text-muted-foreground"}`}
            >
              <p className="text-lg font-bold">{stats.total}</p>
              <p className="text-xs">All</p>
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`p-2 rounded-lg text-center transition-all ${statusFilter === "pending" ? "bg-amber-500 text-white" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"}`}
            >
              <p className="text-lg font-bold">{stats.pending}</p>
              <p className="text-xs">Pending</p>
            </button>
            <button
              onClick={() => setStatusFilter("preparing")}
              className={`p-2 rounded-lg text-center transition-all ${statusFilter === "preparing" ? "bg-blue-500 text-white" : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"}`}
            >
              <p className="text-lg font-bold">{stats.preparing}</p>
              <p className="text-xs">Preparing</p>
            </button>
            <button
              onClick={() => setStatusFilter("ready")}
              className={`p-2 rounded-lg text-center transition-all ${statusFilter === "ready" ? "bg-purple-500 text-white" : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"}`}
            >
              <p className="text-lg font-bold">{stats.ready}</p>
              <p className="text-xs">Ready</p>
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`p-2 rounded-lg text-center transition-all ${statusFilter === "completed" ? "bg-green-500 text-white" : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"}`}
            >
              <p className="text-lg font-bold">{stats.completed}</p>
              <p className="text-xs">Done</p>
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by order ID, customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary border border-border/50 text-foreground placeholder:text-muted-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50"
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 pb-32">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <OrderSkeleton key={i} />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <UtensilsCrossed className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-lg font-medium text-foreground">No orders found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status];
              const StatusIcon = statusConfig.icon;
              const nextStatus = getNextStatus(order.status);
              const isExpanded = expandedId === order.id;
              
              return (
                <div 
                  key={order.id}
                  className={`rounded-xl border transition-all ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} ${isExpanded ? "shadow-lg" : "shadow-sm"}`}
                >
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg ${statusConfig.bgColor} flex items-center justify-center`}>
                          <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">#{order.order_number}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {order.customer_name && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" /> {order.customer_name}
                              </span>
                            )}
                            {order.customer_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {order.customer_phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-500">₹{order.grand_total}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                      <span>
                        {new Date(order.created_at).toLocaleDateString("en-IN", { 
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        {isExpanded ? "Hide details" : "View details"} 
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className={`px-4 pb-4 pt-0 border-t ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                      <div className="mt-3 space-y-2">
                        {order.items && order.items.length > 0 ? (
                          order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-foreground">
                                {item.quantity}x {item.product_name}
                              </span>
                              <span className="text-muted-foreground">₹{item.total}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">No item details available</p>
                        )}
                      </div>
                      
                      <div className={`mt-3 pt-3 border-t ${isDark ? "border-gray-800" : "border-gray-200"} space-y-1`}>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="text-foreground">₹{order.subtotal}</span>
                        </div>
                        {order.discount > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Discount</span>
                            <span>-₹{order.discount}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">GST (5%)</span>
                          <span className="text-foreground">₹{order.gst}</span>
                        </div>
                        <div className="flex justify-between font-bold text-foreground pt-2 border-t border-dashed">
                          <span>Total</span>
                          <span className="text-orange-500">₹{order.grand_total}</span>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="mt-4 flex gap-2 flex-wrap">
                        {nextStatus && order.status !== "cancelled" && order.status !== "completed" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, nextStatus); }}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg"
                          >
                            <StatusIcon className="w-4 h-4" />
                            Mark as {STATUS_CONFIG[nextStatus].label}
                          </button>
                        )}
                        
                        {order.status !== "cancelled" && order.status !== "completed" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "cancelled"); }}
                            className="px-4 py-2.5 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        )}
                        
                        {order.status === "cancelled" && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, "pending"); }}
                            className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold flex items-center justify-center gap-2"
                          >
                            <Clock className="w-4 h-4" />
                            Reopen Order
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <MobileNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
