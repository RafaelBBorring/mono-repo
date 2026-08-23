import { errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getMiroToken, miroFetch } from '../_shared/miro.ts'
import { createServiceClient, requireProjectAccess, requireUser, requireWorkspaceRole } from '../_shared/supabase.ts'

function extractText(item: Record<string, unknown>): string {
  const data = (item.data || {}) as Record<string, unknown>
  return String(data.content || data.text || data.caption || item.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

Deno.serve(async (request) => {
  const options = handleOptions(request)
  if (options) return options
  try {
    if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)
    const { projectId, sourceId, query } = await request.json()
    const term = String(query || '').trim()
    if (!projectId || !sourceId || !term) throw new Error('Projeto, fonte e termo são obrigatórios.')
    const { client, user } = await requireUser(request)
    const project = await requireProjectAccess(client, user, projectId)
    await requireWorkspaceRole(client, user, project.workspace_id, ['owner', 'admin', 'editor'])
    const service = createServiceClient()
    const { data: source, error } = await service.from('project_sources').select('id,remote_id,connection_id,workspace_id,provider').eq('id', sourceId).single()
    if (error || !source) throw new Error('Fonte não encontrada.')
    if (source.provider !== 'miro') throw new Error('Consulta ao vivo disponível apenas para fontes Miro.')

    const token = await getMiroToken(service, source.connection_id, source.workspace_id)
    const terms = term.toLowerCase().split(/\s+/).map((word) => word.replace(/[^\p{L}\p{N}]/gu, '')).filter((word) => word.length > 3)
    if (!terms.length) return jsonResponse({ matches: [], query: term })

    const matches: Array<{ id: string; type: string; text: string; url: string }> = []
    let cursor: string | null = null
    const boardUrl = `https://miro.com/app/board/${encodeURIComponent(String(source.remote_id))}/`
    for (let page = 0; page < 4 && matches.length < 8; page += 1) {
      const path = `/boards/${encodeURIComponent(String(source.remote_id))}/items?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
      const body = await miroFetch(token, path) as Record<string, unknown>
      const items = Array.isArray(body.data) ? body.data as Record<string, unknown>[] : []
      for (const item of items) {
        const text = extractText(item)
        if (text && terms.some((word) => text.toLowerCase().includes(word))) {
          matches.push({ id: String(item.id || ''), type: String(item.type || ''), text: text.slice(0, 600), url: boardUrl })
          if (matches.length >= 8) break
        }
      }
      cursor = (body.cursor as string | null) || null
      if (!cursor) break
    }
    return jsonResponse({ matches, query: term, sourceId })
  } catch (error) {
    return errorResponse(error, 400)
  }
})
