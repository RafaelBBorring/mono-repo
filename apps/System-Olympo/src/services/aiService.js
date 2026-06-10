/**
 * aiService.js — Sistema Olympo 2.0
 * Motor de IA para geração e balanceamento de habilidades.
 *
 * CORREÇÕES v2.0:
 *  1. Passa valores calculados REAIS do personagem (vida, energia, dano base, ataque)
 *  2. Implementa TDH (Seção 14.4) e IPL/PP (Seção 14.5) completos e corretos
 *  3. Calcula e passa bônus de amplificação de Triagens e Módulos
 *  4. Respeita SCP (Seção 14.1) com as três camadas corretas
 *  5. Considera nível de evolução de cada habilidade ao calibrar valores
 */

import { WEAPONS as ALL_WEAPONS, WEAPON_RANKS as ALL_WEAPON_RANKS, RANK_LEVEL_BAND as RANK_BAND_MAP } from '../data/weapons'
import {
  calcVidaTotal, calcEnergiaTotal, calcPeTotal,
  calcCA, calcReacoes, calcDanoBase, calcPEHTotal,
  getAttrValue, getClassDef,
} from '../utils/calculator'
import { getModifier } from '../data/attributes'
import { buildEvolucaoContext, calcPEHSpent, normalizeSkillTags, getSkillTagChips } from '../utils/skillEvolution'
import { supabase } from '../lib/supabase'
import { getRaceLabel } from '../utils/raceCalculator'
import { calcEquipStats, getEquipmentRarity, EQUIPMENT_TYPES, ARMOR_TYPES } from '../data/equipment'
import { CLASSES } from '../data/classes'
import { SYSTEM_SKILLS, EFFECT_PARAM_DEFS } from '../data/systemSkills'
import { buildBalanceSystemPrompt as buildBalanceSystemPromptFromPrompts } from '../ai/prompts'

// Infra: chamadas de IA passam pela Supabase Edge Function para manter a chave fora do navegador.

const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-oss-120b:free'

const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL
const OPENROUTER_FUNCTION = import.meta.env.VITE_OPENROUTER_FUNCTION || 'openrouter-chat'
const OPENROUTER_FUNCTIONS = [...new Set([OPENROUTER_FUNCTION, 'openrouter-chat', 'openrouter-proxy'])]
const OPENROUTER_MAX_TOKENS = Math.max(Number(import.meta.env.VITE_OPENROUTER_MAX_TOKENS) || 120000, 120000)
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1500
const JSON_RESPONSE_FORMAT = { type: 'json_object' }
const JSON_REPAIR_MAX_CHARS = 12000
const PROMPT_TOKEN_CHAR_RATIO = 3
const AI_REQUEST_TIMEOUT_MS = Math.max(Number(import.meta.env.VITE_AI_REQUEST_TIMEOUT_MS) || 200000, 10000)
const JSON_REPAIR_TIMEOUT_MS = Math.max(Number(import.meta.env.VITE_JSON_REPAIR_TIMEOUT_MS) || 30000, 5000)
const POLLINATIONS_URL = import.meta.env.VITE_POLLINATIONS_URL || 'https://text.pollinations.ai/openai'
const POLLINATIONS_MODEL = import.meta.env.VITE_POLLINATIONS_MODEL || 'openai'

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isResponseFormatUnsupported(error) {
  const status = getStatus(error)
  const message = String(error?.message || error || '')
  return status === 400 && /response_format|structured output|json_schema|json object/i.test(message)
}

function extractJSON(response, { log = true } = {}) {
  let text = response.trim()
  text = text.replace(/```json\s*\n?/gi, '').replace(/```\s*\n?/g, '').trim()

  try { return JSON.parse(text) } catch {}

  const objectCandidate = extractBalancedJSON(text, '{', '}')
  if (objectCandidate) return objectCandidate

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')

  if (firstBrace !== -1 && lastBrace <= firstBrace) {
    for (let i = text.length; i >= firstBrace; i--) {
      const candidates = [i, i + 1, i + 2]
        .map(pos => text.slice(firstBrace, pos) + '}'.repeat(countOpen(text.slice(firstBrace, pos))))
        .filter(s => s.length > 2)
      for (const candidate of candidates) {
        try { return JSON.parse(candidate) } catch {}
      }
    }
  }

  const arrayCandidate = extractBalancedJSON(text, '[', ']')
  if (arrayCandidate) return arrayCandidate

  if (log) {
    console.error('[extractJSON] Falha ao parsear resposta da IA. Primeiros 500 chars:', text.slice(0, 500))
    console.error('[extractJSON] Ultimos 500 chars:', text.slice(-500))
  }
  throw new Error('A IA retornou um formato inválido. Tente novamente.')
}

function extractBalancedJSON(text, openChar, closeChar) {
  for (let start = 0; start < text.length; start++) {
    if (text[start] !== openChar) continue

    let depth = 0
    let inString = false
    let escaped = false

    for (let i = start; i < text.length; i++) {
      const ch = text[i]

      if (inString) {
        if (escaped) {
          escaped = false
        } else if (ch === '\\') {
          escaped = true
        } else if (ch === '"') {
          inString = false
        }
        continue
      }

      if (ch === '"') {
        inString = true
        continue
      }

      if (ch === openChar) depth++
      if (ch === closeChar) depth--

      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)) } catch { break }
      }
    }
  }

  return null
}

function countOpen(str) {
  let open = 0
  for (const ch of str) {
    if (ch === '{' || ch === '[') open++
    if (ch === '}' || ch === ']') open--
  }
  return Math.max(0, open)
}

function getRetryDelay(attempt, retryAfterSeconds = 0) {
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000
  }
  return BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500
}

function isRetryable(status) {
  return status === 429 || status === 502 || status === 503 || status === 504
}

function clampMaxTokens(maxTokens) {
  const requested = Number(maxTokens)
  const parsed = Number.isFinite(requested) ? requested : 4096
  return Math.max(16, Math.min(Math.floor(parsed), OPENROUTER_MAX_TOKENS))
}

function getStatus(error) {
  const raw = error?.status || error?.context?.status || 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function getMessageFromBody(body, fallback) {
  if (!body || typeof body !== 'object') return fallback
  if (typeof body.error === 'string') return body.error
  if (body.error && typeof body.error === 'object' && typeof body.error.message === 'string') {
    return body.error.message
  }
  if (typeof body.message === 'string') return body.message
  return fallback
}

function sanitizeProviderMessage(message) {
  const text = String(message || '').trim()
  if (!text) return 'Erro desconhecido do provedor de IA.'
  if (/<!doctype|<html|cloudflare|<\/body>|<\/html>/i.test(text)) {
    return 'Provedor de IA retornou HTML/Cloudflare em vez de JSON.'
  }
  return text.replace(/\s+/g, ' ').slice(0, 500)
}

async function readResponseBody(response) {
  const safeResponse = typeof response?.clone === 'function' ? response.clone() : response
  const contentType = safeResponse?.headers?.get?.('Content-Type') || ''

  if (contentType.includes('application/json')) {
    const body = await safeResponse.json().catch(() => null)
    return { body, text: '' }
  }

  const text = await safeResponse?.text?.().catch(() => '') || ''
  return { body: null, text }
}

function openRouterErrorMessage(status, message) {
  const clean = sanitizeProviderMessage(message || 'Erro desconhecido')
  if (status === 401) return `OpenRouter 401: chave API invalida ou revogada. (${clean})`
  if (status === 402) return `OpenRouter 402: creditos insuficientes na conta/chave. (${clean})`
  if (status === 403) return `OpenRouter 403: acesso negado pela chave, provider ou moderacao. (${clean})`
  if (status === 404) return `OpenRouter 404: modelo ou rota nao encontrado. (${clean})`
  if (status === 413) return `OpenRouter 413: prompt grande demais para esta requisicao. (${clean})`
  if (status === 429) return `OpenRouter 429: limite de requisicoes atingido. Aguarde e tente novamente. (${clean})`
  if (status === 502 || status === 503 || status === 504) return `OpenRouter ${status}: modelo/provider indisponivel no momento. (${clean})`
  return `OpenRouter ${status || ''}: ${clean}`.trim()
}

function createTaggedError(message, props = {}) {
  const err = new Error(message)
  Object.assign(err, props)
  return err
}

function withTimeout(promise, ms, message, props = {}) {
  let timer = null
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(createTaggedError(message, props)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function hasLikelyJSON(text) {
  const value = String(text || '')
  return value.includes('{') || value.includes('[')
}

function getTextContent(value) {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value.map(item => getTextContent(item)).filter(Boolean).join('\n').trim()
  }
  if (value && typeof value === 'object') {
    return getTextContent(value.text ?? value.content ?? value.value)
  }
  return ''
}

function addPollinationsInstruction(messages, wantsJson) {
  if (!Array.isArray(messages)) return messages
  const content = wantsJson
    ? 'Responda somente com um objeto JSON valido. O primeiro caractere deve ser { e o ultimo deve ser }. Nao use markdown, raciocinio nem texto fora do JSON.'
    : 'Retorne uma resposta final nao vazia.'
  return [{ role: 'system', content }, ...messages]
}

function createPollinationsBody(body) {
  const wantsJson = Boolean(body.response_format)
  const next = {
    ...body,
    model: POLLINATIONS_MODEL,
    messages: addPollinationsInstruction(body.messages, wantsJson),
  }
  delete next.response_format
  delete next.provider
  if (typeof next.max_tokens === 'number' && next.max_tokens < 1800) {
    next.max_tokens = 1800
  }
  return next
}

function extractCompletionContent(data, wantsJson = false) {
  const choices = data?.choices
  const firstChoice = Array.isArray(choices) ? choices[0] : null
  const message = firstChoice?.message
  const content = getTextContent(
    message?.content ??
    message?.reasoning ??
    message?.text ??
    firstChoice?.text ??
    data?.output_text ??
    data?.text ??
    data?.content ??
    data?.response
  )
  if (!wantsJson || !content) return content
  const objectStart = content.indexOf('{')
  const objectEnd = content.lastIndexOf('}')
  if (objectStart >= 0 && objectEnd > objectStart) return content.slice(objectStart, objectEnd + 1)
  return content
}

async function callPollinationsDirect(body, timeoutMs = AI_REQUEST_TIMEOUT_MS) {
  const wantsJson = Boolean(body.response_format)
  const response = await withTimeout(
    fetch(POLLINATIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPollinationsBody(body)),
    }),
    timeoutMs,
    `Timeout no fallback Pollinations apos ${Math.round(timeoutMs / 1000)}s.`,
    { status: 408, source: 'pollinations', timeoutMs }
  )

  if (!response.ok) {
    throw createTaggedError(`Pollinations fallback falhou (${response.status}).`, {
      status: response.status,
      source: 'pollinations',
    })
  }

  const data = await response.json().catch(() => null)
  const content = extractCompletionContent(data, wantsJson)
  if (!content) {
    throw createTaggedError('Pollinations fallback retornou resposta vazia.', {
      status: 502,
      source: 'pollinations',
    })
  }
  return content
}

function getAffordableTokenLimit(message) {
  const match = String(message || '').match(/can only afford\s+(\d+)/i)
  return match ? Number(match[1]) : 0
}

function getPromptTokenLimit(message) {
  const match = String(message || '').match(/Prompt tokens limit exceeded:\s*(\d+)\s*>\s*(\d+)/i)
  return match ? { requested: Number(match[1]), limit: Number(match[2]) } : null
}

function isEdgeTransportError(error) {
  const status = getStatus(error)
  const source = String(error?.source || error?.context?.source || '')
  const message = String(error?.message || error?.cause?.message || error || '')
  if (source === 'openrouter' || source === 'pollinations') return false
  return status === 0 || /Failed to send a request|Failed to fetch|NetworkError|CORS|ERR_FAILED|Load failed/i.test(message)
}

function isRecoverableEdgeFunctionError(error) {
  const status = getStatus(error)
  const source = String(error?.source || error?.context?.source || '')
  const message = String(error?.message || error || '')
  if (source === 'openrouter' || source === 'pollinations') return false
  return isEdgeTransportError(error) || status === 404 || (status === 401 && /User not found|JWT|authorization/i.test(message))
}

function estimatePromptTokens(messages = []) {
  const chars = messages.reduce((sum, msg) => sum + String(msg?.content || '').length, 0)
  return Math.ceil(chars / PROMPT_TOKEN_CHAR_RATIO)
}

function truncateMiddle(text, maxChars) {
  const value = String(text || '')
  if (value.length <= maxChars) return value
  if (maxChars <= 200) return value.slice(0, Math.max(0, maxChars))

  const marker = '\n\n[...contexto compactado para caber no limite da API...]\n\n'
  const available = Math.max(0, maxChars - marker.length)
  const head = Math.floor(available * 0.55)
  const tail = available - head
  return value.slice(0, head) + marker + value.slice(-tail)
}

function compactMessagesForPromptLimit(messages, promptLimitTokens = 0) {
  const limit = Number(promptLimitTokens)
  if (!Number.isFinite(limit) || limit <= 0) return messages

  const targetChars = Math.max(1800, Math.floor(limit * PROMPT_TOKEN_CHAR_RATIO * 0.78))
  const totalChars = messages.reduce((sum, msg) => sum + String(msg?.content || '').length, 0)
  if (totalChars <= targetChars) return messages

  const lastUserIndex = [...messages].map(m => m.role).lastIndexOf('user')
  const systemCount = Math.max(1, messages.filter(m => m.role === 'system').length)
  const otherCount = Math.max(1, messages.length - systemCount - (lastUserIndex >= 0 ? 1 : 0))
  const systemBudget = Math.floor(targetChars * 0.24)
  const lastUserBudget = Math.floor(targetChars * 0.62)
  const otherBudget = Math.max(120, targetChars - systemBudget - lastUserBudget)

  return messages.map((msg, index) => {
    if (!msg || typeof msg.content !== 'string') return msg
    if (index === lastUserIndex) return { ...msg, content: truncateMiddle(msg.content, lastUserBudget) }
    if (msg.role === 'system') return { ...msg, content: truncateMiddle(msg.content, Math.floor(systemBudget / systemCount)) }
    return { ...msg, content: truncateMiddle(msg.content, Math.floor(otherBudget / otherCount)) }
  })
}

