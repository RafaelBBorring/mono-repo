-- ============================================================
-- SISTEMA OLYMPO 2.0 - Usuarios iniciais
-- Execute no SQL Editor do Supabase depois do supabase-schema.sql
-- Senha padrao adotada neste seed: olympo2026
-- ============================================================

create extension if not exists pgcrypto;

-- Limpeza opcional
-- delete from public.profiles where id in (
--   select id from auth.users where email in (
--     'alfredo@olympo.local',
--     'rosa@olympo.local',
--     'silas@olympo.local',
--     'mestre@olympo.local'
--   )
-- );
-- delete from auth.users where email in (
--   'alfredo@olympo.local',
--   'rosa@olympo.local',
--   'silas@olympo.local',
--   'mestre@olympo.local'
-- );

-- 1. Alfredo - jogador
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'alfredo@olympo.local',
  crypt('olympo2026', gen_salt('bf')),
  now(), now(), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Alfredo","role":"user"}'
)
on conflict (id) do nothing;

insert into public.profiles (id, display_name, role)
select id, 'Alfredo', 'user'
from auth.users
where email = 'alfredo@olympo.local'
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

-- 2. Rosa - jogadora
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'rosa@olympo.local',
  crypt('olympo2026', gen_salt('bf')),
  now(), now(), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Rosa","role":"user"}'
)
on conflict (id) do nothing;

insert into public.profiles (id, display_name, role)
select id, 'Rosa', 'user'
from auth.users
where email = 'rosa@olympo.local'
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

-- 3. Silas - jogador
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'silas@olympo.local',
  crypt('olympo2026', gen_salt('bf')),
  now(), now(), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Silas","role":"user"}'
)
on conflict (id) do nothing;

insert into public.profiles (id, display_name, role)
select id, 'Silas', 'user'
from auth.users
where email = 'silas@olympo.local'
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

-- 4. Mestre - admin
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'mestre@olympo.local',
  crypt('olympo2026', gen_salt('bf')),
  now(), now(), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Mestre","role":"admin"}'
)
on conflict (id) do nothing;

insert into public.profiles (id, display_name, role)
select id, 'Mestre', 'admin'
from auth.users
where email = 'mestre@olympo.local'
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

-- Logins
-- alfredo / olympo2026
-- rosa    / olympo2026
-- silas   / olympo2026
-- mestre  / olympo2026
