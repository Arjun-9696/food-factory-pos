// ============================================================================
// useOrders — React Query hook for fetching customer orders with real-time
// updates via Supabase Realtime subscriptions. Handles active polling as
// a fallback when realtime is unavailable.
// ============================================================================
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import type { OrderStatus } from "@/lib/orderStatus";
import { isOrderActive } from "@/lib/orderStatus";
import { mergeOrderTimestamps } from "@/lib/orderTimestamps";

export interface OrderItemData {
  product_name: string;
  product_price: number;
  quantity: number;
  total: number;
}

export interface OrderData {
  id: string;
  order_number: string;
  user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  discount: number;
  coin_discount: number;
  gst: number;
  delivery: number;
  grand_total: number;
  status: OrderStatus;
  payment_method: string | null;
  delivery_address: Record<string, unknown> | null;
  pending_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItemData[];
}

const ORDERS_QUERY_KEY = ["customer-orders"];

const POLL_INTERVAL_ACTIVE = 10_000;
const POLL_INTERVAL_IDLE = 0;

/** Fetch all orders for the authenticated user. */
async function fetchCustomerOrders(userId: string): Promise<OrderData[]> {
  if (!isSupabaseConfigured()) return [];

  const { data: ordersData, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const orderIds = (ordersData || []).map((o: { id: string }) => o.id);
  if (orderIds.length === 0) return [];

  const { data: itemsData } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  const itemsMap: Record<string, OrderItemData[]> = {};
  if (itemsData) {
    (itemsData as Array<{ order_id: string } & OrderItemData>).forEach((item) => {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push({
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
        total: item.total,
      });
    });
  }

  return (ordersData || []).map((order: Record<string, unknown>) => {
    const base = {
      id: String(order.id),
      order_number: String(order.order_number ?? ""),
      user_id: order.user_id ? String(order.user_id) : null,
      customer_name: order.customer_name ? String(order.customer_name) : null,
      customer_phone: order.customer_phone ? String(order.customer_phone) : null,
      subtotal: Number(order.subtotal) || 0,
      discount: Number(order.discount) || 0,
      coin_discount: Number(order.coin_discount) || 0,
      gst: Number(order.gst) || 0,
      delivery: Number(order.delivery) || 0,
      grand_total: Number(order.grand_total) || 0,
      status: (String(order.status) || "pending") as OrderStatus,
      payment_method: order.payment_method ? String(order.payment_method) : null,
      delivery_address: (order.delivery_address as Record<string, unknown>) || null,
      pending_at: order.pending_at ? String(order.pending_at) : null,
      preparing_at: order.preparing_at ? String(order.preparing_at) : null,
      ready_at: order.ready_at ? String(order.ready_at) : null,
      completed_at: order.completed_at ? String(order.completed_at) : null,
      cancelled_at: order.cancelled_at ? String(order.cancelled_at) : null,
      created_at: String(order.created_at ?? ""),
      updated_at: String(order.updated_at ?? ""),
      items: itemsMap[String(order.id)] || [],
    };
    return mergeOrderTimestamps(base);
  }) as OrderData[];
}

/** Fetch a single order by ID, ensuring user ownership. */
async function fetchOrderById(
  orderId: string,
  userId: string,
): Promise<OrderData | null> {
  if (!isSupabaseConfigured()) return null;

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !order) return null;

  const { data: itemsData } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  const items: OrderItemData[] = (itemsData || []).map(
    (item: { product_name: string; product_price: number; quantity: number; total: number }) => ({
      product_name: item.product_name,
      product_price: item.product_price,
      quantity: item.quantity,
      total: item.total,
    }),
  );

  const base = {
    id: String(order.id),
    order_number: String(order.order_number ?? ""),
    user_id: order.user_id ? String(order.user_id) : null,
    customer_name: order.customer_name ? String(order.customer_name) : null,
    customer_phone: order.customer_phone ? String(order.customer_phone) : null,
    subtotal: Number(order.subtotal) || 0,
    discount: Number(order.discount) || 0,
    coin_discount: Number(order.coin_discount) || 0,
    gst: Number(order.gst) || 0,
    delivery: Number(order.delivery) || 0,
    grand_total: Number(order.grand_total) || 0,
    status: (String(order.status) || "pending") as OrderStatus,
    payment_method: order.payment_method ? String(order.payment_method) : null,
    delivery_address: (order.delivery_address as Record<string, unknown>) || null,
    pending_at: order.pending_at ? String(order.pending_at) : null,
    preparing_at: order.preparing_at ? String(order.preparing_at) : null,
    ready_at: order.ready_at ? String(order.ready_at) : null,
    completed_at: order.completed_at ? String(order.completed_at) : null,
    cancelled_at: order.cancelled_at ? String(order.cancelled_at) : null,
    created_at: String(order.created_at ?? ""),
    updated_at: String(order.updated_at ?? ""),
    items,
  };
  return mergeOrderTimestamps(base);
}

/**
 * Hook to fetch all customer orders with real-time updates.
 * Uses Supabase Realtime for instant updates + React Query polling as fallback.
 */
export function useCustomerOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery<OrderData[], Error>({
    queryKey: [...ORDERS_QUERY_KEY, user?.id],
    queryFn: () => fetchCustomerOrders(user!.id),
    enabled: !!user?.id && isSupabaseConfigured(),
    staleTime: 5_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return POLL_INTERVAL_ACTIVE;
      const hasActiveOrders = data.some((o) => isOrderActive(o.status));
      return hasActiveOrders ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Subscribe to Supabase Realtime for instant order updates
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`customer-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY, user.id] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY, user.id] });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, queryClient]);

  // Clear cache on user change (logout/login)
  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: ORDERS_QUERY_KEY });
    };
  }, [queryClient]);

  return query;
}

/**
 * Hook to fetch a single order with real-time updates.
 */
export function useOrderDetail(orderId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery<OrderData | null, Error>({
    queryKey: ["customer-order", orderId, user?.id],
    queryFn: () => fetchOrderById(orderId!, user!.id),
    enabled: !!orderId && !!user?.id && isSupabaseConfigured(),
    staleTime: 5_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return POLL_INTERVAL_ACTIVE;
      return isOrderActive(data.status) ? POLL_INTERVAL_ACTIVE : POLL_INTERVAL_IDLE;
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Subscribe to real-time updates for this specific order
  useEffect(() => {
    if (!orderId || !user?.id || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`order-detail-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["customer-order", orderId, user.id] });
          queryClient.invalidateQueries({ queryKey: [...ORDERS_QUERY_KEY, user.id] });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orderId, user?.id, queryClient]);

  return query;
}

/** Invalidate all order queries (call after logout). */
export function useInvalidateOrders() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.removeQueries({ queryKey: ORDERS_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ["customer-order"] });
  }, [queryClient]);
}
