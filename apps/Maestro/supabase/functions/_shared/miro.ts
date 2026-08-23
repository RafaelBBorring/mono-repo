import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { decryptSecret, encryptSecret } from './crypto.ts'

const MIRO_API = 'https://api.miro.com/v2'
const MIRO_TOKEN_URL = 'https://api.miro.com/v1/oauth/token'

type Connection = {
  id: string
  workspace_id: string
  access_token_ciphertext: string
  refresh_token_ciphertext: string | null
  access_token_expires_at: string | null
  refresh_locked_at: string | null
  status: string
}

async function refreshConnection(service: SupabaseClient, connection: Connection) {
  const staleBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  await service.from('provider_connections').update({ refresh_locked_at: null }).eq('id', connection.id).lt('refresh_locked_at', staleBefore)
  const lockTime = new Date().toISOString()
  const { data: locked } = await service.from('provider_connections').update({ refresh_locked_at: lockTime }).eq('id', connection.id).is('refresh_locked_at', null).select('id, workspace_id, access_token_ciphertext, refresh_token_ciphertext, access_token_expires_at, refresh_locked_at, status').maybeSingle()
  if (!locked) {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 400))
      const { data: current } = await service.from('provider_connections').select('access_token_ciphertext,access_token_expires_at,status,refresh_locked_at').eq('id', connection.id).single()
      const expiresAt = current?.access_token_expires_at ? new Date(current.access_token_expires_at).getTime() : 0
      if (current?.status === 'active' && !current.refresh_locked_at && expiresAt > Date.now() + 60_000) return decryptSecret(current.access_token_ciphertext)
    }
    throw new Error('A conexão do Miro está sendo renovada. Tente novamente em alguns segundos.')
  }
  connection = locked as Connection
  if (!connection.refresh_token_ciphertext) {
    await service.from('provider_connections').update({ refresh_locked_at: null }).eq('id', connection.id)
    throw new Error('A conexão do Miro precisa ser autorizada novamente.')
  }
  const clientId = Deno.env.get('MIRO_CLIENT_ID')
  const clientSecret = Deno.env.get('MIRO_CLIENT_SECRET')
  if (!clientId || !clientSecret) throw new Error('Credenciais do aplicativo Miro não configuradas.')
  const refreshToken = await decryptSecret(connection.refresh_token_ciphertext)
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })
  let response: Response
  try {
    response = await fetch(MIRO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
  } catch {
    await service.from('provider_connections').update({ refresh_locked_at: null }).eq('id', connection.id)
    throw new Error('Não foi possível contatar o Miro para renovar a conexão.')
  }
  if (!response.ok) {
    const detail = await response.text()
    const invalidGrant = [400, 401].includes(response.status) && /invalid_grant|expired|revoked/i.test(detail)
    await service.from('provider_connections').update({ status: invalidGrant ? 'expired' : 'active', refresh_locked_at: null }).eq('id', connection.id)
    if (invalidGrant) throw new Error('A autorização do Miro expirou. Conecte a conta novamente.')
    throw new Error(`O Miro não conseguiu renovar a conexão agora (${response.status}). Tente novamente.`)
  }
  const token = await response.json()
  const expiresAt = new Date(Date.now() + Number(token.expires_in || 3600) * 1000).toISOString()
  const update = {
    access_token_ciphertext: await encryptSecret(token.access_token),
    refresh_token_ciphertext: token.refresh_token ? await encryptSecret(token.refresh_token) : connection.refresh_token_ciphertext,
    access_token_expires_at: expiresAt,
    refresh_token_expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    refresh_locked_at: null,
    status: 'active',
  }
  const { error } = await service.from('provider_connections').update(update).eq('id', connection.id)
  if (error) throw error
  return token.access_token as string
}

export async function getMiroToken(service: SupabaseClient, connectionId: string, workspaceId: string) {
  const { data, error } = await service
    .from('provider_connections')
    .select('id, workspace_id, access_token_ciphertext, refresh_token_ciphertext, access_token_expires_at, refresh_locked_at, status')
    .eq('id', connectionId)
    .eq('workspace_id', workspaceId)
    .eq('provider', 'miro')
    .single()
  if (error || !data) throw new Error('Conexão do Miro não encontrada.')
  const expiresAt = data.access_token_expires_at ? new Date(data.access_token_expires_at).getTime() : 0
  if (data.status !== 'active' || expiresAt < Date.now() + 60_000) return refreshConnection(service, data)
  return decryptSecret(data.access_token_ciphertext)
}

export async function miroFetch(token: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${MIRO_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Miro respondeu ${response.status}: ${detail.slice(0, 240)}`)
  }
  return response.json()
}

export async function listAllMiroBoards(token: string) {
  const boards = []
  let cursor = ''
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({ limit: '50' })
    if (cursor) params.set('cursor', cursor)
    const payload = await miroFetch(token, `/boards?${params}`)
    boards.push(...(payload.data || []))
    cursor = payload.cursor || ''
    if (!cursor) break
  }
  return boards
}
