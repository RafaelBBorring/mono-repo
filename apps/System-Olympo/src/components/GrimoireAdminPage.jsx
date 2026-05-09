import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import * as THREE from 'three'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchAlchemyRituals,
  fetchMagicRituals,
  fetchRuneRituals,
  fetchSpellRituals,
  saveAlchemyRitual,
  saveMagicRitual,
  saveRuneRitual,
  saveSpellRitual,
} from '../services/alchemyService'
import { ALCHEMY_CATEGORIES } from '../data/alchemyFallbackRituals'
import { SPELL_CATEGORIES } from '../data/spellFallbackRituals'
import { RUNE_CATEGORIES } from '../data/runeFallbackRituals'
import { MAGIC_CATEGORIES } from '../data/magicFallbackRituals'
import { PUBLIC_GRIMORIOS, DEFAULT_GRIMORIOS } from '../data/publicGrimorios'
import { GRIMORIO_TIERS, GRIMORIO_TYPE_LABELS, GRIMORIO_TYPE_ICONS } from '../data/grimorios'

const CIRCLE_BADGE = {
  1: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25',
  2: 'bg-sky-400/12 text-sky-300 border-sky-400/25',
  3: 'bg-purple-400/12 text-purple-300 border-purple-400/25',
  4: 'bg-amber-300/12 text-amber-200 border-amber-300/30',
}

const CIRCLE_BG = {
  1: 'bg-emerald-500/8 hover:bg-emerald-500/14 border-emerald-500/15',
  2: 'bg-sky-500/8 hover:bg-sky-500/14 border-sky-500/15',
  3: 'bg-purple-500/8 hover:bg-purple-500/14 border-purple-500/15',
  4: 'bg-amber-400/8 hover:bg-amber-400/14 border-amber-400/15',
}

const KNOWLEDGE_TABS = [
  { key: 'alchemy', label: 'Alquimia', icon: '⚗', accent: '#e8c97e', accentClass: 'text-amber-300' },
  { key: 'spells', label: 'Feitiços', icon: '✨', accent: '#c084fc', accentClass: 'text-purple-300' },
  { key: 'magic', label: 'Magias', icon: '🔥', accent: '#38bdf8', accentClass: 'text-sky-300' },
  { key: 'runes', label: 'Runas', icon: '💎', accent: '#34d399', accentClass: 'text-emerald-300' },
]

const RITUAL_FETCH = {
  alchemy: fetchAlchemyRituals,
  spells: fetchSpellRituals,
  magic: fetchMagicRituals,
  runes: fetchRuneRituals,
}

