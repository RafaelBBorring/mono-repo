import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const allowedTables = new Set([
  'ability_reviews',
  'alchemy_rituals',
  'characters',
  'grimorios',
  'legendary_weapons',
  'magics',
  'profiles',
  'runes',
  'spells',
])

const allowedBuckets = new Set(['grimorios'])

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function toError(error: unknown) {
  if (!error) return null
  if (typeof error === 'object' && 'message' in error) return error
  return { message: String(error) }
}

function isOwnProfileRead(query: any, userId: string) {
  if (query?.table !== 'profiles' || query?.operation !== 'select') return false
  return (query?.filters || []).some((filter: any) =>
    filter?.op === 'eq' && filter?.column === 'id' && filter?.value === userId
  )
}

async function getContext(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return { error: { message: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured' }, status: 500 }
  }

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return { error: { message: 'Missing bearer token' }, status: 401 }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'X-Client-Info': 'system-olympo-admin-data' } },
  })

  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData?.user) {
    return { error: { message: userError?.message || 'Invalid session' }, status: 401 }
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profileError) return { error: profileError, status: 500 }

  return {
    admin,
    user: userData.user,
    isAdmin: profile?.role === 'admin',
  }
}

function ensureAllowedQuery(query: any, userId: string, isAdmin: boolean) {
  if (!query || typeof query !== 'object') return { message: 'Invalid query payload' }
  if (!allowedTables.has(query.table)) return { message: 'Table is not allowed' }
  if (isAdmin || isOwnProfileRead(query, userId)) return null
  return { message: 'Admin privileges required' }
}

function applyFilters(builder: any, filters: any[] = []) {
  for (const filter of filters) {
    if (!filter?.column) continue
    if (filter.op === 'eq') builder = builder.eq(filter.column, filter.value)
    else if (filter.op === 'neq') builder = builder.neq(filter.column, filter.value)
    else if (filter.op === 'in') builder = builder.in(filter.column, Array.isArray(filter.value) ? filter.value : [])
  }
  return builder
}

function applyOrders(builder: any, orders: any[] = []) {
  for (const order of orders) {
    if (!order?.column) continue
    builder = builder.order(order.column, {
      ascending: order.ascending !== false,
      nullsFirst: order.nullsFirst,
      referencedTable: order.referencedTable,
      foreignTable: order.foreignTable,
    })
  }
  return builder
}

async function runQuery(admin: any, query: any) {
  let builder

  if (query.operation === 'select') {
    builder = admin.from(query.table).select(query.columns || '*')
    builder = applyFilters(builder, query.filters)
    builder = applyOrders(builder, query.orders)
    if (Number.isFinite(query.limit)) builder = builder.limit(query.limit)
  } else if (query.operation === 'insert') {
    builder = admin.from(query.table).insert(query.values, query.options || undefined)
    if (query.returning) builder = builder.select(query.returning)
  } else if (query.operation === 'update') {
    builder = admin.from(query.table).update(query.values, query.options || undefined)
    builder = applyFilters(builder, query.filters)
    if (query.returning) builder = builder.select(query.returning)
  } else if (query.operation === 'upsert') {
    builder = admin.from(query.table).upsert(query.values, query.options || undefined)
    if (query.returning) builder = builder.select(query.returning)
  } else if (query.operation === 'delete') {
    builder = admin.from(query.table).delete(query.options || undefined)
    builder = applyFilters(builder, query.filters)
    if (query.returning) builder = builder.select(query.returning)
  } else {
    return { data: null, error: { message: 'Operation is not allowed' } }
  }

  if (query.single === 'single') builder = builder.single()
  if (query.single === 'maybeSingle') builder = builder.maybeSingle()

  const { data, error } = await builder
  return { data, error: toError(error) }
}

function decodeBase64(content: string) {
  const binary = atob(content)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function runStorageUpload(admin: any, payload: any, isAdmin: boolean) {
  if (!isAdmin) return { data: null, error: { message: 'Admin privileges required' } }
  if (!allowedBuckets.has(payload.bucket)) return { data: null, error: { message: 'Bucket is not allowed' } }
  if (!payload.path || !payload.contentBase64) return { data: null, error: { message: 'Invalid upload payload' } }

  const content = decodeBase64(payload.contentBase64)
  const { data, error } = await admin.storage
    .from(payload.bucket)
    .upload(payload.path, content, {
      upsert: payload.upsert !== false,
      contentType: payload.contentType || 'application/octet-stream',
    })

  return { data, error: toError(error) }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ data: null, error: { message: 'Method not allowed' } }, 405)

  try {
    const payload = await req.json()
    const context = await getContext(req)
    if ('error' in context) return jsonResponse({ data: null, error: context.error }, context.status)

    if (payload.action === 'query') {
      const denied = ensureAllowedQuery(payload.query, context.user.id, context.isAdmin)
      if (denied) return jsonResponse({ data: null, error: denied }, 403)
      const result = await runQuery(context.admin, payload.query)
      return jsonResponse(result, result.error ? 400 : 200)
    }

    if (payload.action === 'storage-upload') {
      const result = await runStorageUpload(context.admin, payload, context.isAdmin)
      return jsonResponse(result, result.error ? 400 : 200)
    }

    return jsonResponse({ data: null, error: { message: 'Action is not allowed' } }, 400)
  } catch (error) {
    return jsonResponse({ data: null, error: toError(error) }, 500)
  }
})
