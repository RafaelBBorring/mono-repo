-- ============================================================
-- MIGRATION: Morpheus billing gate for Stripe subscriptions
-- Run this in Supabase SQL Editor if Supabase CLI is unavailable.
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_accounts (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  stripe_status TEXT NOT NULL DEFAULT 'inactive',
  billing_enforced BOOLEAN NOT NULL DEFAULT false,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  last_checkout_session_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO billing_accounts (id, stripe_status, billing_enforced) VALUES ('default', 'inactive', false)
  ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION has_active_billing()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM billing_accounts
    WHERE id = 'default'
      AND (
        billing_enforced = false
        OR stripe_status IN ('active', 'trialing')
      )
  );
$$;

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychologists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Billing status is readable by everyone" ON billing_accounts;
CREATE POLICY "Billing status is readable by everyone" ON billing_accounts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Rooms are readable by everyone" ON rooms;
DROP POLICY IF EXISTS "Rooms can be inserted by everyone" ON rooms;
DROP POLICY IF EXISTS "Rooms can be updated by everyone" ON rooms;
DROP POLICY IF EXISTS "Rooms can be deleted by everyone" ON rooms;
DROP POLICY IF EXISTS "Rooms require active billing for select" ON rooms;
DROP POLICY IF EXISTS "Rooms require active billing for insert" ON rooms;
DROP POLICY IF EXISTS "Rooms require active billing for update" ON rooms;
DROP POLICY IF EXISTS "Rooms require active billing for delete" ON rooms;
CREATE POLICY "Rooms require active billing for select" ON rooms
  FOR SELECT USING (has_active_billing());
CREATE POLICY "Rooms require active billing for insert" ON rooms
  FOR INSERT WITH CHECK (has_active_billing());
CREATE POLICY "Rooms require active billing for update" ON rooms
  FOR UPDATE USING (has_active_billing()) WITH CHECK (has_active_billing());
CREATE POLICY "Rooms require active billing for delete" ON rooms
  FOR DELETE USING (has_active_billing());

DROP POLICY IF EXISTS "Psychologists are readable by everyone" ON psychologists;
DROP POLICY IF EXISTS "Psychologists can be inserted by everyone" ON psychologists;
DROP POLICY IF EXISTS "Psychologists can be updated by everyone" ON psychologists;
DROP POLICY IF EXISTS "Psychologists can be deleted by everyone" ON psychologists;
DROP POLICY IF EXISTS "Psychologists require active billing for select" ON psychologists;
DROP POLICY IF EXISTS "Psychologists require active billing for insert" ON psychologists;
DROP POLICY IF EXISTS "Psychologists require active billing for update" ON psychologists;
DROP POLICY IF EXISTS "Psychologists require active billing for delete" ON psychologists;
CREATE POLICY "Psychologists require active billing for select" ON psychologists
  FOR SELECT USING (has_active_billing());
CREATE POLICY "Psychologists require active billing for insert" ON psychologists
  FOR INSERT WITH CHECK (has_active_billing());
CREATE POLICY "Psychologists require active billing for update" ON psychologists
  FOR UPDATE USING (has_active_billing()) WITH CHECK (has_active_billing());
CREATE POLICY "Psychologists require active billing for delete" ON psychologists
  FOR DELETE USING (has_active_billing());

DROP POLICY IF EXISTS "Reservations are readable by everyone" ON reservations;
DROP POLICY IF EXISTS "Reservations can be inserted by everyone" ON reservations;
DROP POLICY IF EXISTS "Reservations can be updated by everyone" ON reservations;
DROP POLICY IF EXISTS "Reservations can be deleted by everyone" ON reservations;
DROP POLICY IF EXISTS "Reservations require active billing for select" ON reservations;
DROP POLICY IF EXISTS "Reservations require active billing for insert" ON reservations;
DROP POLICY IF EXISTS "Reservations require active billing for update" ON reservations;
DROP POLICY IF EXISTS "Reservations require active billing for delete" ON reservations;
CREATE POLICY "Reservations require active billing for select" ON reservations
  FOR SELECT USING (has_active_billing());
CREATE POLICY "Reservations require active billing for insert" ON reservations
  FOR INSERT WITH CHECK (has_active_billing());
CREATE POLICY "Reservations require active billing for update" ON reservations
  FOR UPDATE USING (has_active_billing()) WITH CHECK (has_active_billing());
CREATE POLICY "Reservations require active billing for delete" ON reservations
  FOR DELETE USING (has_active_billing());

DROP POLICY IF EXISTS "Admin config is readable by everyone" ON admin_config;
DROP POLICY IF EXISTS "Admin config can be updated by everyone" ON admin_config;
DROP POLICY IF EXISTS "Admin config requires active billing for select" ON admin_config;
DROP POLICY IF EXISTS "Admin config requires active billing for update" ON admin_config;
CREATE POLICY "Admin config requires active billing for select" ON admin_config
  FOR SELECT USING (has_active_billing());
CREATE POLICY "Admin config requires active billing for update" ON admin_config
  FOR UPDATE USING (has_active_billing()) WITH CHECK (has_active_billing());

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE billing_accounts;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
