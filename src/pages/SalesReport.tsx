"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase, SUPABASE_CONFIG } from "@/lib/supabaseClient";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, Loader2, ShieldAlert, Calendar, 
  ShoppingBag, TrendingUp, ArrowUpDown, Download, 
  ChevronDown, ChevronUp, BarChart3, IndianRupee
} from "lucide-react";
import { motion } from "motion/react";

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

interface DailyStats {
  date: string;
  orders: number;
  totalRevenue: number;
  totalGST: number;
  totalDiscount: number;
  itemsSold: number;
}

export default function SalesReport() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "revenue">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      // Fetch orders
      const { data: ordersData, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      
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
      const ordersList = (ordersData || []).map((doc: any) => ({
        ...doc,
        items: itemsMap[doc.id] || [],
        grand_total: doc.grand_total || 0,
        subtotal: doc.subtotal || 0,
        gst: doc.gst || 0,
        discount: doc.discount || 0,
      })) as Order[];
      
      setOrders(ordersList);
      localStorage.setItem("ff_orders", JSON.stringify(ordersList));
    } catch (error: unknown) {
      console.error("Error fetching orders:", error);
      const localOrders = localStorage.getItem("ff_orders");
      if (localOrders) {
        setOrders(JSON.parse(localOrders));
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchOrders();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, isAdmin, authLoading]);

  // Filter orders by date
  const filteredOrders = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      
      switch (dateFilter) {
        case "today":
          return orderDate >= today;
        case "week": {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return orderDate >= weekAgo;
        }
        case "month": {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return orderDate >= monthAgo;
        }
        default:
          return true;
      }
    });
  }, [orders, dateFilter]);

  // Group by date and calculate daily stats
  const dailyStats = useMemo(() => {
    const stats: Record<string, DailyStats> = {};

    filteredOrders.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      if (!stats[date]) {
        stats[date] = {
          date,
          orders: 0,
          totalRevenue: 0,
          totalGST: 0,
          totalDiscount: 0,
          itemsSold: 0,
        };
      }

      stats[date].orders += 1;
      stats[date].totalRevenue += order.grand_total || 0;
      stats[date].totalGST += order.gst || 0;
      stats[date].totalDiscount += order.discount || 0;
      stats[date].itemsSold += order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    });

    return Object.values(stats).sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === "desc" ? b.totalRevenue - a.totalRevenue : a.totalRevenue - b.totalRevenue;
      }
    });
  }, [filteredOrders, sortBy, sortOrder]);

  // Overall stats
  const overallStats = useMemo(() => {
    return {
      totalOrders: filteredOrders.length,
      totalRevenue: filteredOrders.reduce((sum, o) => sum + (o.grand_total || 0), 0),
      totalGST: filteredOrders.reduce((sum, o) => sum + (o.gst || 0), 0),
      totalDiscount: filteredOrders.reduce((sum, o) => sum + (o.discount || 0), 0),
      totalItemsSold: filteredOrders.reduce((sum, o) => 
        sum + (o.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0),
    };
  }, [filteredOrders]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-6">
          <ShieldAlert className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-4">Only admin can access this page</p>
          <Link to="/" className="text-primary font-semibold">Go to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-foreground">Sales Report</h1>
              <p className="text-xs text-muted-foreground">
                {overallStats.totalOrders} orders • ₹{overallStats.totalRevenue.toLocaleString("en-IN")} revenue
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 pb-40">
        {/* Date Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { value: "today", label: "Today" },
            { value: "week", label: "This Week" },
            { value: "month", label: "This Month" },
            { value: "all", label: "All Time" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setDateFilter(filter.value as typeof dateFilter)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                dateFilter === filter.value
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Overall Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs font-medium opacity-80">Total Orders</span>
            </div>
            <p className="text-2xl font-bold">{overallStats.totalOrders}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <IndianRupee className="w-4 h-4" />
              <span className="text-xs font-medium opacity-80">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold">₹{overallStats.totalRevenue.toLocaleString("en-IN")}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium opacity-80">Items Sold</span>
            </div>
            <p className="text-2xl font-bold">{overallStats.totalItemsSold}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white"
          >
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium opacity-80">Avg Order</span>
            </div>
            <p className="text-2xl font-bold">
              ₹{overallStats.totalOrders > 0 
                ? Math.round(overallStats.totalRevenue / overallStats.totalOrders).toLocaleString("en-IN")
                : 0}
            </p>
          </motion.div>
        </div>

        {/* Daily Stats Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-bold text-foreground">Daily Sales Report</h2>
            <button 
              onClick={() => {
                if (sortBy === "date") {
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                } else {
                  setSortBy("date");
                  setSortOrder("desc");
                }
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowUpDown className="w-4 h-4" />
              Sort by Date
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : dailyStats.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No orders found for this period
            </div>
          ) : (
            <div className="divide-y divide-border">
              {dailyStats.map((day, index) => (
                <motion.div 
                  key={day.date}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {/* Day Header */}
                  <button
                    onClick={() => setExpandedDate(expandedDate === day.date ? null : day.date)}
                    className="w-full p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-orange-500" />
                      <div className="text-left">
                        <p className="font-semibold text-foreground">{day.date}</p>
                        <p className="text-xs text-muted-foreground">{day.orders} orders • {day.itemsSold} items</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-green-600 dark:text-green-400">₹{day.totalRevenue.toLocaleString("en-IN")}</p>
                        {day.totalDiscount > 0 && (
                          <p className="text-xs text-muted-foreground">-₹{day.totalDiscount} discount</p>
                        )}
                      </div>
                      {expandedDate === day.date ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Order Details */}
                  {expandedDate === day.date && (
                    <div className="bg-secondary/20 p-4 border-t border-border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-card rounded-xl">
                          <p className="text-xs text-muted-foreground">Orders</p>
                          <p className="text-lg font-bold text-foreground">{day.orders}</p>
                        </div>
                        <div className="text-center p-3 bg-card rounded-xl">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="text-lg font-bold text-green-600">₹{day.totalRevenue.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="text-center p-3 bg-card rounded-xl">
                          <p className="text-xs text-muted-foreground">GST</p>
                          <p className="text-lg font-bold text-purple-600">₹{day.totalGST.toLocaleString("en-IN")}</p>
                        </div>
                        <div className="text-center p-3 bg-card rounded-xl">
                          <p className="text-xs text-muted-foreground">Items Sold</p>
                          <p className="text-lg font-bold text-orange-600">{day.itemsSold}</p>
                        </div>
                      </div>
                      
                      {/* Individual Orders */}
                      <p className="text-sm font-medium text-muted-foreground mb-2">Orders:</p>
                      <div className="space-y-2">
                        {filteredOrders
                          .filter(o => new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) === day.date)
                          .map(order => (
                            <div key={order.id} className="flex items-center justify-between p-2 bg-card rounded-lg text-sm">
                              <div>
                                <span className="font-medium text-foreground">{order.order_number}</span>
                                <span className="text-muted-foreground ml-2">{formatTime(order.created_at)}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground">{order.items?.length || 0} items</span>
                                <span className="font-bold text-green-600">₹{order.grand_total?.toLocaleString("en-IN") || 0}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
