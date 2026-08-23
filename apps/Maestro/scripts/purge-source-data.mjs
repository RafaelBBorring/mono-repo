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

const supabaseUrl = process.env.SUPABASE_URL || values.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || values.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes no .env')
  process.exit(1)
}

const execute = process.argv.includes('--execute')
const userArg = process.argv.find((a) => a.startsWith('--user='))
const providerArg = process.argv.find((a) => a.startsWith('--provider='))
const targetHint = (userArg ? userArg.slice(7) : 'Rafael').toLowerCase()
const provider = (providerArg ? providerArg.slice(11) : 'miro').toLowerCase()

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

async function count(table, match) {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).match(match)
  if (error) throw error
  return Number(count || 0)
}

const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
if (usersError) { console.error('Falha ao listar usuários:', usersError.message); process.exit(1) }

const target = users.find((u) => {
  const email = (u.email || '').toLowerCase()
  const name = ((u.user_metadata && u.user_metadata.display_name) || '').toLowerCase()
  return email.includes(targetHint) || name.includes(targetHint) || u.id === targetHint
})
if (!target) {
  console.error(`Usuário correspondente a "${targetHint}" não encontrado. Users:`)
  users.forEach((u) => console.error(`  - ${u.email} | ${u.user_metadata?.display_name || ''} | ${u.id}`))
  process.exit(1)
}

console.log(`\nUsuário: ${target.email} (${target.user_metadata?.display_name || 'sem nome'}) — id ${target.id}`)
console.log(`Modo: ${execute ? 'EXECUTAR (definitivo)' : 'DRY-RUN (apenas leitura)'} | Provedor alvo: ${provider}`)

const { data: memberships, error: wmError } = await supabase.from('workspace_members').select('workspace_id, role').eq('user_id', target.id)
if (wmError) throw wmError
const workspaceIds = (memberships || []).map((m) => m.workspace_id)
if (!workspaceIds.length) { console.log('Nenhuma workspace vinculada. Nada a fazer.'); process.exit(0) }

const { data: projects, error: projError } = await supabase.from('projects').select('id, name, workspace_id').in('workspace_id', workspaceIds)
if (projError) throw projError
if (!projects.length) { console.log('Nenhum projeto nas workspaces. Nada a fazer.'); process.exit(0) }

let totalPurgedSources = 0
let totalPurgedDerived = 0

for (const project of projects) {
  const { data: sources, error: srcError } = await supabase.from('project_sources').select('id, provider, name, sync_status').eq('project_id', project.id)
  if (srcError) throw srcError
  const matches = (sources || []).filter((s) => String(s.provider).toLowerCase() === provider)
  const others = (sources || []).filter((s) => String(s.provider).toLowerCase() !== provider)
  if (!matches.length) continue

  const ents = await count('entities', { project_id: project.id })
  const claims = await count('claims', { project_id: project.id })
  const events = await count('narrative_events', { project_id: project.id })
  const reviews = await count('review_items', { project_id: project.id })
  const items = await count('source_items', { project_id: project.id })
  const chunks = await count('knowledge_chunks', { project_id: project.id })
  const miroOnly = others.length === 0

  console.log(`\nProjeto "${project.name}" (${project.id})`)
  console.log(`  fontes ${provider}: ${matches.length} | outras fontes: ${others.length} ${miroOnly ? '(somente ' + provider + ')' : '(mista — derivados NÃO serão tocados)'}`)
  console.log(`  estoque atual: ${items} source_items, ${chunks} knowledge_chunks, ${ents} entities, ${claims} claims, ${events} narrative_events, ${reviews} review_items`)

  if (!execute) continue

  const matchIds = matches.map((s) => s.id)
  const { error: delSrcError } = await supabase.from('project_sources').delete().in('id', matchIds)
  if (delSrcError) { console.error('  ERRO ao apagar fontes:', delSrcError.message); continue }
  totalPurgedSources += matchIds.length
  console.log(`  ✓ apagadas ${matchIds.length} fonte(s) ${provider} (+ source_items, item_versions, spatial_regions, ingestion_jobs/chunks, evidence, knowledge_chunks em cascata)`)

  if (miroOnly) {
    await supabase.from('review_items').delete().eq('project_id', project.id)
    await supabase.from('narrative_events').delete().eq('project_id', project.id)
    await supabase.from('claims').delete().eq('project_id', project.id)
    await supabase.from('entities').delete().eq('project_id', project.id)
    totalPurgedDerived += ents + claims + events + reviews
    console.log(`  ✓ apagados derivados (somente ${provider}): ${ents} entities, ${claims} claims, ${events} narrative_events, ${reviews} review_items`)
  } else {
    console.log(`  ! projeto misto: mantidos entities/claims/events/reviews (podem incluir dados de outras fontes)`)
  }
}

console.log(execute ? `\nConcluído. Fontes apagadas: ${totalPurgedSources}. Derivados apagados: ${totalPurgedDerived}.` : '\nDRY-RUN. Re-execute com --execute para aplicar.')
