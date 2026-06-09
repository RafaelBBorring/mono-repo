import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || 'https://wmkswavqtqyfcjuiwtbw.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indta3N3YXZxdHF5ZmNqdWl3dGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTAwOTEsImV4cCI6MjA5MjQ2NjA5MX0.y7jhy5yWI0w0ifX9dNqGzf7ja_H5xBBLVz5yReo76TA'
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indta3N3YXZxdHF5ZmNqdWl3dGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg5MDA5MSwiZXhwIjoyMDkyNDY2MDkxfQ.bS1XSnMOhxJ_MSeKzSmzn_Axpq5gEPxfCsSg4_enfgk'

async function noopLock(_name, _acquireTimeout, fn) {
  return await fn()
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    lock: noopLock,
  },
})

let _admin = null
export function getSupabaseAdmin() {
  if (!_admin) {
    _admin = createAdminClient()
  }
  return _admin
}

function createAdminClient() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Supabase] VITE_SUPABASE_SERVICE_ROLE_KEY not configured — admin operations will fail')
    return supabase
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    },
  })
}

export function getPublicStorageUrl(bucket, path) {
  return supabase.storage.from(bucket).getPublicUrl(path)
}

export async function uploadAdminFile(bucket, path, file, options = {}) {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin.storage.from(bucket).upload(path, file, {
    contentType: options.contentType || file.type || 'application/octet-stream',
    upsert: options.upsert !== false,
  })
  if (error) return { data: null, error }
  return { data, error: null }
}
