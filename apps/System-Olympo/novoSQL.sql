-- ═══════════════════════════════════════════════════════════════════════════════
-- SISTEMA OLYMPO 2.0 — Schema Completo (Supabase SQL Editor)
-- Projeto: https://wmkswavqtqyfcjuiwtbw.supabase.co
-- Execute TUDO de uma vez no SQL Editor (cole e clique Run)
--
-- Conteudo:
--   1. Extensao pgcrypto
--   2. Tabelas (profiles, characters, ability_reviews, alchemy_rituals)
--   3. Indices
--   4. Row Level Security + Politicas (incluindo admin)
--   5. Triggers (auto-profile, updated_at)
--   6. Usuarios (Mestre=admin, Alfredo, Rosa, Silas)
--   7. Seed: Rituais de Alquimia (16)
--   8. Seed: Feiticos (18)
--   9. Seed: Runas (29)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 0. EXTENSAO
-- ═══════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TABELAS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Profiles: extensao de auth.users com nome e role
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

-- Characters: fichas de personagem (data = JSONB completo)
-- O campo data armazena TUDO: raca, subraca, racaDeus, racaTipo, racaAttrChoices,
-- atributos, skeletonPoints, classe, nivel, choices, pericias, triagens, modulos,
-- arma, armaRank, armaHabilidades, habilidades, systemsOptIn (alchemy/spells/runes),
-- alchemyRituals, spells, runes, inventario, equipamentos, notas, avatar, etc.
create table if not exists public.characters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null default 'Sem Nome',
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ability Reviews: revisoes de habilidades pela IA
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

-- Alchemy Rituals: biblioteca administrativa de rituais (alquimia, feiticos, runas, magias)
-- ritual_type discrimina: 'alchemy', 'spell', 'rune', 'magic'
-- characters referenciam estes rituais via id no campo data.alchemyRituals/spells/runes/magics (JSONB)
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. INDICES
-- ═══════════════════════════════════════════════════════════════════════════════

create index if not exists idx_characters_user_id on public.characters(user_id);
create index if not exists idx_characters_updated_at on public.characters(updated_at desc);
create index if not exists idx_reviews_character_id on public.ability_reviews(character_id);
create index if not exists idx_reviews_status on public.ability_reviews(status);
create index if not exists idx_alchemy_rituals_type on public.alchemy_rituals(ritual_type);
create index if not exists idx_alchemy_rituals_circle on public.alchemy_rituals(circle);
create index if not exists idx_alchemy_rituals_category on public.alchemy_rituals(category);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.ability_reviews enable row level security;
alter table public.alchemy_rituals enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. FUNÇÃO AUXILIAR RLS (SECURITY DEFINER)
-- ═══════════════════════════════════════════════════════════════════════════════
-- SECURITY DEFINER bypassa RLS — evita recursão infinita quando policies
-- precisam consultar a própria tabela profiles para verificar role.

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

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. POLITICAS RLS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Limpa politicas existentes para evitar duplicatas
drop policy if exists "read_own_profile" on public.profiles;
drop policy if exists "update_own_profile" on public.profiles;
drop policy if exists "admin_read_all_profiles" on public.profiles;
drop policy if exists "read_own_characters" on public.characters;
drop policy if exists "insert_own_characters" on public.characters;
drop policy if exists "update_own_characters" on public.characters;
drop policy if exists "delete_own_characters" on public.characters;
drop policy if exists "admin_read_all_characters" on public.characters;
drop policy if exists "admin_update_all_characters" on public.characters;
drop policy if exists "admin_delete_all_characters" on public.characters;
drop policy if exists "read_own_reviews" on public.ability_reviews;
drop policy if exists "insert_own_reviews" on public.ability_reviews;
drop policy if exists "update_own_reviews" on public.ability_reviews;
drop policy if exists "admin_read_all_reviews" on public.ability_reviews;
drop policy if exists "read_alchemy_rituals" on public.alchemy_rituals;
drop policy if exists "admin_insert_alchemy_rituals" on public.alchemy_rituals;
drop policy if exists "admin_update_alchemy_rituals" on public.alchemy_rituals;
drop policy if exists "admin_delete_alchemy_rituals" on public.alchemy_rituals;

-- ── Profiles ──────────────────────────────────────────────────────────────────

create policy "read_own_profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "update_own_profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "admin_read_all_profiles"
  on public.profiles for select
  using (public.is_admin());

-- ── Characters ────────────────────────────────────────────────────────────────

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

create policy "admin_read_all_characters"
  on public.characters for select
  using (public.is_admin());

create policy "admin_update_all_characters"
  on public.characters for update
  using (public.is_admin());

create policy "admin_delete_all_characters"
  on public.characters for delete
  using (public.is_admin());

-- ── Ability Reviews ──────────────────────────────────────────────────────────

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

create policy "admin_read_all_reviews"
  on public.ability_reviews for select
  using (public.is_admin());

-- ── Alchemy Rituals ──────────────────────────────────────────────────────────

create policy "read_alchemy_rituals"
  on public.alchemy_rituals for select
  using (auth.role() = 'authenticated');

create policy "admin_insert_alchemy_rituals"
  on public.alchemy_rituals for insert
  with check (public.is_admin());

create policy "admin_update_alchemy_rituals"
  on public.alchemy_rituals for update
  using (public.is_admin());

create policy "admin_delete_alchemy_rituals"
  on public.alchemy_rituals for delete
  using (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Auto-criar perfil no signup
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
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. USUARIOS (Senha padrao: olympo2026)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 6a. Alfredo — jogador
do $$
begin
  if not exists (select 1 from auth.users where email = 'alfredo@olympo.local') then
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
    );
  else
    update auth.users set
      encrypted_password = crypt('olympo2026', gen_salt('bf')),
      email_confirmed_at = now(),
      raw_user_meta_data = '{"display_name":"Alfredo","role":"user"}'
    where email = 'alfredo@olympo.local';
  end if;
end $$;

insert into public.profiles (id, display_name, role)
select id, 'Alfredo', 'user'
from auth.users
where email = 'alfredo@olympo.local'
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

-- 6b. Rosa — jogadora
do $$
begin
  if not exists (select 1 from auth.users where email = 'rosa@olympo.local') then
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
    );
  else
    update auth.users set
      encrypted_password = crypt('olympo2026', gen_salt('bf')),
      email_confirmed_at = now(),
      raw_user_meta_data = '{"display_name":"Rosa","role":"user"}'
    where email = 'rosa@olympo.local';
  end if;
end $$;

insert into public.profiles (id, display_name, role)
select id, 'Rosa', 'user'
from auth.users
where email = 'rosa@olympo.local'
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

-- 6c. Silas — jogador
do $$
begin
  if not exists (select 1 from auth.users where email = 'silas@olympo.local') then
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
    );
  else
    update auth.users set
      encrypted_password = crypt('olympo2026', gen_salt('bf')),
      email_confirmed_at = now(),
      raw_user_meta_data = '{"display_name":"Silas","role":"user"}'
    where email = 'silas@olympo.local';
  end if;
end $$;

insert into public.profiles (id, display_name, role)
select id, 'Silas', 'user'
from auth.users
where email = 'silas@olympo.local'
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

-- 6d. Mestre — admin
do $$
begin
  if not exists (select 1 from auth.users where email = 'mestre@olympo.local') then
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
    );
  else
    update auth.users set
      encrypted_password = crypt('olympo2026', gen_salt('bf')),
      email_confirmed_at = now(),
      raw_user_meta_data = '{"display_name":"Mestre","role":"admin"}'
    where email = 'mestre@olympo.local';
  end if;
end $$;

insert into public.profiles (id, display_name, role)
select id, 'Mestre', 'admin'
from auth.users
where email = 'mestre@olympo.local'
on conflict (id) do update
set display_name = excluded.display_name,
    role = excluded.role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. SEED: RITUAIS DE ALQUIMIA (16 rituais — 4 por circulo)
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.alchemy_rituals (id, ritual_type, name, circle, category, pe_cost, min_level, action_cost, duration, range, short_description, effect, source_kind, source_name, law_name, price, rupture_risk, protocol_layer, pp_estimate, tags, ai_feedback)
values
-- 1o circulo
('alchemy-relatividade-passo-curvatura', 'alchemy', 'Passo da Curvatura', 1, 'Mobilidade', 5, 1,
 'Acao de Movimento', 'Instantaneo', 'Pessoal',
 'Dobra o espaco para reposicionar o corpo em um unico impulso.',
 'Move ate 12m ignorando terreno dificil e obstaculos comuns. Ate o inicio do proximo turno, recebe +4 em Esquiva e +2 no proximo Ataque.',
 'regente', 'Senhor da Anti-Relatividade', 'Relatividade e Curvatura',
 'Leve tontura espacial: -1 em Percepcao ate o fim da cena.',
 1, 2, 4, '["espaco", "mobilidade", "reposicionamento"]',
 'Versao de 1o circulo do eixo Anti-Relatividade. Salto espacial com bonus modestos.'),

