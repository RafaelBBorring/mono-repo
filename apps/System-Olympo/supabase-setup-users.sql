-- ═══════════════════════════════════════════════════════════════════
-- SISTEMA OLYMPO 2.0 — Usuários Iniciais
-- Projeto: https://wmkswavqtqyfcjuiwtbw.supabase.co
-- Execute no SQL Editor do Supabase DEPOIS do supabase-schema.sql
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════════
-- LIMPAR DADOS ANTIGOS (OPCIONAL — descomente se necessário)
-- ═══════════════════════════════════════════════════════════════════
-- DELETE FROM public.ability_reviews;
-- DELETE FROM public.characters;
-- DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users);
-- DELETE FROM auth.users WHERE email LIKE '%@olympo.local';

-- ═══════════════════════════════════════════════════════════════════
-- 1. ADMIN — login: admin / senha: olympo2026
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token,
  raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@olympo.local',
  crypt('olympo2026', gen_salt('bf')),
  now(), now(), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Admin","role":"admin"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, role)
SELECT id, 'Admin', 'admin'
FROM auth.users WHERE email = 'admin@olympo.local'
ON CONFLICT (id) DO UPDATE SET role = 'admin', display_name = 'Admin';

-- ═══════════════════════════════════════════════════════════════════
-- 2. RAFAEL — login: rafael / senha: olympo2026
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token,
  raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'rafael@olympo.local',
  crypt('olympo2026', gen_salt('bf')),
  now(), now(), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Rafael","role":"admin"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, role)
SELECT id, 'Rafael', 'admin'
FROM auth.users WHERE email = 'rafael@olympo.local'
ON CONFLICT (id) DO UPDATE SET role = 'admin', display_name = 'Rafael';

-- ═══════════════════════════════════════════════════════════════════
-- 3. JOGADOR TESTE — login: teste / senha: teste1234
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token,
  raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'teste@olympo.local',
  crypt('teste1234', gen_salt('bf')),
  now(), now(), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Jogador Teste","role":"user"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, role)
SELECT id, 'Jogador Teste', 'user'
FROM auth.users WHERE email = 'teste@olympo.local'
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════
-- TEMPLATE: Novo Usuário (copie e edite)
-- ═══════════════════════════════════════════════════════════════════
/*
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token,
  raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'USERNAME@olympo.local',
  crypt('SENHA', gen_salt('bf')),
  now(), now(), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"NOME","role":"user"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, role)
SELECT id, 'NOME', 'user'
FROM auth.users WHERE email = 'USERNAME@olympo.local'
ON CONFLICT (id) DO NOTHING;
*/

-- ═══════════════════════════════════════════════════════════════════
-- LOGINS
-- ═══════════════════════════════════════════════════════════════════
-- admin   / olympo2026   (ADMIN)
-- rafael  / olympo2026   (ADMIN)
-- teste   / teste1234    (USER)
