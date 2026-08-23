import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const envPath = fileURLToPath(new URL('../.env', import.meta.url))

function loadLocalEnv() {
  let source = ''
  try {
    source = readFileSync(envPath, 'utf8')
  } catch {
    return
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue
    const name = line.slice(0, separator).trim()
    const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2')
    if (!process.env[name]) process.env[name] = value
  }
}

loadLocalEnv()

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const ownerPassword = process.env.MAESTRO_OWNER_PASSWORD
const testPassword = process.env.MAESTRO_TEST_PASSWORD

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de provisionar usuários.')
}

const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(20_000),
  })
  const raw = await response.text()
  let payload = null
  if (raw) {
    try {
      payload = JSON.parse(raw)
    } catch {
      payload = raw
    }
  }
  if (!response.ok) {
    const detail = typeof payload === 'string'
      ? payload
      : payload?.msg || payload?.message || payload?.error_description || payload?.error || response.statusText
    throw new Error(`${response.status} ${detail}`)
  }
  return payload
}

function rest(path, { method = 'GET', body, prefer } = {}) {
  return request(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      ...serviceHeaders,
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

function auth(path, { method = 'GET', body } = {}) {
  return request(`${supabaseUrl}/auth/v1/admin/${path}`, {
    method,
    headers: serviceHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

async function assertMaestroSchema() {
  try {
    await rest('plans?select=id&limit=1')
  } catch (error) {
    throw new Error(`O schema do Maestro ainda não está aplicado neste projeto Supabase. Aplique as migrations antes de criar as contas. Detalhe: ${error.message}`)
  }
}

async function ensureVipPlan() {
  const entitlements = {
    projects: 100,
    miro_boards: 100,
    members: 25,
    storage_bytes: 53_687_091_200,
    indexed_tokens: 50_000_000,
    visual_analyses_month: 50_000,
    messages_month: 50_000,
    sync_mode: 'scheduled',
    connectors: ['miro', 'notion', 'obsidian', 'upload', 'paste', 'chat'],
    development_access: true,
  }
  await rest('plans?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{ id: 'vip', name: 'VIP · Desenvolvimento', entitlements, active: true }],
  })
}

async function listUsers() {
  const result = await auth('users?page=1&per_page=1000')
  return result?.users || []
}

async function ensureAuthUser(account, knownUsers) {
  const existing = knownUsers.find((user) => user.email?.toLowerCase() === account.email.toLowerCase())
  const payload = {
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: account.metadata,
  }

  if (existing) {
    const updated = await auth(`users/${existing.id}`, { method: 'PUT', body: payload })
    return { user: updated, status: 'updated' }
  }

  const created = await auth('users', { method: 'POST', body: payload })
  knownUsers.push(created)
  return { user: created, status: 'created' }
}

async function verifyPassword(account) {
  const payload = await request(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY || serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: account.email, password: account.password }),
  })
  if (!payload?.access_token || payload?.user?.email?.toLowerCase() !== account.email.toLowerCase()) {
    throw new Error(`A autenticação de ${account.email} não pôde ser verificada.`)
  }
}

async function ensureWorkspace(account, user) {
  await rest('profiles?on_conflict=id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{ id: user.id, display_name: account.metadata.full_name, locale: 'pt-BR' }],
  })

  let workspaces = await rest(`workspaces?owner_user_id=eq.${encodeURIComponent(user.id)}&select=id,plan_id&order=created_at.asc&limit=1`)
  let workspace = workspaces?.[0]

  if (!workspace) {
    const created = await rest('workspaces?select=id,plan_id', {
      method: 'POST',
      prefer: 'return=representation',
      body: [{
        name: `Workspace de ${account.metadata.full_name}`,
        owner_user_id: user.id,
        plan_id: account.planId,
        subscription_status: 'active',
      }],
    })
    workspace = created[0]
  }

  await rest(`workspaces?id=eq.${encodeURIComponent(workspace.id)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: { plan_id: account.planId, subscription_status: 'active' },
  })

  await rest('workspace_members?on_conflict=workspace_id,user_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{ workspace_id: workspace.id, user_id: user.id, role: 'owner' }],
  })

  const projects = await rest(`projects?workspace_id=eq.${encodeURIComponent(workspace.id)}&select=id&limit=1`)
  if (!projects?.length) {
    await rest('projects', {
      method: 'POST',
      prefer: 'return=minimal',
      body: [{
        workspace_id: workspace.id,
        name: account.initialProject,
        kind: 'rpg',
        description: 'Seu universo criativo no Maestro.',
        created_by: user.id,
      }],
    })
  }

  const verifiedProjects = await rest(`projects?workspace_id=eq.${encodeURIComponent(workspace.id)}&select=id`)
  return {
    workspaceId: workspace.id,
    plan: account.planId,
    role: 'owner',
    projects: verifiedProjects.length,
  }
}

async function main() {
  if (process.argv.includes('--check')) {
    await assertMaestroSchema()
    console.log(JSON.stringify({ schema: 'ready' }))
    return
  }
  const authOnly = process.argv.includes('--auth-only')
  if (!authOnly) await assertMaestroSchema()
  if (!ownerPassword || !testPassword) {
    throw new Error('Defina MAESTRO_OWNER_PASSWORD e MAESTRO_TEST_PASSWORD somente no processo de provisionamento.')
  }

  if (!authOnly) await ensureVipPlan()
  const knownUsers = await listUsers()
  const accounts = [
    {
      email: 'Rafael.bborring@gmail.com',
      password: ownerPassword,
      metadata: { full_name: 'Rafael Borring', maestro_access: 'vip' },
      planId: 'vip',
      initialProject: 'Universo de Rafael',
    },
    ...[1, 2, 3].map((index) => ({
      email: `teste${index}@gmail.com`,
      password: testPassword,
      metadata: { full_name: `Teste ${index}`, maestro_test_account: true },
      planId: 'free',
      initialProject: `Universo de Teste ${index}`,
    })),
  ]

  const summary = []
  for (const account of accounts) {
    const authResult = await ensureAuthUser(account, knownUsers)
    await verifyPassword(account)
    if (authOnly) {
      summary.push({ email: account.email, auth: authResult.status, passwordLogin: 'verified' })
    } else {
      const workspace = await ensureWorkspace(account, authResult.user)
      summary.push({ email: account.email, auth: authResult.status, passwordLogin: 'verified', ...workspace })
    }
  }

  console.log(JSON.stringify({ provisioned: summary }, null, 2))
}

main().catch((error) => {
  console.error(`Provisionamento interrompido: ${error.message}`)
  process.exitCode = 1
})
