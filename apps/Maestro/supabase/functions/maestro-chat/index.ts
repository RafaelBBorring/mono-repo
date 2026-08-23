import { errorResponse, handleOptions, jsonResponse } from '../_shared/cors.ts'
import { callModel, parseModelJson, powerProfiles, resolveTextModel } from '../_shared/openrouter.ts'
import { createServiceClient, requireProjectAccess, requireUser, requireWorkspaceRole } from '../_shared/supabase.ts'
import { requireMonthlyQuota } from '../_shared/quota.ts'

const modeRules = {
  canon: 'Responda somente com fatos aceitos e evidências explícitas. Inferências podem ser mencionadas apenas como hipótese rotulada.',
  investigate: 'Você pode comparar hipóteses, mas deve nomear a classe de cada evidência e jamais promovê-la a fato.',
  create: 'Você pode propor ideias novas. Marque tudo que for criação como não canônico e não o misture ao material existente.',
}

type EvidencePacket = {
  id: string
  evidenceId: string
  epistemicClasses: string[]
  content: string
  evidenceType: unknown
  excerpt: unknown
  source: unknown
  locator: unknown
}

function cleanText(value: unknown, max = 30_000) {
  return String(value || '').replace(/\u0000/g, '').trim().slice(0, max)
}

function cleanHistoricalText(value: unknown, max: number) {
  return cleanText(value, max).replace(/\[E\d+\]/gi, '').replace(/ {2,}/g, ' ').trim()
}

function normalizeCreativePresentation(value: unknown, validEvidenceIds: Set<string>) {
  if (!value || typeof value !== 'object') return null
  const plan = value as Record<string, unknown>
  const rawEpisodes = Array.isArray(plan.episodes) ? plan.episodes : []
  const episodes = rawEpisodes
    .slice(0, 6)
    .map((entry, index) => {
      const episode = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
      const evidenceIds = Array.isArray(episode.canonEvidenceIds)
        ? [...new Set(episode.canonEvidenceIds.map(String).filter((id) => validEvidenceIds.has(id)))].slice(0, 8)
        : []
      return {
        number: cleanText(episode.number || String(index + 1).padStart(2, '0'), 8),
        title: cleanText(episode.title, 120),
        hook: cleanText(episode.hook, 240),
        canon: evidenceIds.length ? cleanText(episode.canon, 500) : '',
        gap: cleanText(episode.gap, 500),
        idea: cleanText(episode.idea, 500),
        evidenceIds,
      }
    })
    .filter((episode) => episode.title && episode.hook)
  if (!episodes.length) return null
  return {
    type: 'story-plan',
    title: cleanText(plan.title, 120) || 'Rascunho de arco',
    subtitle: cleanText(plan.subtitle, 160) || `Rascunho criativo · ${episodes.length} episódios`,
    episodes,
  }
}

