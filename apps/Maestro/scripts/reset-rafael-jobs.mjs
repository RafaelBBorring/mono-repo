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

const execute = process.argv.includes('--execute')
const targetHint = (process.argv.find((a) => a.startsWith('--user=')) || '--user=Rafael').slice(7).toLowerCase()
const sb = createClient(values.SUPABASE_URL, values.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const { data: { users } } = await sb.auth.admin.listUsers()
const target = users.find((u) => (u.email || '').toLowerCase().includes(targetHint))
if (!target) { console.error('usuario nao encontrado'); process.exit(1) }
const { data: wm } = await sb.from('workspace_members').select('workspace_id').eq('user_id', target.id)
const wsIds = (wm || []).map((m) => m.workspace_id)
const { data: ps } = await sb.from('projects').select('id, name').in('workspace_id', wsIds)
const pids = (ps || []).map((p) => p.id)

const { data: jobs } = await sb.from('ingestion_jobs').select('id, status, stage, progress, error').in('project_id', pids).order('created_at', { ascending: false })
console.log(`Modo: ${execute ? 'EXECUTAR' : 'DRY-RUN'} | jobs: ${jobs?.length || 0}`)
let chunkReset = 0
for (const job of jobs || []) {
  const { count: failed } = await sb.from('ingestion_chunks').select('id', { count: 'exact', head: true }).eq('job_id', job.id).eq('status', 'failed')
  const { count: queued } = await sb.from('ingestion_chunks').select('id', { count: 'exact', head: true }).eq('job_id', job.id).eq('status', 'queued')
  console.log(`  job ${job.id.slice(0,8)} | ${job.status}/${job.stage} | ${job.progress}% | falhados:${failed} na fila:${queued} | rateLimited:${Boolean(job.error?.rateLimited)}`)
  if (!execute) continue
  if (failed) {
    const { error } = await sb.from('ingestion_chunks').update({ status: 'queued', locked_at: null, locked_by: null, attempts: 0, error: null }).eq('job_id', job.id).eq('status', 'failed')
    if (error) console.error(`  erro chunk reset: ${error.message}`)
    chunkReset += failed
  }
  await sb.from('ingestion_jobs').update({ status: 'processing', stage: 'analysis', error: null }).eq('id', job.id)
}

const { count: quota } = await sb.from('usage_events').select('id', { count: 'exact', head: true }).in('workspace_id', wsIds).eq('metric', 'visual_analyses')
console.log(`cota visual_analyses registrada: ${quota}`)
if (execute && quota) {
  const { error } = await sb.from('usage_events').delete().in('workspace_id', wsIds).eq('metric', 'visual_analyses')
  if (error) { console.error(`  erro cota reset: ${error.message}`) } else { console.log('cota visual_analyses resetada') }
}
console.log(execute ? `\nConcluido. ${chunkReset} lotes devolvidos a fila. Jobs marcados pra retomar.` : '\nDRY-RUN. Re-execute com --execute.')
