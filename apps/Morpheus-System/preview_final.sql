-- Morpheus - Preview Final
-- Run this in Supabase SQL Editor after the initial migration
-- This ensures all required columns exist and cleans up old data

-- 1. Ensure stripe_price_id column exists on clinics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'stripe_price_id'
  ) THEN
    ALTER TABLE clinics ADD COLUMN stripe_price_id TEXT;
  END IF;
END $$;

-- 2. Verify clinic_doctors has the correct structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinic_doctors' AND column_name = 'clinic_id'
  ) THEN
    ALTER TABLE clinic_doctors ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Ensure all data tables have clinic_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'clinic_id') THEN
    ALTER TABLE rooms ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'psychologists' AND column_name = 'clinic_id') THEN
    ALTER TABLE psychologists ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'clinic_id') THEN
    ALTER TABLE reservations ADD COLUMN clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Clean up old billing_accounts table if it exists (no longer used)
DROP TABLE IF EXISTS billing_accounts CASCADE;
