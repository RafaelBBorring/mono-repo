import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wmkswavqtqyfcjuiwtbw.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indta3N3YXZxdHF5ZmNqdWl3dGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4OTAwOTEsImV4cCI6MjA5MjQ2NjA5MX0.y7jhy5yWI0w0ifX9dNqGzf7ja_H5xBBLVz5yReo76TA'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indta3N3YXZxdHF5ZmNqdWl3dGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg5MDA5MSwiZXhwIjoyMDkyNDY2MDkxfQ.bS1XSnMOhxJ_MSeKzSmzn_Axpq5gEPxfCsSg4_enfgk'

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
    _admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { 'X-Client-Info': 'system-olympo-admin' } }
    })
  }
  return _admin
}
