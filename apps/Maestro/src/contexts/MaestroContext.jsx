import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { demoState } from '../data/demoData'
import { maestroApi } from '../services/maestroApi'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import { answerDemoQuestion } from '../services/demoOracle'
import { listCanonRules, saveCanonConflict } from '../services/localVault/canon'
import { decryptSecret } from '../services/localVault/clientCrypto'

const MaestroContext = createContext(null)
const STORAGE_KEY = 'maestro-mvp-demo-state-v2'

const emptyUsage = {
  projects: { used: 0, limit: 1 },
  memory: { used: 0, limit: 100, unit: 'mil tokens' },
  analyses: { used: 0, limit: 300 },
}

function createEmptyState() {
  return {
    planName: 'Free',
    projects: [],
    activeProjectId: null,
    sources: [],
    entities: [],
    episodes: [],
    reviews: [],
    messages: [],
    usage: structuredClone(emptyUsage),
  }
}

function createDemoState() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return structuredClone(demoState)
  try {
    const parsed = JSON.parse(stored)
    if (!parsed?.projects?.some((project) => project.id === 'project-atlas')) return structuredClone(demoState)
    return parsed
  } catch {
    return structuredClone(demoState)
  }
}

function formatEventDate(value) {
  if (!value) return 'DATA NÃO REGISTRADA'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00.000Z`))
    .replace('.', '')
    .toLocaleUpperCase('pt-BR')
}

export function MaestroProvider({ children }) {
  const { isDemo, user } = useAuth()
  const authScope = isDemo ? 'demo' : user ? `user:${user.id}` : 'anonymous'
  const [state, setState] = useState(() => (isDemo ? createDemoState() : createEmptyState()))
  const [syncJob, setSyncJob] = useState(null)
  const [toast, setToast] = useState(null)
  const [chatting, setChatting] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [conversations, setConversations] = useState([])
  const unlockedKeysRef = useRef({ text: null, vision: null })
  const [vault, setVault] = useState({ unlocked: false, hasTextKey: false, hasVisionKey: false, textBlob: null, visionBlob: null })
  const [loadedScope, setLoadedScope] = useState(() => (isDemo ? 'demo' : null))
  const [workspaceError, setWorkspaceError] = useState('')
  const syncTimer = useRef(null)
  const remoteJobs = useRef(new Set())
  const activeProjectIdRef = useRef(state.activeProjectId)
  const authScopeRef = useRef(authScope)
  const sessionEpoch = useRef(0)
  const loadRequestId = useRef(0)

  const notify = useCallback((message, tone = 'success') => {
    setToast({ id: Date.now(), message, tone })
  }, [])

  const loadBackendState = useCallback(async (preferredProjectId = null) => {
    if (!supabase || !user || isDemo) return
    const requestedScope = `user:${user.id}`
    const requestId = ++loadRequestId.current
    const isCurrentRequest = () => authScopeRef.current === requestedScope && loadRequestId.current === requestId
    setWorkspaceError('')
    try {
      const { data: projects, error: projectError } = await supabase.from('projects').select('*').eq('status', 'active').order('created_at').limit(20)
      if (projectError) throw projectError
      if (!isCurrentRequest()) return
      if (!projects?.length) {
        setState(createEmptyState())
        activeProjectIdRef.current = null
        setConversationId(null)
        return
      }
      const requestedProjectId = preferredProjectId || activeProjectIdRef.current
      const active = projects.find((project) => project.id === requestedProjectId) || projects[0]
      const [sourceResult, entityResult, eventResult, reviewResult, conversationResult, usageResult] = await Promise.all([
        supabase.from('project_sources').select('*').eq('project_id', active.id).order('created_at'),
        supabase.from('entities').select('*').eq('project_id', active.id).neq('editorial_state', 'rejected').order('updated_at', { ascending: false }).limit(300),
        supabase.from('narrative_events').select('*,narrative_event_evidence(evidence_id)').eq('project_id', active.id).eq('active', true).order('event_date', { ascending: false, nullsFirst: false }).order('sequence_number', { ascending: false, nullsFirst: false }).limit(300),
        supabase.from('review_items').select('*').eq('project_id', active.id).order('created_at', { ascending: false }).limit(200),
        supabase.from('conversations').select('id,title').eq('project_id', active.id).eq('created_by', user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.rpc('workspace_usage_snapshot', { target_workspace_id: active.workspace_id }),
      ])
      if (sourceResult.error) throw sourceResult.error
      if (entityResult.error) throw entityResult.error
      if (eventResult.error) throw eventResult.error
      if (reviewResult.error) throw reviewResult.error
      if (conversationResult.error) throw conversationResult.error
      if (usageResult.error) throw usageResult.error
      if (!isCurrentRequest()) return

      let backendMessages = []
      if (conversationResult.data?.id) {
        const messageResult = await supabase.from('messages').select('id,role,content,created_at,answer_state,model_run').eq('conversation_id', conversationResult.data.id).order('created_at', { ascending: false }).limit(100)
        if (messageResult.error) throw messageResult.error
        const messageIds = (messageResult.data || []).map((message) => message.id)
        let citationRows = []
        const evidenceById = new Map()
        if (messageIds.length) {
          const citationResult = await supabase
            .from('message_citations')
            .select('id,message_id,evidence_id,citation_order,evidence_snapshot')
            .in('message_id', messageIds)
            .order('citation_order')
          if (citationResult.error) throw citationResult.error
          citationRows = citationResult.data || []
          const evidenceIds = [...new Set(citationRows.map((row) => row.evidence_id).filter(Boolean))]
          if (evidenceIds.length) {
            const evidenceResult = await supabase.from('evidence').select('id,evidence_type,excerpt,source_url,locator,project_sources(name,source_url)').in('id', evidenceIds)
            if (evidenceResult.error) throw evidenceResult.error
            for (const evidence of evidenceResult.data || []) evidenceById.set(evidence.id, evidence)
          }
        }
        const citationsByMessage = new Map()
        for (const row of citationRows) {
          const evidence = evidenceById.get(row.evidence_id)
          const snapshot = row.evidence_snapshot || {}
          const snapshotSource = Array.isArray(snapshot.source) ? snapshot.source[0] : snapshot.source
          const source = (Array.isArray(evidence?.project_sources) ? evidence.project_sources[0] : evidence?.project_sources) || snapshotSource
          const epistemicClasses = Array.isArray(snapshot.epistemicClasses) ? snapshot.epistemicClasses : []
          const isConfirmed = epistemicClasses.length
            ? epistemicClasses.every((item) => ['explicit_text', 'explicit_metadata', 'user_assertion'].includes(item))
            : Boolean(evidence) && !['visual', 'spatial'].includes(evidence.evidence_type)
          const citations = citationsByMessage.get(row.message_id) || []
          citations.push({
            id: evidence?.id || row.id,
            label: String(evidence?.excerpt || snapshot.excerpt || 'Evidência conectada').slice(0, 90),
            source: source?.name || 'Fonte conectada',
            confidence: isConfirmed ? 'confirmado' : 'inferência rotulada',
            sourceUrl: evidence?.source_url || snapshot.sourceUrl || source?.source_url || null,
            locator: evidence?.locator || snapshot.locator || null,
          })
          citationsByMessage.set(row.message_id, citations)
        }
        if (!isCurrentRequest()) return
        backendMessages = [...(messageResult.data || [])].reverse().map((message) => ({
          ...message,
          answerState: message.answer_state,
          presentation: message.model_run?.presentation || undefined,
          followUp: message.model_run?.followUp || undefined,
          createdAt: new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          citations: citationsByMessage.get(message.id) || [],
        }))
      }

      const mappedSources = (sourceResult.data || []).map((source) => ({
        id: source.id,
        remoteId: source.remote_id,
        connectionId: source.connection_id,
        provider: source.provider,
        name: source.name,
        kind: source.provider === 'paste'
          ? 'Texto colado'
          : source.provider === 'upload'
            ? 'Arquivo enviado'
            : source.source_type === 'board'
              ? 'Board conectado'
              : source.source_type,
        status: source.sync_status === 'ready' ? 'synced' : source.sync_status === 'partial' ? 'attention' : source.sync_status === 'syncing' ? 'processing' : source.sync_status === 'paused' ? 'unlinked' : source.sync_status,
        itemCount: source.item_count || 0,
        imageCount: source.coverage?.images || source.coverage?.imageItems || 0,
        documentCount: source.coverage?.texts || source.coverage?.textItems || 0,
        lastSync: source.last_synced_at ? new Date(source.last_synced_at).toLocaleString('pt-BR') : 'Ainda não analisado',
        progress: source.coverage?.percentage ?? (source.sync_status === 'ready' ? 100 : 0),
        coverage: source.coverage || {},
        sourceUrl: source.source_url || null,
        accent: '#ffd37a',
      }))
      const mappedEntities = (entityResult.data || []).map((entity) => ({
        id: entity.id,
        name: entity.name,
        category: entity.category,
        summary: entity.summary || 'Ainda sem resumo consolidado.',
        confidence: Math.round(Number(entity.confidence || 0) * 100),
        facts: entity.attributes?.facts || 0,
        relations: entity.attributes?.relations || 0,
        updatedAt: new Date(entity.updated_at).toLocaleDateString('pt-BR'),
        accent: entity.attributes?.accent || '#d7b26d',
        initials: entity.name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase(),
        tags: Array.isArray(entity.attributes?.tags) ? entity.attributes.tags : [entity.category],
      }))
      const typeLabels = { narrative_gap: 'Narrativa incompleta', conflict: 'Contradição', identity: 'Identidade visual', canonical_change: 'Alteração canônica', merge: 'Mesclagem', category: 'Categoria' }
      const mappedEvents = (eventResult.data || []).map((event) => ({
        id: event.id,
        label: event.label || (event.sequence_number ? `Episódio ${event.sequence_number}` : 'Evento'),
        title: event.title,
        date: formatEventDate(event.event_date),
        campaign: event.campaign || 'Campanha não identificada',
        status: event.status === 'documented' ? 'complete' : 'needs-context',
        summary: event.summary || event.metadata?.missingInformation || 'O evento foi reconhecido, mas as fontes ainda não registram um resumo suficiente.',
        sources: new Set((event.narrative_event_evidence || []).map((link) => link.evidence_id)).size,
      }))
      const mappedReviews = (reviewResult.data || []).map((review) => ({
        id: review.id,
        type: typeLabels[review.review_type] || 'Interpretação',
        title: review.title,
        description: review.description || 'Esta interpretação requer sua confirmação.',
        confidence: Math.round(Number(review.confidence || 0) * 100),
        source: review.proposal?.source || 'Evidências conectadas',
        status: review.status,
        evidence: review.proposal?.itemIds || [],
      }))
      const health = mappedSources.length ? Math.round(mappedSources.reduce((total, source) => total + Number(source.progress || 0), 0) / mappedSources.length) : 0
      const usageSnapshot = usageResult.data || {}
      const entitlements = usageSnapshot.entitlements || {}
      const indexedTokens = Number(usageSnapshot.indexedTokens || 0)
      const indexedTokenLimit = Number(entitlements.indexed_tokens || 100000)
      if (!isCurrentRequest()) return
      activeProjectIdRef.current = active.id
      setState({
        planName: usageSnapshot.plan || 'Free',
        projects: projects.map((project) => ({ id: project.id, name: project.name, type: project.kind, description: project.description, updatedAt: project.updated_at, health: project.id === active.id ? health : 0, cover: 'atlas' })),
        activeProjectId: active.id,
        sources: mappedSources,
        entities: mappedEntities,
        episodes: mappedEvents,
        reviews: mappedReviews,
        messages: backendMessages.length ? backendMessages : [{ id: 'welcome-real', role: 'assistant', createdAt: 'Agora', content: mappedSources.length ? 'A memória deste projeto está pronta para consulta. O que você quer investigar?' : 'Conecte seu primeiro board para começar a construir a memória deste universo.', suggestions: mappedSources.length ? [] : ['Conectar meu Miro'] }],
        usage: {
          projects: { used: Number(usageSnapshot.projects ?? projects.length), limit: Number(entitlements.projects || 1) },
          memory: { used: Number((indexedTokens / 1000).toFixed(1)), limit: Number((indexedTokenLimit / 1000).toFixed(1)), unit: 'mil tokens' },
          analyses: { used: Number(usageSnapshot.visualAnalyses || 0), limit: Number(entitlements.visual_analyses_month || 300) },
        },
      })
      setConversationId(conversationResult.data?.id || null)
    } catch (error) {
      if (!isCurrentRequest()) return
      setWorkspaceError(error.message || 'Não foi possível carregar o workspace.')
      throw error
    } finally {
      if (isCurrentRequest()) setLoadedScope(requestedScope)
    }
  }, [isDemo, user])

  useEffect(() => {
    authScopeRef.current = authScope
    sessionEpoch.current += 1
    loadRequestId.current += 1
    clearInterval(syncTimer.current)
    remoteJobs.current.clear()
    setSyncJob(null)
    setChatting(false)
    setConversationId(null)
    setWorkspaceError('')
    if (authScope === 'demo') {
      setState(createDemoState())
      setLoadedScope('demo')
    } else {
      setState(createEmptyState())
      setLoadedScope(authScope === 'anonymous' ? 'anonymous' : null)
    }
  }, [authScope])

  useEffect(() => {
    activeProjectIdRef.current = state.activeProjectId
  }, [state.activeProjectId])

  useEffect(() => {
    if (isDemo && state.projects.some((project) => project.id === 'project-atlas')) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [isDemo, state])

  useEffect(() => {
    if (!supabase || !user || isDemo) return
    loadBackendState().catch((error) => notify(error.message || 'Não foi possível carregar o workspace.', 'error'))
  }, [isDemo, loadBackendState, notify, user])

  useEffect(() => () => clearInterval(syncTimer.current), [])

  const activeProject = state.projects.find((project) => project.id === state.activeProjectId) || state.projects[0]
  const workspaceLoading = Boolean(supabase && user && !isDemo && loadedScope !== authScope)

  const reloadWorkspace = useCallback(async () => {
    setLoadedScope(null)
    try {
      await loadBackendState(activeProjectIdRef.current)
    } catch (error) {
      notify(error.message || 'Não foi possível carregar o workspace.', 'error')
    }
  }, [loadBackendState, notify])

  const setActiveProject = useCallback(async (projectId) => {
    const project = state.projects.find((item) => item.id === projectId)
    if (!project) throw new Error('Este projeto não está disponível para a sua conta.')
    if (projectId === state.activeProjectId) return

    activeProjectIdRef.current = projectId
    sessionEpoch.current += 1
    const epoch = sessionEpoch.current
    clearInterval(syncTimer.current)
    remoteJobs.current.clear()
    setSyncJob(null)
    setChatting(false)
    setConversationId(null)
    setWorkspaceError('')

    if (isDemo) {
      setState((current) => ({ ...current, activeProjectId: projectId }))
      notify(`Projeto “${project.name}” selecionado.`)
      return
    }

    setLoadedScope(null)
    setState((current) => ({
      ...createEmptyState(),
      projects: current.projects,
      activeProjectId: projectId,
      usage: current.usage,
    }))
    try {
      await loadBackendState(projectId)
      if (epoch !== sessionEpoch.current) return
      if (activeProjectIdRef.current !== projectId) throw new Error('O projeto selecionado não está mais disponível.')
      notify(`Projeto “${project.name}” carregado.`)
    } catch (error) {
      if (epoch === sessionEpoch.current) notify(error.message || 'Não foi possível trocar de projeto.', 'error')
      throw error
    }
  }, [isDemo, loadBackendState, notify, state.activeProjectId, state.projects])

  const createProject = useCallback(async ({ name, kind = 'rpg', description = '' }) => {
    const projectName = String(name || '').trim()
    if (!projectName) throw new Error('Dê um nome ao novo universo.')

    if (isDemo) {
      const project = {
        id: `project-${crypto.randomUUID()}`,
        name: projectName,
        type: kind,
        description: String(description || '').trim(),
        updatedAt: new Date().toISOString(),
        health: 0,
        cover: 'atlas',
      }
      activeProjectIdRef.current = project.id
      setState((current) => ({
        ...createEmptyState(),
        projects: [...current.projects, project],
        activeProjectId: project.id,
        usage: {
          ...current.usage,
          projects: { ...current.usage.projects, used: current.projects.length + 1 },
        },
      }))
      notify(`Projeto “${project.name}” criado.`)
      return project
    }

    if (!supabase || !user) throw new Error('Sua sessão precisa ser renovada antes de criar um projeto.')
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id,role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin', 'editor'])
      .order('joined_at')
      .limit(1)
      .maybeSingle()
    if (membershipError) throw membershipError
    if (!membership) throw new Error('Você não tem permissão para criar projetos neste workspace.')

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        workspace_id: membership.workspace_id,
        name: projectName,
        kind,
        description: String(description || '').trim() || null,
        created_by: user.id,
      })
      .select('id,name,kind,description,updated_at')
      .single()
    if (projectError) throw projectError

    activeProjectIdRef.current = project.id
    await loadBackendState(project.id)
    notify(`Projeto “${project.name}” criado.`)
    return project
  }, [isDemo, loadBackendState, notify, user])

  const addManualSource = useCallback(async (sourceInput) => {
    if (!activeProject?.id) throw new Error('O projeto ainda não está disponível.')
    const projectId = activeProject.id
    const epoch = sessionEpoch.current

    if (isDemo) {
      const source = {
        id: `manual-${crypto.randomUUID()}`,
        provider: sourceInput.kind,
        name: sourceInput.title,
        kind: sourceInput.kind === 'upload' ? 'Arquivo enviado' : 'Texto colado',
        status: 'synced',
        itemCount: 1,
        imageCount: 0,
        documentCount: 1,
        lastSync: 'Agora',
        progress: 100,
        coverage: { percentage: 100, textItems: 1, failedChunks: 0 },
        sourceUrl: null,
        accent: sourceInput.kind === 'upload' ? '#8ad9d0' : '#d7b26d',
      }
      setState((current) => ({ ...current, sources: [...current.sources, source] }))
      notify(sourceInput.kind === 'upload' ? 'Arquivo adicionado à demonstração.' : 'Texto adicionado à demonstração.')
      return { source }
    }

    const result = await maestroApi.addManualSource(projectId, sourceInput)
    if (epoch !== sessionEpoch.current || activeProjectIdRef.current !== projectId) return result
    await loadBackendState(projectId)
    if (epoch !== sessionEpoch.current || activeProjectIdRef.current !== projectId) return result
    notify(sourceInput.kind === 'upload' ? 'Arquivo incorporado à memória.' : 'Texto incorporado à memória.')
    return result
  }, [activeProject, isDemo, loadBackendState, notify])

  const startDemoSync = useCallback((sourceId) => {
    clearInterval(syncTimer.current)
    const stages = ['Mapeando o board', 'Lendo textos e documentos', 'Analisando referências visuais', 'Relacionando entidades', 'Validando lacunas']
    setSyncJob({ sourceId, progress: 4, stage: stages[0], status: 'running', regions: 0 })
    setState((current) => ({
      ...current,
      sources: current.sources.map((source) => (source.id === sourceId ? { ...source, status: 'processing', progress: 4 } : source)),
    }))
    syncTimer.current = setInterval(() => {
      setSyncJob((current) => {
        if (!current || current.status !== 'running') return current
        const progress = Math.min(100, current.progress + Math.ceil(Math.random() * 9))
        const stageIndex = Math.min(stages.length - 1, Math.floor(progress / 21))
        const next = { ...current, progress, stage: stages[stageIndex], regions: Math.ceil(progress / 8) }
        setState((snapshot) => ({
          ...snapshot,
          sources: snapshot.sources.map((source) =>
            source.id === sourceId
              ? { ...source, status: progress === 100 ? 'synced' : 'processing', progress, lastSync: progress === 100 ? 'Agora' : source.lastSync }
              : source,
          ),
        }))
        if (progress === 100) {
          clearInterval(syncTimer.current)
          notify('Board compreendido. Novas relações aguardam sua revisão.')
          return { ...next, status: 'complete', stage: 'Análise concluída' }
        }
        return next
      })
    }, 550)
  }, [notify])

  const connectMiro = useCallback(
    async ({ name, boardUrl }) => {
      if (!isDemo) {
        if (!activeProject?.id) throw new Error('O projeto ainda não está pronto. Tente novamente em alguns instantes.')
        const result = await maestroApi.startMiroOAuth(activeProject.id)
        if (result?.authorizeUrl) window.location.assign(result.authorizeUrl)
        return
      }
      const sourceId = `source-${crypto.randomUUID()}`
      const source = {
        id: sourceId,
        provider: 'miro',
        name: name || 'Novo board do Miro',
        boardUrl,
        kind: 'Board conectado',
        status: 'queued',
        itemCount: 0,
        imageCount: 0,
        documentCount: 0,
        lastSync: 'Ainda não analisado',
        progress: 0,
        accent: '#ffd37a',
      }
      setState((current) => ({ ...current, sources: [...current.sources, source] }))
      notify('Board conectado. Iniciando a primeira leitura.')
      startDemoSync(sourceId)
    },
    [activeProject, isDemo, notify, startDemoSync],
  )

  const processRemoteJob = useCallback(async (jobId) => {
    if (remoteJobs.current.has(jobId)) return
    remoteJobs.current.add(jobId)
    const epoch = sessionEpoch.current
    let observedMaxProgress = 0
    try {
      let needsMore = true
      let lastResult = null
      for (let iteration = 0; iteration < 1000 && needsMore; iteration += 1) {
        if (epoch !== sessionEpoch.current) return
        lastResult = await maestroApi.processIngestion(jobId, unlockedKeysRef.current.text || undefined, unlockedKeysRef.current.vision || undefined)
        needsMore = Boolean(lastResult.needsMore)
        const failedChunks = Number(lastResult.coverage?.failedChunks || 0)
        const terminalStatus = lastResult.status || (failedChunks > 0 ? 'partial' : 'complete')
        const rateLimited = Boolean(lastResult.rateLimited)
        observedMaxProgress = Math.max(observedMaxProgress, Math.round(lastResult.progress || 0))
        setSyncJob({
          sourceId: null,
          progress: observedMaxProgress,
          stage: rateLimited ? (lastResult.message || 'Limite diário da IA atingido') : (lastResult.stage || 'Processando'),
          status: needsMore ? 'running' : rateLimited ? 'rate-limited' : terminalStatus === 'complete' ? 'complete' : terminalStatus === 'partial' ? 'attention' : 'error',
          message: rateLimited ? (lastResult.message || '') : null,
          regions: lastResult.regions || 0,
          coverage: lastResult.coverage || null,
        })
        if (rateLimited) break
        if (needsMore) await new Promise((resolve) => window.setTimeout(resolve, 350))
      }
      if (epoch !== sessionEpoch.current) return
      if (needsMore) {
        setSyncJob((current) => current ? { ...current, status: 'attention', stage: 'Leitura pausada com segurança' } : current)
        throw new Error('A leitura foi pausada após atingir o limite seguro desta sessão. Ela será retomada ao recarregar o projeto.')
      }
      await loadBackendState()
      if (lastResult?.rateLimited) {
        notify(lastResult.message || 'Limite diário gratuito da IA atingido. Retome mais tarde.', 'neutral')
      } else {
        const failedChunks = Number(lastResult?.coverage?.failedChunks || 0)
        const terminalStatus = lastResult?.status || (failedChunks > 0 ? 'partial' : 'complete')
        if (terminalStatus === 'partial') notify(`Leitura parcial: ${failedChunks || 'alguns'} lote${failedChunks === 1 ? '' : 's'} precisam ser processados novamente.`, 'neutral')
        else if (['failed', 'canceled'].includes(terminalStatus)) notify('A leitura não foi concluída. Você pode retomá-la pela fonte.', 'error')
        else notify('Leitura concluída. Consulte as revisões e as evidências encontradas.')
      }
    } catch (error) {
      if (epoch === sessionEpoch.current) {
        setSyncJob((current) => current ? { ...current, status: current.status === 'attention' ? 'attention' : 'error', stage: current.status === 'attention' ? current.stage : 'Leitura interrompida' } : current)
        notify(error.message || 'A leitura foi pausada e pode ser retomada.', 'error')
      }
    } finally {
      remoteJobs.current.delete(jobId)
    }
  }, [loadBackendState, notify])

  useEffect(() => {
    if (!supabase || isDemo || !activeProject?.id) return
    let cancelled = false
    supabase.from('ingestion_jobs').select('id').eq('project_id', activeProject.id).in('status', ['queued', 'inventory', 'processing']).order('created_at').then(({ data }) => {
      if (cancelled) return
      const ids = (data || []).map((job) => job.id)
      ;(async () => {
        for (const id of ids) {
          if (cancelled) return
          await processRemoteJob(id)
        }
      })()
    })
    return () => { cancelled = true }
  }, [activeProject?.id, isDemo, processRemoteJob])

  const syncSource = useCallback(
    async (sourceId) => {
      if (isDemo) {
        startDemoSync(sourceId)
        return
      }
      const source = state.sources.find((item) => item.id === sourceId)
      if (!activeProject?.id || !source) throw new Error('Fonte ou projeto indisponível para sincronização.')
      const result = await maestroApi.importMiroBoard(activeProject.id, source.remoteId, source.connectionId)
      if (result.job?.id) processRemoteJob(result.job.id)
      notify('Sincronização adicionada à fila.')
    },
    [activeProject, isDemo, notify, processRemoteJob, startDemoSync, state.sources],
  )

  const listMiroBoards = useCallback(async () => {
    if (isDemo) return { boards: [] }
    if (!activeProject?.id) throw new Error('O projeto ainda está sendo carregado.')
    return maestroApi.listMiroBoards(activeProject.id)
  }, [activeProject, isDemo])

  const importMiroBoards = useCallback(async (boards) => {
    if (isDemo) return
    if (!activeProject?.id) throw new Error('O projeto ainda está sendo carregado.')
    const jobIds = []
    for (const board of boards) {
      const result = await maestroApi.importMiroBoard(activeProject.id, board.id, board.connectionId)
      if (result.job?.id) jobIds.push(result.job.id)
    }
    notify(`${boards.length} board${boards.length === 1 ? '' : 's'} adicionado${boards.length === 1 ? '' : 's'}. A leitura acontece um board por vez.`)
    await loadBackendState()
    for (const jobId of jobIds) {
      await processRemoteJob(jobId)
    }
  }, [activeProject, isDemo, loadBackendState, notify, processRemoteJob])

  const unlinkSource = useCallback(async (sourceId) => {
    if (isDemo || !supabase || !sourceId) return
    const { error } = await supabase.from('project_sources').update({ sync_status: 'paused' }).eq('id', sourceId)
    if (error) throw error
    notify('Fonte desvinculada. O que já foi lido continua disponível; novas leituras só voltam se você restaurar o vínculo.')
    await loadBackendState()
  }, [isDemo, loadBackendState, notify])

  const resumeSource = useCallback(async (sourceId) => {
    if (isDemo || !supabase || !sourceId) return
    const { error } = await supabase.from('project_sources').update({ sync_status: 'ready' }).eq('id', sourceId)
    if (error) throw error
    notify('Vínculo restaurado. Use Sincronizar para trazer novidades.')
    await loadBackendState()
  }, [isDemo, loadBackendState, notify])

  const resolveReview = useCallback(
    async (reviewId, resolution, note = '') => {
      try {
        if (!isDemo && supabase) {
          const resolvedAt = new Date().toISOString()
          const { data: review, error } = await supabase.from('review_items').update({ status: resolution, resolution_note: note || null, resolved_by: user.id, resolved_at: resolvedAt }).eq('id', reviewId).select('workspace_id,project_id,claim_id,review_type,title').single()
          if (error) throw error
          if (review.claim_id) {
            const { error: claimError } = await supabase.from('claims').update({ editorial_state: resolution === 'approved' ? 'accepted' : 'rejected' }).eq('id', review.claim_id)
            if (claimError) throw claimError
          }
          if (resolution === 'approved' && note.trim()) {
            const { data: evidence, error: evidenceError } = await supabase.from('evidence').insert({ workspace_id: review.workspace_id, project_id: review.project_id, evidence_type: 'user_assertion', excerpt: note.trim(), locator: { reviewId, authorUserId: user.id } }).select('id').single()
            if (evidenceError) throw evidenceError
            const { error: chunkError } = await supabase.from('knowledge_chunks').insert({ workspace_id: review.workspace_id, project_id: review.project_id, evidence_id: evidence.id, chunk_type: 'user_context', content: note.trim(), token_count: Math.ceil(note.trim().length / 4), epistemic_classes: ['user_assertion'], metadata: { reviewId, title: review.title } })
            if (chunkError) throw chunkError
          }
        }
        setState((current) => ({
          ...current,
          reviews: current.reviews.map((review) => (review.id === reviewId ? { ...review, status: resolution, note } : review)),
        }))
        notify(resolution === 'approved' ? 'Interpretação incorporada ao projeto.' : 'Interpretação descartada.', resolution === 'approved' ? 'success' : 'neutral')
      } catch (error) {
        notify(error.message || 'Não foi possível registrar sua decisão.', 'error')
      }
    },
    [isDemo, notify, user],
  )

  const sendMessage = useCallback(
    async (text, options = {}) => {
      const projectId = activeProject?.id
      const epoch = sessionEpoch.current
      if (!projectId) throw new Error('O projeto ainda não está disponível para consulta.')
      const message = {
        id: crypto.randomUUID(),
        role: 'user',
        createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        content: text,
      }
      setState((current) => ({ ...current, messages: [...current.messages, message] }))
      setChatting(true)
      try {
        let response
        if (isDemo) {
          response = await new Promise((resolve) => setTimeout(() => resolve(answerDemoQuestion(text, options.mode)), 850))
        } else {
          const canonRules = await listCanonRules(projectId)
          response = await maestroApi.chat(projectId, options.conversationId ?? conversationId, text, options.mode || 'canon', canonRules, options.liveEvidence || [], unlockedKeysRef.current.text || undefined)
        }
        if (epoch !== sessionEpoch.current || activeProjectIdRef.current !== projectId) return
        if (response.conversationId) setConversationId(response.conversationId)
        const openConflicts = Array.isArray(response.conflicts) ? response.conflicts.filter((conflict) => conflict && (conflict.userStatement || conflict.explanation)) : []
        if (!isDemo && openConflicts.length) {
          for (const conflict of openConflicts) {
            await saveCanonConflict({ ...conflict, projectId, conversationId: response.conversationId || null })
          }
        }
        setState((current) => ({
          ...current,
          messages: [
            ...current.messages,
            {
              id: response.messageId || crypto.randomUUID(),
              role: 'assistant',
              createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              ...response,
              conflicts: openConflicts,
            },
          ],
        }))
      } catch (error) {
        if (epoch === sessionEpoch.current && activeProjectIdRef.current === projectId) notify(error.message || 'Não foi possível consultar o Maestro.', 'error')
      } finally {
        if (epoch === sessionEpoch.current && activeProjectIdRef.current === projectId) setChatting(false)
      }
    },
    [activeProject, conversationId, isDemo, notify],
  )

  const startNewConversation = useCallback(() => {
    setConversationId(null)
    setState((current) => ({
      ...current,
      messages: [{ id: `welcome-${crypto.randomUUID()}`, role: 'assistant', createdAt: 'Agora', content: 'Nova conversa iniciada. O que você quer descobrir sobre este universo?' }],
    }))
  }, [])

  const selectConversation = useCallback(async (id) => {
    if (!supabase || isDemo || !id) return
    const epoch = sessionEpoch.current
    const { data } = await supabase
      .from('messages')
      .select('id,role,content,created_at,model_run')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(60)
    if (epoch !== sessionEpoch.current) return
    setConversationId(id)
    const loaded = (data || []).map((entry) => ({
      id: entry.id,
      role: entry.role,
      createdAt: new Date(entry.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      content: entry.content,
      followUp: entry.model_run?.followUp || null,
      citations: [],
      presentation: entry.model_run?.presentation || null,
      conflicts: [],
    }))
    setState((current) => ({
      ...current,
      messages: loaded.length ? loaded : [{ id: `empty-${id}`, role: 'assistant', createdAt: '—', content: 'Esta conversa ainda não tem mensagens.' }],
    }))
  }, [isDemo])

  useEffect(() => {
    if (isDemo || !activeProject?.id || !user?.id) { setConversations([]); return }
    let cancelled = false
    supabase
      .from('conversations')
      .select('id,title,mode,created_at')
      .eq('project_id', activeProject.id)
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(25)
      .then(({ data }) => { if (!cancelled) setConversations(data || []) })
      .catch(() => { if (!cancelled) setConversations([]) })
    return () => { cancelled = true }
  }, [isDemo, activeProject?.id, user?.id, conversationId])

  const unlockVault = useCallback(async (passphrase) => {
    if (!passphrase) return { ok: false, error: 'Informe a passphrase.' }
    try {
      const text = vault.textBlob ? await decryptSecret(vault.textBlob, passphrase) : null
      const vision = vault.visionBlob ? await decryptSecret(vault.visionBlob, passphrase) : null
      unlockedKeysRef.current = { text, vision }
      sessionStorage.setItem('maestro-vault-pass', passphrase)
      setVault((current) => ({ ...current, unlocked: true }))
      return { ok: true }
    } catch {
      return { ok: false, error: 'Passphrase incorreta ou chave corrompida.' }
    }
  }, [vault.textBlob, vault.visionBlob])

  const lockVault = useCallback(() => {
    unlockedKeysRef.current = { text: null, vision: null }
    sessionStorage.removeItem('maestro-vault-pass')
    setVault((current) => ({ ...current, unlocked: false }))
  }, [])

  useEffect(() => {
    if (isDemo || !supabase || !activeProject?.id) { setVault({ unlocked: false, hasTextKey: false, hasVisionKey: false, textBlob: null, visionBlob: null }); return }
    let cancelled = false
    maestroApi.getProvider(activeProject.id).then(({ provider }) => {
      if (cancelled) return
      if (!provider) { setVault({ unlocked: false, hasTextKey: false, hasVisionKey: false, textBlob: null, visionBlob: null }); return }
      const textBlob = provider.apiKeyBlob || null
      const visionBlob = provider.visionApiKeyBlob || null
      setVault({ unlocked: false, hasTextKey: Boolean(textBlob), hasVisionKey: Boolean(visionBlob), textBlob, visionBlob })
      const storedPass = sessionStorage.getItem('maestro-vault-pass')
      if (storedPass && (textBlob || visionBlob)) {
        Promise.all([textBlob ? decryptSecret(textBlob, storedPass) : Promise.resolve(null), visionBlob ? decryptSecret(visionBlob, storedPass) : Promise.resolve(null)])
          .then(([text, vision]) => { if (cancelled) return; unlockedKeysRef.current = { text, vision }; setVault((current) => ({ ...current, unlocked: true })) })
          .catch(() => sessionStorage.removeItem('maestro-vault-pass'))
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [activeProject?.id, isDemo])

  const saveProvider = useCallback(
    async (provider) => {
      if (!isDemo) {
        if (!activeProject?.id) throw new Error('O projeto ainda não está disponível.')
        await maestroApi.saveProvider(activeProject.id, provider)
      }
      const notes = provider.clearCustomKey
        ? 'Chave pessoal removida. O Maestro volta a usar o pool padrão.'
        : isDemo
          ? 'Configuração validada no plano Free. Nenhuma chave foi armazenada.'
          : 'Provedor salvo com criptografia no servidor.'
      notify(notes)
    },
    [activeProject, isDemo, notify],
  )

  const resetDemo = useCallback(() => {
    const fresh = structuredClone(demoState)
    setState(fresh)
    setConversationId(null)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
    notify('Demonstração restaurada.')
  }, [notify])

  const value = useMemo(
    () => ({
      ...state,
      activeProject,
      syncJob,
      toast,
      chatting,
      conversationId,
      conversations,
      vault,
      unlockVault,
      lockVault,
      workspaceLoading,
      workspaceError,
      setActiveProject,
      createProject,
      connectMiro,
      addManualSource,
      syncSource,
      listMiroBoards,
      importMiroBoards,
      unlinkSource,
      resumeSource,
      resolveReview,
      sendMessage,
      startNewConversation,
      selectConversation,
      saveProvider,
      resetDemo,
      reloadWorkspace,
      clearToast: () => setToast(null),
      notify,
    }),
    [activeProject, addManualSource, chatting, connectMiro, conversationId, conversations, createProject, importMiroBoards, listMiroBoards, lockVault, notify, reloadWorkspace, resetDemo, resolveReview, resumeSource, saveProvider, selectConversation, sendMessage, setActiveProject, startNewConversation, state, syncJob, syncSource, toast, unlinkSource, unlockVault, vault, workspaceError, workspaceLoading],
  )

  return <MaestroContext.Provider value={value}>{children}</MaestroContext.Provider>
}

export function useMaestro() {
  const context = useContext(MaestroContext)
  if (!context) throw new Error('useMaestro precisa estar dentro de MaestroProvider')
  return context
}
