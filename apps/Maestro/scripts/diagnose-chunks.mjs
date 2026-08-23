import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const workspace = fileURLToPath(new URL('..', import.meta.url))
const values = {}
for (const rawLine of readFileSync(`${workspace}/.env`, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const sep = line.indexOf('=')
  if (sep < 1) continue
  values[line.slice(0, sep).trim()] = line.slice(sep + 1).trim()
}

const supabase = createClient(values.SUPABASE_URL, values.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const targetHint = (process.argv.find((a) => a.startsWith('--user=')) || '--user=Rafael').slice(7).toLowerCase()
const { data: { users } } = await supabase.auth.admin.listUsers()
const target = users.find((u) => (u.email || '').toLowerCase().includes(targetHint) || ((u.user_metadata?.display_name) || '').toLowerCase().includes(targetHint))
if (!target) { console.error('usuário não encontrado'); process.exit(1) }
console.log(`Usuário: ${target.email}`)

const { data: wm } = await supabase.from('workspace_members').select('workspace_id').eq('user_id', target.id)
const workspaceIds = (wm || []).map((m) => m.workspace_id)
const { data: projects } = await supabase.from('projects').select('id, name').in('workspace_id', workspaceIds)
const projectIds = (projects || []).map((p) => p.id)

const { data: sources } = await supabase.from('project_sources').select('id, name, provider, sync_status, coverage').in('project_id', projectIds).order('created_at', { ascending: false })
console.log(`\nFontes (${sources?.length || 0}):`)
for (const s of sources || []) console.log(`  - ${s.name} | ${s.provider} | ${s.sync_status} | cobertura=${s.coverage?.percentage ?? '—'}% falhas=${s.coverage?.failedChunks ?? 0}`)

const { data: jobs } = await supabase.from('ingestion_jobs').select('id, status, stage, progress, totals, coverage, error').in('project_id', projectIds).order('created_at', { ascending: false }).limit(10)
console.log(`\nJobs (${jobs?.length || 0}):`)
for (const j of jobs || []) console.log(`  - ${j.id} | ${j.status}/${j.stage} | ${j.progress}% | totals=${JSON.stringify(j.totals)} | err=${j.error ? JSON.stringify(j.error).slice(0, 200) : '—'}`)

const { data: failed } = await supabase.from('ingestion_chunks').select('id, chunk_type, attempts, error, status').in('job_id', (jobs || []).map((j) => j.id)).eq('status', 'failed').limit(8)
console.log(`\nLotes falhados (amostra de ${failed?.length || 0}):`)
for (const c of failed || []) console.log(`  - tipo=${c.chunk_type} tentativas=${c.attempts} erro=${JSON.stringify(c.error).slice(0, 300)}`)

const { count: totalFailed } = await supabase.from('ingestion_chunks').select('id', { count: 'exact', head: true }).in('job_id', (jobs || []).map((j) => j.id)).eq('status', 'failed')
const { count: totalComplete } = await supabase.from('ingestion_chunks').select('id', { count: 'exact', head: true }).in('job_id', (jobs || []).map((j) => j.id)).eq('status', 'complete')
console.log(`\nTotais nos jobs: ${totalComplete} completos, ${totalFailed} falhados`)
