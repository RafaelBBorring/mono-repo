import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { ATTR_ICONS } from '../data/attributes'
import { MODULES_ACTIVE, MODULES_PASSIVE, MODULES_SPECIAL } from '../data/modules'
import { PERICIAS, GRAU_NAMES } from '../data/pericias'
import { RACES } from '../data/races'
import { TRIAGES } from '../data/triages'
import { getRaceAdjustedAttrs, getRaceLabel } from '../utils/raceCalculator'
import { getRaceTree } from '../data/raceTrees'
import { calcPARTotal, calcRaceTreePARSpent } from '../utils/calculator'

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

const SECTIONS = [
  { type: 'identity', title: 'Identidade', icon: '👤', desc: 'Nome, classe e nível.' },
  { type: 'attributes', title: 'Esqueleto', icon: '⚔', desc: 'Atributos finais.' },
  { type: 'race', title: 'Raça', icon: '🧬', desc: 'Herança e passivas.' },
  { type: 'modules', title: 'Módulos', icon: '📦', desc: 'Passivos, ativos, especiais.' },
  { type: 'abilities', title: 'Habilidades', icon: '⚡', desc: 'Passivas, ativas, ultimate.' },
  { type: 'mystic', title: 'Grimório', icon: '📖', desc: 'Magias, runas, rituais.' },
  { type: 'skills', title: 'Perícias', icon: '🎯', desc: 'Treinos e graus.' },
  { type: 'triages', title: 'Triagens', icon: '🔀', desc: 'Caminhos de combate.' },
]

const CARD_COLORS = [
  { name: 'Obsidiana', bg: 'rgba(18,22,36,0.94)', border: 'rgba(111,82,42,0.5)', header: '#c9a84c' },
  { name: 'Ouro', bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.45)', header: '#e8c97e' },
  { name: 'Ciano', bg: 'rgba(46,132,132,0.08)', border: 'rgba(78,164,166,0.4)', header: '#6eb8bd' },
  { name: 'Roxo', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.35)', header: '#c084fc' },
  { name: 'Esmeralda', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.35)', header: '#34d399' },
  { name: 'Rubi', bg: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.35)', header: '#fb7185' },
  { name: 'Âmbar', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.35)', header: '#fbbf24' },
  { name: 'Céu', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.35)', header: '#38bdf8' },
]

const TEXT_COLORS = ['#e8e8f0', '#c9a84c', '#38bdf8', '#c084fc', '#34d399', '#fb7185', '#fbbf24', '#f97316']

const SHAPE_FILLS = [
  'rgba(201,168,76,0.12)', 'rgba(46,132,132,0.12)', 'rgba(192,132,252,0.12)',
  'rgba(52,211,153,0.12)', 'rgba(251,113,133,0.12)', 'rgba(251,191,36,0.12)',
  'rgba(56,189,248,0.12)', 'rgba(82,194,120,0.12)', 'rgba(249,115,22,0.12)',
]

const SHAPE_BORDERS = [
  'rgba(201,168,76,0.55)', 'rgba(78,164,166,0.55)', 'rgba(192,132,252,0.55)',
  'rgba(52,211,153,0.55)', 'rgba(251,113,133,0.55)', 'rgba(251,191,36,0.55)',
  'rgba(56,189,248,0.55)', 'rgba(82,194,120,0.55)', 'rgba(249,115,22,0.55)',
]

const FONT_SIZES = [12, 14, 16, 18, 22]

const TOOLS = [
  { id: 'select', label: 'Selecionar', icon: '⇱', key: 'V' },
  { id: 'pan', label: 'Mover Tela', icon: '✋', key: 'H' },
  { id: 'card', label: 'Card', icon: '☐', key: 'C' },
  { id: 'text', label: 'Texto', icon: 'Aa', key: 'T' },
  { id: 'rect', label: 'Retângulo', icon: '□', key: 'R' },
  { id: 'circle', label: 'Círculo', icon: '○', key: 'O' },
  { id: 'diamond', label: 'Losango', icon: '◇', key: 'D' },
  { id: 'triangle', label: 'Triângulo', icon: '△', key: 'G' },
  { id: 'image', label: 'Imagem', icon: '▣', key: 'I' },
]

function buildGrimoirePages(char) {
  const sources = [
    { key: 'spells', label: 'Feitiço', items: char.spells || [] },
    { key: 'runes', label: 'Runa', items: char.runes || [] },
    { key: 'magics', label: 'Magia', items: char.magics || [] },
    { key: 'alchemyRituals', label: 'Ritual', items: char.alchemyRituals || [] },
  ]
  return sources.flatMap(s =>
    s.items.slice(0, 10).map((item, i) => ({
      id: `${s.key}_${item.id || i}`,
      title: item.name || item.nome || s.label,
      subtitle: `${s.label}${item.circle ? ` de ${item.circle}o círculo` : ''}`,
      body: item.effect || item.descricao || item.short_description || 'Sem efeito descrito.',
    }))
  )
}

function getTriagemName(char, key, fallbackClass) {
  if (!key) return '-'
  if (TRIAGES[fallbackClass]?.[key]?.name) return TRIAGES[fallbackClass][key].name
  for (const cls of Object.keys(TRIAGES)) {
    if (TRIAGES[cls]?.[key]?.name) return TRIAGES[cls][key].name
  }
  return key
}

