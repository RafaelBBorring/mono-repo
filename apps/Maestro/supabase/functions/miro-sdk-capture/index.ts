import { errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { createServiceClient, requireProjectAccess, requireUser, requireWorkspaceRole } from '../_shared/supabase.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request)
  if (options) return options
  try {
    if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)
    const { projectId, sourceId, items } = await request.json()
    if (!projectId || !sourceId || !Array.isArray(items) || !items.length) throw new Error('Captura incompleta.')
    if (items.length > 250) throw new Error('Envie no máximo 250 itens por lote.')
    const { client, user } = await requireUser(request)
    const project = await requireProjectAccess(client, user, projectId)
    await requireWorkspaceRole(client, user, project.workspace_id, ['owner', 'admin', 'editor'])
    const sanitized = items.map((item) => ({
      id: String(item.id || '').slice(0, 200),
      type: String(item.type || 'unsupported').slice(0, 80),
      parentId: item.parentId ? String(item.parentId).slice(0, 200) : null,
      title: item.title ? String(item.title).slice(0, 500) : null,
      filename: item.filename ? String(item.filename).slice(0, 500) : null,
      x: Number(item.x || 0),
      y: Number(item.y || 0),
      width: Number(item.width || 0),
      height: Number(item.height || 0),
      rotation: Number(item.rotation || 0),
      relativeTo: item.relativeTo ? String(item.relativeTo).slice(0, 80) : null,
    })).filter((item) => item.id)
    const service = createServiceClient()
    const { data, error } = await service.rpc('merge_miro_sdk_capture', {
      target_workspace_id: project.workspace_id,
      target_project_id: project.id,
      target_source_id: sourceId,
      captured_items: sanitized,
    })
    if (error) throw error
    const { error: sourceError } = await service.from('project_sources').update({ sync_status: 'attention' }).eq('id', sourceId).eq('project_id', project.id)
    if (sourceError) throw sourceError
    return jsonResponse({ merged: data })
  } catch (error) {
    return errorResponse(error, 400)
  }
})