('alchemy-inercia-sopro-vetor', 'alchemy', 'Sopro de Vetor', 1, 'Controle', 6, 1,
 'Acao Padrao', 'Instantaneo', 'Cone 6m',
 'Impulso invisivel que altera o vetor de tudo a sua frente.',
 'Criaturas no cone testam Fortitude DT 14. Falha: sofrem 2d8+6 de dano contundente, sao empurradas 4m e ficam caidas. Sucesso: metade do dano e sem queda.',
 'regente', 'Senhor da Anti-Inercia', 'Primeira Lei de Newton',
 'As maos tremem: -2 em Precisao ate o fim do turno.',
 1, 2, 4, '["vetor", "empurrao", "quebra-postura"]',
 'Controle inicial universal. Empurrao e queda sem invalidar posicionamento.'),

('alchemy-biofisica-pulso-predatorio', 'alchemy', 'Pulso Predatorio', 1, 'Suporte', 8, 2,
 'Acao Bonus', '2 rodadas', 'Pessoal',
 'O coracao dispara e a biologia entra em estado de caca.',
 'Recebe +4 em Ataques fisicos, +4 em Esquiva e +2d6 de dano no primeiro ataque corpo-a-corpo que acertar em cada rodada.',
 'regente', 'Biofisica e Entropia Genetica', 'Conservacao Biologica',
 'Ao terminar, sofre -2 em testes de CON ate o fim da cena.',
 1, 2, 5, '["buff", "biologia", "combate"]',
 'Buff agressivo de 1o circulo com janela curta e retorno ofensivo claro.'),

('alchemy-termodinamica-marca-entropica', 'alchemy', 'Marca Entropica', 1, 'Utilidade', 7, 2,
 'Acao Padrao', '3 rodadas', '12m',
 'Grava um selo que acelera desgaste energetico.',
 'Alvo sofre -2 na CA e gasta +3 Energia ou +1 PE sempre que usar habilidade ativa enquanto a marca durar.',
 'regente', 'Senhor do Anti-Termodinamico', 'Segunda Lei da Termodinamica',
 'O proprio usuario perde 2 Energia ao fim do ritual.',
 1, 2, 4, '["selo", "debuff", "desgaste"]',
 'Debuff economico de baixo circulo. Pressiona recursos sem travar o alvo.'),

-- 2o circulo
('alchemy-relatividade-sobreposicao', 'alchemy', 'Sobreposicao Espacial', 2, 'Ataque', 16, 6,
 'Acao Padrao', 'Instantaneo', 'Area 4m a 18m',
 'Partes do espaco ocupam o mesmo lugar por um segundo impossivel.',
 'Escolha uma area. Inimigos nela sofrem 4d10+14 de dano distorcivo e ficam com -4 em Reacoes ate o proximo turno. Alvos na borda testam Esquiva DT 16 para sofrer metade.',
 'regente', 'Senhor da Anti-Relatividade', 'Relatividade e Curvatura',
 'O usuario fica com deslocamento reduzido em 3m ate o proximo turno.',
 2, 2, 7, '["area", "espaco", "ataque"]',
 'Escala a distorcao para 2o circulo, sem chegar nos picos de 3o/4o.'),

('alchemy-inercia-arranque-absoluto', 'alchemy', 'Arranque Absoluto', 2, 'Defesa', 14, 5,
 'Reacao', 'Instantaneo', 'Pessoal',
 'Arranca a inercia de um corpo para escapar do impacto.',
 'Quando for atingido por um ataque, reduz o resultado final dele em 12. Se ainda acertar, pode se mover 6m sem provocar ataques de oportunidade.',
 'regente', 'Senhor da Anti-Inercia', 'Primeira Lei de Newton',
 'Nao pode usar outra Reacao ate o fim da rodada seguinte.',
 2, 2, 6, '["reacao", "defesa", "reposicionamento"]',
 'Defesa tensa para jogadores tecnicos. Evita anular dano puro demais no 2o circulo.'),

('alchemy-termodinamica-silencio-termico', 'alchemy', 'Silencio Termico', 2, 'Controle', 18, 7,
 'Acao Padrao', '2 rodadas', 'Area 6m a 15m',
 'O calor da area e arrancado, travando combustao e impulso.',
 'Chamas comuns se apagam. Criaturas na area sofrem -3 no dano causado e gastam +20% de Energia arredondado para cima. Fontes intensas de fogo testam AM DT 17 para permanecer ativas.',
 'regente', 'Senhor do Anti-Termodinamico', 'Segunda Lei da Termodinamica',
 'O usuario sofre 1d6 de dano gelido ao encerrar o efeito.',
 2, 2, 7, '["area", "controle", "energia"]',
 'Ferramenta de controle de recursos e ambiente.'),

('alchemy-biofisica-carne-espontanea', 'alchemy', 'Carne Espontanea', 2, 'Defesa', 20, 8,
 'Acao Padrao', '3 rodadas', 'Pessoal',
 'Camadas de carne anomala se formam como armadura viva.',
 'Recebe 40 Vida Temporaria e reducao de dano fisico 4 ate o fim do efeito. Enquanto durar, sofre -2 em testes sociais e furtivos.',
 'regente', 'Biofisica e Entropia Genetica', 'Ordem Celular Corrompida',
 'Ao terminar, perde 5 HP reais pela exaustao metabolica.',
 2, 2, 7, '["armadura", "vida temporaria", "mutacao"]',
 'Defesa biologica de 2o circulo com custo corporal.'),

-- 3o circulo
('alchemy-relatividade-colapso-localizado', 'alchemy', 'Colapso Localizado', 3, 'Ataque', 24, 12,
 'Acao Padrao', 'Instantaneo', '24m',
 'Colapsa um ponto do espaco sobre o alvo.',
 'Alvo testa CON DT 18. Falha: sofre 7d10+22 de dano distorcivo e perde 3m de deslocamento por 2 rodadas. Sucesso: metade do dano e sem perda de deslocamento.',
 'regente', 'Senhor da Anti-Relatividade', 'Colapso do Espaco',
 'Nao pode usar outro ritual de Mobilidade ate o fim do proximo turno.',
 3, 2, 9, '["distorcao", "alvo-unico", "colapso"]',
 'Nucleo ofensivo de 3o circulo. Forte em alvo unico.'),

('alchemy-inercia-roubo-movimento', 'alchemy', 'Roubo de Movimento', 3, 'Controle', 22, 12,
 'Reacao', '1 rodada', '18m',
 'Rouba o impulso de um corpo e entrega a outro.',
 'Quando um inimigo se mover ou atacar, ele testa Esquiva DT 18. Falha: perde o movimento restante, sofre -5 no ataque e um aliado a 12m pode se mover 6m como Reacao livre.',
 'regente', 'Senhor da Anti-Inercia', 'Estase Absoluta',
 'Se falhar, o usuario fica sem Reacoes ate o proximo turno.',
 3, 2, 8, '["controle", "reacao", "movimento"]',
 'Controle reativo forte e tecnico com boa troca tatica.'),

('alchemy-biofisica-crescimento-aberrante', 'alchemy', 'Crescimento Aberrante', 3, 'Cura', 24, 11,
 'Acao Padrao', '3 rodadas', 'Toque',
 'Forca a materia viva a se recompor acima do ritmo natural.',
 'Aliado ou voce recupera 20% da Vida maxima imediatamente e mais 10% no inicio de cada uma das proximas 2 rodadas. Enquanto durar, recebe +2 CON e -2 DES.',
 'regente', 'Biofisica e Entropia Genetica', 'Proliferacao Celular',
 'Ao final, alvo fica Vulneravel a fogo por 1 rodada.',
 3, 2, 9, '["cura", "regeneracao", "mutacao"]',
 'Cura alta de 3o circulo respeitando teto de 30% por uso imediato.'),

('alchemy-termodinamica-dreno-calor', 'alchemy', 'Dreno de Calor', 3, 'Controle', 26, 13,
 'Acao Padrao', '2 rodadas', '18m',
 'Retira energia termica do alvo e o deixa em quase-estase.',
 'Ataque de toque ou projecao termica. Se acertar, o alvo testa Fortitude DT 19. Falha: sofre 5d10+18 de dano gelido, perde a Acao de Movimento no proximo turno e fica com -5 no proximo teste ofensivo. Sucesso: metade do dano e apenas -2.',
 'regente', 'Senhor do Anti-Termodinamico', 'Fim do Fluxo',
 'O usuario sofre -2 em testes de FOR ate o fim da cena.',
 3, 2, 9, '["gelo", "debuff", "esgotamento"]',
 'Controle com dano moderado e perda parcial de acao.'),

-- 4o circulo
('alchemy-relatividade-implosao-horizonte', 'alchemy', 'Implosao de Horizonte', 4, 'Ataque', 40, 21,
 'Acao Padrao', 'Instantaneo', 'Area 6m a 24m',
 'Uma singularidade instavel puxa tudo antes de explodir para dentro.',
 'Criaturas na area testam Esquiva DT 24. Falha: sofrem 12d12+50 de dano distorcivo e sao arrastadas 4m ao centro. Sucesso: metade do dano e sem arrasto.',
 'regente', 'Senhor da Anti-Relatividade', 'Colapso do Espaco',
 'O usuario recebe 2d10 de dano de retorno e +1 Ruptura adicional ao Veu.',
 4, 3, 15, '["ultimate", "area", "singularidade"]',
 '4o circulo catastrofico em camada 3 do protocolo.'),

