import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getBoard, saveBoard, listCharacters, listFolders, saveCharacter } from '../../lib/db.js'
import { LEVEL_BY_KEY } from '../../data/startingLevels.js'
import { ATTRIBUTES } from '../../data/attributes.js'
import { maxResources, absorption } from '../../lib/calculator.js'
import { useHashRoute } from '../../hooks/useHashRoute.js'
import { useToast } from '../../contexts/ToastContext.jsx'
import Modal from '../ui/Modal.jsx'
import { Button } from '../ui/Button.jsx'
import { uid } from '../../lib/id.js'
import { LEVEL_COLORS } from '../sheet/CharacterSheet.jsx'

const NOTE_COLORS = ['#e0ad33', '#f2661b', '#2ecc71', '#3498db', '#9b59b6', '#c0392b', '#16a085', '#7f8c8d']
const DB_SAVE_DELAY = 700
const MIN_W = 120, MIN_H = 90
const VIEW_MIN = 0.15
const VIEW_MAX = 3
const UNFILED_FOLDER = '__unfiled__'
const CHARACTER_CARD_W = 360
const CHARACTER_CARD_H = 500

export default function BoardView({ id }) {
  const { navigate } = useHashRoute()
  const toast = useToast()
  const [board, setBoard] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [chars, setChars] = useState([])
  const [folders, setFolders] = useState([])
  const [selected, setSelected] = useState(null)
  const [showGallery, setShowGallery] = useState(false)
  const [detail, setDetail] = useState(null)
  const [damage, setDamage] = useState(null)
  const [isPanning, setIsPanning] = useState(false)

  const viewportRef = useRef(null)
  const drag = useRef(null)
  const saveTimer = useRef(null)
  const clipboard = useRef(null)
  const boardRef = useRef(null)

  useEffect(() => {
    let alive = true
    Promise.all([getBoard(id), listCharacters(), listFolders()]).then(([b, c, f]) => {
      if (!alive) return
      setBoard(b || { id, name: 'Quadro', nodes: [], view: { x: 0, y: 0, scale: 1 } })
      setChars(c); setFolders(f); setLoaded(true)
    })
    return () => { alive = false }
  }, [id])

  const persist = useCallback((b) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveBoard(b), DB_SAVE_DELAY)
  }, [])
  const update = useCallback((updater) => {
    setBoard(prev => {
      if (!prev) return prev
      const next = updater(prev)
      persist(next)
      return next
    })
  }, [persist])

  useEffect(() => () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      if (boardRef.current) saveBoard(boardRef.current)
    }
  }, [])

  const charMap = useMemo(() => Object.fromEntries(chars.map(c => [c.id, c])), [chars])

  useEffect(() => {
    boardRef.current = board
  }, [board])

  const centerWorld = () => {
    const vp = viewportRef.current, v = board.view
    if (!vp || !v) return { cx: 0, cy: 0 }
    return { cx: (-v.x + vp.clientWidth / 2) / v.scale, cy: (-v.y + vp.clientHeight / 2) / v.scale }
  }
  const addNode = (partial) => {
    const { cx, cy } = centerWorld()
    const node = { id: uid('nd'), x: cx - 100, y: cy - 70, w: 200, ...partial }
    update(prev => ({ ...prev, nodes: [...prev.nodes, node] }))
    setSelected(node.id)
    return node
  }
  const addManyCharacters = (characterIds) => {
    if (!characterIds.length) return
    const { cx, cy } = centerWorld()
    const COLS = Math.min(characterIds.length, 2)
    const STEP_X = 410, STEP_Y = 560
    const newNodes = characterIds.map((cid, i) => {
      const col = i % COLS, row = Math.floor(i / COLS)
      return {
        id: uid('nd'), kind: 'character', characterId: cid,
        x: cx - (COLS * STEP_X) / 2 + col * STEP_X - 180,
        y: cy - STEP_Y / 2 + row * STEP_Y,
        w: CHARACTER_CARD_W, h: CHARACTER_CARD_H, expanded: false
      }
    })
    update(prev => ({ ...prev, nodes: [...prev.nodes, ...newNodes] }))
    if (newNodes.length === 1) setSelected(newNodes[0].id)
    toast.success(`${characterIds.length} ficha(s) adicionada(s) ao quadro.`)
  }
  const removeNode = (nid) => update(prev => ({ ...prev, nodes: prev.nodes.filter(n => n.id !== nid) }))
  const patchNode = (nid, patch) => {
    if (patch && patch._del) { removeNode(nid); return }
    update(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === nid ? { ...n, ...patch } : n) }))
  }

  const patchCharacter = useCallback((cid, updater) => {
    setChars(prev => {
      let changed = null
      const next = prev.map(c => {
        if (c.id !== cid) return c
        changed = typeof updater === 'function' ? updater(c) : { ...c, ...updater }
        return changed
      })
      if (changed) saveCharacter(changed)
      return next
    })
  }, [])

  const setCharResource = useCallback((cid, key, value) => {
    patchCharacter(cid, c => ({ ...c, resources: { ...c.resources, [key]: value } }))
  }, [patchCharacter])

  const setCharAttribute = useCallback((cid, key, value) => {
    patchCharacter(cid, c => {
      const attributes = { ...c.attributes, [key]: Math.max(0, Math.min(10, Number(value) || 0)) }
      const max = maxResources(attributes, c.level)
      const current = c.resources || {}
      return {
        ...c,
        attributes,
        resources: {
          ...current,
          vida: Math.min(current.vida ?? max.vida, max.vida),
          energia: Math.min(current.energia ?? max.energia, max.energia),
          pe: Math.min(current.pe ?? max.pe, max.pe)
        }
      }
    })
  }, [patchCharacter])

  const setCharAbility = useCallback((cid, slotKey, patch) => {
    patchCharacter(cid, c => ({ ...c, abilities: { ...c.abilities, [slotKey]: { ...c.abilities?.[slotKey], ...patch } } }))
  }, [patchCharacter])
  const applyDamageToChar = (cid, { mode, value, useAbsorb }) => {
    const c = chars.find(x => x.id === cid); if (!c) return
    const max = maxResources(c.attributes, c.level)
    const cur = c.resources?.vida ?? max.vida
    let delta = Number(value) || 0
    if (mode === 'dmg') {
      if (useAbsorb) {
        const abs = absorption(c.attributes?.for || 0)
        delta = Math.max(0, delta - abs)
      }
      setCharResource(cid, 'vida', Math.max(0, cur - delta))
      toast.error(`-${delta} PV${useAbsorb ? ' (após absorção)' : ''}`)
    } else {
      setCharResource(cid, 'vida', Math.min(max.vida, cur + delta))
      toast.success(`+${delta} PV`)
    }
  }

  const zoomBy = (f) => {
    const vp = viewportRef.current; if (!vp) return
    const cx = vp.clientWidth / 2, cy = vp.clientHeight / 2
    update(prev => {
      const v = prev.view
      const scale = Math.min(VIEW_MAX, Math.max(VIEW_MIN, v.scale * f))
      const wx = (cx - v.x) / v.scale, wy = (cy - v.y) / v.scale
      return { ...prev, view: { x: cx - wx * scale, y: cy - wy * scale, scale } }
    })
  }
  const fit = () => {
    if (!board.nodes.length) { update(prev => ({ ...prev, view: { x: 0, y: 0, scale: 1 } })); return }
    const xs = board.nodes.flatMap(n => [n.x, n.x + (n.kind === 'character' ? Math.max(n.w || 0, CHARACTER_CARD_W) : n.w)])
    const ys = board.nodes.flatMap(n => [n.y, n.y + (n.kind === 'character' ? Math.max(n.h || 0, CHARACTER_CARD_H) : n.h)])
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
    const pad = 120, vp = viewportRef.current
    const scale = Math.min(2.5, Math.max(VIEW_MIN, Math.min((vp.clientWidth - pad * 2) / Math.max(1, maxX - minX), (vp.clientHeight - pad * 2) / Math.max(1, maxY - minY))))
    const x = -minX * scale + (vp.clientWidth - (maxX - minX) * scale) / 2
    const y = -minY * scale + (vp.clientHeight - (maxY - minY) * scale) / 2
    update(prev => ({ ...prev, view: { x, y, scale } }))
  }
  const resetView = () => update(prev => ({ ...prev, view: { x: 0, y: 0, scale: 1 } }))

  useEffect(() => {
    const vp = viewportRef.current; if (!vp) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = vp.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      setBoard(prev => {
        const v = prev.view
        const scale = Math.min(VIEW_MAX, Math.max(VIEW_MIN, v.scale * Math.exp(-e.deltaY * 0.0015)))
        const wx = (mx - v.x) / v.scale, wy = (my - v.y) / v.scale
        const next = { ...prev, view: { x: mx - wx * scale, y: my - wy * scale, scale } }
        persist(next); return next
      })
    }
    vp.addEventListener('wheel', onWheel, { passive: false })
    return () => vp.removeEventListener('wheel', onWheel)
  }, [persist, loaded])

  const startPan = (e) => {
    const vp = viewportRef.current
    try { vp.setPointerCapture(e.pointerId) } catch {}
    setIsPanning(true)
    drag.current = { mode: 'pan', pid: e.pointerId, sx: e.clientX, sy: e.clientY, vx: board.view.x, vy: board.view.y, moved: false }
  }
  const startNodeDrag = (e, node) => {
    const vp = viewportRef.current
    try { vp.setPointerCapture(e.pointerId) } catch {}
    setSelected(node.id)
    drag.current = { mode: 'node', id: node.id, sx: e.clientX, sy: e.clientY, nx: node.x, ny: node.y, moved: false }
  }
  const startResize = (e, node, corner) => {
    const vp = viewportRef.current
    try { vp.setPointerCapture(e.pointerId) } catch {}
    setSelected(node.id)
    drag.current = { mode: 'resize', id: node.id, corner, x: node.x, y: node.y, w: node.w, h: node.h, sx: e.clientX, sy: e.clientY }
  }

  const onViewportPointerDown = (e) => {
    if (e.button === 2) { startPan(e); return }
    if (e.button === 1) { startPan(e); return }
    if (e.button === 0) { setSelected(null) }
  }
  const onPointerMove = (e) => {
    const d = drag.current; if (!d) return
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true
    const s = board.view.scale
    if (d.mode === 'pan') {
      setBoard(prev => {
        if (!prev) return prev
        const next = { ...prev, view: { ...prev.view, x: d.vx + dx, y: d.vy + dy } }
        persist(next)
        return next
      })
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
    const d = drag.current
    if (d) { try { viewportRef.current?.releasePointerCapture(e.pointerId) } catch {} }
    if (d?.mode === 'node' && !d.moved) {
      const node = board?.nodes.find(n => n.id === d.id)
      if (node?.kind === 'character') setDetail(node.characterId)
    }
    setIsPanning(false)
    drag.current = null
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'TEXTAREA') return
      const k = e.key.toLowerCase()
      if ((e.ctrlKey || e.metaKey) && k === 'c' && selected) clipboard.current = JSON.parse(JSON.stringify(board?.nodes.find(n => n.id === selected) || null))
      else if ((e.ctrlKey || e.metaKey) && k === 'v' && clipboard.current) { const c = { ...clipboard.current, id: uid('nd'), x: clipboard.current.x + 30, y: clipboard.current.y + 30 }; update(prev => ({ ...prev, nodes: [...prev.nodes, c] })); setSelected(c.id) }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selected) removeNode(selected)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, board, update])

  if (!loaded) return <div className="d-flex align-items-center justify-content-center" style={{ height: '100vh' }}><div className="spinner-border text-gold" /></div>

  const v = board.view
  const dot = 26 * v.scale
  const bgStyle = {
    backgroundColor: '#070505',
    backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.16) 1.3px, transparent 1.4px)',
    backgroundSize: `${dot}px ${dot}px`,
    backgroundPosition: `${v.x}px ${v.y}px`
  }

  return (
    <div className="position-relative" style={{ height: 'calc(100dvh - 112px)', minHeight: 560, background: '#070505', display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(224,173,51,0.12)', borderBottom: '1px solid rgba(224,173,51,0.12)' }}>
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

      <div className="position-relative flex-grow-1" style={{ overflow: 'hidden' }}>
        <div className="position-absolute d-flex flex-column align-items-center gap-2" style={{ left: 14, top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
          <CircleTool icon="bi-cursor" title="Selecionar" active />
          <CircleTool icon="bi-hand-index-thumb" title="Mover (botão direito)" />
          <div style={{ height: 1, width: 28, background: 'rgba(224,173,51,0.25)', margin: '4px 0' }} />
          <CircleTool icon="bi-person-plus-fill" title="Adicionar fichas" goldPulse onClick={() => setShowGallery(true)} />
          <CircleTool icon="bi-sticky-fill" title="Nota" onClick={() => addNode({ kind: 'note', text: '', color: '#e0ad33', w: 200, h: 150 })} />
          <CircleTool icon="bi-square" title="Forma" onClick={() => addNode({ kind: 'shape', shape: 'rect', color: '#e0ad33', w: 170, h: 120 })} />
          <div style={{ height: 1, width: 28, background: 'rgba(224,173,51,0.25)', margin: '4px 0' }} />
          <CircleTool icon="bi-zoom-in" title="Zoom +" onClick={() => zoomBy(1.2)} />
          <CircleTool icon="bi-zoom-out" title="Zoom -" onClick={() => zoomBy(1 / 1.2)} />
          <CircleTool icon="bi-arrows-fullscreen" title="Ajustar à tela" onClick={fit} />
          <CircleTool icon="bi-arrow-repeat" title="Resetar view" onClick={resetView} />
          {selected && <div style={{ height: 1, width: 28, background: 'rgba(224,173,51,0.25)', margin: '4px 0' }} />}
          {selected && <CircleTool danger icon="bi-trash" title="Excluir selecionado" onClick={() => removeNode(selected)} />}
        </div>

        <div className="position-absolute" style={{ bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 5, color: 'rgba(255,255,255,0.35)', fontSize: '0.76rem', textAlign: 'center', pointerEvents: 'none' }}>
          <span className="kbd">botão direito</span> navegar · <span className="kbd">esquerdo</span> manipular · <span className="kbd">scroll</span> zoom · <span className="kbd">Ctrl+C/V</span> duplicar
        </div>

        <div
          ref={viewportRef}
          className="position-absolute no-select"
          style={{ inset: 0, touchAction: 'none', userSelect: 'none', cursor: isPanning ? 'grabbing' : 'default', ...bgStyle }}
          data-canvasbg="1"
          onPointerDown={onViewportPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="position-absolute" style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.scale})`, transformOrigin: '0 0', width: 1, height: 1 }}>
            {board.nodes.map(node => {
              const sel = selected === node.id
              if (node.kind === 'note') return <Node key={node.id} node={node} sel={sel} startDrag={startNodeDrag} startResize={startResize} remove={removeNode}><NoteBody node={node} patch={patchNode} /></Node>
              if (node.kind === 'shape') return <Node key={node.id} node={node} sel={sel} startDrag={startNodeDrag} startResize={startResize} remove={removeNode}><ShapeBody node={node} patch={patchNode} /></Node>
              if (node.kind === 'character') {
                const c = charMap[node.characterId]
                const color = c ? (LEVEL_COLORS[c.level] || '#e0ad33') : null
                return <Node key={node.id} node={node} sel={sel} startDrag={startNodeDrag} startResize={startResize} remove={removeNode} characterMode accentColor={color}>
                  <CharacterBody node={node} character={c} patch={patchNode} setResource={setCharResource} onOpen={() => setDetail(c?.id)} onDamage={(mode) => setDamage({ cid: c?.id, mode })} />
                </Node>
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

      <CharacterPickerModal
        open={showGallery}
        chars={chars}
        folders={folders}
        onClose={() => setShowGallery(false)}
        onAdd={(ids) => { addManyCharacters(ids); setShowGallery(false) }}
      />

      <DamageModal
        state={damage}
        character={damage ? chars.find(c => c.id === damage.cid) : null}
        onClose={() => setDamage(null)}
        onApply={(payload) => { applyDamageToChar(damage.cid, payload); setDamage(null) }}
      />

      <DetailDrawer
        characterId={detail}
        chars={chars}
        onClose={() => setDetail(null)}
        onOpen={() => { if (detail) navigate(`ficha/${detail}`) }}
        onDamage={(mode) => setDamage({ cid: detail, mode })}
        onResource={setCharResource}
        onAttribute={setCharAttribute}
        onAbility={setCharAbility}
      />
    </div>
  )
}

function CircleTool({ icon, title, onClick, danger, active, goldPulse }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 46, height: 46, borderRadius: 999,
        border: `1px solid ${danger ? 'rgba(231,76,60,0.5)' : active || goldPulse ? 'rgba(224,173,51,0.8)' : 'rgba(224,173,51,0.35)'}`,
        background: goldPulse
          ? 'radial-gradient(circle at 50% 40%, rgba(224,173,51,0.45), rgba(12,9,7,0.92))'
          : active ? 'rgba(224,173,51,0.16)' : 'rgba(12,9,7,0.85)',
        color: danger ? '#ff8a7a' : 'var(--drako-gold-soft)',
        cursor: 'pointer', fontSize: '1.1rem',
        boxShadow: goldPulse ? '0 0 18px rgba(224,173,51,0.45), 0 6px 18px rgba(0,0,0,0.5)'
          : hover ? '0 0 14px rgba(224,173,51,0.35), 0 6px 18px rgba(0,0,0,0.5)' : '0 6px 18px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform .2s, border-color .2s, box-shadow .2s',
        transform: hover ? 'scale(1.1)' : 'scale(1)'
      }}>
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

function Node({ node, sel, startDrag, startResize, children, characterMode, accentColor }) {
  const onDown = (e) => {
    if (e.button !== 0) return
    if (e.target.closest('button, input, textarea, select, a, [data-no-drag]')) return
    e.stopPropagation()
    startDrag(e, node)
  }
  const lvlColor = characterMode ? accentColor : null
  const width = characterMode ? Math.max(node.w || 0, CHARACTER_CARD_W) : node.w
  const minHeight = characterMode ? Math.max(node.h || 0, CHARACTER_CARD_H) : node.h
  return (
    <div onPointerDown={onDown} className="glass position-absolute"
      style={{
        left: node.x, top: node.y, width, minHeight,
        border: sel
          ? `1.5px solid ${lvlColor || 'rgba(224,173,51,0.85)'}`
          : `1px solid ${lvlColor ? lvlColor + '88' : 'rgba(224,173,51,0.16)'}`,
        boxShadow: sel
          ? `0 0 0 1px ${lvlColor || 'rgba(224,173,51,0.3)'}, 0 0 28px ${(lvlColor || 'rgba(224,173,51)')}30, 0 12px 40px -16px rgba(0,0,0,0.8)`
          : '0 12px 40px -16px rgba(0,0,0,0.8)',
        cursor: 'grab'
      }}>
      {children}
      {sel && RESIZE_CORNERS.map(({ c, style }) => (
        <div key={c} data-resize="1" onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); startResize(e, node, c) }} style={{ position: 'absolute', width: 14, height: 14, borderRadius: 3, background: '#f6d98c', border: '1px solid #1a1408', ...style }} />
      ))}
    </div>
  )
}

function NoteBody({ node, patch }) {
  return (
    <div style={{ background: `linear-gradient(180deg, ${node.color}22, rgba(19,16,12,0.92))`, borderRadius: 10, padding: 8 }}>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <i className="bi bi-grip-horizontal text-muted-drako" style={{ fontSize: '0.85rem' }} />
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => patch(node.id, { _del: true })} className="btn-ghost" data-no-drag="1" style={{ width: 22, height: 22, padding: 0, fontSize: '0.7rem' }}><i className="bi bi-x" /></button>
      </div>
      <div className="d-flex align-items-center gap-1 mb-1">
        {NOTE_COLORS.map(col => <button key={col} data-no-drag="1" onPointerDown={(e) => e.stopPropagation()} onClick={() => patch(node.id, { color: col })} style={{ width: 14, height: 14, borderRadius: 4, background: col, border: node.color === col ? '2px solid #fff8e6' : '2px solid transparent', cursor: 'pointer' }} />)}
      </div>
      <textarea value={node.text} onChange={(e) => patch(node.id, { text: e.target.value })} onPointerDown={(e) => e.stopPropagation()} placeholder="Anotação..."
        style={{ width: '100%', minHeight: 70, background: 'transparent', border: 'none', color: 'var(--drako-text)', resize: 'none', outline: 'none', fontFamily: 'Lexend', fontSize: '0.92rem' }} />
    </div>
  )
}

function ShapeBody({ node, patch }) {
  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-1">
        <i className="bi bi-grip-horizontal text-muted-drako" style={{ fontSize: '0.85rem' }} />
        <button onPointerDown={(e) => e.stopPropagation()} onClick={() => patch(node.id, { _del: true })} className="btn-ghost" data-no-drag="1" style={{ width: 22, height: 22, padding: 0, fontSize: '0.7rem' }}><i className="bi bi-x" /></button>
      </div>
      <div onClick={() => patch(node.id, { shape: node.shape === 'rect' ? 'circle' : 'rect' })} style={{ height: node.h - 50, borderRadius: node.shape === 'circle' ? '50%' : 12, border: `2px solid ${node.color}`, background: `${node.color}1f`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'grab' }}>
        <div className="d-flex gap-1">{NOTE_COLORS.map(col => <button key={col} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); patch(node.id, { color: col }) }} style={{ width: 12, height: 12, borderRadius: 3, background: col, border: node.color === col ? '2px solid #fff8e6' : '2px solid transparent' }} />)}</div>
      </div>
    </div>
  )
}

function CharacterBody({ node, character: c, patch, setResource, onOpen, onDamage }) {
  if (!c) return (
    <div className="p-2">
      <p className="text-muted-drako m-0" style={{ fontSize: '0.85rem' }}>Ficha ausente.</p>
      <button className="btn-danger-soft w-100 mt-2" data-no-drag="1" style={{ fontSize: '0.72rem' }} onClick={() => patch(node.id, { _del: true })}><i className="bi bi-trash me-1" />Remover</button>
    </div>
  )
  const lvl = LEVEL_BY_KEY[c.level]
  const color = LEVEL_COLORS[c.level] || '#e0ad33'
  const max = maxResources(c.attributes, c.level)
  const r = { ...max, ...(c.resources || {}) }
  const abs = absorption(c.attributes?.for || 0)
  const dead = (r.vida ?? 0) <= 0

  return (
    <div style={{ borderTop: `3px solid ${color}` }}>
      <div className="p-3 pb-2" style={{ background: `linear-gradient(180deg, ${color}18, rgba(0,0,0,0) 70%)` }}>
        <div className="position-relative card-sheen" style={{ height: 190, borderRadius: 14, overflow: 'hidden', border: `2px solid ${color}aa`, background: 'radial-gradient(circle at 50% 30%, #1c1812, #0a0806)', boxShadow: `0 14px 32px -18px rgba(0,0,0,0.9), 0 0 22px ${color}22`, filter: dead ? 'grayscale(0.7) brightness(0.58)' : 'none' }}>
          <CharacterBoardPortrait c={c} color={color} />
          <div className="position-absolute d-flex gap-1" style={{ top: 8, right: 8 }} data-no-drag="1">
            <button className="btn-ghost" style={{ width: 32, height: 32, padding: 0, fontSize: '0.86rem', background: 'rgba(0,0,0,0.55)' }} onClick={() => patch(node.id, { expanded: !node.expanded })} title="Expandir habilidades"><i className={`bi ${node.expanded ? 'bi-arrows-angle-contract' : 'bi-list-ul'}`} /></button>
            <button className="btn-ghost" style={{ width: 32, height: 32, padding: 0, fontSize: '0.86rem', color: '#ff8a7a', borderColor: 'rgba(231,76,60,0.45)', background: 'rgba(0,0,0,0.55)' }} onClick={() => patch(node.id, { _del: true })} title="Remover do quadro"><i className="bi bi-x-lg" /></button>
          </div>
        </div>
        <div className="mt-3">
          <div className="font-display gold-text" style={{ fontSize: '1.34rem', lineHeight: 1.08, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name || 'Sem Nome'}</div>
          <div className="d-flex align-items-center gap-2 mt-2 flex-wrap">
            <span className="tag-chip" style={{ color, fontSize: '0.74rem', padding: '0.16rem 0.55rem', borderColor: color + '99' }}>{lvl?.name}</span>
            {c.raca && <span className="text-muted-drako" style={{ fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 }}>{c.raca}</span>}
            {abs > 0 && <span className="tag-chip" style={{ color: '#c0392b', fontSize: '0.68rem', padding: '0.12rem 0.5rem' }}><i className="bi bi-shield me-1" />{abs}</span>}
          </div>
        </div>
      </div>

      {dead && (
        <div className="mx-3 mb-2 text-center font-mono" style={{ fontSize: '0.68rem', color: '#ff6b6b', letterSpacing: '0.08em', padding: '4px 8px', border: '1px solid rgba(231,76,60,0.4)', borderRadius: 7, background: 'rgba(231,76,60,0.08)' }}>
          <i className="bi bi-skull me-1" />EM RISCO DE MORTE
        </div>
      )}

      <div className="px-3 d-flex flex-column gap-2">
        <ResourceBar label="Vida" icon="bi-heart-pulse" color="var(--life)" value={r.vida ?? 0} max={max.vida} onChange={(val) => setResource(c.id, 'vida', val)} />
        <ResourceBar label="Energia" icon="bi-lightning-charge" color="var(--energy)" value={r.energia ?? 0} max={max.energia} onChange={(val) => setResource(c.id, 'energia', val)} />
        <ResourceBar label="PE" icon="bi-bullseye" color="var(--pe)" value={r.pe ?? 0} max={max.pe} onChange={(val) => setResource(c.id, 'pe', val)} />
      </div>

      <div className="px-3 py-2 d-flex gap-2">
        <AttrPip a="for" c={c} />
        <AttrPip a="agi" c={c} />
        <AttrPip a="per" c={c} />
        <AttrPip a="int" c={c} />
        <AttrPip a="von" c={c} />
        <AttrPip a="pre" c={c} />
        <AttrPip a="am" c={c} />
      </div>

      {abs > 0 && (
        <div className="px-2 pb-1">
          <span className="tag-chip" style={{ color: '#c0392b', fontSize: '0.6rem', padding: '0.1rem 0.4rem' }} title="Redução de dano físico pela Força"><i className="bi bi-shield me-1" />Absorção {abs}</span>
        </div>
      )}

      <div className="px-3 pb-3 d-flex gap-2">
        <button data-no-drag="1" className="btn-dmg flex-grow-1" onClick={() => onDamage('dmg')} title="Aplicar dano">
          <i className="bi bi-dash-circle me-1" />Dano
        </button>
        <button data-no-drag="1" className="btn-heal flex-grow-1" onClick={() => onDamage('heal')} title="Curar">
          <i className="bi bi-plus-circle me-1" />Cura
        </button>
        <button data-no-drag="1" className="btn-ghost" style={{ padding: '0.35rem 0.65rem', fontSize: '0.86rem' }} onClick={onOpen} title="Abrir ficha completa">
          <i className="bi bi-box-arrow-up-right" />
        </button>
      </div>

      {node.expanded && (
        <div className="px-3 pb-3" style={{ borderTop: '1px solid rgba(224,173,51,0.12)', marginTop: 2, paddingTop: 10 }}>
          <div className="label-drako" style={{ fontSize: '0.66rem', marginBottom: 4 }}>Habilidades</div>
          <div className="d-flex flex-column gap-1" style={{ maxHeight: 200, overflowY: 'auto' }}>
            {['passiva', 'ativa1', 'ativa2', 'ativa3', 'ultimate'].map(k => {
              const ab = c.abilities?.[k]; if (!ab) return null
              const meta = { passiva: '#2ecc71', ativa: '#e0ad33', ultimate: '#f2661b' }[ab.kind]
              return (
                <div key={k} className="px-2 py-1" style={{ background: 'rgba(0,0,0,0.32)', borderRadius: 6, borderLeft: `3px solid ${meta}` }}>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="font-display" style={{ fontSize: '0.78rem', color: '#fff8e6' }}>{ab.name || '—'}</span>
                    {ab.kind !== 'passiva' && ab.energia != null && <span className="font-mono text-energy" style={{ fontSize: '0.62rem' }}>{ab.energia}E</span>}
                  </div>
                  {ab.descricao && <div className="text-muted-drako" style={{ fontSize: '0.66rem', lineHeight: 1.35, marginTop: 2 }}>{ab.descricao}</div>}
                </div>
              )
            })}
            {!['passiva', 'ativa1', 'ativa2', 'ativa3', 'ultimate'].some(k => c.abilities?.[k]) && (
              <p className="text-muted-drako m-0" style={{ fontSize: '0.74rem' }}>Sem habilidades cadastradas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AttrPip({ a, c }) {
  const attr = ATTRIBUTES.find(x => x.key === a)
  if (!attr) return null
  const v = c.attributes?.[a] || 0
  return (
    <div className="flex-grow-1 text-center" style={{ background: 'rgba(0,0,0,0.32)', borderRadius: 6, padding: '3px 0' }} title={`${attr.name}: ${v}`}>
      <div className="font-mono" style={{ fontSize: '0.5rem', color: attr.color, lineHeight: 1 }}>{attr.short}</div>
      <div className="font-display gold-text" style={{ fontSize: '0.82rem', lineHeight: 1.1 }}>{v}</div>
    </div>
  )
}

function ResourceBar({ label, icon, color, value, max, onChange }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const tone = pct > 60 ? color : pct > 30 ? color : '#e05252'
  return (
    <div className="d-flex align-items-center gap-2" data-no-drag="1" style={{ background: 'rgba(0,0,0,0.28)', borderRadius: 6, padding: '3px 6px' }}>
      <i className={`bi ${icon}`} style={{ color, fontSize: '0.72rem', width: 14 }} />
      <span className="font-mono" style={{ fontSize: '0.66rem', color, width: 38 }}>{label}</span>
      <div className="position-relative flex-grow-1" style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: tone, transition: 'width .3s' }} />
      </div>
      <input type="number" min={0} max={max} value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
        onPointerDown={(e) => e.stopPropagation()}
        className="no-spin font-mono"
        style={{ width: 36, background: 'transparent', border: 'none', color: tone, fontSize: '0.7rem', textAlign: 'right', outline: 'none' }} />
      <span className="font-mono text-muted-drako" style={{ fontSize: '0.66rem' }}>/ {max}</span>
    </div>
  )
}

function CharacterBoardPortrait({ c, color }) {
  const icon = c.icon
  return (
    <div className="no-select" style={{ position: 'absolute', inset: 0 }}>
      {icon?.dataUrl ? (
        <img src={icon.dataUrl} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${icon.x || 50}% ${icon.y || 50}%`, transform: `scale(${icon.scale || 1})`, transformOrigin: 'center' }} />
      ) : (
        <div className="d-flex align-items-center justify-content-center h-100 font-display gold-text" style={{ fontSize: '4rem', background: `radial-gradient(circle at 50% 35%, ${color}22, rgba(0,0,0,0.15))` }}>{(c.name || '?').slice(0, 2).toUpperCase()}</div>
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.22))', pointerEvents: 'none' }} />
    </div>
  )
}

