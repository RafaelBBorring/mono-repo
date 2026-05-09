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
import { PUBLIC_GRIMORIOS } from '../data/publicGrimorios'
import { GRIMORIO_TIERS, GRIMORIO_TYPE_LABELS } from '../data/grimorios'

const CIRCLE_BADGE = {
  1: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25',
  2: 'bg-sky-400/12 text-sky-300 border-sky-400/25',
  3: 'bg-purple-400/12 text-purple-300 border-purple-400/25',
  4: 'bg-amber-300/12 text-amber-200 border-amber-300/30',
}

const LIBRARIES = [
  {
    id: 'spells',
    ritualType: 'spell',
    label: 'Feitiços',
    singular: 'Feitiço',
    title: 'Biblioteca de Feitiços',
    detail: 'Tradições, pactos, palavras e marcas.',
    icon: 'FE',
    accent: '#c084fc',
    categories: SPELL_CATEGORIES,
    fetchLibrary: fetchSpellRituals,
    saveEntry: saveSpellRitual,
  },
  {
    id: 'alchemy',
    ritualType: 'alchemy',
    label: 'Rituais',
    singular: 'Ritual',
    title: 'Rituais de Alquimia',
    detail: 'Fórmulas, regentes e contrapesos.',
    icon: 'AL',
    accent: '#e8c97e',
    categories: ALCHEMY_CATEGORIES,
    fetchLibrary: fetchAlchemyRituals,
    saveEntry: saveAlchemyRitual,
  },
  {
    id: 'magic',
    ritualType: 'magic',
    label: 'Magias',
    singular: 'Magia',
    title: 'Biblioteca de Magias',
    detail: 'Escolas arcanas e princípios de poder.',
    icon: 'MG',
    accent: '#38bdf8',
    categories: MAGIC_CATEGORIES,
    fetchLibrary: fetchMagicRituals,
    saveEntry: saveMagicRitual,
  },
  {
    id: 'runes',
    ritualType: 'rune',
    label: 'Runas',
    singular: 'Runa',
    title: 'Biblioteca de Runas',
    detail: 'Inscrições, graus e domínios primordiais.',
    icon: 'RU',
    accent: '#34d399',
    categories: RUNE_CATEGORIES,
    fetchLibrary: fetchRuneRituals,
    saveEntry: saveRuneRitual,
  },
]

function emptyForm(config) {
  return {
    ritual_type: config.ritualType,
    name: '',
    circle: 1,
    category: config.categories[0] || 'Utilidade',
    pe_cost: 5,
    min_level: 1,
    action_cost: 'Ação Padrão',
    duration: 'Instantâneo',
    range: 'Pessoal',
    short_description: '',
    effect: '',
    source_kind: 'neutro',
    source_name: '',
    law_name: '',
    price: '',
    rupture_risk: 1,
    protocol_layer: 2,
    pp_estimate: 4,
    tags: '',
    ai_feedback: '',
  }
}

