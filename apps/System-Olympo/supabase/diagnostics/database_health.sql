select 'connection_states' as section, state, count(*) as total
from pg_stat_activity
where datname = current_database()
group by state
order by total desc;

select
  'long_running_queries' as section,
  pid,
  usename,
  application_name,
  state,
  wait_event_type,
  wait_event,
  now() - query_start as duration,
  left(regexp_replace(query, '\s+', ' ', 'g'), 220) as query
from pg_stat_activity
where datname = current_database()
  and pid <> pg_backend_pid()
order by duration desc nulls last
limit 20;

select
  'blocking_locks' as section,
  blocked_activity.pid as blocked_pid,
  blocking_activity.pid as blocking_pid,
  now() - blocked_activity.query_start as blocked_duration,
  left(regexp_replace(blocked_activity.query, '\s+', ' ', 'g'), 180) as blocked_query,
  left(regexp_replace(blocking_activity.query, '\s+', ' ', 'g'), 180) as blocking_query
from pg_catalog.pg_locks blocked_locks
join pg_catalog.pg_stat_activity blocked_activity on blocked_activity.pid = blocked_locks.pid
join pg_catalog.pg_locks blocking_locks
  on blocking_locks.locktype = blocked_locks.locktype
  and blocking_locks.database is not distinct from blocked_locks.database
  and blocking_locks.relation is not distinct from blocked_locks.relation
  and blocking_locks.page is not distinct from blocked_locks.page
  and blocking_locks.tuple is not distinct from blocked_locks.tuple
  and blocking_locks.virtualxid is not distinct from blocked_locks.virtualxid
  and blocking_locks.transactionid is not distinct from blocked_locks.transactionid
  and blocking_locks.classid is not distinct from blocked_locks.classid
  and blocking_locks.objid is not distinct from blocked_locks.objid
  and blocking_locks.objsubid is not distinct from blocked_locks.objsubid
  and blocking_locks.pid <> blocked_locks.pid
join pg_catalog.pg_stat_activity blocking_activity on blocking_activity.pid = blocking_locks.pid
where not blocked_locks.granted
  and blocking_locks.granted
order by blocked_duration desc;

select
  'table_bloat_signals' as section,
  schemaname,
  relname,
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
from pg_stat_user_tables
order by n_dead_tup desc, n_live_tup desc
limit 20;

select
  'largest_public_tables' as section,
  c.relname,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
  pg_size_pretty(pg_relation_size(c.oid)) as table_size,
  pg_size_pretty(pg_indexes_size(c.oid)) as indexes_size
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by pg_total_relation_size(c.oid) desc
limit 20;

select
  'unused_or_low_scan_indexes' as section,
  schemaname,
  relname,
  indexrelname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
from pg_stat_user_indexes
where schemaname = 'public'
order by idx_scan asc, pg_relation_size(indexrelid) desc
limit 30;
