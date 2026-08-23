import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Filter, RotateCcw, Search, Sparkles, Trash2, X } from 'lucide-react'
import { useMaestro } from '../contexts/MaestroContext'
import { useAuth } from '../contexts/AuthContext'
import { BOX_TYPES, BOX_STAGES, DISCARD_REASONS } from '../services/boxesPipeline'
import '../styles/pipeline-redesign.css'

function usePipelineState() {
  const { sources, syncJob, activeProject } = useMaestro()
  const { isDemo } = useAuth()
  const storageKey = `${STORAGE_KEY}:${activeProject?.id || 'unscoped'}`
  const [state, setState] = useState(() => loadFromStorage(storageKey) || buildSkeleton())
  const storageKeyRef = useRef(storageKey)
  const [query, setQuery] = useState('')
  const [reasonFilter, setReasonFilter] = useState('all')

  useEffect(() => {
    if (storageKeyRef.current !== storageKey) {
      storageKeyRef.current = storageKey
      setState(loadFromStorage(storageKey) || buildSkeleton())
      return
    }
    persist(storageKey, state)
  }, [state, storageKey])

  useEffect(() => {
    if (!isDemo || !syncJob || syncJob.status !== 'complete') return
    setState((current) => progressWithSync(current, syncJob))
  }, [isDemo, syncJob])

  const filteredDiscards = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.discards.filter((item) => {
      if (reasonFilter !== 'all' && item.reason !== reasonFilter) return false
      if (!q) return true
      return `${item.title} ${item.excerpt}`.toLowerCase().includes(q)
    })
  }, [state.discards, query, reasonFilter])

  const restore = (discardId, targetBoxId) => {
    setState((current) => {
      const discard = current.discards.find((d) => d.id === discardId)
      if (!discard) return current
      const box = current.boxes[targetBoxId] ? targetBoxId : discard.originalBoxId
      return {
        ...current,
        discards: current.discards.filter((d) => d.id !== discardId),
        boxes: {
          ...current.boxes,
          [box]: {
            ...current.boxes[box],
            items: [
              ...current.boxes[box].items,
              {
                id: crypto.randomUUID(),
                title: discard.title,
                excerpt: discard.excerpt,
                polished: discard.excerpt,
                status: 'ready',
                confidence: 0.7,
                sources: [],
                bulletPoints: [],
                reviewNote: 'Restaurado da caixa de descartes.',
                createdAt: Date.now(),
              },
            ],
          },
        },
      }
    })
  }

  return { state, sources, filteredDiscards, query, setQuery, reasonFilter, setReasonFilter, restore }
}

const STORAGE_KEY = 'maestro-pipeline-state-v1'

function loadFromStorage(storageKey) {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return null
    return JSON.parse(stored)
  } catch { return null }
}
function persist(storageKey, state) {
  try { localStorage.setItem(storageKey, JSON.stringify(state)) } catch { /* noop */ }
}
function buildSkeleton() {
  const boxes = {}
  for (const type of BOX_TYPES) boxes[type.id] = { items: [], stage: 'pending', reviewed: false }
  return { boxes, discards: [], stage: 'idle', progress: 0, currentBoxId: null, currentStageId: null, lastUpdate: null }
}
function progressWithSync(current, syncJob) {
  if (current.stage === 'complete') return current
  const boxes = { ...current.boxes }
  let completed = Math.round((syncJob.progress || 0) * BOX_TYPES.length / 100)
  for (let i = 0; i < completed && i < BOX_TYPES.length; i += 1) {
    const id = BOX_TYPES[i].id
    if (!boxes[id].items.length) {
      boxes[id] = {
        items: simulateFewItems(BOX_TYPES[i]),
        stage: 'review_canon',
        reviewed: true,
      }
    }
  }
  return {
    ...current,
    boxes,
    progress: syncJob.progress || current.progress,
    stage: syncJob.progress === 100 ? 'complete' : 'running',
    lastUpdate: Date.now(),
  }
}
function simulateFewItems(box) {
  return Array.from({ length: 3 }).map(() => ({
    id: crypto.randomUUID(),
    title: `${box.name} · item`,
    excerpt: 'Conteúdo extraído das fontes e revisado.',
    polished: 'Versão polida pelo agente de redação.',
    status: 'ready',
    confidence: 0.78,
    sources: [],
    bulletPoints: [],
    reviewNote: 'OK',
    createdAt: Date.now(),
  }))
}