function MiniPortrait({ c, size, color }) {
  const icon = c.icon
  const s = { width: size, height: size, borderRadius: 10, overflow: 'hidden', position: 'relative', flex: '0 0 auto', background: 'radial-gradient(circle at 50% 30%, #1c1812, #0a0806)' }
  return (
    <div style={s} className="no-select">
      {icon?.dataUrl
        ? <img src={icon.dataUrl} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${icon.x || 50}% ${icon.y || 50}%`, transform: `scale(${icon.scale || 1})` }} />
        : <div className="d-flex align-items-center justify-content-center h-100 font-display gold-text" style={{ fontSize: size * 0.32 }}>{(c.name || '?').slice(0, 2).toUpperCase()}</div>}
    </div>
  )
}

function CharacterPickerModal({ open, chars, folders, onClose, onAdd }) {
  const [search, setSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState(null)
  const [picked, setPicked] = useState(() => new Set())

  useEffect(() => {
    if (open) { setSearch(''); setFolderFilter(null); setPicked(new Set()) }
  }, [open])

  const filtered = useMemo(() => chars
    .filter(c => {
      if (folderFilter === null) return true
      if (folderFilter === UNFILED_FOLDER) return !c.folderId
      return (c.folderId || null) === folderFilter
    })
    .filter(c => !search.trim() ||
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.raca || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.name || '').localeCompare(b.name || '')), [chars, folderFilter, search])

  const toggle = (id) => {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const pickAllVisible = () => {
    setPicked(prev => {
      const next = new Set(prev)
      const allIn = filtered.every(c => next.has(c.id))
      if (allIn) filtered.forEach(c => next.delete(c.id))
      else filtered.forEach(c => next.add(c.id))
      return next
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Adicionar fichas ao quadro" size="xl"
      footer={<>
        <span className="me-auto font-mono text-muted-drako" style={{ fontSize: '0.78rem' }}>{picked.size} selecionada(s)</span>
        <Button variant="ghost" onClick={onClose}><i className="bi bi-x-lg me-2" />Fechar</Button>
        <Button onClick={() => onAdd([...picked])} disabled={picked.size === 0}>
          <i className="bi bi-plus-lg me-2" />Adicionar {picked.size > 0 ? `${picked.size} ficha(s)` : ''}
        </Button>
      </>}>
      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <div className="input-group" style={{ maxWidth: 360, flex: 1, minWidth: 240 }}>
          <span className="input-group-text" style={{ background: 'transparent', border: '1px solid rgba(224,173,51,0.18)', color: 'var(--drako-muted)' }}><i className="bi bi-search" /></span>
          <input className="form-control" style={{ background: 'rgba(10,8,6,0.7)', border: '1px solid rgba(224,173,51,0.18)', color: 'var(--drako-text)' }} placeholder="Buscar por nome ou raça..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="d-flex gap-1 flex-wrap align-items-center">
          <FolderChip active={folderFilter === null} label="Todas" onClick={() => setFolderFilter(null)} />
          <FolderChip active={folderFilter === UNFILED_FOLDER} icon="bi-folder2-open" label="Sem pasta" onClick={() => setFolderFilter(UNFILED_FOLDER)} />
          {folders.map(f => (
            <FolderChip key={f.id} active={folderFilter === f.id} icon="bi-folder-fill" label={f.name} onClick={() => setFolderFilter(f.id)} />
          ))}
        </div>
        <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.35rem 0.7rem' }} onClick={pickAllVisible}>
          <i className="bi bi-check2-square me-1" />{filtered.length > 0 && filtered.every(c => picked.has(c.id)) ? 'Desmarcar todas' : 'Marcar todas'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-inbox text-gold" style={{ fontSize: '2rem', opacity: 0.6 }} />
          <p className="text-muted-drako mt-2 mb-0">Nenhuma ficha encontrada com os filtros atuais.</p>
        </div>
      ) : (
        <div className="row g-2" style={{ maxHeight: '58vh', overflowY: 'auto' }}>
          {filtered.map(c => {
            const lvl = LEVEL_BY_KEY[c.level]; const color = LEVEL_COLORS[c.level] || '#e0ad33'
            const isPicked = picked.has(c.id)
            return (
              <div className="col-4 col-sm-3 col-md-3 col-lg-2-5 col-xl-2" key={c.id} style={{ maxWidth: 160 }}>
                <button onClick={() => toggle(c.id)} className="card-sheen w-100 text-center position-relative"
                  style={{
                    background: isPicked ? 'linear-gradient(180deg, rgba(224,173,51,0.18), rgba(19,16,12,0.92))' : 'rgba(19,16,12,0.7)',
                    border: `1px solid ${isPicked ? color : 'rgba(224,173,51,0.16)'}`,
                    borderRadius: 14, padding: 10, cursor: 'pointer',
                    boxShadow: isPicked ? `0 0 0 1px ${color}, 0 0 18px ${color}40` : '0 8px 24px -16px rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(8px)'
                  }}>
                  <div className="position-absolute" style={{ top: 6, right: 6, width: 22, height: 22, borderRadius: 999, border: `1.5px solid ${isPicked ? color : 'rgba(255,255,255,0.2)'}`, background: isPicked ? color : 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                    {isPicked && <i className="bi bi-check-lg" style={{ color: '#1a1408', fontSize: '0.85rem', fontWeight: 700 }} />}
                  </div>
                  <div className="mx-auto" style={{ width: '100%', aspectRatio: '1/1', maxWidth: 110 }}>
                    <GalleryPortrait c={c} color={color} />
                  </div>
                  <div className="mt-2" style={{ fontSize: '0.86rem', fontFamily: 'Fraunces, serif', color: isPicked ? '#fff8e6' : 'var(--drako-gold-soft)', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{c.name || 'Sem Nome'}</div>
                  <div className="d-flex align-items-center justify-content-center gap-1 mt-1">
                    <span className="tag-chip" style={{ color, fontSize: '0.58rem', padding: '0.08rem 0.4rem', borderColor: color + '88' }}>{lvl?.name}</span>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}

function FolderChip({ active, icon, label, onClick }) {
  return (
    <button onClick={onClick} className="d-flex align-items-center gap-1"
      style={{
        padding: '0.3rem 0.7rem', borderRadius: 999, cursor: 'pointer', fontSize: '0.78rem',
        border: `1px solid ${active ? 'rgba(224,173,51,0.7)' : 'rgba(224,173,51,0.2)'}`,
        background: active ? 'rgba(224,173,51,0.15)' : 'transparent',
        color: active ? '#fff8e6' : 'var(--drako-muted)',
        fontFamily: 'Fraunces, serif'
      }}>
      {icon && <i className={`bi ${icon}`} />}{label}
    </button>
  )
}

function GalleryPortrait({ c, color }) {
  const icon = c.icon
  const s = {
    width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden', position: 'relative',
    border: `2px solid ${color}aa`,
    background: 'radial-gradient(circle at 50% 30%, #1c1812, #0a0806)',
    boxShadow: `0 0 0 2px rgba(5,4,3,0.7), 0 10px 24px -10px rgba(0,0,0,0.85)`
  }
  return (
    <div style={s} className="no-select">
      {icon?.dataUrl
        ? <img src={icon.dataUrl} alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${icon.x || 50}% ${icon.y || 50}%`, transform: `scale(${icon.scale || 1})` }} />
        : <div className="d-flex align-items-center justify-content-center h-100 font-display gold-text" style={{ fontSize: '2rem' }}>{(c.name || '?').slice(0, 2).toUpperCase()}</div>}
    </div>
  )
}

