-- ============================================================
-- Deuce App — Supabase Sync Fix Migration
-- Safe and idempotent: run multiple times without side effects.
-- Run this in Supabase SQL Editor → your project.
-- ============================================================

-- Fix 1: Add missing paymentMethod column to food_orders
-- (the app always writes paymentMethod but the original schema omitted it)
ALTER TABLE "food_orders" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;

-- Fix 2: Add organizationId to core tables
-- (the app sets organizationId: 'org_deuce_default' on every record,
--  but the original schema never defined this column — upserts silently fail
--  or ignore the column, preventing multi-tenant identification)
ALTER TABLE "bookings"   ADD COLUMN IF NOT EXISTS "organizationId" TEXT DEFAULT 'org_deuce_default';
ALTER TABLE "tickets"    ADD COLUMN IF NOT EXISTS "organizationId" TEXT DEFAULT 'org_deuce_default';
ALTER TABLE "payments"   ADD COLUMN IF NOT EXISTS "organizationId" TEXT DEFAULT 'org_deuce_default';
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "organizationId" TEXT DEFAULT 'org_deuce_default';
ALTER TABLE "food_orders" ADD COLUMN IF NOT EXISTS "organizationId" TEXT DEFAULT 'org_deuce_default';
ALTER TABLE "users"       ADD COLUMN IF NOT EXISTS "organizationId" TEXT DEFAULT 'org_deuce_default';
ALTER TABLE "food_vendors" ADD COLUMN IF NOT EXISTS "organizationId" TEXT DEFAULT 'org_deuce_default';
ALTER TABLE "menu_items"  ADD COLUMN IF NOT EXISTS "organizationId" TEXT DEFAULT 'org_deuce_default';
ALTER TABLE "inventory"   ADD COLUMN IF NOT EXISTS "organizationId" TEXT DEFAULT 'org_deuce_default';

-- Fix 3: Ensure REPLICA IDENTITY FULL on all tables for complete Realtime payloads
-- (Without FULL, UPDATE/DELETE events only include changed columns — merge logic needs all columns)
ALTER TABLE "activities"  REPLICA IDENTITY FULL;
ALTER TABLE "food_vendors" REPLICA IDENTITY FULL;
ALTER TABLE "menu_items"  REPLICA IDENTITY FULL;
ALTER TABLE "inventory"   REPLICA IDENTITY FULL;
ALTER TABLE "bookings"    REPLICA IDENTITY FULL;
ALTER TABLE "tickets"     REPLICA IDENTITY FULL;
ALTER TABLE "food_orders" REPLICA IDENTITY FULL;
ALTER TABLE "payments"    REPLICA IDENTITY FULL;
ALTER TABLE "users"       REPLICA IDENTITY FULL;
ALTER TABLE "notifications" REPLICA IDENTITY FULL;
ALTER TABLE "karts"       REPLICA IDENTITY FULL;
ALTER TABLE "sessions"    REPLICA IDENTITY FULL;
ALTER TABLE "waivers"     REPLICA IDENTITY FULL;
ALTER TABLE "lap_records" REPLICA IDENTITY FULL;

-- Fix 4: Ensure ALL tables are in the Supabase Realtime publication.
-- The previous migration's single guarded DO block would skip all tables
-- if 'bookings' was already in the publication (which it is from the original schema).
-- This uses per-table statements to idempotently add each table.
DO $$
DECLARE
  tbl TEXT;
  tables_to_add TEXT[] := ARRAY[
    'activities', 'food_vendors', 'menu_items', 'inventory',
    'bookings', 'tickets', 'food_orders', 'payments',
    'users', 'notifications', 'karts', 'sessions', 'waivers', 'lap_records'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_add LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      RAISE NOTICE 'Added % to supabase_realtime publication', tbl;
    EXCEPTION
      WHEN OTHERS THEN
        -- Table already in publication or other non-fatal error — continue
        RAISE NOTICE 'Table % already in publication or skipped: %', tbl, SQLERRM;
    END;
  END LOOP;
END $$;

-- Fix 5: Add subtotal, taxRate, taxAmount, cgstAmount, sgstAmount, invoiceNumber, 
--         tokenNumber fields to food_orders that the app generates on submit
ALTER TABLE "food_orders" ADD COLUMN IF NOT EXISTS "subtotal" NUMERIC;
ALTER TABLE "food_orders" ADD COLUMN IF NOT EXISTS "taxRate" NUMERIC;
ALTER TABLE "food_orders" ADD COLUMN IF NOT EXISTS "taxAmount" NUMERIC;
ALTER TABLE "food_orders" ADD COLUMN IF NOT EXISTS "cgstAmount" NUMERIC;
ALTER TABLE "food_orders" ADD COLUMN IF NOT EXISTS "sgstAmount" NUMERIC;
ALTER TABLE "food_orders" ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT;
ALTER TABLE "food_orders" ADD COLUMN IF NOT EXISTS "tokenNumber" INTEGER;

-- Fix 6: Add missing booking columns that the app always writes
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "staffId" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;

-- Fix 7: Add missing ticket columns 
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "refundAmount" NUMERIC;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "refundedAt" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "refundedBy" TEXT;

-- Fix 8: Add referenceNumber and confirmedAt to payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amountReceived" NUMERIC;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "changeGiven" NUMERIC;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "confirmedAt" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "razorpayPaymentId" TEXT;

-- Fix 9: Add employment fields to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employmentStatus" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "employeeId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "joiningDate" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "designation" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "salary" NUMERIC;

-- Fix 10: Add extra menu_items stock/purchase tracking fields
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "stockQuantity" NUMERIC;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "unit" TEXT;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "purchasePrice" NUMERIC;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "supplierName" TEXT;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "purchaseDate" TEXT;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "purchaseQuantity" NUMERIC;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "openingStock" NUMERIC;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "wastageQuantity" NUMERIC;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "stockAdjustment" NUMERIC;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "quantitySold" NUMERIC;
ALTER TABLE "menu_items" ADD COLUMN IF NOT EXISTS "salesAmount" NUMERIC;

-- Fix 11: Add extra inventory tracking fields
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "openingStock" NUMERIC;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "totalPurchased" NUMERIC;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "totalConsumed" NUMERIC;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "totalSold" NUMERIC;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "totalWasted" NUMERIC;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "lastPurchaseDate" TEXT;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "lastPurchasePrice" NUMERIC;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "supplier" TEXT;
ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "costPrice" NUMERIC;

-- Verification query — run this after applying fixes to confirm:
-- SELECT table_name, column_name FROM information_schema.columns 
-- WHERE table_schema = 'public' AND table_name IN ('bookings','tickets','payments','food_orders','activities','menu_items','inventory','users')
-- ORDER BY table_name, column_name;
