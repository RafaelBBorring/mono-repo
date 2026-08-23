import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  NodeToolbar,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  BookOpenText,
  Check,
  ChevronRight,
  CircleDot,
  Edit3,
  ExternalLink,
  FileText,
  MessageSquareText,
  Network,
  PencilLine,
  RotateCcw,
  Search,
  Sparkles,
  TreePine,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMaestro } from '../contexts/MaestroContext'
import { buildGraphFromPipeline, categoryColor, categoryLabel } from '../services/entityGraph'
import { YggdrasilPreview } from '../components/visual/YggdrasilPreview'

function loadPipelineState(projectId) {
  try {
    const stored = projectId ? localStorage.getItem(`maestro-pipeline-state-v1:${projectId}`) : null
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function loadOverrides(storageKey) {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function confidencePercent(value) {
  const confidence = Number(value || 0)
  return Math.round(confidence <= 1 ? confidence * 100 : confidence)
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function searchableName(value) {
  return normalizeText(value).replace(/^(o|a|os|as|um|uma)\s+/, '')
}

function truncate(value, limit = 156) {
  const text = String(value || '').trim()
  return text.length > limit ? `${text.slice(0, limit).trim()}…` : text
}

function buildFallbackGraph(entities) {
  const source = (entities || []).slice(0, 40)
  if (!source.length) return { nodes: [], edges: [] }

  const hub = [...source].sort((a, b) => Number(b.relations || 0) - Number(a.relations || 0))[0]
  const satellites = source.filter((entity) => entity.id !== hub.id)
  const radius = Math.max(270, Math.min(520, satellites.length * 29))
  const nodes = source.map((entity) => {
    const satelliteIndex = satellites.findIndex((item) => item.id === entity.id)
    const angle = -Math.PI / 2 + (satelliteIndex / Math.max(1, satellites.length)) * Math.PI * 2
    const orbit = radius + (satelliteIndex % 2 ? 42 : 0)
    return {
      id: entity.id,
      type: 'entity',
      position: entity.id === hub.id
        ? { x: 440, y: 330 }
        : { x: Math.cos(angle) * orbit + 440, y: Math.sin(angle) * orbit + 330 },
      data: {
        label: entity.name,
        category: entity.category || 'Conhecimento',
        excerpt: entity.summary || '',
        polished: entity.summary || '',
        summary: entity.summary || '',
        bulletPoints: entity.claims?.map((claim) => `${claim.label}: ${claim.value}`) || [],
        sources: entity.claims?.map((claim) => claim.source).filter(Boolean) || [],
        confidence: entity.confidence || 0,
        accent: entity.accent || categoryColor(entity.category),
        facts: entity.facts || 0,
        relationCount: entity.relations || 0,
        tags: entity.tags || [],
        isHub: entity.id === hub.id,
      },
    }
  })

  const edges = []
  for (let leftIndex = 0; leftIndex < source.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < source.length; rightIndex += 1) {
      const left = source[leftIndex]
      const right = source[rightIndex]
      const leftContext = normalizeText(`${left.summary || ''} ${(left.tags || []).join(' ')}`)
      const rightContext = normalizeText(`${right.summary || ''} ${(right.tags || []).join(' ')}`)
      const leftName = searchableName(left.name)
      const rightName = searchableName(right.name)
      const sharedTag = (left.tags || []).find((tag) => (right.tags || []).some((candidate) => normalizeText(candidate) === normalizeText(tag)))
      const mentionsEachOther = (rightName.length > 3 && leftContext.includes(rightName)) || (leftName.length > 3 && rightContext.includes(leftName))
      if (!mentionsEachOther && !sharedTag) continue
      edges.push({
        id: `entity-relation-${left.id}-${right.id}`,
        source: left.id,
        target: right.id,
        type: 'smoothstep',
        data: { reason: sharedTag || 'Menção cruzada' },
      })
    }
  }

  return { nodes, edges }
}

function enrichGraph(graph, overrides) {
  const overriddenNodes = graph.nodes.map((node) => {
    const override = overrides[node.id]
    return {
      ...node,
      ariaLabel: '',
      data: {
        ...node.data,
        label: override?.label || node.data.label,
        summary: override?.summary ?? node.data.summary ?? node.data.polished ?? node.data.excerpt ?? '',
        localNote: override?.note || '',
        hasLocalOverride: Boolean(override),
      },
    }
  })
  const byId = new Map(overriddenNodes.map((node) => [node.id, node]))
  const relations = new Map(overriddenNodes.map((node) => [node.id, []]))
  const verticalPositions = overriddenNodes.map((node) => Number(node.position?.y || 0))
  const verticalMidpoint = verticalPositions.length
    ? (Math.min(...verticalPositions) + Math.max(...verticalPositions)) / 2
    : 0

  for (const edge of graph.edges) {
    const source = byId.get(edge.source)
    const target = byId.get(edge.target)
    if (!source || !target) continue
    relations.get(source.id).push({ id: target.id, label: target.data.label, reason: edge.data?.reason || 'Conexão mapeada' })
    relations.get(target.id).push({ id: source.id, label: source.data.label, reason: edge.data?.reason || 'Conexão mapeada' })
  }

  return {
    nodes: overriddenNodes.map((node) => {
      const nodeRelations = relations.get(node.id) || []
      const relationCount = Math.max(nodeRelations.length, Number(node.data.relationCount || 0))
      const confidence = confidencePercent(node.data.confidence)
      const summary = truncate(node.data.summary || node.data.polished || node.data.excerpt || 'Resumo ainda não consolidado.')
      return {
        ...node,
        ariaLabel: `${node.data.label}, ${categoryLabel(node.data.category)}. ${summary} Confiança: ${confidence}%. ${relationCount} relações. Pressione Enter para abrir os detalhes.`,
        data: {
          ...node.data,
          relations: nodeRelations,
          relationCount,
          toolbarPosition: Number(node.position?.y || 0) <= verticalMidpoint ? Position.Bottom : Position.Top,
        },
      }
    }),
    edges: graph.edges.map((edge) => ({
      ...edge,
      animated: false,
      className: 'ygg-edge',
      style: { stroke: 'rgba(217, 183, 119, .23)', strokeWidth: 1.2 },
    })),
  }
}

function NodeCard({ id, data, selected }) {
  const [previewVisible, setPreviewVisible] = useState(false)
  const accent = data.accent || categoryColor(data.category)
  const confidence = confidencePercent(data.confidence)
  const relationCount = Number(data.relationCount || 0)
  const summary = truncate(data.summary || data.polished || data.excerpt || 'Resumo ainda não consolidado.')
  const toolbarPosition = data.toolbarPosition || Position.Bottom

  return (
    <>
      <Handle className="ygg-node__handle" type="target" position={Position.Left} />
      <NodeToolbar
        className={`ygg-node__toolbar ${toolbarPosition === Position.Bottom ? 'ygg-node__toolbar--bottom' : ''}`}
        isVisible={previewVisible}
        position={toolbarPosition}
        offset={10}
      >
        <span className="ygg-node__popover" role="tooltip">
          <span className="ygg-node__popover-category">{categoryLabel(data.category)}</span>
          <span className="ygg-node__popover-summary">{summary}</span>
          <span className="ygg-node__popover-meta">
            <span><b>{confidence}%</b> confiança</span>
            <span><b>{relationCount}</b> relações</span>
          </span>
          <span className="ygg-node__popover-hint">Clique para ler ou editar</span>
        </span>
      </NodeToolbar>
      <button
        type="button"
        className={`ygg-node ${selected ? 'ygg-node--selected' : ''} ${data.isHub ? 'ygg-node--hub' : ''}`}
        style={{ '--node-accent': accent }}
        onClick={(event) => {
          if (!data.onOpen) return
          event.stopPropagation()
          data.onOpen(id)
        }}
        onMouseEnter={() => setPreviewVisible(true)}
        onMouseLeave={() => setPreviewVisible(false)}
        onFocus={() => {
          setPreviewVisible(true)
          data.onFocus?.(id)
        }}
        onBlur={() => setPreviewVisible(false)}
        aria-label={`${data.label}, ${categoryLabel(data.category)}. ${summary} Confiança: ${confidence}%. ${relationCount} relações. Pressione Enter para abrir os detalhes.`}
        aria-haspopup="dialog"
      >
        <span className="ygg-node__mark" aria-hidden="true">{data.isHub ? <TreePine size={15} /> : <CircleDot size={13} />}</span>
        <span className="ygg-node__copy">
          <strong>{data.label}</strong>
          <small>{categoryLabel(data.category)}</small>
        </span>
        {data.hasLocalOverride && <PencilLine className="ygg-node__edited" size={12} aria-label="Editado localmente" />}
      </button>
      <Handle className="ygg-node__handle" type="source" position={Position.Right} />
    </>
  )
}

const nodeTypes = { entity: NodeCard }

function YggdrasilInspector({ node, onClose, onOpenNode, onSave, onReset, onAsk, onOpenKnowledge }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => ({
    label: node.data.label || '',
    summary: node.data.summary || node.data.polished || node.data.excerpt || '',
    note: node.data.localNote || '',
  }))
  const drawerRef = useRef(null)
  const accent = node.data.accent || categoryColor(node.data.category)
  const confidence = confidencePercent(node.data.confidence)
  const relations = node.data.relations || []
  const relationCount = Number(node.data.relationCount || relations.length)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    drawerRef.current?.focus()
    const handleDialogKeys = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !drawerRef.current) return

      const focusable = [...drawerRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hasAttribute('hidden'))
      if (!focusable.length) {
        event.preventDefault()
        drawerRef.current.focus()
        return
      }
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
    window.addEventListener('keydown', handleDialogKeys)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleDialogKeys)
    }
  }, [onClose])

  useEffect(() => {
    if (editing) return
    setDraft({
      label: node.data.label || '',
      summary: node.data.summary || node.data.polished || node.data.excerpt || '',
      note: node.data.localNote || '',
    })
  }, [editing, node.data.excerpt, node.data.label, node.data.localNote, node.data.polished, node.data.summary])

  const submit = (event) => {
    event.preventDefault()
    onSave(node.id, {
      label: draft.label.trim() || node.data.label,
      summary: draft.summary.trim(),
      note: draft.note.trim(),
    })
    setEditing(false)
  }

  return (
    <>
      <button className="ygg-drawer-backdrop" type="button" onClick={onClose} aria-label="Fechar detalhes da entidade" tabIndex={-1} />
      <aside
        ref={drawerRef}
        className="ygg-inspector"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ygg-inspector-title"
        style={{ '--node-accent': accent }}
        tabIndex={-1}
      >
        <header className="ygg-inspector__topbar">
          <span className="ygg-inspector__category"><i /> {categoryLabel(node.data.category)}</span>
          <div>
            {!editing && (
              <button className="icon-button" type="button" onClick={() => setEditing(true)} aria-label="Editar esta entidade">
                <Edit3 size={15} />
              </button>
            )}
            <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar detalhes">
              <X size={16} />
            </button>
          </div>
        </header>

        {editing ? (
          <form className="ygg-editor" onSubmit={submit}>
            <div className="ygg-editor__heading">
              <span className="eyebrow"><PencilLine size={12} /> Ajuste local</span>
              <h2 id="ygg-inspector-title">Editar conhecimento</h2>
              <p>Seu texto fica salvo neste dispositivo e não altera as fontes originais.</p>
            </div>
            <label>
              Nome
              <input value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} autoFocus />
            </label>
            <label>
              Resumo
              <textarea rows="6" value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} />
            </label>
            <label>
              Nota do autor <span>opcional</span>
              <textarea rows="4" value={draft.note} onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))} placeholder="Registre uma nuance, dúvida ou intenção narrativa…" />
            </label>
            <div className="ygg-editor__actions">
              <button className="button button--primary" type="submit"><Check size={15} /> Salvar ajuste</button>
              <button className="button button--ghost" type="button" onClick={() => setEditing(false)}>Cancelar</button>
              {node.data.hasLocalOverride && (
                <button className="ygg-editor__reset" type="button" onClick={() => { onReset(node.id); setEditing(false) }}>
                  <RotateCcw size={13} /> Restaurar original
                </button>
              )}
            </div>
          </form>
        ) : (
          <>
            <div className="ygg-inspector__heading">
              <div>
                <span className="eyebrow">Nó de conhecimento</span>
                {node.data.hasLocalOverride && <span className="ygg-local-badge"><PencilLine size={11} /> Ajuste local</span>}
              </div>
              <h2 id="ygg-inspector-title">{node.data.label}</h2>
              <p>{node.data.summary || node.data.polished || node.data.excerpt || 'O Maestro ainda não consolidou um resumo para este ponto do universo.'}</p>
            </div>

            <dl className="ygg-inspector__metrics">
              <div><dt>Confiança</dt><dd>{confidence}%</dd></div>
              <div><dt>Relações</dt><dd>{relationCount}</dd></div>
              <div><dt>Fatos</dt><dd>{Number(node.data.facts || node.data.bulletPoints?.length || 0)}</dd></div>
            </dl>

            {node.data.bulletPoints?.length > 0 && (
              <section className="ygg-inspector__section">
                <header><FileText size={14} /><h3>Conhecimento principal</h3></header>
                <ul>{node.data.bulletPoints.slice(0, 6).map((bullet, index) => <li key={`${bullet}-${index}`}>{bullet}</li>)}</ul>
              </section>
            )}

            <section className="ygg-inspector__section">
              <header><Network size={14} /><h3>Relações visíveis</h3><span>{relations.length}</span></header>
              {relations.length ? (
                <div className="ygg-relation-list">
                  {relations.slice(0, 8).map((relation) => (
                    <button type="button" key={relation.id} onClick={() => onOpenNode(relation.id)}>
                      <span><strong>{relation.label}</strong><small>{relation.reason}</small></span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="ygg-inspector__empty-copy">As relações existem na memória, mas nenhuma conexão direta está disponível neste recorte do mapa.</p>
              )}
            </section>

            {node.data.localNote && (
              <section className="ygg-inspector__section ygg-inspector__note">
                <header><PencilLine size={14} /><h3>Nota do autor</h3></header>
                <p>{node.data.localNote}</p>
              </section>
            )}

            {node.data.sources?.length > 0 && (
              <section className="ygg-inspector__section">
                <header><ExternalLink size={14} /><h3>Fontes associadas</h3></header>
                <div className="ygg-source-list">
                  {[...new Set(node.data.sources)].slice(0, 6).map((source) => <span key={source}>{source}</span>)}
                </div>
              </section>
            )}

            <footer className="ygg-inspector__actions">
              <button className="button button--primary" type="button" onClick={() => onAsk(node)}><MessageSquareText size={15} /> Perguntar ao Maestro</button>
              <button className="button button--ghost" type="button" onClick={() => onOpenKnowledge(node)}><BookOpenText size={15} /> Abrir conhecimento</button>
            </footer>
          </>
        )}
      </aside>
    </>
  )
}

