-- Activity Management Enhancement Migration
-- Run this in your Supabase SQL Editor to add new columns to the activities table.
-- All columns are nullable with safe defaults — existing data is NOT affected.
-- Existing bookings, tickets, and activityId references remain fully operational.

ALTER TABLE "activities"
  ADD COLUMN IF NOT EXISTS "shortDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "detailedDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "photos" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "coverPhotoId" TEXT,
  ADD COLUMN IF NOT EXISTS "duration" TEXT,
  ADD COLUMN IF NOT EXISTS "ageRequirement" TEXT,
  ADD COLUMN IF NOT EXISTS "rules" JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS "displayOrder" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "offers" JSONB DEFAULT '[]'::jsonb;

-- Backfill isActive = true for all existing activities
UPDATE "activities" SET "isActive" = true WHERE "isActive" IS NULL;
-- Backfill displayOrder = 0 for all existing activities
UPDATE "activities" SET "displayOrder" = 0 WHERE "displayOrder" IS NULL;
