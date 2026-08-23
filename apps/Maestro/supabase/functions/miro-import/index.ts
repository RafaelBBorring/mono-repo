import { errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { getMiroToken, miroFetch } from '../_shared/miro.ts'
import { createServiceClient, requireProjectAccess, requireUser, requireWorkspaceRole } from '../_shared/supabase.ts'

Deno.serve(async (request) => {
  const options = handleOptions(request)
  if (options) return options
  try {
    if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)
    const { projectId, boardId, connectionId } = await request.json()
    if (!projectId || !boardId || !connectionId) throw new Error('Projeto, board e conexão são obrigatórios.')
    const { client, user } = await requireUser(request)
    const project = await requireProjectAccess(client, user, projectId)
    await requireWorkspaceRole(client, user, project.workspace_id, ['owner', 'admin', 'editor'])
    const service = createServiceClient()
    const { data: connection, error: connectionError } = await service.from('provider_connections').select('id').eq('id', connectionId).eq('workspace_id', project.workspace_id).eq('user_id', user.id).eq('provider', 'miro').eq('status', 'active').single()
    if (connectionError || !connection) throw new Error('Conexão pessoal do Miro não encontrada.')

    const { data: workspace, error: workspaceError } = await service
      .from('workspaces')
      .select('plan_id, plans(entitlements)')
      .eq('id', project.workspace_id)
      .single()
    if (workspaceError) throw workspaceError
    const entitlements = (workspace.plans as { entitlements?: Record<string, number> })?.entitlements || {}
    const { count } = await service
      .from('project_sources')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', project.workspace_id)
      .eq('provider', 'miro')
      .neq('remote_id', boardId)
    if ((count || 0) >= Number(entitlements.miro_boards || 1)) throw new Error('O limite de boards do seu plano foi atingido.')

    const token = await getMiroToken(service, connectionId, project.workspace_id)
    const board = await miroFetch(token, `/boards/${encodeURIComponent(boardId)}`)
    const { data: existingSource } = await service.from('project_sources').select('id,sync_status,updated_at,metadata').eq('project_id', project.id).eq('provider', 'miro').eq('remote_id', boardId).maybeSingle()
    const sdkCapturePending = existingSource?.sync_status === 'attention'
    const sourcePayload = {
      workspace_id: project.workspace_id,
      project_id: project.id,
      connection_id: connectionId,
      provider: 'miro',
      remote_id: board.id,
      name: board.name || 'Board do Miro',
      source_url: board.viewLink || null,
      source_type: 'board',
      sync_status: 'queued',
      last_remote_update: board.modifiedAt || board.updatedAt || null,
      metadata: { ...(existingSource?.metadata || {}), description: board.description || null, teamId: board.team?.id || null },
    }
    const { data: source, error: sourceError } = await service
      .from('project_sources')
      .upsert(sourcePayload, { onConflict: 'project_id,provider,remote_id' })
      .select()
      .single()
    if (sourceError) throw sourceError

    const version = `${String(board.modifiedAt || board.updatedAt || new Date().toISOString())}${sdkCapturePending ? `:sdk:${existingSource?.updated_at}` : ''}`
    const idempotencyKey = `miro:${board.id}:${version}`
    const { data: existingJob } = await service.from('ingestion_jobs').select('*').eq('source_id', source.id).eq('idempotency_key', idempotencyKey).maybeSingle()
    if (existingJob) {
      if (existingJob.status === 'partial') {
        const { count: failedCount } = await service.from('ingestion_chunks').select('id', { count: 'exact', head: true }).eq('job_id', existingJob.id).eq('status', 'failed')
        if (failedCount) {
          await service.from('ingestion_chunks').update({ status: 'queued', error: null, locked_at: null, locked_by: null, completed_at: null }).eq('job_id', existingJob.id).eq('status', 'failed')
          const resumed = { ...existingJob, status: 'processing', stage: 'analysis', progress: Math.min(95, Number(existingJob.progress || 35)) }
          await service.from('ingestion_jobs').update({ status: resumed.status, stage: resumed.stage, progress: resumed.progress, completed_at: null }).eq('id', existingJob.id)
          return jsonResponse({ source, job: resumed, alreadyCurrent: false, resumed: true, nextAction: 'process' }, 202)
        }
      }
      const finished = existingJob.status === 'complete' || existingJob.status === 'partial'
      if (finished) {
        const restoredStatus = existingJob.status === 'complete' ? 'ready' : 'partial'
        await service.from('project_sources').update({ sync_status: restoredStatus }).eq('id', source.id)
        source.sync_status = restoredStatus
      }
      return jsonResponse({ source, job: existingJob, alreadyCurrent: finished, nextAction: finished ? 'none' : 'process' }, finished ? 200 : 202)
    }
    const { data: job, error: jobError } = await service
      .from('ingestion_jobs')
      .insert({
        workspace_id: project.workspace_id,
        project_id: project.id,
        source_id: source.id,
        requested_by: user.id,
        idempotency_key: idempotencyKey,
        status: 'queued',
        stage: 'inventory',
      })
      .select()
      .single()
    if (jobError) throw jobError
    await service.from('project_sources').update({ sync_status: 'syncing' }).eq('id', source.id)
    return jsonResponse({ source, job, nextAction: 'process' }, 202)
  } catch (error) {
    return errorResponse(error, 400)
  }
})