('alchemy-inercia-mundo-imovel', 'alchemy', 'Mundo Imovel', 4, 'Defesa', 34, 20,
 'Acao Padrao', '3 rodadas', 'Area 8m centrada em voce',
 'Rouba a continuidade do movimento dentro de uma zona inteira.',
 'Voce cria uma zona de estase. Inimigos na area ficam com deslocamento reduzido a metade e -4 em Acoes ofensivas. Uma vez por rodada, a zona absorve ate 120 de dano de projeteis ou impactos que cruzem seu limite.',
 'regente', 'Senhor da Anti-Inercia', 'Estase Absoluta',
 'Enquanto mantem a zona, seu proprio deslocamento cai pela metade.',
 4, 3, 14, '["zona", "defesa", "estase"]',
 'Controle defensivo de 4o circulo. Forte, mas sem invulnerabilidade total.'),

('alchemy-biofisica-ascensao-primordial', 'alchemy', 'Ascensao Primordial', 4, 'Suporte', 38, 22,
 'Acao Padrao', '3 rodadas', 'Pessoal',
 'Destrava um surto evolutivo momentaneo e monstruoso.',
 'Recebe +4 FOR, +4 CON, +3d10 de dano em ataques fisicos e reduz 25% do dano recebido 3 vezes durante o efeito. Ao terminar, fica Exausto: -3 em testes fisicos por 1 cena.',
 'regente', 'Biofisica e Entropia Genetica', 'Sinfonia do Caos Celular',
 'Parte do corpo se deforma por horas, impondo desconforto social severo.',
 4, 3, 14, '["buff", "mutacao", "fisico"]',
 'Pico corporal de 4o circulo com custo metabolico e janela curta.'),

('alchemy-termodinamica-colapso-energia', 'alchemy', 'Colapso de Energia', 4, 'Controle', 42, 24,
 'Acao Padrao', '2 rodadas', '18m',
 'Interrompe fluxos energeticos de uma criatura, arma ou mecanismo.',
 'Alvo testa AM DT 24. Falha: nao pode usar Aura, Runas ou habilidades de arma por 2 rodadas, alem de sofrer 8d12+30 de dano energetico. Sucesso: sofre metade do dano e perde apenas 1 uso reativo no proximo turno.',
 'regente', 'Senhor do Anti-Termodinamico', 'Fim do Fluxo',
 'O usuario tambem perde 10 Energia no fim da rodada seguinte.',
 4, 3, 15, '["anti-magia", "dreno", "desligamento"]',
 'Controle de topo para duelo contra usuarios energeticos.')
on conflict (id) do update set
  name = excluded.name,
  circle = excluded.circle,
  category = excluded.category,
  pe_cost = excluded.pe_cost,
  min_level = excluded.min_level,
  action_cost = excluded.action_cost,
  duration = excluded.duration,
  range = excluded.range,
  short_description = excluded.short_description,
  effect = excluded.effect,
  source_kind = excluded.source_kind,
  source_name = excluded.source_name,
  law_name = excluded.law_name,
  price = excluded.price,
  rupture_risk = excluded.rupture_risk,
  protocol_layer = excluded.protocol_layer,
  pp_estimate = excluded.pp_estimate,
  tags = excluded.tags,
  ai_feedback = excluded.ai_feedback;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. SEED: FEITICOS (18 feiticos — bruxaria e arcana)
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.alchemy_rituals (id, ritual_type, name, circle, category, pe_cost, min_level, action_cost, duration, range, short_description, effect, source_kind, source_name, law_name, price, rupture_risk, protocol_layer, pp_estimate, tags, ai_feedback)
values
-- 1o circulo
('spell-bruxaria-pele-juramento', 'spell', 'Pele de Juramento Antigo', 1, 'Defesa', 10, 1,
 'Acao Bonus', '4 ataques sofridos', 'Pessoal',
 'Um juramento arcano amortece os impactos dirigidos ao conjurador.',
 'Pelos proximos 4 ataques sofridos, reduza o dano final em 30%. Ataques criticos ainda causam ao menos 50% do dano original.',
 'neutro', 'Juramento Antigo', 'Promessa e resguardo',
 'Nao pode manter outro feitico defensivo ativo ao mesmo tempo.',
 1, 2, 4, '["tradition:bruxaria", "defesa", "juramento"]',
 '1o circulo defensivo direto, forte para sobrevivencia curta.'),

('spell-bruxaria-teleporte-curto', 'spell', 'Salto de Teleporte', 1, 'Mobilidade', 10, 1,
 'Acao Bonus', 'Instantaneo', '12m',
 'Reposiciona o conjurador em um ponto visto ou conhecido.',
 'Teleporta ate 12m para um ponto visivel. Se usar para entrar em cobertura, recebe +5 no proximo teste de Furtividade ou Esquiva ate o inicio do proximo turno.',
 'neutro', 'Passo Arcano', 'Espaco local',
 'Nao pode atravessar selos anti-transporte ou areas de ruptura fechada.',
 1, 2, 4, '["tradition:arcana", "mobilidade", "teleporte"]',
 '1o circulo rapido e utilitario sem burlar toda a geografia.'),

('spell-bruxaria-cura-imediata', 'spell', 'Cura de Compasso', 1, 'Suporte', 15, 1,
 'Acao Padrao', 'Instantaneo', 'Toque',
 'Canaliza energia estavel para restaurar tecido e pulso.',
 'Restaura 6d8+20 de vida em um alvo tocado e remove Sangramento, Dor ou uma penalidade fisica simples. Um mesmo alvo so pode receber este feitico 2 vezes por combate.',
 'neutro', 'Compasso Vital', 'Ritmo e restauracao',
 'Se curar alguem abaixo de 25% da vida, o conjurador perde 5 PE adicionais.',
 1, 2, 4, '["tradition:bruxaria", "cura", "toque"]',
 'Cura imediata de 1o circulo sem ultrapassar teto da faixa baixa.'),

('spell-bruxaria-localizacao-sanguinea', 'spell', 'Localizacao de Vinculo', 1, 'Utilidade', 20, 4,
 'Acao Padrao', '6 horas', 'Toque',
 'Marca um alvo e rastreia sua posicao em tempo real.',
 'Marca um alvo tocado ou um objeto pessoal importante. Pelas proximas 6 horas, o conjurador sente direcao e distancia aproximada do marcado. Se a marca for visivel, a duracao sobe para 12 horas.',
 'neutro', 'Fio de Sangue', 'Rastro e presenca',
 'A marca pode ser detectada por magia de revelacao.',
 1, 2, 4, '["tradition:bruxaria", "marca", "rastreamento"]',
 'Utilitario de 1o circulo para investigacao e perseguicao.'),

('spell-arcana-lanca-prismatica', 'spell', 'Lanca Prismatica', 1, 'Ataque', 8, 1,
 'Acao Padrao', 'Instantaneo', '18m',
 'Dispara um feixe limpo de mana condensada.',
 'Ataque magico de linha reta que causa 3d8+10 de dano arcano. Se o alvo estiver sem cobertura, o conjurador recebe +5 no ataque.',
 'neutro', 'Arcana Instantanea', 'Foco e perfuracao',
 'Nao ignora barreiras fisicas nem escudos de energia.',
 1, 2, 4, '["tradition:arcana", "instantaneo", "ataque"]',
 'Ataque basico para magos e misticos de entrada.'),

-- 2o circulo
('spell-bruxaria-sigilo-incineracao', 'spell', 'Sigilo de Incineracao Vinculada', 2, 'Ataque', 18, 6,
 'Acao Padrao', '3 rodadas', '18m',
 'Marca o alvo com fogo interno que resiste a meios comuns.',
 'Aplica a Marca por 3 rodadas. No fim de cada rodada do alvo, causa 3d10+12 de dano igneo. Alvo testa CON DT 18 ao receber a marca; sucesso reduz o dano por rodada em 50%.',
 'neutro', 'Bruxaria de Vinculo', 'Marca, combustao e continuidade',
 'Enquanto a marca existir, o conjurador perde 2 CA contra o alvo marcado.',
 2, 2, 7, '["tradition:bruxaria", "fogo", "marca", "dano-continuo"]',
 '2o circulo com dano sustentado e contrapeso de exposicao.'),

('spell-bruxaria-substituicao-carne', 'spell', 'Substituicao de Carne', 2, 'Defesa', 15, 5,
 'Reacao', 'Instantaneo', 'Pessoal',
 'Transfere um golpe fatal para um receptaculo vinculado.',
 'Quando receber dano, anule ate 120 de dano e destrua um receptaculo vivo preparado. Com +10 PE, pode ser ancorado em objeto inanimado e anula ate 180.',
 'neutro', 'Pacto de Substituicao', 'Transferencia de dano',
 'Cada receptaculo so pode receber um golpe por cena.',
 2, 2, 7, '["tradition:bruxaria", "reacao", "mitigacao", "sacrificio"]',
 'Defensivo forte de 2o circulo ancorado em preparacao previa.'),

