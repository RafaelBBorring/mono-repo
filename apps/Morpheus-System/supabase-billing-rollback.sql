-- ============================================================
-- Morpheus System - rollback da camada Stripe/billing
-- Use quando quiser desfazer apenas a integracao de cobranca,
-- preservando salas, profissionais, reservas e admin_config.
-- ============================================================

-- Remove billing_accounts do realtime, se tiver sido adicionada.
DO $$
BEGIN
  IF to_regclass('public.billing_accounts') IS NOT NULL THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime DROP TABLE public.billing_accounts;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

-- Remove policies e objetos especificos da cobranca.
DO $$
BEGIN
  IF to_regclass('public.billing_accounts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Billing status is readable by everyone" ON public.billing_accounts;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.has_active_billing();
DROP TABLE IF EXISTS public.billing_accounts;

-- Restaura as policies originais do Morpheus para rooms.
DO $$
BEGIN
  IF to_regclass('public.rooms') IS NOT NULL THEN
    ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Rooms require active billing for select" ON public.rooms;
    DROP POLICY IF EXISTS "Rooms require active billing for insert" ON public.rooms;
    DROP POLICY IF EXISTS "Rooms require active billing for update" ON public.rooms;
    DROP POLICY IF EXISTS "Rooms require active billing for delete" ON public.rooms;
    DROP POLICY IF EXISTS "Rooms are readable by everyone" ON public.rooms;
    DROP POLICY IF EXISTS "Rooms can be inserted by everyone" ON public.rooms;
    DROP POLICY IF EXISTS "Rooms can be updated by everyone" ON public.rooms;
    DROP POLICY IF EXISTS "Rooms can be deleted by everyone" ON public.rooms;

    CREATE POLICY "Rooms are readable by everyone" ON public.rooms
      FOR SELECT USING (true);
    CREATE POLICY "Rooms can be inserted by everyone" ON public.rooms
      FOR INSERT WITH CHECK (true);
    CREATE POLICY "Rooms can be updated by everyone" ON public.rooms
      FOR UPDATE USING (true);
    CREATE POLICY "Rooms can be deleted by everyone" ON public.rooms
      FOR DELETE USING (true);
  END IF;
END $$;

-- Restaura as policies originais do Morpheus para psychologists.
DO $$
BEGIN
  IF to_regclass('public.psychologists') IS NOT NULL THEN
    ALTER TABLE public.psychologists ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Psychologists require active billing for select" ON public.psychologists;
    DROP POLICY IF EXISTS "Psychologists require active billing for insert" ON public.psychologists;
    DROP POLICY IF EXISTS "Psychologists require active billing for update" ON public.psychologists;
    DROP POLICY IF EXISTS "Psychologists require active billing for delete" ON public.psychologists;
    DROP POLICY IF EXISTS "Psychologists are readable by everyone" ON public.psychologists;
    DROP POLICY IF EXISTS "Psychologists can be inserted by everyone" ON public.psychologists;
    DROP POLICY IF EXISTS "Psychologists can be updated by everyone" ON public.psychologists;
    DROP POLICY IF EXISTS "Psychologists can be deleted by everyone" ON public.psychologists;

    CREATE POLICY "Psychologists are readable by everyone" ON public.psychologists
      FOR SELECT USING (true);
    CREATE POLICY "Psychologists can be inserted by everyone" ON public.psychologists
      FOR INSERT WITH CHECK (true);
    CREATE POLICY "Psychologists can be updated by everyone" ON public.psychologists
      FOR UPDATE USING (true);
    CREATE POLICY "Psychologists can be deleted by everyone" ON public.psychologists
      FOR DELETE USING (true);
  END IF;
END $$;

-- Restaura as policies originais do Morpheus para reservations.
DO $$
BEGIN
  IF to_regclass('public.reservations') IS NOT NULL THEN
    ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Reservations require active billing for select" ON public.reservations;
    DROP POLICY IF EXISTS "Reservations require active billing for insert" ON public.reservations;
    DROP POLICY IF EXISTS "Reservations require active billing for update" ON public.reservations;
    DROP POLICY IF EXISTS "Reservations require active billing for delete" ON public.reservations;
    DROP POLICY IF EXISTS "Reservations are readable by everyone" ON public.reservations;
    DROP POLICY IF EXISTS "Reservations can be inserted by everyone" ON public.reservations;
    DROP POLICY IF EXISTS "Reservations can be updated by everyone" ON public.reservations;
    DROP POLICY IF EXISTS "Reservations can be deleted by everyone" ON public.reservations;

    CREATE POLICY "Reservations are readable by everyone" ON public.reservations
      FOR SELECT USING (true);
    CREATE POLICY "Reservations can be inserted by everyone" ON public.reservations
      FOR INSERT WITH CHECK (true);
    CREATE POLICY "Reservations can be updated by everyone" ON public.reservations
      FOR UPDATE USING (true);
    CREATE POLICY "Reservations can be deleted by everyone" ON public.reservations
      FOR DELETE USING (true);
  END IF;
END $$;

-- Restaura as policies originais do Morpheus para admin_config.
DO $$
BEGIN
  IF to_regclass('public.admin_config') IS NOT NULL THEN
    ALTER TABLE public.admin_config ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admin config requires active billing for select" ON public.admin_config;
    DROP POLICY IF EXISTS "Admin config requires active billing for update" ON public.admin_config;
    DROP POLICY IF EXISTS "Admin config is readable by everyone" ON public.admin_config;
    DROP POLICY IF EXISTS "Admin config can be updated by everyone" ON public.admin_config;

    CREATE POLICY "Admin config is readable by everyone" ON public.admin_config
      FOR SELECT USING (true);
    CREATE POLICY "Admin config can be updated by everyone" ON public.admin_config
      FOR UPDATE USING (true);
  END IF;
END $$;
