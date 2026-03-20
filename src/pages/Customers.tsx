"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Link } from "react-router-dom";
import { ArrowLeft, Users, Phone, Mail, ShoppingBag, IndianRupee, Gift, Calendar, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { MobileNav } from "@/components/pos/MobileNav";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  loyalty_date: string | null;
  last_order_date: string | null;
  created_at: string;
}

export default function Customers() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user && isAdmin) {
      fetchCustomers();
    }
  }, [user, isAdmin]);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("total_orders", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0);

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 glass-surface border-b border-border/50">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/70">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Customers</h1>
            <p className="text-xs text-muted-foreground">
              {loading ? "Loading..." : `${totalCustomers} customers • ${totalOrders} orders`}
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4 pb-24">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white"
          >
            <Users className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{totalCustomers}</p>
            <p className="text-xs opacity-80">Customers</p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white"
          >
            <ShoppingBag className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-2xl font-bold">{totalOrders}</p>
            <p className="text-xs opacity-80">Total Orders</p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white"
          >
            <IndianRupee className="w-5 h-5 mb-2 opacity-80" />
            <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            <p className="text-xs opacity-80">Revenue</p>
          </motion.div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer, idx) => (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="glass-card rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white font-bold">
                      {(customer.name || "G")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{customer.name || "Guest"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {customer.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-foreground">₹{customer.total_spent.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-muted-foreground">{customer.total_orders} orders</p>
                    </div>
                    {customer.loyalty_points > 0 && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                        <Gift className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                </button>

                {expandedId === customer.id && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                        <p className="font-bold text-foreground">₹{customer.total_spent.toLocaleString("en-IN")}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
                        <p className="font-bold text-foreground">{customer.total_orders}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Loyalty Points</p>
                        <p className="font-bold text-orange-500">{customer.loyalty_points} ⭐</p>
                      </div>
                      <div className="p-3 rounded-xl bg-secondary/50">
                        <p className="text-xs text-muted-foreground mb-1">Avg. Order Value</p>
                        <p className="font-bold text-foreground">
                          ₹{customer.total_orders > 0 ? Math.round(customer.total_spent / customer.total_orders) : 0}
                        </p>
                      </div>
                    </div>
                    
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {customer.email}
                      </div>
                    )}
                    
                    {customer.last_order_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Last order: {new Date(customer.last_order_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
