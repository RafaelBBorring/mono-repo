insert into public.plans (id, name, entitlements, active)
values (
  'vip',
  'VIP · Desenvolvimento',
  '{"projects":100,"miro_boards":100,"members":25,"storage_bytes":53687091200,"indexed_tokens":50000000,"visual_analyses_month":50000,"messages_month":50000,"sync_mode":"scheduled","connectors":["miro","notion","obsidian","upload","paste","chat"],"development_access":true}'::jsonb,
  true
)
on conflict (id) do update
set name = excluded.name,
    entitlements = excluded.entitlements,
    active = excluded.active;
