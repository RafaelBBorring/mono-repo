import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { SKILL_TREE, TREE_META, TREE_CONNECTIONS, INITIAL_STATE } from '../data/skillTreeData'
import {
  canUnlockSkill, investPoint, canRefundPoint, refundPoint,
  getSkillState, getRank, isUnlocked, getPointsSpent, getConnectionState,
  getAllSkills, getBranchProgress,
} from '../utils/skillTreeEngine'

const CANVAS_W = 1280
const CANVAS_H = 820

const TIER_LABELS = [
  { y: 80, text: 'Despertar' },
  { y: 230, text: 'Tier I' },
  { y: 400, text: 'Tier II' },
  { y: 560, text: 'Tier III' },
  { y: 730, text: 'Suprema' },
]

function getNodeSize(skill) {
  if (skill.isKeystone || skill.isUltimate) return 68
  return 54
}

function getConnectionPath(from, to) {
  const midY = (from.y + to.y) / 2
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
}

function SkillTooltip({ skill, character, pos, viewportRef }) {
  const tipRef = useRef(null)
  const [adjustedPos, setAdjustedPos] = useState(pos)

  useEffect(() => {
    if (!tipRef.current || !viewportRef.current) { setAdjustedPos(pos); return }
    const tipRect = tipRef.current.getBoundingClientRect()
    const vpRect = viewportRef.current.getBoundingClientRect()
    let x = pos.x + 16
    let y = pos.y - 20
    if (x + tipRect.width > vpRect.width - 8) x = pos.x - tipRect.width - 16
    if (y + tipRect.height > vpRect.height - 8) y = vpRect.height - tipRect.height - 8
    if (y < 8) y = 8
    setAdjustedPos({ x, y })
  }, [pos, viewportRef])

  const rank = getRank(character, skill.id)
  const state = getSkillState(skill.id, character)
  const cost = skill.cost || 1

  return (
    <div className="sk-tooltip" ref={tipRef} style={{ left: adjustedPos.x, top: adjustedPos.y }}>
      <div className="sk-tooltip-header">
        <h3>{skill.name}</h3>
        {skill.maxRank > 1 && (
          <span className="sk-tooltip-rank">{rank}/{skill.maxRank}</span>
        )}
      </div>
      <p className="sk-tooltip-desc">{skill.description}</p>

      <div className="sk-tooltip-stats">
        {skill.stats.map((s, i) => (
          <div key={i} className="sk-tooltip-stat">
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>

      {skill.dependsOn && skill.dependsOn.length > 0 && (
        <div className="sk-tooltip-deps">
          <small className="sk-tooltip-deps-title">
            {skill.requireMode === 'any' ? 'Requer (qualquer):' : 'Requer:'}
          </small>
          {skill.dependsOn.map(depId => {
            const dep = SKILL_TREE[depId]
            const met = isUnlocked(character, depId)
            return (
              <div key={depId} className={`sk-tooltip-dep ${met ? 'met' : 'unmet'}`}>
                <span className="material-symbols-outlined">{met ? 'check_circle' : 'cancel'}</span>
                {dep?.name || depId}
              </div>
            )
          })}
        </div>
      )}

      <div className="sk-tooltip-footer">
        {cost > 0 ? (
          <span className={`sk-tooltip-cost ${state === 'available' ? 'can-afford' : ''} ${state === 'locked' ? 'cant-afford' : ''}`}>
            <span className="material-symbols-outlined">stars</span>
            {cost} {cost === 1 ? 'ponto' : 'pontos'}
          </span>
        ) : (
          <span className="sk-tooltip-cost free">Gratuito</span>
        )}
        {state === 'available' && <span className="sk-tooltip-action">Click para desbloquear</span>}
        {state === 'purchased' && <span className="sk-tooltip-action">Click para evoluir</span>}
        {state === 'maxed' && <span className="sk-tooltip-action maxed">Maximizado</span>}
        {state === 'locked' && <span className="sk-tooltip-action locked">Bloqueado</span>}
      </div>
    </div>
  )
}

export default function SkillTreeView({ char, update }) {
  const [character, setCharacter] = useState(() => {
    if (char?.skillTreeState) return char.skillTreeState
    return { ...INITIAL_STATE }
  })
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [hovered, setHovered] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [justUnlocked, setJustUnlocked] = useState(null)
  const [dragging, setDragging] = useState(false)

  const viewportRef = useRef(null)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0, moved: false })

  const skills = useMemo(() => getAllSkills(), [])
  const pointsSpent = useMemo(() => getPointsSpent(character), [character])

  const handleInvest = useCallback((skillId) => {
    setCharacter(prev => {
      const next = investPoint(prev, skillId)
      if (next !== prev) {
        setJustUnlocked(skillId)
        if (char && update) update({ skillTreeState: next })
      }
      return next
    })
  }, [char, update])

  const handleRefund = useCallback((skillId) => {
    setCharacter(prev => {
      const next = refundPoint(prev, skillId)
      if (next !== prev && char && update) update({ skillTreeState: next })
      return next
    })
  }, [char, update])

  const handleReset = useCallback(() => {
    const reset = { ...INITIAL_STATE }
    setCharacter(reset)
    if (char && update) update({ skillTreeState: reset })
  }, [char, update])

  const handleCenter = useCallback(() => {
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.sk-node')) return
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    }
    setDragging(false)
  }, [pan])

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragRef.current.moved = true
      setDragging(true)
    }
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
  }, [])

  const handleMouseUp = useCallback(() => {
    dragRef.current.active = false
    dragRef.current.moved = false
    setTimeout(() => setDragging(false), 50)
  }, [])

  const zoomAtPoint = useCallback((cx, cy, delta) => {
    setZoom(prevZoom => {
      const newZoom = Math.max(0.3, Math.min(2.5, prevZoom + delta))
      if (newZoom === prevZoom) return prevZoom
      const scaleChange = newZoom / prevZoom
      setPan(prevPan => ({
        x: cx - (cx - prevPan.x) * scaleChange,
        y: cy - (cy - prevPan.y) * scaleChange,
      }))
      return newZoom
    })
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    zoomAtPoint(mx, my, -e.deltaY * 0.0015)
  }, [zoomAtPoint])

  const handleZoomBtn = useCallback((dir) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const cx = rect ? rect.width / 2 : 0
    const cy = rect ? rect.height / 2 : 0
    zoomAtPoint(cx, cy, dir * 0.2)
  }, [zoomAtPoint])

  const handleNodeClick = useCallback((e, skillId) => {
    if (dragRef.current.moved) return
    e.stopPropagation()
    handleInvest(skillId)
  }, [handleInvest])

  const handleNodeContextMenu = useCallback((e, skillId) => {
    e.preventDefault()
    e.stopPropagation()
    if (dragRef.current.moved) return
    handleRefund(skillId)
  }, [handleRefund])

  const handleNodeMouseEnter = useCallback((e, skill) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    if (rect) {
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    setHovered(skill)
  }, [])

  useEffect(() => {
    if (!justUnlocked) return
    const t = setTimeout(() => setJustUnlocked(null), 600)
    return () => clearTimeout(t)
  }, [justUnlocked])

  useEffect(() => {
    if (!viewportRef.current) return
    const vpW = viewportRef.current.clientWidth
    if (vpW > 0 && vpW < CANVAS_W) {
      const initZoom = Math.max(0.3, (vpW - 40) / CANVAS_W)
      setZoom(initZoom)
      setPan({ x: 0, y: 0 })
    }
  }, [])

  return (
    <div className={`sk-tree-wrapper ${dragging ? 'dragging' : ''}`}>
      <div className="sk-tree-hud">
        <div className="sk-tree-hud-left">
          <h2 className="sk-tree-title">
            <span className="material-symbols-outlined">account_tree</span>
            {TREE_META.name}
          </h2>
          <span className="sk-tree-subtitle">{TREE_META.subtitle}</span>
        </div>
        <div className="sk-tree-hud-right">
          <div className="sk-tree-points">
            <span className="material-symbols-outlined">stars</span>
            <span className="sk-tree-points-num">{character.skillPoints}</span>
            <span className="sk-tree-points-label">pontos</span>
          </div>
          <div className="sk-tree-spent">
            investidos: <strong>{pointsSpent}</strong>
          </div>
          <button className="sk-tree-btn" onClick={handleCenter} title="Centralizar">
            <span className="material-symbols-outlined">center_focus_strong</span>
          </button>
          <button className="sk-tree-btn sk-tree-btn--danger" onClick={handleReset} title="Resetar árvore">
            <span className="material-symbols-outlined">restart_alt</span>
          </button>
        </div>
      </div>

      <div className="sk-tree-legend">
        {Object.entries(TREE_META.branches).map(([id, br]) => {
          const prog = getBranchProgress(character, id)
          if (prog.total === 0) return null
          return (
            <div key={id} className="sk-tree-legend-item" style={{ '--branch': br.color }}>
              <span className="material-symbols-outlined sk-tree-legend-icon">{br.icon}</span>
              <div className="sk-tree-legend-text">
                <span className="sk-tree-legend-name">{br.name}</span>
                <span className="sk-tree-legend-deity">{br.deity}</span>
              </div>
              {prog.total > 0 && (
                <span className="sk-tree-legend-prog">{prog.spent}/{prog.total}</span>
              )}
            </div>
          )
        })}
      </div>

      <div
        className="sk-tree-viewport"
        ref={viewportRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className="sk-tree-canvas"
          style={{
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          <svg
            className="sk-tree-svg"
            width={CANVAS_W}
            height={CANVAS_H}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          >
            <defs>
              <filter id="sk-glow">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {TREE_CONNECTIONS.map(([fromId, toId], i) => {
              const from = SKILL_TREE[fromId]
              const to = SKILL_TREE[toId]
              if (!from || !to) return null
              const connState = getConnectionState(fromId, toId, character)
              return (
                <path
                  key={i}
                  d={getConnectionPath(from.position, to.position)}
                  className={`sk-conn sk-conn--${connState}`}
                />
              )
            })}
          </svg>

          {TIER_LABELS.map((tier, i) => (
            <div key={i} className="sk-tier-label" style={{ top: tier.y - 8 }}>
              {tier.text}
            </div>
          ))}

          {skills.map(skill => {
            const state = getSkillState(skill.id, character)
            const rank = getRank(character, skill.id)
            const br = TREE_META.branches[skill.branch]
            const size = getNodeSize(skill)
            return (
              <div
                key={skill.id}
                className={`sk-node sk-node--${state}${justUnlocked === skill.id ? ' sk-node--pop' : ''}${skill.isUltimate ? ' sk-node--ultimate' : ''}${skill.isKeystone ? ' sk-node--keystone' : ''}`}
                style={{
                  left: skill.position.x - size / 2,
                  top: skill.position.y - size / 2,
                  width: size,
                  height: size,
                  '--branch': br?.color || '#f7bd48',
                }}
                onClick={(e) => handleNodeClick(e, skill.id)}
                onContextMenu={(e) => handleNodeContextMenu(e, skill.id)}
                onMouseEnter={(e) => handleNodeMouseEnter(e, skill)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="material-symbols-outlined sk-node-icon">{skill.icon}</span>
                {skill.maxRank > 1 && (
                  <div className="sk-node-pips">
                    {Array.from({ length: skill.maxRank }).map((_, i) => (
                      <span key={i} className={`sk-pip${i < rank ? ' sk-pip--on' : ''}`} />
                    ))}
                  </div>
                )}
                {state === 'available' && (
                  <>
                    <div className="sk-node-ring sk-node-ring--1" />
                    <div className="sk-node-ring sk-node-ring--2" />
                  </>
                )}
                {skill.isUltimate && state !== 'locked' && (
                  <div className="sk-node-aura" />
                )}
              </div>
            )
          })}
        </div>

        {hovered && (
          <SkillTooltip
            skill={hovered}
            character={character}
            pos={tooltipPos}
            viewportRef={viewportRef}
          />
        )}

        <div className="sk-tree-zoom">
          <button onClick={() => handleZoomBtn(1)} title="Aproximar">
            <span className="material-symbols-outlined">add</span>
          </button>
          <span className="sk-tree-zoom-level">{Math.round(zoom * 100)}%</span>
          <button onClick={() => handleZoomBtn(-1)} title="Afastar">
            <span className="material-symbols-outlined">remove</span>
          </button>
        </div>
      </div>

      <div className="sk-tree-help">
        <span><kbd>Click</kbd> investir ponto</span>
        <span><kbd>Click direito</kbd> remover ponto</span>
        <span><kbd>Arrastar</kbd> navegar</span>
        <span><kbd>Scroll</kbd> zoom</span>
      </div>
    </div>
  )
}
