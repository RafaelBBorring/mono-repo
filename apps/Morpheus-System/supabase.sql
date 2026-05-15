-- ============================================================
-- Morpheus System - Supabase Database Schema
-- Execute this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. ROOMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  hex TEXT NOT NULL DEFAULT '#8fae9b',
  rgb TEXT NOT NULL DEFAULT '143,174,155',
  light_hex TEXT NOT NULL DEFAULT '#3f6b5b',
  light_rgb TEXT NOT NULL DEFAULT '63,107,91',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. PSYCHOLOGISTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS psychologists (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  initials TEXT NOT NULL DEFAULT 'PS',
  email TEXT,
  hex TEXT NOT NULL DEFAULT '#8fae9b',
  rgb TEXT NOT NULL DEFAULT '143,174,155',
  light_hex TEXT NOT NULL DEFAULT '#3f6b5b',
  light_rgb TEXT NOT NULL DEFAULT '63,107,91',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. RESERVATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  psych_id INTEGER NOT NULL REFERENCES psychologists(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. ADMIN PIN TABLE (singleton configuration)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pin TEXT NOT NULL DEFAULT '1234',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO admin_config (id, pin) VALUES (1, '1234')
  ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reservations_room_date ON reservations (room_id, date);
CREATE INDEX IF NOT EXISTS idx_reservations_psych_date ON reservations (psych_id, date);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations (date);

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychologists ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Rooms: full CRUD for anon (single-tenant app)
CREATE POLICY "Rooms are readable by everyone" ON rooms
  FOR SELECT USING (true);

CREATE POLICY "Rooms can be inserted by everyone" ON rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Rooms can be updated by everyone" ON rooms
  FOR UPDATE USING (true);

CREATE POLICY "Rooms can be deleted by everyone" ON rooms
  FOR DELETE USING (true);

-- Psychologists: full CRUD for anon
CREATE POLICY "Psychologists are readable by everyone" ON psychologists
  FOR SELECT USING (true);

CREATE POLICY "Psychologists can be inserted by everyone" ON psychologists
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Psychologists can be updated by everyone" ON psychologists
  FOR UPDATE USING (true);

CREATE POLICY "Psychologists can be deleted by everyone" ON psychologists
  FOR DELETE USING (true);

-- Reservations: full CRUD for anon
CREATE POLICY "Reservations are readable by everyone" ON reservations
  FOR SELECT USING (true);

CREATE POLICY "Reservations can be inserted by everyone" ON reservations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Reservations can be updated by everyone" ON reservations
  FOR UPDATE USING (true);

CREATE POLICY "Reservations can be deleted by everyone" ON reservations
  FOR DELETE USING (true);

-- Admin config: readable and updatable by anon
CREATE POLICY "Admin config is readable by everyone" ON admin_config
  FOR SELECT USING (true);

CREATE POLICY "Admin config can be updated by everyone" ON admin_config
  FOR UPDATE USING (true);

-- ============================================================
-- 7. SEED DATA
-- ============================================================

-- Seed rooms
INSERT INTO rooms (id, name, hex, rgb, light_hex, light_rgb) VALUES
  (1, 'Sala Lótus',   '#8fae9b', '143,174,155', '#3f6b5b', '63,107,91'),
  (2, 'Sala Aurora',  '#a9d6e5', '169,214,229', '#4f8fa5', '79,143,165'),
  (3, 'Sala Âmbar',   '#c98268', '201,130,104', '#9b5e4a', '155,94,74'),
  (4, 'Sala Jardim',  '#6baa75', '107,170,117', '#3f6b5b', '63,107,91')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence after manual inserts
SELECT setval('rooms_id_seq', (SELECT COALESCE(MAX(id), 1) FROM rooms));

-- Seed psychologists
INSERT INTO psychologists (id, name, short_name, initials, email, hex, rgb, light_hex, light_rgb) VALUES
  (1, 'Dra. Cátia Alves',     'Cátia Alves',     'CA', 'catia@clinicamodelo.com',     '#8fae9b', '143,174,155', '#3f6b5b', '63,107,91'),
  (2, 'Dr. Marcelo Dias',     'Marcelo Dias',    'MD', 'marcelo@clinicamodelo.com',   '#a9d6e5', '169,214,229', '#4f8fa5', '79,143,165'),
  (3, 'Dra. Fernanda Cruz',   'Fernanda Cruz',   'FC', 'fernanda@clinicamodelo.com',  '#c98268', '201,130,104', '#9b5e4a', '155,94,74'),
  (4, 'Dra. Juliana Matos',   'Juliana Matos',   'JM', 'juliana@clinicamodelo.com',   '#6baa75', '107,170,117', '#3f6b5b', '63,107,91')
ON CONFLICT (id) DO NOTHING;

SELECT setval('psychologists_id_seq', (SELECT COALESCE(MAX(id), 1) FROM psychologists));

-- ============================================================
-- 8. REALTIME SUBSCRIPTIONS (enable for live updates)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE psychologists;
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
