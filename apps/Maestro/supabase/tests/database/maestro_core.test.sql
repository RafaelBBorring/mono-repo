begin;

select plan(17);

select has_table('public', 'projects', 'projects existe');
select has_table('public', 'evidence', 'evidence existe');
select has_column('public', 'evidence', 'active', 'evidence possui estado ativo');
select has_column('public', 'evidence', 'superseded_at', 'evidence preserva aposentadoria');
select has_column('public', 'message_citations', 'evidence_snapshot', 'citacao preserva snapshot');
select has_table('public', 'narrative_events', 'eventos narrativos estruturados existem');
select has_table('public', 'narrative_event_evidence', 'eventos preservam proveniencia');
select ok((select relrowsecurity from pg_class where oid = 'public.projects'::regclass), 'RLS habilitada em projects');
select ok((select relrowsecurity from pg_class where oid = 'public.narrative_events'::regclass), 'RLS habilitada em eventos narrativos');
select ok(not exists (select 1 from pg_policies where schemaname = 'public' and policyname like '%member_all'), 'nao existem politicas amplas member_all');
select ok(exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'claim_next_ingestion_chunk'), 'claim atomico existe');
select ok(exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'reserve_monthly_quota'), 'reserva atomica de cota existe');
select ok(exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'insert_manual_text_source'), 'ingestao manual transacional existe');
select ok(exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'workspace_usage_snapshot'), 'snapshot seguro de uso existe');
select ok(exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'reconcile_narrative_events'), 'eventos obsoletos sao reconciliados');
select has_trigger('public', 'knowledge_chunks', 'enforce_knowledge_chunk_quota', 'limite de memoria cobre toda ingestao');
select is((select (entitlements->>'projects')::integer from public.plans where id = 'free'), 1, 'plano free limita um projeto');

select * from finish();
rollback;
