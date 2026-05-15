-- Morpheus Pages/Auth Fix
-- Safe to run more than once in the correct Supabase project.
-- It keeps client-side testing on GitHub Pages possible with the public anon key.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  admin_email TEXT UNIQUE NOT NULL,
  admin_password_hash TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  stripe_status TEXT DEFAULT 'inactive',
  billing_enforced BOOLEAN DEFAULT true,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinic_doctors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  psychologist_id INTEGER,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL,
  role TEXT DEFAULT 'doctor',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, email)
);

ALTER TABLE clinics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_status TEXT DEFAULT 'inactive';
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS billing_enforced BOOLEAN DEFAULT true;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE clinic_doctors ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE clinic_doctors ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'doctor';
ALTER TABLE clinic_doctors ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS clinic_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'doctor',
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select ON users;
DROP POLICY IF EXISTS users_insert ON users;
DROP POLICY IF EXISTS users_update ON users;
CREATE POLICY users_select ON users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY users_insert ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY users_update ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS clinics_select ON clinics;
DROP POLICY IF EXISTS clinics_insert ON clinics;
DROP POLICY IF EXISTS clinics_update ON clinics;
CREATE POLICY clinics_select ON clinics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY clinics_insert ON clinics FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY clinics_update ON clinics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS clinic_doctors_select ON clinic_doctors;
DROP POLICY IF EXISTS clinic_doctors_insert ON clinic_doctors;
DROP POLICY IF EXISTS clinic_doctors_update ON clinic_doctors;
DROP POLICY IF EXISTS clinic_doctors_delete ON clinic_doctors;
CREATE POLICY clinic_doctors_select ON clinic_doctors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY clinic_doctors_insert ON clinic_doctors FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY clinic_doctors_update ON clinic_doctors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY clinic_doctors_delete ON clinic_doctors FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS invitations_select ON clinic_invitations;
DROP POLICY IF EXISTS invitations_insert ON clinic_invitations;
DROP POLICY IF EXISTS invitations_update ON clinic_invitations;
DROP POLICY IF EXISTS invitations_delete ON clinic_invitations;
CREATE POLICY invitations_select ON clinic_invitations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY invitations_insert ON clinic_invitations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY invitations_update ON clinic_invitations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY invitations_delete ON clinic_invitations FOR DELETE TO anon, authenticated USING (true);

INSERT INTO users (email, password_hash, display_name)
SELECT admin_email, admin_password_hash, name
FROM clinics
WHERE admin_email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

UPDATE clinics c
SET user_id = u.id
FROM users u
WHERE c.admin_email = u.email
  AND c.user_id IS NULL;

INSERT INTO users (email, password_hash, display_name)
SELECT email, password_hash, display_name
FROM clinic_doctors
WHERE email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

UPDATE clinic_doctors cd
SET user_id = u.id
FROM users u
WHERE cd.email = u.email
  AND cd.user_id IS NULL;

INSERT INTO clinic_doctors (clinic_id, user_id, email, password_hash, display_name, role)
SELECT c.id, c.user_id, c.admin_email, c.admin_password_hash, c.name, 'admin'
FROM clinics c
WHERE c.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
