import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const LEVEL_TIERS = [
  { min: 1, max: 8, label: 'Novato', color: '#60a5fa', glow: 'rgba(96,165,250,0.35)', border: 'border-sky-400/50', bg: 'bg-sky-400/10', text: 'text-sky-400', bar: 'bg-sky-400' },
  { min: 9, max: 16, label: 'Veterano', color: '#f7bd48', glow: 'rgba(247,189,72,0.35)', border: 'border-primary/50', bg: 'bg-primary/10', text: 'text-primary', bar: 'bg-primary' },
  { min: 17, max: 24, label: 'Elite', color: '#c084fc', glow: 'rgba(192,132,252,0.35)', border: 'border-purple-400/50', bg: 'bg-purple-400/10', text: 'text-purple-400', bar: 'bg-purple-400' },
  { min: 25, max: 30, label: 'Lendário', color: '#f87171', glow: 'rgba(248,113,113,0.4)', border: 'border-rose-400/50', bg: 'bg-rose-400/10', text: 'text-rose-400', bar: 'bg-rose-400' },
]

function getInitial(name) {
  return (name || '?').charAt(0).toUpperCase()
}

function getLevelTier(level) {
  return LEVEL_TIERS.find(t => level >= t.min && level <= t.max) || LEVEL_TIERS[0]
}

