import { BOX_TYPES, BOX_STAGES, emptyBoxState, newBoxItem } from './boxesPipeline'

const FREE_MODEL_DELAY = 1100
const MAX_PARALLEL = 1

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }

async function pool(items, worker, concurrency = MAX_PARALLEL) {
  const queue = [...items]
  const runners = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const item = queue.shift()
      if (item !== undefined) await worker(item)
    }
  })
  await Promise.all(runners)
}

function buildBoxPrompts(box, rawChunks) {
  const hints = box.detectionHints?.join(', ') || 'nomes próprios, eventos, termos característicos'
  return {
    collect: {
      role: 'Você é um arquivista cirúrgico. Leia o material bruto e extraia somente trechos relacionados a: ' + box.description + ' Palavras de detecção comuns: ' + hints + '. Devolva um JSON com array de {title, excerpt, source}.',
      payload: rawChunks,
    },
    review_classify: {
      role: 'Você é um auditor de cânone. Para cada item, decida se ele realmente pertence à caixa ' + box.name + '. Itens fora de escopo devem ser marcados isOutlier=true com uma justificativa curta.',
      payload: null,
    },
    rewrite: {
      role: 'Você é um redator literário. Resuma cada item em 3 bullet points concisos e reescreva o texto com prosa bélica e intuitiva, sem inventar fatos.',
      payload: null,
    },
    review_canon: {
      role: 'Você é o guardião do cânone. Verifique se o resumo perdeu, alterou ou inventou informação. Marque drift=true se encontrar problema.',
      payload: null,
    },
  }
}

function simulateItemsForBox(box, sources) {
  const baseCount = box.isEntityBox ? Math.min(6, Math.max(2, Math.ceil((sources?.length || 1) * 1.6))) : Math.min(5, Math.max(2, sources?.length || 1))
  const items = []
  const samplesByCategory = {
    universe_rules: ['Sistema mágico baseado em contratos', 'Ton do universo: sombrio e melancólico'],
    world_history: ['A Queda do Reino de Aur', 'Guerra do Véu de 1213'],
    main_characters: ['Silas Vane', 'Maëlle Lavoir'],
    secondary_characters: ['Jonas Rook', 'Capitã Eliza Munn'],
    races_species: ['Povo do Véu', 'Corrompidos'],
    factions_groups: ['Ordem do Sal', 'Audiência Oculta'],
    places_geography: ['Nova Orleans', 'Cemitério Lafayette'],
    artifacts_items: ['O Candeeiro de Aur', 'Punhal do Véu'],
    campaigns_episodes: ['Crônicas do Véu · Episódio 18', 'O Pacto no Cemitério'],
  }
  const poolSamples = samplesByCategory[box.id] || ['Item desconhecido']
  for (let i = 0; i < baseCount; i += 1) {
    const title = poolSamples[i % poolSamples.length]
    items.push(newBoxItem({
      title,
      excerpt: `Trecho extraído das fontes conectadas. Contém referências a ${box.detectionHints?.[0] || 'elementos do universo'}.`,
      polished: `${title}: linha narrativa que se conecta a outros elementos da árvore.`,
      bulletPoints: [
        'Ponto central definido nas fontes.',
        'Conexão com outro elemento do universo.',
        'Lacuna identificada para revisão futura.',
      ],
      sources: sources.slice(0, 1).map((s) => s?.name).filter(Boolean),
      confidence: 0.6 + Math.random() * 0.35,
      status: 'pending',
    }))
  }
  return items
}

export async function runPipeline({ sources, onProgress, signal, mode = 'demo' }) {
  const state = emptyBoxState()
  state.stage = 'running'
  state.lastUpdate = Date.now()
  const stages = BOX_STAGES
  const totalSteps = BOX_TYPES.length * stages.length
  let completedSteps = 0

  for (const box of BOX_TYPES) {
    if (signal?.aborted) break
    state.currentBoxId = box.id
    for (const stage of stages) {
      if (signal?.aborted) break
      state.currentStageId = stage.id
      state.boxes[box.id].stage = stage.id

      if (stage.id === 'collect') {
        if (mode === 'demo') {
          await sleep(FREE_MODEL_DELAY * 0.6)
          state.boxes[box.id].items = simulateItemsForBox(box, sources || [])
        } else {
          await sleep(FREE_MODEL_DELAY)
          state.boxes[box.id].items = simulateItemsForBox(box, sources || [])
        }
      } else if (stage.id === 'review_classify') {
        await sleep(FREE_MODEL_DELAY * 0.7)
        const outOfScope = state.boxes[box.id].items.filter((item) => item.confidence < 0.55)
        for (const item of outOfScope) {
          state.discards.push({
            id: crypto.randomUUID(),
            originalBoxId: box.id,
            title: item.title,
            excerpt: item.excerpt,
            reason: 'misclassified',
            note: 'Baixa confiança na classificação inicial.',
            createdAt: Date.now(),
          })
        }
        state.boxes[box.id].items = state.boxes[box.id].items.filter((item) => item.confidence >= 0.55)
      } else if (stage.id === 'rewrite') {
        await sleep(FREE_MODEL_DELAY * 0.8)
        state.boxes[box.id].items = state.boxes[box.id].items.map((item) => ({
          ...item,
          status: 'rewritten',
          polished: item.polished || item.title,
        }))
      } else if (stage.id === 'review_canon') {
        await sleep(FREE_MODEL_DELAY * 0.5)
        state.boxes[box.id].items = state.boxes[box.id].items.map((item) => ({
          ...item,
          status: 'ready',
          reviewNote: 'Cânone preservado. Pronto para Yggdrasil.',
        }))
        state.boxes[box.id].reviewed = true
      }

      completedSteps += 1
      state.progress = Math.round((completedSteps / totalSteps) * 100)
      state.lastUpdate = Date.now()
      onProgress?.({ ...state })
    }
  }

  state.stage = 'complete'
  state.progress = 100
  state.currentBoxId = null
  state.currentStageId = null
  state.lastUpdate = Date.now()
  onProgress?.({ ...state })
  return state
}

export async function restoreDiscardedItem(state, discardId, targetBoxId) {
  const discard = state.discards.find((item) => item.id === discardId)
  if (!discard) return state
  const restored = newBoxItem({
    title: discard.title,
    excerpt: discard.excerpt,
    polished: discard.excerpt,
    sources: [],
    confidence: 0.7,
    status: 'ready',
  })
  return {
    ...state,
    discards: state.discards.filter((item) => item.id !== discardId),
    boxes: {
      ...state.boxes,
      [targetBoxId || discard.originalBoxId]: {
        ...state.boxes[targetBoxId || discard.originalBoxId],
        items: [...state.boxes[targetBoxId || discard.originalBoxId].items, restored],
      },
    },
  }
}

export { buildBoxPrompts, pool }
