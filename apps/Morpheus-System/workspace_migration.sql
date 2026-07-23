-- Morpheus Workspace Migration
-- Run this in Supabase SQL Editor AFTER the initial auth migration
-- Adds: users table, clinic_invitations, user_id links, role on clinic_doctors

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create users table (universal accounts)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add user_id to clinics (links clinic admin to user)
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 3. Add user_id and role to clinic_doctors
ALTER TABLE clinic_doctors ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE clinic_doctors ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'doctor';

-- 4. Create clinic_invitations table
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

-- 5. Enable RLS on new tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_invitations ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for users
CREATE POLICY "users_select" ON users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. RLS policies for clinic_invitations
CREATE POLICY "invitations_select" ON clinic_invitations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "invitations_insert" ON clinic_invitations FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "invitations_update" ON clinic_invitations FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "invitations_delete" ON clinic_invitations FOR DELETE TO anon, authenticated USING (true);

-- 8. Migrate existing admin accounts to users table
INSERT INTO users (email, password_hash, display_name)
SELECT admin_email, admin_password_hash, name
FROM clinics
WHERE admin_email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- 9. Link clinics to their admin user
UPDATE clinics c SET user_id = u.id
FROM users u
WHERE c.admin_email = u.email AND c.user_id IS NULL;

-- 10. Migrate existing doctor accounts to users table
INSERT INTO users (email, password_hash, display_name)
SELECT cd.email, cd.password_hash, cd.display_name
FROM clinic_doctors cd
WHERE cd.email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- 11. Link clinic_doctors to their user
UPDATE clinic_doctors cd SET user_id = u.id
FROM users u
WHERE cd.email = u.email AND cd.user_id IS NULL;

-- 12. Set role='doctor' on existing doctor entries
UPDATE clinic_doctors SET role = 'doctor' WHERE role IS NULL AND psychologist_id IS NOT NULL;

-- 13. Create admin membership entries in clinic_doctors
INSERT INTO clinic_doctors (clinic_id, user_id, email, password_hash, display_name, role)
SELECT c.id, c.user_id, c.admin_email, c.admin_password_hash, c.name, 'admin'
FROM clinics c
WHERE c.user_id IS NOT NULL
ON CONFLICT (clinic_id, email) DO NOTHING;

-- 14. Update test seed: ensure admin user has correct display_name
UPDATE users SET display_name = 'Admin Morpheus' WHERE email = 'admin@morpheus.test';

COMMIT;
