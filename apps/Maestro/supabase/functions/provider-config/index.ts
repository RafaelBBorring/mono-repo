import { errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { createServiceClient, requireProjectAccess, requireUser, requireWorkspaceRole } from '../_shared/supabase.ts'

const allowedHosts = new Set(['openrouter.ai', 'api.z.ai', 'api.openai.com', 'generativelanguage.googleapis.com', 'api.deepseek.com', 'api.mistral.ai', 'api.groq.com', 'api.together.xyz'])

function parseBlob(raw: unknown) {
  if (!raw || typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && parsed.ciphertext && parsed.iv && parsed.salt ? parsed : null
  } catch {
    return null
  }
}

Deno.serve(async (request) => {
  const options = handleOptions(request)
  if (options) return options
  try {
    if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)
    const { action, projectId, provider } = await request.json()
    if (!projectId || !['get', 'upsert'].includes(action)) throw new Error('Configuração incompleta.')
    const { client, user } = await requireUser(request)
    const project = await requireProjectAccess(client, user, projectId)
    const service = createServiceClient()
    if (action === 'get') {
      const { data, error } = await service.from('ai_provider_configs').select('id,provider,model,endpoint_url,power_profile,enabled,api_key_ciphertext,vision_model,vision_endpoint_url,vision_api_key_ciphertext,updated_at').eq('workspace_id', project.workspace_id).eq('project_id', project.id).eq('enabled', true).order('updated_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      return jsonResponse({ provider: data ? { id: data.id, provider: data.provider, model: data.model, endpointUrl: data.endpoint_url, power: data.power_profile, enabled: data.enabled, hasCustomKey: Boolean(data.api_key_ciphertext), apiKeyBlob: parseBlob(data.api_key_ciphertext), visionModel: data.vision_model || '', visionEndpointUrl: data.vision_endpoint_url || '', hasVisionKey: Boolean(data.vision_api_key_ciphertext), visionApiKeyBlob: parseBlob(data.vision_api_key_ciphertext), updatedAt: data.updated_at } : null })
    }
    if (!provider || !['openrouter', 'openai-compatible', 'zai'].includes(provider.provider)) throw new Error('Provedor inválido.')
    await requireWorkspaceRole(client, user, project.workspace_id, ['owner', 'admin'])
    if (provider.provider === 'openai-compatible' && !provider.endpointUrl) throw new Error('Informe o endpoint compatível com OpenAI.')
    const endpoint = provider.endpointUrl || (provider.provider === 'zai' ? 'https://api.z.ai/api/paas/v4/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions')
    const parsedEndpoint = new URL(endpoint)
    if (parsedEndpoint.protocol !== 'https:' || !allowedHosts.has(parsedEndpoint.hostname)) throw new Error('Endpoint de IA não autorizado.')
    if (!provider.model || provider.model.length > 160) throw new Error('Identificador de modelo inválido.')
    if (!['low', 'medium', 'max'].includes(provider.power)) throw new Error('Perfil de potência inválido.')
    const usesManagedOpenRouter = parsedEndpoint.hostname === 'openrouter.ai' && provider.provider === 'openrouter'
    if (!usesManagedOpenRouter && !provider.apiKeyBlob) {
      const { data: existing } = await service.from('ai_provider_configs').select('api_key_ciphertext').eq('workspace_id', project.workspace_id).eq('project_id', project.id).eq('provider', provider.provider).maybeSingle()
      if (!parseBlob(existing?.api_key_ciphertext)) throw new Error('Uma chave própria é obrigatória para este provedor ou endpoint.')
    }

    const payload: Record<string, unknown> = {
      workspace_id: project.workspace_id,
      project_id: project.id,
      provider: provider.provider,
      model: provider.model,
      endpoint_url: endpoint,
      power_profile: provider.power,
      enabled: true,
    }
    if (provider.apiKeyBlob) payload.api_key_ciphertext = JSON.stringify(provider.apiKeyBlob)
    if (provider.clearCustomKey) payload.api_key_ciphertext = null
    if (provider.visionEndpointUrl) {
      const visionParsed = new URL(provider.visionEndpointUrl)
      if (visionParsed.protocol !== 'https:' || !allowedHosts.has(visionParsed.hostname)) throw new Error('Endpoint de visão não autorizado.')
      payload.vision_endpoint_url = provider.visionEndpointUrl
    }
    if (provider.visionModel !== undefined && provider.visionModel !== null) {
      if (String(provider.visionModel).length > 160) throw new Error('Identificador de modelo de visão inválido.')
      payload.vision_model = provider.visionModel || null
    }
    if (provider.visionApiKeyBlob) payload.vision_api_key_ciphertext = JSON.stringify(provider.visionApiKeyBlob)
    if (provider.clearVisionKey) payload.vision_api_key_ciphertext = null
    const { error: disableError } = await service.from('ai_provider_configs').update({ enabled: false }).eq('workspace_id', project.workspace_id).eq('project_id', project.id).neq('provider', provider.provider)
    if (disableError) throw disableError
    const { data, error } = await service
      .from('ai_provider_configs')
      .upsert(payload, { onConflict: 'workspace_id,project_id,provider' })
      .select('id, provider, model, power_profile, enabled, updated_at')
      .single()
    if (error) throw error
    const { error: auditError } = await service.from('audit_log').insert({
      workspace_id: project.workspace_id,
      project_id: project.id,
      actor_user_id: user.id,
      action: 'ai_provider.updated',
      target_type: 'ai_provider_config',
      target_id: data.id,
      after_data: { provider: data.provider, model: data.model, power: data.power_profile },
    })
    if (auditError) throw auditError
    return jsonResponse({ provider: data })
  } catch (error) {
    return errorResponse(error, 400)
  }
})
