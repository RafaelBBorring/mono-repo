-- ═══════════════════════════════════════════════════════════════════
-- SISTEMA OLYMPO 2.0 — Schema do Banco (Supabase)
-- Projeto: https://wmkswavqtqyfcjuiwtbw.supabase.co
-- Execute no SQL Editor do Supabase (cole tudo e clique Run)
-- ═══════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════
-- 1. TABELAS
-- ══════════════════════════════════════════════════

-- Profiles: extensão de auth.users com nome e role
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

-- Characters: fichas de personagem (data = JSONB completo)
create table if not exists public.characters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null default 'Sem Nome',
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ability Reviews: revisões de habilidades pela IA
create table if not exists public.ability_reviews (
  id uuid default gen_random_uuid() primary key,
  character_id uuid references public.characters on delete cascade not null,
  ability_key text not null,
  ability_name text not null default '',
  ability_type text not null default 'character' check (ability_type in ('character', 'weapon')),
  status text not null default 'pendente' check (status in ('pendente', 'revisada', 'revisao_necessaria')),
  original_data jsonb default '{}',
  balanced_data jsonb default '{}',
  ai_feedback text default '',
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

-- Alchemy Rituals: biblioteca administrativa de rituais, base para Feiticos e Runas
create table if not exists public.alchemy_rituals (
  id text primary key,
  ritual_type text not null default 'alchemy' check (ritual_type in ('alchemy', 'spell', 'rune', 'magic')),
  name text not null,
  circle integer not null check (circle between 1 and 4),
  category text not null,
  pe_cost integer not null default 0,
  min_level integer not null default 1,
  action_cost text not null default 'Acao Padrao',
  duration text not null default 'Instantaneo',
  range text not null default 'Pessoal',
  short_description text not null default '',
  effect text not null default '',
  source_kind text not null default 'neutro' check (source_kind in ('regente', 'limiar', 'neutro')),
  source_name text not null default '',
  law_name text not null default '',
  price text not null default '',
  rupture_risk integer not null default 1 check (rupture_risk between 1 and 4),
  protocol_layer integer not null default 2 check (protocol_layer between 1 and 3),
  pp_estimate integer not null default 0,
  tags jsonb not null default '[]'::jsonb,
  ai_feedback text not null default '',
  created_by uuid references auth.users on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ══════════════════════════════════════════════════
-- 2. ÍNDICES
-- ══════════════════════════════════════════════════

create index if not exists idx_characters_user_id on public.characters(user_id);
create index if not exists idx_reviews_character_id on public.ability_reviews(character_id);
create index if not exists idx_reviews_status on public.ability_reviews(status);
create index if not exists idx_alchemy_rituals_type on public.alchemy_rituals(ritual_type);
create index if not exists idx_alchemy_rituals_circle on public.alchemy_rituals(circle);
create index if not exists idx_alchemy_rituals_category on public.alchemy_rituals(category);

-- ══════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.ability_reviews enable row level security;
alter table public.alchemy_rituals enable row level security;

-- ══════════════════════════════════════════════════
-- 4. POLÍTICAS RLS
-- ══════════════════════════════════════════════════

-- Profiles: ler e atualizar próprio perfil
create policy "read_own_profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "update_own_profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Characters: CRUD completo do dono
create policy "read_own_characters"
  on public.characters for select
  using (auth.uid() = user_id);

create policy "insert_own_characters"
  on public.characters for insert
  with check (auth.uid() = user_id);

create policy "update_own_characters"
  on public.characters for update
  using (auth.uid() = user_id);

create policy "delete_own_characters"
  on public.characters for delete
  using (auth.uid() = user_id);

-- Ability Reviews: segue dono do personagem
create policy "read_own_reviews"
  on public.ability_reviews for select
  using (
    auth.uid() = (select user_id from public.characters where id = character_id)
  );

create policy "insert_own_reviews"
  on public.ability_reviews for insert
  with check (
    auth.uid() = (select user_id from public.characters where id = character_id)
  );

create policy "update_own_reviews"
  on public.ability_reviews for update
  using (
    auth.uid() = (select user_id from public.characters where id = character_id)
  );

-- Alchemy rituals: qualquer usuario autenticado pode ler; admin pode gerir
create policy "read_alchemy_rituals"
  on public.alchemy_rituals for select
  using (auth.role() = 'authenticated');

create policy "admin_insert_alchemy_rituals"
  on public.alchemy_rituals for insert
  with check (
    exists (
      select 1
      from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "admin_update_alchemy_rituals"
  on public.alchemy_rituals for update
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "admin_delete_alchemy_rituals"
  on public.alchemy_rituals for delete
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ══════════════════════════════════════════════════
-- 5. TRIGGER: AUTO-CRIAR PERFIL NO SIGNUP
-- ══════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ══════════════════════════════════════════════════
-- 6. TRIGGER: AUTO-UPDATE updated_at
-- ══════════════════════════════════════════════════

create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists characters_updated_at on public.characters;
create trigger characters_updated_at
  before update on public.characters
  for each row execute procedure public.update_updated_at();

drop trigger if exists alchemy_rituals_updated_at on public.alchemy_rituals;
create trigger alchemy_rituals_updated_at
  before update on public.alchemy_rituals
  for each row execute procedure public.update_updated_at();
