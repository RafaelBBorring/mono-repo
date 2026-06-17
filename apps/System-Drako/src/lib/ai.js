import { autoCharacterPrompt, abilitiesPrompt, balancePrompt } from '../ai/prompts/index.js'
import { getConfig, loadConfig } from './config.js'

const API_URL = 'https://openrouter.ai/api/v1/chat/completions'

const FALLBACK_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-120b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free'
]

export function isAIConfigured() {
  const k = getConfig().apiKey
  return Boolean(k) && !String(k).includes('coloque-sua')
}

async function requestOnce({ apiKey, model, body }) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ...body, model })
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    const err = new Error(`OpenRouter ${res.status}: ${txt.slice(0, 300)}`)
    err.status = res.status
    err.recoverable = res.status === 429 || res.status === 404 || res.status === 502 || res.status === 503 || res.status === 529
    throw err
  }
  return res.json()
}

async function callAI(userPrompt, { json = true, temperature = 0.7 } = {}) {
  await loadConfig()
  const { apiKey, model } = getConfig()
  if (!apiKey || String(apiKey).includes('coloque-sua')) {
    throw new Error('IA não configurada. Defina VITE_OPENROUTER_API_KEY no .env (dev) ou passe OPENROUTER_API_KEY ao container (Docker).')
  }
  const baseBody = {
    temperature,
    messages: [
      { role: 'system', content: 'Você é o Oráculo do System-Drako. Responda sempre em português do Brasil.' },
      { role: 'user', content: userPrompt }
    ]
  }
  if (json) baseBody.response_format = { type: 'json_object' }

  const candidates = [model, ...FALLBACK_MODELS.filter(m => m !== model)]
  let lastErr
  for (const m of candidates) {
    try {
      const data = await requestOnce({ apiKey, model: m, body: baseBody })
      const content = data?.choices?.[0]?.message?.content || ''
      if (!json) return content
      return safeParseJSON(content)
    } catch (e) {
      lastErr = e
      if (!e.recoverable) throw e
    }
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
