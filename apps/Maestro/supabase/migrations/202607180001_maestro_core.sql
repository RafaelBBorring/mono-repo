create extension if not exists pgcrypto with schema extensions;
create extension if not exists vector with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Criador',
  avatar_url text,
  locale text not null default 'pt-BR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plans (
  id text primary key,
  name text not null,
  entitlements jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.plans (id, name, entitlements) values
  ('free', 'Free', '{"projects":1,"miro_boards":3,"members":1,"storage_bytes":104857600,"indexed_tokens":100000,"visual_analyses_month":300,"messages_month":100,"sync_mode":"manual","connectors":["miro","upload","paste"]}'),
  ('creator', 'Creator', '{"projects":10,"miro_boards":10,"members":3,"storage_bytes":5368709120,"indexed_tokens":2000000,"visual_analyses_month":2000,"messages_month":2000,"sync_mode":"scheduled","connectors":["miro","notion","obsidian","upload","paste"]}'),
  ('studio', 'Studio', '{"projects":100,"miro_boards":100,"members":10,"storage_bytes":26843545600,"indexed_tokens":10000000,"visual_analyses_month":10000,"messages_month":10000,"sync_mode":"scheduled","connectors":["miro","notion","obsidian","upload","paste","chat"]}')
on conflict (id) do update set name = excluded.name, entitlements = excluded.entitlements;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  plan_id text not null default 'free' references public.plans(id),
  subscription_status text not null default 'active' check (subscription_status in ('active', 'trialing', 'past_due', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'editor', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  kind text not null default 'rpg',
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  settings jsonb not null default '{"answer_mode":"canon","language":"pt-BR"}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('miro', 'notion', 'obsidian')),
  remote_account_id text,
  remote_team_id text,
  display_name text,
  scopes text[] not null default '{}',
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  refresh_locked_at timestamptz,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked', 'error')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (workspace_id, user_id, provider, remote_team_id)
);

create table public.project_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  connection_id uuid references public.provider_connections(id) on delete set null,
  provider text not null check (provider in ('miro', 'notion', 'obsidian', 'upload', 'paste', 'chat')),
  remote_id text,
  name text not null,
  source_url text,
  source_type text not null default 'board',
  sync_status text not null default 'queued' check (sync_status in ('queued', 'syncing', 'ready', 'partial', 'attention', 'error', 'paused')),
  coverage jsonb not null default '{}'::jsonb,
  item_count integer not null default 0,
  last_remote_update timestamptz,
  last_synced_at timestamptz,
  sync_cursor text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (project_id, provider, remote_id)
);

create table public.source_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid not null references public.project_sources(id) on delete cascade,
  remote_id text not null,
  remote_type text not null,
  parent_remote_id text,
  title text,
  content_hash text,
  remote_created_at timestamptz,
  remote_modified_at timestamptz,
  last_seen_job_id uuid,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, remote_id)
);

create table public.item_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_item_id uuid not null references public.source_items(id) on delete cascade,
  version_hash text not null,
  title text,
  plain_text text,
  mime_type text,
  asset_path text,
  position jsonb,
  geometry jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_item_id, version_hash)
);

create table public.spatial_regions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid not null references public.project_sources(id) on delete cascade,
  external_frame_id text,
  region_key text not null,
  bounds jsonb not null,
  item_ids uuid[] not null default '{}',
  overlap_item_ids uuid[] not null default '{}',
  composite_asset_path text,
  density numeric(10,4),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (source_id, region_key)
);

create table public.ingestion_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid not null references public.project_sources(id) on delete cascade,
  requested_by uuid not null references auth.users(id),
  idempotency_key text not null,
  status text not null default 'queued' check (status in ('queued', 'inventory', 'processing', 'reconciling', 'complete', 'partial', 'paused', 'failed', 'canceled')),
  stage text not null default 'inventory',
  progress numeric(5,2) not null default 0 check (progress >= 0 and progress <= 100),
  remote_cursor text,
  totals jsonb not null default '{}'::jsonb,
  coverage jsonb not null default '{}'::jsonb,
  error jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, idempotency_key)
);

