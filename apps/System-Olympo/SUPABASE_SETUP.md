# Sistema Olympo 2.0 — Guia Completo de Configuração do Supabase

> Documento de referência para configurar o banco de dados Supabase do zero ao ambiente funcional.

---

## Sumário

1. [Visão Geral do Projeto](#1-visão-geral-do-projeto)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Passo 1 — Criar o Projeto no Supabase](#passo-1--criar-o-projeto-no-supabase)
4. [Passo 2 — Obter as Chaves de API](#passo-2--obter-as-chaves-de-api)
5. [Passo 3 — Criar as Tabelas (Schema)](#passo-3--criar-as-tabelas-schema)
6. [Passo 4 — Criar os Índices](#passo-4--criar-os-índices)
7. [Passo 5 — Habilitar Row Level Security (RLS)](#passo-5--habilitar-row-level-security-rls)
8. [Passo 6 — Criar as Políticas RLS](#passo-6--criar-as-políticas-rls)
9. [Passo 7 — Criar a Trigger de Auto-Criação de Perfil](#passo-7--criar-a-trigger-de-auto-criação-de-perfil)
10. [Passo 8 — Criar a Trigger de Auto-Update](#passo-8--criar-a-trigger-de-auto-update)
11. [Passo 9 — Inserir Usuários Iniciais](#passo-9--inserir-usuários-iniciais)
12. [Passo 10 — Configurar o Frontend](#passo-10--configurar-o-frontend)
13. [Passo 11 — Executar o Projeto](#passo-11--executar-o-projeto)
14. [Anexo A — SQL Completo do Schema](#anexo-a--sql-completo-do-schema)
15. [Anexo B — SQL Completo de Usuários](#anexo-b--sql-completo-de-usuários)
16. [Anexo C — Estrutura de Dados JSON do Personagem](#anexo-c--estrutura-de-dados-json-do-personagem)
17. [Anexo D — Diagrama de Relacionamentos](#anexo-d--diagrama-de-relacionamentos)
18. [Anexo E — Troubleshooting](#anexo-e--troubleshooting)

---

## 1. Visão Geral do Projeto

O **Sistema Olympo 2.0** é um criador de fichas de personagens para um TTRPG (Tabletop RPG) de mesa. É uma aplicação React (Vite) com:

- **Autenticação** via Supabase Auth (email/senha)
- **3 tabelas** no banco: `profiles`, `characters`, `ability_reviews`
- **Row Level Security (RLS)** para garantir que cada usuário só acessa seus próprios dados
- **Painel Admin** com visão global (usa service role key)
- **Integração com IA** (OpenRouter) para balanceamento de habilidades
- **Deploy via Docker** com Nginx

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite 7 |
| Estilo | Tailwind CSS 3 |
| Banco/Auth | Supabase |
| IA | OpenRouter (Llama 3.3 70B) |
| Deploy | Docker + Nginx |

---

## 2. Pré-requisitos

- Conta no [Supabase](https://supabase.com) (plano free funciona)
- Node.js 22+ instalado
- Git

---

## Passo 1 — Criar o Projeto no Supabase

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `system-olympo` (ou outro de sua preferência)
   - **Database Password**: escolha uma senha forte e salve-a
   - **Region**: escolha a mais próxima dos seus usuários
4. Clique em **"Create new project"** e aguarde a provisionação (~2 min)

---

## Passo 2 — Obter as Chaves de API

Após o projeto ser criado:

1. No menu lateral, vá em **Settings** (engrenagem) → **API**
2. Anote os dois valores:
   - **Project URL** → algo como `https://xxxx.supabase.co`
   - **anon public** (chave pública, segura para o frontend)
   - **service_role** (chave secreta, NUNCA expor publicamente — usada apenas no admin)

Estas chaves serão configuradas no arquivo `src/lib/supabase.js`.

---

## Passo 3 — Criar as Tabelas (Schema)

No painel do Supabase:

1. Vá em **SQL Editor** no menu lateral
2. Clique em **"New Query"**
3. Cole o SQL abaixo e clique em **"Run"**

### 3.1 — Tabela `profiles` (extensão de `auth.users`)

```sql
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);
```

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid (PK, FK → auth.users) | Mesmo ID do usuário autenticado |
| `display_name` | text | Nome de exibição do usuário |
| `role` | text | Papel: `'user'` ou `'admin'` |
| `created_at` | timestamptz | Data de criação |

### 3.2 — Tabela `characters` (fichas de personagem)

```sql
create table if not exists public.characters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null default 'Sem Nome',
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid (PK) | ID único do personagem |
| `user_id` | uuid (FK → auth.users) | Dono do personagem |
| `name` | text | Nome do personagem |
| `data` | jsonb | Todos os dados da ficha (atributos, habilidades, etc.) |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Última atualização (auto-atualizado via trigger) |

### 3.3 — Tabela `ability_reviews` (revisões de habilidades pela IA)

```sql
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
```

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid (PK) | ID único da revisão |
| `character_id` | uuid (FK → characters) | Personagem associado |
| `ability_key` | text | Chave/identificador da habilidade |
| `ability_name` | text | Nome da habilidade |
| `ability_type` | text | Tipo: `'character'` ou `'weapon'` |
| `status` | text | Status: `'pendente'`, `'revisada'` ou `'revisao_necessaria'` |
| `original_data` | jsonb | Dados originais antes da revisão |
| `balanced_data` | jsonb | Dados após balanceamento pela IA |
| `ai_feedback` | text | Feedback textual da IA |
| `reviewed_at` | timestamptz | Data da revisão |
| `created_at` | timestamptz | Data de criação |

---

## Passo 4 — Criar os Índices

No mesmo SQL Editor, cole e execute:

```sql
create index if not exists idx_characters_user_id on public.characters(user_id);
create index if not exists idx_reviews_character_id on public.ability_reviews(character_id);
create index if not exists idx_reviews_status on public.ability_reviews(status);
```

Estes índices otimizam:
- Busca de personagens por usuário
- Busca de revisões por personagem
- Filtro de revisões por status

---

## Passo 5 — Habilitar Row Level Security (RLS)

O RLS garante que usuários só acessam dados que lhes pertencem. Execute:

```sql
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.ability_reviews enable row level security;
```

---

## Passo 6 — Criar as Políticas RLS

### 6.1 — Profiles: leitura e atualização do próprio perfil

```sql
create policy "read_own_profile" on public.profiles
  for select using (auth.uid() = id);

create policy "update_own_profile" on public.profiles
  for update using (auth.uid() = id);
```

### 6.2 — Characters: CRUD completo do dono

```sql
create policy "read_own_characters" on public.characters
  for select using (auth.uid() = user_id);

create policy "insert_own_characters" on public.characters
  for insert with check (auth.uid() = user_id);

create policy "update_own_characters" on public.characters
  for update using (auth.uid() = user_id);

create policy "delete_own_characters" on public.characters
  for delete using (auth.uid() = user_id);
```

### 6.3 — Ability Reviews: segue dono do personagem

```sql
create policy "read_own_reviews" on public.ability_reviews
  for select using (
    auth.uid() = (select user_id from public.characters where id = character_id)
  );

create policy "insert_own_reviews" on public.ability_reviews
  for insert with check (
    auth.uid() = (select user_id from public.characters where id = character_id)
  );

create policy "update_own_reviews" on public.ability_reviews
  for update using (
    auth.uid() = (select user_id from public.characters where id = character_id)
  );
```

---

## Passo 7 — Criar a Trigger de Auto-Criação de Perfil

Quando um usuário se registra via Supabase Auth, um perfil é criado automaticamente:

```sql
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
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Como funciona:**
- Ao registrar um novo usuário em `auth.users`, a trigger disca automaticamente
- O `display_name` vem de `raw_user_meta_data` ou, por fallback, da parte antes do `@` no email
- O `role` padrão é `'user'`, mas pode ser `'admin'` se passado nos metadados

---

## Passo 8 — Criar a Trigger de Auto-Update

Atualiza automaticamente o campo `updated_at` quando um personagem é modificado:

```sql
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger characters_updated_at
  before update on public.characters
  for each row execute procedure public.update_updated_at();
```

---

## Passo 9 — Inserir Usuários Iniciais

### Opção A: Via SQL (recomendado para setup inicial)

Execute no SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══ ADMIN (login: admin / senha: olympo2026) ═══
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
```

### Login dos usuários padrão

| Login | Email | Senha | Role |
|-------|-------|-------|------|
| `admin` | admin@olympo.local | olympo2026 | admin |
| `rafael` | rafael@olympo.local | olympo2026 | admin |
| `teste` | teste@olympo.local | teste1234 | user |

### Opção B: Adicionar mais usuários via SQL

Use este template para criar novos usuários:

```sql
-- Template para novo usuário
-- Substitua: NOVO_USUARIO, SENHA, NOME_EXIBICAO, ROLE (user ou admin)
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
  'NOVO_USUARIO@olympo.local',
  crypt('SENHA', gen_salt('bf')),
  now(), now(), now(),
  '', '', '', '',
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"NOME_EXIBICAO","role":"ROLE"}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, role)
SELECT id, 'NOME_EXIBICAO', 'ROLE'
FROM auth.users WHERE email = 'NOVO_USUARIO@olympo.local'
ON CONFLICT (id) DO NOTHING;
```

### Para limpar todos os dados e recomeçar (CUIDADO — destrutivo)

```sql
-- Descomente e execute SOMENTE se quiser resetar tudo
-- DELETE FROM public.ability_reviews;
-- DELETE FROM public.characters;
-- DELETE FROM public.profiles WHERE id IN (SELECT id FROM auth.users);
-- DELETE FROM auth.users WHERE email LIKE '%@olympo.local';
```

---

## Passo 10 — Configurar o Frontend

Edite o arquivo `src/lib/supabase.js` com as suas chaves:

```javascript
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wmkswavqtqyfcjuiwtbw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indta3N3YXZxdHF5ZmNqdWl3dGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTAwOTEsImV4cCI6MjA5MjQ2NjA5MX0.y7jhy5yWI0w0ifX9dNqGzf7ja_H5xBBLVz5yReo76TA'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indta3N3YXZxdHF5ZmNqdWl3dGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg5MDA5MSwiZXhwIjoyMDkyNDY2MDkxfQ.bS1XSnMOhxJ_MSeKzSmzn_Axpq5gEPxfCsSg4_enfgk'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let _admin = null
export function getSupabaseAdmin() {
  if (!_admin) {
    _admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }
  return _admin
}
```

**Notas importantes:**
- `SUPABASE_ANON_KEY` → usada pelo cliente normal (respeita RLS)
- `SUPABASE_SERVICE_KEY` → usada SOMENTE no Admin Dashboard (bypassa RLS)
- A service key é usada apenas no browser para o painel admin; em produção, mova para um backend

---

## Passo 11 — Executar o Projeto

### Desenvolvimento local

```bash
# Instalar dependências
npm install

# Rodar em modo dev
npm run dev
```

Acesse `http://localhost:5173`

### Build de produção

```bash
npm run build
npm run preview
```

### Docker

```bash
docker-compose up --build
```

Acesse `http://localhost:5000`

---

## Anexo A — SQL Completo do Schema

Cole tudo de uma vez no SQL Editor (Passos 3–8):

```sql
-- ═══════════════════════════════════════════════════════════
-- SISTEMA OLYMPO 2.0 — Supabase Schema Completo
-- Execute este SQL no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════

-- ═══ TABELAS ═══

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

create table if not exists public.characters (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null default 'Sem Nome',
  data jsonb not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

-- ═══ INDEXES ═══
create index if not exists idx_characters_user_id on public.characters(user_id);
create index if not exists idx_reviews_character_id on public.ability_reviews(character_id);
create index if not exists idx_reviews_status on public.ability_reviews(status);

-- ═══ RLS ═══
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.ability_reviews enable row level security;

-- ═══ POLÍTICAS RLS ═══

-- Profiles: users can read/update own
create policy "read_own_profile" on public.profiles for select using (auth.uid() = id);
create policy "update_own_profile" on public.profiles for update using (auth.uid() = id);

-- Characters: full CRUD for owner
create policy "read_own_characters" on public.characters for select using (auth.uid() = user_id);
create policy "insert_own_characters" on public.characters for insert with check (auth.uid() = user_id);
create policy "update_own_characters" on public.characters for update using (auth.uid() = user_id);
create policy "delete_own_characters" on public.characters for delete using (auth.uid() = user_id);

-- Ability Reviews: follow character ownership
create policy "read_own_reviews" on public.ability_reviews for select using (
  auth.uid() = (select user_id from public.characters where id = character_id)
);
create policy "insert_own_reviews" on public.ability_reviews for insert with check (
  auth.uid() = (select user_id from public.characters where id = character_id)
);
create policy "update_own_reviews" on public.ability_reviews for update using (
  auth.uid() = (select user_id from public.characters where id = character_id)
);

-- ═══ AUTO-CREATE PROFILE ON SIGNUP ═══
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
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══ AUTO-UPDATE updated_at ═══
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger characters_updated_at
  before update on public.characters
  for each row execute procedure public.update_updated_at();
```

---

## Anexo B — SQL Completo de Usuários

```sql
-- ═══════════════════════════════════════════════════════════
-- SISTEMA OLYMPO 2.0 — Setup: Admin + Usuários
-- Cole e execute no SQL Editor do Supabase
-- Login = username (sem email), Senha definida abaixo
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══ 1. ADMIN (login: admin / senha: olympo2026) ═══
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

-- ═══ 2. RAFAEL (login: rafael / senha: olympo2026) ═══
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

-- ═══ 3. JOGADOR TESTE (login: teste / senha: teste1234) ═══
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

-- ═══ Logins ═══
-- admin   / olympo2026   (ADMIN)
-- rafael  / olympo2026   (ADMIN)
-- teste   / teste1234    (USER)
```

---

## Anexo C — Estrutura de Dados JSON do Personagem

O campo `data` (jsonb) da tabela `characters` armazena toda a ficha:

```json
{
  "nome": "Nome do Personagem",
  "raca": "Humano",
  "racaTipo": "Humano Aprimorado",
  "nivel": 1,
  "arrayTipo": "Balanceado",
  "avatar": "base64... ou null",

  "atributos": {
    "FOR": 15, "DES": 14, "CON": 13,
    "INT": 12, "APA": 10, "AM": 8
  },

  "skeletonPoints": {
    "FOR": 0, "DES": 0, "CON": 0,
    "INT": 0, "APA": 0, "AM": 0
  },

  "skeletonHistory": [],

  "classe": "GUERREIRO",
  "choices": {},

  "pericias": {
    "Lutar": 1,
    "Bloqueio": 1
  },

  "triagemPrincipal": "TÁTICO",
  "triagemPrincipalNivel": 0.1,
  "subTriagem": null,
  "subTriagemNivel": 0,
  "subTriagemClass": null,

  "modulosAdquiridos": [
    { "id": "treino_intensivo", "name": "Treino Intensivo", "type": "passivo", "boughtCount": 1 }
  ],
  "modulosSpecialBought": {},

  "arma": "espada_longa",
  "armaRank": "Comum",
  "armaHabilidades": [],

  "arteMarcial": "boxe",
  "arteMarcialGrau": 0,

  "habilidades": [
    {
      "tipo": "Passiva",
      "nome": "Nome da Habilidade",
      "descricao": "Descrição detalhada...",
      "custoEnergia": 0,
      "dano": "",
      "duracao": "",
      "camadaSCP": 2,
      "ppEstimado": 0,
      "status": "Pendente"
    }
  ],

  "vidaOverride": null,
  "energiaOverride": null,
  "peOverride": null,

  "notas": "",
  "inventario": [],
  "equipamentos": []
}
```

### Classes disponíveis

| Classe | Vida Base | Energia Base | PE Base | Dano Base | Perícias Iniciais |
|--------|-----------|-------------|---------|-----------|-------------------|
| Guerreiro | 100+CON×5 | 25+AM×2 | 16 | 2d10+FOR | 6 |
| Operativo | 70+CON×5 | 35+AM×2 | 12 | 2d8+FOR | 8 |
| Místico | 50+CON×5 | 50+AM×2 | 14 | 2d6+FOR | 10 |

### Triagens por classe

| Classe | Triagens |
|--------|---------|
| Guerreiro | TÁTICO, LUTADOR, TANK, SOLDADO |
| Operativo | ASSASSINO, INFILTRADO, ATIRADOR, TÉCNICO |
| Místico | COMBATE, SUPORTE, INTUITIVO, GRADUADO |

### Status de habilidades

| Status | Cor | Significado |
|--------|-----|-------------|
| Pendente | Amarelo | Aguardando revisão do mestre |
| Aprovada | Verde | Aprovada e balanceada |
| Revisão necessária | Vermelho | Precisa de ajustes |

---

## Anexo D — Diagrama de Relacionamentos

```
┌──────────────────────┐
│     auth.users       │  (Supabase Auth nativo)
│──────────────────────│
│ id (uuid) PK         │
│ email                │
│ encrypted_password   │
│ raw_user_meta_data   │
└──────────┬───────────┘
           │ 1:1
           ▼
┌──────────────────────┐
│    public.profiles   │
│──────────────────────│
│ id (uuid) PK, FK     │────→ auth.users.id
│ display_name         │
│ role (user|admin)    │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│   auth.users         │
│──────────────────────│
│ id (uuid) PK         │
└──────────┬───────────┘
           │ 1:N
           ▼
┌──────────────────────┐
│  public.characters   │
│──────────────────────│
│ id (uuid) PK         │
│ user_id FK           │────→ auth.users.id
│ name                 │
│ data (jsonb)         │
│ created_at           │
│ updated_at           │
└──────────┬───────────┘
           │ 1:N
           ▼
┌───────────────────────────┐
│  public.ability_reviews   │
│───────────────────────────│
│ id (uuid) PK              │
│ character_id FK           │────→ public.characters.id
│ ability_key               │
│ ability_name              │
│ ability_type              │
│ status                    │
│ original_data (jsonb)     │
│ balanced_data (jsonb)     │
│ ai_feedback               │
│ reviewed_at               │
│ created_at                │
└───────────────────────────┘
```

### Fluxo de autenticação

```
LoginPage.jsx
  │
  ├── Usuário digita "admin" + senha
  │   └── LoginPage converte para "admin@olympo.local"
  │       └── supabase.auth.signInWithPassword({ email, password })
  │
  ▼
AuthContext.jsx
  │
  ├── supabase.auth.getSession() → verifica sessão existente
  ├── supabase.auth.onAuthStateChange() → escuta mudanças
  ├── Busca profile em public.profiles
  │   └── supabase.from('profiles').select('*').eq('id', user.id)
  │
  ▼
App.jsx
  │
  ├── Se user null → mostra LoginPage
  ├── Se profile.role === 'admin' → mostra aba Admin
  └── Carrega personagens do usuário
      ├── User normal: supabase.from('characters').select('*').eq('user_id', user.id)
      └── Admin: getSupabaseAdmin().from('characters').select('*')  (todos)
```

---

## Anexo E — Troubleshooting

### Erro: "Invalid login credentials"

- Verifique se o email está correto (o sistema converte username para `username@olympo.local`)
- Confirme se executou o SQL de inserção de usuários
- Verifique se a senha está correta

### Erro: "new row violates row-level security policy"

- Certifique-se de que o `user_id` no insert corresponde a `auth.uid()`
- O RLS exige que o usuário autenticado seja o dono do registro

### Admin não consegue ver todos os personagens

- Verifique se o `getSupabaseAdmin()` está usando a **service_role key**, não a anon key
- A service role key bypassa o RLS

### Perfil não é criado automaticamente ao registrar

- Confirme se a trigger `on_auth_user_created` foi criada com sucesso
- Execute: `SELECT * FROM pg_triggers WHERE tgname = 'on_auth_user_created';`
- Se não existir, re-execute o SQL do Passo 7

### Erro ao executar o SQL de usuários

- Certifique-se de executar `CREATE EXTENSION IF NOT EXISTS pgcrypto;` antes dos inserts
- O `crypt()` e `gen_salt()` dependem desta extensão

### Personagens não aparecem na biblioteca

- Verifique se o `user_id` do personagem corresponde ao ID do usuário logado
- Admins veem todos; usuários normais só veem os próprios
- Confirme se o RLS está habilitado e as políticas estão criadas

### Como resetar o banco completamente

```sql
-- ATENÇÃO: Remove TODOS os dados
DELETE FROM public.ability_reviews;
DELETE FROM public.characters;
DELETE FROM public.profiles;
DELETE FROM auth.users WHERE email LIKE '%@olympo.local';
```

Depois re-execute o SQL do Anexo A e do Anexo B.

---

## Checklist de Configuração

- [ ] Projeto criado no Supabase
- [ ] Chaves de API anotadas (anon + service_role)
- [ ] Schema executado (3 tabelas criadas)
- [ ] Índices criados
- [ ] RLS habilitado nas 3 tabelas
- [ ] Políticas RLS criadas (9 políticas)
- [ ] Trigger `handle_new_user` criada
- [ ] Trigger `update_updated_at` criada
- [ ] Extensão `pgcrypto` habilitada
- [ ] Usuários iniciais inseridos
- [ ] `src/lib/supabase.js` atualizado com as chaves corretas
- [ ] `npm install` executado com sucesso
- [ ] Aplicação roda sem erros (`npm run dev`)
- [ ] Login funciona com as credenciais de teste
- [ ] Admin consegue acessar o painel administrativo
