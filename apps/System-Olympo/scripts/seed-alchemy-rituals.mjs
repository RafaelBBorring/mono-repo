import { createClient } from '@supabase/supabase-js'
import { ALCHEMY_FALLBACK_RITUALS } from '../src/data/alchemyFallbackRituals.js'

const SUPABASE_URL = 'https://wmkswavqtqyfcjuiwtbw.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indta3N3YXZxdHF5ZmNqdWl3dGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg5MDA5MSwiZXhwIjoyMDkyNDY2MDkxfQ.bS1XSnMOhxJ_MSeKzSmzn_Axpq5gEPxfCsSg4_enfgk'

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const payload = ALCHEMY_FALLBACK_RITUALS.map((ritual) => ({
    ...ritual,
    updated_at: new Date().toISOString(),
  }))

  const { data, error } = await admin
    .from('alchemy_rituals')
    .upsert(payload)
    .select('id')

  if (error) throw error

  console.log(JSON.stringify({
    inserted: data?.length || 0,
    ids: data?.map((item) => item.id) || [],
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