create table public.ingestion_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  job_id uuid not null references public.ingestion_jobs(id) on delete cascade,
  region_id uuid references public.spatial_regions(id) on delete cascade,
  chunk_type text not null check (chunk_type in ('text', 'image', 'region', 'reconcile', 'summary')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'complete', 'failed', 'skipped')),
  priority smallint not null default 100,
  attempts smallint not null default 0,
  payload jsonb not null default '{}'::jsonb,
  output jsonb,
  error jsonb,
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid references public.project_sources(id) on delete cascade,
  source_item_id uuid references public.source_items(id) on delete cascade,
  item_version_id uuid references public.item_versions(id) on delete cascade,
  region_id uuid references public.spatial_regions(id) on delete set null,
  evidence_type text not null check (evidence_type in ('text', 'metadata', 'visual', 'spatial', 'user_assertion')),
  excerpt text,
  asset_path text,
  source_url text,
  locator jsonb not null default '{}'::jsonb,
  model_run jsonb,
  active boolean not null default true,
  superseded_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.entities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  category text not null,
  summary text,
  confidence numeric(5,4) not null default 0 check (confidence >= 0 and confidence <= 1),
  editorial_state text not null default 'proposed' check (editorial_state in ('proposed', 'accepted', 'rejected', 'superseded')),
  attributes jsonb not null default '{}'::jsonb,
  created_by text not null default 'model' check (created_by in ('model', 'user', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index entities_project_normalized_category_idx on public.entities(project_id, normalized_name, category) where editorial_state <> 'superseded';

create table public.entity_aliases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  entity_id uuid not null references public.entities(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  confidence numeric(5,4) not null default 1,
  editorial_state text not null default 'proposed' check (editorial_state in ('proposed', 'accepted', 'rejected', 'superseded')),
  created_at timestamptz not null default now(),
  unique (entity_id, normalized_alias)
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  subject_entity_id uuid references public.entities(id) on delete cascade,
  predicate text not null,
  object_entity_id uuid references public.entities(id) on delete set null,
  object_value jsonb,
  epistemic_class text not null check (epistemic_class in ('explicit_text', 'explicit_metadata', 'visual_observation', 'spatial_inference', 'model_inference', 'user_assertion', 'conflicted')),
  editorial_state text not null default 'proposed' check (editorial_state in ('proposed', 'accepted', 'rejected', 'superseded')),
  confidence numeric(5,4) not null default 0 check (confidence >= 0 and confidence <= 1),
  valid_from timestamptz,
  valid_to timestamptz,
  supersedes_claim_id uuid references public.claims(id) on delete set null,
  model_run jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (object_entity_id is not null or object_value is not null)
);

create table public.claim_evidence (
  claim_id uuid not null references public.claims(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  stance text not null default 'supports' check (stance in ('supports', 'contradicts', 'context')),
  relevance numeric(5,4) not null default 1,
  primary key (claim_id, evidence_id)
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid references public.project_sources(id) on delete cascade,
  evidence_id uuid references public.evidence(id) on delete cascade,
  parent_chunk_id uuid references public.knowledge_chunks(id) on delete set null,
  chunk_type text not null check (chunk_type in ('item', 'region', 'frame', 'board', 'project', 'user_context')),
  content text not null,
  token_count integer not null default 0,
  epistemic_classes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  search_vector tsvector generated always as (to_tsvector('portuguese', coalesce(content, ''))) stored,
  embedding extensions.vector(768),
  embedding_model text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.narrative_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  origin_source_id uuid references public.project_sources(id) on delete set null,
  stable_key text not null,
  event_type text not null default 'episode' check (event_type in ('episode', 'campaign_event', 'historical_event')),
  campaign text,
  label text,
  sequence_number integer,
  title text not null,
  event_date date,
  summary text,
  status text not null default 'proposed' check (status in ('documented', 'needs_context', 'proposed')),
  confidence numeric(5,4) not null default 0 check (confidence >= 0 and confidence <= 1),
  epistemic_class text not null check (epistemic_class in ('explicit_text', 'explicit_metadata', 'visual_observation', 'spatial_inference', 'model_inference', 'user_assertion', 'conflicted')),
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, stable_key)
);

create table public.narrative_event_evidence (
  event_id uuid not null references public.narrative_events(id) on delete cascade,
  evidence_id uuid not null references public.evidence(id) on delete cascade,
  primary key (event_id, evidence_id)
);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  claim_id uuid references public.claims(id) on delete cascade,
  review_type text not null check (review_type in ('narrative_gap', 'conflict', 'identity', 'merge', 'category', 'canonical_change')),
  risk text not null check (risk in ('low', 'medium', 'high')),
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'superseded')),
  confidence numeric(5,4),
  proposal jsonb not null default '{}'::jsonb,
  resolution_note text,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  title text,
  mode text not null default 'canon' check (mode in ('canon', 'investigate', 'create')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  answer_state text check (answer_state in ('grounded', 'mixed', 'unknown', 'creative')),
  model_run jsonb,
  created_at timestamptz not null default now()
);

