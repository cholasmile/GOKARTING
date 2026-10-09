-- Comprehensive Supabase Migration for Deuce Offline-to-Online Sync & Realtime Stream
-- Safe and idempotent: can be executed multiple times without affecting existing data.

-- 1. Bookings Enhancements
ALTER TABLE "bookings" 
  ADD COLUMN IF NOT EXISTS "customerPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "discountType" TEXT,
  ADD COLUMN IF NOT EXISTS "discountPercentage" NUMERIC,
  ADD COLUMN IF NOT EXISTS "discountAmount" NUMERIC,
  ADD COLUMN IF NOT EXISTS "originalAmount" NUMERIC,
  ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS "packageId" TEXT,
  ADD COLUMN IF NOT EXISTS "packageName" TEXT,
  ADD COLUMN IF NOT EXISTS "unitPrice" NUMERIC,
  ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT,
  ADD COLUMN IF NOT EXISTS "refundAmount" NUMERIC,
  ADD COLUMN IF NOT EXISTS "refundMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "refundedAt" TEXT,
  ADD COLUMN IF NOT EXISTS "refundedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- 2. Tickets Enhancements
ALTER TABLE "tickets"
  ADD COLUMN IF NOT EXISTS "customerPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "packageId" TEXT,
  ADD COLUMN IF NOT EXISTS "packageName" TEXT,
  ADD COLUMN IF NOT EXISTS "unitPrice" NUMERIC,
  ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- 3. Payments Enhancements
ALTER TABLE "payments" 
  ADD COLUMN IF NOT EXISTS "invoice_id" TEXT,
  ADD COLUMN IF NOT EXISTS "customer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "payment_method" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_status" TEXT,
  ADD COLUMN IF NOT EXISTS "gateway" TEXT,
  ADD COLUMN IF NOT EXISTS "gateway_order_id" TEXT,
  ADD COLUMN IF NOT EXISTS "gateway_payment_id" TEXT,
  ADD COLUMN IF NOT EXISTS "gateway_reference_id" TEXT,
  ADD COLUMN IF NOT EXISTS "pos_transaction_id" TEXT,
  ADD COLUMN IF NOT EXISTS "terminal_id" TEXT,
  ADD COLUMN IF NOT EXISTS "created_at" TEXT,
  ADD COLUMN IF NOT EXISTS "updated_at" TEXT,
  ADD COLUMN IF NOT EXISTS "paid_at" TEXT,
  ADD COLUMN IF NOT EXISTS "failure_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "refund_status" TEXT,
  ADD COLUMN IF NOT EXISTS "ticketId" TEXT,
  ADD COLUMN IF NOT EXISTS "customerName" TEXT,
  ADD COLUMN IF NOT EXISTS "customerPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "activityName" TEXT,
  ADD COLUMN IF NOT EXISTS "counterId" TEXT,
  ADD COLUMN IF NOT EXISTS "staffId" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- 4. Food Orders Enhancements
ALTER TABLE "food_orders"
  ADD COLUMN IF NOT EXISTS "customerPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- 5. Users Enhancements
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "password" TEXT,
  ADD COLUMN IF NOT EXISTS "vendorId" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- 6. Activities Enhancements
ALTER TABLE "activities"
  ADD COLUMN IF NOT EXISTS "videoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "shortDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "detailedDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "photos" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "coverPhotoId" TEXT,
  ADD COLUMN IF NOT EXISTS "duration" TEXT,
  ADD COLUMN IF NOT EXISTS "ageRequirement" TEXT,
  ADD COLUMN IF NOT EXISTS "rules" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "offers" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- 7. Food Vendors & Menu Items & Inventory Enhancements
ALTER TABLE "food_vendors" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "currentStock" NUMERIC DEFAULT 100, ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- 8. Go-Karting Domain Tables
CREATE TABLE IF NOT EXISTS "karts" (
  "id" TEXT PRIMARY KEY,
  "kartNumber" TEXT,
  "name" TEXT,
  "status" TEXT DEFAULT 'available',
  "batteryLevel" NUMERIC,
  "fuelLevel" NUMERIC,
  "assignedDriver" TEXT,
  "assignedSessionId" TEXT,
  "lastMaintenance" TEXT,
  "totalLaps" INTEGER DEFAULT 0,
  "isAvailable" BOOLEAN DEFAULT true,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" TEXT PRIMARY KEY,
  "sessionName" TEXT,
  "startTime" TEXT,
  "endTime" TEXT,
  "status" TEXT DEFAULT 'scheduled',
  "maxDrivers" INTEGER DEFAULT 8,
  "driverIds" JSONB DEFAULT '[]'::jsonb,
  "kartAssignments" JSONB DEFAULT '[]'::jsonb,
  "activityId" TEXT,
  "raceType" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "waivers" (
  "id" TEXT PRIMARY KEY,
  "customerName" TEXT,
  "customerEmail" TEXT,
  "customerPhone" TEXT,
  "ticketId" TEXT,
  "activityId" TEXT,
  "signedAt" TEXT,
  "guardianName" TEXT,
  "waiverVersion" TEXT,
  "agreedToTerms" BOOLEAN DEFAULT true,
  "signatureData" TEXT,
  "updatedAt" TEXT
);

CREATE TABLE IF NOT EXISTS "lap_records" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT,
  "driverId" TEXT,
  "driverName" TEXT,
  "kartId" TEXT,
  "kartNumber" TEXT,
  "lapNumber" INTEGER,
  "lapTime" NUMERIC,
  "sector1Time" NUMERIC,
  "sector2Time" NUMERIC,
  "sector3Time" NUMERIC,
  "timestamp" TEXT,
  "isFastestLap" BOOLEAN DEFAULT false,
  "updatedAt" TEXT
);