('spell-bruxaria-barreira-arcana', 'spell', 'Barreira Arcana Manifestada', 2, 'Defesa', 20, 6,
 'Acao Padrao', '3 rodadas', '15m',
 'Ergue uma parede ou bolha arcana para conter impacto.',
 'Cria uma barreira com 200 de vida em um ponto visivel. Cada 10 PE extras somam +80 de vida. Criaturas atras da barreira recebem cobertura parcial (+5 Defesa).',
 'neutro', 'Tecelagem Arcana', 'Forma, choque e contencao',
 'Se a barreira for destruida, o conjurador sofre 1d10 de dano de retorno por circulo.',
 2, 2, 8, '["tradition:arcana", "barreira", "protecao"]',
 'Barreira de 2o circulo com escala controlada por PE extra.'),

('spell-bruxaria-telecinese-vetorial', 'spell', 'Telecinese Vetorial', 2, 'Controle', 10, 5,
 'Acao Padrao', 'Instantaneo', '18m',
 'Empurra, prende ou arremessa um alvo com forca focada.',
 'Recebe +5 no ataque do empurrao. Se acertar, alvo testa Fortitude DT 18; falha e escolhido entre: ser empurrado 9m, cair, ou sofrer 3d10+10 de dano concussivo. Falha por 5+: 1 Ataque Extra contra ele.',
 'neutro', 'Matriz Vetorial', 'Forca e deslocamento',
 'Nao move alvos duas categorias de tamanho acima.',
 2, 2, 7, '["tradition:arcana", "telecinese", "controle"]',
 'Controle de 2o circulo com escolha util entre deslocamento, queda e dano.'),

('spell-bruxaria-desativacao-ritual', 'spell', 'Desativacao de Circuito', 2, 'Controle', 10, 7,
 'Acao Padrao', '3 rodadas', 'Area 5m',
 'Silencia focos, selos e armas magicas em uma zona fechada.',
 'Cria area de 5m. Habilidades de arma, runas ativas e efeitos magicos simples sao desligados por 3 rodadas. Donos testam Poder DT 18 no inicio do turno; sucesso permite usar um unico efeito.',
 'neutro', 'Cancelamento', 'Interrupcao de fluxo',
 'O conjurador tambem nao pode manter seus proprios buffs enquanto a zona existir.',
 2, 2, 7, '["tradition:arcana", "anti-magia", "area"]',
 'Controle de 2o circulo que desarma sistemas epicos temporariamente.'),

-- 3o circulo
('spell-bruxaria-intangibilidade-breve', 'spell', 'Intangibilidade Absoluta Breve', 3, 'Mobilidade', 30, 12,
 'Reacao', '1 rodada', 'Pessoal',
 'O corpo atravessa a materia por um instante curto.',
 'Ao ser alvo de ataque ou efeito fisico, receba +15 no Resultado da Esquiva e atravesse objetos nao magicos de ate 1m de espessura ate o fim do turno.',
 'neutro', 'Velo Etereo', 'Fase e substancia',
 'Nao pode atacar no mesmo turno em que usar esta reacao.',
 3, 2, 9, '["tradition:arcana", "reacao", "intangibilidade"]',
 'Mobilidade defensiva de 3o circulo com custo tatico real.'),

('spell-bruxaria-revelacao-oculto', 'spell', 'Revelacao do Oculto', 3, 'Utilidade', 30, 11,
 'Acao Completa', '1 minuto', 'Area 12m',
 'Arranca ilusoes, rastros e resquicios de eventos recentes.',
 'Em area de 12m, detecta ilusoes, selos, presencas invisiveis e residuos arcanos. +15 em Percepcao e Investigacao. Com +20 PE, reconstroi ate 1 minuto de ecos visuais do local.',
 'neutro', 'Olho de Vigilia', 'Memoria e revelacao',
 'Enquanto durar, o conjurador sofre -5 em testes ofensivos por excesso de foco sensorial.',
 3, 2, 8, '["tradition:arcana", "deteccao", "investigacao"]',
 'Utilitario forte de 3o circulo voltado para cena.'),

('spell-bruxaria-rompimento-ligacao', 'spell', 'Rompimento de Ligacao', 3, 'Controle', 35, 13,
 'Acao Padrao', 'Instantaneo', '18m',
 'Separa um vinculo mistico, emocional ou pactuado.',
 'Anula conexao ativa entre dois alvos ou entre alvo e efeito: pactos menores, compartilhamento de cura/dano, marcas de submissao, controle de criatura e efeitos de aura. Mantenedor testa Poder DT 21; sucesso reduz a 1 rodada de supressao.',
 'limiar', 'Tesoura do Limiar', 'Separacao e contrato',
 'Ao romper pacto ou maldicao forte, o conjurador sofre 2d10 de dano psiquico.',
 3, 2, 10, '["tradition:bruxaria", "supressao", "pacto"]',
 'Ferramenta de 3o circulo para resposta a efeitos complexos.'),

('spell-arcana-escudo-reflexo', 'spell', 'Escudo de Reflexo', 3, 'Defesa', 28, 12,
 'Reacao', '1 rodada', 'Pessoal',
 'Forma um prisma reativo que rebate parte do impacto.',
 'Recebe +12 na Defesa contra um ataque ou habilidade. Se ainda assim sofrer dano, reflita 40% do dano final ao atacante como dano arcano.',
 'neutro', 'Prisma de Guerra', 'Reflexo e retorno',
 'Depois de usar, o conjurador fica com -5 Defesa ate o inicio do proximo turno.',
 3, 2, 9, '["tradition:arcana", "reacao", "reflexo"]',
 'Defesa reativa de 3o circulo com contra-impacto situacional.'),

-- 4o circulo
('spell-bruxaria-palavra-desfazer', 'spell', 'Palavra de Desfazer', 4, 'Controle', 40, 18,
 'Acao Padrao', 'Instantaneo', '12m',
 'Uma ordem proibida desmancha corpo, foco ou vontade do alvo.',
 'Escolha uma palavra ao conjurar. "Pare": alvo testa Vontade DT 24; falha fica imobilizado por 1 rodada. "Desapareca": alvo testa CON DT 24; falha sofre 10d12+45 de dano verdadeiro, sucesso sofre metade. Um mesmo alvo nao pode ser afetado novamente ate o fim do combate.',
 'limiar', 'Lingua Proibida', 'Nome, forma e obediencia',
 'Depois de conjurar, o usuario fica sem usar reacoes ate o inicio do proximo turno.',
 4, 3, 16, '["tradition:bruxaria", "verbo", "controle-duro", "dano-verdadeiro"]',
 '4o circulo raro, com bifurcacao entre controle e dano massivo.'),

('spell-arcana-circulo-gravitacional', 'spell', 'Circulo Gravitacional', 4, 'Controle', 42, 19,
 'Acao Completa', '2 rodadas', 'Area 9m',
 'Um anel de compressao distorce movimento e projeteis.',
 'Cria area de 9m por 2 rodadas. Inimigos na area recebem -10 em deslocamento e em testes de Esquiva/Ataque. Projetis que atravessam causam -50% de dano. Quem falhar em Fortitude DT 24 ao entrar fica preso no centro ate o fim do turno.',
 'neutro', 'Arcana Instantanea', 'Massa e curvatura',
 'Exige concentracao: se sofrer dano pesado, teste Vontade DT 20 para manter.',
 4, 3, 14, '["tradition:arcana", "area", "gravidade"]',
 'Ferramenta epica de 4o circulo para zoneamento severo.')
on conflict (id) do update set
  name = excluded.name,
  circle = excluded.circle,
  category = excluded.category,
  pe_cost = excluded.pe_cost,
  min_level = excluded.min_level,
  action_cost = excluded.action_cost,
  duration = excluded.duration,
  range = excluded.range,
  short_description = excluded.short_description,
  effect = excluded.effect,
  source_kind = excluded.source_kind,
  source_name = excluded.source_name,
  law_name = excluded.law_name,
  price = excluded.price,
  rupture_risk = excluded.rupture_risk,
  protocol_layer = excluded.protocol_layer,
  pp_estimate = excluded.pp_estimate,
  tags = excluded.tags,
  ai_feedback = excluded.ai_feedback;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. SEED: RUNAS (29 runas — menor, comum e maior)
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.alchemy_rituals (id, ritual_type, name, circle, category, pe_cost, min_level, action_cost, duration, range, short_description, effect, source_kind, source_name, law_name, price, rupture_risk, protocol_layer, pp_estimate, tags, ai_feedback)
values
-- ── Runas Menores (1o circulo) ──────────────────────────────────────────────
('rune-menor-vigia-ansuz', 'rune', 'Runa Menor do Vigia', 1, 'Utilidade', 4, 1,
 'Acao Bonus', '10 minutos', 'Pessoal',
 'Amplia leitura de ambiente e ecos de intencao.',
 'Recebe +8 em Percepcao e Investigacao, alem de identificar armadilhas simples a ate 12m.',
 'neutro', 'Ansuz', 'Sabedoria e leitura',
 'Enquanto estiver ativa, o usuario sofre -2 em Furtividade por hiperatencao.',
 1, 2, 3, '["grade:menor", "sentidos", "vigilancia"]',
 'Runa menor utilitaria de leitura e exploracao.'),