function GrimoireThreeStage() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80)
    camera.position.set(0, 0.35, 8.8)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))

    const root = new THREE.Group()
    scene.add(root)

    const gold = new THREE.MeshBasicMaterial({ color: 0xe8c97e, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
    const violet = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })
    const cyan = new THREE.MeshBasicMaterial({ color: 0x5cc8cc, transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false })

    const cover = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 1.8), gold)
    cover.rotation.x = -0.24
    root.add(cover)

    const pageLeft = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 1.62, 16, 16), violet)
    const pageRightMaterial = violet.clone()
    const pageRight = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 1.62, 16, 16), pageRightMaterial)
    pageLeft.position.set(-0.68, 0.14, 0.08)
    pageRight.position.set(0.68, 0.14, 0.08)
    pageLeft.rotation.set(-0.62, 0.18, -0.03)
    pageRight.rotation.set(-0.62, -0.18, 0.03)
    root.add(pageLeft, pageRight)

    const ringGroup = new THREE.Group()
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.012, 8, 160), cyan)
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.01, 8, 180), gold)
    const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.82, 0.009, 120, 8, 2, 5), violet)
    ringA.rotation.x = Math.PI / 2.35
    ringB.rotation.x = Math.PI / 2.05
    knot.position.y = 0.75
    knot.rotation.x = 0.9
    ringGroup.position.y = 0.55
    ringGroup.add(ringA, ringB, knot)
    root.add(ringGroup)

    const dustCount = 700
    const dustGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i += 1) {
      const r = 1 + Math.random() * 5.6
      const a = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = (Math.random() - 0.48) * 4.2
      positions[i * 3 + 2] = Math.sin(a) * r - 1
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
      size: 0.032, color: 0xd9fff8, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false,
    }))
    root.add(dust)

    const clock = new THREE.Clock()
    let frameId = 0

    function resize() {
      const parent = canvas.parentElement
      const width = parent?.clientWidth || 900
      const height = parent?.clientHeight || 360
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    function animate() {
      const t = clock.getElapsedTime()
      root.rotation.y = Math.sin(t * 0.24) * 0.14
      ringGroup.rotation.y = t * 0.28
      ringGroup.rotation.z = Math.sin(t * 0.18) * 0.08
      knot.rotation.y = t * 0.46
      pageLeft.rotation.y = 0.18 + Math.sin(t * 0.9) * 0.035
      pageRight.rotation.y = -0.18 - Math.sin(t * 0.9) * 0.035
      dust.rotation.y = t * 0.035
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    resize()
    animate()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="grimoire-canvas" aria-hidden="true" />
}

export default function GrimoireAdminPage() {
  const [activeKnowledge, setActiveKnowledge] = useState('alchemy')
  const [view, setView] = useState('grimorios')
  const [activeGrimorioId, setActiveGrimorioId] = useState(null)
  const [allRitualsOpen, setAllRitualsOpen] = useState(false)
  const [inspectId, setInspectId] = useState(null)
  const [allRitualsSearch, setAllRitualsSearch] = useState('')
  const [allRitualsCircle, setAllRitualsCircle] = useState('all')

  const [libraries, setLibraries] = useState({})
  const [loading, setLoading] = useState(true)

  const tab = KNOWLEDGE_TABS.find(t => t.key === activeKnowledge) || KNOWLEDGE_TABS[0]

  useEffect(() => { loadLibrary(activeKnowledge) }, [activeKnowledge])

  async function loadLibrary(key) {
    setLoading(true)
    try {
      const fetchFn = RITUAL_FETCH[key]
      const res = fetchFn ? await fetchFn() : { data: [] }
      setLibraries(prev => ({ ...prev, [key]: res.data || [] }))
    } catch {
      setLibraries(prev => ({ ...prev, [key]: [] }))
    }
    setLoading(false)
  }

  const knowledgeGrimorios = useMemo(() => {
    const defaults = DEFAULT_GRIMORIOS[activeKnowledge] || []
    const customs = PUBLIC_GRIMORIOS.filter(g => g.knowledgeKey === activeKnowledge && !g.isDefault)
    return [...defaults, ...customs]
  }, [activeKnowledge])

  const allRituals = useMemo(() => {
    const fetched = libraries[activeKnowledge] || []
    const fromPublicGrimorios = PUBLIC_GRIMORIOS
      .filter(g => g.knowledgeKey === activeKnowledge && g.rituals && g.rituals.length > 0)
      .flatMap(g => g.rituals)
    const combined = [...fromPublicGrimorios]
    const existingIds = new Set(combined.map(r => r.id))
    for (const r of fetched) {
      if (!existingIds.has(r.id)) combined.push(r)
    }
    return combined
  }, [activeKnowledge, libraries])

  const filteredAllRituals = useMemo(() => {
    const term = allRitualsSearch.trim().toLowerCase()
    return allRituals.filter(r => {
      const hay = `${r.name} ${r.short_description || ''} ${r.category || ''} ${r.source_name || ''}`.toLowerCase()
      const matchSearch = !term || hay.includes(term)
      const matchCircle = allRitualsCircle === 'all' || Number(allRitualsCircle) === r.circle
      return matchSearch && matchCircle
    })
  }, [allRituals, allRitualsSearch, allRitualsCircle])

  const activeGrimorio = knowledgeGrimorios.find(g => g.id === activeGrimorioId) || null

  const grimorioRituals = useMemo(() => {
    if (!activeGrimorio) return []
    if (activeGrimorio.isDefault) {
      return allRituals.filter(r => r.circle <= (activeGrimorio.maxCircle || 2))
    }
    return activeGrimorio.rituals || []
  }, [activeGrimorio, allRituals])

  const inspectedRitual = allRituals.find(r => r.id === inspectId) || grimorioRituals.find(r => r.id === inspectId) || null

  return (
    <div className="grimoire-page">
      <section className="grimoire-hero">
        <GrimoireThreeStage />
        <div className="grimoire-hero-content">
          <span className="home-eyebrow">Mesa do Mestre</span>
          <h2 className="font-cinzel">Grimório do Mestre</h2>
          <p>Gerencie grimórios e rituais da campanha.</p>
        </div>
      </section>

      <div className="flex items-center justify-center gap-2 px-6 py-4 border-b border-sep/15">
        {KNOWLEDGE_TABS.map(kt => (
          <button key={kt.key} type="button" onClick={() => { setActiveKnowledge(kt.key); setView('grimorios'); setActiveGrimorioId(null) }}
            className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeKnowledge === kt.key
                ? 'text-void bg-white/90 shadow-lg shadow-white/10'
                : 'text-txt-dim hover:text-txt-main hover:bg-white/5'
            }`}>
            <span className="mr-1.5">{kt.icon}</span>{kt.label}
          </button>
        ))}
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {view === 'grimorios' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-txt-dim/40 text-[10px] uppercase tracking-wider">{tab.icon} {tab.label}</span>
                <h3 className="font-cinzel text-txt-main text-lg">{tab.label} — Grimórios</h3>
              </div>
              <button type="button" onClick={() => setAllRitualsOpen(true)}
                className="px-4 py-2 rounded-lg bg-white/5 text-txt-dim text-xs font-semibold border border-sep/20 hover:bg-white/10 hover:text-txt-main transition-colors">
                Todos os Rituais ({allRituals.length})
              </button>
            </div>

            {loading ? (
              <p className="text-txt-dim text-sm animate-pulse text-center py-12">Carregando grimórios...</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {knowledgeGrimorios.map(g => {
                  const tier = GRIMORIO_TIERS.find(t => t.id === g.tier)
                  const ritualCount = g.isDefault
                    ? allRituals.filter(r => r.circle <= (g.maxCircle || 2)).length
                    : (g.rituals || []).length
                  return (
                    <button key={g.id} type="button" onClick={() => { setActiveGrimorioId(g.id); setView('grimorio-detail') }}
                      className="relative rounded-2xl border border-sep/20 bg-void/40 flex flex-col items-center p-4 aspect-[3/4] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:border-sep/40 text-left">
                      <div className="w-full flex-1 rounded-xl bg-void/60 border border-sep/15 flex items-center justify-center overflow-hidden mb-3">
                        {g.image ? (
                          <img src={g.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-5xl opacity-15">{tab.icon}</span>
                        )}
                      </div>
                      <span className="text-txt-main text-xs font-semibold text-center leading-tight">{g.name}</span>
                      <span className="text-txt-dim/40 text-[10px] mt-1">{tier?.name || 'Personalizado'}</span>
                      <span className="text-amber-300/50 text-[10px] font-mono mt-0.5">{ritualCount} rituais</span>
                      {g.sourceName && <span className="text-purple-300/30 text-[9px] mt-0.5 italic truncate w-full text-center">{g.sourceName}</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </>
        )}

        {view === 'grimorio-detail' && activeGrimorio && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button type="button" onClick={() => { setView('grimorios'); setActiveGrimorioId(null) }}
                className="px-3 py-1.5 rounded-lg bg-white/5 text-txt-dim text-xs font-semibold border border-sep/20 hover:bg-white/10 hover:text-txt-main transition-colors">
                ← Grimórios
              </button>
              <div className="flex-1">
                <span className="text-txt-dim/40 text-[10px] uppercase tracking-wider">{tab.icon} {tab.label}</span>
                <h3 className="font-cinzel text-txt-main text-lg">{activeGrimorio.name}</h3>
              </div>
              <span className="text-txt-dim/40 text-[10px] font-mono">{grimorioRituals.length} rituais</span>
            </div>

            {activeGrimorio.description && (
              <p className="text-txt-dim/50 text-xs mb-6 max-w-2xl">{activeGrimorio.description}</p>
            )}

            {grimorioRituals.length === 0 ? (
              <p className="text-txt-dim/40 text-sm italic text-center py-12">Nenhum ritual encontrado neste grimório.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {grimorioRituals.slice().sort((a, b) => a.circle - b.circle || a.name.localeCompare(b.name)).map(r => (
                  <button key={r.id} type="button" onClick={() => setInspectId(r.id)}
                    className={`rounded-xl border p-3 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] aspect-square flex flex-col justify-between ${CIRCLE_BG[r.circle] || CIRCLE_BG[1]}`}>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] border rounded-full px-1 py-0.5 ${CIRCLE_BADGE[r.circle] || CIRCLE_BADGE[1]}`}>{r.circle}o</span>
                        {r.source_name && <span className="text-txt-dim/30 text-[8px] truncate ml-1 max-w-[50%]">{r.source_name}</span>}
                      </div>
                      <span className="text-txt-main text-[11px] font-semibold leading-tight line-clamp-2">{r.name}</span>
                      <p className="text-txt-dim/40 text-[9px] line-clamp-2 mt-1">{r.short_description || '—'}</p>
                    </div>
                    <span className="text-amber-300/50 text-[10px] font-mono mt-auto">{r.pe_cost || 0} PE</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {allRitualsOpen && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => setAllRitualsOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-6xl max-h-[85vh] bg-[#0a0c14] border border-sep/30 rounded-2xl shadow-2xl flex overflow-hidden"
            onClick={e => e.stopPropagation()} style={{ '--grimoire-accent': tab.accent }}>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between px-5 py-4 border-b border-sep/20">
                <div className="flex items-center gap-3">
                  <span className={`text-xl ${tab.accentClass}`}>{tab.icon}</span>
                  <h3 className={`font-cinzel text-sm uppercase tracking-wider font-semibold ${tab.accentClass}`}>Todos os Rituais de {tab.label}</h3>
                  <span className="text-[10px] text-txt-dim font-mono">{filteredAllRituals.length}</span>
                </div>
                <button type="button" onClick={() => setAllRitualsOpen(false)} className="text-txt-dim hover:text-txt-main text-lg transition-colors">×</button>
              </div>

              <div className="flex items-center gap-2 px-5 py-3 border-b border-sep/15">
                <input type="text" value={allRitualsSearch} onChange={e => setAllRitualsSearch(e.target.value)} placeholder="Pesquisar ritual..."
                  className="flex-1 bg-void border border-sep rounded-lg px-3 py-2 text-sm text-txt-main focus:border-gold/40 outline-none" />
                <div className="flex gap-1">
                  {['all', '1', '2', '3', '4'].map(c => (
                    <button key={c} type="button" onClick={() => setAllRitualsCircle(c)}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                        allRitualsCircle === c ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-void border border-sep/30 text-txt-dim hover:border-sep/50'
                      }`}>
                      {c === 'all' ? 'Todos' : `${c}o`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {filteredAllRituals.length === 0 ? (
                  <p className="text-txt-dim text-sm italic text-center py-8">Nenhum ritual encontrado.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredAllRituals.map(r => (
                      <button key={r.id} type="button" onClick={() => setInspectId(inspectId === r.id ? null : r.id)}
                        className={`rounded-xl border p-3 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] aspect-square flex flex-col justify-between ${CIRCLE_BG[r.circle] || CIRCLE_BG[1]} ${inspectId === r.id ? 'ring-1 ring-white/20' : ''}`}>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-[9px] border rounded-full px-1 py-0.5 ${CIRCLE_BADGE[r.circle] || CIRCLE_BADGE[1]}`}>{r.circle}o</span>
                            {r.source_name && <span className="text-txt-dim/30 text-[8px] truncate ml-1 max-w-[50%]">{r.source_name}</span>}
                          </div>
                          <span className="text-txt-main text-[11px] font-semibold leading-tight line-clamp-2">{r.name}</span>
                          <p className="text-txt-dim/40 text-[9px] line-clamp-2 mt-1">{r.short_description || '—'}</p>
                        </div>
                        <span className="text-amber-300/50 text-[10px] font-mono mt-auto">{r.pe_cost || 0} PE</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {inspectedRitual && (
              <div className="w-80 shrink-0 border-l border-sep/20 bg-[#080a12] overflow-y-auto">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${CIRCLE_BADGE[inspectedRitual.circle] || CIRCLE_BADGE[1]}`}>{inspectedRitual.circle}o</span>
                      <span className="text-txt-dim text-[10px]">{inspectedRitual.category || '—'}</span>
                    </div>
                    <button type="button" onClick={() => setInspectId(null)} className="text-txt-dim/50 hover:text-txt-main text-xs">×</button>
                  </div>
                  <h4 className="text-txt-main font-semibold leading-tight">{inspectedRitual.name}</h4>
                  {inspectedRitual.short_description && <p className="text-txt-dim text-xs leading-relaxed">{inspectedRitual.short_description}</p>}
                  {inspectedRitual.effect && <p className="text-txt-dim/60 text-[11px] leading-relaxed whitespace-pre-line">{inspectedRitual.effect}</p>}
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    <span className="text-amber-300">{inspectedRitual.pe_cost || 0} PE</span>
                    <span className="text-gold">{inspectedRitual.circle || 1}o Círculo</span>
                  </div>
                  {inspectedRitual.action_cost && <div className="text-[10px] font-mono text-purple-300">{inspectedRitual.action_cost}</div>}
                  {inspectedRitual.duration && <div className="text-[10px] font-mono text-sky-300">{inspectedRitual.duration}</div>}
                  {inspectedRitual.range && <div className="text-[10px] font-mono text-txt-dim">{inspectedRitual.range}</div>}
                  {inspectedRitual.source_name && <div className="text-[10px] font-mono text-purple-300/60 border-t border-sep/10 pt-2">{inspectedRitual.source_name}</div>}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {view === 'grimorio-detail' && inspectedRitual && createPortal(
        <div className="fixed inset-0 z-[60] flex justify-end" onClick={() => setInspectId(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-sm h-full bg-[#0a0c14]/95 border-l border-sep/20 shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-sep/20">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] border rounded-full px-1.5 py-0.5 ${CIRCLE_BADGE[inspectedRitual.circle] || CIRCLE_BADGE[1]}`}>{inspectedRitual.circle}o</span>
                <span className="text-txt-main text-sm font-semibold truncate">{inspectedRitual.name}</span>
              </div>
              <button type="button" onClick={() => setInspectId(null)} className="text-txt-dim hover:text-txt-main transition-colors">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {inspectedRitual.category && <span className="text-txt-dim text-[10px] uppercase tracking-wider">{inspectedRitual.category}</span>}
              {inspectedRitual.short_description && <p className="text-txt-dim text-xs leading-relaxed">{inspectedRitual.short_description}</p>}
              {inspectedRitual.effect && <p className="text-txt-dim/60 text-[11px] leading-relaxed whitespace-pre-line">{inspectedRitual.effect}</p>}
              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="text-amber-300">{inspectedRitual.pe_cost || 0} PE</span>
                <span className="text-gold">{inspectedRitual.circle || 1}o Círculo</span>
              </div>
              {inspectedRitual.action_cost && <div className="text-[10px] font-mono text-purple-300">{inspectedRitual.action_cost}</div>}
              {inspectedRitual.duration && <div className="text-[10px] font-mono text-sky-300">{inspectedRitual.duration}</div>}
              {inspectedRitual.range && <div className="text-[10px] font-mono text-txt-dim">{inspectedRitual.range}</div>}
              {inspectedRitual.source_name && <div className="text-[10px] font-mono text-purple-300/60 border-t border-sep/10 pt-2">Fonte: {inspectedRitual.source_name}</div>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