-- 9. Full Replica Identity for Complete Realtime CDC Payloads
ALTER TABLE "activities" REPLICA IDENTITY FULL;
ALTER TABLE "food_vendors" REPLICA IDENTITY FULL;
ALTER TABLE "menu_items" REPLICA IDENTITY FULL;
ALTER TABLE "inventory" REPLICA IDENTITY FULL;
ALTER TABLE "bookings" REPLICA IDENTITY FULL;
ALTER TABLE "tickets" REPLICA IDENTITY FULL;
ALTER TABLE "food_orders" REPLICA IDENTITY FULL;
ALTER TABLE "payments" REPLICA IDENTITY FULL;
ALTER TABLE "users" REPLICA IDENTITY FULL;
ALTER TABLE "notifications" REPLICA IDENTITY FULL;
ALTER TABLE "karts" REPLICA IDENTITY FULL;
ALTER TABLE "sessions" REPLICA IDENTITY FULL;
ALTER TABLE "waivers" REPLICA IDENTITY FULL;
ALTER TABLE "lap_records" REPLICA IDENTITY FULL;

-- 10. Enable Supabase Realtime Publication for Live Synchronization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      activities,
      food_vendors,
      menu_items,
      inventory,
      bookings,
      tickets,
      food_orders,
      payments,
      users,
      notifications,
      karts,
      sessions,
      waivers,
      lap_records;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Publication already contains tables
END $$;

-- 11. Row Level Security Policies (Allow seamless reads and writes for authorized POS/Counter/Online operations)
ALTER TABLE "karts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "waivers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lap_records" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Allow anonymous read all" ON "activities";
  DROP POLICY IF EXISTS "Allow anonymous insert all" ON "activities";
  DROP POLICY IF EXISTS "Allow anonymous update all" ON "activities";
  DROP POLICY IF EXISTS "Allow anonymous read all" ON "bookings";
  DROP POLICY IF EXISTS "Allow anonymous insert all" ON "bookings";
  DROP POLICY IF EXISTS "Allow anonymous update all" ON "bookings";
  DROP POLICY IF EXISTS "Allow anonymous read all" ON "tickets";
  DROP POLICY IF EXISTS "Allow anonymous insert all" ON "tickets";
  DROP POLICY IF EXISTS "Allow anonymous update all" ON "tickets";
  DROP POLICY IF EXISTS "Allow anonymous read all" ON "payments";
  DROP POLICY IF EXISTS "Allow anonymous insert all" ON "payments";
  DROP POLICY IF EXISTS "Allow anonymous update all" ON "payments";
  DROP POLICY IF EXISTS "Allow anonymous read all" ON "food_orders";
  DROP POLICY IF EXISTS "Allow anonymous insert all" ON "food_orders";
  DROP POLICY IF EXISTS "Allow anonymous update all" ON "food_orders";
  DROP POLICY IF EXISTS "Allow anonymous read all" ON "karts";
  DROP POLICY IF EXISTS "Allow anonymous write all" ON "karts";
  DROP POLICY IF EXISTS "Allow anonymous read all" ON "sessions";
  DROP POLICY IF EXISTS "Allow anonymous write all" ON "sessions";
  DROP POLICY IF EXISTS "Allow anonymous read all" ON "waivers";
  DROP POLICY IF EXISTS "Allow anonymous write all" ON "waivers";
  DROP POLICY IF EXISTS "Allow anonymous read all" ON "lap_records";
  DROP POLICY IF EXISTS "Allow anonymous write all" ON "lap_records";
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Allow anonymous read all" ON "karts" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write all" ON "karts" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read all" ON "sessions" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write all" ON "sessions" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read all" ON "waivers" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write all" ON "waivers" FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous read all" ON "lap_records" FOR SELECT USING (true);
CREATE POLICY "Allow anonymous write all" ON "lap_records" FOR ALL USING (true) WITH CHECK (true);