create table public.message_citations (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  evidence_id uuid references public.evidence(id) on delete set null,
  claim_id uuid references public.claims(id) on delete set null,
  citation_order smallint not null default 0,
  evidence_snapshot jsonb not null default '{}'::jsonb,
  unique nulls not distinct (message_id, evidence_id)
);

create table public.ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  provider text not null,
  model text not null,
  endpoint_url text,
  power_profile text not null default 'medium' check (power_profile in ('low', 'medium', 'max')),
  api_key_ciphertext text,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (workspace_id, project_id, provider)
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  metric text not null,
  quantity bigint not null check (quantity >= 0),
  idempotency_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, metric, idempotency_key)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index workspace_members_user_idx on public.workspace_members(user_id);
create index projects_workspace_idx on public.projects(workspace_id);
create index project_sources_project_idx on public.project_sources(project_id);
create index source_items_source_idx on public.source_items(source_id, active);
create index source_items_modified_idx on public.source_items(source_id, remote_modified_at desc);
create index item_versions_item_idx on public.item_versions(source_item_id, created_at desc);
create index ingestion_jobs_status_idx on public.ingestion_jobs(status, created_at);
create index ingestion_chunks_queue_idx on public.ingestion_chunks(status, priority, created_at);
create index entities_project_idx on public.entities(project_id, category, editorial_state);
create index entity_aliases_search_idx on public.entity_aliases(project_id, normalized_alias);
create index claims_subject_idx on public.claims(project_id, subject_entity_id, editorial_state);
create index claims_object_idx on public.claims(project_id, object_entity_id, editorial_state);
create index evidence_project_idx on public.evidence(project_id, active, evidence_type);
create index knowledge_chunks_search_idx on public.knowledge_chunks using gin(search_vector);
create index narrative_events_project_idx on public.narrative_events(project_id, active, event_date desc, sequence_number desc);
create index narrative_event_evidence_evidence_idx on public.narrative_event_evidence(evidence_id);
create index review_items_pending_idx on public.review_items(project_id, status, created_at desc);
create index messages_conversation_idx on public.messages(conversation_id, created_at);
create index usage_events_period_idx on public.usage_events(workspace_id, metric, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger provider_connections_updated_at before update on public.provider_connections for each row execute function public.set_updated_at();
create trigger project_sources_updated_at before update on public.project_sources for each row execute function public.set_updated_at();
create trigger source_items_updated_at before update on public.source_items for each row execute function public.set_updated_at();
create trigger ingestion_jobs_updated_at before update on public.ingestion_jobs for each row execute function public.set_updated_at();
create trigger ingestion_chunks_updated_at before update on public.ingestion_chunks for each row execute function public.set_updated_at();
create trigger entities_updated_at before update on public.entities for each row execute function public.set_updated_at();
create trigger claims_updated_at before update on public.claims for each row execute function public.set_updated_at();
create trigger knowledge_chunks_updated_at before update on public.knowledge_chunks for each row execute function public.set_updated_at();
create trigger narrative_events_updated_at before update on public.narrative_events for each row execute function public.set_updated_at();
create trigger review_items_updated_at before update on public.review_items for each row execute function public.set_updated_at();
create trigger conversations_updated_at before update on public.conversations for each row execute function public.set_updated_at();
create trigger ai_provider_configs_updated_at before update on public.ai_provider_configs for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid() and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_workspace_editor(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id and user_id = auth.uid() and role in ('owner', 'admin', 'editor')
  );
$$;

create or replace function public.protect_workspace_commercial_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' and (
    new.owner_user_id is distinct from old.owner_user_id or
    new.plan_id is distinct from old.plan_id or
    new.subscription_status is distinct from old.subscription_status
  ) then
    raise exception 'Campos comerciais só podem ser alterados pelo serviço.';
  end if;
  return new;
end;
$$;

create trigger workspaces_protect_commercial_fields
before update on public.workspaces
for each row execute function public.protect_workspace_commercial_fields();

create or replace function public.enforce_project_plan_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  project_limit integer;
  current_projects integer;
begin
  select coalesce((p.entitlements->>'projects')::integer, 0) into project_limit
  from public.workspaces w join public.plans p on p.id = w.plan_id
  where w.id = new.workspace_id;
  select count(*) into current_projects from public.projects where workspace_id = new.workspace_id;
  if project_limit <= 0 or current_projects >= project_limit then
    raise exception 'O limite de projetos deste plano foi atingido.';
  end if;
  return new;
