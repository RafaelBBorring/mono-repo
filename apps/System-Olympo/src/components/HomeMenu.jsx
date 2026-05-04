import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function getInitial(name) {
  return (name || '?').trim().slice(0, 1).toUpperCase()
}

function getSheetRace(sheet) {
  return sheet.data?.raca || sheet.data?.racaTipo || 'Linhagem oculta'
}

function getLevelTone(level = 1) {
  if (level <= 8) return 'seed'
  if (level <= 16) return 'spark'
  if (level <= 22) return 'war'
  if (level <= 29) return 'arcane'
  return 'divine'
}

function HomeThreeStage() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80)
    camera.position.set(0, 0.2, 9)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))

    const group = new THREE.Group()
    scene.add(group)

    const particleCount = 900
    const particleGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const basePositions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)
    const colorA = new THREE.Color(0xc9a84c)
    const colorB = new THREE.Color(0x5cc8cc)
    for (let i = 0; i < particleCount; i += 1) {
      const radius = 1.4 + Math.random() * 5.8
      const angle = Math.random() * Math.PI * 2
      const height = (Math.random() - 0.5) * 4.8
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = height
      positions[i * 3 + 2] = Math.sin(angle) * radius - 1.5
      basePositions[i * 3] = positions[i * 3]
      basePositions[i * 3 + 1] = positions[i * 3 + 1]
      basePositions[i * 3 + 2] = positions[i * 3 + 2]
      const color = colorA.clone().lerp(colorB, Math.random() * 0.7)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.035,
      vertexColors: true,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    group.add(particles)

    const shardGeometry = new THREE.IcosahedronGeometry(0.09, 0)
    const shardMaterial = new THREE.MeshBasicMaterial({
      color: 0xe8c97e,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      wireframe: true,
    })
    const shards = new THREE.InstancedMesh(shardGeometry, shardMaterial, 54)
    const dummy = new THREE.Object3D()
    const shardSeeds = Array.from({ length: 54 }, (_, i) => ({
      angle: (i / 54) * Math.PI * 2,
      radius: 1.2 + Math.random() * 4.3,
      y: (Math.random() - 0.5) * 3.8,
      speed: 0.08 + Math.random() * 0.18,
      scale: 0.55 + Math.random() * 1.6,
    }))
    group.add(shards)

    const clock = new THREE.Clock()
    let frameId = 0
    let width = 1
    let height = 1
    const pointer = { x: 0, y: 0, power: 0, targetPower: 0 }

    function resize() {
      const parent = canvas.parentElement
      width = parent?.clientWidth || window.innerWidth
      height = parent?.clientHeight || 520
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    function animate() {
      const t = clock.getElapsedTime()
      pointer.power += (pointer.targetPower - pointer.power) * 0.08
      pointer.targetPower *= 0.985
      group.rotation.y = Math.sin(t * 0.16) * 0.18
      particles.rotation.y = t * 0.035
      particles.rotation.z = Math.sin(t * 0.12) * 0.035
      const positionAttr = particleGeometry.getAttribute('position')
      for (let i = 0; i < particleCount; i += 1) {
        const bx = basePositions[i * 3]
        const by = basePositions[i * 3 + 1]
        const bz = basePositions[i * 3 + 2]
        const dx = bx - pointer.x
        const dy = by - pointer.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const repel = Math.max(0, 1.45 - dist) * pointer.power
        positions[i * 3] = bx + (dx / dist) * repel * 0.72 + Math.sin(t * 0.7 + i) * 0.008
        positions[i * 3 + 1] = by + (dy / dist) * repel * 0.46 + Math.cos(t * 0.6 + i) * 0.006
        positions[i * 3 + 2] = bz + repel * 0.34
      }
      positionAttr.needsUpdate = true
      shardSeeds.forEach((seed, i) => {
        const angle = seed.angle + t * seed.speed
        const bx = Math.cos(angle) * seed.radius
        const by = seed.y + Math.sin(t * 0.55 + i) * 0.18
        const dx = bx - pointer.x
        const dy = by - pointer.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const repel = Math.max(0, 1.9 - dist) * pointer.power
        dummy.position.set(
          bx + (dx / dist) * repel * 0.7,
          by + (dy / dist) * repel * 0.45,
          Math.sin(angle) * seed.radius - 1.4 + repel * 0.55
        )
        dummy.rotation.set(t * 0.25 + i, angle, t * 0.18)
        dummy.scale.setScalar(seed.scale * (1 + repel * 0.14))
        dummy.updateMatrix()
        shards.setMatrixAt(i, dummy.matrix)
      })
      shards.instanceMatrix.needsUpdate = true
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    resize()
    animate()
    const observer = new ResizeObserver(resize)
    if (canvas.parentElement) observer.observe(canvas.parentElement)
    const host = canvas.parentElement
    function onPointerMove(event) {
      if (!host) return
      const rect = host.getBoundingClientRect()
      const nx = (event.clientX - rect.left) / rect.width
      const ny = (event.clientY - rect.top) / rect.height
      pointer.x = (nx - 0.5) * 10
      pointer.y = -(ny - 0.5) * 5.2
      pointer.targetPower = 0.52
    }
    function onPointerLeave() {
      pointer.targetPower = 0
    }
    host?.addEventListener('pointermove', onPointerMove)
    host?.addEventListener('pointerleave', onPointerLeave)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      host?.removeEventListener('pointermove', onPointerMove)
      host?.removeEventListener('pointerleave', onPointerLeave)
      particleGeometry.dispose()
      particleMaterial.dispose()
      shardGeometry.dispose()
      shardMaterial.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="home-three-canvas" aria-hidden="true" />
}

export default function HomeMenu({
  userName,
  sheetsCount,
  sheets = [],
  onNew,
  onContinue,
  onLibrary,
  onReference,
  onOpenSheet,
  onAdminArea,
  hasDraft,
  isAdmin,
}) {
  const recentSheets = sheets.slice(0, 6)
  const legacyAdminActions = [
    { key: 'sheets', label: 'Arquivo de Heróis', detail: `${sheetsCount} personagens`, tone: 'sheets' },
    { key: 'abilities', label: 'Revisões', detail: 'Habilidades pendentes' },
    { key: 'alchemy', label: 'Alquimia', detail: 'Rituais e fórmulas' },
    { key: 'spells', label: 'Feitiços', detail: 'Tradições e grimórios' },
    { key: 'runes', label: 'Runas', detail: 'Inscrições místicas' },
    { key: 'magic', label: 'Magias', detail: 'Escolas arcanas' },
    { key: 'users', label: 'Usuários', detail: 'Acesso e perfis' },
  ]

  const adminActions = [
    { key: 'grimoire', label: 'Grimório do Mestre', detail: 'Feitiços, rituais, magias e runas', tone: 'grimoire' },
    { key: 'mysticWeapons', label: 'Forja Lendária', detail: 'Relíquias e armas únicas', tone: 'legendary' },
    { key: 'sheets', label: 'Arquivo de Heróis', detail: `${sheetsCount} personagens`, tone: 'sheets' },
    { key: 'abilities', label: 'Tribunal de Poderes', detail: 'Habilidades pendentes', tone: 'abilities' },
    { key: 'users', label: 'Registro de Usuários', detail: 'Acesso e perfis', tone: 'users' },
  ]

  return (
    <div className="home-dashboard is-epic">
      <section className="home-hero-showcase">
        <HomeThreeStage />
        <div className="home-hero-content">
          <span className="home-eyebrow">Sistema Olympo 2.0</span>
          <h1 className="font-cinzel">Herdeiros do Amanhã</h1>
          <p>
            Sua mesa começa aqui: escolha um herói, forje uma nova ficha ou abra o livro de regras quando precisar consultar o mundo.
          </p>
          <div className="home-hero-actions">
            <button type="button" onClick={onNew} className="home-create-button">
              <span>Criar Novo Personagem</span>
              <small>Iniciar uma jornada do zero</small>
            </button>
            {hasDraft && (
              <button type="button" onClick={onContinue} className="home-secondary-button">
                Retomar Rascunho
              </button>
            )}
            <button type="button" onClick={onReference} className="home-rulebook-link">
              Livro de Regras
            </button>
          </div>
        </div>
      </section>

      <section className="home-character-section">
        <div className="home-section-head">
          <div>
            <span className="home-eyebrow">Entrar em jogo</span>
            <h2 className="font-cinzel">Escolha uma ficha</h2>
          </div>
          <button type="button" onClick={onLibrary} className="home-quiet-button">
            Biblioteca completa
          </button>
        </div>

        {recentSheets.length > 0 ? (
          <div className="home-epic-grid">
            {recentSheets.map(sheet => (
              <button key={sheet.id} type="button" onClick={() => onOpenSheet?.(sheet.id)} className="home-epic-card">
                <div className="home-epic-portrait">
                  {sheet.data?.avatar ? (
                    <img src={sheet.data.avatar} alt="" />
                  ) : (
                    <span>{getInitial(sheet.name || sheet.data?.nome)}</span>
                  )}
                </div>
                <strong>{sheet.name || sheet.data?.nome || 'Sem nome'}</strong>
                <small>
                  {getSheetRace(sheet)}
                  <span className={`home-level-badge is-${getLevelTone(sheet.data?.nivel || 1)}`}>Nv {sheet.data?.nivel || 1}</span>
                </small>
              </button>
            ))}
          </div>
        ) : (
          <div className="home-empty-epic">
            <strong>O salão ainda está vazio.</strong>
            <span>Crie o primeiro personagem para preencher esta galeria.</span>
          </div>
        )}
      </section>

      {isAdmin && (
        <section className="home-admin-section">
          <div className="home-section-head">
            <div>
              <span className="home-eyebrow">Mesa do Mestre</span>
              <h2 className="font-cinzel">Painel administrativo</h2>
            </div>
          </div>
          <div className="home-admin-grid">
            {adminActions.map(action => (
              <button key={action.key} type="button" onClick={() => onAdminArea?.(action.key)} className={`home-admin-card is-${action.tone}`}>
                <span>{action.label}</span>
                <small>{action.detail}</small>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
