import { errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { sha256 } from '../_shared/crypto.ts'
import { createServiceClient, requireProjectAccess, requireUser, requireWorkspaceRole } from '../_shared/supabase.ts'

const acceptedMimeTypes = new Set(['text/plain', 'text/markdown', 'text/x-markdown'])

function clean(value: unknown, limit: number) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, limit)
}

Deno.serve(async (request) => {
  const options = handleOptions(request)
  if (options) return options
  try {
    if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)
    const { projectId, kind, title, content, fileName, mimeType } = await request.json()
    if (!projectId || !['paste', 'upload'].includes(kind)) throw new Error('Fonte manual incompleta.')
    const rawContent = String(content || '').replace(/\u0000/g, '').trim()
    if (rawContent.length > 400_000) throw new Error('O documento excede o limite de 400 mil caracteres deste MVP.')
    const sourceContent = rawContent
    if (!sourceContent) throw new Error('O texto está vazio.')
    const resolvedMime = kind === 'paste' ? 'text/plain' : clean(mimeType || 'text/plain', 120).toLowerCase().split(';')[0]
    if (!acceptedMimeTypes.has(resolvedMime)) throw new Error('Neste MVP, o upload aceita arquivos TXT e Markdown.')
    const sourceName = clean(title || fileName || (kind === 'paste' ? 'Texto colado' : 'Documento enviado'), 240) || (kind === 'paste' ? 'Texto colado' : 'Documento enviado')
    const { client, user } = await requireUser(request)
    const project = await requireProjectAccess(client, user, projectId)
    await requireWorkspaceRole(client, user, project.workspace_id, ['owner', 'admin', 'editor'])
    const service = createServiceClient()
    const { data: sourceId, error } = await service.rpc('insert_manual_text_source', {
      target_workspace_id: project.workspace_id,
      target_project_id: project.id,
      target_user_id: user.id,
      provider_kind: kind,
      source_name: sourceName,
      source_content: sourceContent,
      source_mime_type: resolvedMime,
      source_hash: await sha256(`${resolvedMime}:${sourceContent}`),
    })
    if (error) throw error
    const { data: source, error: sourceError } = await service.from('project_sources').select('*').eq('id', sourceId).single()
    if (sourceError) throw sourceError
    return jsonResponse({ source }, 201)
  } catch (error) {
    return errorResponse(error, 400)
  }
})
