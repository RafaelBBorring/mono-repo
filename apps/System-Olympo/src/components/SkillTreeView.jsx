import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { adaptRaceTree } from '../utils/raceTreeAdapter'
import { createEngine } from '../utils/skillTreeEngine'
import { calcPARTotal, calcRaceTreePARSpent } from '../utils/calculator'

const TIER_NAMES = ['Despertar', 'Tier I', 'Tier II', 'Tier III', 'Suprema']

function getNodeSize(skill) {
  if (skill.isUltimate) return 62
  if (skill.isKeystone) return 58
  if (skill.isEvolution) return 40
  return 50
}

function getConnectionPath(from, to) {
  const midY = (from.y + to.y) / 2
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
}

function SkillTooltip({ skill, character, pos, viewportRef, engine, skillTree }) {
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

  const rank = engine.getRank(character, skill.id)
  const state = engine.getSkillState(skill.id, character)
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
            const dep = skillTree[depId]
            const met = engine.isUnlocked(character, depId)
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
            {cost} {cost === 1 ? 'PAR' : 'PAR'}
          </span>
        ) : (
          <span className="sk-tooltip-cost free">Gratuito</span>
        )}
        {state === 'available' && <span className="sk-tooltip-action">Click para desbloquear</span>}
        {state === 'maxed' && <span className="sk-tooltip-action maxed">Desbloqueado</span>}
        {state === 'locked' && <span className="sk-tooltip-action locked">Bloqueado</span>}
      </div>
    </div>
  )
}

