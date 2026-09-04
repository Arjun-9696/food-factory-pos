-- Food Factory Coins — Loyalty / Rewards System Migration
-- Adds coin_balance to users, coin_transactions and coin_redemptions tables,
-- and coin_discount to orders.
--
-- NOTE: the live database uses native Postgres `uuid` columns (users.id,
-- orders.id are uuid with uuid_generate_v4() default). The coin tables must
-- match those types so the user references can be enforced as foreign keys.

-- 1. Add coin_balance column to users table
ALTER TABLE "users" ADD COLUMN "coin_balance" INTEGER NOT NULL DEFAULT 0;

-- 2. Add coin_discount column to orders table
ALTER TABLE "orders" ADD COLUMN "coin_discount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- 3. Create coin_transactions table
CREATE TABLE "coin_transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_before" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_transactions_pkey" PRIMARY KEY ("id")
);

-- 4. Create coin_redemptions table
CREATE TABLE "coin_redemptions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "coins_used" INTEGER NOT NULL,
    "discount_amount" DOUBLE PRECISION NOT NULL,
    "order_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coin_redemptions_pkey" PRIMARY KEY ("id")
);

-- 5. Unique constraint for idempotency: one reward per order per type
CREATE UNIQUE INDEX "coin_transactions_reference_type_reference_id_type_key" ON "coin_transactions"("reference_type", "reference_id", "type");

-- 6. Performance indexes
CREATE INDEX "coin_transactions_user_id_created_at_idx" ON "coin_transactions"("user_id", "created_at" DESC);
CREATE INDEX "coin_transactions_reference_id_idx" ON "coin_transactions"("reference_id");
CREATE INDEX "coin_transactions_type_idx" ON "coin_transactions"("type");
CREATE INDEX "coin_redemptions_user_id_created_at_idx" ON "coin_redemptions"("user_id", "created_at" DESC);
CREATE INDEX "coin_redemptions_order_id_idx" ON "coin_redemptions"("order_id");

-- 7. Foreign keys
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coin_redemptions" ADD CONSTRAINT "coin_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. Enable realtime so the customer wallet updates live when coins change.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'coin_transactions') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_transactions;
    END IF;
  END IF;
END $$;