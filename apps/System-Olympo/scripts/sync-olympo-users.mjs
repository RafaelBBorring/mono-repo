import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://wmkswavqtqyfcjuiwtbw.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indta3N3YXZxdHF5ZmNqdWl3dGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njg5MDA5MSwiZXhwIjoyMDkyNDY2MDkxfQ.bS1XSnMOhxJ_MSeKzSmzn_Axpq5gEPxfCsSg4_enfgk'
const DEFAULT_PASSWORD = 'olympo2026'

const USERS = [
  { email: 'alfredo@olympo.local', display_name: 'Alfredo', role: 'user' },
  { email: 'rosa@olympo.local', display_name: 'Rosa', role: 'user' },
  { email: 'silas@olympo.local', display_name: 'Silas', role: 'user' },
  { email: 'mestre@olympo.local', display_name: 'Mestre', role: 'admin' },
]

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { 'X-Client-Info': 'system-olympo-user-sync' } },
})

async function getAllUsers() {
  const all = []
  let page = 1

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error

    const batch = data?.users || []
    all.push(...batch)

    if (batch.length < 200) break
    page += 1
  }

  return all
}

async function ensureUser(existingUsers, spec) {
  const existing = existingUsers.find((item) => item.email?.toLowerCase() === spec.email.toLowerCase())

  if (!existing) {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: spec.display_name,
        role: spec.role,
      },
    })

    if (error) throw error

    await upsertProfile(data.user.id, spec)
    return { email: spec.email, action: 'created', id: data.user.id }
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(existing.id, {
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: {
      ...(existing.user_metadata || {}),
      display_name: spec.display_name,
      role: spec.role,
    },
  })
  if (updateError) throw updateError

  await upsertProfile(existing.id, spec)
  return { email: spec.email, action: 'updated', id: existing.id }
}

async function upsertProfile(id, spec) {
  const { error } = await admin.from('profiles').upsert({
    id,
    display_name: spec.display_name,
    role: spec.role,
  })

  if (error) throw error
}

async function main() {
  const existingUsers = await getAllUsers()
  const results = []

  for (const spec of USERS) {
    results.push(await ensureUser(existingUsers, spec))
  }

  console.log(JSON.stringify({
    password: DEFAULT_PASSWORD,
    results,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
