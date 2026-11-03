-- ==============================================================================
-- DEUCE GO-KARTING — MINIMAL SUPABASE SALES SUMMARY MIGRATION
-- Safe & Idempotent: Can be re-run multiple times without affecting any data.
-- Run this in Supabase SQL Editor -> your project.
-- ==============================================================================

-- 1. Create dedicated daily_sales_summary table
CREATE TABLE IF NOT EXISTS "daily_sales_summary" (
  "id" TEXT PRIMARY KEY,
  "business_date" DATE NOT NULL,
  "computer_id" TEXT NOT NULL,
  "total_tickets" INTEGER NOT NULL DEFAULT 0,
  "single_kart_tickets" INTEGER NOT NULL DEFAULT 0,
  "double_kart_tickets" INTEGER NOT NULL DEFAULT 0,
  "silver_package_tickets" INTEGER NOT NULL DEFAULT 0,
  "golden_package_tickets" INTEGER NOT NULL DEFAULT 0,
  "total_gokart_sales" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "air_rifle_sales" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "horse_riding_sales" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "car_simulator_sales" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "moto_simulation_sales" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "cash_total" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "upi_total" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "card_total" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "total_sales" NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  "last_synced_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "uq_business_date_computer" UNIQUE ("business_date", "computer_id")
);

-- 2. Indexes for fast aggregation and date-filtered queries
CREATE INDEX IF NOT EXISTS "idx_daily_sales_summary_date"
  ON "daily_sales_summary" ("business_date");

CREATE INDEX IF NOT EXISTS "idx_daily_sales_summary_computer"
  ON "daily_sales_summary" ("computer_id");

-- 3. Enable Row Level Security (RLS)
ALTER TABLE "daily_sales_summary" ENABLE ROW LEVEL SECURITY;

-- 4. Safe policies allowing billing computers to read and upsert their daily summaries
DROP POLICY IF EXISTS "Allow read daily sales summary" ON "daily_sales_summary";
CREATE POLICY "Allow read daily sales summary"
  ON "daily_sales_summary" FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow insert update daily sales summary" ON "daily_sales_summary";
CREATE POLICY "Allow insert update daily sales summary"
  ON "daily_sales_summary" FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Add to Supabase Realtime publication (optional, lightweight: 1 row per counter per day)
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE "daily_sales_summary"';
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;
END $$;
