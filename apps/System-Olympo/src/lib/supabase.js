import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://spoiprwlawgkqlprprsb.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwb2lwcndsYXdna3FscHJwcnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NjUwMjEsImV4cCI6MjA5NjU0MTAyMX0.bNxMhC5-uitTt3AWLIQQykeDrJumiEuuc9sF9E7iRsI'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNwb2lwcndsYXdna3FscHJwcnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDk2NTAyMSwiZXhwIjoyMDk2NTQxMDIxfQ.JzyXuLggMsGMeIHwxxCtv32IP_efMRb50xc7huy7-Y0'

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
