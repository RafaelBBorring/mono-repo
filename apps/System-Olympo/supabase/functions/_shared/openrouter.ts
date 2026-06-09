const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY')
const OPENROUTER_MODEL = Deno.env.get('OPENROUTER_MODEL') || 'google/gemma-4-26b-a4b-it:free'
const OPENROUTER_REFERER = Deno.env.get('OPENROUTER_REFERER') || 'https://system-olympo.vercel.app'
const OPENROUTER_TITLE = Deno.env.get('OPENROUTER_TITLE') || 'System Olympo 2.0'
const OPENROUTER_MAX_TOKENS = Math.max(Number(Deno.env.get('OPENROUTER_MAX_TOKENS')) || 16384, 16384)
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const POLLINATIONS_API_KEY = Deno.env.get('POLLINATIONS_API_KEY') || ''
const POLLINATIONS_URL = Deno.env.get('POLLINATIONS_URL') || 'https://text.pollinations.ai/openai'
const POLLINATIONS_MODEL = Deno.env.get('POLLINATIONS_MODEL') || 'openai'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, origin, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

type ChatRequest = {
  messages?: unknown
  temperature?: unknown
  max_tokens?: unknown
  max_completion_tokens?: unknown
  response_format?: unknown
  stream?: unknown
  model?: unknown
}

function jsonResponse(body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, 'Content-Type': 'application/json' },
  })
}

function getMaxTokens(payload: ChatRequest) {
  const raw = payload.max_completion_tokens ?? payload.max_tokens ?? 4096
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return OPENROUTER_MAX_TOKENS
  return Math.max(16, Math.min(Math.floor(parsed), OPENROUTER_MAX_TOKENS))
}

function getTemperature(payload: ChatRequest) {
  const parsed = Number(payload.temperature ?? 0.35)
  if (!Number.isFinite(parsed)) return 0.35
  return Math.max(0, Math.min(2, parsed))
}

function getModel(payload: ChatRequest) {
  return typeof payload.model === 'string' && payload.model.trim()
    ? payload.model.trim()
    : OPENROUTER_MODEL
}

const FREE_MODEL_FALLBACKS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-3-27b-it:free',
  'meta-llama/llama-4-scout:free',
  'qwen/qwen3-32b:free',
  'deepseek/deepseek-chat-v3-0324:free',
]

function getModelCandidates(primaryModel: string) {
  const seen = new Set<string>()
  const candidates: string[] = []
  if (primaryModel && !seen.has(primaryModel)) { candidates.push(primaryModel); seen.add(primaryModel) }
  for (const m of FREE_MODEL_FALLBACKS) {
    if (!seen.has(m)) { candidates.push(m); seen.add(m) }
  }
  return candidates
}

function getErrorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== 'object') return fallback
  const data = body as Record<string, unknown>
  const error = data.error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const nested = error as Record<string, unknown>
    if (typeof nested.message === 'string') return nested.message
  }
  if (typeof data.message === 'string') return data.message
  return fallback
}

async function openRouterErrorResponse(response: Response, model: string) {
  const fallback = `OpenRouter error: ${response.status}`
  const contentType = response.headers.get('Content-Type') || ''
  let body: unknown = null
  let message = fallback

  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => null)
    message = getErrorMessage(body, fallback)
  } else {
    const text = await response.text().catch(() => '')
    message = text.trim() || fallback
  }

  const retryAfter = response.headers.get('Retry-After')
  const headers = retryAfter ? { 'Retry-After': retryAfter } : {}

  return jsonResponse({
    error: message,
    status: response.status,
    source: 'openrouter',
    model,
    details: body,
  }, response.status, headers)
}

function isCreditBlocked(status: number, message: string) {
  return status === 402 && /insufficient credits|never purchased credits|requires more credits|purchase more/i.test(message)
}

function shouldUseProviderFallback(status: number, message: string) {
  if (isCreditBlocked(status, message)) return true
  if (status === 429) return true
  return /free-models-per-day|rate limit exceeded|ratelimit|too many requests/i.test(message)
}

function shouldTryNextModel(status: number, message: string) {
  if (status === 429) return true
  if (status === 503) return true
  if (isCreditBlocked(status, message)) return true
  return /rate limit|overloaded|capacity|temporarily unavailable/i.test(message)
}