('rune-menor-raiz-berkana', 'rune', 'Runa Menor da Raiz Serena', 1, 'Suporte', 5, 1,
 'Acao Bonus', '3 rodadas', 'Toque',
 'Sela ferimentos simples com energia vital controlada.',
 'Restaura 3d8+12 de vida e concede +5 em testes contra veneno ou sangramento por 3 rodadas.',
 'neutro', 'Berkana', 'Cura e crescimento',
 'Nao remove maldicoes nem membros perdidos.',
 1, 2, 4, '["grade:menor", "cura", "vital"]',
 'Cura modesta e limpa para repertorio runico inicial.'),

('rune-menor-impacto-kano', 'rune', 'Runa Menor do Impacto Unido', 1, 'Ataque', 6, 1,
 'Acao Bonus', '1 ataque', 'Pessoal',
 'Condensa corpo e vontade em um golpe explosivo.',
 'Proximo ataque corpo a corpo recebe +2d8+8 de dano e +5 no resultado do ataque.',
 'neutro', 'Kano', 'Forca e convergencia',
 'Depois do golpe, fica sem corrida ou dash no mesmo turno.',
 1, 2, 4, '["grade:menor", "golpe", "forca"]',
 'Runa menor ofensiva, simples e legivel para qualquer classe.'),

('rune-menor-claridade-hagalaz', 'rune', 'Runa Menor da Calmaria', 1, 'Utilidade', 4, 1,
 'Reacao', 'Instantaneo', 'Pessoal',
 'Congela o medo por um instante e abre uma resposta limpa.',
 'Refaca um teste mental ou de decisao e receba +5 no novo resultado.',
 'neutro', 'Hagalaz', 'Calma e previsao imediata',
 '1 uso por cena.',
 1, 2, 3, '["grade:menor", "reacao", "clareza"]',
 'Runa menor defensiva para tomada de decisao.'),

('rune-menor-passo-raido', 'rune', 'Runa Menor do Passo Curto', 1, 'Mobilidade', 5, 1,
 'Acao Bonus', 'Instantaneo', 'Pessoal',
 'Dobra o espaco ao redor do portador em escala curta.',
 'Desloca-se ate 6m sem provocar ataques de oportunidade e recebe +5 em Esquiva ate o inicio do proximo turno.',
 'neutro', 'Raido', 'Deslocamento local',
 'Nao atravessa celas, grades runicas ou barreiras fechadas.',
 1, 2, 3, '["grade:menor", "mobilidade", "espaco"]',
 'Ferramenta runica enxuta de reposicionamento.'),

('rune-menor-lumen-sowelu', 'rune', 'Runa Menor da Luz Franca', 1, 'Suporte', 5, 1,
 'Acao Padrao', '3 rodadas', 'Area 6m',
 'Luz pura revela hostilidade e repele escuridao leve.',
 'Aliados na area recebem +5 contra medo e ilusao. Criaturas sombrias na area sofrem -5 em Furtividade e -2 no dano.',
 'neutro', 'Sowelu', 'Luz e esperanca',
 'A luz denuncia a posicao do grupo.',
 1, 2, 4, '["grade:menor", "luz", "area"]',
 'Suporte inicial focado em revelar e estabilizar.'),

('rune-menor-pulso-thurisaz', 'rune', 'Runa Menor do Pulso', 1, 'Suporte', 4, 1,
 'Acao Bonus', '2 rodadas', 'Pessoal',
 'Injeta energia curta no corpo ou foco do usuario.',
 'Recupera 8 Energia ou 4 PE e recebe +3m de deslocamento por 2 rodadas.',
 'neutro', 'Thurisaz', 'Energia e esforco',
 'Nao pode ser usada duas rodadas seguidas.',
 1, 2, 3, '["grade:menor", "energia", "recarga"]',
 'Suporte menor para folego e reposicionamento.'),

('rune-menor-cadeado-ehwaz', 'rune', 'Runa Menor do Cadeado', 1, 'Controle', 6, 2,
 'Acao Padrao', '1 rodada', '12m',
 'Dificulta o fluxo de energia do alvo por um instante.',
 'Alvo testa Poder DT 15. Falha: perde -10 Energia ou sofre -5 no proximo resultado de habilidade magica. Sucesso: perde metade da Energia.',
 'neutro', 'Ehwaz', 'Bloqueio e drenagem',
 'Nao afeta alvos sem reserva energetica.',
 1, 2, 4, '["grade:menor", "drenagem", "anti-magia"]',
 'Controle leve para interromper cadencias de poder.'),

('rune-menor-instinto-nauthiz', 'rune', 'Runa Menor do Instinto Agudo', 1, 'Defesa', 5, 1,
 'Reacao', 'Instantaneo', 'Pessoal',
 'A sensibilidade cresce antes do perigo tocar o corpo.',
 'Recebe +8 em Esquiva contra um ataque e +5 em Iniciativa ate o fim da rodada seguinte.',
 'neutro', 'Nauthiz', 'Atencao e reflexo',
 'Se falhar mesmo assim, sofre -2 em testes emocionais ate o fim da cena.',
 1, 2, 4, '["grade:menor", "reflexo", "reacao"]',
 'Resposta rapida para sobrevivencia de qualquer arquetipo.'),

('rune-menor-marca-othila', 'rune', 'Runa Menor da Heranca Viva', 1, 'Suporte', 6, 2,
 'Acao Padrao', '3 rodadas', 'Toque',
 'Compartilha um traco simples entre portador e aliado.',
 'Escolha FOR, DES, CON ou AM. Um aliado tocado recebe +5 em testes ligados ao atributo escolhido por 3 rodadas.',
 'neutro', 'Othila', 'Heranca e transmissao',
 'O portador nao pode beneficiar a si mesmo com a mesma runa enquanto ela estiver ativa em outro alvo.',
 1, 2, 4, '["grade:menor", "heranca", "buff"]',
 'Runa menor de suporte e linhagem compartilhada.'),

-- ── Runas Comuns (2o-3o circulo) ─────────────────────────────────────────────
('rune-comum-selo-grafo-ansuz', 'rune', 'Runa Comum do Grafo Celeste', 2, 'Utilidade', 12, 6,
 'Acao Completa', '10 minutos', 'Area 9m',
 'Traca constelacoes locais e expoe a anatomia do problema.',
 'Aliados na area recebem +10 em Investigacao, Conhecimento e analise. Uma vez por cena, pode perguntar ao mestre por uma fraqueza mecanica plausivel do alvo.',
 'neutro', 'Ansuz', 'Sabedoria aplicada',
 'Exige imobilidade para manter o desenho no chao.',
 2, 2, 6, '["grade:comum", "analise", "constelacao"]',
 'Comum utilitaria com forte peso de informacao e planejamento.'),

('rune-comum-florescimento-berkana', 'rune', 'Runa Comum do Florescimento', 2, 'Suporte', 14, 6,
 'Acao Padrao', '3 rodadas', '12m',
 'Reveste um aliado com crescimento vital controlado.',
 'Alvo recebe 80 de vida temporaria e regenera 15 de vida no inicio do turno por 3 rodadas.',
 'neutro', 'Berkana', 'Vida acumulada',
 'Se os PV temporarios forem quebrados, o alvo fica com -5 em deslocamento por 1 rodada.',
 2, 2, 6, '["grade:comum", "vida-temporaria", "regeneracao"]',
 'Suporte comum que protege sem virar cura infinita.'),

('rune-comum-batismo-kano', 'rune', 'Runa Comum do Batismo Marcial', 2, 'Ataque', 12, 7,
 'Acao Bonus', '2 rodadas', 'Pessoal',
 'Consagra o corpo para um pico curto de agressao precisa.',
 'Recebe +10 em ataques fisicos e +3d10+12 de dano fisico nos ataques corpo a corpo por 2 rodadas.',
 'neutro', 'Kano', 'Forca ritualizada',
 'Ao fim do efeito, sofre -5 em Defesa ate o fim do proximo turno.',
 2, 2, 7, '["grade:comum", "forca", "ofensivo"]',
 'Buff comum agressivo com janela curta e contragolpe defensivo.'),

('rune-comum-tear-dagaz', 'rune', 'Runa Comum do Tear Onirico', 2, 'Utilidade', 15, 7,
 'Acao Completa', '1 cena', 'Area 6m',
 'Materializa um objeto ou cenario simples do imaginado.',
 'Cria uma estrutura simples energetica: ponte curta, cobertura leve, correntes, escada ou ferramenta grande. A criacao tem 120 de vida e dura uma cena.',
 'neutro', 'Dagaz', 'Sonho e materializacao',
 'Nao reproduz artefatos complexos, armamento raro ou seres vivos.',
 2, 2, 6, '["grade:comum", "criacao", "sonho"]',
 'Runa comum de solucao de cena e construcao rapida.'),

