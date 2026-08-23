import { supabase } from '../lib/supabase'
import { functionErrorMessage } from './functionErrors'

async function invoke(name, body) {
  if (!supabase) throw new Error('O backend do Maestro ainda não foi configurado.')
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) throw new Error(await functionErrorMessage(error))
  return data
}

export const maestroApi = {
  startMiroOAuth(projectId) {
    return invoke('miro-oauth', { action: 'authorize', projectId })
  },
  listMiroBoards(projectId) {
    return invoke('miro-oauth', { action: 'boards', projectId })
  },
  importMiroBoard(projectId, boardId, connectionId) {
    return invoke('miro-import', { projectId, boardId, connectionId })
  },
  processIngestion(jobId, textKey, visionKey) {
    return invoke('ingestion-worker', { jobId, textKey, visionKey })
  },
  saveMiroSdkCapture(projectId, sourceId, items) {
    return invoke('miro-sdk-capture', { projectId, sourceId, items })
  },
  addManualSource(projectId, source) {
    return invoke('manual-source', { projectId, ...source })
  },
  chat(projectId, conversationId, message, mode = 'canon', canon = [], liveEvidence = [], textKey) {
    return invoke('maestro-chat', { projectId, conversationId, message, mode, canon, liveEvidence, textKey })
  },
  liveSearchMiro(projectId, sourceId, query) {
    return invoke('miro-live-search', { projectId, sourceId, query })
  },
  saveProvider(projectId, provider) {
    return invoke('provider-config', { action: 'upsert', projectId, provider })
  },
  getProvider(projectId) {
    return invoke('provider-config', { action: 'get', projectId })
  },
}
