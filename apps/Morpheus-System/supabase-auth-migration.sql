-- Morpheus Auth Migration
-- Run this in Supabase SQL Editor

BEGIN;

-- 1. Create clinics table (admin accounts + billing)
CREATE TABLE IF NOT EXISTS clinics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  admin_email TEXT UNIQUE NOT NULL,
  admin_password_hash TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  stripe_status TEXT DEFAULT 'inactive',
  billing_enforced BOOLEAN DEFAULT false,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create clinic_doctors table (doctor login credentials)
CREATE TABLE IF NOT EXISTS clinic_doctors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
  psychologist_id INTEGER,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, email)
);

-- 3. Add clinic_id to existing tables
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE psychologists ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;

-- 4. Enable RLS
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychologists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies - allow anon access for login flow and client-side queries
CREATE POLICY "clinics_select" ON clinics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "clinics_insert" ON clinics FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "clinics_update" ON clinics FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "clinic_doctors_select" ON clinic_doctors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "clinic_doctors_insert" ON clinic_doctors FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "clinic_doctors_update" ON clinic_doctors FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "clinic_doctors_delete" ON clinic_doctors FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "rooms_select" ON rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "rooms_insert" ON rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "rooms_update" ON rooms FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "rooms_delete" ON rooms FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "psychologists_select" ON psychologists FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "psychologists_insert" ON psychologists FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "psychologists_update" ON psychologists FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "psychologists_delete" ON psychologists FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "reservations_select" ON reservations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reservations_insert" ON reservations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "reservations_update" ON reservations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "reservations_delete" ON reservations FOR DELETE TO anon, authenticated USING (true);

-- 6. Seed test clinic
-- Password: "admin123" (SHA-256)
INSERT INTO clinics (id, name, admin_email, admin_password_hash, stripe_status, billing_enforced)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Clínica Teste Morpheus',
  'admin@morpheus.test',
  '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'active',
  true
) ON CONFLICT (id) DO NOTHING;

-- 7. Seed test doctor
-- Password: "dra123" (SHA-256)
INSERT INTO clinic_doctors (id, clinic_id, email, password_hash, display_name)
VALUES (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'dra@morpheus.test',
  '79720c823195ce9a18958a2fb8b87206cdd07a3ce8e2d8da237034688886c621',
  'Dra. Ana Teste'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