('rune-comum-camara-ehwaz', 'rune', 'Runa Comum da Camara Nula', 2, 'Controle', 14, 8,
 'Acao Padrao', '2 rodadas', 'Area 4m',
 'Cria uma zona de escoamento energetico onde magia perde pressao.',
 'Area de 4m. Criaturas dentro dela gastam +10 Energia ou +5 PE para usar habilidades. Quem falhar em Poder DT 18 ao entrar perde 1 reacao.',
 'neutro', 'Ehwaz', 'Bloqueio e exaustao',
 'A zona tambem enfraquece habilidades do proprio portador.',
 2, 2, 7, '["grade:comum", "anti-magia", "area"]',
 'Controle comum para esgotar recursos de conjuradores.'),

('rune-comum-laco-gebo', 'rune', 'Runa Comum do Laco Vivo', 2, 'Suporte', 12, 8,
 'Acao Padrao', '3 rodadas', '12m',
 'Costura dois aliados num mesmo fluxo de vantagem.',
 'Escolha dois aliados. Enquanto ambos estiverem a ate 12m, recebem +5 em ataques e resistencias. Quando um curar, o outro recebe 50% da cura.',
 'neutro', 'Gebo', 'Uniao e eco',
 'Se um cair a 0 HP, o outro sofre 2d10 de dano psiquico.',
 2, 2, 7, '["grade:comum", "vinculo", "dupla"]',
 'Suporte comum centrado em dupla e sinergia.'),

('rune-comum-folha-jera', 'rune', 'Runa Comum da Folha Dominante', 2, 'Controle', 13, 7,
 'Acao Padrao', '3 rodadas', 'Area 6m',
 'Vegetacao ou madeira local responde ao selo.',
 'Raizes e galhos prendem a area. Inimigos testam Fortitude DT 18 ao entrar ou iniciar turno; falha ficam lentos e sofrem 2d8+8 de dano por constricao.',
 'neutro', 'Jera', 'Natureza e dominio',
 'Perde eficacia em metal puro, concreto total ou ambientes queimados.',
 2, 2, 6, '["grade:comum", "natureza", "area"]',
 'Controle ambiental comum, dependente de terreno.'),

('rune-comum-portal-raido', 'rune', 'Runa Comum do Portal Dobravel', 3, 'Mobilidade', 22, 12,
 'Acao Completa', '1 rodada', '18m',
 'Abre uma passagem entre dois pontos vistos.',
 'Cria um portal curto entre dois pontos visiveis a ate 18m. Ate 4 criaturas podem atravessar. Quem atravessa recebe +5 na proxima Acao ou Ataque.',
 'neutro', 'Raido', 'Espaco ligado',
 'Nao move criaturas involuntariamente sem teste oposto de Poder.',
 3, 2, 8, '["grade:comum", "portal", "espaco"]',
 'Runa comum alta, com forte valor tatico e custo claro.'),

('rune-comum-escama-wunjo', 'rune', 'Runa Comum da Escama Absorvente', 3, 'Defesa', 20, 11,
 'Acao Bonus', '3 rodadas', 'Pessoal',
 'Uma pelicula absorve impacto em vez de apenas resistir.',
 'Recebe um escudo de 180 de vida por 3 rodadas. Sempre que absorver dano, guarde 25% desse valor; no fim do efeito, cause esse total guardado como explosao de 4m (max 120).',
 'neutro', 'Wunjo', 'Protecao e absorcao',
 'Se o escudo for quebrado por sobrecarga, o usuario perde a proxima reacao.',
 3, 2, 9, '["grade:comum", "escudo", "absorcao"]',
 'Defesa comum forte com contra-ataque condicionado.'),

('rune-comum-agulha-inguz', 'rune', 'Runa Comum da Agulha Mental', 3, 'Controle', 21, 12,
 'Acao Padrao', '2 rodadas', '12m',
 'Finca um comando fino na mente do alvo.',
 'Alvo testa Vontade DT 20. Falha: recebe -10 em testes mentais e nao pode usar reacoes por 2 rodadas. Se falhar por 5+, obedece uma ordem curta e nao suicida no turno atual.',
 'neutro', 'Inguz', 'Mente e intrusao',
 'Criaturas sem mente ou com selo mental superior ignoram o comando, mas ainda sofrem a penalidade.',
 3, 2, 9, '["grade:comum", "mente", "comando"]',
 'Controle mental comum forte, mas ainda situacional e breve.'),

-- ── Runas Maiores (3o-4o circulo) ─────────────────────────────────────────────
('rune-maior-julgamento-ansuz', 'rune', 'Runa Maior do Julgamento Astral', 3, 'Utilidade', 26, 14,
 'Acao Completa', '1 cena', 'Area 12m',
 'Convoca um mapa de causalidade acima da cena.',
 'Por uma cena, o usuario pode 1x/rodada escolher entre: receber +15 em um teste intelectual, revelar a maior vulnerabilidade nao escondida de um alvo, ou negar uma ilusao/mentira simples automaticamente.',
 'neutro', 'Ansuz', 'Conhecimento profundo',
 'Cada uso reduz em -5 o proximo ataque do usuario na cena por excesso de foco externo.',
 3, 2, 10, '["grade:maior", "sabedoria", "astral"]',
 'Maior voltada a superioridade informacional e resposta tatica.'),

('rune-maior-renovacao-berkana', 'rune', 'Runa Maior da Renovacao', 3, 'Suporte', 28, 14,
 'Acao Padrao', 'Instantaneo', 'Toque',
 'Refaz carne, nervo e parte da alma em uma unica descarga.',
 'Restaura 12d8+40 de vida, remove 1 maldicao ou condicao grave e reconecta um membro inutilizado se ele ainda existir.',
 'neutro', 'Berkana', 'Crescimento total',
 'Nao pode ser usado no mesmo alvo novamente ate o fim do descanso longo.',
 3, 2, 10, '["grade:maior", "cura-grande", "purificacao"]',
 'Runa maior de recuperacao pesada e raro valor de limpeza.'),

('rune-maior-trama-mannaz', 'rune', 'Runa Maior da Trama Construtora', 3, 'Utilidade', 24, 15,
 'Acao Completa', '1 cena', '12m',
 'Converte materia e sonho em estrutura funcional robusta.',
 'Cria uma estrutura complexa de ate 4 blocos: ponte larga, cela, torre, barricada ou oficina breve. Cada bloco tem 180 de vida e pode receber um gatilho simples.',
 'neutro', 'Mannaz', 'Construcao e prosperidade',
 'Nao gera recursos raros, ouro verdadeiro ou tecnologia autonoma.',
 3, 2, 10, '["grade:maior", "criacao", "estrutura"]',
 'Maior criativa para cena, cerco e dominio de espaco.'),

('rune-maior-transe-eihwaz', 'rune', 'Runa Maior da Transicao Vazia', 3, 'Mobilidade', 27, 16,
 'Acao Bonus', '2 rodadas', 'Pessoal',
 'Faz corpo, alma e sombra transitarem pelo espaco entre estados.',
 'Durante 2 rodadas, atravessa paredes de ate 2m, recebe +10 em Esquiva e pode mover-se por superficies verticais. Se terminar o turno dentro de materia, ejetado e sofre 6d8 de dano.',
 'neutro', 'Eihwaz', 'Transicao e travessia',
 'Nao pode carregar criaturas grandes nem objetos de massa enorme.',
 3, 2, 10, '["grade:maior", "transicao", "fase"]',
 'Maior de mobilidade pura com risco concreto de uso ruim.'),

('rune-maior-pacto-uthila', 'rune', 'Runa Maior da Heranca Pactuada', 3, 'Suporte', 25, 15,
 'Acao Padrao', '4 rodadas', 'Toque',
 'Transfere parte do proprio potencial para outro corpo.',
 'Um aliado recebe +10 em Poder e +2d10+10 no dano das habilidades por 4 rodadas. Se o conjurador cair, o efeito termina e o aliado sofre -10 em Defesa por 1 rodada.',
 'neutro', 'Othila', 'Heranca e transferencia',
 'O usuario nao pode receber buffs de runa enquanto mantiver essa transferencia.',
 3, 2, 10, '["grade:maior", "heranca", "transferencia"]',
 'Maior voltada a empoderar um campeao do grupo.'),

('rune-maior-coroa-fehu', 'rune', 'Runa Maior da Coroa de Poder', 4, 'Suporte', 35, 18,
 'Acao Bonus', '3 rodadas', 'Pessoal',
 'A runa alimenta o portador com uma reserva superior e instavel.',
 'Durante 3 rodadas, recebe +15 em Poder, +10 no dano de habilidades e recupera 10 Energia no inicio de cada turno.',
 'neutro', 'Fehu', 'Acumulo e florescimento',
 'Ao fim, sofre 30 de dano verdadeiro ou perde 20 PE se nao puder pagar com sangue/energia.',
 4, 3, 14, '["grade:maior", "poder", "sobrecarga"]',
 'Maior epica de buff, claramente ancorada em custo posterior.'),

