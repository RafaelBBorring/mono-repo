import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const envPath = fileURLToPath(new URL('../.env', import.meta.url))
const values = {}

for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const line = rawLine.trim()
  if (!line || line.startsWith('#')) continue
  const separator = line.indexOf('=')
  if (separator < 1) continue
  values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
}

const apiKey = process.env.OPENROUTER_API_KEY || values.OPENROUTER_API_KEY
const visionCheck = process.argv.includes('--vision')
const structuredCheck = process.argv.includes('--structured')
const model = visionCheck
  ? process.env.OPENROUTER_VISION_MODEL || values.OPENROUTER_VISION_MODEL || 'openrouter/free'
  : process.env.OPENROUTER_TEXT_MODEL || values.OPENROUTER_TEXT_MODEL || 'openrouter/free'
const appUrl = process.env.APP_URL || values.APP_URL || 'https://maestro.app'

if (!apiKey) throw new Error('OPENROUTER_API_KEY não está configurada.')

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  signal: AbortSignal.timeout(45_000),
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': appUrl,
    'X-Title': 'Maestro Creative Intelligence',
  },
  body: JSON.stringify({
    model,
    messages: [{
      role: 'user',
      content: visionCheck
        ? [
            { type: 'text', text: structuredCheck ? 'Responda apenas JSON: {"imageReceived":true}.' : 'Confirme em uma frase curta que recebeu uma imagem.' },
            { type: 'image_url', image_url: { url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' } },
          ]
        : structuredCheck ? 'Responda apenas JSON: {"status":"MAESTRO_OK"}.' : 'Responda somente MAESTRO_OK.',
    }],
    max_tokens: visionCheck ? 64 : 16,
    temperature: 0,
    ...(structuredCheck ? { response_format: { type: 'json_object' } } : {}),
  }),
})

const raw = await response.text()
let payload = null
try {
  payload = JSON.parse(raw)
} catch {
  payload = { error: { message: raw.slice(0, 180) } }
}

if (!response.ok) {
  throw new Error(`OpenRouter respondeu ${response.status}: ${payload?.error?.message || 'erro sem detalhe'}`)
}

console.log(JSON.stringify({
  configuredModel: model,
  servedModel: payload.model,
  mode: visionCheck ? 'vision' : 'text',
  contentReceived: Boolean(payload.choices?.[0]?.message?.content),
  structuredJson: structuredCheck
    ? (() => {
        try {
          JSON.parse(payload.choices?.[0]?.message?.content || '')
          return true
        } catch {
          return false
        }
      })()
    : undefined,
}))
