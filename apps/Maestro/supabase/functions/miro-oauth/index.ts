import { corsHeaders, errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { encryptSecret, sha256 } from '../_shared/crypto.ts'
import { getMiroToken, listAllMiroBoards } from '../_shared/miro.ts'
import { createServiceClient, requireProjectAccess, requireUser, requireWorkspaceRole } from '../_shared/supabase.ts'

const AUTHORIZE_URL = 'https://miro.com/oauth/authorize'
const TOKEN_URL = 'https://api.miro.com/v1/oauth/token'

class HttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function required(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Variável ${name} não configurada.`)
  return value
}

function miroOAuthConfig() {
  const names = ['MIRO_CLIENT_ID', 'MIRO_CLIENT_SECRET', 'MIRO_REDIRECT_URI']
  const missing = names.filter((name) => !Deno.env.get(name))
  if (missing.length) {
    throw new HttpError(`A integração com o Miro ainda não foi configurada pelo administrador. Variáveis ausentes: ${missing.join(', ')}.`, 503)
  }
  return {
    clientId: Deno.env.get('MIRO_CLIENT_ID') as string,
    clientSecret: Deno.env.get('MIRO_CLIENT_SECRET') as string,
    redirectUri: Deno.env.get('MIRO_REDIRECT_URI') as string,
  }
}

async function callback(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) throw new Error('Retorno OAuth incompleto.')
  const service = createServiceClient()
  const stateHash = await sha256(state)
  const { data: pending, error: pendingError } = await service
    .from('oauth_states')
    .select('*')
    .eq('state_hash', stateHash)
    .eq('provider', 'miro')
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()
  if (pendingError || !pending) throw new Error('Autorização expirada ou já utilizada.')
  const oauth = miroOAuthConfig()

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: oauth.clientId,
    client_secret: oauth.clientSecret,
    redirect_uri: oauth.redirectUri,
    code,
  })
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!response.ok) throw new Error(`O Miro recusou a autorização (${response.status}).`)
  const token = await response.json()
  const now = Date.now()
  const connection = {
    workspace_id: pending.workspace_id,
    user_id: pending.user_id,
    provider: 'miro',
    remote_account_id: token.user_id ? String(token.user_id) : null,
    remote_team_id: token.team_id ? String(token.team_id) : null,
    display_name: token.team_name || 'Conta Miro',
    scopes: typeof token.scope === 'string' ? token.scope.split(' ') : [],
    access_token_ciphertext: await encryptSecret(token.access_token),
    refresh_token_ciphertext: token.refresh_token ? await encryptSecret(token.refresh_token) : null,
    access_token_expires_at: new Date(now + Number(token.expires_in || 3600) * 1000).toISOString(),
    refresh_token_expires_at: new Date(now + 60 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    metadata: { tokenType: token.token_type || 'bearer' },
  }
  const { error: connectionError } = await service
    .from('provider_connections')
    .upsert(connection, { onConflict: 'workspace_id,user_id,provider,remote_team_id' })
  if (connectionError) throw connectionError
  await service.from('oauth_states').update({ consumed_at: new Date().toISOString() }).eq('id', pending.id)
  const appUrl = required('APP_URL').replace(/\/$/, '')
  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: `${appUrl}/#/app/sources?miro=connected&projectId=${encodeURIComponent(pending.project_id)}` },
  })
}

async function authorize(request: Request, body: { projectId?: string }) {
  if (!body.projectId) throw new Error('Projeto não informado.')
  const { client, user } = await requireUser(request)
  const project = await requireProjectAccess(client, user, body.projectId)
  await requireWorkspaceRole(client, user, project.workspace_id, ['owner', 'admin', 'editor'])
  const oauth = miroOAuthConfig()
  const rawState = crypto.randomUUID()
  const service = createServiceClient()
  const { error } = await service.from('oauth_states').insert({
    state_hash: await sha256(rawState),
    workspace_id: project.workspace_id,
    project_id: project.id,
    user_id: user.id,
    provider: 'miro',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })
  if (error) throw error
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: oauth.clientId,
    redirect_uri: oauth.redirectUri,
    state: rawState,
  })
  return jsonResponse({ authorizeUrl: `${AUTHORIZE_URL}?${params}` })
}

async function boards(request: Request, body: { projectId?: string }) {
  if (!body.projectId) throw new Error('Projeto não informado.')
  const { client, user } = await requireUser(request)
  const project = await requireProjectAccess(client, user, body.projectId)
  await requireWorkspaceRole(client, user, project.workspace_id, ['owner', 'admin', 'editor'])
  const service = createServiceClient()
  const { data: connections, error } = await service
    .from('provider_connections')
    .select('id, remote_team_id, display_name')
    .eq('workspace_id', project.workspace_id)
    .eq('user_id', user.id)
    .eq('provider', 'miro')
    .eq('status', 'active')
  if (error) throw error
  const output = []
  for (const connection of connections || []) {
    const token = await getMiroToken(service, connection.id, project.workspace_id)
    const found = await listAllMiroBoards(token)
    output.push(...found.map((board: Record<string, unknown>) => ({
      id: board.id,
      name: board.name,
      description: board.description,
      viewLink: board.viewLink,
      modifiedAt: board.modifiedAt || board.updatedAt,
      connectionId: connection.id,
      teamId: connection.remote_team_id,
      teamName: connection.display_name,
    })))
  }
  return jsonResponse({ boards: output })
}

Deno.serve(async (request) => {
  const options = handleOptions(request)
  if (options) return options
  try {
    if (request.method === 'GET') return await callback(request)
    if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)
    const body = await request.json()
    if (body.action === 'authorize') return await authorize(request, body)
    if (body.action === 'boards') return await boards(request, body)
    return jsonResponse({ error: 'Ação desconhecida.' }, 400)
  } catch (error) {
    return errorResponse(error, error instanceof HttpError ? error.status : 400)
  }
})
