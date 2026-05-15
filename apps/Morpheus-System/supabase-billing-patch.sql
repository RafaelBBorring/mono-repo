-- ============================================================
-- Morpheus System - patch Stripe/billing para banco existente
-- Use este arquivo quando rooms/psychologists/reservations/admin_config
-- ja existem e voce quer adicionar apenas a barreira de assinatura.
-- ============================================================

DO $$
DECLARE
  missing_tables TEXT[];
BEGIN
  SELECT array_agg(table_name)
  INTO missing_tables
  FROM (
    VALUES
      ('rooms'),
      ('psychologists'),
      ('reservations'),
      ('admin_config')
  ) AS required(table_name)
  WHERE to_regclass('public.' || required.table_name) IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Tabelas base ausentes no Morpheus: %', array_to_string(missing_tables, ', ');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.billing_accounts (
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

INSERT INTO public.billing_accounts (id, stripe_status, billing_enforced)
VALUES ('default', 'inactive', false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_active_billing()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.billing_accounts
    WHERE id = 'default'
      AND (
        billing_enforced = false
        OR stripe_status IN ('active', 'trialing')
      )
  );
$$;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.psychologists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Billing status is readable by everyone" ON public.billing_accounts;
CREATE POLICY "Billing status is readable by everyone" ON public.billing_accounts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Rooms are readable by everyone" ON public.rooms;
DROP POLICY IF EXISTS "Rooms can be inserted by everyone" ON public.rooms;
DROP POLICY IF EXISTS "Rooms can be updated by everyone" ON public.rooms;
DROP POLICY IF EXISTS "Rooms can be deleted by everyone" ON public.rooms;
DROP POLICY IF EXISTS "Rooms require active billing for select" ON public.rooms;
DROP POLICY IF EXISTS "Rooms require active billing for insert" ON public.rooms;
DROP POLICY IF EXISTS "Rooms require active billing for update" ON public.rooms;
DROP POLICY IF EXISTS "Rooms require active billing for delete" ON public.rooms;

CREATE POLICY "Rooms require active billing for select" ON public.rooms
  FOR SELECT USING (public.has_active_billing());
CREATE POLICY "Rooms require active billing for insert" ON public.rooms
  FOR INSERT WITH CHECK (public.has_active_billing());
CREATE POLICY "Rooms require active billing for update" ON public.rooms
  FOR UPDATE USING (public.has_active_billing()) WITH CHECK (public.has_active_billing());
CREATE POLICY "Rooms require active billing for delete" ON public.rooms
  FOR DELETE USING (public.has_active_billing());

DROP POLICY IF EXISTS "Psychologists are readable by everyone" ON public.psychologists;
DROP POLICY IF EXISTS "Psychologists can be inserted by everyone" ON public.psychologists;
DROP POLICY IF EXISTS "Psychologists can be updated by everyone" ON public.psychologists;
DROP POLICY IF EXISTS "Psychologists can be deleted by everyone" ON public.psychologists;
DROP POLICY IF EXISTS "Psychologists require active billing for select" ON public.psychologists;
DROP POLICY IF EXISTS "Psychologists require active billing for insert" ON public.psychologists;
DROP POLICY IF EXISTS "Psychologists require active billing for update" ON public.psychologists;
DROP POLICY IF EXISTS "Psychologists require active billing for delete" ON public.psychologists;

CREATE POLICY "Psychologists require active billing for select" ON public.psychologists
  FOR SELECT USING (public.has_active_billing());
CREATE POLICY "Psychologists require active billing for insert" ON public.psychologists
  FOR INSERT WITH CHECK (public.has_active_billing());
CREATE POLICY "Psychologists require active billing for update" ON public.psychologists
  FOR UPDATE USING (public.has_active_billing()) WITH CHECK (public.has_active_billing());
CREATE POLICY "Psychologists require active billing for delete" ON public.psychologists
  FOR DELETE USING (public.has_active_billing());

DROP POLICY IF EXISTS "Reservations are readable by everyone" ON public.reservations;
DROP POLICY IF EXISTS "Reservations can be inserted by everyone" ON public.reservations;
DROP POLICY IF EXISTS "Reservations can be updated by everyone" ON public.reservations;
DROP POLICY IF EXISTS "Reservations can be deleted by everyone" ON public.reservations;
DROP POLICY IF EXISTS "Reservations require active billing for select" ON public.reservations;
DROP POLICY IF EXISTS "Reservations require active billing for insert" ON public.reservations;
DROP POLICY IF EXISTS "Reservations require active billing for update" ON public.reservations;
DROP POLICY IF EXISTS "Reservations require active billing for delete" ON public.reservations;

CREATE POLICY "Reservations require active billing for select" ON public.reservations
  FOR SELECT USING (public.has_active_billing());
CREATE POLICY "Reservations require active billing for insert" ON public.reservations
  FOR INSERT WITH CHECK (public.has_active_billing());
CREATE POLICY "Reservations require active billing for update" ON public.reservations
  FOR UPDATE USING (public.has_active_billing()) WITH CHECK (public.has_active_billing());
CREATE POLICY "Reservations require active billing for delete" ON public.reservations
  FOR DELETE USING (public.has_active_billing());

DROP POLICY IF EXISTS "Admin config is readable by everyone" ON public.admin_config;
DROP POLICY IF EXISTS "Admin config can be updated by everyone" ON public.admin_config;
DROP POLICY IF EXISTS "Admin config requires active billing for select" ON public.admin_config;
DROP POLICY IF EXISTS "Admin config requires active billing for update" ON public.admin_config;

CREATE POLICY "Admin config requires active billing for select" ON public.admin_config
  FOR SELECT USING (public.has_active_billing());
CREATE POLICY "Admin config requires active billing for update" ON public.admin_config
  FOR UPDATE USING (public.has_active_billing()) WITH CHECK (public.has_active_billing());

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_accounts;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