function isResponseFormatUnsupported(status: number, message: string) {
  return status === 400 && /response_format|structured output|json_schema|json object/i.test(message)
}

function getTextContent(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    return value
      .map(item => getTextContent(item))
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  if (value && typeof value === 'object') {
    const data = value as Record<string, unknown>
    return getTextContent(data.text ?? data.content ?? data.value)
  }
  return ''
}

function extractJsonSnippet(text: string) {
  const value = text.trim()
  const objectStart = value.indexOf('{')
  const objectEnd = value.lastIndexOf('}')
  if (objectStart >= 0 && objectEnd > objectStart) {
    const candidate = value.slice(objectStart, objectEnd + 1)
    try {
      JSON.parse(candidate)
      return candidate
    } catch {
      // Keep looking for a valid array-shaped response below.
    }
  }

  const arrayStart = value.indexOf('[')
  const arrayEnd = value.lastIndexOf(']')
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    const candidate = value.slice(arrayStart, arrayEnd + 1)
    try {
      JSON.parse(candidate)
      return candidate
    } catch {
      return ''
    }
  }

  return ''
}

function addFallbackInstruction(messages: unknown, wantsJson: boolean) {
  if (!Array.isArray(messages)) return messages
  const content = wantsJson
    ? 'Responda somente com um objeto JSON valido no campo final content. O primeiro caractere deve ser { e o ultimo deve ser }. Nao use markdown, raciocinio nem texto fora do JSON.'
    : 'Retorne uma resposta final nao vazia no campo content.'
  return [{ role: 'system', content }, ...messages]
}

function filterFallbackBody(body: Record<string, unknown>) {
  const next = { ...body, model: POLLINATIONS_MODEL }
  const wantsJson = Boolean(next.response_format)
  delete next.provider
  delete next.response_format
  next.messages = addFallbackInstruction(next.messages, wantsJson)
  if (typeof next.max_tokens === 'number' && next.max_tokens < 1800) {
    next.max_tokens = 1800
  }
  return next
}

function normalizeChatCompletionData(data: Record<string, unknown>, wantsJson: boolean) {
  const next: Record<string, unknown> = { ...data }
  const choices = next.choices
  const topLevelFallback = getTextContent(next.output_text ?? next.text ?? next.content ?? next.response)

  if (!Array.isArray(choices) || choices.length === 0) {
    const content = wantsJson ? extractJsonSnippet(topLevelFallback) || topLevelFallback : topLevelFallback
    if (!content) return { data: next, content: '' }

    next.choices = [{
      index: 0,
      message: { role: 'assistant', content },
      finish_reason: 'stop',
    }]
    return { data: next, content }
  }

  const firstChoice = choices[0] && typeof choices[0] === 'object'
    ? { ...(choices[0] as Record<string, unknown>) }
    : { index: 0 }
  const rawMessage = firstChoice.message
  const message = rawMessage && typeof rawMessage === 'object'
    ? { ...(rawMessage as Record<string, unknown>) }
    : { role: 'assistant' }

  let content = getTextContent(message.content)
  if (!content) {
    const fallback = getTextContent(
      message.reasoning ??
      message.text ??
      firstChoice.text ??
      topLevelFallback
    )
    content = wantsJson ? extractJsonSnippet(fallback) || fallback : fallback
    if (content) {
      message.content = content
      firstChoice.message = message
      next.choices = [firstChoice, ...choices.slice(1)]
    }
  }

  return { data: next, content }
}