('rune-maior-mar-laguz', 'rune', 'Runa Maior da Mare Condutora', 4, 'Controle', 34, 18,
 'Acao Completa', '3 rodadas', 'Area 12m',
 'Inunda a area com pressao oceanica metafisica.',
 'Inimigos na area testam Fortitude DT 24 por rodada. Falha: ficam lentos, sofrem 6d12+24 de dano esmagador e nao podem voar. Aliados escolhidos recebem cobertura total contra projeteis.',
 'neutro', 'Laguz', 'Mar e pressao',
 'Fora de ambiente umido, custa +5 PE para manter a mare.',
 4, 3, 14, '["grade:maior", "mar", "area"]',
 'Runa maior de zoneamento e esmagamento pesado.'),

('rune-maior-orbita-raido', 'rune', 'Runa Maior da Orbita Violenta', 4, 'Mobilidade', 32, 19,
 'Acao Bonus', '2 rodadas', 'Pessoal',
 'Transforma o portador no ponto central de uma distorcao movel.',
 'Durante 2 rodadas, pode teleportar ate 18m no inicio e no fim do turno. O primeiro ataque feito apos cada salto recebe +15 no resultado e +5d10+20 de dano.',
 'neutro', 'Raido', 'Espaco soberano',
 'Nao pode permanecer no mesmo ponto apos cada salto; se impedido, perde o segundo teleporte.',
 4, 3, 14, '["grade:maior", "teleporte", "agressao"]',
 'Maior epica para duelistas e assassinos espaciais.'),

('rune-maior-lux-sowelu', 'rune', 'Runa Maior do Sol Puro', 4, 'Ataque', 33, 18,
 'Acao Padrao', 'Instantaneo', 'Linha 18m',
 'Dispara um eixo solar que limpa trevas e materia corrompida.',
 'Causa 12d12+45 de dano luminoso em linha. Criaturas de trevas ou corrupcao sofrem +25% de dano e testam Vontade DT 24 para nao ficarem cegas por 1 rodada.',
 'neutro', 'Sowelu', 'Luz absoluta',
 'Em lugares sem ceu visivel, o custo sobe para 40 PE.',
 4, 3, 15, '["grade:maior", "luz", "linha"]',
 'Burst epico fortemente tematizado contra escuridao.'),

('rune-maior-prisao-algiz', 'rune', 'Runa Maior da Prisao Perpetua', 4, 'Controle', 36, 20,
 'Acao Completa', '2 rodadas ou selo', '12m',
 'Fecha uma jaula metafisica sobre uma criatura sobrenatural.',
 'Criatura sobrenatural de porte igual ou menor testa Poder DT 25. Falha: fica selada por 2 rodadas e nao pode ferir o portador. Se cair a 25% da vida enquanto selada, pode ser convertida em selo portatil ate o fim da cena.',
 'neutro', 'Algiz', 'Prisao e carcere',
 'Exige linha de visao continua no momento da selagem.',
 4, 3, 15, '["grade:maior", "prisao", "selo"]',
 'Controle maior e narrativamente importante contra sobrenaturais.')
on conflict (id) do update set
  name = excluded.name,
  circle = excluded.circle,
  category = excluded.category,
  pe_cost = excluded.pe_cost,
  min_level = excluded.min_level,
  action_cost = excluded.action_cost,
  duration = excluded.duration,
  range = excluded.range,
  short_description = excluded.short_description,
  effect = excluded.effect,
  source_kind = excluded.source_kind,
  source_name = excluded.source_name,
  law_name = excluded.law_name,
  price = excluded.price,
  rupture_risk = excluded.rupture_risk,
  protocol_layer = excluded.protocol_layer,
  pp_estimate = excluded.pp_estimate,
  tags = excluded.tags,
  ai_feedback = excluded.ai_feedback;

-- ═══════════════════════════════════════════════════════════════════════════════
-- MAGIAS (ritual_type = 'magic') — Exclusivo da raca MAGO
-- ═══════════════════════════════════════════════════════════════════════════════

