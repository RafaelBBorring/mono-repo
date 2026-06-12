import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { getRaceTree, canUnlockNode, getRaceTreeNode } from '../data/raceTrees'
import { calcPARTotal, calcRaceTreePARSpent } from '../utils/calculator'

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
  if (type === 'attr') return '#60a5fa'
  if (type === 'vida') return '#4ade80'
  if (type === 'energia') return '#22d3ee'
  if (type === 'pe') return '#fb923c'
  if (type === 'regen') return '#fb7185'
  if (type === 'ca') return '#c084fc'
  if (type === 'pericia') return '#34d399'
  if (type === 'evolution') return '#fde047'
  if (type === 'habilidade') return '#fbbf24'
  return '#9ca3af'
}

function isKeystone(node) {
  return (node.effects || []).some(e => e.type === 'habilidade')
}

function nodeRadius(node) {
  if (node.upgradeOf) return 0.38
  if (isKeystone(node)) return 0.62
  return 0.48
}

function computeLayout(tree) {
  const positions = {}
  const BRANCH_W = 15
  const TIER_H = 6.5
  const NODE_GAP = 3.4

  const branchCount = tree.branches.length
  tree.branches.forEach((branch, bi) => {
    const colCenter = (bi - (branchCount - 1) / 2) * BRANCH_W
    const branchNodes = tree.nodes.filter(n => n.branch === branch.id)

    const tierMap = {}
    branchNodes.forEach(n => {
      const t = n.tier || 1
      if (!tierMap[t]) tierMap[t] = []
      tierMap[t].push(n)
    })

    Object.entries(tierMap).forEach(([tierStr, nodes]) => {
      const tier = parseInt(tierStr)
      const y = (5 - tier) * TIER_H

      const regular = nodes.filter(n => !n.upgradeOf)
      const upgrades = nodes.filter(n => n.upgradeOf)

      const count = regular.length
      const totalW = Math.max(0, (count - 1) * NODE_GAP)
      regular.forEach((node, i) => {
        positions[node.id] = {
          x: colCenter - totalW / 2 + i * NODE_GAP,
          y,
        }
      })

      upgrades.forEach((node, i) => {
        const parentPos = positions[node.upgradeOf]
        if (parentPos) {
          const side = (i % 2 === 0) ? 1 : -1
          positions[node.id] = {
            x: parentPos.x + side * NODE_GAP * 0.55,
            y: parentPos.y - TIER_H * 0.38,
          }
        } else {
          positions[node.id] = { x: colCenter, y: y - TIER_H * 0.38 }
        }
      })
    })
  })

  return positions
}