function CharacterCard({ sheet, onOpenSheet, index = 0 }) {
  const level = sheet.data?.nivel || 1
  const tier = getLevelTier(level)
  const [hovering, setHovering] = useState(false)

  return (
    <button
      type="button"
      onClick={() => onOpenSheet?.(sheet.id)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="glass-card group relative p-6 flex items-center gap-6 cursor-pointer text-left w-full overflow-hidden"
      style={{
        transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease',
        animation: `staggerFadeIn 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 80}ms both`,
        borderColor: hovering ? 'rgba(247,189,72,0.4)' : undefined,
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ boxShadow: `inset 0 0 60px ${tier.glow}, 0 0 40px ${tier.glow}` }}
      />
      <div className="relative w-24 h-24 shrink-0" style={{ transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)', transform: hovering ? 'scale(1.05)' : 'scale(1)' }}>
        {sheet.data?.avatar ? (
          <img src={sheet.data.avatar} alt=""
            className="w-full h-full object-cover rounded-xl border-2 transition-all duration-400"
            style={{ borderColor: hovering ? tier.color : 'rgba(247,189,72,0.2)', boxShadow: hovering ? `0 0 24px ${tier.glow}` : 'none' }} />
        ) : (
          <div className="w-full h-full rounded-xl border-2 bg-surface-container flex items-center justify-center text-2xl font-cinzel transition-all duration-400"
            style={{ borderColor: hovering ? tier.color : 'rgba(247,189,72,0.2)', color: tier.color, boxShadow: hovering ? `0 0 24px ${tier.glow}` : 'none' }}>
            {getInitial(sheet.name || sheet.data?.nome)}
          </div>
        )}
        <div
          className={`absolute -bottom-2 -right-2 px-2 py-0.5 rounded border font-mono text-xs font-bold ${tier.bg} ${tier.text}`}
          style={{ borderColor: tier.color + '40' }}
        >
          LV {level}
        </div>
      </div>
      <div className="min-w-0 relative z-10">
        <h3 className="font-cinzel text-xl text-on-surface mb-1 group-hover:text-primary transition-colors truncate">
          {sheet.name || sheet.data?.nome || 'Sem nome'}
        </h3>
        <p className="font-mono text-xs text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">person</span>
          {getSheetRace(sheet)}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full ${tier.bar} rounded-full`}
              style={{ width: `${Math.min(100, (level / 50) * 100)}%`, boxShadow: hovering ? `0 0 10px ${tier.glow}` : `0 0 6px ${tier.glow}`, transition: 'box-shadow 0.4s ease' }}
            />
          </div>
          <span className={`text-[10px] font-mono ${tier.text} uppercase tracking-wider`}>{tier.label}</span>
        </div>
      </div>
    </button>
  )
}

function DraftCard({ draft, onOpen, onDelete, index = 0 }) {
  const data = draft.data || {}
  const name = draft.name || data.nome || 'Rascunho sem nome'
  const step = Number(draft.step || data.draftStep || 0) + 1
  const updated = draft.updatedAt ? new Date(draft.updatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''

  return (
    <div
      className="glass-card group p-4 flex items-center gap-4"
      style={{ animation: `staggerFadeIn 0.5s cubic-bezier(0.16,1,0.3,1) ${index * 80}ms both` }}
    >
      <button type="button" onClick={() => onOpen?.(draft.id)} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">edit_note</span>
          <h3 className="font-cinzel text-on-surface text-sm truncate group-hover:text-primary transition-colors">{name}</h3>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wider">
          <span className="px-2 py-0.5 rounded border border-primary/20 bg-primary/10 text-primary">Etapa {step}</span>
          {data.classe && <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-on-surface-variant">{data.classe}</span>}
          {updated && <span className="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-outline">{updated}</span>}
        </div>
      </button>
      <button type="button" onClick={() => onDelete?.(draft.id)}
        className="w-9 h-9 grid place-items-center rounded border border-err/25 text-err/70 hover:bg-err/10 hover:text-err transition-colors"
        title="Excluir rascunho">
        <span className="material-symbols-outlined text-[17px]">delete</span>
      </button>
    </div>
  )
}

function getSheetRace(sheet) {
  return sheet.data?.raca || sheet.data?.racaTipo || 'Linhagem oculta'
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
    const colorA = new THREE.Color(0xf7bd48)
    const colorB = new THREE.Color(0x00daf3)
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
      color: 0xffdea6,
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

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />
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
  drafts = [],
  onOpenDraft,
  onDeleteDraft,
  isAdmin,
}) {
  const recentSheets = sheets.slice(0, 6)

  return (
    <main className="min-h-screen">
      {/* ── Hero Section ── */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <HomeThreeStage />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background z-10 pointer-events-none" />
        <div className="relative z-20 text-center max-w-4xl px-6">
          <h1 className="font-cinzel text-primary text-glow-gold mb-4 tracking-[0.2em]"
              style={{ fontSize: 'clamp(2.5rem, 8vw, 4.5rem)', lineHeight: 1.1 }}>
            HERDEIROS DO AMANHÃ
          </h1>
          <p className="text-on-surface-variant font-body mb-10 max-w-2xl mx-auto italic"
             style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: 1.7 }}>
            "O destino não é escrito nas estrelas, mas sim nos arquivos que os deuses esqueceram."
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button type="button" onClick={onNew}
              className="sigil-button group relative px-10 py-4 bg-surface-container-low/40 backdrop-blur-md rounded-xl overflow-hidden transition-all duration-500">
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative font-cinzel text-xl text-primary tracking-widest flex items-center gap-3">
                <span className="material-symbols-outlined">auto_awesome</span>
                CRIAR NOVO PERSONAGEM
              </span>
            </button>
            {hasDraft && (
              <button type="button" onClick={onContinue}
                className="sigil-button px-6 py-4 bg-surface-container-low/20 backdrop-blur-md rounded-xl font-cinzel text-sm text-secondary-fixed-dim tracking-widest">
                Retomar Rascunho
              </button>
            )}
            <button type="button" onClick={() => onAdminArea?.('menu')}
              className="sigil-button px-6 py-4 bg-surface-container-low/20 backdrop-blur-md rounded-xl font-cinzel text-sm text-primary tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              Mesa do Mestre
            </button>
          </div>
        </div>
      </section>

      {/* ── Character Selection ── */}
      {drafts.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-12 pb-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-cinzel text-primary-fixed tracking-[0.15em] uppercase text-lg">Rascunhos em Aberto</h2>
              <p className="text-on-surface-variant text-xs mt-1">Fichas interrompidas ficam guardadas aqui ate serem salvas ou excluidas.</p>
            </div>
            <button type="button" onClick={onNew}
              className="sigil-button px-4 py-2 bg-surface-container-low/40 rounded-lg font-cinzel text-xs text-primary tracking-widest">
              Novo Rascunho
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.slice(0, 6).map((draft, i) => (
              <DraftCard key={draft.id} draft={draft} onOpen={onOpenDraft} onDelete={onDeleteDraft} index={i} />
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="flex items-center gap-4 mb-12">
          <div className="h-px flex-grow bg-gradient-to-r from-transparent to-primary/30" />
          <h2 className="font-cinzel text-primary-fixed tracking-[0.15em] uppercase"
              style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
            ESCOLHA UMA FICHA
          </h2>
          <div className="h-px flex-grow bg-gradient-to-l from-transparent to-primary/30" />
        </div>

        {recentSheets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {recentSheets.map((sheet, i) => (
              <CharacterCard key={sheet.id} sheet={sheet} onOpenSheet={onOpenSheet} index={i} />
            ))}
            <button type="button" onClick={onNew}
              className="glass-card border-dashed !border-white/10 flex flex-col items-center justify-center p-8 text-outline hover:text-secondary-fixed-dim hover:!border-secondary/50 transition-all cursor-pointer">
              <span className="material-symbols-outlined text-4xl mb-2">add_circle</span>
              <span className="font-cinzel text-sm tracking-widest uppercase">Novos Caminhos</span>
            </button>
          </div>
        ) : (
          <div className="glass-card text-center py-20 px-8">
            <span className="material-symbols-outlined text-6xl text-primary/30 mb-4 block">explore</span>
            <p className="font-cinzel text-lg text-on-surface mb-2">O salão ainda está vazio.</p>
            <p className="text-on-surface-variant text-sm mb-6">Crie o primeiro personagem para preencher esta galeria.</p>
            <button type="button" onClick={onNew}
              className="sigil-button px-8 py-3 bg-surface-container-low/40 rounded-xl font-cinzel text-sm text-primary tracking-widest">
              <span className="material-symbols-outlined text-sm align-middle mr-2">auto_awesome</span>
              Começar Jornada
            </button>
          </div>
        )}
      </section>

      {/* ── Admin Panel ── */}
      {isAdmin && (
        <section className="max-w-7xl mx-auto px-6 md:px-12 pt-12 pb-24">
          <div className="mb-10">
            <h2 className="font-cinzel text-on-surface flex items-center gap-4"
                style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)' }}>
              <span className="material-symbols-outlined text-primary text-3xl">admin_panel_settings</span>
              MESA DO MESTRE
            </h2>
            <div className="w-32 h-0.5 bg-primary mt-2" />
          </div>
          <button type="button" onClick={() => onAdminArea?.('menu')}
            className="glass-card group w-full p-8 flex items-center gap-6 text-left hover:bg-primary/5 transition-all cursor-pointer">
            <span className="material-symbols-outlined text-primary text-5xl group-hover:scale-110 transition-transform"
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
              admin_panel_settings
            </span>
            <div>
              <h4 className="font-cinzel text-lg text-primary-fixed tracking-wide mb-1">Acessar Mesa do Mestre</h4>
              <p className="font-mono text-primary/40 leading-relaxed uppercase" style={{ fontSize: '10px' }}>
                Heróis · Skills · Grimório · Forja Lendária · Codex Arcanum · Quadro · Usuários
              </p>
            </div>
            <span className="material-symbols-outlined text-primary/30 text-2xl ml-auto group-hover:text-primary/60 transition-colors">arrow_forward</span>
          </button>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-surface-container-lowest/80 backdrop-blur-md py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
          <div className="flex items-center gap-2 font-mono text-xs tracking-tighter text-outline">
            <span className="material-symbols-outlined text-sm">security</span>
            ENCRYPTED PROTOCOL V2.0 — OLYMPO ECOSYSTEM
          </div>
          <div className="flex gap-8 font-mono text-xs text-outline uppercase">
            <button onClick={onReference} className="hover:text-primary transition-colors">Livro de Regras</button>
            <button onClick={onLibrary} className="hover:text-primary transition-colors">Biblioteca</button>
            <button onClick={onReference} className="hover:text-primary transition-colors">Suporte</button>
          </div>
        </div>
      </footer>
    </main>
  )
}
