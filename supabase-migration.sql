-- Migration to add payment tracking columns for DEUCE Billing payment and card POS terminal integrations

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "invoice_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "customer_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'INR';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_method" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_status" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gateway" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gateway_order_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gateway_payment_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "gateway_reference_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "pos_transaction_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "terminal_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "created_at" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "updated_at" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paid_at" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refund_status" TEXT;