function getReducedMaxTokens(currentMaxTokens, affordableMaxTokens = 0) {
  const current = clampMaxTokens(currentMaxTokens)
  const affordable = Number(affordableMaxTokens)
  if (Number.isFinite(affordable) && affordable >= 16) {
    return clampMaxTokens(Math.max(16, Math.floor(affordable * 0.85)))
  }
  return clampMaxTokens(Math.max(16, Math.floor(current * 0.6)))
}

async function normalizeFunctionError(error, functionName) {
  let status = getStatus(error)
  let retryAfter = 0
  let source = ''
  let rawMessage = error?.message || 'Edge Function failed'

  const response = error?.context
  if (response?.headers?.get) {
    retryAfter = Number(response.headers.get('Retry-After')) || 0
  }

  if (response?.clone || response?.text) {
    const { body, text } = await readResponseBody(response)
    if (body && 'status' in body) status = Number(body.status) || status
    if (body && typeof body.source === 'string') source = body.source
    rawMessage = getMessageFromBody(body, text.trim() || rawMessage)
  }

  let message
  if (source === 'openrouter' || /^OpenRouter/i.test(rawMessage)) {
    message = openRouterErrorMessage(status, rawMessage)
  } else if (status === 404) {
    message = `Edge Function "${functionName}" nao encontrada. Implante "openrouter-chat" ou "openrouter-proxy" no Supabase.`
  } else if (/OPENROUTER_API_KEY/i.test(rawMessage)) {
    message = `Edge Function "${functionName}" sem OPENROUTER_API_KEY configurada nos secrets do Supabase.`
  } else {
    message = `Edge Function "${functionName}" falhou${status ? ` (${status})` : ''}: ${sanitizeProviderMessage(rawMessage)}`
  }

  return createTaggedError(message, {
    status,
    retryAfter,
    source,
    functionName,
    affordableMaxTokens: getAffordableTokenLimit(rawMessage),
    promptTokenLimit: getPromptTokenLimit(rawMessage),
    cause: error,
  })
}

async function invokeOpenRouterFunction(body) {
  let lastError = null

  for (let i = 0; i < OPENROUTER_FUNCTIONS.length; i++) {
    const functionName = OPENROUTER_FUNCTIONS[i]
    const { data, error } = await supabase.functions.invoke(functionName, { body })
    if (!error) return data

    const normalized = await normalizeFunctionError(error, functionName)
    lastError = normalized

    const canTryNextAlias =
      normalized.source !== 'openrouter' &&
      i < OPENROUTER_FUNCTIONS.length - 1 &&
      isRecoverableEdgeFunctionError(normalized)

    if (canTryNextAlias) {
      console.warn(`[callAI] Edge Function "${functionName}" indisponivel (${normalized.status}), tentando proximo alias.`)
      continue
    }

    throw normalized
  }

  throw lastError || new Error('Nenhuma Edge Function OpenRouter disponivel.')
}

function withJsonInstruction(messages) {
  const instruction = [
    'Contrato de saida JSON estrito:',
    'retorne exatamente um objeto JSON valido e compacto.',
    'O primeiro caractere deve ser { e o ultimo deve ser }.',
    'Nao escreva raciocinio, analise, markdown, comentarios, texto antes/depois nem trailing commas.',
    'Faca qualquer verificacao internamente e coloque apenas o resumo necessario nos campos JSON.'
  ].join(' ')
  const next = [...messages]
  const firstSystemIndex = next.findIndex(m => m.role === 'system')

  if (firstSystemIndex >= 0) {
    next[firstSystemIndex] = {
      ...next[firstSystemIndex],
      content: `${next[firstSystemIndex].content}\n\n${instruction}`,
    }
  } else {
    next.unshift({ role: 'system', content: instruction })
  }

  return next
}

async function callAI(messages, { maxTokens = 4096, responseFormat = null, temperature = 0.35, timeoutMs = AI_REQUEST_TIMEOUT_MS } = {}) {
  let effectiveMessages = messages
  let effectiveMaxTokens = clampMaxTokens(maxTokens)
  let effectiveResponseFormat = responseFormat
  const effectiveTemperature = Number.isFinite(Number(temperature)) ? Number(temperature) : 0.35
  const maxProviderAttempts = MAX_RETRIES

  for (let attempt = 0; attempt <= maxProviderAttempts; attempt++) {
    const activeModel = OPENROUTER_MODEL
    try {
      const body = {
        model: activeModel,
        messages: effectiveMessages,
        temperature: effectiveTemperature,
        max_tokens: effectiveMaxTokens,
      }
      if (effectiveResponseFormat) body.response_format = effectiveResponseFormat

      const data = await withTimeout(
        invokeOpenRouterFunction(body),
        timeoutMs,
        `Timeout ao chamar a IA apos ${Math.round(timeoutMs / 1000)}s.`,
        { status: 408, source: 'openrouter', timeoutMs }
      )
      if (!data) throw new Error('Resposta vazia da Edge Function.')
      const msg = data.choices?.[0]?.message
      const content = msg?.content || msg?.reasoning || ''
      if (!content) {
        throw createTaggedError(`IA retornou conteudo vazio no modelo ${activeModel}.`, {
          status: 502,
          source: 'openrouter',
          model: activeModel,
        })
      }
      return content
    } catch (edgeError) {
      const status = getStatus(edgeError)
      console.warn('[callAI] Edge function falhou (status:', status, '):', edgeError?.message || edgeError)
      if (isResponseFormatUnsupported(edgeError)) {
        effectiveResponseFormat = null
        await sleep(250)
        continue
      }
      if (status === 413 || (status === 402 && attempt < MAX_RETRIES)) {
        const promptLimit = edgeError?.promptTokenLimit?.limit
        if (promptLimit) {
          const compactedMessages = compactMessagesForPromptLimit(effectiveMessages, promptLimit)
          if (estimatePromptTokens(compactedMessages) < estimatePromptTokens(effectiveMessages)) {
            effectiveMessages = compactedMessages
            effectiveMaxTokens = Math.min(effectiveMaxTokens, 900)
            await sleep(getRetryDelay(attempt))
            continue
          }
        }

        const reducedMaxTokens = getReducedMaxTokens(effectiveMaxTokens, edgeError?.affordableMaxTokens)
        if (reducedMaxTokens < effectiveMaxTokens) {
          effectiveMaxTokens = reducedMaxTokens
          await sleep(getRetryDelay(attempt))
          continue
        }
      }
      if (isRetryable(status) && attempt < MAX_RETRIES) {
        await sleep(getRetryDelay(attempt, edgeError?.retryAfter))
        continue
      }
      throw edgeError
    }
  }
  throw new Error('Falha apos multiplas tentativas. Aguarde alguns segundos e tente novamente.')
}

async function callAIJson(messages, options = {}) {
  const response = await callAI(withJsonInstruction(messages), {
    ...options,
    temperature: options.temperature ?? 0.1,
    responseFormat: JSON_RESPONSE_FORMAT,
  })

  try {
    return extractJSON(response, { log: false })
  } catch (firstError) {
    if (!hasLikelyJSON(response)) {
      console.warn('[callAIJson] Resposta sem JSON; pulando reparo e usando fallback local:', firstError?.message || firstError)
      throw createTaggedError('IA retornou raciocinio em vez de JSON. Usando fallback local.', {
        status: 502,
        source: 'openrouter',
        cause: firstError,
      })
    }

    console.warn('[callAIJson] JSON invalido, tentando reparo:', firstError?.message || firstError)
    const repairMessages = [
      {
        role: 'system',
        content: 'Voce e um extrator de JSON. Retorne exatamente um objeto JSON valido. O primeiro caractere deve ser { e o ultimo deve ser }. Nao inclua explicacoes, markdown, comentarios ou raciocinio.',
      },
      {
        role: 'user',
        content: `Extraia e corrija somente o objeto JSON da resposta abaixo. Preserve os campos e valores existentes. Se um campo foi cortado, complete com string vazia ou array vazio conforme apropriado. Nao crie texto fora do objeto.\n\nRESPOSTA:\n${String(response).slice(0, JSON_REPAIR_MAX_CHARS)}`,
      },
    ]

    const repaired = await callAI(repairMessages, {
      maxTokens: Math.min(options.maxTokens || OPENROUTER_MAX_TOKENS, OPENROUTER_MAX_TOKENS),
      temperature: 0,
      timeoutMs: JSON_REPAIR_TIMEOUT_MS,
      responseFormat: JSON_RESPONSE_FORMAT,
    })

    try {
      return extractJSON(repaired, { log: false })
    } catch (repairError) {
      console.error('[callAIJson] Reparo de JSON falhou:', repairError?.message || repairError)
      throw new Error('A IA retornou JSON invalido mesmo apos reparo. Tente novamente com uma solicitacao menor.')
    }
  }
}

