import { readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const workspace = fileURLToPath(new URL('..', import.meta.url))
const envPath = fileURLToPath(new URL('../.env', import.meta.url))
const cliEntry = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url))
const values = {}

for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const separator = line.indexOf('=')
  if (separator < 1) continue
  values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
}

const projectRef = process.env.SUPABASE_PROJECT_REF || values.SUPABASE_PROJECT_REF
if (!projectRef) throw new Error('SUPABASE_PROJECT_REF não está configurado.')
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || values.SUPABASE_ACCESS_TOKEN

function run(args) {
  const result = spawnSync(process.execPath, [cliEntry, ...args], {
    cwd: workspace,
    env: { ...process.env, ...(accessToken ? { SUPABASE_ACCESS_TOKEN: accessToken } : {}) },
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Supabase CLI interrompeu em: ${args.join(' ')}`)
}

const secretNames = [
  'APP_URL',
  'OPENROUTER_API_KEY',
  'OPENROUTER_TEXT_MODEL',
  'OPENROUTER_TEXT_FALLBACK_MODELS',
  'OPENROUTER_VISION_MODEL',
  'OPENROUTER_VISION_FALLBACK_MODELS',
  'INTEGRATION_ENCRYPTION_KEY',
  'MIRO_CLIENT_ID',
  'MIRO_CLIENT_SECRET',
  'MIRO_REDIRECT_URI',
]

const secretLines = secretNames
  .map((name) => [name, process.env[name] || values[name]])
  .filter(([, value]) => value)
  .map(([name, value]) => `${name}=${value}`)

for (const requiredName of ['APP_URL', 'OPENROUTER_API_KEY', 'INTEGRATION_ENCRYPTION_KEY']) {
  if (!secretLines.some((line) => line.startsWith(`${requiredName}=`))) {
    throw new Error(`${requiredName} não está configurado.`)
  }
}

const temporarySecrets = join(tmpdir(), `maestro-supabase-secrets-${process.pid}-${Date.now()}.env`)

try {
  run(['link', '--project-ref', projectRef])
  run(['db', 'push', '--dry-run', '--include-all'])
  run(['db', 'push', '--include-all'])

  writeFileSync(temporarySecrets, `${secretLines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 })
  run(['secrets', 'set', '--project-ref', projectRef, '--env-file', temporarySecrets])

  const functions = [
    ['miro-oauth', '--no-verify-jwt'],
    ['miro-import'],
    ['ingestion-worker'],
    ['maestro-chat'],
    ['provider-config'],
    ['miro-sdk-capture'],
    ['manual-source'],
  ]
  for (const [name, ...flags] of functions) {
    run(['functions', 'deploy', name, '--project-ref', projectRef, ...flags])
  }
} finally {
  try {
    unlinkSync(temporarySecrets)
  } catch {}
}