async function pollinationsResponse(body: Record<string, unknown>) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (POLLINATIONS_API_KEY) headers.Authorization = `Bearer ${POLLINATIONS_API_KEY}`

  let response: Response
  try {
    response = await fetch(POLLINATIONS_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(filterFallbackBody(body)),
    })
  } catch {
    return jsonResponse({
      error: 'OpenRouter sem creditos e fallback Pollinations indisponivel.',
      source: 'pollinations',
    }, 502)
  }

  if (!response.ok) {
    const contentType = response.headers.get('Content-Type') || ''
    const detail: unknown = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : null
    return jsonResponse({
      error: `OpenRouter sem creditos e fallback Pollinations indisponivel (${response.status}).`,
      status: response.status,
      source: 'pollinations',
      ...(detail && typeof detail === 'object' ? { details: detail } : {}),
    }, 502)
  }

  if (body.stream) {
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-AI-Provider': 'pollinations',
      },
    })
  }

  const data = await response.json().catch(() => null)
  if (!data) {
    return jsonResponse({ error: 'Pollinations returned an invalid JSON response', source: 'pollinations' }, 502)
  }

  const normalized = normalizeChatCompletionData(data as Record<string, unknown>, Boolean(body.response_format))
  if (!normalized.content) {
    return jsonResponse({ error: 'Pollinations returned an empty response', source: 'pollinations' }, 502)
  }

  return jsonResponse({ ...normalized.data, provider_fallback: 'pollinations' }, 200, {
    'X-AI-Provider': 'pollinations',
  })
}

export async function handleOpenRouterRequest(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    if (!OPENROUTER_API_KEY) {
      return jsonResponse({
        error: 'OPENROUTER_API_KEY is not configured in Supabase secrets',
        code: 'missing_openrouter_api_key',
      }, 500)
    }

    const payload = await req.json().catch(() => null) as ChatRequest | null
    if (!payload) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    if (!Array.isArray(payload.messages) || payload.messages.length === 0) {
      return jsonResponse({ error: 'Messages array is required' }, 400)
    }

    const primaryModel = getModel(payload)
    const modelCandidates = getModelCandidates(primaryModel)
    let responseFormat = payload.response_format && typeof payload.response_format === 'object'
      ? payload.response_format
      : null
    let lastBody: Record<string, unknown> | null = null
    let lastResponse: Response | null = null
    let lastModel = primaryModel

    for (let i = 0; i < modelCandidates.length; i++) {
      const model = modelCandidates[i]
      lastModel = model
      const body: Record<string, unknown> = {
        model,
        messages: payload.messages,
        temperature: getTemperature(payload),
        max_tokens: getMaxTokens(payload),
      }

      if (responseFormat) body.response_format = responseFormat
      if (payload.stream) body.stream = true
      lastBody = body

      let response: Response
      try {
        response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': OPENROUTER_REFERER,
            'X-Title': OPENROUTER_TITLE,
            'X-OpenRouter-Experimental-Metadata': 'enabled',
          },
          body: JSON.stringify(body),
        })
      } catch (err) {
        if (i < modelCandidates.length - 1) continue
        throw err
      }

      if (!response.ok) {
        lastResponse = response
        const cloned = response.clone()
        const contentType = cloned.headers.get('Content-Type') || ''
        const errorBody = contentType.includes('application/json')
          ? await cloned.json().catch(() => null)
          : null
        const errorMessage = getErrorMessage(errorBody, `OpenRouter error: ${response.status}`)

        if (responseFormat && isResponseFormatUnsupported(response.status, errorMessage)) {
          responseFormat = null
          i -= 1
          continue
        }

        if (i < modelCandidates.length - 1 && shouldTryNextModel(response.status, errorMessage)) {
          continue
        }

        if (shouldUseProviderFallback(response.status, errorMessage)) {
          return await pollinationsResponse(body)
        }

        return await openRouterErrorResponse(response, model)
      }

      if (payload.stream) {
        return new Response(response.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-AI-Model': model,
          },
        })
      }

      const data = await response.json().catch(() => null) as Record<string, unknown> | null
      const choices = data?.choices
      const firstChoice = Array.isArray(choices) ? choices[0] as Record<string, unknown> | undefined : undefined
      const message = firstChoice?.message as Record<string, unknown> | undefined
      const content = message?.content
      if (!data || !content) {
        if (i < modelCandidates.length - 1) continue
        return jsonResponse({ error: 'OpenRouter returned an empty or invalid response', source: 'openrouter', model }, 502)
      }

      return jsonResponse({ ...data, model_fallback_used: model !== primaryModel ? model : undefined })
    }

    if (lastResponse) return await openRouterErrorResponse(lastResponse, lastModel)
    if (lastBody) return await pollinationsResponse(lastBody)
    return jsonResponse({ error: 'No OpenRouter model candidates available', source: 'openrouter' }, 500)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return jsonResponse({ error: message }, 500)
  }
}
