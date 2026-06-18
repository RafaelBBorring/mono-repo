import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getBoard, saveBoard, listCharacters, saveCharacter } from '../../lib/db.js'
import { LEVEL_BY_KEY } from '../../data/startingLevels.js'
import { ATTRIBUTES } from '../../data/attributes.js'
import { maxResources } from '../../lib/calculator.js'
import { useHashRoute } from '../../hooks/useHashRoute.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import Modal from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { uid } from '../../lib/id.js'
import { LEVEL_COLORS } from '../sheet/CharacterSheet.jsx'

const NOTE_COLORS = ['#e0ad33', '#f2661b', '#2ecc71', '#3498db', '#9b59b6', '#c0392b', '#16a085', '#7f8c8d']
const DB_SAVE_DELAY = 700
const MIN_W = 120, MIN_H = 90

export default function BoardView({ id }) {
  const { navigate } = useHashRoute()
  const toast = useToast()
  const [board, setBoard] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [chars, setChars] = useState([])
  const [selected, setSelected] = useState(null)
  const [showGallery, setShowGallery] = useState(false)
  const [gallerySearch, setGallerySearch] = useState('')
  const [detail, setDetail] = useState(null)

  const viewportRef = useRef(null)
  const drag = useRef(null)
  const saveTimer = useRef(null)
  const clipboard = useRef(null)

  useEffect(() => {
    let alive = true
    Promise.all([getBoard(id), listCharacters()]).then(([b, c]) => {
      if (!alive) return
      setBoard(b || { id, name: 'Quadro', nodes: [], view: { x: 0, y: 0, scale: 1 } })
      setChars(c); setLoaded(true)
    })
    return () => { alive = false }
  }, [id])

  const persist = useCallback((b) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveBoard(b), DB_SAVE_DELAY)
  }, [])
  const update = useCallback((updater) => {
    setBoard(prev => { const next = updater(prev); persist(next); return next })
  }, [persist])

  const charMap = useMemo(() => Object.fromEntries(chars.map(c => [c.id, c])), [chars])

  const centerWorld = () => {
    const vp = viewportRef.current, v = board.view
    return { cx: (-v.x + vp.clientWidth / 2) / v.scale, cy: (-v.y + vp.clientHeight / 2) / v.scale }
  }
  const addNode = (partial) => {
    const { cx, cy } = centerWorld()
    const node = { id: uid('nd'), x: cx - 100, y: cy - 70, w: 200, ...partial }
    update(prev => ({ ...prev, nodes: [...prev.nodes, node] }))
    setSelected(node.id)
  }
  const removeNode = (nid) => update(prev => ({ ...prev, nodes: prev.nodes.filter(n => n.id !== nid) }))
  const patchNode = (nid, patch) => update(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === nid ? { ...n, ...patch } : n) }))

  const setCharResource = (cid, key, value) => {
    setChars(prev => {
      const next = prev.map(c => c.id === cid ? { ...c, resources: { ...c.resources, [key]: value } } : c)
      const c = next.find(x => x.id === cid); if (c) saveCharacter(c)
      return next
    })
  }

  const zoomBy = (f) => {
    const vp = viewportRef.current; if (!vp) return
    const cx = vp.clientWidth / 2, cy = vp.clientHeight / 2
    update(prev => {
      const v = prev.view
      const scale = Math.min(3, Math.max(0.15, v.scale * f))
      const wx = (cx - v.x) / v.scale, wy = (cy - v.y) / v.scale
      return { ...prev, view: { x: cx - wx * scale, y: cy - wy * scale, scale } }
    })
  }
  const fit = () => {
    if (!board.nodes.length) { update(prev => ({ ...prev, view: { x: 0, y: 0, scale: 1 } })); return }
    const xs = board.nodes.flatMap(n => [n.x, n.x + n.w]), ys = board.nodes.flatMap(n => [n.y, n.y + n.h])
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
    const pad = 120, vp = viewportRef.current
    const scale = Math.min(2.5, Math.max(0.15, Math.min((vp.clientWidth - pad * 2) / Math.max(1, maxX - minX), (vp.clientHeight - pad * 2) / Math.max(1, maxY - minY))))
    const x = -minX * scale + (vp.clientWidth - (maxX - minX) * scale) / 2
    const y = -minY * scale + (vp.clientHeight - (maxY - minY) * scale) / 2
    update(prev => ({ ...prev, view: { x, y, scale } }))
  }

  // ---------- Native wheel zoom (passive:false) ----------
  useEffect(() => {
    const vp = viewportRef.current; if (!vp) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = vp.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      setBoard(prev => {
        const v = prev.view
        const scale = Math.min(3, Math.max(0.15, v.scale * (1 + -e.deltaY * 0.0015)))
        const wx = (mx - v.x) / v.scale, wy = (my - v.y) / v.scale
        const next = { ...prev, view: { x: mx - wx * scale, y: my - wy * scale, scale } }
        persist(next); return next
      })
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [persist, loaded])

  // ---------- Pointer: right-drag = pan smooth ----------
  const startPan = (e) => {
    const vp = viewportRef.current
    try { vp.setPointerCapture(e.pointerId) } catch {}
    drag.current = { mode: 'pan', pid: e.pointerId, sx: e.clientX, sy: e.clientY, vx: board.view.x, vy: board.view.y }
  }
  const startNodeDrag = (e, node) => {
    const vp = viewportRef.current
    try { vp.setPointerCapture(e.pointerId) } catch {}
    setSelected(node.id)
    drag.current = { mode: 'node', id: node.id, sx: e.clientX, sy: e.clientY, nx: node.x, ny: node.y }
  }
  const startResize = (e, node, corner) => {
    const vp = viewportRef.current
    try { vp.setPointerCapture(e.pointerId) } catch {}
    setSelected(node.id)
    drag.current = { mode: 'resize', id: node.id, corner, x: node.x, y: node.y, w: node.w, h: node.h, sx: e.clientX, sy: e.clientY }
  }

  const onViewportPointerDown = (e) => {
    if (e.button === 2) { startPan(e); return }                 // right = pan
    if (e.button === 0) { setSelected(null) }                   // left on empty = deselect
  }
  const onPointerMove = (e) => {
    const d = drag.current; if (!d) return
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy
    const s = board.view.scale
    if (d.mode === 'pan') {
      // smooth pan: direct follow
      setBoard(prev => ({ ...prev, view: { ...prev.view, x: d.vx + dx, y: d.vy + dy } }))
    } else if (d.mode === 'node') {
      update(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === d.id ? { ...n, x: d.nx + dx / s, y: d.ny + dy / s } : n) }))
    } else if (d.mode === 'resize') {
      const ddx = dx / s, ddy = dy / s
      update(prev => ({ ...prev, nodes: prev.nodes.map(n => {
        if (n.id !== d.id) return n
        let { x, y, w, h } = n
        if (d.corner.includes('e')) w = Math.max(MIN_W, d.w + ddx)
        if (d.corner.includes('s')) h = Math.max(MIN_H, d.h + ddy)
        if (d.corner.includes('w')) { const nw = Math.max(MIN_W, d.w - ddx); x = d.x + (d.w - nw); w = nw }
        if (d.corner.includes('n')) { const nh = Math.max(MIN_H, d.h - ddy); y = d.y + (d.h - nh); h = nh }
        return { ...n, x, y, w, h }
      }) }))
    }
  }
  const endDrag = (e) => {
    if (drag.current) { try { viewportRef.current?.releasePointerCapture(e.pointerId) } catch {} }
    drag.current = null
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && k === 'c' && selected) clipboard.current = JSON.parse(JSON.stringify(board.nodes.find(n => n.id === selected) || null))
      else if ((e.ctrlKey || e.metaKey) && k === 'v' && clipboard.current) { const c = { ...clipboard.current, id: uid('nd'), x: clipboard.current.x + 30, y: clipboard.current.y + 30 }; update(prev => ({ ...prev, nodes: [...prev.nodes, c] })); setSelected(c.id) }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) removeNode(selected)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, board, update])

  if (!loaded) return <div className="d-flex align-items-center justify-content-center" style={{ height: '100vh' }}><div className="spinner-border text-gold" /></div>

  const v = board.view
  const dot = 26 * v.scale
  const filteredGallery = chars.filter(c => !gallerySearch.trim() || (c.name || '').toLowerCase().includes(gallerySearch.toLowerCase()))
  const bgStyle = {
    backgroundColor: '#070505',
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.16) 1.3px, transparent 1.4px)',
    backgroundSize: `${dot}px ${dot}px`,
    backgroundPosition: `${v.x}px ${v.y}px`
  }

  return (
    <div className="position-fixed" style={{ inset: 0, zIndex: 2000, background: '#070505', display: 'flex', flexDirection: 'column' }}>
      {/* ===== Minimal navbar ===== */}
      <div className="d-flex align-items-center justify-content-between px-3 py-2" style={{ borderBottom: '1px solid rgba(224,173,51,0.14)', background: 'rgba(7,5,5,0.9)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <div className="d-flex align-items-center gap-2">
          <span style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#f6d98c,#c8921b 50%,#543c0a)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(224,173,51,0.35)' }}>
            <i className="bi bi-dragon-fill" style={{ color: '#1a1408', fontSize: '1.1rem' }} />
          </span>
          <input className="font-display" value={board.name} onChange={(e) => update(b => ({ ...b, name: e.target.value }))} title="Nome do quadro"
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--drako-gold-soft)', fontSize: '1.05rem', width: 200 }} />
        </div>
        <div className="d-flex align-items-center gap-2">
          <span className="font-mono text-muted-drako d-none d-md-inline" style={{ fontSize: '0.74rem' }}>{Math.round(v.scale * 100)}%</span>
          <Button onClick={() => setShowGallery(true)}><i className="bi bi-person-plus-fill me-2" />Adicionar ficha</Button>
          <button className="btn-ghost d-flex align-items-center gap-1" onClick={() => navigate('quadros')} title="Sair do quadro"><i className="bi bi-box-arrow-right" /><span className="d-none d-sm-inline">Sair</span></button>
        </div>
      </div>

      {/* ===== Stage ===== */}
      <div className="position-relative flex-grow-1" style={{ overflow: 'hidden' }}>
        {/* Left circular tools */}
        <div className="position-absolute d-flex flex-column align-items-center gap-2" style={{ left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
          <CircleTool icon="bi-sticky-fill" title="Nota" onClick={() => addNode({ kind: 'note', text: '', color: '#e0ad33', w: 200, h: 150 })} />
          <CircleTool icon="bi-square" title="Forma" onClick={() => addNode({ kind: 'shape', shape: 'rect', color: '#e0ad33', w: 170, h: 120 })} />
          <div style={{ height: 1, width: 28, background: 'rgba(224,173,51,0.25)', margin: '4px 0' }} />
          <CircleTool icon="bi-zoom-in" title="Zoom +" onClick={() => zoomBy(1.2)} />
          <CircleTool icon="bi-zoom-out" title="Zoom -" onClick={() => zoomBy(1 / 1.2)} />
          <CircleTool icon="bi-arrows-fullscreen" title="Ajustar à tela" onClick={fit} />
          {selected && <div style={{ height: 1, width: 28, background: 'rgba(224,173,51,0.25)', margin: '4px 0' }} />}
          {selected && <CircleTool danger icon="bi-trash" title="Excluir selecionado" onClick={() => removeNode(selected)} />}
        </div>

        {/* Controls hint */}
        <div className="position-absolute" style={{ bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 5, color: 'rgba(255,255,255,0.35)', fontSize: '0.76rem', textAlign: 'center', pointerEvents: 'none' }}>
          <span className="kbd">botão direito</span> navegar · <span className="kbd">esquerdo</span> manipular · <span className="kbd">scroll</span> zoom · <span className="kbd">Ctrl+C/V</span> duplicar
        </div>

        <div
          ref={viewportRef}
          className="position-absolute no-select"
          style={{ inset: 0, touchAction: 'none', userSelect: 'none', cursor: 'default', ...bgStyle }}
          data-canvasbg="1"
          onPointerDown={onViewportPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="position-absolute" style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.scale})`, transformOrigin: '0 0', width: 1, height: 1 }}>
            {board.nodes.map(node => {
              const sel = selected === node.id
              if (node.kind === 'note') return <Node key={node.id} node={node} sel={sel} startDrag={startNodeDrag} startResize={startResize} remove={removeNode}><NoteBody node={node} patch={patchNode} /></Node>
              if (node.kind === 'shape') return <Node key={node.id} node={node} sel={sel} startDrag={startNodeDrag} startResize={startResize} remove={removeNode}><ShapeBody node={node} patch={patchNode} /></Node>
              if (node.kind === 'character') {
                const c = charMap[node.characterId]
                return <Node key={node.id} node={node} sel={sel} startDrag={startNodeDrag} startResize={startResize} remove={removeNode}><CharacterBody node={node} character={c} patch={patchNode} setResource={setCharResource} onOpen={() => setDetail(c?.id)} /></Node>
              }
              return null
            })}
          </div>

          {board.nodes.length === 0 && (
            <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ pointerEvents: 'none' }}>
              <i className="bi bi-grid-3x3-gap text-gold" style={{ fontSize: '2.6rem', opacity: 0.5 }} />
              <p className="mt-2" style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.4)' }}>Quadro vazio.<br />Clique em <b className="text-gold">Adicionar ficha</b> no topo.</p>
            </div>
          )}
        </div>
      </div>

      <Modal open={showGallery} onClose={() => setShowGallery(false)} title="Adicionar fichas ao quadro" size="lg"
        footer={<Button variant="ghost" onClick={() => setShowGallery(false)}>Concluir</Button>}>
        <div className="input-group mb-3">
          <span className="input-group-text" style={{ background: 'transparent', border: 'none', color: 'var(--drako-muted)' }}><i className="bi bi-search" /></span>
          <input className="form-control" style={{ background: 'transparent', border: 'none', color: 'var(--drako-text)' }} placeholder="Buscar personagem..." value={gallerySearch} onChange={(e) => setGallerySearch(e.target.value)} />
        </div>
        {chars.length === 0 ? <p className="text-muted-drako text-center py-3">Nenhuma ficha na biblioteca ainda.</p> : (
          <div className="row g-2" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
            {filteredGallery.map(c => {
              const lvl = LEVEL_BY_KEY[c.level]; const color = LEVEL_COLORS[c.level] || '#e0ad33'
              return (
                <div className="col-sm-6 col-md-4" key={c.id}>
                  <button className="glass glass-hover p-2 w-100 text-start d-flex align-items-center gap-2" onClick={() => { addNode({ kind: 'character', characterId: c.id, w: 230, h: 250, expanded: false }) }}>
                    <MiniPortrait c={c} size={42} color={color} />
                    <div className="min-w-0">
                      <div className="font-display gold-text" style={{ fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || 'Sem Nome'}</div>
                      <div className="text-muted-drako" style={{ fontSize: '0.72rem' }}>{lvl?.name}</div>
                    </div>
                    <i className="bi bi-plus-lg text-gold ms-auto" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      <DetailDrawer characterId={detail} chars={chars} onClose={() => setDetail(null)} onOpen={() => { if (detail) navigate(`ficha/${detail}`) }} />
    </div>
  )
}

function CircleTool({ icon, title, onClick, danger }) {
  return (
    <button title={title} onClick={onClick}
      style={{ width: 46, height: 46, borderRadius: 999, border: `1px solid ${danger ? 'rgba(231,76,60,0.5)' : 'rgba(224,173,51,0.35)'}`, background: 'rgba(12,9,7,0.85)', color: danger ? '#ff8a7a' : 'var(--drako-gold-soft)', cursor: 'pointer', fontSize: '1.1rem', boxShadow: '0 6px 18px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .2s, border-color .2s' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.borderColor = danger ? 'rgba(231,76,60,0.9)' : 'rgba(224,173,51,0.7)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = danger ? 'rgba(231,76,60,0.5)' : 'rgba(224,173,51,0.35)' }}>
      <i className={`bi ${icon}`} />
    </button>
  )
}

const RESIZE_CORNERS = [
  { c: 'nw', style: { left: -6, top: -6, cursor: 'nwse-resize' } },
  { c: 'ne', style: { right: -6, top: -6, cursor: 'nesw-resize' } },
  { c: 'sw', style: { left: -6, bottom: -6, cursor: 'nesw-resize' } },
  { c: 'se', style: { right: -6, bottom: -6, cursor: 'nwse-resize' } }
]

function Node({ node, sel, startDrag, startResize, remove, children }) {
  const onDown = (e) => {
    if (e.button !== 0) return
    if (e.target.closest('button, input, textarea, select')) return   // left manipulates elements
    e.stopPropagation()
    startDrag(e, node)
  }
  return (
    <div onPointerDown={onDown} className="glass position-absolute" style={{ left: node.x, top: node.y, width: node.w, minHeight: node.h, border: sel ? '1px solid rgba(224,173,51,0.85)' : '1px solid rgba(224,173,51,0.16)', boxShadow: sel ? '0 0 0 1px rgba(224,173,51,0.3), 0 0 28px rgba(224,173,51,0.18)' : '0 12px 40px -16px rgba(0,0,0,0.8)', cursor: 'grab' }}>
      <div className="d-flex align-items-center justify-content-between px-1" style={{ height: 24 }}>
        <i className="bi bi-grip-horizontal text-muted-drako" style={{ fontSize: '0.85rem' }} />
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(node.id)} className="btn-ghost" style={{ width: 22, height: 22, padding: 0, fontSize: '0.7rem' }}><i className="bi bi-x" /></button>
      </div>
      <div className="px-2 pb-2">{children}</div>
      {sel && RESIZE_CORNERS.map(({ c, style }) => (
        <div key={c} data-resize="1" onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); startResize(e, node, c) }} style={{ position: 'absolute', width: 14, height: 14, borderRadius: 3, background: '#f6d98c', border: '1px solid #1a1408', ...style }} />
      ))}
    </div>
  )
}

function NoteBody({ node, patch }) {
  return (
    <div style={{ background: `linear-gradient(180deg, ${node.color}22, rgba(19,16,12,0.92))`, borderRadius: 10, padding: 8 }}>
      <div className="d-flex align-items-center gap-1 mb-1">
        {NOTE_COLORS.map(col => <button key={col} onPointerDown={(e) => e.stopPropagation()} onClick={() => patch(node.id, { color: col })} style={{ width: 14, height: 14, borderRadius: 4, background: col, border: node.color === col ? '2px solid #fff8e6' : '2px solid transparent', cursor: 'pointer' }} />)}
      </div>
      <textarea value={node.text} onChange={(e) => patch(node.id, { text: e.target.value })} onPointerDown={(e) => e.stopPropagation()} placeholder="Anotação..."
        style={{ width: '100%', minHeight: 70, background: 'transparent', border: 'none', color: 'var(--drako-text)', resize: 'none', outline: 'none', fontFamily: 'Lexend', fontSize: '0.92rem' }} />
    </div>
  )
}

function ShapeBody({ node, patch }) {
  return (
    <div onPointerDown={(e) => e.stopPropagation()} onClick={() => patch(node.id, { shape: node.shape === 'rect' ? 'circle' : 'rect' })} style={{ height: node.h - 50, borderRadius: node.shape === 'circle' ? '50%' : 12, border: `2px solid ${node.color}`, background: `${node.color}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <div className="d-flex gap-1">{NOTE_COLORS.map(col => <button key={col} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); patch(node.id, { color: col }) }} style={{ width: 12, height: 12, borderRadius: 3, background: col, border: node.color === col ? '2px solid #fff8e6' : '2px solid transparent' }} />)}</div>
    </div>
  )
}

