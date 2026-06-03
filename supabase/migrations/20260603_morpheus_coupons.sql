-- Morpheus: Coupon / discount system
-- Coupons are valid for 1 billing cycle (applied via Stripe with duration="repeating", duration_in_months=1)

CREATE TABLE IF NOT EXISTS public.coupons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT    NOT NULL UNIQUE,
  label       TEXT    NOT NULL,
  discount_pct INTEGER NOT NULL CHECK (discount_pct > 0 AND discount_pct <= 100),
  max_uses    INTEGER NOT NULL DEFAULT -1,          -- -1 = unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from  TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,                          -- NULL = never expires
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated (or anon, since checkout is public-facing) can read active coupons for validation
CREATE POLICY "Coupons are readable" ON public.coupons
  FOR SELECT USING (true);

-- Only service role can insert / update / delete
CREATE POLICY "Service role full access" ON public.coupons
  FOR ALL USING (auth.role() = 'service_role');

-- Seed coupons
INSERT INTO public.coupons (code, label, discount_pct, max_uses, valid_from, valid_until, active) VALUES
  ('MORPHEUS99', 'Lancamento 99% OFF', 99,  100, now(), now() + INTERVAL '6 months', true),
  ('DESCONTO10', '10% de desconto',     10,  -1, now(), NULL, true),
  ('DESCONTO20', '20% de desconto',     20,  -1, now(), NULL, true);
