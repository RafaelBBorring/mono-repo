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

  const parTotal = useMemo(
    () => calcPARTotal(char?.classe, char?.nivel || 1, char?.progressaoChoices, char?.modulosAdquiridos, char),
    [char?.classe, char?.nivel, char?.progressaoChoices, char?.modulosAdquiridos, char]
  )
  const parSpent = useMemo(() => calcRaceTreePARSpent(unlocked, raceId), [unlocked, raceId])
  const available = parTotal - parSpent

  const containerRef = useRef(null)
  const threeRef = useRef(null)
  const stateRef = useRef({ unlocked: [], available: 0, hoveredId: null })

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
    update({ raceTreeUnlocked: [...stateRef.current.unlocked, nodeId] })
  }, [getNodeState, update])

  const branchMap = useMemo(() => {
    if (!tree) return {}
    const m = {}
    tree.branches.forEach(b => { m[b.id] = b })
    return m
  }, [tree])

  useEffect(() => {
    if (!tree || tree.nodes.length === 0 || !containerRef.current) return undefined

    const container = containerRef.current
    const W = () => container.clientWidth || 900
    const H = () => container.clientHeight || 640

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, W() / H(), 0.1, 200)
    camera.position.set(0, 0, 24)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(W(), H(), false)
    container.appendChild(renderer.domElement)
    renderer.domElement.style.cursor = 'default'

    const nodeGroup = new THREE.Group()
    scene.add(nodeGroup)

    const STAR_N = 600
    const starGeo = new THREE.BufferGeometry()
    const starPos = new Float32Array(STAR_N * 3)
    const starCol = new Float32Array(STAR_N * 3)
    const cGold = new THREE.Color(0xf7bd48)
    const cCyan = new THREE.Color(0x4bd5e0)
    const cWhite = new THREE.Color(0xffffff)
    for (let i = 0; i < STAR_N; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 44
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 28
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 16 - 3
      const pick = Math.random()
      const c = pick < 0.5 ? cWhite.clone().lerp(cGold, Math.random() * 0.5)
        : pick < 0.8 ? cCyan.clone().lerp(cWhite, Math.random() * 0.6)
          : cGold.clone()
      starCol[i * 3] = c.r
      starCol[i * 3 + 1] = c.g
      starCol[i * 3 + 2] = c.b
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3))
    const starMat = new THREE.PointsMaterial({
      size: 0.12, vertexColors: true, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    const posFor = (node) => ({
      x: node.x * 13,
      y: (0.55 - node.y) * 15,
      z: 0,
    })

    const connections = tree.connections || []
    const linePositions = []
    const lineColors = []
    connections.forEach(([aId, bId]) => {
      const na = tree.nodes.find(n => n.id === aId)
      const nb = tree.nodes.find(n => n.id === bId)
      if (!na || !nb) return
      const pa = posFor(na), pb = posFor(nb)
      linePositions.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z)
      const bColor = new THREE.Color(branchMap[na.branch]?.color || '#888888')
      lineColors.push(bColor.r, bColor.g, bColor.b, bColor.r, bColor.g, bColor.b)
    })
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3))
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.18,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const lineSegs = new THREE.LineSegments(lineGeo, lineMat)
    nodeGroup.add(lineSegs)

    const sphereGeo = new THREE.SphereGeometry(0.5, 24, 24)
    const glowGeo = new THREE.SphereGeometry(0.85, 18, 18)
    const nodeMeshes = {}
    const coreMeshes = []

    tree.nodes.forEach(node => {
      const pos = posFor(node)
      const branchColor = new THREE.Color(branchMap[node.branch]?.color || '#888888')
      const coreMat = new THREE.MeshBasicMaterial({ color: 0x444444 })
      const core = new THREE.Mesh(sphereGeo, coreMat)
      core.position.set(pos.x, pos.y, pos.z)
      core.userData = { nodeId: node.id, baseColor: branchColor }
      nodeGroup.add(core)
      coreMeshes.push(core)

      const glowMat = new THREE.MeshBasicMaterial({
        color: branchColor, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
      const glow = new THREE.Mesh(glowGeo, glowMat)
      glow.position.set(pos.x, pos.y, pos.z)
      nodeGroup.add(glow)

      nodeMeshes[node.id] = { core, glow, baseColor: branchColor, targetScale: 1, currentScale: 1 }
    })

    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let parallaxX = 0, parallaxY = 0

    function applyNodeVisuals() {
      const u = stateRef.current.unlocked
      const av = stateRef.current.available
      for (const node of tree.nodes) {
        const entry = nodeMeshes[node.id]
        if (!entry) continue
        const state = u.includes(node.id) ? 'unlocked'
          : (canUnlockNode(raceId, node.id, u) && node.cost <= av) ? 'available'
            : 'locked'
        if (state === 'unlocked') {
          entry.core.material.color.copy(entry.baseColor)
          entry.glow.material.color.copy(entry.baseColor)
          entry.glow.material.opacity = 0.28
        } else if (state === 'available') {
          entry.core.material.color.setHex(0xf7bd48)
          entry.glow.material.color.setHex(0xf7bd48)
          entry.glow.material.opacity = 0.22
        } else {
          entry.core.material.color.setHex(0x3c3c44)
          entry.glow.material.opacity = 0.0
        }
      }
    }
    applyNodeVisuals()

    const clock = new THREE.Clock()
    let frameId = 0

    function animate() {
      const t = clock.getElapsedTime()
      parallaxX += (((pointer.x) * 1.5) - parallaxX) * 0.04
      parallaxY += (((pointer.y) * 1.2) - parallaxY) * 0.04
      camera.position.x = parallaxX
      camera.position.y = parallaxY
      camera.lookAt(0, 0, 0)

      stars.rotation.y = t * 0.012
      stars.rotation.z = Math.sin(t * 0.08) * 0.02

      const hoveredId = stateRef.current.hoveredId
      for (const node of tree.nodes) {
        const entry = nodeMeshes[node.id]
        if (!entry) continue
        entry.targetScale = (node.id === hoveredId) ? 1.45 : 1.0
        entry.currentScale += (entry.targetScale - entry.currentScale) * 0.18
        entry.core.scale.setScalar(entry.currentScale)
        const u = stateRef.current.unlocked
        const av = stateRef.current.available
        const state = u.includes(node.id) ? 'unlocked'
          : (canUnlockNode(raceId, node.id, u) && node.cost <= av) ? 'available'
            : 'locked'
        if (state === 'available') {
          const pulse = 0.5 + Math.sin(t * 3 + node.x * 5) * 0.5
          entry.glow.material.opacity = 0.14 + pulse * 0.18
          entry.glow.scale.setScalar(entry.currentScale * (1 + pulse * 0.15))
        } else {
          entry.glow.scale.setScalar(entry.currentScale)
        }
      }
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    function resize() {
      const w = W(), h = H()
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)

    function setFromEvent(clientX, clientY) {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObjects(coreMeshes, false)
    }

    function onMove(e) {
      const hits = setFromEvent(e.clientX, e.clientY)
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
        renderer.domElement.style.cursor = 'default'
      }
    }
    function onLeave() {
      stateRef.current.hoveredId = null
      setHoveredNode(null)
      pointer.x = 0
      pointer.y = 0
    }
    function onClick(e) {
      const hits = setFromEvent(e.clientX, e.clientY)
      if (hits.length > 0) {
        const nodeId = hits[0].object.userData.nodeId
        if (getNodeState(nodeId) === 'available') {
          update({ raceTreeUnlocked: [...stateRef.current.unlocked, nodeId] })
        }
      }
    }
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerleave', onLeave)
    renderer.domElement.addEventListener('click', onClick)

    threeRef.current = { applyNodeVisuals }

    return () => {
      cancelAnimationFrame(frameId)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerleave', onLeave)
      renderer.domElement.removeEventListener('click', onClick)
      sphereGeo.dispose()
      glowGeo.dispose()
      starGeo.dispose()
      starMat.dispose()
      lineGeo.dispose()
      lineMat.dispose()
      Object.values(nodeMeshes).forEach(m => {
        m.core.material.dispose()
        m.glow.material.dispose()
      })
      renderer.dispose()
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
      threeRef.current = null
    }
  }, [tree, raceId, branchMap, getNodeState, update])

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
        style={{ height: 'min(70vh, 680px)', minHeight: 480, background: 'radial-gradient(ellipse at 50% 45%, #0e0e14 0%, #060608 70%)' }}
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
            Passe o mouse para detalhes • Clique nas esferas douradas para evoluir
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