async function callAIStream(messages, onChunk) {
  const streamMaxTokens = clampMaxTokens(4096)
  const body = { model: OPENROUTER_MODEL, messages, temperature: 0.35, max_tokens: streamMaxTokens, stream: true }

  try {
    const data = await invokeOpenRouterFunction(body)

    if (data && typeof data === 'object' && data.choices) {
      const content = data.choices?.[0]?.message?.content || ''
      if (onChunk) onChunk(content)
      return content
    }

    if (typeof data === 'string') {
      let full = ''
      const lines = data.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            const delta = parsed.choices?.[0]?.delta?.content || ''
            if (delta) {
              full += delta
              if (onChunk) onChunk(delta, full)
            }
          } catch {}
        }
      }
      return full
    }

    return typeof data === 'string' ? data : ''
  } catch (edgeErr) {
    throw edgeErr
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getLevelBand(nivel) {
  if (nivel <= 7)  return 'N1-7'
  if (nivel <= 15) return 'N8-15'
  if (nivel <= 22) return 'N16-22'
  if (nivel <= 30) return 'N23-30'
  if (nivel <= 38) return 'N31-38'
  return 'N39-50'
}

function getTriagemAmplifiers(char) {
  const tp   = char.triagemPrincipal || ''
  const tn   = char.triagemPrincipalNivel || 0
  const st   = char.subTriagem || ''
  const sn   = char.subTriagemNivel || 0
  const nivel = char.nivel || 1
  const sk   = char.skeletonPoints || {}
  const attrs = char.atributos || {}
  const valINT = getAttrValue(attrs, 'INT', sk, char)
  const amps = []

  if ((tp === 'ATIRADOR' && tn >= 0.2) || (st === 'ATIRADOR' && sn >= 0.2))
    amps.push(`Atirador 0.2: soma valor INT (${valINT}) no dano de armas`)
  if ((tp === 'COMBATE' && tn >= 0.2) || (st === 'COMBATE' && sn >= 0.2)) {
    const bonus = Math.floor(nivel / 10)
    amps.push(`Combate 0.2: +${bonus}d6+${bonus * 5} no dano base`)
  }
  if ((tp === 'COMBATE' && tn >= 0.5) || (st === 'COMBATE' && sn >= 0.5))
    amps.push('Combate 0.5: +AM no dano ao acertar crítico com habilidade')
  if ((tp === 'TÉCNICO' && tn >= 0.1) || (st === 'TÉCNICO' && sn >= 0.1))
    amps.push('Técnico 0.1: maior atributo somado no dano de arma')
  if ((tp === 'SOLDADO' && tn >= 0.6) || (st === 'SOLDADO' && sn >= 0.6))
    amps.push('Soldado 0.6: arma favorita recebe +3 dados de dano')
  if ((tp === 'LUTADOR' && tn >= 0.6) || (st === 'LUTADOR' && sn >= 0.6))
    amps.push('Lutador 0.6: crítico causa x1,5 no dano (2x/combate)')
  if ((tp === 'ASSASSINO' && tn >= 0.6) || (st === 'ASSASSINO' && sn >= 0.6))
    amps.push('Assassino 0.6: 2x/combate pode fazer ação com crítico garantido')

  return amps.length ? amps.join(' | ') : 'Nenhum amplificador de Triagem ativo'
}

function getModuleAmplifiers(char) {
  const mods = (char.modulosAdquiridos || []).map(m => m.id || m)
  const amps = []

  if (mods.includes('sobrecarga_arcana'))
    amps.push('Sobrecarga Arcana: proxima habilidade +50% dano OU +2 rodadas — 20 PE')
  if (mods.includes('arcanismo'))
    amps.push('Arcanismo: +50% efeito em 1 habilidade (exceto Ult), custo 2x Energia — N15+, AM 20+')
  if (mods.includes('golpe_devastador'))
    amps.push('Golpe Devastador: proximo ataque +100% FOR no dano — 15 PE')
  if (mods.includes('mira_letal'))
    amps.push('Mira Letal: proximo ranged +100% INT no dano — 15 PE')
  if (mods.includes('critico_aprimorado'))
    amps.push('Crítico Aprimorado: -2 na margem de crítico — 10 PE')
  if (mods.includes('aumento_poder'))
    amps.push('Aumento de Poder: pode evoluir 1 habilidade em 1 nível (até 2x) — requer N12+, AM 18+')

  return amps.length ? amps.join(' | ') : 'Nenhum amplificador de Módulo relevante'
}

function computeCharStats(char) {
  const sk     = char.skeletonPoints || {}
  const attrs  = char.atributos || {}
  const nivel  = char.nivel || 1
  const choices = char.choices || {}

  const totalAttr = (a) => getAttrValue(attrs, a, sk, char)
  const mod       = (a) => getModifier(totalAttr(a))

  const vidaTotal    = calcVidaTotal(char.classe, nivel, attrs, sk, choices, char.triagemPrincipal, char.triagemPrincipalNivel, char, char.subTriagem, char.subTriagemNivel)
  const energiaTotal = calcEnergiaTotal(char.classe, nivel, attrs, sk, choices, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char)
  const peTotal      = calcPeTotal(char.classe, nivel, choices, char)
  const caBase       = calcCA(attrs, sk, char.pericias, char)
  const danoBase     = calcDanoBase(char.classe, attrs, sk, nivel, char.subTriagem, char.subTriagemNivel, char.triagemPrincipal, char.triagemPrincipalNivel, char)
  const reacoes      = calcReacoes(attrs, sk, char.triagemPrincipal, char.triagemPrincipalNivel, char.subTriagem, char.subTriagemNivel, char)

  const pericias     = char.pericias || {}
  const maxTreino    = Math.max(pericias.Lutar || 0, pericias.Pontaria || 0)
  const grauBonus    = [0, 5, 10, 15, 20][maxTreino] || 0
  const attrAtaque   = Math.max(mod('FOR'), mod('DES'))
  const ataqueBase   = grauBonus + attrAtaque

  const armaRankDef   = (ALL_WEAPON_RANKS || []).find(r => r.rank === char.armaRank) || {}
  const armaDanoBonus = armaRankDef.danoBonusStr || armaRankDef.danoBonus || '+0'
  const armaSlots     = armaRankDef.slots || 0
  const equipStats    = calcEquipStats(char.equipamentos || [])

  return {
    nivel, band: getLevelBand(nivel),
    atributos: {
      FOR: totalAttr('FOR'), modFOR: mod('FOR'),
      DES: totalAttr('DES'), modDES: mod('DES'),
      CON: totalAttr('CON'), modCON: mod('CON'),
      INT: totalAttr('INT'), modINT: mod('INT'),
      APA: totalAttr('APA'), modAPA: mod('APA'),
      AM:  totalAttr('AM'),  modAM:  mod('AM'),
    },
    vidaTotal, energiaTotal, peTotal, caBase, reacoes, equipStats,
    danoBase, ataqueBaseNum: ataqueBase, ataqueBase: `d20+${ataqueBase}`,
    armaDanoBonus, armaSlots,
    triagem: `${char.triagemPrincipal || 'N/A'} (Nv ${char.triagemPrincipalNivel || 0}) | Sub: ${char.subTriagem || 'N/A'} (Nv ${char.subTriagemNivel || 0})`,
    triagemAmps: getTriagemAmplifiers(char),
    moduleAmps: getModuleAmplifiers(char),
  }
}

// ─── System prompt com protocolo real ─────────────────────────────────────

const LOCAL_AI_FALLBACK_NOTICE = 'Fallback local: provedores de IA indisponiveis; valores preservados para nao bloquear o fluxo. Revise manualmente ou tente novamente quando a IA voltar.'

function isAIProviderUnavailable(error) {
  const message = String(error?.message || error || '')
  const source = String(error?.source || error?.context?.source || '')
  const status = getStatus(error)
  if (source === 'openrouter' || source === 'pollinations') return true
  if ([402, 408, 429, 500, 502, 503, 504].includes(status)) return true
  return /OpenRouter|Pollinations|Edge Function|fallback|credit|credito|creditos|API|provider|indisponivel|timeout|network|Failed to fetch|IA retornou|JSON invalido/i.test(message)
}

async function withLocalAIFallback(label, operation, fallbackFactory) {
  try {
    return await operation()
  } catch (error) {
    if (!isAIProviderUnavailable(error)) throw error
    console.warn(`[${label}] usando fallback local:`, error?.message || error)
    return fallbackFactory(error)
  }
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function abilityText(ability) {
  return ability?.descricaoBalanceada || ability?.descricao || 'Descricao mecanica nao informada.'
}

function createLocalAbilityReview(ability, index) {
  const descricao = abilityText(ability)
  return {
    index,
    nome: ability?.nome || `Habilidade ${index + 1}`,
    tipo: ability?.tipo || 'Ativa',
    descricao: ability?.descricao || descricao,
    descricaoBalanceada: descricao,
    custoEnergia: toNumber(ability?.custoEnergia, 0),
    dano: ability?.dano || '',
    duracao: ability?.duracao || '',
    dt: ability?.dt || '',
    tags: normalizeSkillTags(ability || {}),
    valores: ability?.valores || {},
    status: ability?.status || 'Pendente',
    feedback: LOCAL_AI_FALLBACK_NOTICE,
  }
}

function createLocalWeaponAbilityReview(ability, index) {
  const descricao = abilityText(ability)
  return {
    index,
    nome: ability?.nome || `Habilidade da arma ${index + 1}`,
    descricao: ability?.descricao || descricao,
    descricaoBalanceada: descricao,
    tipo: ability?.tipo || 'Ativa',
    custo: ability?.custo || '',
    feedback: LOCAL_AI_FALLBACK_NOTICE,
  }
}

function createLocalBalanceResult(char) {
  return {
    habilidades: (char?.habilidades || []).map((ability, index) => createLocalAbilityReview(ability, index)),
    armaHabilidades: (char?.armaHabilidades || []).map((ability, index) => createLocalWeaponAbilityReview(ability, index)),
    systemSkillSuggestions: [],
    _fallback: 'local',
    _fallbackReason: LOCAL_AI_FALLBACK_NOTICE,
  }
}

function getAbilityNameFromPrompt(text) {
  const value = String(text || '')
  return (
    value.match(/Habilidade:\s*"([^"]+)"/i)?.[1] ||
    value.match(/Sobre a [^"]*"([^"]+)"/i)?.[1] ||
    value.match(/"([^"]+)"/)?.[1] ||
    ''
  ).trim()
}

function findAbilityForPrompt(char, userMessage) {
  const name = getAbilityNameFromPrompt(userMessage).toLowerCase()
  const abilities = [...(char?.habilidades || []), ...(char?.armaHabilidades || [])]
  return abilities.find(ability => String(ability?.nome || '').toLowerCase() === name) || abilities[0] || {}
}

function extractLocalAbilityOverrides(userMessage) {
  const text = String(userMessage || '')
  const energia = text.match(/(?:custo(?:Energia)?|energia)\D{0,24}(\d{1,4})/i)?.[1]
  const dano = text.match(/(?:dano)\s*(?:para|=|:)?\s*([0-9]+d[0-9]+(?:\s*[+\-]\s*(?:MOD|FOR|DES|CON|INT|AM|\d+))?|\d+\s*(?:de\s*)?dano)/i)?.[1]
  const duracao = text.match(/(?:duracao|duração)\s*(?:para|=|:)?\s*([^\n.;]+)/i)?.[1]

  return {
    ...(energia ? { custoEnergia: toNumber(energia, 0) } : {}),
    ...(dano ? { dano: dano.trim() } : {}),
    ...(duracao ? { duracao: duracao.trim() } : {}),
  }
}

function createLocalAbilityChatResponse(char, userMessage) {
  const ability = findAbilityForPrompt(char, userMessage)
  const overrides = extractLocalAbilityOverrides(userMessage)
  const hasOverrides = Object.keys(overrides).length > 0
  const fallbackMessage = hasOverrides
    ? 'Fallback local: IA externa indisponivel; apliquei somente os valores explicitos detectados no pedido do mestre. Revise manualmente.'
    : LOCAL_AI_FALLBACK_NOTICE
  const payload = {
    nome: ability?.nome || 'Habilidade',
    custoEnergia: overrides.custoEnergia ?? toNumber(ability?.custoEnergia, 0),
    dano: overrides.dano ?? ability?.dano ?? '',
    duracao: overrides.duracao ?? ability?.duracao ?? '',
    dt: ability?.dt || '',
    tags: normalizeSkillTags(ability || {}),
    valores: ability?.valores || {},
    descricaoBalanceada: abilityText(ability),
    feedback: fallbackMessage,
  }
  return `\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n${fallbackMessage}`
}

function createLocalWeaponAbilitiesResult(count, weaponName, weaponBand, userDesc) {
  const total = Math.max(1, toNumber(count, 1))
  return {
    habilidades: Array.from({ length: total }, (_, index) => ({
      nome: `${weaponName || 'Arma'} - tecnica ${index + 1}`,
      potencia: 'Fraca',
      tipo: index === 0 ? 'Ativa' : 'Passiva',
      custo: index === 0 ? '5 PE' : '',
      descricao: userDesc || `Tecnica ${weaponBand || 'N1-7'} preservada em modo local. Defina a mecanica final quando a IA voltar.`,
      feedback: LOCAL_AI_FALLBACK_NOTICE,
    })),
    _fallback: 'local',
  }
}

function createLocalEnchantmentResult(enchantment) {
  const description = enchantment?.descricaoBalanceada || enchantment?.descricao || enchantment?.effect || ''
  return {
    nome: enchantment?.nome || enchantment?.name || 'Encantamento',
    tipo: enchantment?.tipo || 'Passiva',
    alvo: enchantment?.alvo || 'Ambos',
    custo: enchantment?.custo || '',
    descricaoBalanceada: description,
    status: 'Revisao necessaria',
    feedback: LOCAL_AI_FALLBACK_NOTICE,
    _fallback: 'local',
  }
}

function createLocalGeneratedAbilitiesResult(types, description) {
  return {
    habilidades: types.map((tipo, index) => ({
      tipo,
      nome: `${tipo} ${index + 1}`,
      descricao: description || `Conceito preservado em modo local para ${tipo}. Complete os valores mecanicos quando a IA voltar.`,
      custoEnergia: tipo === 'Passiva' ? 0 : 1,
      dano: '',
      duracao: '',
      dt: '',
      tags: tipo === 'Passiva' ? [] : ['custoEnergia'],
      valores: tipo === 'Passiva' ? {} : { custoEnergia: 1 },
    })),
    _fallback: 'local',
  }
}

function createLocalMysticDraftResult(draft) {
  return {
    name: draft?.name || draft?.nome || 'Rascunho mistico',
    circle: toNumber(draft?.circle ?? draft?.circulo, 1),
    category: draft?.category || draft?.categoria || 'Utilidade',
    pe_cost: toNumber(draft?.pe_cost ?? draft?.custo_pe, 0),
    min_level: toNumber(draft?.min_level ?? draft?.nivel_minimo, 1),
    action_cost: draft?.action_cost || draft?.custo_acao || 'Acao Padrao',
    duration: draft?.duration || draft?.duracao || 'Instantaneo',
    range: draft?.range || draft?.alcance || 'Toque',
    short_description: draft?.short_description || draft?.descricao_curta || draft?.description || draft?.descricao || '',
    effect: draft?.effect || draft?.efeito || draft?.description || draft?.descricao || '',
    source_kind: draft?.source_kind || 'neutro',
    source_name: draft?.source_name || draft?.fonte || 'Fonte indefinida',
    law_name: draft?.law_name || draft?.lei || 'Lei indefinida',
    price: draft?.price || draft?.preco || '',
    rupture_risk: toNumber(draft?.rupture_risk ?? draft?.risco_ruptura, 1),
    protocol_layer: toNumber(draft?.protocol_layer ?? draft?.camada_protocolo, 2),
    pp_estimate: toNumber(draft?.pp_estimate ?? draft?.pp_estimado, 0),
    tags: Array.isArray(draft?.tags) ? draft.tags : [],
    ai_feedback: LOCAL_AI_FALLBACK_NOTICE,
    _fallback: 'local',
  }
}

function normalizeLegendaryAbilities(list = [], fallbackPrefix, defaultCost = 0) {
  return (Array.isArray(list) ? list : []).map((ability, index) => ({
    nome: ability?.nome || ability?.name || `${fallbackPrefix} ${index + 1}`,
    descricao: ability?.descricao || ability?.description || '',
    custoPE: toNumber(ability?.custoPE ?? ability?.pe_cost, defaultCost),
  }))
}

function createLocalLegendaryWeaponResult(draft, powerLevel) {
  const habilidades = draft?.habilidades || {}
  return {
    name: draft?.name || draft?.nome || 'Arma lendaria',
    dano: draft?.dano || '',
    attr: draft?.attr || draft?.atributo || 'FOR',
    effect: draft?.effect || draft?.efeito || '',
    power_level: powerLevel || draft?.power_level || 'notavel',
    lore: draft?.lore || draft?.historia || '',
    habilidades: {
      passivas: normalizeLegendaryAbilities(habilidades.passivas, 'Passiva', 0),
      ativas: normalizeLegendaryAbilities(habilidades.ativas, 'Ativa', 10),
      ultimates: normalizeLegendaryAbilities(habilidades.ultimates, 'Ultimate', 30),
    },
    ai_feedback: LOCAL_AI_FALLBACK_NOTICE,
    _fallback: 'local',
  }
}

function createLocalEquipmentAbilitiesResult(totalSlots, activeSlots, passiveSlots, typeLabel, userDesc) {
  const abilities = []
  for (let index = 0; index < activeSlots; index++) {
    abilities.push({
      nome: `${typeLabel || 'Equipamento'} - ativacao ${index + 1}`,
      descricao: userDesc || 'Habilidade ativa preservada em modo local. Defina custo, gatilho e duracao quando a IA voltar.',
      tipo: 'Ativa',
      efeito: LOCAL_AI_FALLBACK_NOTICE,
    })
  }
  for (let index = 0; index < passiveSlots; index++) {
    abilities.push({
      nome: `${typeLabel || 'Equipamento'} - passiva ${index + 1}`,
      descricao: userDesc || 'Habilidade passiva preservada em modo local. Defina o efeito mecanico quando a IA voltar.',
      tipo: 'Passiva',
      efeito: LOCAL_AI_FALLBACK_NOTICE,
    })
  }
  while (abilities.length < totalSlots) {
    abilities.push({
      nome: `${typeLabel || 'Equipamento'} - efeito ${abilities.length + 1}`,
      descricao: userDesc || 'Efeito preservado em modo local.',
      tipo: 'Passiva',
      efeito: LOCAL_AI_FALLBACK_NOTICE,
    })
  }
  return { passivas: abilities.slice(0, totalSlots), _fallback: 'local' }
}

function estimateLocalItemWeight(nome, descricao) {
  const text = `${nome || ''} ${descricao || ''}`.toLowerCase()
  if (/anel|brinco|colar|amuleto|pingente/.test(text)) return 0.1
  if (/pocao|frasco|pergaminho/.test(text)) return 0.3
  if (/adaga|faca/.test(text)) return 0.5
  if (/pistola/.test(text)) return 1
  if (/espada|katana|arco|besta|chicote/.test(text)) return 1.5
  if (/rifle|escopeta|lanca|lan[cç]a/.test(text)) return 3.5
  if (/escudo/.test(text)) return 6
  if (/armadura|colete/.test(text)) return 12
  if (/bau|caixa/.test(text)) return 20
  return null
}

function buildCrossClassContext(nivel) {
  const refAttrs = { FOR: 10, DES: 14, CON: 14, INT: 12, APA: 10, AM: 16 }
  const sk = {}
  const choices = {}
  const results = {}
  for (const [id, cls] of Object.entries(CLASSES)) {
    const hp = calcVidaTotal(id, nivel, refAttrs, sk, choices, null, 0, undefined)
    const en = calcEnergiaTotal(id, nivel, refAttrs, sk, choices, null, 0, null, 0, undefined)
    results[id] = { hp, energia: en, name: cls.name }
  }
  return results
}

function buildSystemContext(targetContext = null) {
  return buildBalanceSystemPromptFromPrompts({ targetContext })
}

// ─── analyzeBalance ───────────────────────────────────────────────────────

async function analyzeBalanceWithAI(char, direction = null, targetContext = null) {
  const stats  = computeCharStats(char)
  const evoCtx = buildEvolucaoContext(char.habilidades, char.nivel || 1)
  const pehTotal = calcPEHTotal(char.classe || '', char.nivel || 1, char.choices || {}, char.modulosAdquiridos || [], char)
  const pehSpent = calcPEHSpent(char.habilidades)

  const fichaCompleta = `
FICHA CALCULADA REAL DO PERSONAGEM:
Nome: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nível: ${stats.nivel} | Faixa: ${stats.band} | Raça: ${char.raca || 'N/A'} (${char.racaTipo || 'N/A'})
Atributos: FOR ${stats.atributos.FOR}(Mod${stats.atributos.modFOR}) | DES ${stats.atributos.DES}(Mod${stats.atributos.modDES}) | CON ${stats.atributos.CON}(Mod${stats.atributos.modCON}) | INT ${stats.atributos.INT}(Mod${stats.atributos.modINT}) | APA ${stats.atributos.APA} | AM ${stats.atributos.AM}(Mod${stats.atributos.modAM})
Vida Total: ${stats.vidaTotal} | Energia: ${stats.energiaTotal} | PE: ${stats.peTotal} | CA: ${stats.caBase} | Reações: ${stats.reacoes}
Equipamentos equipados: Armadura ${stats.equipStats.totalArmor}/${stats.equipStats.totalArmorMax} | Crit +${stats.equipStats.totalCrit}% | Dano +${stats.equipStats.totalDamage}
Sets ativos: ${stats.equipStats.activeSetBonuses.map(s => `${s.type.label} ${s.count}/4 (${s.bonus.label}: ${s.bonus.bonus})`).join(' | ') || 'Nenhum'}
Dano Base de Classe: ${stats.danoBase} | Bônus Arma (${char.armaRank}): ${stats.armaDanoBonus} | Ataque Base: ${stats.ataqueBase} (valor numérico: +${stats.ataqueBaseNum})
DANO TOTAL BASE (sem habilidades): ${stats.danoBase} + ${stats.armaDanoBonus}
PEH Total disponível: ${pehTotal} | PEH gasto: ${pehSpent} | PEH restante: ${pehTotal - pehSpent}
Triagens: ${stats.triagem}
Amplificadores de Triagem: ${stats.triagemAmps}
Amplificadores de Módulo: ${stats.moduleAmps}
Módulos: ${(char.modulosAdquiridos || []).map(m => m.id || m).join(', ') || 'Nenhum'}
Perícias: ${Object.entries(char.pericias || {}).filter(([,v]) => v > 0).map(([k,v]) => `${k}(grau${v})`).join(', ') || 'Nenhuma'}

═══ REFERÊNCIA CROSS-CLASS (Nível ${stats.nivel}) ═══
Use estes valores como âncora para julgar se danos/bônus são excessivos:
${(() => { const cc = buildCrossClassContext(stats.nivel); return Object.entries(cc).map(([, c]) => `${c.name}: HP~${c.hp} | Energia~${c.energia}`).join('\n') })()}

═══ ANÁLISE DE IMPACTO ═══
- Se uma habilidade causa dano > ${Math.round((() => { const cc = buildCrossClassContext(stats.nivel); return (cc.GUERREIRO?.hp || 600) * 0.4 })())} (40% HP Guerreiro), REQUER limitações severas.
- Energia Total do personagem: ${stats.energiaTotal}. Custo de ${Math.round(stats.energiaTotal * 0.4)}E = 40% da energia total.

VALORES BASE PARA CÁLCULO LCP:
- Ataque Base numérico: +${stats.ataqueBaseNum}
- CA Base: ${stats.caBase}
- Limite LCP Ataque para ${stats.band}: ${stats.band === 'N1-7' ? '+18' : stats.band === 'N8-15' ? '+26' : stats.band === 'N16-22' ? '+30' : '+42'}
- Limite LCP Esquiva para ${stats.band}: ${stats.band === 'N1-7' ? '+18' : stats.band === 'N8-15' ? '+26' : stats.band === 'N16-22' ? '+30' : '+42'}
- Limite LCP CA bônus para ${stats.band}: ${stats.band === 'N1-7' ? '+4' : stats.band === 'N8-15' ? '+6' : stats.band === 'N16-22' ? '+6' : '+10'}
- Limite LCP Ataques Extras para ${stats.band}: ${stats.band === 'N1-7' ? '+1' : stats.band === 'N8-15' ? '+1' : stats.band === 'N16-22' ? '+1' : '+2'}
- Bônus MÁXIMO de habilidades no Ataque: ${(() => { const cap = stats.band === 'N1-7' ? 18 : stats.band === 'N8-15' ? 26 : stats.band === 'N16-22' ? 30 : 42; return '+' + (cap - stats.ataqueBaseNum); })()}
`

  const habilidadesData = (char.habilidades || []).map((h, i) => {
    const evo = evoCtx.find(e => e.index === i) || {}
    return {
      index: i, tipo: h.tipo, nome: h.nome || 'Sem nome',
      descricao: h.descricao || '', custoEnergia: h.custoEnergia || 0,
      dano: h.dano || '', duracao: h.duracao || '', dt: h.dt || '',
      tags: normalizeSkillTags(h),
      tagChips: getSkillTagChips(h),
      valores: h.valores || {},
      status: h.status || 'Pendente',
      evolucaoNivel: evo.evolucaoNivel || 0,
      bracket: evo.bracket || 'FRACA',
      tdhBracketEfetivo: evo.tdhBracketEfetivo || evo.bracket || 'FRACA',
      instrucaoEvolucao: evo.instrucaoIA || 'Calibrar para valores base.',
      jogadorJaDefiniuValores: !!(h.dano || h.custoEnergia || h.duracao || h.dt),
    }
  })

  const armaHabs = (char.armaHabilidades || []).map((h, i) => ({
    index: i, tipo: 'arma', nome: h.nome || 'Sem nome',
    descricao: h.descricao || '', potencia: h.potencia || 'Fraca',
    tipoHabilidade: h.tipo || 'Ativa', custo: h.custo || '',
    armaRank: char.armaRank || 'Comum',
    armaFaixa: RANK_BAND_MAP[char.armaRank] || 'N1-5',
  }))

  const userMessage = `${fichaCompleta}

HABILIDADES (para revisar e balancear):
${JSON.stringify(habilidadesData, null, 2)}

HABILIDADES DA ARMA:
${JSON.stringify(armaHabs, null, 2)}

CATALOGO DE SKILLS SISTEMICAS DISPONIVEIS AO MESTRE:
${JSON.stringify(SYSTEM_SKILLS.map(s => ({ id: s.id, name: s.name, category: s.category, short: s.short, effectTypes: s.effectTypes })), null, 2)}

TIPOS DE EFEITO E PARAMETROS:
${JSON.stringify(Object.entries(EFFECT_PARAM_DEFS).map(([type, def]) => ({ type, label: def.label, params: Object.entries(def.params).map(([k, p]) => ({ key: k, label: p.label, type: p.type, default: p.default })) })), null, 2)}

${direction === 'buff' ? '⚠️ DIREÇÃO DO MESTRE: BUFF — O mestre julga que as habilidades estão FRACAS DEMAIS. Aumente danos em ~30-50%, reduza custos em ~20%, aumente durações. Aplique o TDH EFETIVO como MÍNIMO, não como teto. Se a habilidade está dentro do TDH mas parece subpotente, BUFF mesmo assim. O mestre tem a palavra final.\n' : ''}${direction === 'nerf' ? '⚠️ DIREÇÃO DO MESTRE: NERF — O mestre julga que as habilidades estão FORTES DEMAIS. Reduza danos em ~30-50%, aumente custos em ~20%, reduza durações, adicione restrições. Seja AGRESSIVO na redução — o mestre quer equilibrar para baixo.\n' : ''}  INSTRUÇÕES CRÍTICAS:
- Faixa: ${stats.band}. Use TDH e IPL/PP desta faixa como referência.
- O dano da habilidade é EXTRA ao dano base+arma+atributo que o personagem já possui.
- PEH Total: ${pehTotal} | Gasto: ${pehSpent}. Habilidades com evolucaoNivel > 0 receberam INVESTIMENTO do jogador e devem ser proporcionais.
- REGRAS DE TDH EFETIVO: cada habilidade tem um campo "tdhBracketEfetivo". USE ESSE CAMPO para consultar o teto de dano na tabela TDH, NÃO use o campo "bracket". Exemplo: se bracket=FRACA mas tdhBracketEfetivo=FORTE, use o TDH de Forte.
- Se jogadorJaDefiniuValores=true, ANALISE se estão adequados. Ajuste se exceder o TDH EFETIVO (não o bracket base) ou criar combos quebrados.
- Habilidades com condições difíceis de ativação podem ter valores maiores que o teto do bracket.
- NUNCA aprove cegamente. Verifique combos e acumulações.
- DT: SEMPRE especifique atributo (ex: "DT 18 Constituicao") ou pericia (ex: "DT 22 Fortitude"). NUNCA use "teste de resistencia" generico. DT por pericia = DT atributo equivalente + 3-5.
- DURACAO: NAO adicione duracao a habilidades instantaneas. Somente inclua duracao se a descricao original menciona tempo/rodadas.
- TAGS: Retorne "tags" e "valores" para cada habilidade. CA e Classe de Armadura usam a tag "bonusCA". Habilidades instantaneas NAO recebem tag "duracao" e devem retornar duracao vazia/null.
- PEH POR TAG: escale somente as tags reconhecidas no campo "instrucaoEvolucao". Se a habilidade nao tem tag "dano", nao adicione dano; se nao tem tag "duracao", nao adicione rodadas.

VERIFICAÇÃO CUMULATIVA OBRIGATÓRIA (LCP + ANTI-ABUSO):
Faca esta verificacao internamente, sem listar passos fora do JSON:
1. Identifique TODOS os bonus de ataque de todas as habilidades. Some: ${stats.ataqueBaseNum} (base) + TOTAL_BONUS_HABILIDADES. Se > limite da faixa, REDUZA.
2. Identifique TODOS os bonus de esquiva/defesa. Mesma verificacao.
3. Identifique TODOS os bonus de CA. Verifique contra limite.
4. Identifique TODOS os ataques extras. Verifique contra limite.
5. Para CADA habilidade, verificar: dano vs HP Cross-Class (40% do Guerreiro HP = limite de atenção).
6. Verificar COMBOS: habilidade A amplifica habilidade B. Qual o pior cenário? Está dentro de 150% TDH?
7. Se uma habilidade for INERENTEMENTE QUEBRADA (multiplicador sem limite, amplificador global sem contrapeso viável), marque status "irbalanceavel" e explique no feedback o que o jogador deve alterar no CONCEITO.

Se uma Passiva altera progressao, recursos permanentes, criacao de armas/equipamentos ou outro subsistema, sugira uma Skill em "systemSkillSuggestions". Use apenas IDs do catalogo; se nenhuma encaixar, use "manual_integration". Para CADA sugestao, inclua "effects" com os tipos de efeito apropriados e parametros extraidos da descricao da passiva (valores numericos, intervalos, etc). Use os tipos de efeito listados no catalogo acima e preencha os parametros com os valores detectados na passiva.

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    {
      "index": 0,
      "nome": "mantenha o nome original",
      "descricao": "MANTEHA EXATAMENTE a descrição original do jogador, palavra por palavra.",
      "descricaoBalanceada": "A MESMA descrição com valores numéricos atualizados. Se adicionou limitadores, incorpore naturalmente no texto.",
      "custoEnergia": numero_ajustado,
      "dano": "XdY+MOD ajustado ou vazio",
      "duracao": "X rodadas ajustado ou vazio/null se instantanea",
      "dt": "DT <numero> <Atributo|Pericia> ou vazio",
      "tags": ["custoEnergia", "bonusCA"],
      "valores": { "custoEnergia": 0, "bonusCA": "+2" },
      "status": "aprovada|ajustada|irbalanceavel",
      "feedback": "explique: 1) análise do conceito 2) valores alterados (antes→depois) 3) referência TDH/PEH/LCP 4) combo detectado 5) se irbalanceavel, o que o jogador deve mudar"
    }
  ],
  "armaHabilidades": [
    {
      "index": 0,
      "nome": "mantenha o nome",
      "descricao": "MANTEHA a descrição original.",
      "descricaoBalanceada": "Descrição com valores atualizados.",
      "tipo": "Ativa ou Passiva",
      "custo": "custo ajustado",
      "feedback": "explicação"
    }
  ],
  "systemSkillSuggestions": [
    {
      "skillId": "id_da_skill_do_catalogo",
      "abilityIndex": 0,
      "title": "titulo curto para o mestre",
      "message": "por que esta passiva precisa ou se beneficia dessa Skill",
      "details": "detalhes da passiva e impacto esperado",
      "source": "ai",
      "suggestedEffects": [
        { "type": "effect_type_do_catalogo", "amount": 2, "every": 5 }
      ]
    }
  ]
}`

  const habilidadesCount = habilidadesData.length
  const needsChunking = habilidadesCount > 1

  if (needsChunking) {
    const chunkSize = 1
    const chunks = []
    for (let i = 0; i < habilidadesData.length; i += chunkSize) {
      chunks.push(habilidadesData.slice(i, i + chunkSize))
    }

    const allResults = { habilidades: [], armaHabilidades: [], systemSkillSuggestions: [] }

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunkMessage = `${fichaCompleta}

LOTE ${ci + 1}/${chunks.length} de HABILIDADES (analise SOMENTE este lote):
${JSON.stringify(chunks[ci], null, 2)}

${ci === 0 ? `HABILIDADES DA ARMA:\n${JSON.stringify(armaHabs, null, 2)}` : '(armaHabilidades ja analisadas no lote anterior - NAO repita)'}

CATALOGO DE SKILLS SISTEMICAS DISPONIVEIS AO MESTRE:
${JSON.stringify(SYSTEM_SKILLS.map(s => ({ id: s.id, name: s.name, category: s.category, short: s.short, effectTypes: s.effectTypes })), null, 2)}

TIPOS DE EFEITO E PARAMETROS:
${JSON.stringify(Object.entries(EFFECT_PARAM_DEFS).map(([type, def]) => ({ type, label: def.label, params: Object.entries(def.params).map(([k, p]) => ({ key: k, label: p.label, type: p.type, default: p.default })) })), null, 2)}

${direction === 'buff' ? '⚠️ DIREÇÃO DO MESTRE: BUFF — Aumente danos ~30-50%, reduza custos ~20%, aumente durações. Use TDH EFETIVO como MÍNIMO.\n' : ''}${direction === 'nerf' ? '⚠️ DIREÇÃO DO MESTRE: NERF — Reduza danos ~30-50%, aumente custos ~20%, reduza durações, adicione restrições.\n' : ''}INSTRUÇÕES CRÍTICAS:
- Faixa: ${stats.band}. Use TDH e IPL/PP desta faixa como referência.
- O dano da habilidade é EXTRA ao dano base+arma+atributo que o personagem já possui.
- PEH Total: ${pehTotal} | Gasto: ${pehSpent}. Habilidades com evolucaoNivel > 0 receberam INVESTIMENTO do jogador e devem ser proporcionais.
- REGRAS DE TDH EFETIVO: cada habilidade tem um campo "tdhBracketEfetivo". USE ESSE CAMPO para consultar o teto de dano na tabela TDH, NÃO use o campo "bracket". Exemplo: se bracket=FRACA mas tdhBracketEfetivo=FORTE, use o TDH de Forte.
- Se jogadorJaDefiniuValores=true, ANALISE se estão adequados. Ajuste se exceder o TDH EFETIVO (não o bracket base) ou criar combos quebrados.
- Habilidades com condições difíceis de ativação podem ter valores maiores que o teto do bracket.
- NUNCA aprove cegamente. Verifique combos e acumulações.
- DT: SEMPRE especifique atributo (ex: "DT 18 Constituicao") ou pericia (ex: "DT 22 Fortitude"). NUNCA use "teste de resistencia" generico. DT por pericia = DT atributo equivalente + 3-5.
- DURACAO: NAO adicione duracao a habilidades instantaneas. Somente inclua duracao se a descricao original menciona tempo/rodadas.
- TAGS: Retorne "tags" e "valores" para cada habilidade. CA e Classe de Armadura usam a tag "bonusCA". Habilidades instantaneas NAO recebem tag "duracao" e devem retornar duracao vazia/null.
- PEH POR TAG: escale somente as tags reconhecidas no campo "instrucaoEvolucao". Se a habilidade nao tem tag "dano", nao adicione dano; se nao tem tag "duracao", nao adicione rodadas.

VERIFICAÇÃO CUMULATIVA OBRIGATÓRIA (LCP + ANTI-ABUSO):
Faca esta verificacao internamente, sem listar passos fora do JSON:
1. Identifique TODOS os bonus de ataque das habilidades DESTE LOTE. Some: ${stats.ataqueBaseNum} (base) + TOTAL_BONUS_HABILIDADES. Se > limite da faixa, REDUZA.
2. Identifique TODOS os bonus de esquiva/defesa. Mesma verificacao.
3. Identifique TODOS os bonus de CA. Verifique contra limite.
4. Identifique TODOS os ataques extras. Verifique contra limite.
5. Para CADA habilidade, verificar: dano vs HP Cross-Class (40% do Guerreiro HP = limite de atenção).
6. Verificar COMBOS: habilidade A amplifica habilidade B. Qual o pior cenário? Está dentro de 150% TDH?

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    {
      "index": ${chunks[ci][0]?.index ?? 0},
      "nome": "mantenha o nome original",
      "descricao": "MANTEHA EXATAMENTE a descrição original do jogador.",
      "descricaoBalanceada": "A MESMA descrição com valores numéricos atualizados.",
      "custoEnergia": 0,
      "dano": "XdY+MOD ajustado ou vazio",
      "duracao": "X rodadas ajustado ou vazio/null se instantanea",
      "dt": "DT <numero> <Atributo|Pericia> ou vazio",
      "tags": ["custoEnergia", "bonusCA"],
      "valores": { "custoEnergia": 0, "bonusCA": "+2" },
      "status": "aprovada|ajustada|irbalanceavel",
      "feedback": "explique"
    }
  ]${ci === 0 ? `,
  "armaHabilidades": [
    {
      "index": 0,
      "nome": "mantenha o nome",
      "descricao": "MANTEHA a descrição original.",
      "descricaoBalanceada": "Descrição com valores atualizados.",
      "tipo": "Ativa ou Passiva",
      "custo": "custo ajustado",
      "feedback": "explicação"
    }
  ],
  "systemSkillSuggestions": []` : ''}
}`

      const chunkResult = await callAIJson([
        { role: 'system', content: buildSystemContext(targetContext) },
        { role: 'user', content: chunkMessage },
      ], { maxTokens: 8192 })

      if (chunkResult.habilidades) allResults.habilidades.push(...chunkResult.habilidades)
      if (ci === 0 && chunkResult.armaHabilidades) allResults.armaHabilidades = chunkResult.armaHabilidades
      if (ci === 0 && chunkResult.systemSkillSuggestions) allResults.systemSkillSuggestions = chunkResult.systemSkillSuggestions
    }

    return allResults
  }

  const response = await callAIJson([
    { role: 'system', content: buildSystemContext(targetContext) },
    { role: 'user',   content: userMessage },
  ], { maxTokens: 16384 })
  return response

  try {
    return extractJSON(response)
  } catch {
    throw new Error('A IA retornou um formato inválido. Tente novamente.')
  }
}

// ─── generateWeaponAbilities ──────────────────────────────────────────────

export async function analyzeBalance(char, direction = null, targetContext = null) {
  return withLocalAIFallback(
    'analyzeBalance',
    () => analyzeBalanceWithAI(char, direction, targetContext),
    () => createLocalBalanceResult(char)
  )
}

export async function generateWeaponAbilities(char, weaponId, weaponRank, slots, userDesc, count) {
  const sk     = char.skeletonPoints || {}
  const attrs  = char.atributos || {}
  const totalAttr = (a) => getAttrValue(attrs, a, sk, char)
  const weaponDef = ALL_WEAPONS.find(w => w.id === weaponId)
  const weaponName = weaponDef?.name || weaponId
  const weaponDano = weaponDef?.dano || '?'
  const weaponMec = weaponDef?.mec || ''
  const weaponBand = RANK_BAND_MAP[weaponRank] || 'N1-7'

  const existingHabs = (char.armaHabilidades || []).map((h, i) => ({
    index: i, nome: h.nome || '', descricao: h.descricao || '', potencia: h.potencia || 'Fraca', tipo: h.tipo || 'Ativa', custo: h.custo || '',
  }))

  const prompt = `
VOCE E O ORACULO — MOTOR DE BALANCEAMENTO DE ARMAS DO SISTEMA OLYMPO 2.0.

CONTEXTO DO BALANCEAMENTO DE ARMA:
O nivel de referencia para balancear as habilidades da arma NAO e o nivel do personagem — e o RANK DA ARMA.
Cada rank mapeia para uma faixa de poder equivalente a um nivel de personagem:
- Comum → N1-5 | Incomum → N3-8 | Raro → N6-12
- Épico → N10-16 | Heroico → N14-20 | Ancestral → N18-25
- Mítico → N22-28 | Transcendente → N26-30

ARMA ATUAL: ${weaponName} | Dano base: ${weaponDano} | Mecânica: ${weaponMec}
RANK DA ARMA: ${weaponRank} | Faixa de poder equivalente: ${weaponBand}
Crie EXATAMENTE ${count} habilidade${count > 1 ? 's' : ''}. Total slots NAO pode exceder ${slots}.
Slots: Fraca=1, Média=2, Forte=3.

PERSONAGEM (contexto adicional): ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nível: ${char.nivel || 1}
FOR ${totalAttr('FOR')}(Mod${getModifier(totalAttr('FOR'))}) | DES ${totalAttr('DES')}(Mod${getModifier(totalAttr('DES'))}) | INT ${totalAttr('INT')}(Mod${getModifier(totalAttr('INT'))}) | AM ${totalAttr('AM')}
Triagem: ${char.triagemPrincipal || 'Nenhuma'} | Módulos: ${getModuleAmplifiers(char)}
${userDesc ? `\nDESCRIÇÃO DO JOGADOR: "${userDesc}"` : ''}

REGRAS DE BALANCEAMENTO POR RANK DA ARMA:
Use a faixa ${weaponBand} como referencia para o TDH e IPL:

TDH (TETO DE DANO POR HABILIDADE DA ARMA):
N1-5:  Fraca=2d6+8   | Media=3d8+12  | Forte=5d8+18
N3-8:  Fraca=3d8+12  | Media=4d10+18 | Forte=6d10+24
N6-12: Fraca=4d10+15 | Media=6d10+22 | Forte=8d12+30
N10-16: Fraca=5d10+20| Media=7d12+28 | Forte=10d12+38
N14-20: Fraca=6d12+25| Media=9d12+35 | Forte=12d12+48
N18-25: Fraca=8d12+30| Media=10d12+42| Forte=14d12+58
N22-28: Fraca=9d12+35| Media=12d12+48| Forte=16d12+65
N26-30: Fraca=10d12+40|Media=14d12+55| Forte=20d12+75

CUSTO DE ENERGIA: Fraca=3-10E | Media=10-25E | Forte=25-50E
DURAÇÃO: Fraca 1-2rod | Media 2-4rod | Forte 3-6rod

IMPORTANTE:
1. O dano da habilidade e EXTRA ao dano base da arma + bônus do rank.
2. Habilidades Passivas não devem ter custo de Energia — elas são efeitos permanentes.
3. Habilidades devem interagir com a mecânica única da arma (${weaponMec}).
4. Armas de rank alto (Ancestral, Mítico, Transcendente) DEVEM ter habilidades poderosas.
5. Cada habilidade DEVE ter pelo menos 1 efeito mecânico numerico mensuravel.
6. Misture tipos Ativa e Passiva de forma criativa.
7. O nome da habilidade deve ser tematico e combinar com o tipo de arma.

${existingHabs.length > 0 ? `
HABILIDADES EXISTENTES DA ARMA (para contexto):
${JSON.stringify(existingHabs, null, 2)}
` : ''}

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    { "nome": "nome criativo e tematico", "potencia": "Fraca|Média|Forte", "tipo": "Ativa|Passiva", "custo": "custo em PE/Energia", "descricao": "descrição com mecânicas numéricas detalhadas e balanceadas para a faixa ${weaponBand}" }
  ]
}`

  const response = await withLocalAIFallback(
    'generateWeaponAbilities',
    () => callAIJson([
      { role: 'system', content: buildSystemContext() },
      { role: 'user',   content: prompt },
    ]),
    () => createLocalWeaponAbilitiesResult(count, weaponName, weaponBand, userDesc)
  )
  return response
  try {
    return extractJSON(response)
  } catch {
    throw new Error('A IA retornou um formato inválido. Tente novamente.')
  }
}

// ─── generateAbilitiesFromDescription ────────────────────────────────────

export async function analyzeForgeEnchantment(char, enchantment) {
  const sk = char.skeletonPoints || {}
  const attrs = char.atributos || {}
  const totalAttr = (a) => getAttrValue(attrs, a, sk, char)
  const stats = computeCharStats(char)
  const prompt = `
VOCE E O ORACULO - ANALISE DE ENCANTAMENTOS DO MESTRE FORJADOR.

Encantamentos funcionam como modulos de evolucao para armas/equipamentos. Eles sao extras ao rank do item, entao precisam ser fortes, mas nao podem substituir habilidades principais do personagem.

PERSONAGEM:
Nome: ${char.nome || 'Sem nome'} | Classe: ${char.classe || 'N/A'} | Nivel: ${char.nivel || 1}
FOR ${totalAttr('FOR')} | DES ${totalAttr('DES')} | CON ${totalAttr('CON')} | INT ${totalAttr('INT')} | APA ${totalAttr('APA')} | AM ${totalAttr('AM')}
Dano Base: ${stats.danoBase} | Vida: ${stats.vidaTotal} | Energia: ${stats.energiaTotal} | CA: ${stats.caBase}

ENCANTAMENTO:
${JSON.stringify(enchantment, null, 2)}

REGRAS:
- Se for Ativa, defina custo em PE/Energia e limite de uso.
- Se for Passiva, use efeito menor e condicional.
- Pode servir para Arma, Equipamento ou Ambos.
- Preserve o conceito do jogador, mas ajuste numeros abusivos.
- Ferro Hefestiano ja existe como material especial e nao deve ser repetido como encantamento.

Responda EXCLUSIVAMENTE com JSON:
{
  "nome": "nome final",
  "tipo": "Ativa|Passiva",
  "alvo": "Arma|Equipamento|Ambos",
  "custo": "custo final ou vazio",
  "descricaoBalanceada": "texto final balanceado com numeros e limites",
  "status": "Aprovada|Ajustada|Revisao necessaria",
  "feedback": "explicacao curta do balanceamento"
}`

  const response = await withLocalAIFallback(
    'analyzeForgeEnchantment',
    () => callAIJson([
      { role: 'system', content: buildSystemContext() },
      { role: 'user', content: prompt },
    ], { maxTokens: 1200 }),
    () => createLocalEnchantmentResult(enchantment)
  )
  return response
  try {
    return extractJSON(response)
  } catch {
    throw new Error('A IA retornou um formato invalido para o encantamento.')
  }
}

export async function generateAbilitiesFromDescription(char, description, targetContext = null) {
  const sk     = char.skeletonPoints || {}
  const attrs  = char.atributos || {}
  const totalAttr = (a) => getAttrValue(attrs, a, sk, char)

  // Calculate extra ability slots so IA knows what to generate
  const { calcExtraAbilitiesTypes } = await import('../utils/calculator')
  const extraTypes = calcExtraAbilitiesTypes(
    char.triagemPrincipal, char.triagemPrincipalNivel,
    char.subTriagem, char.subTriagemNivel,
    attrs, sk, char.modulosAdquiridos, char
  )
  const allTipos = ['Passiva', 'Ativa', 'Ativa', 'Ativa', 'Ultimate', ...extraTypes]
  const tiposList = allTipos.map((t, i) => `${i+1}. ${t}`).join('\n')

  const prompt = `
PERSONAGEM: ${char.nome || 'Sem Nome'} | Classe: ${char.classe || 'N/A'} | Nível: ${char.nivel || 1} | Faixa: ${getLevelBand(char.nivel || 1)}
FOR ${totalAttr('FOR')} | DES ${totalAttr('DES')} | CON ${totalAttr('CON')} | INT ${totalAttr('INT')} | APA ${totalAttr('APA')} | AM ${totalAttr('AM')}
Triagem: ${char.triagemPrincipal || 'Nenhuma'} (${char.triagemPrincipalNivel || 0}) | Sub: ${char.subTriagem || 'Nenhuma'} (${char.subTriagemNivel || 0})
Módulos: ${(char.modulosAdquiridos || []).map(m => m.name || m.id).join(', ') || 'Nenhum'}
Descrição do jogador: "${description}"

Crie EXATAMENTE ${allTipos.length} habilidades na ORDEM e TIPO abaixo:
${tiposList}

Regras:
- Habilidades "Extra (Triagem)": devem ser complementares às triagens do personagem e ter efeito passivo ou semi-passivo
- Habilidades "Extra (Módulo)": devem refletir o flavor dos módulos adquiridos (${(char.modulosAdquiridos || []).map(m => m.name || m.id).join(', ')})
- NAO atribua valores finais balanceados — use placeholders como XdY+MOD, X rodadas
- Cada habilidade DEVE ter pelo menos 1 efeito mecânico concreto
- Mantenha coerência narrativa: todas as habilidades devem pertencer ao mesmo personagem
- Retorne tags e valores para cada habilidade. CA/Classe de Armadura usa tag "bonusCA".
- Habilidades instantaneas nao devem ter duracao nem tag "duracao".

Responda EXCLUSIVAMENTE com JSON (exatamente ${allTipos.length} objetos em "habilidades"):
{
  "habilidades": [
    { "tipo": "Passiva|Ativa|Ultimate|Extra (Triagem)|Extra (Módulo)", "nome": "nome criativo", "descricao": "descrição com mecânicas e placeholders", "custoEnergia": 0, "dano": "XdY+MOD ou vazio", "duracao": "X rodadas ou vazio/null se instantanea", "dt": "DT <numero> <Atributo|Pericia> ou vazio", "tags": ["custoEnergia"], "valores": { "custoEnergia": 0 } }
  ]
}`

  const response = await withLocalAIFallback(
    'generateAbilitiesFromDescription',
    () => callAIJson([
      { role: 'system', content: buildSystemContext(targetContext) },
      { role: 'user',   content: prompt },
    ]),
    () => createLocalGeneratedAbilitiesResult(allTipos, description)
  )
  return response
  try {
    return extractJSON(response)
  } catch {
    throw new Error('A IA retornou um formato inválido. Tente novamente.')
  }
}

function buildMysticDraftPrompt(systemType, draft, context = {}) {
  const analysisNote = typeof context.analysis_note === 'string' ? context.analysis_note.trim() : ''

  const REGENT_LORE = `
UNIVERSO NARRATIVO — REGENTES E DISTORÇÃO DE LEIS FÍSICAS:
Todo ritual é uma CHAMADA a um Regente de outra dimensão que DISTORCE sua respectiva lei da física.
Os 4 Regentes:
1. Senhor da Anti-Termodinâmica — Distorce calor, frio, energia térmica, entropia, mudanças de fase. Rituais desta linha manipulam temperatura, invertem processos entrópicos, transferem energia térmica entre corpos.
2. Senhor da Anti-Relatividade — Distorce espaço, tempo, gravidade, velocidade da luz. Rituais desta linha curvam espaço-tempo, deslocam massas, comprimem distâncias, manipulam gravidade.
3. Senhor da Anti-Inércia — Distorce força, momento, movimento, energia cinética. Rituais desta linha criam barreiras de força, redirecionam impactos, alteram velocidade, aplicam ou removem momento.
4. Senhor da Biofísica e Entropia Genética — Distorce vida, genética, mutação, decomposição. Rituais desta linha aceleram ou revertem decomposição, manipulam código genético, controlam processos vitais.

REGRA CRUCIAL DE MECÂNICA:
- NADA no efeito é puramente narrativo. "Empurra o alvo 10m" NÃO é aceitável.
- Todo efeito DEVE ter um mecânico de jogo: teste de resistência (FOR/DES/CON/INT/AM), CD, vantagem/desvantagem, dano (NdN+MOD), condição (caído, lento, cego, envenenado, etc.), duração em rodadas.
- Se o ritual empurra, isso é: "Teste FOR vs FOR. Falha: alvo é deslocado 1 espaço e cai caído. Sucesso: alvo permanece."
- Se o ritual protege, isso é: "Barreira com X PV e CA Y. Absorve dano até ser destruída. Dura X rodadas."
- Cada efeito deve incluir: o que acontece, como resistir (se aplicável), dano/condição/resultados de sucesso e falha, duração, alcance, contrapeso.

No campo "short_description", inclua UMA frase breve explicando como a lei física do regente é distorcida para alcançar o efeito. Exemplo: "Distorção termodinâmica: o calor do alvo é instantaneamente transferido para o ambiente, causando congelamento superficial."
`

  const blocks = {
    alchemy: {
      title: 'SISTEMA: ALQUIMIA DO OLYMPO — RITUAIS DE DISTORÇÃO',
      lore: [
        '- Alquimia canaliza distorções de leis físicas através de Regentes interdimensionais.',
        '- Cada ritual é um pedido a um Regente que dobra temporariamente uma lei da física.',
        '- O efeito do ritual deve refletir a lei distorcida: termodinâmica = calor/frio/energia, relatividade = espaço/tempo/gravidade, inércia = força/movimento, biofísica = vida/morte/mutação.',
        '- A descrição curta (short_description) deve explicar BREVEMENTE como a lei física é distorcida.',
        '- Todo ritual enfraquece o Véu. Quanto maior o círculo, maior o risco de Ruptura.',
      ],
      balance: [
        '- 1o círculo: utilitário ou tático leve. PE 4-8. CD 12-14. Custo estrutural: 4 espaços.',
        '- 2o círculo: impacto moderado. PE 8-16. CD 14-16. Custo estrutural: 6 espaços.',
        '- 3o círculo: poder alto com limitações claras. PE 16-24. CD 17-19. Custo estrutural: 10 espaços.',
        '- 4o círculo: devastador e raro. PE 24-38. CD 20-23. Custo estrutural: 15 espaços.',
      ],
      protocol: [
        '- SCP 2 para rituais táticos. SCP 3 apenas para fenômenos épicos/catastróficos.',
        '- Dano TOTAL (direto+condições) por ritual: C1 max 2d8+MOD, C2 max 3d10+8, C3 max 5d10+15, C4 max 8d12+20.',
        '- Cura imediata: máximo 20% da vida esperada da faixa. NUNCA acima de 30%.',
        '- Controle total: máximo 1 rodada em círculos 3-4; prefira penalidade parcial.',
        '- Buffs/Debuffs: máximo ±2 em atributos/CA/ataque por ritual. Stacking proibido sem contrapeso.',
        '- TODO efeito deve ter mecânica de jogo concreta: testes, CD, NdN, condições, durações.',
        '- Risco de Ruptura proporcional ao círculo: C1=1, C2=2, C3=3, C4=5.',
      ],
    },
    spell: {
      title: 'SISTEMA: FEITIÇOS DO OLYMPO — RITUAIS DE DISTORÇÃO',
      lore: [
        '- Feitiços são conjurações que chamam Regentes para distorcer leis físicas no campo de batalha.',
        '- Bruxaria tende a rituais de vínculo, maldição, sacrifício — usando biofísica e termodinâmica.',
        '- Arcana tende a rajadas, barreiras, teleporte — usando relatividade e inércia.',
        '- A descrição curta deve explicar BREVEMENTE como a lei física é distorcida.',
      ],
      balance: [
        '- 1o círculo: resposta curta, suporte básico. PE 6-12. CD 12-14. Custo estrutural: 4 espaços.',
        '- 2o círculo: consistência de combate. PE 12-18. CD 14-16. Custo estrutural: 6 espaços.',
        '- 3o círculo: assinatura de escola, impacto alto com limitações. PE 18-28. CD 17-19. Custo estrutural: 10 espaços.',
        '- 4o círculo: raro, épico. PE 28-40. CD 20-23. Custo estrutural: 15 espaços.',
      ],
      protocol: [
        '- Feitiços de Bruxaria podem cobrar componentes ou custo narrativo. Arcana pode cobrar janela de vulnerabilidade.',
        '- Dano TOTAL por feitiço: C1 max 2d8+MOD, C2 max 3d10+8, C3 max 5d10+15, C4 max 7d12+18.',
        '- Cura: máximo 20% da vida da faixa por uso imediato.',
        '- Controle total: máximo 1 rodada; prefira lentidão, queda de resultado, selos parciais.',
        '- Buffs/Debuffs: máximo ±2 em atributos/CA/ataque. Stacking proibido sem contrapeso.',
        '- TODO efeito deve ter mecânica de jogo concreta.',
      ],
    },
    rune: {
      title: 'SISTEMA: RUNAS DO OLYMPO',
      lore: [
        '- Runas são fragmentos das Runas Primordiais — selos de vínculo com poder ancestral.',
        '- Cada runa carrega uma distorção específica de uma lei física, cristalizada em forma de selo.',
      ],
      balance: [
        '- Menores: 1o círculo. Custo estrutural: 4 espaços.',
        '- Comuns: 2o-3o círculo. Custo estrutural: 6 ou 10 espaços.',
        '- Maiores: 3o-4o círculo. Custo estrutural: 10 ou 15 espaços.',
      ],
      protocol: [
        '- Toda runa indica grau (menor, comum, maior) e primordial-base.',
        '- TODO efeito deve ter mecânica de jogo concreta.',
      ],
    },
    magic: {
      title: 'SISTEMA: MAGIAS DO OLYMPO — RITUAIS DE DISTORÇÃO',
      lore: [
        '- Magias são a forma pura de conjurar Regentes para distorcer leis físicas em escala devastadora.',
        '- Cada escola reflete o Regente chamado: Fogo/Gelo = termodinâmica, Gravidade = relatividade, Impacto = inércia, Cura/Morte = biofísica.',
        '- Magias são mais densas e exigentes que feitiços. Investem PEH pesado.',
        '- A descrição curta deve explicar BREVEMENTE como a lei física é distorcida.',
      ],
      balance: [
        '- 1o círculo: magia básica. PE 5-10. CD 12-14. Custo estrutural: 4 espaços.',
        '- 2o círculo: magia de combate confiável. PE 10-18. CD 14-16. Custo estrutural: 6 espaços.',
        '- 3o círculo: magia densa, risco real, limitações claras. PE 18-28. CD 17-20. Custo estrutural: 10 espaços.',
        '- 4o círculo: magia suprema. PE 28-42. CD 21-24. Custo estrutural: 15 espaços.',
      ],
      protocol: [
        '- Magias são mais poderosas que feitiços do mesmo círculo: +10-15% nos tetos de dano.',
        '- Dano TOTAL por magia: C1 max 2d10+MOD, C2 max 4d10+10, C3 max 6d10+18, C4 max 9d12+24.',
        '- Cada magia reflete a escola/regente: termodinâmica = dano/controle térmico, relatividade = espaço/gravidade, inércia = força/movimento, biofísica = vida/morte.',
        '- Cura: máximo 25% da vida da faixa. Controle total: 1 rodada.',
        '- Buffs/Debuffs: máximo ±3 em atributos/CA/ataque para magias (maior que feitiços).',
        '- TODO efeito deve ter mecânica de jogo concreta.',
      ],
    },
  }
  const block = blocks[systemType] || blocks.alchemy
  const prompt = `
${block.title}

${REGENT_LORE}

LORE E LIMITES:
${block.lore.join('\n')}

BALANCEAMENTO POR CÍRCULO:
${block.balance.join('\n')}

PROTOCOLO:
${block.protocol.join('\n')}

RASCUNHO:
${JSON.stringify(draft, null, 2)}

CONTEXTO OPCIONAL:
${JSON.stringify(context, null, 2)}

INSTRUÇÃO DIRETA DO ADMIN:
${analysisNote || 'Você tem LIBERDADE CRIATIVA TOTAL para reescrever o ritual. REGRAS: (1) Mantenha o nome do ritual original, a menos que ele seja incoerente com a lei física do Regente — nesse caso, sugira um nome alternativo que preserve a intenção. (2) A descrição e mecânica DEVEM ser coerentes com a lei distorcida do Regente indicado em source_name. (3) Se a descrição original do jogador não faz sentido dentro da lei do Regente, REESCREVA completamente a explicação para que seja coerente. Exemplo: se o ritual cura ferimentos usando Biofísica, não diga que "retrocede o tempo" — diga que "sobrecarrega o organismo criando células regenerativas beyond natural limits". (4) O efeito é DEFINITIVO — o jogador não pode manter a versão original. Seja criativo, preciso e balanceado.'}

Responda EXCLUSIVAMENTE com JSON:
{
  "name": "nome refinado",
  "circle": 1,
  "category": "Ataque",
  "pe_cost": 0,
  "min_level": 1,
  "action_cost": "Ação Padrão",
  "duration": "Instantâneo",
  "range": "18m",
  "short_description": "Distorção [REGENTE]: breve explicação de como a lei física é distorcida + resumo do efeito.",
  "effect": "efeito final com mecânicas concretas: testes, CD, NdN+MOD, condições, durações, contrapesos",
  "source_kind": "regente|limiar|neutro",
  "source_name": "nome do Regente ou fonte",
  "law_name": "lei física distorcida",
  "price": "custo narrativo ou contrapeso",
  "rupture_risk": 1,
  "protocol_layer": 2,
  "pp_estimate": 0,
  "tags": ["tag1", "tag2"],
  "ai_feedback": "explicação curta de balanceamento"
}`

  return prompt
}

async function analyzeMysticDraft(systemType, draft, context = {}) {
  const prompt = buildMysticDraftPrompt(systemType, draft, context)

  const response = await withLocalAIFallback(
    `analyzeMysticDraft:${systemType}`,
    () => callAIJson([
      { role: 'system', content: buildSystemContext() },
      { role: 'user', content: prompt },
    ], { maxTokens: 8192 }),
    () => createLocalMysticDraftResult(draft)
  )
  return response

  try {
    return extractJSON(response)
  } catch {
    throw new Error('A IA retornou um formato invalido para o cadastro mistico.')
  }
}

export async function analyzeAlchemyRitualDraft(draft, context = {}) {
  return analyzeMysticDraft('alchemy', draft, context)
}

export async function analyzeSpellDraft(draft, context = {}) {
  return analyzeMysticDraft('spell', draft, context)
}

export async function analyzeRuneDraft(draft, context = {}) {
  return analyzeMysticDraft('rune', draft, context)
}

export async function analyzeMagicDraft(draft, context = {}) {
  return analyzeMysticDraft('magic', draft, context)
}

export async function analyzeLegendaryWeaponDraft(draft, context = {}) {
  const analysisNote = typeof context.analysis_note === 'string' ? context.analysis_note.trim() : ''
  const improveWriting = !!context.improve_writing
  const powerLevel = draft.power_level || 'notavel'

  const POWER_LEVEL_GUIDE = {
    menor: {
      label: 'Menor',
      desc: 'Poderosa mas contida. Superior ao comum, mas nao esmaga exercitos.',
      danoBase: '2d8 a 3d10+MOD — acima do rank Incomum (+1d6) e Raro (+2d6)',
      danoHabilidade: '2d6+8 a 4d8+15',
      peAtiva: '5-15 PE', peUltimate: '15-30 PE',
      slotBudget: '2-3',
    },
    notavel: {
      label: 'Notavel',
      desc: 'Forte e distinta. Vira combates com habilidades unicas.',
      danoBase: '3d10 a 5d10+MOD — acima do rank Heroico (+4d8) e ANCESTRAL (+5d10)',
      danoHabilidade: '3d10+18 a 6d10+25',
      peAtiva: '10-25 PE', peUltimate: '25-50 PE',
      slotBudget: '3-4',
    },
    maior: {
      label: 'Maior',
      desc: 'Entre as mais poderosas. Define o destino de conflitos regionais.',
      danoBase: '5d12 a 8d12+MOD — acima do rank Ancestral (+5d10) e Mitico (+6d12)',
      danoHabilidade: '6d12+30 a 10d12+45',
      peAtiva: '15-40 PE', peUltimate: '40-80 PE',
      slotBudget: '4-6',
    },
    suprema: {
      label: 'Suprema',
      desc: 'Poder absoluto. Escallibur — molda a historia do mundo.',
      danoBase: '8d12+8 a 12d12+15 — MUITO acima do rank Transcendente (+8d12). Uma arma Suprema causa dano ABSURDO, superior a QUALQUER arma criada por jogadores.',
      danoHabilidade: '10d12+50 a 16d12+75',
      peAtiva: '20-60 PE', peUltimate: '60-120 PE',
      slotBudget: '5-8',
    },
  }

  const guide = POWER_LEVEL_GUIDE[powerLevel] || POWER_LEVEL_GUIDE.notavel

  const habs = draft.habilidades || { passivas: [], ativas: [], ultimates: [] }
  const totalHabs = habs.passivas.length + habs.ativas.length + habs.ultimates.length

  const hasName = draft.name && draft.name.length > 0
  const hasDano = draft.dano && draft.dano.length > 0
  const hasEffect = draft.effect && draft.effect.length > 0
  const hasHabilidades = totalHabs > 0
  const isGenerationMode = !hasName && !hasDano && !hasEffect && !hasHabilidades && analysisNote.length > 0

  const prompt = `
VOCE E O ORACULO — ARTIFICE LENDARIO DO SISTEMA OLYMPO 2.0.
Voce NAO e um corretor de texto. Voce e um CRIADOR e BALANCEADOR de armas lendarias.
Sua job: quando o Mestre traz um conceito, RESPEITE o conceito e PRESERVE a mecanica. Quando cria do zero, seja AUDACIOSO e criativo.

MODO: ${isGenerationMode ? 'GERACAO — Criar arma completa do zero.' : 'BALANCEAMENTO — Preservar conceitos, ajustar valores, completar campos vazios.'}

==
TABELA DE ARMAS (dano base COMUM — para referencia)
==
Pistola: 1d8 | Sub-Metralhadora: 1d6 | Rifle: 1d10 | Escopeta: 2d6 | Sniper: 2d8
Espada Longa: 1d8 | Katana: 1d8 | Machado Guerra: 1d10 | Martelo Guerra: 1d10 | Adaga: 1d4 | Lana: 1d6
Besta: 1d10 | Arco Longo: 1d8 | Mangual: 1d8 | Chicote: 1d4 | Manopla: 1d6 | Foice: 1d6
Escudo Pequeno: 1d4 | Escudo Grande: 1d6

RANKS (bonus de dano cumulativos sobre a arma base):
Comum(0) | Incomum(+1d6) | Raro(+2d6) | Epico(+3d8) | Heroico(+4d8) | Ancestral(+5d10) | Mitico(+6d12) | Transcendente(+8d12)
LENDARIA esta ACIMA de Transcendente. O dano base de uma arma lendaria deve SUPERAR o bonus de Transcendente.

==
TERMINOLOGIA DO SISTEMA (USE ESTES TERMOS)
==
- PE = Pontos de Esforco (NUNCA use "Energia", "Mana", "PM" — sempre "PE" ou "Pontos de Esforco")
- CA = Classe de Armadura
- CD = Classe de Dificuldade
- NdN = formato de dados (3d10 = 3 dados de 10 lados)
- MOD = modificador de atributo (FOR, DES, CON, INT, AM)
- Vantagem / Desvantagem = mecanica de rolar 2d20 e ficar com o melhor/pior
- Teste de Resistencia = FOR/DES/CON/INT/AM contra CD

==
NIVEL DE PODER: ${guide.label}
==
${guide.desc}
Dano base esperado: ${guide.danoBase}
Dano de habilidades ofensivas: ${guide.danoHabilidade}
Custo PE — Ativas: ${guide.peAtiva} | Ultimate: ${guide.peUltimate}
Quantidade de habilidades: ${guide.slotBudget}
Passivas: 0 PE (efeito permanente, sempre ativo)

==
RASCUNHO DA ARMA
==
${JSON.stringify(draft, null, 2)}

Habilidades estruturadas (${totalHabs} total):
Passivas (${habs.passivas.length}): ${JSON.stringify(habs.passivas, null, 2)}
Ativas (${habs.ativas.length}): ${JSON.stringify(habs.ativas, null, 2)}
Ultimates (${habs.ultimates.length}): ${JSON.stringify(habs.ultimates, null, 2)}

==
INSTRUCAO DO MESTRE
==
${analysisNote || 'Nenhuma instrucao extra. Revisar, completar e balancear.'}

==
!!! REGRA #1 — PRESERVACAO DE MECANICAS (A MAIS IMPORTANTE) !!!
==

Se o Mestre descreveu uma habilidade — seja nos campos estruturados ou na instrucao — voce DEVE PRESERVAR a MECANICA CENTRAL.

ISSO SIGNIFICA:
- Se o Mestre disse "chance de critico" → a habilidade E sobre chance de critico. PODE adicionar condicoes ("apenas abaixo de 40% de vida", "a cada 3 disparos"), mas NUNCA mudar para "furia" ou "vantagem em ataques".
- Se o Mestre disse "3 disparos rapidos" → sao 3 disparos rapidos. PODE ajustar dano e custo, mas NUNCA mudar para "disparo em area".
- Se o Mestre disse "disparo extra ao acertar % da vida" → e sobre disparo extra condicional. PODE definir a % e o dano, mas NUNCA mudar para "concentrar energia para disparo devastador".
- Se o Mestre disse "sobrecarregar a arma com dano extremo, precisao reduzida, risco ao portador" → e sobre sobrecarga com trade-offs. PODE definir os valores, mas NUNCA mudar para outra coisa.

BALANCEAR != SUBSTITUIR. Balancear significa: adicionar condicoes, ajustar valores, definir custos, limitar Gatilhos. NUNCA trocar a mecanica por outra completamente diferente.

Se o Mestre pediu para RENOMEAR ("deixe nomes mais imponentes") — renomeie, mas mantenha a mecanica.
Se o Mestre pediu para CRIAR uma nova habilidade — crie com mecanica inovadora.
Se o Mestre NAO pediu para mudar a mecanica — NAO MUDE.

===
!!! REGRA #2 — ANALISE OBRIGATORIA DE CADA HABILIDADE, UMA POR UMA !!!
===

Voce DEVE processar CADA habilidade individualmente. O processo OBRIGATORIO para CADA habilidade e:
1. Ler o conceito/mechanica descrita pelo Mestre
2. PRESERVAR essa mechanica (Regra #1)
3. Aplicar valores balanceados (NdN, PE, CD, condicoes)
4. Colocar a habilidade resultante no array correto (passivas/ativas/ultimates)

NUNCA pule uma habilidade. NUNCA agrupe habilidades. NUNCA ignore uma habilidade porque parece "dificil de balancear".
Se uma habilidade esta no input, ela DEVE estar no output — ESPECIALMENTE ULTIMATES.
Se o input tem 1 passiva, 2 ativas e 1 ultimate, o output DEVE ter PELO MENOS 1 passiva, 2 ativas e 1 ultimate.
Se o Mestre pediu para criar mais, ADICIONE alem das existentes.

No ai_feedback, liste CADA habilidade individualmente com o que voce fez.

===
REGRA #3 — FORMATO DE MECANICAS DE JOGO
===

TODOS os efeitos devem usar MECANICAS CONCRETAS com valores. PROIBIDO prosa sem suporte mecanico.

FORMATO CORRETO:
- "Causa 3d10+8 de dano perfurante. Alvos devem realizar Teste de Resistencia CON CD 22 ou ficam atordoados por 1 rodada."
- "Concede +15% de chance de critico. O critico desta arma causa 3x de dano (1.5x adicional). Ativa apenas quando o portador esta abaixo de 50% de vida maxima."
- "+2d6 em Testes de Percepcao com Vantagem contra ilusoes e criaturas ocultas."
- "Ignora +3 de CA do alvo. Penetra armaduras de ate 5 pontos."
- "Disparo adicional: ao causar mais de 25% da vida maxima do alvo em um unico ataque, o portador pode realizar um disparo extra causando 2d10+MOD de dano."

FORMATO ERRADO:
- "A arma detecta inimigos atraves de barreiras" ← SEM VALORES! Use "+NdN Percepcao com Vantagem..."
- "A arma responde a determinacao do portador" ← O que isso faz mecanicamente?
- "Transforma energia vital em poder destrutivo" ← Prosa sem mecanica.
- "Garante que nunca falte poder de fogo" ← O que isso significa em dados?

===
REGRA #4 — CAMPO "effect" (Efeito Lendario)
===

${improveWriting ? 'O Mestre ativou melhoria de escrita. Reescreva o campo "effect" com redacao RICA e IMERSIVA, mas com MECANICAS CONCRETAS (NdN, CDs, condicoes). O efeito lendario deve ser um poder SIGNIFICATIVO — nao apenas flavor text.' : 'PRESERVE o campo "effect" EXATAMENTE como o Mestre escreveu. Apenas ajuste valores NUMERICOS (NdN, +MOD, CDs). NAO reescreva.'}
Se o effect esta vazio: crie um efeito lendario com MECANICAS CONCRETAS — um poder passivo significativo que a arma concede ao portador (bonus de acerto, penetracao de armadura, critico aumentado, resistencia a tipo de dano, etc.). NAO crie flavor text vazio.

===
REGRA #5 — DANO BASE (MUITO IMPORTANTE)
===

Referencia a tabela de armas acima. O tipo de arma (campo "base") define o dano comum.
O dano de uma Lendaria ${guide.label} deve ser: ${guide.danoBase}
IMPORTANTE: Uma arma Lendaria e SUPERIOR a QUALQUER arma que jogadores possam criar. A maior rank jogavel e Transcendente (+8d12). Uma Lendaria ${guide.label} causa MAIS dano que isso.
NAO tenha medo de dar dano alto. Uma arma Suprema com 8d12+15 de dano base esta CORRETA.

===
RESPONDA EXCLUSIVAMENTE COM JSON VALIDO
===
{
  "name": "nome",
  "dano": "dano base (ex: 8d12+10 para Suprema)",
  "attr": "atributo",
  "effect": "efeito lendario com mecanicas concretas",
  "power_level": "${powerLevel}",
  "lore": "historia preservada ou gerada",
  "habilidades": {
    "passivas": [
      { "nome": "nome", "descricao": "descricao detalhada com mecanicas concretas e valores balanceados", "custoPE": 0 }
    ],
    "ativas": [
      { "nome": "nome", "descricao": "descricao detalhada com mecanicas concretas e valores balanceados", "custoPE": X }
    ],
    "ultimates": [
      { "nome": "nome", "descricao": "descricao detalhada com mecanicas concretas e valores balanceados", "custoPE": X }
    ]
  },
  "ai_feedback": "Resumo: dano base escolhido (referencia da tabela). Cada habilidade: nome, mecanica preservada/criada, custoPE. Pedidos do Mestre atendidos."
}`

  const response = await withLocalAIFallback(
    'analyzeLegendaryWeaponDraft',
    () => callAIJson([
      { role: 'system', content: buildSystemContext() },
      { role: 'user', content: prompt },
    ], { maxTokens: 8192 }),
    () => createLocalLegendaryWeaponResult(draft, powerLevel)
  )
  return response

  try {
    return extractJSON(response)
  } catch {
    throw new Error('A IA retornou um formato invalido para a arma lendaria.')
  }
}

export async function chatAboutAbility(char, userMessage, history = []) {
  const stats = computeCharStats(char)
  const pehTotal = calcPEHTotal(char.classe || '', char.nivel || 1, char.choices || {}, char.modulosAdquiridos || [], char)
  const pehSpent = calcPEHSpent(char.habilidades)

  const LCP_CAPS = { 'N1-7': { atk: 18, def: 18, ca: 4, extra: 1 }, 'N8-15': { atk: 26, def: 26, ca: 6, extra: 1 }, 'N16-22': { atk: 30, def: 30, ca: 6, extra: 1 }, 'N23-30': { atk: 42, def: 42, ca: 10, extra: 2 }, 'N31-38': { atk: 50, def: 50, ca: 12, extra: 2 }, 'N39-50': { atk: 60, def: 60, ca: 14, extra: 3 } }
  const lcp = LCP_CAPS[stats.band] || LCP_CAPS['N16-22']
  const remainingAtk = Math.max(0, lcp.atk - stats.ataqueBaseNum)

  const charContext = `
PERSONAGEM: ${char.nome || 'Sem Nome'} | ${char.raca || 'N/A'} (${char.racaTipo || '?'}) | ${char.classe || '?'} | Nível ${stats.nivel} | Faixa ${stats.band}
Atributos: FOR ${stats.atributos.FOR}(+${stats.atributos.modFOR}) | DES ${stats.atributos.DES}(+${stats.atributos.modDES}) | CON ${stats.atributos.CON}(+${stats.atributos.modCON}) | INT ${stats.atributos.INT}(+${stats.atributos.modINT}) | APA ${stats.atributos.APA} | AM ${stats.atributos.AM}(+${stats.atributos.modAM})
Vida: ${stats.vidaTotal} | Energia: ${stats.energiaTotal} | PE: ${stats.peTotal} | CA: ${stats.caBase}
Equipamentos: Armadura ${stats.equipStats.totalArmor}/${stats.equipStats.totalArmorMax} | Crit +${stats.equipStats.totalCrit}% | Dano +${stats.equipStats.totalDamage}
Ataque Base: d20+${stats.ataqueBaseNum} | Dano Base: ${stats.danoBase} | Arma Bônus: ${stats.armaDanoBonus}
PEH: ${pehSpent}/${pehTotal}
LCP — Limite cumulativo para ${stats.band}: Ataque total ≤ +${lcp.atk} | Esquiva ≤ +${lcp.def} | CA bônus ≤ +${lcp.ca} | Ataques extras ≤ +${lcp.extra}
BUDGET RESTANTE para habilidades: +${remainingAtk} no ataque (base já é +${stats.ataqueBaseNum})
Triagem: ${stats.triagem}
Amplificadores Triagem: ${stats.triagemAmps}
Amplificadores Módulo: ${stats.moduleAmps}

HABILIDADES ATUAIS:
${(char.habilidades || []).map((h, i) => `${i + 1}. [${h.tipo}] ${h.nome || '—'} — Energia:${h.custoEnergia || 0} | Dano:${h.dano || '—'} | Duração:${h.duracao || '—'} | DT:${h.dt || '—'} | Tags:${normalizeSkillTags(h).join(', ') || 'nenhuma'} | Evo:${h.evolucaoNivel || 0} | Status:${h.status || '?'}
   Descrição: ${h.descricao || '—'}`).join('\n')}
${(char.armaHabilidades || []).length > 0 ? `\nHABILIDADES DA ARMA:\n${(char.armaHabilidades || []).map((h, i) => `${i + 1}. ${h.nome || '—'} — ${h.tipo || 'Ativa'} | ${h.potencia || '?'}\n   ${h.descricao || '—'}`).join('\n')}` : ''}`

  const systemPrompt = `Voce e o ORÁCULO, motor de balanceamento do Sistema Olympo 2.0.
Você está em modo CONVERSACIONAL. Responda em português de forma clara e didática.

Você tem acesso completo à ficha do personagem e suas habilidades. O usuário pode ser o JOGADOR ou o MESTRE (GM). Se o usuário menciona "não gostei", "quero mudar", "aumentar custo", "diminuir duração", ele é provavelmente o MESTRE ajustando o balanceamento.

MODO DE REFINAMENTO — Quando o mestre pede ajustes específicos:
1. ANALISE a sugestão do mestre com os mesmos critérios de balanceamento (TDH, LCP, IPL).
2. Se a sugestão é PLAUSÍVEL e mantém o equilíbrio, APROVE e forneça os novos valores completos.
3. Se a sugestão AINDA É FRACA demais, explique POR QUÊ e sugira um valor intermediário.
4. Se a sugestão pode ser MELHORADA, combine a ideia do mestre com sua análise.
5. RETORNE valores concretos: novo custoEnergia, novo dano, nova duração, nova DT, tags, valores e nova descricaoBalanceada.
6. NUNCA simplesmente concorde — SEMPRE verifique contra os limites do sistema.

TAGS E DURACAO:
- Use tags padronizadas: custoEnergia, dano, cura, duracao, dt, bonusAtaque, bonusCA, bonusResultado, vantagem, area, deslocamento, resistencia, paralisia, curaStatus, invisibilidade, invocacao.
- CA significa Classe de Armadura. Efeitos como "+2 CA" usam tag "bonusCA" e valores.bonusCA.
- Nao crie nem aumente duracao se a habilidade for instantanea ou se nao tiver tag duracao. "1 turno/1 rodada" ou "ate o proximo turno" so contam se forem efeito persistente real.
- PEH escala somente as tags existentes; nao adicione dano/cura/DT/duracao que nao pertencem ao conceito.

FORMATO DE RESPOSTA PARA AJUSTES:
IMPORTANTE: comece SEMPRE pelo bloco JSON. Depois do JSON, use no maximo 3 linhas de analise. O JSON e obrigatorio para o sistema aplicar mudancas.
Quando o usuário pede alterações em uma habilidade específica, inclua SEMPRE um bloco JSON no formato:
\`\`\`json
{
  "custoEnergia": numero,
  "dano": "string",
  "duracao": "string ou vazio/null se instantanea",
  "dt": "DT <numero> <Atributo|Pericia> ou vazio",
  "tags": ["custoEnergia"],
  "valores": { "custoEnergia": 0 },
  "descricaoBalanceada": "texto ajustado completo",
  "feedback": "explicação da mudança"
}
\`\`\`
Escreva sua analise depois do JSON. O JSON e OBRIGATORIO; sem ele o sistema nao consegue aplicar as mudancas.

COMANDO ESPECIAL — CHAVE MESTRA:
Se o usuário envia [CHAVE_MESTRA], você DEVE aplicar EXATAMENTE o que foi solicitado, sem questionar. Retorne os valores conforme o pedido do mestre, mesmo que discorde. Apenas inclua um feedback breve com sua opinião. O mestre tem autoridade final.

REGRAS QUE VOCÊ DEVE SEGUIR AO ANALISAR:
1. Faixa ${stats.band}. Respeite os limites desta faixa.
2. LCP: Ataque total (base + habilidades) ≤ +${lcp.atk}. Base = +${stats.ataqueBaseNum}, sobrando +${remainingAtk}.
3. TDH: Cada habilidade tem teto conforme tipo e faixa.
4. Bônus passivos permanentes: CONSERVADORES (metade do budget temporário).
5. Considere raça, triagens, módulos — já adicionam poder base.
6. Habilidades com MULTIPLICADORES ("dobrar", "amplificar") devem ter custo proporcional ao poder que liberam.
7. INVOCAÇÕES: Cada invocação conta como uma fonte separada de dano. O dano TOTAL de todas as invocações + dano do conjurador não deve exceder 200% do TDH Ultimate. Limite invocações por: (1) número máximo fixo (não dados aleatórios), (2) vida das invocações deve ser ≤ 30% do HP do conjurador, (3) dano por invocação ≤ 50% do TDH Forte da faixa.

Seja direto e objetivo. Cite números e limites quando relevante.`

  const chatHistory = history.slice(-6).map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }))

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: `${charContext}\n\nPERGUNTA DO JOGADOR: ${userMessage}` },
  ]

  return await withLocalAIFallback(
    'chatAboutAbility',
    () => callAI(messages, { maxTokens: 900 }),
    () => createLocalAbilityChatResponse(char, userMessage)
  )
}