insert into public.alchemy_rituals (id, ritual_type, name, circle, category, pe_cost, min_level, action_cost, duration, range, short_description, effect, source_kind, source_name, law_name, price, rupture_risk, protocol_layer, pp_estimate, tags, ai_feedback)
values
  ('magic-basica-bola-fogo', 'magic', 'Bola de Fogo', 1, 'Ataque', 8, 1, 'Acao Padrao', 'Instantaneo', '18m',
   'Condensa chama arcanica e a lanca como projétil explosivo.',
   'Causa 3d8+10 de dano de fogo em um alvo ou area de 3m. Criaturas na area testam Esquiva DT 14; sucesso causa metade do dano. Pode incendiar objetos inflamaveis.',
   'neutro', 'Escola de Fogo', 'Combustao arcana', 'Nao pode ser conjurada underwater ou em vacuo.', 1, 2, 4,
   '["school:fogo", "area", "projétil"]'::jsonb,
   'Magia basica ofensiva de fogo. Dano direto e limpo para Magos iniciantes.'),
  ('magic-basica-escudo-arcano', 'magic', 'Escudo Arcano', 1, 'Defesa', 6, 1, 'Reacao', '1 rodada', 'Pessoal',
   'Um pane de mana solido absorve o proximo impacto.',
   'Quando atingido por ataque, recebe +8 na Defesa contra esse ataque. Se ainda sofrer dano, reduz 5 do total. Nao funciona contra dano verdadeiro.',
   'neutro', 'Escola de Protecao', 'Barreira de mana', 'So pode ser usado 1 vez por rodada.', 1, 2, 4,
   '["school:arcano", "reacao", "defesa"]'::jsonb,
   'Magia basica defensiva. Reacao limpa para sobrevivencia.'),
  ('magic-basica-rajada-forca', 'magic', 'Rajada de Forca', 1, 'Ataque', 5, 1, 'Acao Padrao', 'Instantaneo', '18m',
   'Um jato de energia cinetica pura golpeia o alvo.',
   'Ataque magico que causa 2d10+8 de dano concussivo e empurra o alvo 3m. Criaturas uma categoria maior resistem ao empurrao automaticamente.',
   'neutro', 'Escola Cinetica', 'Forca e impulso', 'Nao atraverra barreiras magicas.', 1, 2, 3,
   '["school:arcano", "concussivo", "empurrao"]'::jsonb,
   'Magia basica de utilidade ofensiva com controle posicional.'),
  ('magic-basica-deteccao-magica', 'magic', 'Deteccao Arcana', 1, 'Utilidade', 4, 1, 'Acao Bonus', 'Cena', 'Pessoal',
   'Os sentidos arcanos se abrem e revelam residuos magicos.',
   'Detecta presencas magicas em 30m. Identifica escola e intensidade de efeitos ativos. +5 em Percepcao contra criaturas magicas ou ilusoes.',
   'neutro', 'Escola de Leitura', 'Assinatura e ressonancia', 'Causa dor de cabeca leve: -1 em testes de CON ate o fim da cena.', 1, 2, 3,
   '["school:arcano", "deteccao", "sentidos"]'::jsonb,
   'Utilitario basico de informacao arcanica.'),
  ('magic-basica-iluminacao', 'magic', 'Luz Astral', 1, 'Utilidade', 3, 1, 'Acao Bonus', '1 hora', 'Pessoal',
   'Uma esfera de luz pura flutua ao redor do conjurador.',
   'Ilumina 12m com luz branca. Criaturas sombrias na area sofrem -2 em Furtividade. Pode ser lancada em um objeto para ilumina-lo permanentemente por 1 hora.',
   'neutro', 'Escola de Luz', 'Foton e radiacao', 'A luz denuncia a posicao do conjurador.', 1, 2, 2,
   '["school:arcano", "luz", "utilidade"]'::jsonb,
   'Magia basica de exploracao e contra-escuridao.'),
  ('magic-intermediaria-tentaculos-gelo', 'magic', 'Tentaculos de Gelo', 2, 'Controle', 16, 6, 'Acao Padrao', '3 rodadas', 'Area 6m a 15m',
   'Estacas de gelo surgem do chao e prendem tudo na area.',
   'Criaturas na area testam Reflexo DT 16. Falha: sofrem 3d10+14 de dano gelido, ficam lentas e nao podem se mover. Sucesso: metade do dano e lentidao por 1 rodada. A area e considerada terreno dificil.',
   'neutro', 'Escola de Gelo', 'Cristalizacao e imobilizacao', 'Derreter o gelo com fogo intenso exige acao completa.', 2, 2, 7,
   '["school:gelo", "area", "controle"]'::jsonb,
   'Magia intermediaria de zoneamento gelado com dano e controle.'),
  ('magic-intermediaria-chuva-canivetes', 'magic', 'Chuva de Canivetes', 2, 'Ataque', 18, 7, 'Acao Padrao', 'Instantaneo', 'Area 5m a 18m',
   'Laminas arcanas chovem do ceu sobre uma area.',
   'Criaturas na area sofrem 4d10+16 de dano cortante e testam Reflexo DT 17. Falha: tambem sofrem sangramento (2d6 por rodada por 2 rodadas). Sucesso: metade do dano sem sangramento.',
   'neutro', 'Escola de Laminas', 'Forma e corte', 'O conjurador nao pode manter outra magia de area ativa no mesmo turno.', 2, 2, 7,
   '["school:arcano", "area", "corte"]'::jsonb,
   'Magia intermediaria ofensiva de area com sangramento condicional.'),
  ('magic-intermediaria-barreira-mana', 'magic', 'Barreira de Mana', 2, 'Defesa', 20, 6, 'Acao Padrao', '3 rodadas', 'Pessoal',
   'Um casulo de mana absorve impacto e protege o conjurador.',
   'Recebe 60 de vida temporaria. Enquanto ativa, reduz dano magico em 5 por golpe. Ao terminar, recupera 2d8 de Energia se ainda tiver PV temporarios.',
   'neutro', 'Escola de Protecao', 'Absorcao e amortecimento', 'Nao pode usar outra magia defensiva simultanea.', 2, 2, 7,
   '["school:arcano", "barreira", "vida-temp"]'::jsonb,
   'Magia intermediaria defensiva com auto-recuperacao.'),
  ('magic-intermediaria-toque-paralisante', 'magic', 'Toque Paralisante', 2, 'Controle', 14, 5, 'Acao Padrao', '1 rodada', 'Toque',
   'O toque do mago congela os nervos do alvo.',
   'Alvo testa Fortitude DT 17. Falha: fica paralisado por 1 rodada e perde acao de movimento no turno seguinte. Sucesso: fica lento por 1 rodada.',
   'neutro', 'Escola de Biocinese', 'Sistema nervoso e estase', 'Exige toque: o conjurador precisa estar adjacente.', 2, 2, 6,
   '["school:arcano", "paralisia", "toque"]'::jsonb,
   'Magia intermediaria de controle forte com restricao de alcance.'),
  ('magic-intermediaria-salto-relampago', 'magic', 'Salto Relampago', 2, 'Mobilidade', 12, 5, 'Acao Bonus', 'Instantaneo', 'Pessoal',
   'Eletricidade arcan envolve o corpo e o lanca em alta velocidade.',
   'Teleporta ate 15m para ponto visivel. Inimigos adjacentes ao ponto de partida sofrem 2d8+8 de dano eletrico. Nao provoca ataques de oportunidade.',
   'neutro', 'Escola de Eletricidade', 'Carga e deslocamento', 'Nao atravessa barreiras condutoras ou grades runicas.', 2, 2, 6,
   '["school:eletrico", "teleporte", "dano-area"]'::jsonb,
   'Magia intermediaria de mobilidade com dano colateral.'),
  ('magic-avancada-meteoro', 'magic', 'Meteoro Arcano', 3, 'Ataque', 28, 12, 'Acao Padrao', 'Instantaneo', 'Area 8m a 30m',
   'Condensa energia arcan e a lanca como um meteoro de mana pura.',
   'Criaturas na area testam Reflexo DT 20. Falha: sofrem 7d10+25 de dano arcano e ficam caidas. Sucesso: metade do dano. O terreno na area fica incandescente: dano 1d8/rodada por 2 rodadas para quem entrar.',
   'neutro', 'Escola de Destruição', 'Massa e impacto', 'O conjurador nao pode mover-se no turno em que conjurar.', 3, 2, 10,
   '["school:arcano", "area", "destruicao"]'::jsonb,
   'Magia avancada de dano massivo em area com efeito residual.'),
  ('magic-avancada-tempestade-eletrica', 'magic', 'Tempestade Eletrica', 3, 'Ataque', 26, 11, 'Acao Completa', '2 rodadas', 'Area 12m a 24m',
   'Nuvens arcanas formam uma tempestade controlada de raios.',
   'No inicio de cada rodada, escolha ate 3 alvos na area. Cada um sofre 4d10+18 de dano eletrico e testa Fortitude DT 20; falha fica atordoado ate o fim do turno.',
   'neutro', 'Escola de Eletricidade', 'Carga e atmosfera', 'Exige ceu visivel. Em ambientes fechados, dano reduz em 30%.', 3, 2, 9,
   '["school:eletrico", "area", "tempestade"]'::jsonb,
   'Magia avancada de dano sustentado com controle de alvos.'),
  ('magic-avancada-prisao-cristal', 'magic', 'Prisao de Cristal', 3, 'Controle', 24, 12, 'Acao Padrao', '3 rodadas', '18m',
   'Cristais arcanos crescem ao redor do alvo e o aprisionam.',
   'Alvo testa Fortitude DT 20. Falha: fica aprisionado em cristal (paralisado, reducao de dano 10) por 3 rodadas. Cada rodada pode testar FOR DT 20 para quebrar. O cristal tem 80 PV e pode ser destruido.',
   'neutro', 'Escola de Cristalizacao', 'Forma e contencao', 'Se o cristal for quebrado por forca, estilhaços causam 2d8 de dano ao prisioneiro.', 3, 2, 9,
   '["school:gelo", "prissão", "controle"]'::jsonb,
   'Magia avancada de controle duro com saida por forca.'),
  ('magic-avancada-drenar-magia', 'magic', 'Drenar Magia', 3, 'Controle', 22, 13, 'Acao Padrao', 'Instantaneo', 'Toque',
   'Absorve o poder magico de um alvo e o converte em energia propria.',
   'Alvo testa Vontade DT 21. Falha: perde metade da Energia atual e nao pode usar habilidades magicas por 1 rodada. O conjurador recupera 50% da Energia drenada como propria.',
   'neutro', 'Escola de Absorcao', 'Transferencia e vazio', 'Se o alvo resistir, o conjurador perde 10 Energia.', 3, 2, 9,
   '["school:arcano", "dreno", "anti-magia"]'::jsonb,
   'Magia avancada anti-conjurador com auto-recuperacao condicional.'),
  ('magic-suprema-apocalipse-arcano', 'magic', 'Apocalipse Arcano', 4, 'Ataque', 40, 20, 'Acao Completa', 'Instantaneo', 'Area 15m centrada no conjurador',
   'Toda a mana do mago e liberada em uma onda destruiva.',
   'Criaturas na area sofrem 12d12+50 de dano arcano e testam Fortitude DT 24. Falha: tambem ficam surdas e cegas por 1 rodada. Sucesso: metade do dano sem condicoes. Aliados escolhidos sofrem apenas 25% do dano.',
   'neutro', 'Escola de Destruição', 'Ignicao total de mana', 'Apos conjurar, o mago fica sem Energia e sofre exaustao por 1 rodada (-3 em tudo).', 4, 3, 15,
   '["school:arcano", "ultimate", "area-massiva"]'::jsonb,
   'Magia suprema de dano catastrofico com auto-penalizacao severa.'),
  ('magic-suprema-singularidade', 'magic', 'Singularidade Gravitacional', 4, 'Controle', 38, 19, 'Acao Completa', '3 rodadas', 'Area 9m a 24m',
   'Cria um ponto de gravidade extrema que atrai e esmaga.',
   'Centro da area: criaturas testam Fortitude DT 24. Falha: sofrem 8d12+35 de dano esmagador e sao arrastadas 5m ao centro. Sucesso: metade do dano e arrasto 2m. Projeteis que cruzam a area causam -50% dano. Quem estiver no centro no inicio do turno sofre dano novamente.',
   'neutro', 'Escola de Gravidade', 'Massa e curvatura extrema', 'O conjurador tambem sofre -10m de deslocamento enquanto mantiver a singularidade.', 4, 3, 14,
   '["school:gravidade", "singularidade", "zoneamento"]'::jsonb,
   'Magia suprema de zoneamento severo com dano sustentado no centro.'),
  ('magic-suprema-dominio-elemental', 'magic', 'Dominio Elemental', 4, 'Suporte', 35, 18, 'Acao Bonus', 'Combate', 'Pessoal',
   'O mago se funde com os elementos e opera com maestria absoluta.',
   'Durante o combate inteiro, recebe +5 em Poder, +3d10 no dano de todas as magias, e resistencia 50% ao elemento escolhido (fogo, gelo, eletrico ou arcano). Magias de circulo 1-2 custam -3 PE.',
   'neutro', 'Escola de Maestria', 'Harmonia elemental', 'Ao terminar, sofre 2d10 de dano verdadeiro por sobrecarga arcana.', 4, 3, 15,
   '["school:arcano", "buff", "elemental"]'::jsonb,
   'Magia suprema de buff com custo de vida e economia de PE.')
on conflict (id) do update set
  name = excluded.name,
  circle = excluded.circle,
  category = excluded.category,
  pe_cost = excluded.pe_cost,
  min_level = excluded.min_level,
  action_cost = excluded.action_cost,
  duration = excluded.duration,
  range = excluded.range,
  short_description = excluded.short_description,
  effect = excluded.effect,
  source_kind = excluded.source_kind,
  source_name = excluded.source_name,
  law_name = excluded.law_name,
  price = excluded.price,
  rupture_risk = excluded.rupture_risk,
  protocol_layer = excluded.protocol_layer,
  pp_estimate = excluded.pp_estimate,
  tags = excluded.tags,
  ai_feedback = excluded.ai_feedback;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIM — Tudo pronto.
--
-- Logins:
--   mestre@olympo.local  / olympo2026  (admin)
--   alfredo@olympo.local / olympo2026  (user)
--   rosa@olympo.local    / olympo2026  (user)
--   silas@olympo.local   / olympo2026  (user)
-- ═══════════════════════════════════════════════════════════════════════════════
