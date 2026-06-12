import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { getRaceTree, canUnlockNode, aggregateEffects, getRaceTreeNode } from '../data/raceTrees'

const STAR_COUNT = 80

function StarFieldBg({ branchColors }) {
  const stars = useMemo(() => {
    const s = []
    for (let i = 0; i < STAR_COUNT; i++) {
      s.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 4,
        duration: Math.random() * 2 + 2,
      })
    }
    return s
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {branchColors.map((color, i) => (
        <div
          key={i}
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at ${33 * (i + 1)}% 50%, ${color}12, transparent 55%)`,
          }}
        />
      ))}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(247,189,72,0.06), transparent 70%)',
        }}
      />
      {stars.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            opacity: 0.3,
            animation: `raceTreeTwinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function ParCounter({ total, spent }) {
  const available = total - spent
  const pct = total > 0 ? Math.min((spent / total) * 100, 100) : 0
  return (
    <div
      className="absolute top-4 right-4 z-30 glass-card rounded-xl px-5 py-3 flex items-center gap-3"
      style={available > 0 ? { animation: 'raceTreeGlowPulse 2.5s ease-in-out infinite' } : {}}
    >
      <span
        className="material-symbols-outlined text-xl"
        style={{
          color: available > 0 ? '#f7bd48' : '#6b6b6b',
          animation: available > 0 ? 'raceTreeParBounce 2s ease-in-out infinite' : 'none',
        }}
      >
        diamond
      </span>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-mono">
            Pontos Ancestrais
          </span>
        </div>
        <span className="font-mono text-lg font-bold leading-none">
          <span className={available > 0 ? 'text-primary' : 'text-on-surface-variant'}>
            {available}
          </span>
          <span className="text-on-surface-variant mx-1">/</span>
          <span className="text-on-surface">{total}</span>
        </span>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: pct >= 100
                ? 'linear-gradient(90deg, #4ade80, #22c55e)'
                : 'linear-gradient(90deg, #f7bd48, #f59e0b)',
              boxShadow: pct > 0 ? '0 0 6px rgba(247,189,72,0.3)' : 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}

const STAT_LABELS = { vida: 'Vida', energia: 'Energia', pe: 'PE', regen: 'Regen', ca: 'CA' }

function effectIcon(type) {
  if (type === 'attr') return 'tune'
  if (type === 'vida') return 'favorite'
  if (type === 'energia') return 'bolt'
  if (type === 'pe') return 'auto_awesome'
  if (type === 'regen') return 'healing'
  if (type === 'ca') return 'shield'
  if (type === 'pericia') return 'school'
  if (type === 'evolution') return 'arrow_upward'
  if (type === 'habilidade') return 'auto_fix_high'
  return 'circle'
}

function formatEffect(effect) {
  if (effect.type === 'attr') return `+${effect.value} ${effect.attr}`
  if (effect.type === 'vida') return `+${effect.value} Vida`
  if (effect.type === 'energia') return `+${effect.value} Energia`
  if (effect.type === 'pe') return `+${effect.value} PE`
  if (effect.type === 'regen') return `+${effect.value} Regen/turn`
  if (effect.type === 'ca') return `+${effect.value} CA`
  if (effect.type === 'pericia') return `+${effect.value} ${effect.pericia}`
  if (effect.type === 'evolution') return `+${effect.value} ${(STAT_LABELS[effect.stat] || effect.stat)} (evolução)`
  if (effect.type === 'habilidade') return effect.nome
  return ''
}

function effectColor(type) {
  if (type === 'attr') return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
  if (type === 'vida') return 'text-green-400 bg-green-400/10 border-green-400/20'
  if (type === 'energia') return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20'
  if (type === 'pe') return 'text-orange-400 bg-orange-400/10 border-orange-400/20'
  if (type === 'regen') return 'text-rose-400 bg-rose-400/10 border-rose-400/20'
  if (type === 'ca') return 'text-purple-400 bg-purple-400/10 border-purple-400/20'
  if (type === 'pericia') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
  if (type === 'evolution') return 'text-yellow-300 bg-yellow-300/10 border-yellow-300/20'
  if (type === 'habilidade') return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  return 'text-on-surface-variant bg-white/5 border-white/10'
}

const EFFECT_SORT_ORDER = { attr: 0, vida: 1, energia: 2, pe: 3, regen: 4, ca: 5, pericia: 6, evolution: 7, habilidade: 8 }

function NodeTooltipContent({ node, state, branch, onUnlock, readOnly, raceId }) {
  if (!node) return null

  const reqNames = node.requires.map(reqId => {
    const rn = getRaceTreeNode(raceId, reqId)
    return rn ? rn.name : reqId
  })

  const baseNode = node.upgradeOf ? getRaceTreeNode(raceId, node.upgradeOf) : null

  return (
    <div
      className="glass-card rounded-xl w-80 z-50 overflow-hidden"
      style={{
        animation: 'raceTreeFadeIn 0.15s ease-out',
        borderColor: branch?.color ? `${branch.color}40` : undefined,
      }}
    >
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="font-cinzel text-sm text-primary leading-tight font-bold">{node.name}</h4>
          <div className="flex items-center gap-1.5 shrink-0">
            {node.upgradeOf && (
              <span
                className="text-[9px] font-mono rounded px-1.5 py-0.5 whitespace-nowrap"
                style={{
                  color: '#fde047',
                  background: 'rgba(253,224,71,0.1)',
                  border: '1px solid rgba(253,224,71,0.25)',
                  textShadow: '0 0 8px rgba(253,224,71,0.2)',
                }}
              >
                Evolução
              </span>
            )}
            {node.cost === 2 && (
              <span className="material-symbols-outlined text-primary text-sm">star</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 mb-2">
          {branch && (
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: branch.color, background: `${branch.color}15`, border: `1px solid ${branch.color}25` }}>
              {branch.name}
            </span>
          )}
          <span className="text-[9px] font-mono text-on-surface-variant">
            Tier {node.tier}
          </span>
        </div>
      </div>

      <div className="px-4 pb-3">
        <p className="text-xs text-on-surface-variant leading-relaxed">{node.desc}</p>
      </div>

      {baseNode && (
        <div className="mx-4 mb-3 px-2.5 py-2 rounded-lg" style={{ background: 'rgba(253,224,71,0.06)', border: '1px solid rgba(253,224,71,0.15)' }}>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-yellow-300" style={{ fontSize: 13 }}>arrow_upward</span>
            <span className="text-[10px] font-mono text-yellow-300/90">
              Eleva: <span className="text-yellow-300 font-bold">{baseNode.name}</span>
            </span>
          </div>
          {node.effects.filter(e => e.type === 'evolution').map((eff, i) => (
            <div key={i} className="mt-1 flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-yellow-300/70">
                ⬆ +{eff.value} {STAT_LABELS[eff.stat] || eff.stat}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {node.effects.map((eff, i) => {
            const evoBase = eff.type === 'evolution' ? baseNode : null
            return (
              <span
                key={i}
                className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${effectColor(eff.type)}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>{effectIcon(eff.type)}</span>
                {formatEffect(eff)}
                {evoBase && <span className="text-[8px] opacity-60 ml-0.5">({evoBase.name})</span>}
              </span>
            )
          })}
        </div>
      </div>

      <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-xs font-mono text-on-surface-variant">
          Custo: <span className="text-primary">{node.cost} PAR</span>
        </span>

        {state === 'available' && !readOnly && (
          <button
            onClick={(e) => { e.stopPropagation(); onUnlock(node.id) }}
            className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 hover:border-primary/50 active:scale-95 transition-all"
          >
            Comprar
          </button>
        )}
        {state === 'unlocked' && (
          <span className="flex items-center gap-1 text-xs font-mono text-green-400">
            <span className="material-symbols-outlined text-sm">check</span>
            Desbloqueado
          </span>
        )}
        {state === 'locked' && reqNames.length > 0 && (
          <span className="flex items-center gap-1 text-xs font-mono text-on-surface-variant text-right leading-tight max-w-[140px]">
            <span className="material-symbols-outlined text-sm shrink-0">lock</span>
            Requer: {reqNames.join(', ')}
          </span>
        )}
      </div>
    </div>
  )
}

function RaceNode({ node, state, branch, position, onMouseEnter, onMouseLeave, onClick, isHovered, isLinkedHover }) {
  const isUnlocked = state === 'unlocked'
  const isAvailable = state === 'available'
  const isLocked = state === 'locked'
  const size = node.cost === 2 ? 52 : 44
  const isHabilidade = node.effects.some(e => e.type === 'habilidade')
  const isEvolution = !!node.upgradeOf
  const evoColor = '#fde047'

  const color = isEvolution ? evoColor : (branch?.color || '#f7bd48')
  const showHighlight = isHovered || isLinkedHover

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        width: size,
        height: size,
        zIndex: showHighlight ? 25 : 20,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={node.name}
    >
      {isEvolution && (
        <>
          <div
            className="absolute pointer-events-none"
            style={{
              inset: -8,
              borderRadius: '50%',
              border: `1.5px dashed ${evoColor}${isUnlocked ? '70' : isAvailable ? '45' : '20'}`,
              opacity: isLocked ? 0.35 : 0.85,
              animation: (!isLocked) ? 'raceTreeEvoRing 3s ease-in-out infinite' : 'none',
            }}
          />
          {isUnlocked && (
            <div
              className="absolute pointer-events-none"
              style={{
                inset: -14,
                borderRadius: '50%',
                border: `1px solid ${evoColor}18`,
                animation: 'raceTreeEvoOrbit 8s linear infinite',
              }}
            >
              <div
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: evoColor,
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%) translateY(-50%)',
                  boxShadow: `0 0 4px ${evoColor}`,
                }}
              />
            </div>
          )}
        </>
      )}
      <div
        className={`
          relative w-full h-full flex items-center justify-center cursor-pointer
          ${isHabilidade ? 'rotate-45' : isEvolution ? 'rounded-full' : 'rounded-full'}
        `}
        style={{
          background: isUnlocked
            ? `${color}20`
            : isAvailable
              ? `${color}10`
              : 'rgba(255,255,255,0.02)',
          border: isUnlocked
            ? `2px solid ${color}90`
            : isAvailable
              ? `2px solid ${color}60`
              : `2px dashed rgba(255,255,255,0.1)`,
          boxShadow: isUnlocked
            ? `0 0 12px ${color}40, 0 0 24px ${color}15`
            : isAvailable
              ? `0 0 8px ${color}20`
              : 'none',
          opacity: isLocked ? 0.4 : 1,
          animation: isAvailable ? 'raceTreeAvailablePulse 2s ease-in-out infinite' : 'none',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
          transform: showHighlight ? 'scale(1.12)' : undefined,
        }}
      >
        {showHighlight && (
          <div
            className="absolute pointer-events-none"
            style={{
              inset: -4,
              borderRadius: isHabilidade ? '4px' : '50%',
              border: `1.5px solid ${color}50`,
              boxShadow: `0 0 12px ${color}20`,
            }}
          />
        )}
        <div className={isHabilidade ? '-rotate-45' : ''}>
          {isUnlocked ? (
            <span className="material-symbols-outlined" style={{ color, fontSize: 18 }}>
              {isEvolution ? 'arrow_upward' : 'check'}
            </span>
          ) : isAvailable ? (
            <span className="material-symbols-outlined" style={{ color: `${color}90`, fontSize: 16 }}>
              {isEvolution ? 'arrow_upward' : (branch?.icon || 'auto_fix_high')}
            </span>
          ) : (
            <span className="material-symbols-outlined text-white/20" style={{ fontSize: 14 }}>lock</span>
          )}
        </div>

        {node.cost === 2 && (
          <div
            className={`
              absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center
              ${isUnlocked ? 'bg-primary/30 text-primary' : 'bg-white/10 text-on-surface-variant'}
              ${isHabilidade ? '-rotate-45' : ''}
            `}
            style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
          >
            ★
          </div>
        )}
      </div>

      {showHighlight && (
        <div
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none"
          style={{ bottom: size + 8 }}
        >
          <span
            className="font-cinzel text-[11px] px-2.5 py-1 rounded-md inline-block"
            style={{
              color,
              background: 'rgba(14,14,15,0.95)',
              border: `1px solid ${color}40`,
              boxShadow: `0 0 12px ${color}15`,
            }}
          >
            {node.name}
          </span>
        </div>
      )}
    </div>
  )
}

function EffectsPreview({ effectsPreview, unlockedNodes, raceId }) {
  const effects = effectsPreview || aggregateEffects(unlockedNodes || [], raceId)
  if (!effects) return null

  const pills = []

  if (effects.attrs) {
    Object.entries(effects.attrs).forEach(([attr, val]) => {
      if (val > 0) pills.push({ label: `+${val} ${attr}`, type: 'attr', icon: 'tune' })
    })
  }
  if (effects.vida > 0) pills.push({ label: `+${effects.vida} Vida`, type: 'vida', icon: 'favorite' })
  if (effects.energia > 0) pills.push({ label: `+${effects.energia} Energia`, type: 'energia', icon: 'bolt' })
  if (effects.pe > 0) pills.push({ label: `+${effects.pe} PE`, type: 'pe', icon: 'auto_awesome' })
  if (effects.regen > 0) pills.push({ label: `+${effects.regen} Regen/turn`, type: 'regen', icon: 'healing' })
  if (effects.ca > 0) pills.push({ label: `+${effects.ca} CA`, type: 'ca', icon: 'shield' })
  if (effects.pericias) {
    Object.entries(effects.pericias).forEach(([p, v]) => {
      if (v > 0) pills.push({ label: `+${v} ${p}`, type: 'pericia', icon: 'school' })
    })
  }

  pills.sort((a, b) => (EFFECT_SORT_ORDER[a.type] ?? 9) - (EFFECT_SORT_ORDER[b.type] ?? 9))

  if (pills.length === 0) {
    return (
      <div className="glass-card rounded-xl p-4 flex items-center justify-center min-h-[60px]">
        <span className="text-xs text-on-surface-variant/50 font-mono">Nenhum bônus ativo</span>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-cinzel text-xs text-primary uppercase tracking-widest">
          Bônus Ativos
        </h4>
        <span className="text-[9px] font-mono text-on-surface-variant/50">
          {pills.length} {pills.length === 1 ? 'efeito' : 'efeitos'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {pills.map((pill, i) => (
          <span
            key={i}
            className={`text-[10px] font-mono px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${effectColor(pill.type)}`}
            style={{ animation: `raceTreePillIn 0.2s ease-out ${i * 40}ms both` }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{pill.icon}</span>
            {pill.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function TreeConnections({ connections, nodesMap, unlockedSet, hoveredNode, raceId }) {
  const evoLinkedIds = useMemo(() => {
    if (!hoveredNode) return new Set()
    const hNode = nodesMap[hoveredNode]
    if (!hNode) return new Set()
    const s = new Set()
    if (hNode.upgradeOf) {
      s.add(hNode.upgradeOf)
    }
    for (const n of Object.values(nodesMap)) {
      if (n.upgradeOf === hoveredNode) s.add(n.id)
    }
    return s
  }, [hoveredNode, nodesMap])

  const evoConnections = useMemo(() => {
    const set = new Set()
    for (const n of Object.values(nodesMap)) {
      if (n.upgradeOf && nodesMap[n.upgradeOf]) {
        set.add(`${n.upgradeOf}->${n.id}`)
      }
    }
    return set
  }, [nodesMap])

  return (
    <svg className="absolute inset-0 pointer-events-none z-10" style={{ overflow: 'visible', width: '100%', height: '100%' }}>
      {connections.map(([fromId, toId], i) => {
        const from = nodesMap[fromId]
        const to = nodesMap[toId]
        if (!from || !to) return null
        const bothUnlocked = unlockedSet.has(fromId) && unlockedSet.has(toId)
        const oneUnlocked = unlockedSet.has(fromId) || unlockedSet.has(toId)
        const branch = from.branchData
        const color = branch?.color || '#f7bd48'
        const evoKey = `${fromId}->${toId}`
        const isEvoLink = evoConnections.has(evoKey)
        const isHighlighted = hoveredNode && (fromId === hoveredNode || toId === hoveredNode)

        return (
          <line
            key={i}
            x1={from.px}
            y1={from.py}
            x2={to.px}
            y2={to.py}
            stroke={isEvoLink ? '#fde047' : color}
            strokeOpacity={isHighlighted ? 0.6 : bothUnlocked ? 0.5 : oneUnlocked ? 0.2 : 0.08}
            strokeWidth={isHighlighted ? 2.5 : bothUnlocked ? 2 : 1}
            strokeDasharray={isEvoLink ? '6,3' : bothUnlocked ? 'none' : '4,4'}
            style={{ transition: 'stroke-opacity 0.15s ease, stroke-width 0.15s ease' }}
          />
        )
      })}
      {Object.values(nodesMap).map(node => {
        if (!node.upgradeOf || !nodesMap[node.upgradeOf]) return null
        const from = nodesMap[node.upgradeOf]
        const to = node
        const bothUnlocked = unlockedSet.has(from.id) && unlockedSet.has(to.id)
        const oneUnlocked = unlockedSet.has(from.id) || unlockedSet.has(to.id)
        const isHighlighted = hoveredNode && (from.id === hoveredNode || to.id === hoveredNode)
        return (
          <line
            key={`evo-${node.id}`}
            x1={from.px}
            y1={from.py}
            x2={to.px}
            y2={to.py}
            stroke="#fde047"
            strokeOpacity={isHighlighted ? 0.7 : bothUnlocked ? 0.35 : oneUnlocked ? 0.18 : 0.06}
            strokeWidth={isHighlighted ? 2.5 : 1.5}
            strokeDasharray="3,4"
            style={{ transition: 'stroke-opacity 0.15s ease, stroke-width 0.15s ease' }}
          />
        )
      })}
    </svg>
  )
}

export default function RaceSkillTree({
  raceId,
  unlockedNodes = [],
  parTotal = 0,
  parSpent = 0,
  onUnlock,
  readOnly = false,
  effectsPreview,
}) {
  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltipNode, setTooltipNode] = useState(null)
  const tooltipTimeout = useRef(null)

  const tree = useMemo(() => getRaceTree(raceId), [raceId])
  const unlockedSet = useMemo(() => new Set(unlockedNodes), [unlockedNodes])

  const branchMap = useMemo(() => {
    if (!tree) return {}
    const m = {}
    tree.branches.forEach(b => { m[b.id] = b })
    return m
  }, [tree])

  const TREE_W = 900
  const TREE_H = 600
  const PAD_TOP = 70

  const nodesMap = useMemo(() => {
    if (!tree) return {}
    const m = {}
    tree.nodes.forEach(node => {
      const px = ((node.x + 0.8) / 1.6) * TREE_W
      const py = node.y * TREE_H + PAD_TOP
      m[node.id] = {
        ...node,
        px,
        py,
        branchData: branchMap[node.branch],
      }
    })
    return m
  }, [tree, branchMap])

  const getNodeState = useCallback((nodeId) => {
    if (unlockedSet.has(nodeId)) return 'unlocked'
    if (canUnlockNode(raceId, nodeId, unlockedNodes)) {
      const node = nodesMap[nodeId]
      const available = parTotal - parSpent
      if (node && node.cost <= available) return 'available'
    }
    return 'locked'
  }, [raceId, unlockedSet, unlockedNodes, nodesMap, parTotal, parSpent])

  const handleMouseEnter = useCallback((nodeId) => {
    setHoveredNode(nodeId)
    clearTimeout(tooltipTimeout.current)
    tooltipTimeout.current = setTimeout(() => {
      setTooltipNode(nodeId)
    }, 300)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null)
    clearTimeout(tooltipTimeout.current)
    setTooltipNode(null)
  }, [])

  const handleClick = useCallback((nodeId) => {
    const state = getNodeState(nodeId)
    if (state === 'available' && !readOnly && onUnlock) {
      onUnlock(nodeId)
    }
    clearTimeout(tooltipTimeout.current)
    setTooltipNode(prev => prev === nodeId ? null : nodeId)
  }, [getNodeState, readOnly, onUnlock])

  useEffect(() => {
    return () => clearTimeout(tooltipTimeout.current)
  }, [])

  if (!tree || tree.nodes.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3">park</span>
        <h3 className="font-cinzel text-lg text-on-surface mb-2">Árvore Indisponível</h3>
        <p className="text-sm text-on-surface-variant">
          A árvore de habilidades raciais para {raceId} ainda não foi implementada.
        </p>
      </div>
    )
  }

  const branchColors = tree.branches.map(b => b.color)
  const tooltipData = tooltipNode ? nodesMap[tooltipNode] : null

  const linkedHoverIds = useMemo(() => {
    if (!hoveredNode) return new Set()
    const hNode = nodesMap[hoveredNode]
    if (!hNode) return new Set()
    const s = new Set()
    if (hNode.upgradeOf) s.add(hNode.upgradeOf)
    for (const n of Object.values(nodesMap)) {
      if (n.upgradeOf === hoveredNode) s.add(n.id)
    }
    return s
  }, [hoveredNode, nodesMap])

  return (
    <div className="relative w-full flex flex-col gap-4">
      <div
        className="relative w-full overflow-x-auto overflow-y-hidden rounded-xl border border-white/5"
        style={{ minHeight: 640, background: '#0a0a0b' }}
      >
        <ParCounter total={parTotal} spent={parSpent} />

        <div
          className="relative mx-auto"
          style={{
            width: TREE_W,
            height: TREE_H + PAD_TOP + 30,
            minWidth: 800,
          }}
        >
          <StarFieldBg branchColors={branchColors} />

          <div className="absolute top-3 left-5 z-20">
            <h2 className="font-cinzel text-lg text-primary">{tree.name}</h2>
            <p className="text-[10px] text-on-surface-variant font-mono">
              Árvore de Habilidades Raciais
            </p>
          </div>

          <div className="absolute top-4 left-0 right-0 z-20 pointer-events-none">
            {tree.branches.map((branch) => {
              const branchNodes = tree.nodes.filter(n => n.branch === branch.id)
              if (branchNodes.length === 0) return null
              const avgX = branchNodes.reduce((s, n) => s + ((n.x + 0.8) / 1.6) * TREE_W, 0) / branchNodes.length
              return (
                <div
                  key={branch.id}
                  className="absolute flex flex-col items-center gap-1"
                  style={{ left: avgX, transform: 'translateX(-50%)' }}
                >
                  <span className="material-symbols-outlined text-lg" style={{ color: branch.color, opacity: 0.6 }}>
                    {branch.icon}
                  </span>
                  <span
                    className="text-[9px] font-cinzel uppercase tracking-[0.12em] whitespace-nowrap"
                    style={{ color: branch.color, opacity: 0.4 }}
                  >
                    {branch.name}
                  </span>
                </div>
              )
            })}
          </div>

          <TreeConnections
            connections={tree.connections}
            nodesMap={nodesMap}
            unlockedSet={unlockedSet}
            hoveredNode={hoveredNode}
            raceId={raceId}
          />

          {tree.nodes.map(node => {
            const pos = nodesMap[node.id]
            if (!pos) return null
            return (
              <RaceNode
                key={node.id}
                node={node}
                state={getNodeState(node.id)}
                branch={branchMap[node.branch]}
                position={{ x: pos.px, y: pos.py }}
                onMouseEnter={() => handleMouseEnter(node.id)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleClick(node.id)}
                isHovered={hoveredNode === node.id}
                isLinkedHover={linkedHoverIds.has(node.id)}
              />
            )
          })}

          {tooltipData && (
            <div
              className="absolute z-50"
              style={{
                left: Math.min(tooltipData.px + 30, TREE_W - 300),
                top: Math.max(tooltipData.py - 40, PAD_TOP),
                animation: 'raceTreeFadeIn 0.15s ease-out',
              }}
              onMouseEnter={() => clearTimeout(tooltipTimeout.current)}
              onMouseLeave={handleMouseLeave}
            >
              <NodeTooltipContent
                node={tooltipData}
                state={getNodeState(tooltipNode)}
                branch={branchMap[tooltipData.branch]}
                onUnlock={onUnlock}
                readOnly={readOnly}
                raceId={raceId}
              />
            </div>
          )}

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-6 pointer-events-none">
            {[1, 2, 3, 4].map(tier => (
              <div key={tier} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: `rgba(247,189,72,${0.15 + tier * 0.12})`,
                    boxShadow: `0 0 4px rgba(247,189,72,${0.1 + tier * 0.05})`,
                  }}
                />
                <span className="text-[9px] font-mono text-on-surface-variant/50">
                  Tier {tier}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <EffectsPreview
            effectsPreview={effectsPreview}
            unlockedNodes={unlockedNodes}
            raceId={raceId}
          />
        </div>

        <div className="glass-card rounded-xl p-4 md:w-64">
          <h4 className="font-cinzel text-xs text-primary uppercase tracking-widest mb-3">
            Legenda
          </h4>
          <div className="flex flex-col gap-2">
            {[
              { border: '2px solid #8b5cf6', bg: '#8b5cf620', label: 'Disponível', icon: 'radio_button_checked' },
              { border: '2px dashed rgba(255,255,255,0.15)', bg: 'rgba(255,255,255,0.02)', label: 'Bloqueado', icon: 'lock' },
              { border: '2px solid #4ade80', bg: '#4ade8020', label: 'Desbloqueado', icon: 'check_circle' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ border: item.border, background: item.bg }}
                >
                  <span className="material-symbols-outlined text-white/50" style={{ fontSize: 12 }}>
                    {item.icon}
                  </span>
                </div>
                <span className="text-[11px] text-on-surface-variant">{item.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0 rotate-45 border border-amber-400/30 bg-amber-400/10">
                <span className="material-symbols-outlined -rotate-45 text-amber-400/50" style={{ fontSize: 10 }}>
                  auto_fix_high
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant">Habilidade Especial</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{
                  border: '1.5px dashed rgba(253,224,71,0.5)',
                  background: 'rgba(253,224,71,0.08)',
                  boxShadow: '0 0 6px rgba(253,224,71,0.12)',
                }}
              >
                <span className="material-symbols-outlined text-yellow-300/70" style={{ fontSize: 11 }}>
                  arrow_upward
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant">Evolução (eleva nó base)</span>
            </div>
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-[9px] font-mono text-on-surface-variant/50 uppercase tracking-wider">Cores de Efeito</span>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  { color: 'text-green-400 bg-green-400/10 border-green-400/20', icon: 'favorite', label: 'Vida' },
                  { color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', icon: 'bolt', label: 'Energia' },
                  { color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: 'auto_awesome', label: 'PE' },
                  { color: 'text-rose-400 bg-rose-400/10 border-rose-400/20', icon: 'healing', label: 'Regen' },
                  { color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', icon: 'shield', label: 'CA' },
                  { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: 'tune', label: 'Atributo' },
                  { color: 'text-yellow-300 bg-yellow-300/10 border-yellow-300/20', icon: 'arrow_upward', label: 'Evolução' },
                ].map((swatch, i) => (
                  <span
                    key={i}
                    className={`text-[8px] font-mono px-1.5 py-0.5 rounded border flex items-center gap-0.5 ${swatch.color}`}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 9 }}>{swatch.icon}</span>
                    {swatch.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
