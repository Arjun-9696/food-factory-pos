-- Food Factory POS: Add order status timestamp columns
-- These columns track when each status transition occurred.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "pending_at"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "preparing_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "ready_at"     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ;

-- Backfill existing orders:
-- - pending_at defaults to created_at (order was received when created)
-- - the timestamp for the CURRENT status uses updated_at (best available time
--   for a transition that happened before these columns existed)
UPDATE "orders" SET "pending_at" = "created_at" WHERE "pending_at" IS NULL;
UPDATE "orders" SET "preparing_at" = "updated_at" WHERE "status" = 'preparing'  AND "preparing_at" IS NULL;
UPDATE "orders" SET "ready_at"     = "updated_at" WHERE "status" = 'ready'      AND "ready_at" IS NULL;
UPDATE "orders" SET "completed_at" = "updated_at" WHERE "status" = 'completed'  AND "completed_at" IS NULL;
UPDATE "orders" SET "cancelled_at" = "updated_at" WHERE "status" = 'cancelled'  AND "cancelled_at" IS NULL;

-- For orders already past a given status, approximate earlier steps from updated_at
-- so old orders show a time for every completed step instead of "—".
UPDATE "orders" SET "preparing_at" = "updated_at" WHERE "status" IN ('ready','completed','cancelled') AND "preparing_at" IS NULL;
UPDATE "orders" SET "ready_at"     = "updated_at" WHERE "status" IN ('completed') AND "ready_at" IS NULL;
