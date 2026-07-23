BEGIN;

ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS trial_checkout_session_id TEXT;
ALTER TABLE public.clinics ADD COLUMN IF NOT EXISTS trial_checkout_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinics_stripe_customer_unique
  ON public.clinics (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinics_stripe_subscription_unique
  ON public.clinics (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_doctors_user_unique
  ON public.clinic_doctors (clinic_id, user_id)
  WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_normalized
  ON public.users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_normalized
  ON public.coupons (upper(code));

CREATE OR REPLACE FUNCTION public.validate_morpheus_reservation_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.rooms
    WHERE id = NEW.room_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'reservation_room_outside_clinic';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.psychologists
    WHERE id = NEW.psych_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'reservation_psychologist_outside_clinic';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_validate_scope ON public.reservations;
CREATE TRIGGER reservations_validate_scope
BEFORE INSERT OR UPDATE OF clinic_id, room_id, psych_id ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.validate_morpheus_reservation_scope();

CREATE OR REPLACE FUNCTION public.validate_morpheus_membership_scope()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.psychologist_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.psychologists
    WHERE id = NEW.psychologist_id AND clinic_id = NEW.clinic_id
  ) THEN
    RAISE EXCEPTION 'membership_psychologist_outside_clinic';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clinic_doctors_validate_scope ON public.clinic_doctors;
CREATE TRIGGER clinic_doctors_validate_scope
BEFORE INSERT OR UPDATE OF clinic_id, psychologist_id ON public.clinic_doctors
FOR EACH ROW EXECUTE FUNCTION public.validate_morpheus_membership_scope();

CREATE OR REPLACE FUNCTION public.protect_morpheus_last_admin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  remaining_admins INTEGER;
BEGIN
  IF OLD.role <> 'admin' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.clinics WHERE id = OLD.clinic_id) THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role = 'admin' AND NEW.clinic_id = OLD.clinic_id THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('morpheus-admin:' || OLD.clinic_id::text));
  SELECT count(*) INTO remaining_admins
  FROM public.clinic_doctors
  WHERE clinic_id = OLD.clinic_id
    AND role = 'admin'
    AND id <> OLD.id;

  IF remaining_admins = 0 THEN
    RAISE EXCEPTION 'clinic_requires_admin';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clinic_doctors_protect_last_admin ON public.clinic_doctors;
CREATE TRIGGER clinic_doctors_protect_last_admin
BEFORE DELETE OR UPDATE OF role, clinic_id ON public.clinic_doctors
FOR EACH ROW EXECUTE FUNCTION public.protect_morpheus_last_admin();

CREATE OR REPLACE FUNCTION public.enforce_morpheus_entity_limits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE current_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('morpheus-limit:' || NEW.clinic_id::text || ':' || TG_TABLE_NAME));

  IF TG_TABLE_NAME = 'rooms' THEN
    SELECT count(*) INTO current_count FROM public.rooms WHERE clinic_id = NEW.clinic_id;
    IF current_count >= public.morpheus_plan_limit(NEW.clinic_id, 'rooms') THEN
      RAISE EXCEPTION 'room_plan_limit';
    END IF;
  ELSIF TG_TABLE_NAME = 'psychologists' THEN
    SELECT count(*) INTO current_count FROM public.psychologists WHERE clinic_id = NEW.clinic_id;
    IF current_count >= public.morpheus_plan_limit(NEW.clinic_id, 'doctors') THEN
      RAISE EXCEPTION 'doctor_plan_limit';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_morpheus_trial_checkout(target_clinic UUID)
RETURNS TABLE(existing_session_id TEXT, claimed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clinic public.clinics%ROWTYPE;
BEGIN
  IF NOT public.is_clinic_admin(target_clinic) THEN
    RAISE EXCEPTION 'admin_required';
  END IF;

  SELECT * INTO clinic
  FROM public.clinics
  WHERE id = target_clinic
  FOR UPDATE;

  IF clinic.id IS NULL THEN RAISE EXCEPTION 'clinic_not_found'; END IF;
  IF clinic.trial_used THEN RAISE EXCEPTION 'trial_already_used'; END IF;

  IF clinic.trial_checkout_expires_at IS NOT NULL
     AND clinic.trial_checkout_expires_at > now()
  THEN
    RETURN QUERY SELECT clinic.trial_checkout_session_id, false;
    RETURN;
  END IF;

  UPDATE public.clinics
  SET trial_checkout_session_id = NULL,
      trial_checkout_expires_at = now() + interval '5 minutes',
      updated_at = now()
  WHERE id = target_clinic;

  RETURN QUERY SELECT NULL::TEXT, true;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_morpheus_trial_checkout(
  target_clinic UUID,
  checkout_session_id TEXT,
  checkout_expires_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role_required'; END IF;

  UPDATE public.clinics
  SET trial_checkout_session_id = checkout_session_id,
      trial_checkout_expires_at = checkout_expires_at,
      updated_at = now()
  WHERE id = target_clinic AND trial_used = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_morpheus_trial_checkout(target_clinic UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role_required'; END IF;

  UPDATE public.clinics
  SET trial_checkout_session_id = NULL,
      trial_checkout_expires_at = NULL,
      updated_at = now()
  WHERE id = target_clinic AND trial_used = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_morpheus_coupon(coupon_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  coupon public.coupons%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role_required'; END IF;

  SELECT * INTO coupon
  FROM public.coupons
  WHERE upper(code) = upper(trim(coupon_code))
  FOR UPDATE;

  IF coupon.id IS NULL
     OR coupon.active = false
     OR coupon.valid_from > now()
     OR (coupon.valid_until IS NOT NULL AND coupon.valid_until < now())
     OR (coupon.max_uses <> -1 AND coupon.current_uses >= coupon.max_uses)
  THEN
    RETURN false;
  END IF;

  UPDATE public.coupons
  SET current_uses = current_uses + 1
  WHERE id = coupon.id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_morpheus_trial_checkout(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_morpheus_trial_checkout(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.finish_morpheus_trial_checkout(UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_morpheus_trial_checkout(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_morpheus_coupon(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_morpheus_trial_checkout(UUID, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_morpheus_trial_checkout(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_morpheus_coupon(TEXT) TO service_role;

DO $$
DECLARE item RECORD;
BEGIN
  IF to_regclass('public.billing_accounts') IS NOT NULL THEN
    FOR item IN SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'billing_accounts'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.billing_accounts', item.policyname);
    END LOOP;
    ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.billing_accounts FROM anon, authenticated;
  END IF;
END $$;

COMMIT;
