// ============================================================================
// useCoins — React Query hooks for Food Factory Coins (wallet, transactions,
// redemption). Server data is the single source of truth.
// ============================================================================
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export interface CoinWallet {
  balance: number;
  rupeeValue: number;
  minimumRedemption: number;
  canRedeem: boolean;
  nextRewardCoins: number;
  coinsToNextReward: number;
}

export interface CoinTransaction {
  id: string;
  user_id: string;
  type: "ORDER_REWARD" | "REDEMPTION" | "ADMIN_ADJUSTMENT" | "REFUND" | "REVERSAL" | "BONUS";
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_type: string;
  reference_id: string | null;
  created_at: string;
}

export interface CoinTransactionsResult {
  transactions: CoinTransaction[];
  total: number;
}

const WALLET_QUERY_KEY = ["coin-wallet"];

async function fetchWallet(accessToken: string | null): Promise<CoinWallet> {
  const url = accessToken
    ? `/api/coins/wallet?accessToken=${encodeURIComponent(accessToken)}`
    : `/api/coins/wallet`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load coin wallet");
  return res.json();
}

async function fetchTransactions(
  accessToken: string | null,
  page: number,
  limit: number,
): Promise<CoinTransactionsResult> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (accessToken) params.set("accessToken", accessToken);
  const res = await fetch(`/api/coins/transactions?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load transactions");
  return res.json();
}

/**
 * Hook to fetch the authenticated user's Food Factory Coin wallet with
 * real-time updates via Supabase Realtime on the coin_transactions table.
 */
export function useCoinWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }, []);

  const query = useQuery<CoinWallet, Error>({
    queryKey: [...WALLET_QUERY_KEY, user?.id],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchWallet(token);
    },
    enabled: !!user?.id && isSupabaseConfigured(),
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Subscribe to coin_transactions changes for real-time balance updates
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`coin-transactions-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coin_transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [...WALLET_QUERY_KEY, user.id] });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "users",
          filter: `id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: [...WALLET_QUERY_KEY, user.id] });
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

  // Clear cache on user change
  useEffect(() => {
    return () => {
      queryClient.removeQueries({ queryKey: WALLET_QUERY_KEY });
    };
  }, [queryClient]);

  return query;
}

/**
 * Hook to fetch paginated coin transaction history.
 */
export function useCoinTransactions(page = 1, limit = 20) {
  const { user } = useAuth();

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  }, []);

  return useQuery<CoinTransactionsResult, Error>({
    queryKey: ["coin-transactions", user?.id, page, limit],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchTransactions(token, page, limit);
    },
    enabled: !!user?.id && isSupabaseConfigured(),
    keepPreviousData: true,
  });
}

/**
 * Invalidate all coin queries (call after logout).
 */
export function useInvalidateCoins() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    queryClient.removeQueries({ queryKey: WALLET_QUERY_KEY });
    queryClient.removeQueries({ queryKey: ["coin-transactions"] });
  }, [queryClient]);
}