function CharacterBody({ node, character: c, patch, setResource, onOpen }) {
  if (!c) return <p className="text-muted-drako m-0" style={{ fontSize: '0.85rem' }}>Ficha ausente.</p>
  const lvl = LEVEL_BY_KEY[c.level]; const color = LEVEL_COLORS[c.level] || '#e0ad33'
  const max = maxResources(c.attributes, c.level); const r = { ...max, ...c.resources }
  return (
    <div>
      <div className="d-flex align-items-center gap-2">
        <button onClick={onOpen} style={{ background: 'none', border: `2px solid ${color}aa`, borderRadius: 12, overflow: 'hidden', width: 48, height: 48, cursor: 'pointer', padding: 0, flex: '0 0 auto' }}><MiniPortrait c={c} size={48} color={color} /></button>
        <div className="min-w-0 flex-grow-1">
          <button onClick={onOpen} style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', width: '100%' }}>
            <div className="font-display gold-text" style={{ fontSize: '1rem', lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || 'Sem Nome'}</div>
            <div className="text-muted-drako" style={{ fontSize: '0.7rem' }}>{lvl?.name}{c.raca ? ' · ' + c.raca : ''}</div>
          </button>
        </div>
        <button className="btn-ghost" style={{ width: 26, height: 26, padding: 0, fontSize: '0.7rem' }} onClick={() => patch(node.id, { expanded: !node.expanded })} title="Expandir"><i className={`bi ${node.expanded ? 'bi-arrows-angle-contract' : 'bi-arrows-fullscreen'}`} /></button>
      </div>
      <div className="d-flex flex-column gap-1 mt-2">
        <QuickRes label="Vida" color="var(--life)" value={r.vida ?? 0} max={max.vida} onChange={(val) => setResource(c.id, 'vida', val)} />
        <QuickRes label="Energia" color="var(--energy)" value={r.energia ?? 0} max={max.energia} onChange={(val) => setResource(c.id, 'energia', val)} />
        <QuickRes label="PE" color="var(--pe)" value={r.pe ?? 0} max={max.pe} onChange={(val) => setResource(c.id, 'pe', val)} />
      </div>
      {node.expanded && (
        <div className="mt-2">
          <div className="d-flex flex-wrap gap-1 mb-2">
            {ATTRIBUTES.map(a => (
              <span key={a.key} className="glass glass-tight px-1 py-1 text-center" style={{ minWidth: 34 }} title={`${a.name}: ${c.attributes[a.key]}`}>
                <div className="font-mono" style={{ fontSize: '0.56rem', color: a.color }}>{a.short}</div>
                <div className="font-display gold-text" style={{ fontSize: '0.92rem', lineHeight: 1 }}>{c.attributes[a.key]}</div>
              </span>
            ))}
          </div>
          <div className="label-drako">Habilidades</div>
          <div className="d-flex flex-column gap-1" style={{ maxHeight: 160, overflowY: 'auto' }}>
            {['passiva', 'ativa1', 'ativa2', 'ativa3', 'ultimate'].map(k => {
              const ab = c.abilities?.[k]; if (!ab) return null
              return (
                <div key={k} className="glass glass-tight px-2 py-1">
                  <div className="font-display" style={{ fontSize: '0.8rem', color: 'var(--drako-gold-soft)' }}>{ab.name || '—'} {ab.kind !== 'passiva' && ab.name && <span className="font-mono text-muted-drako">·{ab.energia}E</span>}</div>
                  {ab.descricao && <div className="text-muted-drako" style={{ fontSize: '0.7rem', lineHeight: 1.3 }}>{ab.descricao}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}
      <button className="btn-ghost w-100 mt-2" style={{ fontSize: '0.74rem', padding: '0.25rem' }} onClick={onOpen}><i className="bi bi-box-arrow-up-right me-1" />Ficha completa</button>
    </div>
  )
}

function QuickRes({ label, color, value, max, onChange }) {
  return (
    <div className="d-flex align-items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
      <span className="font-mono" style={{ fontSize: '0.66rem', color, width: 52 }}>{label}</span>
      <span className="font-mono" style={{ fontSize: '0.74rem', color, minWidth: 44 }}>{value}/{max}</span>
      <input type="range" min={0} max={max} value={Math.min(value, max)} onChange={(e) => onChange(Number(e.target.value))} style={{ flex: 1, accentColor: color }} />
    </div>
  )
}

function MiniPortrait({ c, size, color }) {
  const icon = c.icon
  const s = { width: size, height: size, borderRadius: 10, overflow: 'hidden', position: 'relative', flex: '0 0 auto', border: `2px solid ${color}aa`, background: 'radial-gradient(circle at 50% 30%, #1c1812, #0a0806)' }
  return (
    <div style={s} className="no-select">
      {icon?.dataUrl
        ? <img src={icon.dataUrl} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${icon.x || 50}% ${icon.y || 50}%`, transform: `scale(${icon.scale || 1})` }} />
        : <div className="d-flex align-items-center justify-content-center h-100 font-display gold-text" style={{ fontSize: size * 0.32 }}>{(c.name || '?').slice(0, 2).toUpperCase()}</div>}
    </div>
  )
}

function DetailDrawer({ characterId, chars, onClose, onOpen }) {
  const c = chars.find(x => x.id === characterId); if (!c) return null
  const lvl = LEVEL_BY_KEY[c.level]; const color = LEVEL_COLORS[c.level] || '#e0ad33'
  return (
    <>
      <div className="position-fixed drako-modal-backdrop" style={{ inset: 0, zIndex: 80 }} onClick={onClose} />
      <div className="glass position-fixed" style={{ top: 12, right: 12, bottom: 12, width: 'min(420px, 92vw)', zIndex: 81, overflowY: 'auto', animation: 'fadeUp .4s both' }}>
        <div className="d-flex align-items-center justify-content-between p-3" style={{ borderBottom: '1px solid var(--drako-border)' }}>
          <h4 className="m-0" style={{ fontSize: '1.02rem' }}>Detalhes</h4>
          <div className="d-flex gap-1">
            <button className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} onClick={onOpen} title="Abrir ficha"><i className="bi bi-box-arrow-up-right" /></button>
            <button className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} onClick={onClose}><i className="bi bi-x-lg" /></button>
          </div>
        </div>
        <div className="p-3">
          <div className="d-flex align-items-center gap-3 mb-3">
            <MiniPortrait c={c} size={72} color={color} />
            <div>
              <h3 className="m-0 gold-text" style={{ fontSize: '1.3rem' }}>{c.name}</h3>
              <div className="text-muted-drako" style={{ fontSize: '0.82rem' }}>{lvl?.name}{c.raca ? ' · ' + c.raca : ''}</div>
            </div>
          </div>
          <div className="row g-1 mb-3">
            {ATTRIBUTES.map(a => (
              <div className="col-3" key={a.key}>
                <div className="glass glass-tight p-1 text-center">
                  <div className="font-mono" style={{ fontSize: '0.58rem', color: a.color }}>{a.short}</div>
                  <div className="font-display gold-text" style={{ fontSize: '1.05rem' }}>{c.attributes[a.key]}</div>
                </div>
              </div>
            ))}
          </div>
          {c.anotacoes && <div className="glass glass-tight p-2 mb-3"><div className="label-drako">Anotações</div><div style={{ fontSize: '0.88rem', color: '#d4c8ab', whiteSpace: 'pre-wrap' }}>{c.anotacoes}</div></div>}
          <div className="label-drako">Habilidades</div>
          <div className="d-flex flex-column gap-2">
            {['passiva', 'ativa1', 'ativa2', 'ativa3', 'ultimate'].map(k => {
              const ab = c.abilities?.[k]; if (!ab) return null
              const slotName = { passiva: 'Passiva', ativa1: 'Ativa 1', ativa2: 'Ativa 2', ativa3: 'Ativa 3', ultimate: 'Ultimate' }[k]
              const meta = { passiva: '#2ecc71', ativa: '#e0ad33', ultimate: '#f2661b' }[ab.kind]
              return (
                <div key={k} className="glass glass-tight p-2" style={{ borderLeft: `4px solid ${meta}` }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="font-mono text-muted-drako" style={{ fontSize: '0.62rem' }}>{slotName}</span>
                    {ab.kind !== 'passiva' && <span className="font-mono text-energy" style={{ fontSize: '0.68rem' }}>{ab.energia} energia</span>}
                  </div>
                  <div className="font-display text-gold" style={{ fontSize: '0.95rem' }}>{ab.name || '—'}</div>
                  {ab.descricao && <div className="text-muted-drako" style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>{ab.descricao}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