end;
$$;

create trigger projects_enforce_plan_limit
before insert on public.projects
for each row execute function public.enforce_project_plan_limit();

create or replace function public.claim_next_ingestion_chunk(target_job_id uuid, worker_id text)
returns setof public.ingestion_chunks
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed public.ingestion_chunks;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operação restrita ao serviço.';
  end if;
  update public.ingestion_chunks
  set status = case when attempts >= 3 then 'failed' else 'queued' end,
      error = case when attempts >= 3 then jsonb_build_object('message', 'Lease expirou após três tentativas.') else error end,
      locked_at = null,
      locked_by = null,
      completed_at = case when attempts >= 3 then now() else null end
  where job_id = target_job_id
    and status = 'processing'
    and locked_at < now() - interval '10 minutes';
  select * into claimed
  from public.ingestion_chunks
  where job_id = target_job_id and status = 'queued'
  order by priority, created_at
  for update skip locked
  limit 1;
  if not found then
    return;
  end if;
  update public.ingestion_chunks
  set status = 'processing', attempts = attempts + 1, locked_at = now(), locked_by = worker_id
  where id = claimed.id
  returning * into claimed;
  return next claimed;
end;
$$;

revoke all on function public.claim_next_ingestion_chunk(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_next_ingestion_chunk(uuid, text) to service_role;

create or replace function public.reserve_monthly_quota(
  target_workspace_id uuid,
  target_project_id uuid,
  target_user_id uuid,
  target_metric text,
  entitlement_key text,
  requested_quantity bigint,
  request_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  quota_limit bigint;
  used_quantity bigint;
  existing_quantity bigint;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operação restrita ao serviço.';
  end if;
  if requested_quantity <= 0 then
    raise exception 'Quantidade de cota inválida.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_workspace_id::text || ':' || target_metric || ':' || date_trunc('month', now())::text, 0));
  select quantity into existing_quantity
  from public.usage_events
  where workspace_id = target_workspace_id and metric = target_metric and idempotency_key = request_key;
  if found then
    return jsonb_build_object('reserved', existing_quantity, 'alreadyReserved', true);
  end if;
  select coalesce((p.entitlements->>entitlement_key)::bigint, 0) into quota_limit
  from public.workspaces w
  join public.plans p on p.id = w.plan_id
  where w.id = target_workspace_id;
  if coalesce(quota_limit, 0) <= 0 then
    raise exception 'Este recurso não está disponível no plano.';
  end if;
  select coalesce(sum(quantity), 0) into used_quantity
  from public.usage_events
  where workspace_id = target_workspace_id
    and metric = target_metric
    and created_at >= date_trunc('month', now());
  if used_quantity + requested_quantity > quota_limit then
    raise exception 'O limite mensal de % foi atingido.', target_metric;
  end if;
  insert into public.usage_events (workspace_id, project_id, user_id, metric, quantity, idempotency_key, metadata)
  values (target_workspace_id, target_project_id, target_user_id, target_metric, requested_quantity, request_key, jsonb_build_object('reservedAt', now()));
  return jsonb_build_object('reserved', requested_quantity, 'used', used_quantity + requested_quantity, 'limit', quota_limit, 'alreadyReserved', false);
end;
$$;

revoke all on function public.reserve_monthly_quota(uuid, uuid, uuid, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.reserve_monthly_quota(uuid, uuid, uuid, text, text, bigint, text) to service_role;

create or replace function public.enforce_knowledge_chunk_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  indexed_limit bigint;
  indexed_usage bigint;
  evidence_is_active boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.workspace_id::text || ':indexed_tokens', 0));
  select coalesce((p.entitlements->>'indexed_tokens')::bigint, 0)
  into indexed_limit
  from public.workspaces w join public.plans p on p.id = w.plan_id
  where w.id = new.workspace_id;
  if indexed_limit <= 0 then
    raise exception 'A memória indexada não está disponível neste plano.';
  end if;
  if new.evidence_id is not null then
    select active into evidence_is_active from public.evidence where id = new.evidence_id;
    if not coalesce(evidence_is_active, false) then
      return new;
    end if;
  end if;
  select coalesce(sum(k.token_count), 0) into indexed_usage
  from public.knowledge_chunks k
  left join public.evidence e on e.id = k.evidence_id
  where k.workspace_id = new.workspace_id and (k.evidence_id is null or e.active);
  if indexed_usage + greatest(coalesce(new.token_count, 0), 0) > indexed_limit then
    raise exception 'A capacidade de memória indexada deste plano foi atingida.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_knowledge_chunk_quota on public.knowledge_chunks;
create trigger enforce_knowledge_chunk_quota before insert on public.knowledge_chunks for each row execute function public.enforce_knowledge_chunk_quota();
revoke all on function public.enforce_knowledge_chunk_quota() from public, anon, authenticated;

create or replace function public.insert_manual_text_source(
  target_workspace_id uuid,
  target_project_id uuid,
  target_user_id uuid,
  provider_kind text,
  source_name text,
  source_content text,
  source_mime_type text,
  source_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_source_id uuid;
  new_item_id uuid;
  new_version_id uuid;
  new_evidence_id uuid;
  remote_key text := 'manual-' || gen_random_uuid()::text;
  offset_start integer := 1;
  part_content text;
  requested_tokens bigint := ceil(char_length(source_content) / 4.0);
  indexed_limit bigint;
  indexed_usage bigint;
  allowed_connectors jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operação restrita ao serviço.';
  end if;
  if provider_kind not in ('paste', 'upload') then
    raise exception 'Tipo de fonte manual inválido.';
  end if;
  if char_length(source_content) < 1 or char_length(source_content) > 400000 then
    raise exception 'O texto deve ter entre 1 e 400 mil caracteres.';
  end if;
  if not exists (select 1 from public.projects where id = target_project_id and workspace_id = target_workspace_id) then
    raise exception 'Projeto não encontrado.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(target_workspace_id::text || ':indexed_tokens', 0));
  select p.entitlements->'connectors', coalesce((p.entitlements->>'indexed_tokens')::bigint, 0)
  into allowed_connectors, indexed_limit
  from public.workspaces w join public.plans p on p.id = w.plan_id
  where w.id = target_workspace_id;
  if not allowed_connectors ? provider_kind then
    raise exception 'Esta fonte não está disponível no plano.';
  end if;
  select coalesce(sum(k.token_count), 0) into indexed_usage
  from public.knowledge_chunks k
  left join public.evidence e on e.id = k.evidence_id
  where k.workspace_id = target_workspace_id and (k.evidence_id is null or e.active);
  if indexed_usage + requested_tokens > indexed_limit then
    raise exception 'A capacidade de memória indexada deste plano foi atingida.';
  end if;
  insert into public.project_sources (workspace_id, project_id, provider, remote_id, name, source_type, sync_status, coverage, item_count, last_synced_at, metadata)
  values (target_workspace_id, target_project_id, provider_kind, remote_key, left(source_name, 240), 'document', 'ready', jsonb_build_object('percentage', 100, 'textItems', 1, 'analyzedChunks', ceil(char_length(source_content) / 9500.0), 'totalChunks', ceil(char_length(source_content) / 9500.0)), 1, now(), jsonb_build_object('mimeType', source_mime_type, 'manual', true))
  returning id into new_source_id;
  insert into public.source_items (workspace_id, project_id, source_id, remote_id, remote_type, title, content_hash, active, metadata)
  values (target_workspace_id, target_project_id, new_source_id, 'document', 'document', left(source_name, 500), source_hash, true, jsonb_build_object('textLength', char_length(source_content), 'mimeType', source_mime_type, 'manual', true))
  returning id into new_item_id;
  insert into public.item_versions (workspace_id, project_id, source_item_id, version_hash, title, plain_text, mime_type, raw_payload)
  values (target_workspace_id, target_project_id, new_item_id, source_hash, left(source_name, 500), source_content, source_mime_type, jsonb_build_object('manual', true))
  returning id into new_version_id;
  while offset_start <= char_length(source_content) loop
    part_content := substring(source_content from offset_start for 10000);
    insert into public.evidence (workspace_id, project_id, source_id, source_item_id, item_version_id, evidence_type, excerpt, locator)
    values (target_workspace_id, target_project_id, new_source_id, new_item_id, new_version_id, 'text', left(part_content, 1200), jsonb_build_object('textSpan', jsonb_build_object('start', offset_start - 1, 'end', offset_start - 1 + char_length(part_content)), 'manual', true))
    returning id into new_evidence_id;
    insert into public.knowledge_chunks (workspace_id, project_id, source_id, evidence_id, chunk_type, content, token_count, epistemic_classes, metadata)
    values (target_workspace_id, target_project_id, new_source_id, new_evidence_id, 'item', part_content, ceil(char_length(part_content) / 4.0), array['explicit_text'], jsonb_build_object('manual', true, 'title', source_name));
    offset_start := offset_start + 9500;
  end loop;
  insert into public.audit_log (workspace_id, project_id, actor_user_id, action, target_type, target_id, after_data)
  values (target_workspace_id, target_project_id, target_user_id, 'manual_source.created', 'project_source', new_source_id::text, jsonb_build_object('provider', provider_kind, 'name', source_name, 'characters', char_length(source_content)));
  return new_source_id;
end;
$$;

revoke all on function public.insert_manual_text_source(uuid, uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.insert_manual_text_source(uuid, uuid, uuid, text, text, text, text, text) to service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  inferred_name text;
begin
  inferred_name := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, 'Criador'), '@', 1));
  insert into public.profiles (id, display_name) values (new.id, inferred_name) on conflict (id) do nothing;
  insert into public.workspaces (name, owner_user_id) values ('Workspace de ' || inferred_name, new.id) returning id into new_workspace_id;
  insert into public.workspace_members (workspace_id, user_id, role) values (new_workspace_id, new.id, 'owner');
  insert into public.projects (workspace_id, name, kind, description, created_by) values (new_workspace_id, 'Meu primeiro universo', 'rpg', 'Seu universo criativo no Maestro.', new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.search_project_knowledge(query_project_id uuid, query_text text, result_limit integer default 12)
returns table (
  chunk_id uuid,
  content text,
  rank real,
  evidence_id uuid,
  epistemic_classes text[],
  metadata jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    kc.id,
    kc.content,
    ts_rank_cd(kc.search_vector, websearch_to_tsquery('portuguese', query_text))::real,
    kc.evidence_id,
    kc.epistemic_classes,
    kc.metadata
  from public.knowledge_chunks kc
  left join public.evidence ev on ev.id = kc.evidence_id
  where kc.project_id = query_project_id
    and public.is_workspace_member(kc.workspace_id)
    and (kc.evidence_id is null or ev.active)
    and kc.search_vector @@ websearch_to_tsquery('portuguese', query_text)
  order by ts_rank_cd(kc.search_vector, websearch_to_tsquery('portuguese', query_text)) desc
  limit greatest(1, least(result_limit, 50));
$$;

create or replace function public.workspace_usage_snapshot(target_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  plan_name text;
  entitlements jsonb;
  project_count bigint;
  indexed_tokens bigint;
  visual_usage bigint;
  message_usage bigint;
begin
  if not public.is_workspace_member(target_workspace_id) then
    raise exception 'Workspace não encontrado ou sem permissão.';
  end if;
  select p.name, p.entitlements into plan_name, entitlements
  from public.workspaces w join public.plans p on p.id = w.plan_id
  where w.id = target_workspace_id;
  select count(*) into project_count from public.projects where workspace_id = target_workspace_id;
  select coalesce(sum(k.token_count), 0) into indexed_tokens
  from public.knowledge_chunks k
  left join public.evidence e on e.id = k.evidence_id
  where k.workspace_id = target_workspace_id and (k.evidence_id is null or e.active);
  select coalesce(sum(quantity), 0) into visual_usage
  from public.usage_events
  where workspace_id = target_workspace_id and metric = 'visual_analyses' and created_at >= date_trunc('month', now());
  select coalesce(sum(quantity), 0) into message_usage
  from public.usage_events
  where workspace_id = target_workspace_id and metric = 'chat_messages' and created_at >= date_trunc('month', now());
  return jsonb_build_object(
    'plan', plan_name,
    'entitlements', entitlements,
    'projects', project_count,
    'indexedTokens', indexed_tokens,
    'visualAnalyses', visual_usage,
    'messages', message_usage
  );
end;
$$;

revoke all on function public.workspace_usage_snapshot(uuid) from public, anon;
grant execute on function public.workspace_usage_snapshot(uuid) to authenticated;

create or replace function public.reconcile_narrative_events(target_source_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  reconciled_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Operação restrita ao serviço.';
  end if;
  update public.narrative_events ne
  set active = exists (
    select 1
    from public.narrative_event_evidence nee
    join public.evidence current_evidence on current_evidence.id = nee.evidence_id
    where nee.event_id = ne.id and current_evidence.active
  )
  where exists (
    select 1
    from public.narrative_event_evidence source_link
    join public.evidence source_evidence on source_evidence.id = source_link.evidence_id
    where source_link.event_id = ne.id and source_evidence.source_id = target_source_id
  );
  get diagnostics reconciled_count = row_count;
  return reconciled_count;
end;
$$;

revoke all on function public.reconcile_narrative_events(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_narrative_events(uuid) to service_role;

create or replace function public.merge_miro_sdk_capture(target_workspace_id uuid, target_project_id uuid, target_source_id uuid, captured_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  captured jsonb;
  merged_count integer := 0;
begin
  if not public.is_workspace_editor(target_workspace_id) and auth.role() <> 'service_role' then
    raise exception 'Sem permissão para esta fonte';
  end if;
  if not exists (select 1 from public.project_sources where id = target_source_id and project_id = target_project_id and workspace_id = target_workspace_id and provider = 'miro') then
    raise exception 'Fonte do Miro não encontrada';
  end if;
  for captured in select value from jsonb_array_elements(captured_items)
  loop
    insert into public.source_items (
      workspace_id,
      project_id,
      source_id,
      remote_id,
      remote_type,
      parent_remote_id,
      title,
      active,
      metadata
    ) values (
      target_workspace_id,
      target_project_id,
      target_source_id,
      captured->>'id',
      coalesce(captured->>'type', 'unsupported'),
      nullif(captured->>'parentId', ''),
      nullif(captured->>'title', ''),
      true,
      jsonb_build_object(
        'position', jsonb_build_object('x', captured->'x', 'y', captured->'y', 'relativeTo', captured->'relativeTo'),
        'geometry', jsonb_build_object('width', captured->'width', 'height', captured->'height', 'rotation', captured->'rotation'),
        'sdkCapture', true,
        'filename', captured->'filename'
      )
    )
    on conflict (source_id, remote_id) do update set
      remote_type = excluded.remote_type,
      parent_remote_id = coalesce(excluded.parent_remote_id, public.source_items.parent_remote_id),
      title = coalesce(excluded.title, public.source_items.title),
      content_hash = null,
      active = true,
      metadata = public.source_items.metadata || excluded.metadata,
      updated_at = now();
    merged_count := merged_count + 1;
  end loop;
  return merged_count;
end;
$$;

revoke all on function public.merge_miro_sdk_capture(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.merge_miro_sdk_capture(uuid, uuid, uuid, jsonb) to service_role;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects enable row level security;
alter table public.oauth_states enable row level security;
alter table public.provider_connections enable row level security;
alter table public.project_sources enable row level security;
alter table public.source_items enable row level security;
alter table public.item_versions enable row level security;
alter table public.spatial_regions enable row level security;
alter table public.ingestion_jobs enable row level security;
alter table public.ingestion_chunks enable row level security;
alter table public.evidence enable row level security;
alter table public.entities enable row level security;
alter table public.entity_aliases enable row level security;
alter table public.claims enable row level security;
alter table public.claim_evidence enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.narrative_events enable row level security;
alter table public.narrative_event_evidence enable row level security;
alter table public.review_items enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_citations enable row level security;
alter table public.ai_provider_configs enable row level security;
alter table public.usage_events enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_self_select on public.profiles for select using (id = auth.uid());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy plans_authenticated_select on public.plans for select to authenticated using (active);
create policy workspaces_member_select on public.workspaces for select using (public.is_workspace_member(id));
create policy workspaces_owner_update on public.workspaces for update using (public.is_workspace_admin(id));
create policy workspace_members_member_select on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy workspace_members_admin_insert on public.workspace_members for insert with check (public.is_workspace_admin(workspace_id) and role in ('admin', 'editor', 'viewer'));
create policy workspace_members_admin_update on public.workspace_members for update using (public.is_workspace_admin(workspace_id) and role <> 'owner') with check (public.is_workspace_admin(workspace_id) and role <> 'owner');
create policy workspace_members_admin_delete on public.workspace_members for delete using (public.is_workspace_admin(workspace_id) and role <> 'owner' and user_id <> auth.uid());

create policy projects_member_select on public.projects for select using (public.is_workspace_member(workspace_id));
create policy projects_editor_insert on public.projects for insert with check (public.is_workspace_editor(workspace_id) and created_by = auth.uid());
create policy projects_editor_update on public.projects for update using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy projects_admin_delete on public.projects for delete using (public.is_workspace_admin(workspace_id));
create policy provider_connections_admin_delete on public.provider_connections for delete using (public.is_workspace_admin(workspace_id));
create policy project_sources_member_select on public.project_sources for select using (public.is_workspace_member(workspace_id));
create policy project_sources_editor_write on public.project_sources for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy source_items_member_select on public.source_items for select using (public.is_workspace_member(workspace_id));
create policy source_items_editor_write on public.source_items for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy item_versions_member_select on public.item_versions for select using (public.is_workspace_member(workspace_id));
create policy item_versions_editor_write on public.item_versions for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy spatial_regions_member_select on public.spatial_regions for select using (public.is_workspace_member(workspace_id));
create policy spatial_regions_editor_write on public.spatial_regions for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy ingestion_jobs_member_select on public.ingestion_jobs for select using (public.is_workspace_member(workspace_id));
create policy ingestion_jobs_editor_write on public.ingestion_jobs for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy ingestion_chunks_member_select on public.ingestion_chunks for select using (public.is_workspace_member(workspace_id));
create policy ingestion_chunks_editor_write on public.ingestion_chunks for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy evidence_member_select on public.evidence for select using (public.is_workspace_member(workspace_id));
create policy evidence_editor_write on public.evidence for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy entities_member_select on public.entities for select using (public.is_workspace_member(workspace_id));
create policy entities_editor_write on public.entities for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy entity_aliases_member_select on public.entity_aliases for select using (public.is_workspace_member(workspace_id));
create policy entity_aliases_editor_write on public.entity_aliases for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy claims_member_select on public.claims for select using (public.is_workspace_member(workspace_id));
create policy claims_editor_write on public.claims for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy claim_evidence_member_select on public.claim_evidence for select using (exists (select 1 from public.claims c where c.id = claim_id and public.is_workspace_member(c.workspace_id)));
create policy claim_evidence_editor_write on public.claim_evidence for all using (exists (select 1 from public.claims c where c.id = claim_id and public.is_workspace_editor(c.workspace_id))) with check (exists (select 1 from public.claims c where c.id = claim_id and public.is_workspace_editor(c.workspace_id)));
create policy knowledge_chunks_member_select on public.knowledge_chunks for select using (public.is_workspace_member(workspace_id));
create policy knowledge_chunks_editor_write on public.knowledge_chunks for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy narrative_events_member_select on public.narrative_events for select using (public.is_workspace_member(workspace_id));
create policy narrative_events_editor_write on public.narrative_events for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy narrative_event_evidence_member_select on public.narrative_event_evidence for select using (exists (select 1 from public.narrative_events e where e.id = event_id and public.is_workspace_member(e.workspace_id)));
create policy narrative_event_evidence_editor_write on public.narrative_event_evidence for all using (exists (select 1 from public.narrative_events e where e.id = event_id and public.is_workspace_editor(e.workspace_id))) with check (exists (select 1 from public.narrative_events e where e.id = event_id and public.is_workspace_editor(e.workspace_id)));
create policy review_items_member_select on public.review_items for select using (public.is_workspace_member(workspace_id));
create policy review_items_editor_write on public.review_items for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy conversations_member_select on public.conversations for select using (public.is_workspace_member(workspace_id));
create policy conversations_editor_write on public.conversations for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy messages_member_select on public.messages for select using (public.is_workspace_member(workspace_id));
create policy messages_editor_write on public.messages for all using (public.is_workspace_editor(workspace_id)) with check (public.is_workspace_editor(workspace_id));
create policy message_citations_member_select on public.message_citations for select using (exists (select 1 from public.messages m where m.id = message_id and public.is_workspace_member(m.workspace_id)));
create policy ai_provider_configs_admin_delete on public.ai_provider_configs for delete using (public.is_workspace_admin(workspace_id));
create policy usage_events_member_select on public.usage_events for select using (public.is_workspace_member(workspace_id));
create policy audit_log_member_select on public.audit_log for select using (public.is_workspace_member(workspace_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('maestro-assets', 'maestro-assets', false, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/markdown'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy maestro_assets_member_select on storage.objects for select using (
  bucket_id = 'maestro-assets' and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

create policy maestro_assets_member_insert on storage.objects for insert with check (
  bucket_id = 'maestro-assets' and public.is_workspace_editor(((storage.foldername(name))[1])::uuid)
);

create policy maestro_assets_member_update on storage.objects for update using (
  bucket_id = 'maestro-assets' and public.is_workspace_editor(((storage.foldername(name))[1])::uuid)
);

create policy maestro_assets_member_delete on storage.objects for delete using (
  bucket_id = 'maestro-assets' and public.is_workspace_admin(((storage.foldername(name))[1])::uuid)
);