function createBezierCurve(start, end) {
  const dy = end.y - start.y
  const ctrlOffset = Math.abs(dy) * 0.5
  return new THREE.CubicBezierCurve3(
    new THREE.Vector3(start.x, start.y, 0),
    new THREE.Vector3(start.x, start.y - Math.sign(dy) * ctrlOffset * 0.6, 0),
    new THREE.Vector3(end.x, end.y + Math.sign(dy) * ctrlOffset * 0.4, 0),
    new THREE.Vector3(end.x, end.y, 0),
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
        <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-mono">
          Pontos Ancestrais
        </span>
        <span className="font-mono text-lg font-bold leading-none">
          <span className={available > 0 ? 'text-primary' : 'text-on-surface-variant'}>{available}</span>
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

function HoverTooltip({ node, state, branch, raceId, pos, onUnlock, viewportW, viewportH }) {
  if (!node) return null
  const baseNode = node.upgradeOf ? getRaceTreeNode(raceId, node.upgradeOf) : null
  const reqNames = (node.requires || []).map(reqId => {
    const rn = getRaceTreeNode(raceId, reqId)
    return rn ? rn.name : reqId
  })
  const TW = 300
  const margin = 16
  let left = pos.x + 18
  if (left + TW > viewportW - margin) left = pos.x - TW - 18
  let top = pos.y - 16
  const above = pos.y - 220 > margin
  const flipDown = !above
  if (flipDown) top = pos.y + 22
  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left, top, width: TW,
        animation: 'raceTreeFadeIn 0.12s ease-out',
        transform: flipDown ? undefined : 'translateY(-100%)',
      }}
    >
      <div
        className="glass-card rounded-xl overflow-hidden"
        style={{ borderColor: branch?.color ? `${branch.color}50` : undefined }}
      >
        <div className="p-4 pb-2.5">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className="font-cinzel text-sm text-primary leading-tight font-bold">{node.name}</h4>
            <div className="flex items-center gap-1 shrink-0">
              {node.upgradeOf && (
                <span className="text-[9px] font-mono rounded px-1.5 py-0.5 whitespace-nowrap"
                  style={{ color: '#fde047', background: 'rgba(253,224,71,0.1)', border: '1px solid rgba(253,224,71,0.25)' }}>
                  Evolução
                </span>
              )}
              <span className="flex items-center gap-0.5 text-[10px] font-mono text-primary">
                <span className="material-symbols-outlined text-[13px]">diamond</span>
                {node.cost}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {branch && (
              <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ color: branch.color, background: `${branch.color}15`, border: `1px solid ${branch.color}25` }}>
                {branch.name}
              </span>
            )}
            <span className="text-[9px] font-mono text-on-surface-variant">Tier {node.tier}</span>
          </div>
        </div>
        <div className="px-4 pb-2.5">
          <p className="text-xs text-on-surface-variant leading-relaxed">{node.desc}</p>
        </div>
        <div className="px-4 pb-2.5 flex flex-wrap gap-1.5">
          {(node.effects || []).slice().sort((a, b) => (a.type === 'evolution' ? 1 : 0) - (b.type === 'evolution' ? 1 : 0)).map((eff, i) => (
            <span key={i} className="text-[10px] font-mono rounded px-1.5 py-0.5 flex items-center gap-1"
              style={{ color: effectColor(eff.type), background: `${effectColor(eff.type)}15`, border: `1px solid ${effectColor(eff.type)}25` }}>
              <span className="material-symbols-outlined text-[12px]">{effectIcon(eff.type)}</span>
              {formatEffect(eff)}
            </span>
          ))}
        </div>
        {baseNode && (
          <div className="px-4 pb-2.5 text-[10px] text-yellow-300/80 flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">arrow_upward</span>
            Melhora: <span className="text-on-surface">{baseNode.name}</span>
          </div>
        )}
        <div className="px-4 pb-3 flex items-center justify-between gap-2">
          {state === 'unlocked' ? (
            <span className="text-[10px] font-mono text-emerald-300 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">check_circle</span> Desbloqueado
            </span>
          ) : state === 'available' ? (
            <button
              onClick={(e) => { e.stopPropagation(); onUnlock(node.id) }}
              className="pointer-events-auto text-[10px] font-mono uppercase tracking-wider px-3 py-1.5 rounded-lg bg-primary text-black font-bold hover:bg-primary-fixed transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">add_circle</span> Desbloquear
            </button>
          ) : (
            <span className="text-[10px] font-mono text-red-300/70 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">lock</span>
              {reqNames.length > 0 ? `Requer: ${reqNames.join(', ')}` : 'Pontos insuficientes'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RaceSkillTree({ char, update }) {
  const raceId = char?.raca || null
  const unlocked = char?.raceTreeUnlocked || []
  const tree = useMemo(() => getRaceTree(raceId), [raceId])
  const layout = useMemo(() => tree ? computeLayout(tree) : null, [tree])

  const parTotal = useMemo(
    () => calcPARTotal(char?.classe, char?.nivel || 1, char?.progressaoChoices, char?.modulosAdquiridos, char),
    [char?.classe, char?.nivel, char?.progressaoChoices, char?.modulosAdquiridos, char]
  )
  const parSpent = useMemo(() => calcRaceTreePARSpent(unlocked, raceId), [unlocked, raceId])
  const available = parTotal - parSpent

  const containerRef = useRef(null)
  const threeRef = useRef(null)
  const stateRef = useRef({ unlocked: [], available: 0, hoveredId: null, justUnlocked: null })

  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  stateRef.current.unlocked = unlocked
  stateRef.current.available = available

  const getNodeState = useCallback((nodeId) => {
    const u = stateRef.current.unlocked
    const av = stateRef.current.available
    if (u.includes(nodeId)) return 'unlocked'
    const node = tree?.nodes.find(n => n.id === nodeId)
    if (node && canUnlockNode(raceId, nodeId, u) && node.cost <= av) return 'available'
    return 'locked'
  }, [raceId, tree])

  const handleUnlock = useCallback((nodeId) => {
    if (getNodeState(nodeId) !== 'available') return
    stateRef.current.justUnlocked = nodeId
    update({ raceTreeUnlocked: [...stateRef.current.unlocked, nodeId] })
  }, [getNodeState, update])

  const branchMap = useMemo(() => {
    if (!tree) return {}
    const m = {}
    tree.branches.forEach(b => { m[b.id] = b })
    return m
  }, [tree])

  useEffect(() => {
    if (!tree || !layout || tree.nodes.length === 0 || !containerRef.current) return undefined

    const container = containerRef.current
    const W = () => container.clientWidth || 900
    const H = () => container.clientHeight || 640

    const scene = new THREE.Scene()

    const aspect = W() / H()
    const VIEW_H = 36
    let camZoom = 1
    let camX = 0
    let camY = 15
    const camera = new THREE.OrthographicCamera(
      -VIEW_H * aspect / 2, VIEW_H * aspect / 2,
      VIEW_H / 2, -VIEW_H / 2,
      0.1, 200
    )
    function syncCamera() {
      const a = W() / H()
      camera.left = -VIEW_H * a / 2 / camZoom
      camera.right = VIEW_H * a / 2 / camZoom
      camera.top = VIEW_H / 2 / camZoom
      camera.bottom = -VIEW_H / 2 / camZoom
      camera.position.set(camX, camY, 50)
      camera.lookAt(camX, camY, 0)
      camera.zoom = camZoom
      camera.updateProjectionMatrix()
    }
    syncCamera()

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(W(), H(), false)
    container.appendChild(renderer.domElement)
    renderer.domElement.style.cursor = 'grab'

    const nodeGroup = new THREE.Group()
    scene.add(nodeGroup)

    const STAR_N = 500
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(STAR_N * 3)
    const starCol = new Float32Array(STAR_N * 3)
    const starSize = new Float32Array(STAR_N)
    const cGold = new THREE.Color(0xf7bd48)
    const cCyan = new THREE.Color(0x4bd5e0)
    const cWhite = new THREE.Color(0xffffff)
    for (let i = 0; i < STAR_N; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 80
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 60 + 10
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5
      const pick = Math.random()
      const c = pick < 0.5 ? cWhite.clone().lerp(cGold, Math.random() * 0.4)
        : pick < 0.8 ? cCyan.clone().lerp(cWhite, Math.random() * 0.5)
          : cGold.clone()
      starCol[i * 3] = c.r
      starCol[i * 3 + 1] = c.g
      starCol[i * 3 + 2] = c.b
      starSize[i] = Math.random() * 0.15 + 0.04
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3))
    const starMat = new THREE.PointsMaterial({
      size: 0.18, vertexColors: true, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    const connections = tree.connections || []
    const connLines = []
    connections.forEach(([aId, bId]) => {
      const pa = layout[aId]
      const pb = layout[bId]
      if (!pa || !pb) return
      const na = tree.nodes.find(n => n.id === aId)
      const branchColor = new THREE.Color(branchMap[na?.branch]?.color || '#555555')
      const curve = createBezierCurve(pa, pb)
      const points = curve.getPoints(24)
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color: branchColor,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const line = new THREE.Line(geo, mat)
      nodeGroup.add(line)
      connLines.push({ line, mat, baseColor: branchColor, aId, bId })
    })

    const nodeEntries = {}
    const interactMeshes = []

    tree.nodes.forEach(node => {
      const pos = layout[node.id]
      if (!pos) return
      const r = nodeRadius(node)
      const branchColor = new THREE.Color(branchMap[node.branch]?.color || '#888888')
      const isEvo = !!node.upgradeOf
      const isKey = isKeystone(node)

      const nodeGroup3 = new THREE.Group()
      nodeGroup3.position.set(pos.x, pos.y, 0)

      const coreGeo = isKey
        ? new THREE.OctahedronGeometry(r, 0)
        : isEvo
          ? new THREE.TetrahedronGeometry(r, 0)
          : new THREE.IcosahedronGeometry(r, 0)
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x333338, transparent: true, opacity: 0.9 })
      const core = new THREE.Mesh(coreGeo, coreMat)
      nodeGroup3.add(core)

      const glowR = r * 1.8
      const glowGeo = new THREE.SphereGeometry(glowR, 16, 16)
      const glowMat = new THREE.MeshBasicMaterial({
        color: branchColor, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
      const glow = new THREE.Mesh(glowGeo, glowMat)
      nodeGroup3.add(glow)

      const ringGeo = new THREE.RingGeometry(r * 1.3, r * 1.5, 32)
      const ringMat = new THREE.MeshBasicMaterial({
        color: branchColor, transparent: true, opacity: 0,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      nodeGroup3.add(ring)

      const pickGeo = new THREE.SphereGeometry(r * 1.6, 8, 8)
      const pickMat = new THREE.MeshBasicMaterial({ visible: false })
      const pickMesh = new THREE.Mesh(pickGeo, pickMat)
      pickMesh.position.set(pos.x, pos.y, 0)
      pickMesh.userData = { nodeId: node.id }
      nodeGroup.add(pickMesh)
      interactMeshes.push(pickMesh)

      nodeGroup.add(nodeGroup3)
      nodeEntries[node.id] = {
        group: nodeGroup3, core, glow, ring,
        baseColor: branchColor, radius: r,
        currentScale: 1, targetScale: 1,
        unlockAnim: 0, isKey, isEvo,
        pickMesh,
      }
    })

    const particleBursts = []

    function spawnBurst(pos, color) {
      const COUNT = 28
      const geo = new THREE.BufferGeometry()
      const positions = new Float32Array(COUNT * 3)
      const velocities = []
      for (let i = 0; i < COUNT; i++) {
        positions[i * 3] = pos.x
        positions[i * 3 + 1] = pos.y
        positions[i * 3 + 2] = 0
        const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.3
        const speed = 2 + Math.random() * 3
        velocities.push({
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
          z: 0,
        })
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const mat = new THREE.PointsMaterial({
        color, size: 0.35,
        transparent: true, opacity: 1,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
      const pts = new THREE.Points(geo, mat)
      scene.add(pts)
      particleBursts.push({ pts, geo, mat, velocities, life: 0, maxLife: 0.9 })
    }

    function applyNodeVisuals() {
      const u = stateRef.current.unlocked
      const av = stateRef.current.available
      for (const node of tree.nodes) {
        const entry = nodeEntries[node.id]
        if (!entry) continue
        const state = u.includes(node.id) ? 'unlocked'
          : (canUnlockNode(raceId, node.id, u) && node.cost <= av) ? 'available'
            : 'locked'
        if (state === 'unlocked') {
          entry.core.material.color.copy(entry.baseColor)
          entry.core.material.opacity = 1
          entry.glow.material.color.copy(entry.baseColor)
          entry.glow.material.opacity = 0.2
          entry.ring.material.opacity = 0
        } else if (state === 'available') {
          entry.core.material.color.setHex(0xf7bd48)
          entry.core.material.opacity = 0.95
          entry.glow.material.color.setHex(0xf7bd48)
          entry.glow.material.opacity = 0.15
          entry.ring.material.color.setHex(0xf7bd48)
          entry.ring.material.opacity = 0.5
        } else {
          entry.core.material.color.setHex(0x2a2a30)
          entry.core.material.opacity = 0.7
          entry.glow.material.opacity = 0
          entry.ring.material.opacity = 0
        }
      }
      const connAId = new Set(stateRef.current.unlocked)
      for (const cl of connLines) {
        const aActive = connAId.has(cl.aId)
        const bActive = connAId.has(cl.bId)
        if (aActive && bActive) {
          cl.mat.color.copy(cl.baseColor)
          cl.mat.opacity = 0.35
        } else if (aActive || bActive) {
          cl.mat.color.copy(cl.baseColor)
          cl.mat.opacity = 0.16
        } else {
          cl.mat.color.copy(cl.baseColor)
          cl.mat.opacity = 0.06
        }
      }
    }
    applyNodeVisuals()

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()

    let isDragging = false
    let dragStart = { x: 0, y: 0 }
    let dragCamStart = { x: 0, y: 0 }
    let hasMoved = false

    const clock = new THREE.Clock()
    let frameId = 0

    function animate() {
      const dt = Math.min(clock.getDelta(), 0.05)
      const t = clock.getElapsedTime()

      stars.rotation.y = t * 0.008
      stars.rotation.z = Math.sin(t * 0.06) * 0.01

      const hoveredId = stateRef.current.hoveredId
      const u = stateRef.current.unlocked
      const av = stateRef.current.available

      for (const node of tree.nodes) {
        const entry = nodeEntries[node.id]
        if (!entry) continue
        const state = u.includes(node.id) ? 'unlocked'
          : (canUnlockNode(raceId, node.id, u) && node.cost <= av) ? 'available'
            : 'locked'

        entry.targetScale = (node.id === hoveredId) ? 1.4 : 1.0
        if (entry.unlockAnim > 0) {
          entry.unlockAnim -= dt * 2.5
          const pop = Math.sin(Math.max(0, entry.unlockAnim) * Math.PI)
          entry.targetScale = 1.0 + pop * 0.5
        }
        entry.currentScale += (entry.targetScale - entry.currentScale) * 0.2
        entry.group.scale.setScalar(entry.currentScale)

        if (entry.isKey || entry.isEvo) {
          entry.core.rotation.y = t * 0.3
          entry.core.rotation.x = t * 0.15
        }

        if (state === 'available') {
          const pulse = 0.5 + Math.sin(t * 2.5 + node.x * 4) * 0.5
          entry.glow.material.opacity = 0.12 + pulse * 0.18
          entry.glow.scale.setScalar(1 + pulse * 0.15)
          entry.ring.material.opacity = 0.3 + pulse * 0.3
          entry.ring.scale.setScalar(1 + pulse * 0.2)
          entry.ring.rotation.z = t * 0.5
        } else if (state === 'unlocked') {
          entry.glow.material.opacity = 0.15 + Math.sin(t * 1.5 + node.x * 3) * 0.05
        } else {
          entry.glow.scale.setScalar(1)
          entry.ring.scale.setScalar(1)
        }
      }

      for (let i = particleBursts.length - 1; i >= 0; i--) {
        const pb = particleBursts[i]
        pb.life += dt
        const progress = pb.life / pb.maxLife
        if (progress >= 1) {
          scene.remove(pb.pts)
          pb.geo.dispose()
          pb.mat.dispose()
          particleBursts.splice(i, 1)
          continue
        }
        const posAttr = pb.geo.attributes.position
        for (let j = 0; j < pb.velocities.length; j++) {
          const v = pb.velocities[j]
          posAttr.array[j * 3] += v.x * dt
          posAttr.array[j * 3 + 1] += v.y * dt - progress * 2 * dt
          posAttr.array[j * 3 + 2] += v.z * dt
        }
        posAttr.needsUpdate = true
        pb.mat.opacity = 1 - progress
        pb.mat.size = 0.35 * (1 - progress * 0.5)
      }

      if (stateRef.current.justUnlocked) {
        const nodeId = stateRef.current.justUnlocked
        stateRef.current.justUnlocked = null
        const entry = nodeEntries[nodeId]
        const pos = layout[nodeId]
        if (entry && pos) {
          entry.unlockAnim = 1
          spawnBurst(pos, entry.baseColor)
        }
        applyNodeVisuals()
      }

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    function resize() {
      const w = W(), h = H()
      const a = w / h
      camera.left = -VIEW_H * a / 2 / camZoom
      camera.right = VIEW_H * a / 2 / camZoom
      camera.top = VIEW_H / 2 / camZoom
      camera.bottom = -VIEW_H / 2 / camZoom
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    function getPointerCoords(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObjects(interactMeshes, false)
    }

    function onPointerDown(e) {
      isDragging = true
      hasMoved = false
      dragStart = { x: e.clientX, y: e.clientY }
      dragCamStart = { x: camX, y: camY }
      renderer.domElement.style.cursor = 'grabbing'
    }

    function onPointerMove(e) {
      if (isDragging) {
        const dx = e.clientX - dragStart.x
        const dy = e.clientY - dragStart.y
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved = true
        const worldPerPx = VIEW_H / renderer.domElement.clientHeight / camZoom
        camX = dragCamStart.x - dx * worldPerPx
        camY = dragCamStart.y + dy * worldPerPx
        syncCamera()
        return
      }
      const hits = getPointerCoords(e.clientX, e.clientY)
      if (hits.length > 0) {
        const nodeId = hits[0].object.userData.nodeId
        stateRef.current.hoveredId = nodeId
        const node = tree.nodes.find(n => n.id === nodeId)
        if (node) {
          setHoveredNode(node)
          setTooltipPos({ x: e.clientX, y: e.clientY })
        }
        renderer.domElement.style.cursor = 'pointer'
      } else {
        stateRef.current.hoveredId = null
        setHoveredNode(null)
        renderer.domElement.style.cursor = 'grab'
      }
    }

    function onPointerUp(e) {
      if (isDragging && !hasMoved) {
        const hits = getPointerCoords(e.clientX, e.clientY)
        if (hits.length > 0) {
          const nodeId = hits[0].object.userData.nodeId
          if (getNodeState(nodeId) === 'available') {
            handleUnlock(nodeId)
          }
        }
      }
      isDragging = false
      renderer.domElement.style.cursor = 'grab'
    }

    function onPointerLeave() {
      isDragging = false
      stateRef.current.hoveredId = null
      setHoveredNode(null)
      renderer.domElement.style.cursor = 'grab'
    }

    function onWheel(e) {
      e.preventDefault()
      const factor = e.deltaY > 0 ? 0.88 : 1.12
      camZoom = Math.max(0.35, Math.min(2.8, camZoom * factor))
      syncCamera()
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown)
    renderer.domElement.addEventListener('pointermove', onPointerMove)
    renderer.domElement.addEventListener('pointerup', onPointerUp)
    renderer.domElement.addEventListener('pointerleave', onPointerLeave)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

    threeRef.current = { applyNodeVisuals }

    return () => {
      cancelAnimationFrame(frameId)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      renderer.domElement.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('pointerup', onPointerUp)
      renderer.domElement.removeEventListener('pointerleave', onPointerLeave)
      renderer.domElement.removeEventListener('wheel', onWheel)
      starGeo.dispose()
      starMat.dispose()
      Object.values(nodeEntries).forEach(e => {
        e.core.geometry.dispose()
        e.core.material.dispose()
        e.glow.geometry.dispose()
        e.glow.material.dispose()
        e.ring.geometry.dispose()
        e.ring.material.dispose()
        e.pickMesh.geometry.dispose()
        e.pickMesh.material.dispose()
      })
      connLines.forEach(cl => { cl.line.geometry.dispose(); cl.mat.dispose() })
      particleBursts.forEach(pb => { pb.geo.dispose(); pb.mat.dispose() })
      renderer.dispose()
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
      threeRef.current = null
    }
  }, [tree, layout, raceId, branchMap, getNodeState, handleUnlock, update])

  useEffect(() => {
    if (threeRef.current?.applyNodeVisuals) threeRef.current.applyNodeVisuals()
  }, [unlocked, available])

  if (!raceId) {
    return (
      <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3">public</span>
        <h3 className="font-cinzel text-lg text-on-surface mb-2">Nenhuma raça selecionada</h3>
        <p className="text-sm text-on-surface-variant">Selecione uma raça na etapa anterior para acessar a árvore de habilidades.</p>
      </div>
    )
  }
  if (!tree || tree.nodes.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-3">park</span>
        <h3 className="font-cinzel text-lg text-on-surface mb-2">Árvore Indisponível</h3>
        <p className="text-sm text-on-surface-variant">
          A árvore de habilidades para {raceId} ainda não foi implementada.
        </p>
      </div>
    )
  }

  const hoveredBranch = hoveredNode ? branchMap[hoveredNode.branch] : null

  return (
    <div className="relative w-full flex flex-col gap-3">
      <div
        ref={containerRef}
        className="relative w-full rounded-xl border border-white/[0.06] overflow-hidden"
        style={{ height: 'min(72vh, 720px)', minHeight: 500, background: 'radial-gradient(ellipse at 50% 45%, #0e0e14 0%, #060608 70%)' }}
      >
        <ParCounter total={parTotal} spent={parSpent} />

        <div className="absolute top-4 left-5 z-20 pointer-events-none">
          <h2 className="font-cinzel text-lg text-primary">{tree.name || raceId}</h2>
          <p className="text-[10px] text-on-surface-variant font-mono">Constelação de Habilidades Raciais</p>
        </div>

        <div className="absolute top-4 left-0 right-0 z-20 px-4 flex justify-center gap-6 pointer-events-none">
          {tree.branches.map(branch => {
            const count = tree.nodes.filter(n => n.branch === branch.id).length
            return (
              <div key={branch.id} className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base" style={{ color: branch.color, opacity: 0.7 }}>
                  {branch.icon}
                </span>
                <span className="text-[10px] font-cinzel uppercase tracking-[0.1em]" style={{ color: branch.color, opacity: 0.6 }}>
                  {branch.name}
                </span>
                <span className="text-[9px] font-mono text-on-surface-variant/60">({count})</span>
              </div>
            )
          })}
        </div>

        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center pointer-events-none">
          <span className="text-[10px] font-mono text-on-surface-variant/50 uppercase tracking-widest">
            Arraste para navegar · Scroll para zoom · Clique nas esferas douradas para evoluir
          </span>
        </div>
      </div>

      {hoveredNode && (
        <HoverTooltip
          node={hoveredNode}
          state={getNodeState(hoveredNode.id)}
          branch={hoveredBranch}
          raceId={raceId}
          pos={tooltipPos}
          onUnlock={handleUnlock}
          viewportW={typeof window !== 'undefined' ? window.innerWidth : 1200}
          viewportH={typeof window !== 'undefined' ? window.innerHeight : 800}
        />
      )}
    </div>
  )
}