function DamageModal({ state, character, onClose, onApply }) {
  const [value, setValue] = useState('')
  const [useAbsorb, setUseAbsorb] = useState(true)
  const isDmg = state?.mode === 'dmg'
  const isOpen = !!state

  useEffect(() => {
    if (isOpen) { setValue(''); setUseAbsorb(true) }
  }, [isOpen, state?.cid, state?.mode])

  if (!isOpen || !character) return null
  const max = maxResources(character.attributes, character.level)
  const cur = character.resources?.vida ?? max.vida
  const num = Math.max(0, Number(value) || 0)
  const abs = absorption(character.attributes?.for || 0)
  const effective = isDmg && useAbsorb ? Math.max(0, num - abs) : num
  const final = isDmg ? Math.max(0, cur - effective) : Math.min(max.vida, cur + num)

  const accent = isDmg ? '#e05252' : '#34d399'
  const label = isDmg ? 'DANO' : 'CURA'

  return (
    <Modal open={isOpen} onClose={onClose} title={
      <span className="d-inline-flex align-items-center gap-2">
        <i className={`bi ${isDmg ? 'bi-dash-circle-fill' : 'bi-plus-circle-fill'}`} style={{ color: accent }} />
        Aplicar {label}
      </span>
    } size="sm" closable
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => onApply({ mode: state.mode, value: num, useAbsorb: isDmg ? useAbsorb : false })} disabled={!num}>
          <i className={`bi ${isDmg ? 'bi-dash-lg' : 'bi-plus-lg'} me-1`} />Aplicar {num || 0}
        </Button>
      </>}>
      <div className="text-center mb-3">
        <div className="font-display" style={{ fontSize: '1.3rem', color: '#fff8e6' }}>{character.name}</div>
        <div className="font-mono text-muted-drako" style={{ fontSize: '0.74rem' }}>Vida atual: <b style={{ color: 'var(--life)' }}>{cur}</b> / {max.vida}</div>
      </div>

      <div className="text-center mb-3" style={{ padding: '0.7rem', border: `1px solid ${accent}44`, borderRadius: 12, background: `${accent}10` }}>
        <div className="font-mono" style={{ fontSize: '0.62rem', color: accent, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
        <input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && num) onApply({ mode: state.mode, value: num, useAbsorb: isDmg ? useAbsorb : false }) }}
          className="no-spin"
          autoFocus
          style={{ width: '100%', background: 'transparent', border: 'none', color: accent, fontSize: '2.4rem', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', outline: 'none' }}
          placeholder="0" />
      </div>

      {isDmg && abs > 0 && (
        <label className="d-flex align-items-center gap-2 mb-2" style={{ padding: '0.5rem 0.7rem', border: '1px solid rgba(192,57,43,0.3)', borderRadius: 10, background: 'rgba(192,57,43,0.05)', cursor: 'pointer' }}>
          <input type="checkbox" checked={useAbsorb} onChange={(e) => setUseAbsorb(e.target.checked)} style={{ accentColor: '#c0392b', width: 18, height: 18 }} />
          <div className="flex-grow-1">
            <div style={{ fontSize: '0.86rem', color: '#ffb4a8' }}><i className="bi bi-shield me-1" />Aplicar armadura / absorção <b>({abs})</b></div>
            <div className="font-mono text-muted-drako" style={{ fontSize: '0.66rem' }}>Subtrai {abs} do dano incoming (Força)</div>
          </div>
        </label>
      )}

      <div className="d-flex justify-content-around gap-2 mt-2" style={{ padding: '0.6rem', border: '1px solid rgba(224,173,51,0.15)', borderRadius: 10, background: 'rgba(0,0,0,0.3)' }}>
        <div className="text-center">
          <div className="font-mono text-muted-drako" style={{ fontSize: '0.62rem' }}>BRUTO</div>
          <div className="font-display" style={{ fontSize: '1.1rem', color: '#fff8e6' }}>{num}</div>
        </div>
        {isDmg && useAbsorb && abs > 0 && (
          <>
            <i className="bi bi-dash self-center" style={{ color: 'var(--drako-muted)', alignSelf: 'center' }} />
            <div className="text-center">
              <div className="font-mono text-muted-drako" style={{ fontSize: '0.62rem' }}>ABSORÇÃO</div>
              <div className="font-display" style={{ fontSize: '1.1rem', color: '#c0392b' }}>{abs}</div>
            </div>
          </>
        )}
        <i className="bi bi-arrow-right-short self-center" style={{ color: accent, fontSize: '1.4rem', alignSelf: 'center' }} />
        <div className="text-center">
          <div className="font-mono" style={{ fontSize: '0.62rem', color: accent }}>{isDmg && useAbsorb && abs > 0 ? 'FINAL' : 'EFETIVO'}</div>
          <div className="font-display" style={{ fontSize: '1.1rem', color: accent }}>{isDmg ? `-${effective}` : `+${num}`}</div>
        </div>
        <i className="bi bi-arrow-right-short self-center" style={{ color: 'var(--drako-muted)', fontSize: '1.4rem', alignSelf: 'center' }} />
        <div className="text-center">
          <div className="font-mono text-muted-drako" style={{ fontSize: '0.62rem' }}>NOVA VIDA</div>
          <div className="font-display" style={{ fontSize: '1.1rem', color: final <= 0 ? '#ff6b6b' : 'var(--life)' }}>{final}{final <= 0 && <i className="bi bi-skull ms-1" style={{ fontSize: '0.8rem' }} />}</div>
        </div>
      </div>

      <div className="d-flex gap-1 mt-3">
        {[5, 10, 15, 20, 30].map(n => (
          <button key={n} className="btn-ghost flex-grow-1" style={{ padding: '0.3rem', fontSize: '0.78rem' }} onClick={() => setValue(String(n))}>+{n}</button>
        ))}
      </div>
    </Modal>
  )
}