const EMPTY_BOX = { items: [], stage: 'pending', reviewed: false }

const BOX_FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'ready', label: 'Revisadas' },
  { id: 'running', label: 'Processando' },
  { id: 'waiting', label: 'Aguardando' },
]

function getBoxStatus(data) {
  if (data.reviewed) return { id: 'ready', label: 'Revisada' }
  if (data.stage && data.stage !== 'pending') return { id: 'running', label: 'Em processamento' }
  return { id: 'waiting', label: 'Aguardando' }
}

function getItemStatus(status) {
  if (status === 'ready') return 'Pronto'
  if (status === 'pending') return 'Pendente'
  if (status === 'review') return 'Em revisão'
  return status || 'Sem status'
}

export function PipelinePage() {
  const { state } = usePipelineState()
  const [boxQuery, setBoxQuery] = useState('')
  const [boxFilter, setBoxFilter] = useState('all')
  const [selectedBoxId, setSelectedBoxId] = useState(null)
  const [itemsExpanded, setItemsExpanded] = useState(false)
  const drawerRef = useRef(null)
  const drawerCloseRef = useRef(null)
  const drawerTriggerRef = useRef(null)

  const totalItems = Object.values(state.boxes).reduce((acc, box) => acc + (box.items?.length || 0), 0)
  const reviewedBoxes = Object.values(state.boxes).filter((box) => box.reviewed).length
  const overallProgress = Math.min(100, Math.max(0, state.progress || Math.round((reviewedBoxes / BOX_TYPES.length) * 100)))

  const visibleBoxes = useMemo(() => {
    const normalizedQuery = boxQuery.trim().toLocaleLowerCase('pt-BR')
    return BOX_TYPES.filter((box) => {
      const data = state.boxes[box.id] || EMPTY_BOX
      if (boxFilter !== 'all' && getBoxStatus(data).id !== boxFilter) return false
      if (!normalizedQuery) return true
      return `${box.name} ${box.description}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery)
    })
  }, [boxFilter, boxQuery, state.boxes])

  const selectedBox = BOX_TYPES.find((box) => box.id === selectedBoxId)
  const selectedData = selectedBox ? state.boxes[selectedBox.id] || EMPTY_BOX : EMPTY_BOX
  const selectedStatus = getBoxStatus(selectedData)
  const selectedStageIndex = BOX_STAGES.findIndex((stage) => stage.id === selectedData.stage)
  const completedStages = selectedData.reviewed ? BOX_STAGES.length : Math.max(0, selectedStageIndex)

  const closeDrawer = useCallback(() => {
    setSelectedBoxId(null)
    setItemsExpanded(false)
    drawerTriggerRef.current?.focus()
  }, [])

  const openDrawer = (boxId, trigger) => {
    drawerTriggerRef.current = trigger
    setItemsExpanded(false)
    setSelectedBoxId(boxId)
  }

  useEffect(() => {
    if (!selectedBoxId) return undefined

    const previousOverflow = document.body.style.overflow
    const focusTimer = window.setTimeout(() => drawerCloseRef.current?.focus(), 0)
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDrawer()
        return
      }

      if (event.key !== 'Tab' || !drawerRef.current) return
      const focusable = Array.from(drawerRef.current.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'))
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeDrawer, selectedBoxId])

  return (
    <div className="page page--pipeline pipeline-redesign">
      <header className="page-heading pipeline-heading">
        <span className="eyebrow"><Sparkles size={13} /> Memória organizada</span>
        <h1>Caixas do universo</h1>
        <p>A IA organiza cada tipo de informação em silêncio. Abra uma caixa apenas quando precisar ver o conteúdo ou acompanhar o processamento.</p>
        <div className="boxes-summary" aria-label="Resumo das caixas">
          <span><strong>{totalItems}</strong> itens organizados</span>
          <i aria-hidden="true" />
          <span><strong>{reviewedBoxes}</strong> de {BOX_TYPES.length} revisadas</span>
          <i aria-hidden="true" />
          <span><strong>{overallProgress}%</strong> processado</span>
        </div>
      </header>

      <section className="boxes-toolbar" aria-label="Busca e filtros das caixas">
        <div className="boxes-search">
          <label className="pipeline-sr-only" htmlFor="pipeline-box-search">Buscar uma caixa</label>
          <Search size={16} aria-hidden="true" />
          <input
            id="pipeline-box-search"
            type="search"
            value={boxQuery}
            onChange={(event) => setBoxQuery(event.target.value)}
            placeholder="Buscar caixa..."
          />
          {boxQuery && (
            <button type="button" onClick={() => setBoxQuery('')} aria-label="Limpar busca">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="boxes-filters" role="group" aria-label="Filtrar caixas por status">
          {BOX_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={boxFilter === filter.id ? 'active' : ''}
              aria-pressed={boxFilter === filter.id}
              onClick={() => setBoxFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {visibleBoxes.length ? (
        <section className="boxes-grid" aria-label={`${visibleBoxes.length} ${visibleBoxes.length === 1 ? 'caixa encontrada' : 'caixas encontradas'}`}>
          {visibleBoxes.map((box) => {
            const data = state.boxes[box.id] || EMPTY_BOX
            const status = getBoxStatus(data)
            const itemCount = data.items?.length || 0
            return (
              <button
                key={box.id}
                type="button"
                className="box-card"
                data-status={status.id}
                style={{ '--box-accent': box.accent }}
                aria-haspopup="dialog"
                aria-label={`Abrir ${box.name}: ${status.label}, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}
                onClick={(event) => openDrawer(box.id, event.currentTarget)}
              >
                <span className="box-card__heading">
                  <i aria-hidden="true" />
                  <strong>{box.name}</strong>
                </span>
                <span className="box-card__meta">
                  <span className="box-status"><i aria-hidden="true" />{status.label}</span>
                  <span>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </span>
              </button>
            )
          })}
        </section>
      ) : (
        <div className="boxes-empty" role="status">
          <Search size={22} aria-hidden="true" />
          <strong>Nenhuma caixa encontrada</strong>
          <p>Tente outra busca ou volte a exibir todos os status.</p>
          <button type="button" onClick={() => { setBoxQuery(''); setBoxFilter('all') }}>Limpar filtros</button>
        </div>
      )}

      {selectedBox && (
        <div
          className="box-drawer-backdrop"
          onClick={(event) => { if (event.target === event.currentTarget) closeDrawer() }}
        >
          <aside
            ref={drawerRef}
            className="box-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="box-drawer-title"
            aria-describedby="box-drawer-description"
            style={{ '--box-accent': selectedBox.accent }}
          >
            <header className="box-drawer__header">
              <div>
                <span className="box-status" data-status={selectedStatus.id}><i aria-hidden="true" />{selectedStatus.label}</span>
                <h2 id="box-drawer-title">{selectedBox.name}</h2>
                <p id="box-drawer-description">{selectedBox.description}</p>
              </div>
              <button ref={drawerCloseRef} type="button" onClick={closeDrawer} aria-label={`Fechar detalhes de ${selectedBox.name}`}>
                <X size={18} aria-hidden="true" />
              </button>
            </header>

            <div className="box-drawer__body">
              <section className="box-progress" aria-labelledby="box-progress-title">
                <div className="box-section-heading">
                  <div>
                    <span>Processamento</span>
                    <h3 id="box-progress-title">{completedStages} de {BOX_STAGES.length} etapas concluídas</h3>
                  </div>
                  <strong>{selectedData.reviewed ? '100%' : `${Math.round((completedStages / BOX_STAGES.length) * 100)}%`}</strong>
                </div>
                <div
                  className="box-progress__track"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax={BOX_STAGES.length}
                  aria-valuenow={completedStages}
                  aria-valuetext={`${completedStages} de ${BOX_STAGES.length} etapas concluídas`}
                >
                  <span style={{ width: `${(completedStages / BOX_STAGES.length) * 100}%` }} />
                </div>

                <ol className="box-stage-list">
                  {BOX_STAGES.map((stage, index) => {
                    const done = selectedData.reviewed || index < selectedStageIndex
                    const active = !selectedData.reviewed && index === selectedStageIndex && selectedData.stage !== 'pending'
                    return (
                      <li key={stage.id} className={done ? 'done' : active ? 'active' : ''}>
                        <span aria-hidden="true">{done ? <Check size={13} /> : index + 1}</span>
                        <div>
                          <strong>{stage.label}</strong>
                          <p>{stage.description}</p>
                        </div>
                        <small>{done ? 'Concluída' : active ? 'Em andamento' : 'Pendente'}</small>
                      </li>
                    )
                  })}
                </ol>
              </section>

              <section className="box-items" aria-labelledby="box-items-title">
                <button
                  type="button"
                  className="box-items__toggle"
                  aria-expanded={itemsExpanded}
                  aria-controls="box-items-content"
                  onClick={() => setItemsExpanded((expanded) => !expanded)}
                >
                  <span>
                    <strong id="box-items-title">Conteúdo da caixa</strong>
                    <small>{selectedData.items.length} {selectedData.items.length === 1 ? 'item organizado' : 'itens organizados'}</small>
                  </span>
                  <span>{itemsExpanded ? 'Ocultar' : 'Ver itens'} <ChevronDown size={15} aria-hidden="true" /></span>
                </button>

                {itemsExpanded && (
                  <div id="box-items-content" className="box-items__content">
                    {selectedData.items.length ? (
                      <ul>
                        {selectedData.items.map((item) => (
                          <li key={item.id}>
                            <div>
                              <strong>{item.title}</strong>
                              <span>{getItemStatus(item.status)}</span>
                            </div>
                            <p>{item.polished || item.excerpt || 'Este item ainda não possui um resumo.'}</p>
                            {item.bulletPoints?.length > 0 && (
                              <ul>
                                {item.bulletPoints.map((point, index) => <li key={`${item.id}-${index}`}>{point}</li>)}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="box-items__empty">
                        <strong>A caixa ainda está vazia</strong>
                        <p>Novos itens aparecem aqui depois que uma fonte relacionada for processada.</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export function DiscardsPage() {
  const { state, filteredDiscards, query, setQuery, reasonFilter, setReasonFilter, restore } = usePipelineState()
  const countsByReason = useMemo(() => {
    const counts = {}
    for (const item of state.discards) counts[item.reason] = (counts[item.reason] || 0) + 1
    return counts
  }, [state.discards])

  return (
    <div className="page page--discards">
      <header className="page-heading">
        <span className="eyebrow"><Trash2 size={13} /> Caixa de descartes</span>
        <h1>Informações retiradas do cânone</h1>
        <p>A IA removeu itens que não se encaixaram em nenhuma caixa. Recupere quando quiser — eles voltam para a árvore prontos para uso.</p>
      </header>

      <div className="discards-toolbar">
        <div className="input-with-icon">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, trecho ou palavra-chave..." />
        </div>
        <div className="discards-filters">
          <button type="button" className={reasonFilter === 'all' ? 'active' : ''} onClick={() => setReasonFilter('all')}>
            <Filter size={13} /> Todos <small>{state.discards.length}</small>
          </button>
          {DISCARD_REASONS.map((reason) => (
            <button key={reason.id} type="button" className={reasonFilter === reason.id ? 'active' : ''} onClick={() => setReasonFilter(reason.id)}>
              {reason.label} <small>{countsByReason[reason.id] || 0}</small>
            </button>
          ))}
        </div>
      </div>

      {filteredDiscards.length === 0 ? (
        <div className="empty-projects">
          <span className="empty-mark"><Check size={26} /></span>
          <h2>{state.discards.length === 0 ? 'Nenhum descarte ainda' : 'Nada encontrado para esse filtro'}</h2>
          <p>{state.discards.length === 0 ? 'Quando a IA descartar algo durante o pipeline, aparecerá aqui para você recuperar.' : 'Ajuste os filtros para encontrar o que procura.'}</p>
        </div>
      ) : (
        <div className="discards-grid">
          {filteredDiscards.map((item) => {
            const original = BOX_TYPES.find((box) => box.id === item.originalBoxId)
            const reason = DISCARD_REASONS.find((entry) => entry.id === item.reason)
            return (
              <article key={item.id} className="discard-card">
                <header>
                  <span className="discard-card__reason">{reason?.label || 'Descartado'}</span>
                  <small>Veio de <strong>{original?.name || 'Caixa desconhecida'}</strong></small>
                </header>
                <h3>{item.title}</h3>
                <p>{item.excerpt}</p>
                {item.note && <small className="discard-card__note">{item.note}</small>}
                <div className="discard-card__actions">
                  <button className="button button--primary" type="button" onClick={() => restore(item.id)}>
                    <RotateCcw size={14} /> Restaurar para {original?.name || 'caixa original'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