export async function generateEquipmentAbilities(char, equipType, equipRank, activeSlotsOrPassiveSlots, passiveSlotsArg, userDescArg = '', armorTypeArg = '') {
  const nivel = char.nivel || 1
  const attrs = char.atributos || {}
  const sk = char.skeletonPoints || {}
  const cls = char.classe || ''

  const attrVals = {}
  for (const a of ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM']) {
    attrVals[a] = getAttrValue(attrs, a, sk, char)
  }

  const vida = cls ? calcVidaTotal(cls, nivel, attrs, sk, char.choices, char.triagemPrincipal, char.triagemPrincipalNivel, char, char.subTriagem, char.subTriagemNivel) : 100
  const ca = cls ? calcCA(attrs, sk, char.pericias, char) : 10
  const oldSignature = typeof passiveSlotsArg === 'string' || passiveSlotsArg == null
  const activeSlots = oldSignature ? 0 : Number(activeSlotsOrPassiveSlots) || 0
  const passiveSlots = oldSignature ? Number(activeSlotsOrPassiveSlots) || 0 : Number(passiveSlotsArg) || 0
  const userDesc = oldSignature ? (passiveSlotsArg || '') : (userDescArg || '')
  const armorType = oldSignature ? '' : armorTypeArg
  const totalSlots = activeSlots + passiveSlots
  const typeDef = EQUIPMENT_TYPES.find(t => t.id === equipType)
  const armorTypeDef = ARMOR_TYPES.find(t => t.id === armorType)
  const rarity = getEquipmentRarity(equipRank)

  const systemPrompt = `Você é um sistema de balanceamento para um RPG chamado Olympo 2.0.
Sua tarefa é criar habilidades ativas e passivas para equipamentos (armaduras, coletes, escudos, acessórios).

CONTEXTO DO PERSONAGEM:
- Classe: ${cls} | Nível: ${nivel}
- Atributos: FOR ${attrVals.FOR} | DES ${attrVals.DES} | CON ${attrVals.CON} | INT ${attrVals.INT} | APA ${attrVals.APA} | AM ${attrVals.AM}
- Vida: ${vida} | CA base: ${ca}
- Triagem: ${char.triagemPrincipal || 'Nenhuma'} (${char.triagemPrincipalNivel || 0})

EQUIPAMENTO:
- Tipo: ${typeDef?.label || equipType}
- Slot: ${typeDef?.slot || 'utilidade'} | Peso: ${typeDef?.weight || 'n/a'} | Set: ${armorTypeDef?.label || 'sem set'}
- Rank: ${equipRank}
- Armadura base da peca: ${typeDef?.caBase || 0} | Penalidade: ${typeDef?.penalty || 0}
- Bonus por rank: Armadura +${rarity.armorBonus}
- Slots disponiveis: ${activeSlots} ativa(s), ${passiveSlots} passiva(s)
${userDesc ? `- Descrição do jogador: ${userDesc}` : ''}

REGRAS DE BALANCEAMENTO PARA EQUIPAMENTOS:
1. PASSIVAS devem ser SUTIS — equipamentos NÃO são armas. Eles oferecem:
   - Sobrevida: redução de dano fixa (máx 3/nível band), +Vida temporária, resistência a condição
   - Utilidade: vantagem em testes específicos, movimento especial, sense amplificado
   - Sinergia: bônus quando condição X acontece (ex: "+5 em Bloqueio contra projéteis")
2. NÃO crie passivas que adicionam dano direto — isso é para armas
3. Coletes balísticos: redução de dano balístico, absorção de impacto
4. Armaduras: nao concedem CA numerica por rank. Elas usam Armadura como durabilidade/absorção antes da Vida; ao chegar a 0, a peça quebra até reparo.
5. Escudos: bloqueio ativo (REAÇÃO), proteção contra projéteis
6. Acessórios: bônus passivos sutis (sentidos, resistência mental, etc.)
7. MÁXIMO de efeitos por passiva: 1 efeito principal + 1 condição
8. Use formato de dano do sistema: NdN+mod (ex: reduz 1d6 de dano balístico)
9. Nao gere bonus permanente de CA. Se precisar de defesa passiva, use Armadura, Escudo, reducao de dano, cobertura, Vantagem em esquiva com custo de PE ou bonus situacional pequeno.

LIMITES POR RANK:
- Comum: sem passiva
- Incomum: efeito menor (ex: vantagem em 1 teste específico)
- Raro: efeito moderado (redução de dano 1-2, +1-3 em condição específica)
- Epico: efeito forte (redução 2-3, resistência a tipo, +5 Vida temporária)
- Heroico+: efeitos combinados permitidos

CONCESSAO DE HABILIDADES POR RANK:
- Gere exatamente ${activeSlots} habilidade(s) Ativa(s) e ${passiveSlots} Passiva(s), total ${totalSlots}.
- Ativas de equipamento precisam ter gatilho, duracao, custo/recarga e efeito defensivo/utilitario claro.
- Passivas permanentes devem ser menores que ativas e nao devem somar CA; prefira absorcao, escudo pequeno, movimento, resistencia situacional ou bonus de pericia.

Responda APENAS com JSON:
{
  "passivas": [
    {
      "nome": "string",
      "descricao": "string detalhada",
      "tipo": "Ativa ou Passiva",
      "efeito": "string resumido do efeito mecânico"
    }
  ]
}`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Crie ${totalSlots} habilidade(s) para este equipamento tipo "${typeDef?.label || equipType}" rank ${equipRank}: ${activeSlots} ativa(s) e ${passiveSlots} passiva(s). Seja conciso e balanceado.` },
  ]

  const parsed = await withLocalAIFallback(
    'generateEquipmentAbilities',
    () => callAIJson(messages),
    () => createLocalEquipmentAbilitiesResult(totalSlots, activeSlots, passiveSlots, typeDef?.label || equipType, userDesc)
  )
  return { passivas: (parsed.passivas || []).slice(0, totalSlots) }
}

export async function suggestItemWeight(nome, descricao) {
  const messages = [
    {
      role: 'system',
      content: `Você é um sistema de RPG. Dado o nome e opcionalmente a descrição de um item, estime um peso realista em quilogramas (kg). Responda APENAS com um número de 0 a 999 com até 1 casa decimal. Exemplos: "Espada longa" → 1.5, "Poção de cura" → 0.2, "Baú de tesouro" → 25.0, "Anel de prata" → 0.1, "Escudo de ferro" → 6.0. Não explique, não use unidades, apenas o número.`
    },
    {
      role: 'user',
      content: `Nome: ${nome || 'Item desconhecido'}${descricao ? `\nDescrição: ${descricao}` : ''}`
    }
  ]
  const data = await withLocalAIFallback(
    'suggestItemWeight',
    () => callAI(messages, { maxTokens: 16 }),
    () => String(estimateLocalItemWeight(nome, descricao) ?? '')
  )
  const raw = typeof data === 'string' ? data : data?.content || ''
  const match = raw.match(/[\d]+(?:[.,][\d])?/)
  if (!match) return null
  const val = parseFloat(match[0].replace(',', '.'))
  if (Number.isNaN(val) || val < 0) return null
  return Math.round(val * 10) / 10
}