function toForm(entry, config, keepId = false) {
  return {
    ...(keepId && entry.id ? { id: entry.id } : {}),
    ritual_type: entry.ritual_type || config.ritualType,
    name: entry.name || '',
    circle: entry.circle || 1,
    category: entry.category || config.categories[0] || 'Utilidade',
    pe_cost: entry.pe_cost || 0,
    min_level: entry.min_level || 1,
    action_cost: entry.action_cost || 'Ação Padrão',
    duration: entry.duration || 'Instantâneo',
    range: entry.range || 'Pessoal',
    short_description: entry.short_description || '',
    effect: entry.effect || '',
    source_kind: entry.source_kind || 'neutro',
    source_name: entry.source_name || '',
    law_name: entry.law_name || '',
    price: entry.price || '',
    rupture_risk: entry.rupture_risk || 1,
    protocol_layer: entry.protocol_layer || 2,
    pp_estimate: entry.pp_estimate || 0,
    tags: Array.isArray(entry.tags) ? entry.tags.join(', ') : '',
    ai_feedback: entry.ai_feedback || '',
  }
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

    const glyphGeometry = new THREE.IcosahedronGeometry(0.045, 0)
    const glyphs = new THREE.InstancedMesh(glyphGeometry, cyan, 84)
    const dummy = new THREE.Object3D()
    const glyphSeeds = Array.from({ length: 84 }, (_, i) => ({
      angle: (i / 84) * Math.PI * 2,
      radius: 1.15 + Math.random() * 1.8,
      y: -0.1 + Math.random() * 2.2,
      speed: 0.12 + Math.random() * 0.18,
      scale: 0.6 + Math.random() * 1.5,
    }))
    root.add(glyphs)

    const dustCount = 700
    const dustGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(dustCount * 3)
    for (let i = 0; i < dustCount; i += 1) {
      const radius = 1 + Math.random() * 5.6
      const angle = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = (Math.random() - 0.48) * 4.2
      positions[i * 3 + 2] = Math.sin(angle) * radius - 1
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
      size: 0.032,
      color: 0xd9fff8,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
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

      glyphSeeds.forEach((seed, i) => {
        const angle = seed.angle + t * seed.speed
        dummy.position.set(Math.cos(angle) * seed.radius, seed.y + Math.sin(t * 1.4 + i) * 0.08, Math.sin(angle) * seed.radius - 0.28)
        dummy.rotation.set(t * 0.4 + i, angle, t * 0.2)
        dummy.scale.setScalar(seed.scale)
        dummy.updateMatrix()
        glyphs.setMatrixAt(i, dummy.matrix)
      })
      glyphs.instanceMatrix.needsUpdate = true
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
      dustGeometry.dispose()
      glyphGeometry.dispose()
      cover.geometry.dispose()
      pageLeft.geometry.dispose()
      ringA.geometry.dispose()
      ringB.geometry.dispose()
      knot.geometry.dispose()
      gold.dispose()
      violet.dispose()
      pageRightMaterial.dispose()
      cyan.dispose()
      dust.material.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="grimoire-canvas" aria-hidden="true" />
}

export default function GrimoireAdminPage() {
  const { user } = useAuth()
  const [activeId, setActiveId] = useState('spells')
  const [libraries, setLibraries] = useState({})
  const [sourceModes, setSourceModes] = useState({})
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [circleFilter, setCircleFilter] = useState('all')
  const [modalState, setModalState] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [grimorioModalOpen, setGrimorioModalOpen] = useState(false)
  const [grimorioViewId, setGrimorioViewId] = useState(null)

  const activeConfig = LIBRARIES.find((item) => item.id === activeId) || LIBRARIES[0]
  const activeItems = libraries[activeId] || []

  useEffect(() => { loadAll() }, [])

  async function loadAll(select = activeId) {
    setLoading(true)
    const pairs = await Promise.all(LIBRARIES.map(async (config) => {
      const res = await config.fetchLibrary()
      return [config.id, res]
    }))
    const nextLibraries = {}
    const nextSources = {}
    pairs.forEach(([id, res]) => {
      nextLibraries[id] = res.data || []
      nextSources[id] = res.source || 'database'
    })
    setLibraries(nextLibraries)
    setSourceModes(nextSources)
    setActiveId(select)
    setLoading(false)
  }

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase()
    return activeItems.filter((item) => {
      const matchesName = !term || `${item.name || ''} ${item.category || ''} ${item.source_name || ''}`.toLowerCase().includes(term)
      const matchesCircle = circleFilter === 'all' || Number(item.circle) === Number(circleFilter)
      return matchesName && matchesCircle
    })
  }, [activeItems, query, circleFilter])

  function openCreate(config = activeConfig) {
    setError('')
    setModalState({ mode: 'create', config, form: emptyForm(config) })
  }

  function openEdit(item) {
    const source = sourceModes[activeId] || 'database'
    setError('')
    setModalState({
      mode: source === 'database' ? 'edit' : 'copy',
      config: activeConfig,
      form: toForm(item, activeConfig, source === 'database'),
    })
  }

  function updateForm(patch) {
    setModalState((prev) => prev ? { ...prev, form: { ...prev.form, ...patch } } : prev)
  }

  async function handleSave() {
    if (!modalState) return
    const { config, form, mode } = modalState
    const payload = {
      ...(mode === 'edit' && form.id ? { id: form.id } : {}),
      ritual_type: config.ritualType,
      name: form.name.trim(),
      circle: Number(form.circle) || 1,
      category: form.category,
      pe_cost: Number(form.pe_cost) || 0,
      min_level: Number(form.min_level) || 1,
      action_cost: form.action_cost.trim(),
      duration: form.duration.trim(),
      range: form.range.trim(),
      short_description: form.short_description.trim(),
      effect: form.effect.trim(),
      source_kind: form.source_kind,
      source_name: form.source_name.trim(),
      law_name: form.law_name.trim(),
      price: form.price.trim(),
      rupture_risk: Number(form.rupture_risk) || 1,
      protocol_layer: Number(form.protocol_layer) || 2,
      pp_estimate: Number(form.pp_estimate) || 0,
      tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
      ai_feedback: form.ai_feedback.trim(),
      created_by: user?.id || null,
      updated_at: new Date().toISOString(),
    }
    if (!payload.name || !payload.effect) {
      setError('Preencha ao menos nome e efeito.')
      return
    }
    setSaving(true)
    setError('')
    const { error: saveError } = await config.saveEntry(payload)
    setSaving(false)
    if (saveError) {
      setError(saveError.message || 'Não foi possível salvar no grimório.')
      return
    }
    setModalState(null)
    await loadAll(config.id)
  }

  return (
    <div className="grimoire-page">
      <section className="grimoire-hero">
        <GrimoireThreeStage />
        <div className="grimoire-hero-content">
          <span className="home-eyebrow">Mesa do Mestre</span>
          <h2 className="font-cinzel">Grimório do Mestre</h2>
          <p>Quatro bibliotecas vivas para consultar, filtrar e forjar novos poderes da campanha.</p>
        </div>
        <button type="button" onClick={() => openCreate(activeConfig)} className="grimoire-forge-button">
          Criar {activeConfig.singular}
        </button>
      </section>

      <div className="grimoire-library-grid">
        {LIBRARIES.map((config) => {
          const total = libraries[config.id]?.length || 0
          const selected = activeId === config.id
          return (
            <button key={config.id} type="button" onClick={() => { setActiveId(config.id); setQuery(''); setCircleFilter('all') }}
              className={`grimoire-library-card ${selected ? 'is-active' : ''}`}
              style={{ '--grimoire-accent': config.accent }}>
              <span>{config.icon}</span>
              <strong>{config.title}</strong>
              <small>{config.detail}</small>
              <em>{total} registros</em>
            </button>
          )
        })}
      </div>

      <section className="px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="home-eyebrow">Coleção</span>
            <h3 className="font-cinzel text-txt-main text-lg">Grimórios</h3>
          </div>
          <button type="button" onClick={() => setGrimorioModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-gold/15 text-gold text-xs font-semibold border border-gold/25 hover:bg-gold/25 transition-colors active:scale-[0.99]">
            + Novo Grimório
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {PUBLIC_GRIMORIOS.map(g => (
            <button key={g.id} type="button" onClick={() => setGrimorioViewId(grimorioViewId === g.id ? null : g.id)}
              className="relative rounded-2xl border border-sep/20 bg-void/40 flex flex-col items-center p-4 aspect-[3/4] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:border-sep/40 text-left">
              <div className="w-full flex-1 rounded-xl bg-void/60 border border-sep/15 flex items-center justify-center overflow-hidden mb-3">
                {g.image ? (
                  <img src={g.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl opacity-20">📖</span>
                )}
              </div>
              <span className="text-txt-main text-xs font-semibold text-center leading-tight">{g.name}</span>
              <span className="text-txt-dim/50 text-[10px] mt-1">{GRIMORIO_TYPE_LABELS[g.knowledgeKey] || g.knowledgeKey}</span>
              <span className="text-amber-300/60 text-[10px] font-mono mt-0.5">{g.rituals.length} rituais</span>
              {g.sourceName && <span className="text-purple-300/40 text-[9px] mt-0.5 italic truncate w-full text-center">{g.sourceName}</span>}
            </button>
          ))}

          <button type="button" onClick={() => setGrimorioModalOpen(true)}
            className="rounded-2xl border-2 border-dashed border-sep/15 hover:border-sep/30 flex items-center justify-center aspect-[3/4] transition-all duration-200 hover:bg-white/[0.02] active:scale-[0.98]">
            <span className="text-txt-dim/25 text-2xl">+</span>
          </button>
        </div>

        {grimorioViewId && (() => {
          const g = PUBLIC_GRIMORIOS.find(x => x.id === grimorioViewId)
          if (!g) return null
          const tier = GRIMORIO_TIERS.find(t => t.id === g.tier)
          const circles = [1, 2, 3, 4]
          return (
            <div className="mt-4 border border-sep/15 rounded-xl bg-void/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-sep/15">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-10 rounded bg-void/50 border border-sep/15 flex items-center justify-center overflow-hidden">
                    {g.image ? <img src={g.image} alt="" className="w-full h-full object-cover" /> : <span className="text-sm opacity-30">📖</span>}
                  </div>
                  <div>
                    <span className="text-txt-main text-sm font-semibold">{g.name}</span>
                    <div className="text-[10px] text-txt-dim/50 font-mono">{tier?.name || '—'} · {g.rituals.length} rituais · {g.sourceName}</div>
                  </div>
                </div>
                <button type="button" onClick={() => setGrimorioViewId(null)} className="text-txt-dim hover:text-txt-main text-sm">×</button>
              </div>
              {g.description && <p className="text-txt-dim/50 text-xs px-4 py-2 border-b border-sep/10">{g.description}</p>}
              <div className="p-4">
                {circles.map(c => {
                  const rituals = g.rituals.filter(r => r.circle === c)
                  if (rituals.length === 0) return null
                  return (
                    <div key={c} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[9px] border rounded-full px-1.5 py-0.5 ${CIRCLE_BADGE[c] || CIRCLE_BADGE[1]}`}>{c}o Círculo</span>
                        <span className="text-txt-dim/30 text-[10px]">{rituals.length} rituais</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {rituals.map(r => (
                          <div key={r.id} className="rounded-lg border border-sep/10 bg-void/30 p-2">
                            <span className="text-txt-main text-[10px] font-semibold line-clamp-1">{r.name}</span>
                            <p className="text-txt-dim/40 text-[9px] line-clamp-2 mt-0.5">{r.short_description}</p>
                            <span className="text-amber-300/50 text-[9px] font-mono">{r.pe_cost} PE</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </section>

      <section className="grimoire-shelf">
        <div className="grimoire-shelf-head">
          <div>
            <span className="home-eyebrow">{sourceModes[activeId] === 'database' ? 'Banco ativo' : 'Catálogo local'}</span>
            <h3 className="font-cinzel">{activeConfig.title}</h3>
          </div>
          <div className="grimoire-filters">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar por nome, categoria ou fonte" />
            <select value={circleFilter} onChange={(e) => setCircleFilter(e.target.value)}>
              <option value="all">Todos os graus</option>
              {[1, 2, 3, 4].map((circle) => <option key={circle} value={circle}>{circle}º grau</option>)}
            </select>
            <button type="button" onClick={() => openCreate(activeConfig)}>Novo</button>
          </div>
        </div>

        {loading ? (
          <p className="text-txt-dim text-sm animate-pulse p-6">Abrindo o grimório...</p>
        ) : filteredItems.length === 0 ? (
          <div className="grimoire-empty">
            <strong>Nenhum registro encontrado.</strong>
            <span>Ajuste os filtros ou crie um novo item nesta biblioteca.</span>
          </div>
        ) : (
          <div className="grimoire-card-grid">
            {filteredItems.map((item) => (
              <article key={item.id || item.name} className="grimoire-entry-card" style={{ '--grimoire-accent': activeConfig.accent }}>
                <div className="grimoire-entry-top">
                  <span className={`border ${CIRCLE_BADGE[item.circle] || CIRCLE_BADGE[1]}`}>{item.circle || 1}º</span>
                  <small>{item.category || 'Sem categoria'}</small>
                </div>
                <h4 className="font-cinzel">{item.name}</h4>
                <p>{item.short_description || item.effect || 'Sem descrição breve.'}</p>
                <div className="grimoire-entry-meta">
                  <span>{item.pe_cost || 0} PE</span>
                  <span>{item.source_name || item.source_kind || 'Fonte oculta'}</span>
                </div>
                <button type="button" onClick={() => openEdit(item)}>
                  {sourceModes[activeId] === 'database' ? 'Editar' : 'Copiar para o banco'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalState && createPortal(
        <GrimoireEntryModal
          state={modalState}
          saving={saving}
          error={error}
          onChange={updateForm}
          onSave={handleSave}
          onClose={() => setModalState(null)}
        />,
        document.body
      )}

      {grimorioModalOpen && createPortal(
        <GrimorioCreateModal onClose={() => setGrimorioModalOpen(false)} />,
        document.body
      )}
    </div>
  )
}

function GrimorioCreateModal({ onClose }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const [knowledgeKey, setKnowledgeKey] = useState('magic')
  const [tier, setTier] = useState('iniciante')
  const [sourceName, setSourceName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true)
    setError('')
    const tierData = GRIMORIO_TIERS.find(t => t.id === tier)
    const payload = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      image: image.trim(),
      knowledgeKey,
      tier,
      maxCircle: tierData?.maxCircle || 2,
      isPublic: true,
      sourceKind: 'limiar',
      sourceName: sourceName.trim(),
      created_at: new Date().toISOString(),
    }
    try {
      const { saveGrimorio } = await import('../services/alchemyService')
      const { error: saveError } = await saveGrimorio(payload)
      if (saveError) throw saveError
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar grimório.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div className="grimoire-modal modal-content" onClick={e => e.stopPropagation()}>
        <div className="grimoire-modal-head">
          <div>
            <span className="home-eyebrow">Coleção</span>
            <h3 className="font-cinzel">Novo Grimório</h3>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        {error && <p className="grimoire-error">{error}</p>}
        <div className="grimoire-form-grid">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do Grimório" className="span-2" />
          <select value={knowledgeKey} onChange={e => setKnowledgeKey(e.target.value)}>
            {Object.entries(GRIMORIO_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={tier} onChange={e => setTier(e.target.value)}>
            {GRIMORIO_TIERS.map(t => <option key={t.id} value={t.id}>{t.name} (1o-{t.maxCircle}o)</option>)}
          </select>
          <input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="Entidade / Fonte" className="span-2" />
          <input value={image} onChange={e => setImage(e.target.value)} placeholder="URL da imagem" className="span-2" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Descrição do grimório" className="span-2" />
        </div>
        <div className="grimoire-modal-actions">
          <button type="button" onClick={onClose}>Cancelar</button>
          <button type="button" onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Criar Grimório'}</button>
        </div>
      </div>
    </div>
  )
}

function GrimoireEntryModal({ state, saving, error, onChange, onSave, onClose }) {
  const { config, form, mode } = state
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4 modal-bg" onClick={onClose}>
      <div className="grimoire-modal modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="grimoire-modal-head">
          <div>
            <span className="home-eyebrow">{config.title}</span>
            <h3 className="font-cinzel">{mode === 'edit' ? `Editar ${config.singular}` : `Novo ${config.singular}`}</h3>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>

        {error && <p className="grimoire-error">{error}</p>}

        <div className="grimoire-form-grid">
          <input value={form.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={`Nome do ${config.singular.toLowerCase()}`} className="span-2" />
          <select value={form.circle} onChange={(e) => onChange({ circle: e.target.value })}>
            {[1, 2, 3, 4].map((circle) => <option key={circle} value={circle}>{circle}º grau</option>)}
          </select>
          <select value={form.category} onChange={(e) => onChange({ category: e.target.value })}>
            {config.categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <input type="number" value={form.pe_cost} onChange={(e) => onChange({ pe_cost: e.target.value })} placeholder="Custo em PE" />
          <input type="number" value={form.min_level} onChange={(e) => onChange({ min_level: e.target.value })} placeholder="Nível mínimo" />
          <input value={form.action_cost} onChange={(e) => onChange({ action_cost: e.target.value })} placeholder="Ação" />
          <input value={form.duration} onChange={(e) => onChange({ duration: e.target.value })} placeholder="Duração" />
          <input value={form.range} onChange={(e) => onChange({ range: e.target.value })} placeholder="Alcance" />
          <select value={form.source_kind} onChange={(e) => onChange({ source_kind: e.target.value })}>
            <option value="neutro">Neutro</option>
            <option value="regente">Regente</option>
            <option value="limiar">Limiar</option>
          </select>
          <input value={form.source_name} onChange={(e) => onChange({ source_name: e.target.value })} placeholder="Fonte / Escola / Entidade" />
          <input value={form.law_name} onChange={(e) => onChange({ law_name: e.target.value })} placeholder="Lei / Domínio / Princípio" />
          <textarea value={form.short_description} onChange={(e) => onChange({ short_description: e.target.value })} rows={2} placeholder="Descrição breve" className="span-2" />
          <textarea value={form.effect} onChange={(e) => onChange({ effect: e.target.value })} rows={5} placeholder="Efeito completo, custo, testes, riscos e limitações" className="span-2" />
          <textarea value={form.price} onChange={(e) => onChange({ price: e.target.value })} rows={2} placeholder="Contrapeso / preço narrativo" />
          <textarea value={form.tags} onChange={(e) => onChange({ tags: e.target.value })} rows={2} placeholder="Tags separadas por vírgula" />
          <input type="number" value={form.rupture_risk} onChange={(e) => onChange({ rupture_risk: e.target.value })} placeholder="Risco" />
          <input type="number" value={form.protocol_layer} onChange={(e) => onChange({ protocol_layer: e.target.value })} placeholder="Camada" />
          <input type="number" value={form.pp_estimate} onChange={(e) => onChange({ pp_estimate: e.target.value })} placeholder="PP estimado" />
        </div>

        <div className="grimoire-modal-actions">
          <button type="button" onClick={onClose}>Cancelar</button>
          <button type="button" onClick={onSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar no Grimório'}</button>
        </div>
      </div>
    </div>
  )
}