function resizeImageSrc(src, maxSize = 1000) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
        else { w = Math.round(w * maxSize / h); h = maxSize }
      }
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      c.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(c.toDataURL('image/jpeg', 0.82))
    }
    img.src = src
  })
}

function SectionBody({ type, char, grimoirePages, expanded }) {
  const skeleton = char.skeletonPoints || {}
  const attrs = getRaceAdjustedAttrs(char.atributos, skeleton, char)
  const allModules = [...MODULES_PASSIVE, ...MODULES_ACTIVE, ...MODULES_SPECIAL]
  const modules = (char.modulosAdquiridos || [])
    .map(e => { const f = allModules.find(m => m.id === e.id); return f ? { ...f, boughtCount: e.boughtCount || 1 } : null })
    .filter(Boolean)
  const pericias = Object.entries(char.pericias || {}).filter(([, g]) => g > 0)
  const race = RACES[char.raca]
  const habs = char.habilidades || []

  if (type === 'identity') {
    return (
      <>
        <div className="board-sec-accent bg-gold/20" />
        <h3 className="board-section-title text-gold">{char.nome || 'Sem Nome'}</h3>
        <div className="board-chip-grid">
          <span>Classe <strong>{char.classe || '-'}</strong></span>
          <span>Nível <strong>{char.nivel || 1}</strong></span>
          <span>Raça <strong>{getRaceLabel(char) || '-'}</strong></span>
          <span>Array <strong>{char.arrayTipo || '-'}</strong></span>
        </div>
        {char.avatar && <img src={char.avatar} alt="" className="board-sec-avatar" />}
      </>
    )
  }
  if (type === 'attributes') {
    return (
      <>
        <div className="board-sec-accent bg-sky-500/30" />
        <h3 className="board-section-title text-sky-300">Esqueleto</h3>
        <div className="board-attr-grid">
          {['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'].map(a => (
            <span key={a}><small>{ATTR_ICONS[a]} {a}</small><strong>{attrs[a] || 0}</strong></span>
          ))}
        </div>
      </>
    )
  }
  if (type === 'race') {
    const passivas = race?.passivasRaciais || []
    const vantagens = race?.vantagens || []
    return (
      <>
        <div className="board-sec-accent bg-emerald-400/30" />
        <h3 className="board-section-title text-emerald-300">{race?.name || 'Raça'}</h3>
        {race?.quote && <p className="board-section-quote">«{race.quote}»</p>}
        <p className="board-section-desc">{race?.desc || 'Nenhuma raça selecionada.'}</p>
        {passivas.length > 0 && (
          <div className="board-detail-list">
            <label className="board-detail-label">Passivas Raciais</label>
            {passivas.map(p => (
              <div key={p.nome} className="board-detail-item">
                <strong>{p.nome}</strong>
                <span className="board-detail-tag">{p.tipo} {p.custo ? `· ${p.custo}` : ''}</span>
                {(expanded || !p.efeito || p.efeito.length < 80) ? (
                  <p>{p.efeito || p.duracao || '—'}</p>
                ) : (
                  <p>{p.efeito.slice(0, 77)}…</p>
                )}
              </div>
            ))}
          </div>
        )}
        {expanded && vantagens.length > 0 && (
          <div className="board-detail-list">
            <label className="board-detail-label">Vantagens</label>
            {vantagens.map((v, i) => <div key={i} className="board-detail-simple board-text-emerald">✓ {v}</div>)}
          </div>
        )}
        {expanded && (race?.desvantagens || []).length > 0 && (
          <div className="board-detail-list">
            <label className="board-detail-label">Desvantagens</label>
            {(race.desvantagens || []).map((d, i) => <div key={i} className="board-detail-simple board-text-rose">✕ {d}</div>)}
          </div>
        )}
        {expanded && (() => {
          const tree = getRaceTree(char.raca)
          if (!tree) return null
          const unlocked = char.raceTreeUnlocked || []
          const parTotal = calcPARTotal(char.classe, char.nivel || 1, char.progressaoChoices, char.modulosAdquiridos, char)
          const parSpent = calcRaceTreePARSpent(unlocked, char.raca)
          const available = parTotal - parSpent
          return (
            <div className="board-detail-list">
              <label className="board-detail-label">Árvore de Habilidades</label>
              <div className="board-detail-item">
                <strong>{tree.name}</strong>
                <div className="board-chip-grid mt-1">
                  <span>Desbloqueados <strong>{unlocked.length}</strong></span>
                  <span>Disponíveis <strong className="board-text-gold">{available}</strong> PAR</span>
                </div>
                {tree.branches?.map(branch => {
                  const branchNodes = tree.nodes.filter(n => n.branch === branch.id)
                  const branchUnlocked = branchNodes.filter(n => unlocked.includes(n.id))
                  return (
                    <div key={branch.id} className="mt-2">
                      <div className="flex items-center gap-2">
                        <span className="board-detail-tag" style={{ color: branch.color }}>{branch.name}</span>
                        <span className="board-text-dim text-xs">{branchUnlocked.length}/{branchNodes.length}</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {branchNodes.map(n => (
                          <span key={n.id} className="board-skill-dot"
                            style={unlocked.includes(n.id)
                              ? { background: branch.color, borderColor: branch.color }
                              : {}} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </>
    )
  }
  if (type === 'modules') {
    return (
      <>
        <div className="board-sec-accent bg-amber-400/30" />
        <h3 className="board-section-title text-amber-300">Módulos</h3>
        {modules.length ? (
          <div className="board-detail-list">
            {modules.map(m => (
              <div key={m.id} className="board-detail-item">
                <strong>{m.name}{m.boughtCount > 1 ? ` ×${m.boughtCount}` : ''}</strong>
                {(expanded && m.desc) && <p>{m.desc}</p>}
                {(expanded && m.effect) && <p className="board-text-gold">{m.effect}</p>}
              </div>
            ))}
          </div>
        ) : <em className="board-text-dim">Nenhum módulo adquirido.</em>}
      </>
    )
  }
  if (type === 'abilities') {
    const TYPE_STYLE = {
      'Passiva': { color: 'text-emerald-400', bg: 'bg-emerald-400/8', border: 'border-emerald-400/20', icon: 'P' },
      'Ativa': { color: 'text-indigo-300', bg: 'bg-indigo-400/8', border: 'border-indigo-400/20', icon: '⚡' },
      'Ultimate': { color: 'text-gold', bg: 'bg-gold/8', border: 'border-gold/20', icon: '★' },
    }
    const extraKey = Object.keys(TYPE_STYLE).includes ? null : null
    const getTypeStyle = (t) => TYPE_STYLE[t] || { color: 'text-purple-400', bg: 'bg-purple-400/8', border: 'border-purple-400/20', icon: 'T' }
    return (
      <>
        <div className="board-sec-accent bg-purple-400/30" />
        <h3 className="board-section-title text-purple-300">Habilidades</h3>
        <div className="board-detail-list">
          {habs.map((h, i) => {
            const ts = getTypeStyle(h.tipo)
            return (
              <div key={`${h.nome}-${i}`} className={`board-ability-item ${ts.bg} ${ts.border}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`board-ability-badge ${ts.bg} ${ts.color} ${ts.border}`}>{ts.icon}</span>
                  <strong className={ts.color}>{h.nome || `${h.tipo || 'Hab.'} ${i + 1}`}</strong>
                  <span className="board-detail-tag">{h.tipo}</span>
                </div>
                {h.custoEnergia > 0 && <span className="board-text-dim text-xs">⚡ {h.custoEnergia} PE</span>}
                {h.dano && <span className="board-text-dim text-xs ml-2">⚔ {h.dano}</span>}
                {h.duracao && <span className="board-text-dim text-xs ml-2">⏱ {h.duracao}</span>}
                {(expanded || !(h.descricao)) ? (
                  h.descricao ? <p className="mt-1">{h.descricao}</p> : null
                ) : (
                  h.descricao ? <p className="mt-1">{h.descricao.length > 90 ? h.descricao.slice(0, 87) + '…' : h.descricao}</p> : null
                )}
                {expanded && h.status && (
                  <span className={`board-status-tag ${h.status === 'Aprovada' ? 'is-ok' : h.status === 'Pendente' ? 'is-warn' : 'is-err'}`}>{h.status}</span>
                )}
              </div>
            )
          })}
        </div>
      </>
    )
  }
  if (type === 'mystic') {
    return (
      <>
        <div className="board-sec-accent bg-rose-400/30" />
        <h3 className="board-section-title text-rose-300">Grimório</h3>
        {grimoirePages.length ? (
          <div className="board-detail-list">
            {grimoirePages.slice(0, expanded ? 50 : 8).map(p => (
              <div key={p.id} className="board-detail-item">
                <strong>{p.title}</strong>
                <span className="board-detail-tag">{p.subtitle}</span>
                {(expanded || (p.body && p.body.length < 80)) ? (
                  p.body ? <p>{p.body}</p> : null
                ) : (
                  p.body ? <p>{p.body.slice(0, 77)}…</p> : null
                )}
              </div>
            ))}
          </div>
        ) : <em className="board-text-dim">Nenhum registro místico.</em>}
      </>
    )
  }
  if (type === 'skills') {
    return (
      <>
        <div className="board-sec-accent bg-teal-400/30" />
        <h3 className="board-section-title text-teal-300">Perícias</h3>
        {pericias.length ? (
          <div className="board-skill-grid">
            {pericias.map(([n, g]) => {
              const d = PERICIAS.find(p => p.name === n)
              return (
                <div key={n} className="board-skill-item">
                  <strong>{d?.name || n}</strong>
                  <span className="board-skill-grade">{GRAU_NAMES[g] || g}</span>
                </div>
              )
            })}
          </div>
        ) : <em className="board-text-dim">Nenhuma perícia treinada.</em>}
      </>
    )
  }
  return (
    <>
      <div className="board-sec-accent bg-orange-400/30" />
      <h3 className="board-section-title text-orange-300">Triagens</h3>
      <div className="board-chip-grid">
        <span>Principal <strong>{getTriagemName(char, char.triagemPrincipal, char.classe)}</strong></span>
        <span>Nível <strong>{char.triagemPrincipalNivel || 0}</strong></span>
        <span>Sub <strong>{getTriagemName(char, char.subTriagem, char.subTriagemClass || char.classe)}</strong></span>
        <span>Nível <strong>{char.subTriagemNivel || 0}</strong></span>
      </div>
    </>
  )
}

export default function CharacterWorkspace({ char, update, onBack }) {
  const cards = char.boardCards || []
  const sections = char.boardSections || []
  const shapes = char.boardShapes || []
  const images = char.boardImages || []
  const savedVP = char.boardViewport

  const [viewport, setViewport] = useState(savedVP || { x: 200, y: 120, zoom: 1 })
  const [tool, setTool] = useState('select')
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [shapeDraft, setShapeDraft] = useState(null)
  const [showSecMenu, setShowSecMenu] = useState(false)
  const [expandedSections, setExpandedSections] = useState({})

  const canvasRef = useRef(null)
  const dragRef = useRef(null)
  const spaceRef = useRef(false)
  const vpRef = useRef(viewport)
  const dataRef = useRef({})
  const updateRef = useRef(update)
  const shapeDraftRef = useRef(null)

  vpRef.current = viewport
  dataRef.current = { cards, sections, shapes, images }
  updateRef.current = update

  const grimoirePages = useMemo(() => buildGrimoirePages(char), [char])

  useEffect(() => {
    const t = setTimeout(() => updateRef.current({ boardViewport: vpRef.current }), 600)
    return () => clearTimeout(t)
  }, [viewport])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = e => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const mx = e.clientX - r.left, my = e.clientY - r.top
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08
      setViewport(prev => {
        const nz = Math.max(0.08, Math.min(5, prev.zoom * factor))
        const s = nz / prev.zoom
        return { x: mx - (mx - prev.x) * s, y: my - (my - prev.y) * s, zoom: nz }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    function onKey(e) {
      const inInput = e.target.closest('input, textarea, [contenteditable]')
      if (inInput) return
      if (e.code === 'Space') { e.preventDefault(); spaceRef.current = true }
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedId) removeItem(selectedId)
      }
      if (e.code === 'Escape') { setSelectedId(null); setEditingId(null) }
      const km = { KeyV: 'select', KeyH: 'pan', KeyC: 'card', KeyT: 'text', KeyR: 'rect', KeyO: 'circle', KeyD: 'diamond', KeyG: 'triangle', KeyI: 'image' }
      if (km[e.code] && !e.ctrlKey && !e.metaKey) setTool(km[e.code])
    }
    function onKeyUp(e) { if (e.code === 'Space') spaceRef.current = false }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp) }
  }, [selectedId])

  useEffect(() => {
    function onMove(e) {
      const d = dragRef.current
      if (!d) return
      const r = canvasRef.current.getBoundingClientRect()
      const vp = vpRef.current
      if (d.type === 'pan') {
        setViewport(prev => ({ ...prev, x: d.vpX + e.clientX - d.cx, y: d.vpY + e.clientY - d.cy }))
      } else if (d.type === 'item') {
        const wx = (e.clientX - r.left - vp.x) / vp.zoom
        const wy = (e.clientY - r.top - vp.y) / vp.zoom
        const nx = Math.round(d.ox + wx - d.swx)
        const ny = Math.round(d.oy + wy - d.swy)
        moveItem(d.it, d.iid, { x: nx, y: ny })
      } else if (d.type === 'shape') {
        const wx = (e.clientX - r.left - vp.x) / vp.zoom
        const wy = (e.clientY - r.top - vp.y) / vp.zoom
        const sw = d.sw
        const draft = {
          type: d.st, x: Math.min(sw.x, wx), y: Math.min(sw.y, wy),
          width: Math.abs(wx - sw.x), height: Math.abs(wy - sw.y),
        }
        shapeDraftRef.current = draft
        setShapeDraft(draft)
      }
    }
    function onUp() {
      const d = dragRef.current
      if (!d) return
      if (d.type === 'shape' && shapeDraftRef.current) {
        const s = shapeDraftRef.current
        if (s.width > 12 && s.height > 12) addShape(s.type, s.x, s.y, s.width, s.height)
      }
      dragRef.current = null
      shapeDraftRef.current = null
      setShapeDraft(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [])

  function screenToWorld(cx, cy) {
    const r = canvasRef.current.getBoundingClientRect()
    const vp = vpRef.current
    return { x: (cx - r.left - vp.x) / vp.zoom, y: (cy - r.top - vp.y) / vp.zoom }
  }

  function handleCanvasPointerDown(e) {
    if (e.target.closest('[data-board-item]')) return
    if (showSecMenu) setShowSecMenu(false)
    const pos = screenToWorld(e.clientX, e.clientY)

    if (tool === 'pan' || e.button === 1 || (e.button === 0 && spaceRef.current)) {
      dragRef.current = { type: 'pan', cx: e.clientX, cy: e.clientY, vpX: viewport.x, vpY: viewport.y }
      return
    }
    if (['rect', 'circle', 'diamond', 'triangle'].includes(tool)) {
      dragRef.current = { type: 'shape', st: tool, sw: pos }
      return
    }
    if (tool === 'card') { addCard(pos); setTool('select'); return }
    if (tool === 'text') { addTextCard(pos); setTool('select'); return }
    if (tool === 'image') { pickImage(pos); setTool('select'); return }
    setSelectedId(null)
    setEditingId(null)
  }

  function handleItemPointerDown(e, itemType, itemId) {
    e.stopPropagation()
    if (tool === 'pan' || spaceRef.current) return
    if (e.button !== 0) return
    const pos = screenToWorld(e.clientX, e.clientY)
    const item = findItem(itemType, itemId)
    if (!item) return
    dragRef.current = { type: 'item', it: itemType, iid: itemId, swx: pos.x, swy: pos.y, ox: item.x, oy: item.y }
    setSelectedId(itemId)
  }

  function findItem(type, id) {
    const d = dataRef.current
    if (type === 'card') return d.cards.find(c => c.id === id)
    if (type === 'section') return d.sections.find(s => s.id === id)
    if (type === 'shape') return d.shapes.find(s => s.id === id)
    if (type === 'image') return d.images.find(i => i.id === id)
  }

  function moveItem(type, id, pos) {
    const d = dataRef.current
    if (type === 'card') update({ boardCards: d.cards.map(c => c.id === id ? { ...c, ...pos } : c) })
    else if (type === 'section') update({ boardSections: d.sections.map(s => s.id === id ? { ...s, ...pos } : s) })
    else if (type === 'shape') update({ boardShapes: d.shapes.map(s => s.id === id ? { ...s, ...pos } : s) })
    else if (type === 'image') update({ boardImages: d.images.map(i => i.id === id ? { ...i, ...pos } : i) })
  }

  function addCard(pos) {
    const next = [...dataRef.current.cards, {
      id: uid('card'), title: 'Novo Card', body: '', x: pos.x - 150, y: pos.y - 40,
      width: 300, fontSize: 14, textColor: '#e8e8f0', colorIdx: 0,
    }]
    const id = next[next.length - 1].id
    update({ boardCards: next })
    setSelectedId(id)
    setEditingId(id)
  }

  function addTextCard(pos) {
    const next = [...dataRef.current.cards, {
      id: uid('txt'), title: '', body: 'Texto...', x: pos.x - 80, y: pos.y - 20,
      width: 200, fontSize: 18, textColor: '#c9a84c', colorIdx: 0, isText: true,
    }]
    const id = next[next.length - 1].id
    update({ boardCards: next })
    setSelectedId(id)
    setEditingId(id)
  }

  function addShape(type, x, y, w, h) {
    const ci = dataRef.current.shapes.length % SHAPE_FILLS.length
    const next = [...dataRef.current.shapes, {
      id: uid('shp'), type, x, y, width: w, height: h,
      fill: SHAPE_FILLS[ci], border: SHAPE_BORDERS[ci], label: '', rotation: 0,
    }]
    const id = next[next.length - 1].id
    update({ boardShapes: next })
    setSelectedId(id)
  }

  function addSection(type) {
    const cnt = dataRef.current.sections.filter(s => s.type === type).length
    const next = [...dataRef.current.sections, {
      id: uid('sec'), type, title: SECTIONS.find(s => s.type === type)?.title || 'Seção',
      x: 120 + cnt * 30, y: 120 + cnt * 30, width: type === 'mystic' ? 400 : 340,
    }]
    update({ boardSections: next })
    setShowSecMenu(false)
  }

  async function pickImage(pos) {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = async ev => {
      const file = ev.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async rev => {
        const src = await resizeImageSrc(rev.target.result)
        const img = new Image()
        img.onload = () => {
          const maxW = 350, ratio = img.naturalWidth / img.naturalHeight
          const w = Math.min(maxW, img.naturalWidth), h = w / ratio
          const next = [...dataRef.current.images, {
            id: uid('img'), src, x: pos.x - w / 2, y: pos.y - h / 2, width: w, height: h, caption: '',
          }]
          update({ boardImages: next })
          setSelectedId(next[next.length - 1].id)
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  function updateCard(id, patch) {
    update({ boardCards: dataRef.current.cards.map(c => c.id === id ? { ...c, ...patch } : c) })
  }

  function updateShape(id, patch) {
    update({ boardShapes: dataRef.current.shapes.map(s => s.id === id ? { ...s, ...patch } : s) })
  }

  function updateImage(id, patch) {
    update({ boardImages: dataRef.current.images.map(i => i.id === id ? { ...i, ...patch } : i) })
  }

  function removeItem(id) {
    const d = dataRef.current
    if (d.cards.find(c => c.id === id)) update({ boardCards: d.cards.filter(c => c.id !== id) })
    else if (d.sections.find(s => s.id === id)) update({ boardSections: d.sections.filter(s => s.id !== id) })
    else if (d.shapes.find(s => s.id === id)) update({ boardShapes: d.shapes.filter(s => s.id !== id) })
    else if (d.images.find(i => i.id === id)) update({ boardImages: d.images.filter(i => i.id !== id) })
    setSelectedId(null)
    setEditingId(null)
  }

  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return cards.find(c => c.id === selectedId) ||
      sections.find(s => s.id === selectedId) ||
      shapes.find(s => s.id === selectedId) ||
      images.find(i => i.id === selectedId) || null
  }, [selectedId, cards, sections, shapes, images])

  const selectedType = useMemo(() => {
    if (!selectedId) return null
    if (cards.find(c => c.id === selectedId)) return 'card'
    if (sections.find(s => s.id === selectedId)) return 'section'
    if (shapes.find(s => s.id === selectedId)) return 'shape'
    if (images.find(i => i.id === selectedId)) return 'image'
    return null
  }, [selectedId, cards, sections, shapes, images])

  function fitToContent() {
    const all = [
      ...cards.map(c => ({ x: c.x, y: c.y, w: c.width || 300, h: 200 })),
      ...sections.map(s => ({ x: s.x, y: s.y, w: s.width || 340, h: 200 })),
      ...shapes.map(s => ({ x: s.x, y: s.y, w: s.width, h: s.height })),
      ...images.map(i => ({ x: i.x, y: i.y, w: i.width, h: i.height })),
    ]
    if (!all.length) return
    const minX = Math.min(...all.map(i => i.x)), minY = Math.min(...all.map(i => i.y))
    const maxX = Math.max(...all.map(i => i.x + i.w)), maxY = Math.max(...all.map(i => i.y + i.h))
    const r = canvasRef.current.getBoundingClientRect()
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
    const zx = r.width / (maxX - minX + 200), zy = r.height / (maxY - minY + 200)
    const nz = Math.max(0.15, Math.min(1.5, Math.min(zx, zy)))
    setViewport({ x: r.width / 2 - cx * nz, y: r.height / 2 - cy * nz, zoom: nz })
  }

  const isEmpty = !cards.length && !sections.length && !shapes.length && !images.length

  const cursorClass = tool === 'pan' || spaceRef.current ? 'cursor-grab'
    : ['rect', 'circle', 'diamond', 'triangle'].includes(tool) ? 'cursor-crosshair'
    : tool === 'card' || tool === 'text' ? 'cursor-cell'
    : tool === 'image' ? 'cursor-cell'
    : 'cursor-default'

  return (
    <div className="board-fullscreen">
      <div className="board-top-bar">
        <div className="board-top-left">
          <button onClick={onBack} className="board-back-btn">← Ficha</button>
          <span className="board-title font-cinzel">Quadro Infinito</span>
        </div>
        <div className="board-tools">
          {TOOLS.map(t => (
            <button key={t.id}
              onClick={() => setTool(t.id)}
              className={`board-tool-btn ${tool === t.id ? 'is-active' : ''}`}
              title={`${t.label} (${t.key})`}
            >
              <span className="board-tool-icon">{t.icon}</span>
              <span className="board-tool-label">{t.label}</span>
            </button>
          ))}
          <div className="board-tool-divider" />
            <button onClick={() => setShowSecMenu(true)} className="board-tool-btn"
              style={{ borderColor: 'rgba(196,144,62,0.4)', background: 'rgba(196,144,62,0.08)' }}>
              <span className="board-tool-icon">+</span>
              <span className="board-tool-label">Adicionar Seção</span>
            </button>
        </div>
        <div className="board-top-right">
          <button onClick={() => setViewport(v => ({ ...v, zoom: Math.max(0.08, v.zoom / 1.2) }))} className="board-zoom-btn">−</button>
          <span className="board-zoom-label">{Math.round(viewport.zoom * 100)}%</span>
          <button onClick={() => setViewport(v => ({ ...v, zoom: Math.min(5, v.zoom * 1.2) }))} className="board-zoom-btn">+</button>
          <button onClick={fitToContent} className="board-zoom-btn" title="Encaixar conteúdo">⊡</button>
        </div>
      </div>

      <div ref={canvasRef}
        className={`board-canvas ${cursorClass}`}
        onPointerDown={handleCanvasPointerDown}
      >
        <div className="board-transform" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0' }}>
          <div className="board-grid" />
          {isEmpty && (
            <div className="board-empty-hint" style={{ left: 200, top: 160 }}>
              <h3 className="font-cinzel text-gold text-xl mb-2">Quadro Infinito</h3>
              <p className="text-txt-dim text-sm mb-3">Organize as informações do seu personagem livremente.</p>
              <div className="text-txt-dim/50 text-xs space-y-1">
                <p> Arraste com botão do meio ou segure <kbd>Space</kbd> + arraste para mover a tela</p>
                <p> Scroll para zoom • Atalhos: V S H C T R O D G I</p>
                <p> Use as ferramentas acima para criar cards, formas, textos e adicionar imagens</p>
                <p> <kbd>Delete</kbd> para remover o item selecionado</p>
              </div>
            </div>
          )}

          {shapes.map(shape => {
            const sel = selectedId === shape.id
            const isTriangle = shape.type === 'triangle'
            const isCircle = shape.type === 'circle'
            const isDiamond = shape.type === 'diamond'
            return (
              <div key={shape.id} data-board-item="1"
                className={`board-shape-el ${sel ? 'is-selected' : ''}`}
                style={{
                  position: 'absolute', left: shape.x, top: shape.y,
                  width: shape.width, height: shape.height,
                  backgroundColor: shape.fill,
                  border: `2px solid ${shape.border}`,
                  borderRadius: isCircle ? '50%' : undefined,
                  transform: isDiamond ? `rotate(45deg)` : `rotate(${shape.rotation || 0}deg)`,
                  clipPath: isTriangle ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
                  borderWidth: isTriangle ? 0 : 2,
                }}
                onPointerDown={e => handleItemPointerDown(e, 'shape', shape.id)}
              >
                {shape.label && !isTriangle && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#e8e8f0', fontSize: '0.85rem',
                    fontWeight: 600, textAlign: 'center', padding: '0.5rem',
                    transform: isDiamond ? 'rotate(-45deg)' : undefined,
                  }}>{shape.label}</div>
                )}
              </div>
            )
          })}

          {images.map(img => {
            const sel = selectedId === img.id
            return (
              <div key={img.id} data-board-item="1"
                className={`board-image-el ${sel ? 'is-selected' : ''}`}
                style={{ position: 'absolute', left: img.x, top: img.y, width: img.width, height: img.height }}
                onPointerDown={e => handleItemPointerDown(e, 'image', img.id)}
              >
                <img src={img.src} alt="" draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px', pointerEvents: 'none' }} />
                {img.caption && <span className="board-img-caption">{img.caption}</span>}
              </div>
            )
          })}

          {sections.map(sec => {
            const sel = selectedId === sec.id
            const isExp = !!expandedSections[sec.id]
            return (
              <div key={sec.id} data-board-item="1"
                className={`board-section-el ${sel ? 'is-selected' : ''} ${isExp ? 'is-expanded' : ''}`}
                style={{ position: 'absolute', left: sec.x, top: sec.y, width: isExp ? 520 : (sec.width || 340) }}
                onPointerDown={e => handleItemPointerDown(e, 'section', sec.id)}
              >
                <div className="board-sec-header">
                  <div className="board-card-label">{sec.title}</div>
                  <button className="board-expand-btn"
                    onPointerDown={e => e.stopPropagation()}
                    onClick={() => setExpandedSections(v => ({ ...v, [sec.id]: !v[sec.id] }))}>
                    {isExp ? 'Recolher' : 'Expandir'}
                  </button>
                </div>
                <SectionBody type={sec.type} char={char} grimoirePages={grimoirePages} expanded={isExp} />
              </div>
            )
          })}

          {cards.map(card => {
            const sel = selectedId === card.id
            const isEditing = editingId === card.id
            const colors = CARD_COLORS[card.colorIdx || 0]
            return (
              <div key={card.id} data-board-item="1"
                className={`board-custom-card ${sel ? 'is-selected' : ''} ${card.isText ? 'is-text-card' : ''}`}
                style={{
                  position: 'absolute', left: card.x, top: card.y, width: card.width || 300,
                  backgroundColor: colors.bg, borderColor: colors.border,
                }}
                onPointerDown={e => handleItemPointerDown(e, 'card', card.id)}
                onDoubleClick={() => { setEditingId(card.id); setSelectedId(card.id) }}
              >
                {isEditing ? (
                  <div className="board-card-edit" onClick={e => e.stopPropagation()}>
                    <input value={card.title} placeholder="Título..."
                      onChange={e => updateCard(card.id, { title: e.target.value })}
                      className="board-input board-input-title"
                      style={{ color: card.textColor || '#e8e8f0', fontSize: (card.fontSize || 14) + 'px' }} />
                    <textarea value={card.body} placeholder="Conteúdo..."
                      onChange={e => updateCard(card.id, { body: e.target.value })}
                      className="board-input board-input-body"
                      style={{ color: card.textColor || '#e8e8f0', fontSize: (card.fontSize || 14) + 'px' }} />
                    <button onClick={() => setEditingId(null)} className="board-mini-btn is-primary">Concluir</button>
                  </div>
                ) : (
                  <>
                    {card.title && <h3 className="board-card-title" style={{ color: colors.header, fontSize: card.isText ? (card.fontSize || 18) + 'px' : undefined }}>{card.title}</h3>}
                    {card.body && <p className="board-card-body" style={{ color: card.textColor || '#e8e8f0', fontSize: (card.fontSize || 14) + 'px' }}>{card.body}</p>}
                  </>
                )}
              </div>
            )
          })}

          {shapeDraft && shapeDraft.width > 2 && shapeDraft.height > 2 && (
            <div className="board-shape-draft"
              style={{
                position: 'absolute', left: shapeDraft.x, top: shapeDraft.y,
                width: shapeDraft.width, height: shapeDraft.height,
                borderRadius: shapeDraft.type === 'circle' ? '50%' : undefined,
                transform: shapeDraft.type === 'diamond' ? 'rotate(45deg)' : undefined,
                clipPath: shapeDraft.type === 'triangle' ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : undefined,
              }}
            />
          )}
        </div>
      </div>

      {showSecMenu && (
        <div className="board-sec-modal-bg" onClick={() => setShowSecMenu(false)}>
          <div className="board-sec-modal" onClick={e => e.stopPropagation()}>
            <div className="board-sec-modal-header">
              <h3 className="font-cinzel text-gold text-lg">Adicionar Seção ao Quadro</h3>
              <button onClick={() => setShowSecMenu(false)} className="board-sec-modal-close">✕</button>
            </div>
            <p className="board-sec-modal-desc">Selecione uma seção da ficha para fixar no quadro. O conteúdo é gerado automaticamente.</p>
            <div className="board-sec-modal-grid">
              {SECTIONS.map(s => (
                <button key={s.type} onClick={() => addSection(s.type)} className="board-sec-modal-card">
                  <span className="board-sec-modal-icon">{s.icon}</span>
                  <strong className="board-sec-modal-title">{s.title}</strong>
                  <small className="board-sec-modal-desc-inner">{s.desc}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="board-props-panel">
          <div className="board-props-header">
            <span className="font-cinzel text-gold text-sm">Propriedades</span>
            <button onClick={() => { setSelectedId(null); setEditingId(null) }} className="board-props-close">✕</button>
          </div>

          {selectedType === 'card' && (
            <div className="board-props-body">
              <div className="board-props-row">
                <label>Cor do Card</label>
                <div className="board-color-row">
                  {CARD_COLORS.map((c, i) => (
                    <button key={i} onClick={() => updateCard(selectedId, { colorIdx: i })}
                      className={`board-color-swatch ${((selectedItem).colorIdx || 0) === i ? 'is-active' : ''}`}
                      style={{ background: c.border }} title={c.name} />
                  ))}
                </div>
              </div>
              <div className="board-props-row">
                <label>Cor do Texto</label>
                <div className="board-color-row">
                  {TEXT_COLORS.map((c, i) => (
                    <button key={i} onClick={() => updateCard(selectedId, { textColor: c })}
                      className={`board-color-swatch ${(selectedItem).textColor === c ? 'is-active' : ''}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div className="board-props-row">
                <label>Tamanho da Fonte</label>
                <div className="board-size-row">
                  {FONT_SIZES.map(s => (
                    <button key={s} onClick={() => updateCard(selectedId, { fontSize: s })}
                      className={`board-size-btn ${(selectedItem).fontSize === s ? 'is-active' : ''}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="board-props-row">
                <label>Largura</label>
                <input type="range" min={150} max={600} value={(selectedItem).width || 300}
                  onChange={e => updateCard(selectedId, { width: +e.target.value })}
                  className="board-range" />
                <span className="board-range-label">{(selectedItem).width || 300}px</span>
              </div>
              <div className="board-props-row">
                <button onClick={() => { setEditingId(editingId === selectedId ? null : selectedId) }}
                  className="board-props-action">
                  {editingId === selectedId ? 'Concluir Edição' : 'Editar Conteúdo'}
                </button>
              </div>
              <div className="board-props-row">
                <button onClick={() => removeItem(selectedId)} className="board-props-delete">Remover</button>
              </div>
            </div>
          )}

          {selectedType === 'shape' && (
            <div className="board-props-body">
              <div className="board-props-row">
                <label>Cor de Preenchimento</label>
                <div className="board-color-row">
                  {SHAPE_FILLS.map((c, i) => (
                    <button key={i} onClick={() => updateShape(selectedId, { fill: c, border: SHAPE_BORDERS[i] })}
                      className={`board-color-swatch ${(selectedItem).fill === c ? 'is-active' : ''}`}
                      style={{ background: SHAPE_BORDERS[i] }} />
                  ))}
                </div>
              </div>
              <div className="board-props-row">
                <label>Rótulo</label>
                <input value={(selectedItem).label || ''} placeholder="Texto dentro da forma..."
                  onChange={e => updateShape(selectedId, { label: e.target.value })}
                  className="board-props-input" />
              </div>
              <div className="board-props-row">
                <label>Rotação</label>
                <input type="range" min={0} max={360} value={(selectedItem).rotation || 0}
                  onChange={e => updateShape(selectedId, { rotation: +e.target.value })}
                  className="board-range" />
                <span className="board-range-label">{(selectedItem).rotation || 0}°</span>
              </div>
              <div className="board-props-row">
                <button onClick={() => removeItem(selectedId)} className="board-props-delete">Remover</button>
              </div>
            </div>
          )}

          {selectedType === 'image' && (
            <div className="board-props-body">
              <div className="board-props-row">
                <label>Legenda</label>
                <input value={(selectedItem).caption || ''} placeholder="Legenda da imagem..."
                  onChange={e => updateImage(selectedId, { caption: e.target.value })}
                  className="board-props-input" />
              </div>
              <div className="board-props-row">
                <label>Largura</label>
                <input type="range" min={100} max={800} value={(selectedItem).width || 350}
                  onChange={e => {
                    const img = selectedItem
                    const ratio = (img.height || 250) / (img.width || 350)
                    updateImage(selectedId, { width: +e.target.value, height: Math.round(+e.target.value * ratio) })
                  }}
                  className="board-range" />
                <span className="board-range-label">{Math.round((selectedItem).width || 350)}px</span>
              </div>
              <div className="board-props-row">
                <button onClick={() => removeItem(selectedId)} className="board-props-delete">Remover</button>
              </div>
            </div>
          )}

          {selectedType === 'section' && (
            <div className="board-props-body">
              <p className="text-txt-dim text-xs mb-3">Seção da ficha — conteúdo é gerado automaticamente dos dados do personagem.</p>
              <div className="board-props-row">
                <button onClick={() => removeItem(selectedId)} className="board-props-delete">Remover do Quadro</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="board-hint-bar">
        <span>Scroll = zoom</span>
        <span>Space + arraste = mover</span>
        <span>Del = remover</span>
        <span>2x clique = editar card</span>
      </div>
    </div>
  )
}
