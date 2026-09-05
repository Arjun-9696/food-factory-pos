-- ============================================================================
-- Food Factory Coins — atomic, idempotent redemption for ONLINE-gated coins.
--
-- Context:
--   * ff_redeem_coins (20260902) deducts coins for a fully-covered (zero-value)
--     order at CHECKOUT time, scoped to the caller's JWT via auth.uid().
--
--   * For a PARTIAL coin payment (coins cover part, Razorpay covers the rest)
--     the coins must only be deducted AFTER the Razorpay payment settles. That
--     settlement runs from the server (verify-payment AND the webhook), where
--     there is often no customer JWT — so auth.uid() is null and ff_redeem_coins
--     cannot be used.
--
-- This function is the settlement-time sibling: it deducts the AUTHORITATIVE
-- coin amount (the snapshot.coinDiscount recorded at checkout, the only value
-- the wallet may ever be charged) inside ONE database transaction, with the
-- user row locked (SELECT ... FOR UPDATE) so concurrent verify-payment +
-- webhook calls can never over-draft or double-deduct.
--
-- Idempotency: exactly one REDEMPTION is allowed per order (unique constraint
-- on coin_transactions(reference_type='ORDER', reference_id=order_id,
-- type='REDEMPTION')). A replayed or concurrent call returns the current
-- balance instead of deducting again.
--
-- Security: SECURITY DEFINER + trusted p_user_id is ONLY callable with the
-- server's service-role key (which the browser never has). Clients holding
-- only the anon key or a user JWT cannot invoke it with an arbitrary user; the
-- function additionally refuses impossible/negative coin counts and refuses to
-- spend more than the wallet holds.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ff_redeem_coins_service(
  p_user_id uuid,
  p_coins integer,
  p_order_id uuid,
  p_order_number text,
  p_discount_amount double precision
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_redemption_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;
  IF p_coins IS NULL OR p_coins <= 0 THEN
    RAISE EXCEPTION 'INVALID_COINS';
  END IF;

  -- Serialise concurrent redemptions against this user's wallet.
  SELECT coin_balance INTO v_balance
    FROM public.users
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF v_balance < p_coins THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  -- Idempotency: one redemption per order (unique constraint is the final
  -- fence; a replay/concurrent call simply re-reads the live balance).
  IF EXISTS (
    SELECT 1 FROM public.coin_transactions
     WHERE reference_type = 'ORDER'
       AND reference_id = p_order_id
       AND type = 'REDEMPTION'
  ) THEN
    RETURN v_balance;
  END IF;

  UPDATE public.users
     SET coin_balance = v_balance - p_coins
   WHERE id = p_user_id;

  INSERT INTO public.coin_redemptions
    (user_id, coins_used, discount_amount, order_id, status, created_at)
  VALUES
    (p_user_id, p_coins, p_discount_amount, p_order_id, 'APPLIED', now())
  RETURNING id INTO v_redemption_id;

  INSERT INTO public.coin_transactions
    (user_id, type, amount, balance_before, balance_after,
     description, reference_type, reference_id, created_at)
  VALUES
    (p_user_id, 'REDEMPTION', -p_coins, v_balance, v_balance - p_coins,
     p_coins || ' Food Factory Coins redeemed for ₹' || p_discount_amount || ' discount on order #' || p_order_number,
     'ORDER', p_order_id, now());

  RETURN v_balance - p_coins;
END;
$$;

-- Only the service role may call this (it trusts an explicit user id). The
-- browser must never reach it.
REVOKE ALL ON FUNCTION public.ff_redeem_coins_service(uuid, integer, uuid, text, double precision) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ff_redeem_coins_service(uuid, integer, uuid, text, double precision) FROM anon;
REVOKE ALL ON FUNCTION public.ff_redeem_coins_service(uuid, integer, uuid, text, double precision) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ff_redeem_coins_service(uuid, integer, uuid, text, double precision) TO service_role;
