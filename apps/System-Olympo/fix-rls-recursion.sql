-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: Infinite recursion in RLS policy for "profiles"
-- Problema: admin_read_all_profiles faz SELECT em profiles dentro de policy de profiles
-- Solucao: Criar função SECURITY DEFINER que bypassa RLS + usar em todas as policies
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Criar função auxiliar SECURITY DEFINER (bypassa RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 2. Drop policy recursiva e recriar usando a função
drop policy if exists "admin_read_all_profiles" on public.profiles;
create policy "admin_read_all_profiles"
  on public.profiles for select
  using (public.is_admin());

-- 3. Atualizar todas as outras policies admin para usar a função também

-- Characters
drop policy if exists "admin_read_all_characters" on public.characters;
drop policy if exists "admin_update_all_characters" on public.characters;
drop policy if exists "admin_delete_all_characters" on public.characters;

create policy "admin_read_all_characters"
  on public.characters for select
  using (public.is_admin());

create policy "admin_update_all_characters"
  on public.characters for update
  using (public.is_admin());

create policy "admin_delete_all_characters"
  on public.characters for delete
  using (public.is_admin());

-- Ability Reviews
drop policy if exists "admin_read_all_reviews" on public.ability_reviews;
create policy "admin_read_all_reviews"
  on public.ability_reviews for select
  using (public.is_admin());

-- Alchemy Rituals
drop policy if exists "admin_insert_alchemy_rituals" on public.alchemy_rituals;
drop policy if exists "admin_update_alchemy_rituals" on public.alchemy_rituals;
drop policy if exists "admin_delete_alchemy_rituals" on public.alchemy_rituals;

create policy "admin_insert_alchemy_rituals"
  on public.alchemy_rituals for insert
  with check (public.is_admin());

create policy "admin_update_alchemy_rituals"
  on public.alchemy_rituals for update
  using (public.is_admin());

create policy "admin_delete_alchemy_rituals"
  on public.alchemy_rituals for delete
  using (public.is_admin());
