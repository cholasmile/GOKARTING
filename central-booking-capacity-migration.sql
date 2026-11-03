-- ==============================================================================
-- DEUCE ADVENTURE PARK — CENTRAL BOOKING CAPACITY & DOUBLE-BOOKING PREVENTION
-- Safe and idempotent: can be run multiple times in Supabase SQL Editor.
-- ==============================================================================

-- 1. Slot Capacities Table
CREATE TABLE IF NOT EXISTS "slot_capacities" (
  "id" TEXT PRIMARY KEY,
  "activity_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "time_slot" TEXT NOT NULL,
  "max_capacity" INTEGER NOT NULL DEFAULT 20,
  "max_single_karts" INTEGER NOT NULL DEFAULT 12,
  "max_double_karts" INTEGER NOT NULL DEFAULT 4,
  "offline_quota" INTEGER NOT NULL DEFAULT 5,
  "is_closed" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "uq_activity_date_slot" UNIQUE ("activity_id", "date", "time_slot")
);

-- Index for instant slot lookup
CREATE INDEX IF NOT EXISTS "idx_slot_capacities_lookup"
  ON "slot_capacities" ("activity_id", "date", "time_slot");

-- 2. Slot Holds Table (Atomic Double-Booking Prevention)
CREATE TABLE IF NOT EXISTS "slot_holds" (
  "id" TEXT PRIMARY KEY,
  "hold_token" TEXT UNIQUE NOT NULL,
  "activity_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "time_slot" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "single_karts" INTEGER NOT NULL DEFAULT 0,
  "double_karts" INTEGER NOT NULL DEFAULT 0,
  "customer_email" TEXT,
  "customer_phone" TEXT,
  "razorpay_order_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active', -- 'active', 'confirmed', 'expired', 'released'
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_slot_holds_active"
  ON "slot_holds" ("activity_id", "date", "time_slot", "status", "expires_at");

-- 3. Online Bookings Table
CREATE TABLE IF NOT EXISTS "online_bookings" (
  "id" TEXT PRIMARY KEY,
  "booking_ref" TEXT UNIQUE NOT NULL,
  "customer_name" TEXT NOT NULL,
  "customer_email" TEXT NOT NULL,
  "customer_phone" TEXT,
  "activity_id" TEXT NOT NULL,
  "activity_name" TEXT NOT NULL,
  "package_id" TEXT,
  "package_name" TEXT,
  "date" DATE NOT NULL,
  "time_slot" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "single_karts" INTEGER NOT NULL DEFAULT 0,
  "double_karts" INTEGER NOT NULL DEFAULT 0,
  "total_amount" NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  "payment_method" TEXT NOT NULL DEFAULT 'RAZORPAY',
  "payment_status" TEXT NOT NULL DEFAULT 'paid', -- 'pending', 'paid', 'failed', 'refunded', 'cancelled'
  "razorpay_order_id" TEXT,
  "razorpay_payment_id" TEXT,
  "qr_code_value" TEXT UNIQUE NOT NULL,
  "checkin_status" TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'checked_in'
  "checked_in_at" TIMESTAMPTZ,
  "checked_in_by" TEXT,
  "checked_in_terminal" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_online_bookings_date"
  ON "online_bookings" ("date", "checkin_status");

CREATE INDEX IF NOT EXISTS "idx_online_bookings_ref"
  ON "online_bookings" ("booking_ref");

CREATE INDEX IF NOT EXISTS "idx_online_bookings_qr"
  ON "online_bookings" ("qr_code_value");

-- 4. Enable RLS
ALTER TABLE "slot_capacities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "slot_holds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "online_bookings" ENABLE ROW LEVEL SECURITY;

-- 5. Public RLS Policies
DROP POLICY IF EXISTS "Public read slot capacities" ON "slot_capacities";
CREATE POLICY "Public read slot capacities" ON "slot_capacities" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active holds" ON "slot_holds";
CREATE POLICY "Public read active holds" ON "slot_holds" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access online bookings" ON "online_bookings";
CREATE POLICY "Public access online bookings" ON "online_bookings" FOR ALL USING (true) WITH CHECK (true);