function DetailDrawer({ characterId, chars, onClose, onOpen, onDamage, onResource, onAttribute, onAbility }) {
  const c = chars.find(x => x.id === characterId); if (!c) return null
  const lvl = LEVEL_BY_KEY[c.level]; const color = LEVEL_COLORS[c.level] || '#e0ad33'
  const max = maxResources(c.attributes, c.level)
  const r = { ...max, ...(c.resources || {}) }
  const abs = absorption(c.attributes?.for || 0)
  const narrative = c.narrativa || {}
  const narrativeItems = [
    ['Arquétipo', c.arquetipo],
    ['Conceito', narrative.conceito],
    ['Vínculo', narrative.vinculo],
    ['Cicatriz', narrative.cicatriz]
  ].filter(([, value]) => value)
  return (
    <>
      <div className="position-fixed drako-modal-backdrop" style={{ inset: 0, zIndex: 8500 }} onClick={onClose} />
      <div className="glass position-fixed" style={{ top: 12, right: 12, bottom: 12, width: 'min(440px, 92vw)', zIndex: 8501, overflowY: 'auto', animation: 'fadeUp .4s both', borderTop: `3px solid ${color}` }}>
        <div className="d-flex align-items-center justify-content-between p-3" style={{ borderBottom: '1px solid var(--drako-border)' }}>
          <h4 className="m-0 font-display gold-text" style={{ fontSize: '1.05rem' }}>Detalhes do personagem</h4>
          <div className="d-flex gap-1">
            <button className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} onClick={onOpen} title="Abrir ficha"><i className="bi bi-box-arrow-up-right" /></button>
            <button className="btn-ghost" style={{ width: 32, height: 32, padding: 0 }} onClick={onClose}><i className="bi bi-x-lg" /></button>
          </div>
        </div>
        <div className="p-3">
          <div className="d-flex align-items-center gap-3 mb-3">
            <MiniPortrait c={c} size={78} color={color} />
            <div className="min-w-0">
              <h3 className="m-0 gold-text font-display" style={{ fontSize: '1.4rem', lineHeight: 1.05, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</h3>
              <div className="d-flex align-items-center gap-2 mt-1 flex-wrap">
                <span className="tag-chip" style={{ color, fontSize: '0.7rem', borderColor: color + '99' }}>{lvl?.name}</span>
                {c.raca && <span className="text-muted-drako" style={{ fontSize: '0.8rem' }}>{c.raca}</span>}
                {abs > 0 && <span className="tag-chip" style={{ color: '#c0392b', fontSize: '0.66rem' }} title="Redução de dano físico"><i className="bi bi-shield me-1" />Abs {abs}</span>}
              </div>
            </div>
          </div>

          <div className="d-flex flex-column gap-2 mb-3">
            <ResourceBar label="Vida" icon="bi-heart-pulse" color="var(--life)" value={r.vida ?? 0} max={max.vida} onChange={(val) => onResource(c.id, 'vida', val)} />
            <ResourceBar label="Energia" icon="bi-lightning-charge" color="var(--energy)" value={r.energia ?? 0} max={max.energia} onChange={(val) => onResource(c.id, 'energia', val)} />
            <ResourceBar label="PE" icon="bi-bullseye" color="var(--pe)" value={r.pe ?? 0} max={max.pe} onChange={(val) => onResource(c.id, 'pe', val)} />
          </div>

          <div className="d-flex gap-2 mb-3">
            <button className="btn-dmg flex-grow-1" onClick={() => onDamage('dmg')}><i className="bi bi-dash-circle me-1" />Dano</button>
            <button className="btn-heal flex-grow-1" onClick={() => onDamage('heal')}><i className="bi bi-plus-circle me-1" />Cura</button>
          </div>

          {narrativeItems.length > 0 && (
            <div className="mb-3" style={{ background: 'rgba(0,0,0,0.32)', borderRadius: 8, padding: 10 }}>
              <div className="label-drako">Identidade</div>
              <div className="d-flex flex-column gap-2">
                {narrativeItems.map(([label, value]) => (
                  <div key={label}>
                    <div className="font-mono text-muted-drako" style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ fontSize: '0.86rem', color: '#d4c8ab', lineHeight: 1.45 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {c.conditions?.length > 0 && (
            <div className="mb-3">
              <div className="label-drako">Condições</div>
              <div className="d-flex flex-wrap gap-1">
                {c.conditions.map((cond, i) => <span key={i} className="tag-chip" style={{ color: '#f2661b', fontSize: '0.68rem' }}>{cond}</span>)}
              </div>
            </div>
          )}

          <div className="label-drako">Atributos</div>
          <div className="row g-1 mb-3">
            {ATTRIBUTES.map(a => (
              <div className="col-3" key={a.key}>
                <div className="text-center" style={{ background: 'rgba(0,0,0,0.32)', borderRadius: 8, padding: '6px 2px' }}>
                  <div className="font-mono" style={{ fontSize: '0.58rem', color: a.color }}>{a.short}</div>
                  <input type="number" min={0} max={10} value={c.attributes?.[a.key] ?? 0} onChange={(e) => onAttribute(c.id, a.key, e.target.value)} className="input-drako no-spin font-display" style={{ height: 30, padding: '0.1rem 0.25rem', textAlign: 'center', fontSize: '0.95rem' }} aria-label={`Editar ${a.name}`} />
                </div>
              </div>
            ))}
          </div>

          {c.anotacoes && <div className="mb-3" style={{ background: 'rgba(0,0,0,0.32)', borderRadius: 8, padding: 10 }}><div className="label-drako">Anotações</div><div style={{ fontSize: '0.88rem', color: '#d4c8ab', whiteSpace: 'pre-wrap' }}>{c.anotacoes}</div></div>}

          <div className="label-drako">Habilidades</div>
          <div className="d-flex flex-column gap-2">
            {['passiva', 'ativa1', 'ativa2', 'ativa3', 'ultimate'].map(k => {
              const ab = c.abilities?.[k]; if (!ab) return null
              const slotName = { passiva: 'Passiva', ativa1: 'Ativa 1', ativa2: 'Ativa 2', ativa3: 'Ativa 3', ultimate: 'Ultimate' }[k]
              return <AbilityDrawerEditor key={k} slotName={slotName} ability={ab} onChange={(patch) => onAbility(c.id, k, patch)} />
            })}
            {!['passiva', 'ativa1', 'ativa2', 'ativa3', 'ultimate'].some(k => c.abilities?.[k]) && (
              <p className="text-muted-drako" style={{ fontSize: '0.85rem' }}>Sem habilidades cadastradas.</p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function AbilityDrawerEditor({ slotName, ability: ab, onChange }) {
  const meta = { passiva: '#2ecc71', ativa: '#e0ad33', ultimate: '#f2661b' }[ab.kind] || '#e0ad33'
  return (
    <div style={{ background: 'rgba(0,0,0,0.32)', borderRadius: 10, padding: 10, borderLeft: `4px solid ${meta}` }}>
      <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
        <span className="font-mono text-muted-drako" style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{slotName}</span>
        {ab.kind !== 'passiva' && (
          <div className="d-flex align-items-center gap-1" style={{ maxWidth: 92 }}>
            <i className="bi bi-lightning-charge-fill text-energy" style={{ fontSize: '0.78rem' }} />
            <input type="number" min={0} value={ab.energia ?? 0} onChange={(e) => onChange({ energia: Math.max(0, Number(e.target.value) || 0) })} className="input-drako no-spin font-mono" style={{ height: 28, padding: '0.12rem 0.3rem', textAlign: 'center', fontSize: '0.72rem' }} aria-label={`Editar custo de ${slotName}`} />
          </div>
        )}
      </div>
      <input value={ab.name || ''} onChange={(e) => onChange({ name: e.target.value })} className="input-drako font-display mb-2" style={{ height: 32, padding: '0.2rem 0.45rem', fontSize: '0.9rem', color: 'var(--drako-gold-soft)' }} placeholder="Nome da habilidade" />
      <textarea value={ab.descricao || ''} onChange={(e) => onChange({ descricao: e.target.value })} className="textarea-drako" rows={3} style={{ minHeight: 74, fontSize: '0.78rem', lineHeight: 1.35, padding: '0.45rem' }} placeholder="Descrição da habilidade" />
    </div>
  )
}

function DetailRes({ label, color, value, max }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const tone = pct > 60 ? color : pct > 30 ? color : '#e05252'
  return (
    <div>
      <div className="d-flex justify-content-between mb-1">
        <span className="font-mono" style={{ fontSize: '0.7rem', color }}>{label}</span>
        <span className="font-mono" style={{ fontSize: '0.74rem', color: tone }}>{value} / {max}</span>
      </div>
      <div className="position-relative" style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: tone, transition: 'width .3s' }} />
      </div>
    </div>
  )
}
