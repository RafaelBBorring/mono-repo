import { createClient, type SupabaseClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

function requireEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Variável ${name} não configurada.`)
  return value
}

export function createServiceClient() {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function createUserClient(request: Request) {
  const authorization = request.headers.get('Authorization')
  if (!authorization) throw new Error('Sessão ausente.')
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function requireUser(request: Request) {
  const client = createUserClient(request)
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Error('Sessão inválida ou expirada.')
  return { client, user: data.user }
}

export async function requireProjectAccess(client: SupabaseClient, user: User, projectId: string) {
  const { data, error } = await client
    .from('projects')
    .select('id, workspace_id, name, settings')
    .eq('id', projectId)
    .single()
  if (error || !data) throw new Error('Projeto não encontrado ou sem permissão.')
  return { ...data, userId: user.id }
}

export async function requireWorkspaceRole(client: SupabaseClient, user: User, workspaceId: string, allowedRoles: string[]) {
  const { data, error } = await client
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (error || !data || !allowedRoles.includes(data.role)) throw new Error('Seu papel não permite realizar esta ação.')
  return data.role
}