function YggdrasilInner() {
  const { entities, activeProject, notify } = useMaestro()
  const navigate = useNavigate()
  const { getZoom, setCenter } = useReactFlow()
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [compactViewport, setCompactViewport] = useState(() => window.matchMedia('(max-width: 560px)').matches)
  const pipelineState = useMemo(() => loadPipelineState(activeProject?.id), [activeProject?.id])
  const storageKey = `maestro-yggdrasil-overrides-v1:${activeProject?.id || 'default'}`
  const [overrides, setOverrides] = useState(() => loadOverrides(storageKey))

  useEffect(() => {
    setOverrides(loadOverrides(storageKey))
  }, [storageKey])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 560px)')
    const updateViewportMode = (event) => setCompactViewport(event.matches)
    media.addEventListener('change', updateViewportMode)
    return () => media.removeEventListener('change', updateViewportMode)
  }, [])

  const baseGraph = useMemo(() => {
    const fromPipeline = pipelineState?.boxes ? buildGraphFromPipeline(pipelineState) : { nodes: [], edges: [] }
    return entities?.length ? buildFallbackGraph(entities) : fromPipeline
  }, [pipelineState, entities])

  const graph = useMemo(() => enrichGraph(baseGraph, overrides), [baseGraph, overrides])
  const filtered = useMemo(() => {
    const query = normalizeText(filter.trim())
    const matchingNodes = graph.nodes.filter((node) => {
      const haystack = normalizeText(`${node.data.label} ${node.data.summary || ''} ${node.data.excerpt || ''} ${(node.data.tags || []).join(' ')}`)
      return (!query || haystack.includes(query)) && (activeCategory === 'all' || node.data.category === activeCategory)
    })
    const horizontalPositions = matchingNodes.map((node) => Number(node.position?.x || 0))
    const horizontalCenter = horizontalPositions.length
      ? (Math.min(...horizontalPositions) + Math.max(...horizontalPositions)) / 2
      : 0
    const visibleNodes = compactViewport
      ? matchingNodes.map((node) => ({
          ...node,
          position: {
            ...node.position,
            x: horizontalCenter + (Number(node.position?.x || 0) - horizontalCenter) * 0.68,
          },
        }))
      : matchingNodes
    const visibleIds = new Set(visibleNodes.map((node) => node.id))
    return { nodes: visibleNodes, edges: graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)) }
  }, [activeCategory, compactViewport, filter, graph])

  const [nodes, setNodes, onNodesChange] = useNodesState(filtered.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(filtered.edges)

  const focusNode = useCallback((id) => {
    const target = graph.nodes.find((node) => node.id === id)
    if (!target) return
    setCenter(target.position.x + 89, target.position.y + 27, {
      zoom: Math.max(getZoom(), 0.72),
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220,
    })
  }, [getZoom, graph.nodes, setCenter])

  const openNode = useCallback((id) => {
    setSelectedId(id)
    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === id })))
  }, [setNodes])
  const closeNode = useCallback(() => {
    const nodeId = selectedId
    setSelectedId(null)
    if (!nodeId) return
    window.setTimeout(() => {
      const currentNodeButton = [...document.querySelectorAll('.react-flow__node')]
        .find((element) => element.dataset.id === nodeId)
        ?.querySelector('.ygg-node')
      if (currentNodeButton instanceof HTMLElement) currentNodeButton.focus()
    }, 0)
  }, [selectedId])

  useEffect(() => {
    setNodes(filtered.nodes.map((node) => ({
      ...node,
      selected: node.id === selectedId,
      data: { ...node.data, onOpen: openNode, onFocus: focusNode },
    })))
    setEdges(filtered.edges)
  }, [filtered, focusNode, openNode, selectedId, setEdges, setNodes])

  const selectedNode = graph.nodes.find((node) => node.id === selectedId)
  const categories = useMemo(() => ['all', ...new Set(graph.nodes.map((node) => node.data.category).filter(Boolean))], [graph.nodes])
  const clearFilters = () => { setFilter(''); setActiveCategory('all') }

  const saveOverride = (id, value) => {
    setOverrides((current) => {
      const next = { ...current, [id]: value }
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* localStorage pode estar indisponível */ }
      return next
    })
    notify('Ajuste salvo neste dispositivo.')
  }

  const resetOverride = (id) => {
    setOverrides((current) => {
      const next = { ...current }
      delete next[id]
      try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* localStorage pode estar indisponível */ }
      return next
    })
    notify('Versão original restaurada.')
  }

  const askAboutNode = (node) => {
    const prompt = `Analise ${node.data.label} no contexto do meu universo. Separe o que está confirmado, as relações mais importantes, possíveis contradições e oportunidades narrativas. Cite as fontes disponíveis.`
    navigate(`/app/chat?mode=investigate&prompt=${encodeURIComponent(prompt)}`)
  }

  const openKnowledge = (node) => navigate(`/app/knowledge?entity=${encodeURIComponent(node.id)}`)
  const askMaestro = () => {
    const prompt = 'Observe o estado atual do meu universo e me ajude a encontrar as conexões mais importantes, lacunas de continuidade e três oportunidades narrativas. Separe fatos confirmados de inferências.'
    navigate(`/app/chat?mode=investigate&prompt=${encodeURIComponent(prompt)}`)
  }

  return (
    <div className="page page--yggdrasil-redesign">
      <header className="ygg-header">
        <div className="ygg-header__copy">
          <span className="ygg-header__icon" aria-hidden="true"><TreePine size={23} /></span>
          <div>
            <span className="eyebrow">Yggdrasil · mapa vivo do universo</span>
            <h1>Árvore da Vida</h1>
            <p>Encontre uma ideia, veja como ela se conecta e só abra os detalhes quando precisar.</p>
          </div>
        </div>
        <div className="ygg-header__preview">
          <YggdrasilPreview compact labels={categories.slice(1, 4).map((category) => categoryLabel(category))} />
          <div className="ygg-header__stats" aria-label={`${graph.nodes.length} entidades e ${graph.edges.length} conexões mapeadas`}>
            <span><strong>{graph.nodes.length}</strong> entidades</span>
            <i />
            <span><strong>{graph.edges.length}</strong> conexões visíveis</span>
          </div>
        </div>
        <div className="ygg-header__actions">
          <button className="button button--primary" type="button" onClick={askMaestro}><Sparkles size={16} /> Perguntar ao Maestro</button>
        </div>
      </header>

      <section className="ygg-toolbar" aria-label="Ferramentas do mapa">
        <label className="ygg-sr-only" htmlFor="ygg-search-input">Buscar no mapa</label>
        <div className="ygg-search">
          <Search size={17} />
          <input id="ygg-search-input" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar pessoa, lugar ou conceito…" />
          {filter && <button type="button" onClick={() => setFilter('')} aria-label="Limpar busca"><X size={14} /></button>}
        </div>
        <div className="ygg-categories" aria-label="Filtrar por categoria">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={activeCategory === category ? 'active' : ''}
              onClick={() => setActiveCategory(category)}
              aria-pressed={activeCategory === category}
            >
              {category === 'all' ? 'Tudo' : categoryLabel(category)}
            </button>
          ))}
        </div>
      </section>

      <section className="ygg-canvas" aria-label="Mapa interativo da Árvore da Vida">
        <header className="ygg-canvas__bar">
          <span><Network size={14} /> {nodes.length} nós neste recorte</span>
          <small>Passe o mouse ou use Tab para espiar · clique ou Enter para abrir</small>
        </header>
        <div className="ygg-canvas__flow">
          {nodes.length ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_, node) => openNode(node.id)}
              onPaneClick={closeNode}
              fitView
              fitViewOptions={{ padding: compactViewport ? 0.16 : 0.28, minZoom: compactViewport ? 0.78 : 0.56, maxZoom: 1.08 }}
              minZoom={compactViewport ? 0.52 : 0.42}
              maxZoom={1.65}
              nodesDraggable={false}
              nodesConnectable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              ariaLabelConfig={{
                'controls.ariaLabel': 'Controles do mapa',
                'controls.zoomIn.ariaLabel': 'Aumentar zoom',
                'controls.zoomOut.ariaLabel': 'Diminuir zoom',
                'controls.fitView.ariaLabel': 'Enquadrar todos os nós',
              }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={38} size={1} color="rgba(255, 255, 255, .075)" />
              <Controls className="ygg-controls" showInteractive={false} position="bottom-left" />
            </ReactFlow>
          ) : (
            <div className="ygg-empty">
              <YggdrasilPreview />
              <span className="eyebrow">Mapa em silêncio</span>
              <h2>{graph.nodes.length ? 'Nenhum nó encontrado' : 'Sua Árvore da Vida nasce das suas fontes'}</h2>
              <p>{graph.nodes.length ? 'Tente outro termo ou volte a ver todas as categorias.' : 'Conecte um board ou adicione conhecimento para o Maestro organizar as primeiras relações.'}</p>
              <button className="button button--ghost" type="button" onClick={graph.nodes.length ? clearFilters : () => navigate('/app/settings')}>
                {graph.nodes.length ? 'Limpar filtros' : 'Configurar fontes'} <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </section>

      {selectedNode && (
        <YggdrasilInspector
          key={selectedNode.id}
          node={selectedNode}
          onClose={closeNode}
          onOpenNode={openNode}
          onSave={saveOverride}
          onReset={resetOverride}
          onAsk={askAboutNode}
          onOpenKnowledge={openKnowledge}
        />
      )}
    </div>
  )
}

export function YggdrasilPage() {
  return (
    <ReactFlowProvider>
      <YggdrasilInner />
    </ReactFlowProvider>
  )
}