export default function SkillTreeView({ char, update }) {
  const raceId = char?.raca

  const treeData = useMemo(() => adaptRaceTree(raceId), [raceId])
  const engine = useMemo(() => treeData ? createEngine(treeData.skillTree) : null, [treeData])

  const unlocked = char?.raceTreeUnlocked || []
  const parTotal = useMemo(() =>
    calcPARTotal(char?.classe, char?.nivel || 1, char?.progressaoChoices, char?.modulosAdquiridos, char),
    [char?.classe, char?.nivel, char?.progressaoChoices, char?.modulosAdquiridos, char]
  )
  const parSpent = useMemo(() => calcRaceTreePARSpent(unlocked, raceId), [unlocked, raceId])
  const parAvailable = parTotal - parSpent

  const engineState = useMemo(() => ({
    skillPoints: parAvailable,
    unlockedSkills: Object.fromEntries(unlocked.map(id => [id, 1])),
  }), [parAvailable, unlocked])

  const skills = useMemo(() => engine ? engine.getAllSkills() : [], [engine])

  const tierLabels = useMemo(() => {
    if (!treeData) return []
    const tierYs = {}
    Object.values(treeData.skillTree).forEach(s => {
      if (s.isEvolution) return
      if (!tierYs[s.tier] || s.position.y < tierYs[s.tier]) {
        tierYs[s.tier] = s.position.y
      }
    })
    return Object.entries(tierYs)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .map(([t, y]) => ({ y, text: TIER_NAMES[parseInt(t)] || `T${t}` }))
  }, [treeData])

  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [hovered, setHovered] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [justUnlocked, setJustUnlocked] = useState(null)
  const [dragging, setDragging] = useState(false)

  const viewportRef = useRef(null)
  const dragRef = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0, moved: false })

  useEffect(() => {
    setPan({ x: 0, y: 0 })
    setZoom(1)
    setHovered(null)
  }, [raceId])

  const handleInvest = useCallback((nodeId) => {
    if (!engine || !engine.canUnlockSkill(engineState, nodeId)) return
    update({ raceTreeUnlocked: [...unlocked, nodeId] })
    setJustUnlocked(nodeId)
  }, [engine, engineState, unlocked, update])

  const handleRefund = useCallback((nodeId) => {
    if (!engine || !engine.canRefundPoint(engineState, nodeId)) return
    update({ raceTreeUnlocked: unlocked.filter(id => id !== nodeId) })
  }, [engine, engineState, unlocked, update])

  const handleCenter = useCallback(() => {
    setPan({ x: 0, y: 0 })
    setZoom(1)
  }, [])

  const zoomAtPoint = useCallback((cx, cy, delta) => {
    setZoom(prevZoom => {
      const newZoom = Math.max(0.25, Math.min(2.5, prevZoom + delta))
      if (newZoom === prevZoom) return prevZoom
      const sc = newZoom / prevZoom
      setPan(prevPan => ({
        x: cx - (cx - prevPan.x) * sc,
        y: cy - (cy - prevPan.y) * sc,
      }))
      return newZoom
    })
  }, [])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const rect = viewportRef.current?.getBoundingClientRect()
    if (!rect) return
    zoomAtPoint(e.clientX - rect.left, e.clientY - rect.top, -e.deltaY * 0.0015)
  }, [zoomAtPoint])

  const handleZoomBtn = useCallback((dir) => {
    const rect = viewportRef.current?.getBoundingClientRect()
    const cx = rect ? rect.width / 2 : 0
    const cy = rect ? rect.height / 2 : 0
    zoomAtPoint(cx, cy, dir * 0.2)
  }, [zoomAtPoint])

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.sk-node')) return
    dragRef.current = {
      active: true, startX: e.clientX, startY: e.clientY,
      panX: pan.x, panY: pan.y, moved: false,
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
    if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    setHovered(skill)
  }, [])

  useEffect(() => {
    if (!justUnlocked) return
    const t = setTimeout(() => setJustUnlocked(null), 600)
    return () => clearTimeout(t)
  }, [justUnlocked])

  useEffect(() => {
    if (!viewportRef.current || !treeData) return
    const vpW = viewportRef.current.clientWidth
    if (vpW > 0 && vpW < treeData.canvasSize.width) {
      setZoom(Math.max(0.25, (vpW - 40) / treeData.canvasSize.width))
    }
  }, [treeData])

  if (!raceId || !treeData || !engine) {
    return (
      <div className="sk-tree-wrapper" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="sk-tree-empty">
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#444' }}>account_tree</span>
          <p style={{ fontFamily: 'Newsreader, serif', color: '#777', marginTop: 12, fontSize: '0.9rem' }}>
            Selecione uma raça na Etapa 2 para visualizar a árvore de habilidades.
          </p>
        </div>
      </div>
    )
  }

  const { width: CANVAS_W, height: CANVAS_H } = treeData.canvasSize
  const branches = treeData.treeMeta.branches

  return (
    <div className={`sk-tree-wrapper ${dragging ? 'dragging' : ''}`}>
      <div className="sk-tree-hud">
        <div className="sk-tree-hud-left">
          <h2 className="sk-tree-title">
            <span className="material-symbols-outlined">account_tree</span>
            {treeData.treeMeta.name}
          </h2>
          <span className="sk-tree-subtitle">{treeData.treeMeta.subtitle}</span>
        </div>
        <div className="sk-tree-hud-right">
          <div className={`sk-tree-points ${parAvailable <= 0 ? 'is-empty' : ''}`}>
            <span className="material-symbols-outlined">stars</span>
            <span className="sk-tree-points-num">{parAvailable}</span>
            <span className="sk-tree-points-label">PAR</span>
          </div>
          <div className="sk-tree-spent">
            {parSpent}/{parTotal} investidos
          </div>
          <button className="sk-tree-btn" onClick={handleCenter} title="Centralizar">
            <span className="material-symbols-outlined">center_focus_strong</span>
          </button>
        </div>
      </div>

      <div className="sk-tree-legend">
        {Object.entries(branches).map(([id, br]) => {
          const prog = engine.getBranchProgress(engineState, id)
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
            {treeData.connections.map(([fromId, toId], i) => {
              const from = treeData.skillTree[fromId]
              const to = treeData.skillTree[toId]
              if (!from || !to) return null
              const connState = engine.getConnectionState(fromId, toId, engineState)
              return (
                <path
                  key={i}
                  d={getConnectionPath(from.position, to.position)}
                  className={`sk-conn sk-conn--${connState}`}
                />
              )
            })}
          </svg>

          {tierLabels.map((tier, i) => (
            <div key={i} className="sk-tier-label" style={{ top: tier.y - 8 }}>
              {tier.text}
            </div>
          ))}

          {skills.map(skill => {
            const state = engine.getSkillState(skill.id, engineState)
            const rank = engine.getRank(engineState, skill.id)
            const br = branches[skill.branch]
            const size = getNodeSize(skill)
            return (
              <div
                key={skill.id}
                className={`sk-node sk-node--${state}${justUnlocked === skill.id ? ' sk-node--pop' : ''}${skill.isUltimate ? ' sk-node--ultimate' : ''}${skill.isKeystone ? ' sk-node--keystone' : ''}${skill.isEvolution ? ' sk-node--evo' : ''}`}
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
            character={engineState}
            pos={tooltipPos}
            viewportRef={viewportRef}
            engine={engine}
            skillTree={treeData.skillTree}
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
        <span><kbd>Click</kbd> desbloquear (custa PAR)</span>
        <span><kbd>Click direito</kbd> remover ponto</span>
        <span><kbd>Arrastar</kbd> navegar</span>
        <span><kbd>Scroll</kbd> zoom</span>
      </div>
    </div>
  )
}