Deno.serve(async (request) => {
  const options = handleOptions(request)
  if (options) return options
  try {
    if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405)
    const { projectId, conversationId, message, mode = 'canon', canon, liveEvidence, textKey } = await request.json()
    const userMessage = cleanText(message)
    if (!projectId || !userMessage) throw new Error('Projeto e mensagem são obrigatórios.')
    if (!Object.hasOwn(modeRules, mode)) throw new Error('Modo de conversa inválido.')
    const { client, user } = await requireUser(request)
    const project = await requireProjectAccess(client, user, projectId)
    await requireWorkspaceRole(client, user, project.workspace_id, ['owner', 'admin', 'editor'])
    const service = createServiceClient()
    const profile = await resolveTextModel(service, project.workspace_id, project.id, textKey)
    const limits = powerProfiles[profile.power]

    const canonRules = Array.isArray(canon) ? canon
      .filter((rule: Record<string, unknown>) => rule && (rule.rule || rule.text))
      .slice(0, 40)
      .map((rule: Record<string, unknown>) => ({ title: cleanText(rule.title || rule.category || 'Regra', 120), rule: cleanText(rule.rule || rule.text, 800) }))
      : []

    const liveMatches = Array.isArray(liveEvidence) ? liveEvidence
      .filter((entry: Record<string, unknown>) => entry && entry.text)
      .slice(0, 6)
      .map((entry: Record<string, unknown>) => ({ text: cleanText(entry.text, 600), url: cleanText(entry.url, 300) }))
      : []

    let activeConversationId = conversationId
    if (activeConversationId) {
      const { data: existing } = await client.from('conversations').select('id').eq('id', activeConversationId).eq('project_id', project.id).eq('created_by', user.id).maybeSingle()
      if (!existing) activeConversationId = null
    }
    if (!activeConversationId) {
      const { data: conversation, error } = await service.from('conversations').insert({
        workspace_id: project.workspace_id,
        project_id: project.id,
        created_by: user.id,
        title: userMessage.slice(0, 80),
        mode,
      }).select('id').single()
      if (error) throw error
      activeConversationId = conversation.id
    }
    const { data: storedUserMessage, error: userMessageError } = await service.from('messages').insert({
      workspace_id: project.workspace_id,
      project_id: project.id,
      conversation_id: activeConversationId,
      role: 'user',
      content: userMessage,
    }).select('id').single()
    if (userMessageError) throw userMessageError
    await requireMonthlyQuota(service, project.workspace_id, 'chat_messages', 'messages_month', 1, { projectId: project.id, userId: user.id, idempotencyKey: storedUserMessage.id })

    const recent = await service.from('messages').select('role,content').eq('conversation_id', activeConversationId).order('created_at', { ascending: false }).limit(8)
    if (recent.error) throw recent.error
    const chronological = (recent.data || []).reverse()
    const history = chronological.slice(0, -1).map((entry: Record<string, unknown>) => ({ role: entry.role, content: cleanHistoricalText(entry.content, 2500) }))
    const retrievalContext = chronological.slice(-3, -1).map((entry: Record<string, unknown>) => cleanHistoricalText(entry.content, 700)).join(' ')

    const { data: directChunks, error: searchError } = await client.rpc('search_project_knowledge', {
      query_project_id: project.id,
      query_text: userMessage,
      result_limit: limits.evidenceLimit,
    })
    if (searchError) throw searchError
    let chunks = directChunks || []
    if (!chunks.length && retrievalContext) {
      const { data: contextualChunks, error: contextualError } = await client.rpc('search_project_knowledge', {
        query_project_id: project.id,
        query_text: retrievalContext,
        result_limit: limits.evidenceLimit,
      })
      if (contextualError) throw contextualError
      chunks = contextualChunks || []
    }
    const normalizedQuestion = userMessage.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
    const asksForTimeline = /(episod|sessao|campanha|evento|cronolog|linha do tempo|ultim|recent|acontec)/.test(normalizedQuestion)
    if (asksForTimeline) {
      const { data: timelineEvents, error: timelineError } = await client
        .from('narrative_events')
        .select('id,event_type,campaign,label,sequence_number,title,event_date,summary,status,epistemic_class,metadata,narrative_event_evidence(evidence_id,evidence(active))')
        .eq('project_id', project.id)
        .eq('active', true)
        .order('event_date', { ascending: false, nullsFirst: false })
        .order('sequence_number', { ascending: false, nullsFirst: false })
        .limit(Math.max(8, limits.evidenceLimit))
      if (timelineError) throw timelineError
      const eventChunks: Record<string, unknown>[] = []
      for (const event of timelineEvents || []) {
        const links = Array.isArray(event.narrative_event_evidence) ? event.narrative_event_evidence as Record<string, unknown>[] : []
        const activeEvidenceIds = links
          .filter((link) => (link.evidence as Record<string, unknown> | null)?.active)
          .map((link) => String(link.evidence_id))
          .slice(0, 3)
        for (const evidenceId of activeEvidenceIds) {
          eventChunks.push({
            chunk_id: `event-${event.id}-${evidenceId}`,
            evidence_id: evidenceId,
            epistemic_classes: [event.epistemic_class],
            content: `Evento estruturado. Tipo: ${event.event_type}. Campanha: ${event.campaign || 'não identificada'}. Marcador: ${event.label || event.sequence_number || 'não registrado'}. Título: ${event.title}. Data: ${event.event_date || 'não registrada'}. Estado: ${event.status}. Resumo: ${event.summary || 'não documentado'}. Lacuna: ${(event.metadata as Record<string, unknown> | null)?.missingInformation || 'nenhuma registrada'}.`,
            metadata: { narrativeEventId: event.id },
          })
        }
      }
      const seenEvidence = new Set<string>()
      chunks = [...eventChunks, ...chunks].filter((chunk: Record<string, unknown>) => {
        const evidenceId = String(chunk.evidence_id || '')
        if (!evidenceId || seenEvidence.has(evidenceId)) return false
        seenEvidence.add(evidenceId)
        return true
      }).slice(0, limits.evidenceLimit)
    }
    const memoryKeywords = userMessage.split(/\s+/).map((word) => word.replace(/[^\p{L}\p{N}]/gu, '')).filter((word) => word.length > 4).slice(0, 3)
    let memorySnippets: string[] = []
    if (activeConversationId && memoryKeywords.length) {
      const orFilter = memoryKeywords.map((word) => `content.ilike.%${word.replace(/[%_\\]/g, '')}%`).join(',')
      const { data: memoryRows } = await client.from('messages')
        .select('role,content')
        .eq('project_id', project.id)
        .neq('conversation_id', activeConversationId)
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(4)
      memorySnippets = (memoryRows || []).map((row) => cleanText(row.content, 300)).filter(Boolean)
    }
    const evidenceIds = [...new Set((chunks || []).map((chunk: Record<string, unknown>) => chunk.evidence_id).filter(Boolean))]
    let evidences: Record<string, unknown>[] = []
    if (evidenceIds.length) {
      const { data, error: evidenceError } = await client.from('evidence').select('id,evidence_type,excerpt,source_url,locator,project_sources(name,provider,source_url)').in('id', evidenceIds).eq('active', true)
      if (evidenceError) throw evidenceError
      evidences = data || []
    }
    const evidenceMap = new Map((evidences || []).map((evidence: Record<string, unknown>) => [evidence.id, evidence]))
    const groundedChunks = (chunks || []).filter((chunk: Record<string, unknown>) => evidenceMap.has(chunk.evidence_id))
    const packets: EvidencePacket[] = groundedChunks.map((chunk: Record<string, unknown>, index: number) => {
      const evidence = evidenceMap.get(chunk.evidence_id) as Record<string, unknown> | undefined
      return {
        id: `E${index + 1}`,
        evidenceId: String(chunk.evidence_id),
        epistemicClasses: Array.isArray(chunk.epistemic_classes) ? chunk.epistemic_classes.map(String) : [],
        content: cleanText(chunk.content, 4500),
        evidenceType: evidence?.evidence_type,
        excerpt: evidence?.excerpt,
        source: evidence?.project_sources,
        locator: evidence?.locator,
      }
    })

    if (!packets.length && !canonRules.length && mode !== 'create') {
      const content = 'Não encontrei informação suficiente nas fontes deste projeto para responder isso como fato do seu universo. Posso procurar por termos relacionados ou você pode me contar o contexto ausente; antes de salvá-lo no cânone, mostrarei o que será incorporado.'
      const followUp = 'Qual parte dessa informação já foi definida por você?'
      const { data: assistantMessage, error } = await service.from('messages').insert({
        workspace_id: project.workspace_id,
        project_id: project.id,
        conversation_id: activeConversationId,
        role: 'assistant',
        content,
        answer_state: 'unknown',
        model_run: { mode, evidenceCount: 0, followUp },
      }).select('id').single()
      if (error) throw error
      return jsonResponse({ content, citations: [], followUp, conversationId: activeConversationId, messageId: assistantMessage.id, answerState: 'unknown', conflicts: [] })
    }

    const system = `Você é o Maestro, memória confiável de um universo criativo. ${modeRules[mode as keyof typeof modeRules]}
Regras inegociáveis:
- Nunca use folclore, fantasia genérica ou conhecimento externo para preencher o universo.
- explicit_text, explicit_metadata e user_assertion aceitos podem sustentar fatos.
- visual_observation descreve aparência, nunca identidade, gênero, raça canônica, intenção ou evento.
- spatial_inference e model_inference são hipóteses mesmo com confiança alta.
- Se motivo, ação, desfecho ou identidade não estiverem presentes, diga que não foram documentados e faça uma pergunta útil.
- Use somente IDs de evidência recebidos. Não invente citações.
- No modo criar, separe claramente material canônico de sugestões.
- O bloco CÂNONE (quando presente) é verdade primária declarada pelo autor e tem precedência sobre qualquer evidência inferida. Use-o para fundamentar respostas e cite como [C1], [C2] quando útil.
- Se a mensagem do usuário afirmar, sugerir ou implicar algo que contradiga uma regra do CÂNONE, registre em conflicts. Nunca altere o cânone sozinho: sinalize e proponha uma resolução.
Responda JSON válido: {content,citationIds[],followUp,answerState,creativePlan?,conflicts?}. answerState deve ser grounded, mixed, unknown ou creative.
- conflicts (somente quando houver contradição real com uma regra do CÂNONE): array de {ruleTitle, ruleText, userStatement, explanation, suggestedResolution, severity}. userStatement = o que o usuário disse/implicou; explanation = por que entra em choque com a regra; suggestedResolution = correção do usuário, ajuste da regra ou exceção narrativa proposta; severity = low|medium|high.
${mode === 'create' ? `Quando o pedido envolver campanha, roteiro, arco ou episódios, inclua creativePlan: {title,subtitle,episodes:[{number,title,hook,canon,canonEvidenceIds[],gap,idea}]}. Em cada episódio, canon contém somente fatos sustentados pelos IDs listados em canonEvidenceIds; use apenas IDs E1, E2 etc. realmente recebidos. Se não houver evidência, deixe canon vazio e registre a ausência em gap. idea contém apenas a proposta não canônica. Respeite a quantidade pedida pelo usuário.` : 'Não inclua creativePlan fora do modo criar.'}`
    const canonBlock = canonRules.length
      ? `CÂNONE DO UNIVERSO (verdade primária do autor):\n${canonRules.map((rule, index) => `C${index + 1}. ${rule.title}: ${rule.rule}`).join('\n')}\n`
      : ''
    const memoryBlock = memorySnippets.length
      ? `MEMÓRIA DE CONVERSAS ANTERIORES (trechos de outras conversas deste projeto — use somente se for realmente relevante, e não os trate como fato sem evidência):\n${memorySnippets.map((snippet, index) => `M${index + 1}. ${snippet}`).join('\n')}\n`
      : ''
    const liveBlock = liveMatches.length
      ? `CONSULTA AO VIVO NO MIRO (resultado fresco da fonte conectada, ainda NÃO importado — trate como material bruto e nunca como fato canônico sem confirmação do autor):\n${liveMatches.map((entry, index) => `L${index + 1}. ${entry.text}${entry.url ? ` (fonte: ${entry.url})` : ''}`).join('\n')}\n`
      : ''
    const prompt = `PROJETO: ${project.name}
MODO: ${mode}
${canonBlock}${memoryBlock}${liveBlock}PERGUNTA: ${userMessage}
EVIDÊNCIAS DISPONÍVEIS:
${JSON.stringify(packets)}

Produza uma resposta clara em português brasileiro. Cite evidências no texto quando útil usando [E1], [E2].`
    const completion = await callModel(profile, [{ role: 'system', content: system }, ...history, { role: 'user', content: prompt }], { json: true })
    let answer
    try {
      answer = parseModelJson(completion.content)
    } catch {
      answer = { content: completion.content, citationIds: [], answerState: mode === 'create' ? 'creative' : 'mixed' }
    }
    const validPacketIds = new Set(packets.map((packet) => packet.id))
    const presentation = mode === 'create' ? normalizeCreativePresentation(answer.creativePlan, validPacketIds) : null
    const presentationEvidenceIds = presentation?.episodes.flatMap((episode) => episode.evidenceIds) || []
    const rawContent = cleanText(answer.content, 20_000) || 'Não consegui formular uma resposta segura com as evidências atuais.'
    const markers = [...rawContent.matchAll(/\[E\d+\]/g)].map((match) => match[0].slice(1, -1))
    const requestedCitations = [...(Array.isArray(answer.citationIds) ? answer.citationIds : []), ...markers, ...presentationEvidenceIds].filter((id: string) => validPacketIds.has(id))
    const seenEvidenceIds = new Set<string>()
    const citedPackets = [...new Set(requestedCitations)].map((id: string) => packets.find((packet) => packet.id === id)).filter((packet) => {
      if (!packet || !packet.evidenceId || seenEvidenceIds.has(String(packet.evidenceId))) return false
      seenEvidenceIds.add(String(packet.evidenceId))
      return true
    })
    const content = rawContent.replace(/\[(E\d+)\]/g, (marker, id) => validPacketIds.has(id) ? marker : '')
    const canonicalClasses = new Set(['explicit_text', 'explicit_metadata', 'user_assertion'])
    const isCanonicalPacket = (packet: EvidencePacket) => {
      const classes = packet.epistemicClasses || []
      if (classes.length) return classes.every((value: string) => canonicalClasses.has(value))
      return ['text', 'metadata', 'user_assertion'].includes(String(packet.evidenceType || ''))
    }
    const hasInferentialEvidence = citedPackets.some((packet) => !isCanonicalPacket(packet!))
    const answerState = mode === 'create' ? 'creative' : !citedPackets.length ? 'unknown' : hasInferentialEvidence ? 'mixed' : 'grounded'
    const followUp = cleanText(answer.followUp, 500) || null
    const conflicts = Array.isArray(answer.conflicts) ? answer.conflicts.slice(0, 5).map((conflict: Record<string, unknown>) => ({
      ruleTitle: cleanText(conflict.ruleTitle, 120) || 'Regra do cânone',
      ruleText: cleanText(conflict.ruleText, 800),
      userStatement: cleanText(conflict.userStatement, 400),
      explanation: cleanText(conflict.explanation, 600),
      suggestedResolution: cleanText(conflict.suggestedResolution, 600),
      severity: ['low', 'medium', 'high'].includes(String(conflict.severity)) ? String(conflict.severity) : 'medium',
    })).filter((conflict) => conflict.userStatement || conflict.explanation) : []
    const { data: assistantMessage, error: messageError } = await service.from('messages').insert({
      workspace_id: project.workspace_id,
      project_id: project.id,
      conversation_id: activeConversationId,
      role: 'assistant',
      content,
      answer_state: answerState,
      model_run: { model: completion.model, usage: completion.usage, mode, evidenceCount: packets.length, presentation, followUp },
    }).select('id').single()
    if (messageError) throw messageError
    if (citedPackets.length) {
      const { error: citationError } = await service.from('message_citations').insert(citedPackets.map((packet, index) => {
        const evidence = evidenceMap.get(packet!.evidenceId) as Record<string, unknown> | undefined
        return { message_id: assistantMessage.id, evidence_id: packet!.evidenceId, citation_order: index, evidence_snapshot: { excerpt: evidence?.excerpt || packet!.content, source: evidence?.project_sources, sourceUrl: evidence?.source_url, locator: evidence?.locator, epistemicClasses: packet!.epistemicClasses } }
      }))
      if (citationError) throw citationError
    }
    const citations = citedPackets.map((packet) => {
      const evidence = evidenceMap.get(packet!.evidenceId) as Record<string, unknown> | undefined
      const source = evidence?.project_sources as Record<string, unknown> | undefined
      return {
        id: packet!.evidenceId,
        label: cleanText(evidence?.excerpt || packet!.content, 90),
        source: source?.name || 'Fonte conectada',
        confidence: isCanonicalPacket(packet!) ? 'confirmado' : 'inferência rotulada',
        sourceUrl: evidence?.source_url || source?.source_url || null,
        locator: evidence?.locator,
      }
    })
    return jsonResponse({ content, citations, followUp, presentation, conversationId: activeConversationId, messageId: assistantMessage.id, answerState, conflicts })
  } catch (error) {
    return errorResponse(error, 400)
  }
})
