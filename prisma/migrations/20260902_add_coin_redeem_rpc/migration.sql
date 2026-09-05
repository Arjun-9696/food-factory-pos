-- ============================================================================
-- Food Factory Coins — atomic redemption for zero-value orders
--
-- ff_redeem_coins() deducts coins and writes the ledger inside ONE database
-- transaction. The user row is locked (SELECT ... FOR UPDATE) so concurrent
-- redemptions are serialised and can never over-draft a balance.
--
-- Security: the function is SECURITY DEFINER (bypasses RLS as the table
-- owner) BUT it self-scopes to the authenticated caller via auth.uid() — a
-- customer can only ever redeem their OWN coins. Unauthenticated (anon /
-- webhook) callers are rejected unless the JWT's sub matches p_user_id.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ff_redeem_coins(
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
  v_caller uuid := auth.uid();
  v_balance integer;
  v_redemption_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF v_caller <> p_user_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
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

  -- Idempotency: one redemption per order.
  IF EXISTS (
    SELECT 1 FROM public.coin_transactions
     WHERE reference_type = 'ORDER'
       AND reference_id = p_order_id
       AND type = 'REDEMPTION'
  ) THEN
    RAISE EXCEPTION 'ALREADY_REDEEMED';
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

-- Expose to the anon + authenticated roles (self-service, JWT-scoped).
REVOKE ALL ON FUNCTION public.ff_redeem_coins(uuid, integer, uuid, text, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ff_redeem_coins(uuid, integer, uuid, text, double precision) TO anon;
GRANT EXECUTE ON FUNCTION public.ff_redeem_coins(uuid, integer, uuid, text, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ff_redeem_coins(uuid, integer, uuid, text, double precision) TO service_role;