-- ============================================================
-- Morpheus System - teardown completo do schema publico
-- ATENCAO: use somente na conta Supabase errada.
-- Isto apaga reservas, salas, profissionais, configuracao admin
-- e qualquer dado de billing criado pelo supabase.sql do Morpheus.
-- ============================================================

-- Se voce esta no projeto correto de producao/teste do Morpheus,
-- NAO execute este arquivo.

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.billing_accounts;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.reservations;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.psychologists;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.rooms;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

DROP TABLE IF EXISTS public.billing_accounts CASCADE;
DROP TABLE IF EXISTS public.reservations CASCADE;
DROP TABLE IF EXISTS public.psychologists CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.admin_config CASCADE;
DROP FUNCTION IF EXISTS public.has_active_billing();
