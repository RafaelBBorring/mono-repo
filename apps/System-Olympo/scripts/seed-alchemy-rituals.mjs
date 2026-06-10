import { createClient } from '@supabase/supabase-js'
import { ALCHEMY_FALLBACK_RITUALS } from '../src/data/alchemyFallbackRituals.js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://wmkswavqtqyfcjuiwtbw.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('Set SUPABASE_SERVICE_ROLE_KEY before running this script.')
}

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
