import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const envPath = fileURLToPath(new URL('../.env', import.meta.url))
const values = {}

for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const separator = line.indexOf('=')
  if (separator < 1) continue
  values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
}

const supabaseUrl = process.env.SUPABASE_URL || values.SUPABASE_URL
const publicKey = process.env.VITE_SUPABASE_ANON_KEY || values.VITE_SUPABASE_ANON_KEY || values.SUPABASE_ANON_KEY
const email = process.env.MAESTRO_CHECK_EMAIL || 'teste1@gmail.com'
const password = process.env.MAESTRO_CHECK_PASSWORD
const writeCheck = process.argv.includes('--write')
const isolationCheck = process.argv.includes('--isolation')

if (!supabaseUrl || !publicKey || !password) {
  throw new Error('SUPABASE_URL, chave pública e MAESTRO_CHECK_PASSWORD são obrigatórios.')
}

const supabase = createClient(supabaseUrl, publicKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
if (authError || !authData.session) throw authError || new Error('Sessão não criada.')

const { data: projects, error: projectsError } = await supabase
  .from('projects')
  .select('id,workspace_id,name')
  .eq('status', 'active')
  .limit(10)
if (projectsError) throw projectsError
if (!projects?.length) throw new Error('A conta autenticou, mas não recebeu projeto via RLS.')

const project = projects[0]
const { data: usage, error: usageError } = await supabase.rpc('workspace_usage_snapshot', {
  target_workspace_id: project.workspace_id,
})
if (usageError) throw usageError

const result = {
  email,
  authenticated: true,
  projectsVisible: projects.length,
  plan: usage.plan,
  writeCheck: 'skipped',
  isolationCheck: 'skipped',
}

const { data: latestAssistant, error: latestAssistantError } = await supabase
  .from('messages')
  .select('model_run')
  .eq('project_id', project.id)
  .eq('role', 'assistant')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()
if (latestAssistantError) throw latestAssistantError
if (latestAssistant?.model_run?.model) result.lastServedModel = latestAssistant.model_run.model

if (writeCheck) {
  const sourceName = 'Validação automática do Maestro'
  const { data: existingSource, error: sourceLookupError } = await supabase
    .from('project_sources')
    .select('id')
    .eq('project_id', project.id)
    .eq('name', sourceName)
    .limit(1)
    .maybeSingle()
  if (sourceLookupError) throw sourceLookupError

  if (!existingSource) {
    const { error: sourceError } = await supabase.functions.invoke('manual-source', {
      body: {
        projectId: project.id,
        kind: 'paste',
        title: sourceName,
        content: 'No universo de teste chamado Valedouro, a capital oficial é Lúmen. A Ponte de Âmbar liga Lúmen ao distrito de Salina.',
      },
    })
    if (sourceError) throw sourceError
  }

  const { data: chat, error: chatError } = await supabase.functions.invoke('maestro-chat', {
    body: {
      projectId: project.id,
      conversationId: null,
      message: 'Valedouro capital oficial',
      mode: 'canon',
    },
  })
  if (chatError) throw chatError
  if (!chat?.content || chat.answerState !== 'grounded' || !chat.citations?.length) {
    throw new Error('O chat respondeu, mas não preservou grounding e citação no smoke test.')
  }
  result.writeCheck = 'passed'
  result.answerState = chat.answerState
  result.citations = chat.citations.length
}

if (isolationCheck) {
  const isolatedClient = createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data: isolatedAuth, error: isolatedAuthError } = await isolatedClient.auth.signInWithPassword({
    email: 'teste2@gmail.com',
    password,
  })
  if (isolatedAuthError || !isolatedAuth.session) throw isolatedAuthError || new Error('Sessão de isolamento não criada.')
  const { data: foreignProjects, error: isolationError } = await isolatedClient
    .from('projects')
    .select('id')
    .eq('id', project.id)
  if (isolationError) throw isolationError
  if (foreignProjects.length) throw new Error('RLS permitiu acesso entre workspaces de teste.')
  await isolatedClient.auth.signOut({ scope: 'local' })
  result.isolationCheck = 'passed'
}

await supabase.auth.signOut({ scope: 'local' })
console.log(JSON.stringify(result))
