import { autoCharacterPrompt, abilitiesPrompt, balancePrompt } from '../ai/prompts/index.js'
import { getConfig, loadConfig } from './config.js'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const FALLBACK_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free'
]

export function isAIConfigured() {
  const k = getConfig().apiKey
  return Boolean(k) && !String(k).includes('coloque-sua')
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function requestOnce({ apiKey, model, body, allowFormat }) {
  const payload = { ...body, model }
  if (allowFormat) payload.response_format = { type: 'json_object' }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    const err = new Error(`OpenRouter ${res.status}: ${txt.slice(0, 200)}`)
    err.status = res.status
    // 429 (rate limit), 404/400 (modelo/formato), 5xx — tenta próximo modelo
    err.recoverable = [400, 404, 429, 500, 502, 503, 529].includes(res.status)
    throw err
  }
  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

async function callAI(userPrompt, { json = true, temperature = 0.7 } = {}) {
  await loadConfig()
  const { apiKey, model } = getConfig()
  if (!apiKey || String(apiKey).includes('coloque-sua')) {
    throw new Error('IA não configurada. Defina VITE_OPENROUTER_API_KEY no .env (dev) ou no secret DRAKO_OPENROUTER_KEY (GitHub Pages), ou OPENROUTER_API_KEY no container (Docker).')
  }
  const baseBody = {
    temperature,
    messages: [
      { role: 'system', content: 'Você é o Oráculo do System-Drako. Responda sempre em português do Brasil.' },
      { role: 'user', content: userPrompt }
    ]
  }

  const candidates = [model, ...FALLBACK_MODELS.filter(m => m !== model)]
  let lastErr = null
  for (let attempt = 0; attempt < candidates.length; attempt++) {
    const m = candidates[attempt]
    // 1ª tentativa do modelo com response_format; se falir por formato, tenta sem.
    for (const allowFormat of [true, false]) {
      try {
        const content = await requestOnce({ apiKey, model: m, body: baseBody, allowFormat: json && allowFormat })
        if (!json) return content
        try { return safeParseJSON(content) }
        catch { /* JSON inválido — trata como recuperável e segue */ if (!allowFormat) throw new Error('json-invalid') }
      } catch (e) {
        lastErr = e
        if (e.message === 'json-invalid') break
      }
    }
    // pequena pausa entre modelos para aliviar o rate limit
    if (attempt < candidates.length - 1) await sleep(350)
  }
  if (lastErr && /429/.test(lastErr.message)) {
    throw new Error('O Oráculo está no limite de taxa dos modelos gratuitos. Aguarde alguns segundos e tente novamente.')
  }
  throw lastErr || new Error('Falha ao chamar o Oráculo.')
}

function safeParseJSON(text) {
  if (typeof text === 'object') return text
  let t = String(text).trim()
  t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const first = t.indexOf('{')
  const last = t.lastIndexOf('}')
  if (first !== -1 && last !== -1) t = t.slice(first, last + 1)
  try {
    return JSON.parse(t)
  } catch {
    throw new Error('A IA não retornou JSON válido. Tente novamente.')
  }
}

export const aiAutoCharacter = (p) => callAI(autoCharacterPrompt(p), { temperature: 0.8 })
export const aiGenerateAbilities = (p) => callAI(abilitiesPrompt(p), { temperature: 0.85 })
export const aiBalanceAbility = (p) => callAI(balancePrompt(p), { temperature: 0.4 })
export const aiChat = (prompt) => callAI(prompt, { json: false, temperature: 0.7 })
