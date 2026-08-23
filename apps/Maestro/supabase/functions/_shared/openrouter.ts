import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

type ModelProfile = {
  apiKey: string
  model: string
  fallbackModels?: string[]
  power: 'low' | 'medium' | 'max'
  endpoint: string
}

function envModelList(name: string) {
  return (Deno.env.get(name) || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean)
}

export const powerProfiles = {
  low: { evidenceLimit: 6, maxTokens: 900, verify: false },
  medium: { evidenceLimit: 12, maxTokens: 1600, verify: true },
  max: { evidenceLimit: 24, maxTokens: 2600, verify: true },
}

export async function resolveTextModel(service: SupabaseClient, workspaceId: string, projectId: string, ephemeralKey?: string): Promise<ModelProfile> {
  const { data } = await service
    .from('ai_provider_configs')
    .select('provider, model, endpoint_url, power_profile, api_key_ciphertext')
    .eq('workspace_id', workspaceId)
    .or(`project_id.eq.${projectId},project_id.is.null`)
    .eq('enabled', true)
    .order('project_id', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  const managedKey = Deno.env.get('OPENROUTER_API_KEY') || ''
  const endpoint = data?.endpoint_url || 'https://openrouter.ai/api/v1/chat/completions'
  const managedEndpoint = new URL(endpoint).hostname === 'openrouter.ai' && (!data?.provider || data.provider === 'openrouter')
  const hasUserKey = Boolean(data?.api_key_ciphertext)
  return {
    apiKey: ephemeralKey || (hasUserKey ? '' : managedEndpoint ? managedKey : ''),
    model: data?.model || Deno.env.get('OPENROUTER_TEXT_MODEL') || 'openrouter/free',
    fallbackModels: data?.model ? [] : envModelList('OPENROUTER_TEXT_FALLBACK_MODELS'),
    power: (data?.power_profile || 'medium') as ModelProfile['power'],
    endpoint,
  }
}

export async function resolveVisionModel(service: SupabaseClient, workspaceId: string, projectId: string, ephemeralKey?: string): Promise<ModelProfile> {
  const { data } = await service
    .from('ai_provider_configs')
    .select('vision_model, vision_endpoint_url, vision_api_key_ciphertext, power_profile')
    .eq('workspace_id', workspaceId)
    .or(`project_id.eq.${projectId},project_id.is.null`)
    .eq('enabled', true)
    .order('project_id', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()
  const managedKey = Deno.env.get('OPENROUTER_API_KEY') || ''
  const endpoint = data?.vision_endpoint_url || 'https://openrouter.ai/api/v1/chat/completions'
  const managedEndpoint = new URL(endpoint).hostname === 'openrouter.ai'
  const hasUserKey = Boolean(data?.vision_api_key_ciphertext)
  return {
    apiKey: ephemeralKey || (hasUserKey ? '' : managedEndpoint ? managedKey : ''),
    model: data?.vision_model || Deno.env.get('OPENROUTER_VISION_MODEL') || 'openrouter/free',
    fallbackModels: data?.vision_model ? [] : envModelList('OPENROUTER_VISION_FALLBACK_MODELS'),
    power: (data?.power_profile || 'medium') as ModelProfile['power'],
    endpoint,
  }
}

export async function callModel(profile: ModelProfile, messages: unknown[], options: { json?: boolean; maxTokens?: number } = {}) {
  if (!profile.apiKey) throw new Error('Nenhuma chave de IA foi configurada no servidor ou pelo usuário.')
  const candidates = [...new Set([profile.model, ...(profile.fallbackModels || [])])]
  let lastFailure = 'Nenhum modelo respondeu.'

  for (const model of candidates) {
    const response = await fetch(profile.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${profile.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('APP_URL') || 'https://maestro.app',
        'X-Title': 'Maestro Creative Intelligence',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options.maxTokens || powerProfiles[profile.power].maxTokens,
        temperature: options.json ? 0.1 : 0.35,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      lastFailure = `${response.status}: ${detail.slice(0, 220)}`
      continue
    }

    const payload = await response.json()
    const content = payload.choices?.[0]?.message?.content || ''
    if (!content) {
      lastFailure = `${model} retornou uma resposta vazia.`
      continue
    }
    return {
      content,
      model: payload.model || model,
      usage: payload.usage || {},
    }
  }

  throw new Error(`Os modelos configurados não responderam: ${lastFailure}`)
}

export function parseModelJson(content: string) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  return JSON.parse(fenced || content)
}
