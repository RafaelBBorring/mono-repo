import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { WEAPONS, WEAPON_POWER_LEVELS } from '../data/weapons'
import { RANK_COLORS } from '../data/colors'
import { fetchMysticWeapons, saveMysticWeapon, deleteMysticWeapon } from '../services/alchemyService'
import { analyzeLegendaryWeaponDraft } from '../services/aiService'
import { useAuth } from '../contexts/AuthContext'

const SKILL_LIMITS = {
  menor: { passivas: 1, ativas: 1, ultimates: 0 },
  notavel: { passivas: 1, ativas: 2, ultimates: 1 },
  maior: { passivas: 2, ativas: 2, ultimates: 1 },
  suprema: { passivas: 2, ativas: 3, ultimates: 1 },
}

const SKILL_TYPE_META = {
  passivas: { label: 'Habilidades Passivas', singular: 'Passiva', headerClass: 'text-emerald-400', borderClass: 'border-emerald-400/25', bgClass: 'bg-emerald-400/5', btnBorder: 'border-emerald-400/30', btnText: 'text-emerald-400', btnHover: 'hover:bg-emerald-400/10' },
  ativas: { label: 'Habilidades Ativas', singular: 'Ativa', headerClass: 'text-sky-400', borderClass: 'border-sky-400/25', bgClass: 'bg-sky-400/5', btnBorder: 'border-sky-400/30', btnText: 'text-sky-400', btnHover: 'hover:bg-sky-400/10' },
  ultimates: { label: 'Habilidades Ultimate', singular: 'Ultimate', headerClass: 'text-purple-400', borderClass: 'border-purple-400/25', bgClass: 'bg-purple-400/5', btnBorder: 'border-purple-400/30', btnText: 'text-purple-400', btnHover: 'hover:bg-purple-400/10' },
}

function tagValue(tags = [], key) {
  const found = tags.find(t => t.startsWith(`${key}:`))
  return found ? found.slice(key.length + 1) : ''
}

function emptySkill() {
  return { nome: '', descricao: '', custoPE: 0 }
}

function emptyForm() {
  return {
    name: '',
    rank: 'Lendária',
    base: 'custom',
    dano: '',
    attr: 'AM',
    effect: '',
    image: '',
    power_level: 'notavel',
    lore: '',
    habilidades: { passivas: [], ativas: [], ultimates: [] },
  }
}

function parseAiFeedback(raw) {
  try {
    const parsed = JSON.parse(raw || '{}')
    return {
      lore: parsed.lore || '',
      habilidades: {
        passivas: Array.isArray(parsed.habilidades?.passivas) ? parsed.habilidades.passivas : [],
        ativas: Array.isArray(parsed.habilidades?.ativas) ? parsed.habilidades.ativas : [],
        ultimates: Array.isArray(parsed.habilidades?.ultimates) ? parsed.habilidades.ultimates : [],
      },
    }
  } catch {
    return { lore: '', habilidades: { passivas: [], ativas: [], ultimates: [] } }
  }
}

function toForgeItem(item) {
  const tags = item.tags || []
  const extra = parseAiFeedback(item.ai_feedback)
  return {
    id: item.id,
    name: item.name || 'Arma Lendária',
    rank: tagValue(tags, 'rank') || item.duration || 'Lendária',
    base: tagValue(tags, 'base') || item.range || item.law_name || 'custom',
    dano: item.price || '',
    attr: tagValue(tags, 'attr') || item.action_cost || 'AM',
    image: tagValue(tags, 'image'),
    source: item.source_name || 'Forja Lendária',
    short: item.short_description || '',
    effect: item.effect || '',
    power_level: tagValue(tags, 'power_level') || 'notavel',
    lore: extra.lore,
    habilidades: extra.habilidades,
  }
}

function getSkillWarnings(habilidades, powerLevel) {
  const limits = SKILL_LIMITS[powerLevel] || SKILL_LIMITS.notavel
  const warnings = []
  const label = WEAPON_POWER_LEVELS.find(p => p.value === powerLevel)?.label || powerLevel
  if (habilidades.passivas.length > limits.passivas)
    warnings.push(`${label} sugere até ${limits.passivas} passiva(s). Atual: ${habilidades.passivas.length}. O Mestre pode exceder, mas considere balancear.`)
  if (habilidades.ativas.length > limits.ativas)
    warnings.push(`${label} sugere até ${limits.ativas} ativa(s). Atual: ${habilidades.ativas.length}. O Mestre pode exceder, mas considere balancear.`)
  if (habilidades.ultimates.length > limits.ultimates)
    warnings.push(`${label} sugere até ${limits.ultimates} ultimate(s). Atual: ${habilidades.ultimates.length}. O Mestre pode exceder, mas considere balancear.`)
  return warnings
}

function LegendaryForgeStage() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
    camera.position.set(0, 0.2, 5.5)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))

    const ambient = new THREE.AmbientLight(0x0a0e1a, 0.4)
    scene.add(ambient)

    const forgeGlow = new THREE.PointLight(0xff6b2b, 2.5, 8, 1.5)
    forgeGlow.position.set(0.8, -1, 0.5)
    scene.add(forgeGlow)

    const crystalLight = new THREE.PointLight(0xbef264, 1.8, 6, 1.5)
    crystalLight.position.set(0, 0.5, 1)
    scene.add(crystalLight)

    const accentLight = new THREE.PointLight(0xe8c97e, 0.8, 5)
    accentLight.position.set(-1, 0, 2)
    scene.add(accentLight)

    const root = new THREE.Group()
    scene.add(root)

    const crystalGeom = new THREE.OctahedronGeometry(0.38, 0)
    const crystalMat = new THREE.MeshPhongMaterial({
      color: 0xbef264,
      emissive: 0x3a5f1a,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.85,
      shininess: 120,
    })
    const crystal = new THREE.Mesh(crystalGeom, crystalMat)
    crystal.position.set(0, 0.3, 0)
    root.add(crystal)

    const glowGeom = new THREE.SphereGeometry(0.55, 32, 32)
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xbef264, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })
    const glow = new THREE.Mesh(glowGeom, glowMat)
    glow.position.copy(crystal.position)
    root.add(glow)

    const outerGlowGeom = new THREE.SphereGeometry(0.85, 32, 32)
    const outerGlowMat = new THREE.MeshBasicMaterial({ color: 0xbef264, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false })
    const outerGlow = new THREE.Mesh(outerGlowGeom, outerGlowMat)
    outerGlow.position.copy(crystal.position)
    root.add(outerGlow)

    const ringGroup = new THREE.Group()
    ringGroup.position.copy(crystal.position)

    const ring1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.015, 16, 128),
      new THREE.MeshBasicMaterial({ color: 0xbef264, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    ring1.rotation.x = Math.PI / 2.2
    ringGroup.add(ring1)

    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.012, 16, 150),
      new THREE.MeshBasicMaterial({ color: 0xe8c97e, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    ring2.rotation.x = Math.PI / 2.5
    ring2.rotation.y = 0.3
    ringGroup.add(ring2)

    const ring3 = new THREE.Mesh(
      new THREE.TorusGeometry(0.9, 0.01, 16, 100),
      new THREE.MeshBasicMaterial({ color: 0xff8844, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })
    )
    ring3.rotation.x = Math.PI / 1.8
    ring3.rotation.z = 0.4
    ringGroup.add(ring3)

    root.add(ringGroup)

    const shardPool = []
    for (let i = 0; i < 8; i++) {
      const shard = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.055 + Math.random() * 0.04, 0),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xbef264 : 0xe8c97e, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
      )
      shard.userData = { angle: (i / 8) * Math.PI * 2, radius: 1.0 + Math.random() * 0.6, yOff: (Math.random() - 0.5) * 0.5, speed: 0.2 + Math.random() * 0.3 }
      root.add(shard)
      shardPool.push(shard)
    }

    const EMBER_N = 300
    const emberGeom = new THREE.BufferGeometry()
    const ePos = new Float32Array(EMBER_N * 3)
    for (let i = 0; i < EMBER_N; i++) {
      ePos[i * 3] = (Math.random() - 0.5) * 3
      ePos[i * 3 + 1] = -2 + Math.random() * -1
      ePos[i * 3 + 2] = (Math.random() - 0.5) * 2
    }
    emberGeom.setAttribute('position', new THREE.BufferAttribute(ePos, 3))
    const emberMat = new THREE.PointsMaterial({ size: 0.035, color: 0xff9944, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })
    const embers = new THREE.Points(emberGeom, emberMat)
    root.add(embers)

    const SPARKLE_N = 120
    const sparkleGeom = new THREE.BufferGeometry()
    const sPos = new Float32Array(SPARKLE_N * 3)
    for (let i = 0; i < SPARKLE_N; i++) {
      sPos[i * 3] = (Math.random() - 0.5) * 6
      sPos[i * 3 + 1] = (Math.random() - 0.5) * 4
      sPos[i * 3 + 2] = (Math.random() - 0.5) * 4
    }
    sparkleGeom.setAttribute('position', new THREE.BufferAttribute(sPos, 3))
    const sparkleMat = new THREE.PointsMaterial({ size: 0.02, color: 0xbef264, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true })
    const sparkles = new THREE.Points(sparkleGeom, sparkleMat)
    root.add(sparkles)

    const clock = new THREE.Clock()
    let frameId = 0

    function resize() {
      const parent = canvas.parentElement
      const w = parent?.clientWidth || 900
      const h = parent?.clientHeight || 360
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)
    }

    function animate() {
      const t = clock.getElapsedTime()

      crystal.rotation.y = t * 0.4
      crystal.rotation.x = Math.sin(t * 0.3) * 0.15
      crystal.position.y = 0.3 + Math.sin(t * 0.8) * 0.08

      glow.scale.setScalar(1 + Math.sin(t * 2.5) * 0.15)
      glow.position.y = crystal.position.y
      outerGlow.scale.setScalar(1 + Math.sin(t * 1.8) * 0.1)
      outerGlow.position.y = crystal.position.y

      forgeGlow.intensity = 2.5 + Math.sin(t * 4) * 0.3 + Math.sin(t * 7.3) * 0.15
      crystalLight.intensity = 1.8 + Math.sin(t * 2.2) * 0.2

      ringGroup.rotation.y = t * 0.15
      ringGroup.position.y = crystal.position.y
      ring1.rotation.z = t * 0.1
      ring2.rotation.z = -t * 0.08
      ring3.rotation.z = t * 0.12
      ring1.material.opacity = 0.4 + Math.sin(t * 1.5) * 0.12
      ring2.material.opacity = 0.28 + Math.sin(t * 1.2 + 1) * 0.08
      ring3.material.opacity = 0.22 + Math.sin(t * 1.8 + 2) * 0.08

      for (const s of shardPool) {
        const d = s.userData
        d.angle += d.speed * 0.016
        s.position.x = Math.cos(d.angle) * d.radius
        s.position.z = Math.sin(d.angle) * d.radius * 0.5
        s.position.y = crystal.position.y + d.yOff + Math.sin(t * 0.5 + d.angle) * 0.1
        s.rotation.x = t * 0.5
        s.rotation.z = t * 0.3
      }

      const ep = emberGeom.getAttribute('position')
      for (let i = 0; i < EMBER_N; i++) {
        let y = ep.getY(i) + 0.007 + Math.random() * 0.003
        if (y > 3) { y = -2 + Math.random() * -0.5; ep.setX(i, (Math.random() - 0.5) * 3); ep.setZ(i, (Math.random() - 0.5) * 2) }
        ep.setY(i, y)
        ep.setX(i, ep.getX(i) + Math.sin(t + i) * 0.0008)
      }
      ep.needsUpdate = true
      emberMat.opacity = 0.45 + Math.sin(t * 2) * 0.15
      sparkleMat.opacity = 0.18 + Math.sin(t * 1.5) * 0.08

      camera.position.x = Math.sin(t * 0.1) * 0.08
      camera.position.y = 0.2 + Math.sin(t * 0.15) * 0.04
      camera.lookAt(0, 0.2, 0)

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
      crystalGeom.dispose(); crystalMat.dispose()
      glowGeom.dispose(); glowMat.dispose()
      outerGlowGeom.dispose(); outerGlowMat.dispose()
      ring1.geometry.dispose(); ring1.material.dispose()
      ring2.geometry.dispose(); ring2.material.dispose()
      ring3.geometry.dispose(); ring3.material.dispose()
      emberGeom.dispose(); emberMat.dispose()
      sparkleGeom.dispose(); sparkleMat.dispose()
      for (const s of shardPool) { s.geometry.dispose(); s.material.dispose() }
    }
  }, [])

  return <canvas ref={canvasRef} className="legendary-forge-canvas" aria-hidden="true" />
}

export default function MysticWeaponAdminPanel() {
  const { user } = useAuth()
  const fileRef = useRef(null)
  const editorRef = useRef(null)
  const [items, setItems] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [analysisNote, setAnalysisNote] = useState('')
  const [query, setQuery] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)

  useEffect(() => { load() }, [])

  async function load(selectId = null) {
    setLoading(true)
    const res = await fetchMysticWeapons()
    setItems(res.data || [])
    setLoading(false)
    if (selectId) {
      const found = (res.data || []).find(item => item.id === selectId)
      if (found) selectItem(found)
    }
  }

  const forgeItems = useMemo(() => items.map(toForgeItem), [items])
  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase()
    return forgeItems.filter(item => !term || `${item.name} ${item.base} ${item.dano}`.toLowerCase().includes(term))
  }, [forgeItems, query])

  function selectItem(item) {
    const view = item.tags ? toForgeItem(item) : item
    setSelectedId(view.id)
    setForm({
      name: view.name || '',
      rank: view.rank || 'Lendária',
      base: view.base || 'custom',
      dano: view.dano || '',
      attr: view.attr || 'AM',
      effect: view.effect || '',
      image: view.image || '',
      power_level: view.power_level || 'notavel',
      lore: view.lore || '',
      habilidades: view.habilidades || { passivas: [], ativas: [], ultimates: [] },
    })
    setEditorOpen(true)
    setError('')
    setAnalysisNote('')
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  function handleNew() {
    setSelectedId(null)
    setForm(emptyForm())
    setEditorOpen(true)
    setError('')
    setAnalysisNote('')
    setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  function closeEditor() {
    setEditorOpen(false)
    setError('')
  }

  function selectBase(base) {
    const weapon = WEAPONS.find(w => w.id === base)
    setForm(prev => ({
      ...prev,
      base,
      dano: weapon?.dano || prev.dano,
      attr: weapon?.attr || prev.attr,
      name: prev.name || weapon?.name || '',
    }))
  }

  function addSkill(type) {
    setForm(prev => ({
      ...prev,
      habilidades: { ...prev.habilidades, [type]: [...prev.habilidades[type], emptySkill()] },
    }))
  }

  function removeSkill(type, index) {
    setForm(prev => ({
      ...prev,
      habilidades: { ...prev.habilidades, [type]: prev.habilidades[type].filter((_, i) => i !== index) },
    }))
  }

  function updateSkill(type, index, field, value) {
    setForm(prev => {
      const list = [...prev.habilidades[type]]
      list[index] = { ...list[index], [field]: value }
      return { ...prev, habilidades: { ...prev.habilidades, [type]: list } }
    })
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setError('')
    try {
      const draft = {
        name: form.name.trim(),
        dano: form.dano.trim(),
        attr: form.attr.trim(),
        effect: form.effect.trim(),
        base: form.base,
        power_level: form.power_level,
        image: form.image,
        lore: form.lore.trim(),
        habilidades: {
          passivas: form.habilidades.passivas.filter(h => h.nome.trim()),
          ativas: form.habilidades.ativas.filter(h => h.nome.trim()),
          ultimates: form.habilidades.ultimates.filter(h => h.nome.trim()),
        },
      }
      const analyzed = await analyzeLegendaryWeaponDraft(draft, { analysis_note: analysisNote.trim() })
      setForm(prev => ({
        ...prev,
        name: analyzed.name || prev.name,
        dano: analyzed.dano || prev.dano,
        attr: analyzed.attr || prev.attr,
        effect: analyzed.effect || prev.effect,
        power_level: analyzed.power_level || prev.power_level,
        lore: analyzed.lore || prev.lore,
        habilidades: analyzed.habilidades
          ? {
              passivas: analyzed.habilidades.passivas || prev.habilidades.passivas,
              ativas: analyzed.habilidades.ativas || prev.habilidades.ativas,
              ultimates: analyzed.habilidades.ultimates || prev.habilidades.ultimates,
            }
          : prev.habilidades,
      }))
    } catch (err) {
      setError(err.message || 'Falha ao analisar arma lendária.')
    } finally {
      setAnalyzing(false)
    }
  }

  function handleImage(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const size = 320
        const cvs = document.createElement('canvas')
        cvs.width = size; cvs.height = size
        const ctx = cvs.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale; const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        setForm(prev => ({ ...prev, image: cvs.toDataURL('image/webp', 0.78) }))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function handleSave() {
    if (!form.name.trim() || !form.effect.trim()) {
      setError('Preencha ao menos nome e efeito.')
      return
    }
    const habilidadesData = {
      passivas: form.habilidades.passivas.filter(h => h.nome.trim()),
      ativas: form.habilidades.ativas.filter(h => h.nome.trim()),
      ultimates: form.habilidades.ultimates.filter(h => h.nome.trim()),
    }
    const payload = {
      ...(selectedId ? { id: selectedId } : {}),
      ritual_type: 'mystic_weapon',
      name: form.name.trim(),
      circle: 4,
      category: 'Arma Lendária',
      pe_cost: 0,
      min_level: 1,
      action_cost: form.attr.trim(),
      duration: 'Lendária',
      range: form.base,
      short_description: '',
      effect: form.effect.trim(),
      source_kind: 'neutro',
      source_name: 'Forja Lendária',
      law_name: form.base,
      price: form.dano.trim(),
      rupture_risk: 1,
      protocol_layer: 3,
      pp_estimate: 0,
      tags: [`rank:Lendária`, `base:${form.base}`, `attr:${form.attr}`, `power_level:${form.power_level}`, ...(form.image ? [`image:${form.image}`] : [])],
      ai_feedback: JSON.stringify({ lore: form.lore.trim(), habilidades: habilidadesData }),
      created_by: user?.id || null,
      updated_at: new Date().toISOString(),
    }
    setSaving(true)
    setError('')
    const { data, error: saveError } = await saveMysticWeapon(payload)
    setSaving(false)
    if (saveError) {
      setError(saveError.message || 'Não foi possível salvar a arma lendária.')
      return
    }
    await load(data?.id || selectedId)
  }

  async function handleDelete() {
    if (!selectedId) return
    if (!confirm('Excluir esta arma lendária da biblioteca?')) return
    const { error: deleteError } = await deleteMysticWeapon(selectedId)
    if (deleteError) {
      setError(deleteError.message || 'Não foi possível excluir.')
      return
    }
    handleNew()
    setEditorOpen(false)
    await load()
  }

  const selectedItem = forgeItems.find(item => item.id === selectedId)
  const rankColor = RANK_COLORS['Lendária']
  const powerLabel = (lvl) => WEAPON_POWER_LEVELS.find(p => p.value === lvl)?.label || 'Notável'
  const warnings = getSkillWarnings(form.habilidades, form.power_level)

  return (
    <div className="legendary-forge-page">
      <section className="legendary-forge-hero">
        <LegendaryForgeStage />
        <div className="legendary-forge-hero-content">
          <span className="home-eyebrow">Mesa do Mestre</span>
          <h2 className="font-cinzel">Forja Lendária</h2>
          <p>Catalogue relíquias únicas, molde armas que alteram o destino de combates. Somente o Mestre cria e atribui estas armas.</p>
        </div>
        <button type="button" onClick={handleNew} className="legendary-forge-action">
          Nova Arma Lendária
        </button>
      </section>

      <section className="legendary-forge-catalog">
        <div className="legendary-forge-head">
          <div>
            <span className="home-eyebrow">Catálogo da Forja</span>
            <h3 className="font-cinzel">Armas cadastradas</h3>
          </div>
          <div className="legendary-forge-tools">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filtrar por nome, origem, base ou dano" />
            <button type="button" onClick={handleNew}>Criar</button>
          </div>
        </div>

        {loading ? (
          <p className="text-txt-dim text-sm animate-pulse p-6">Aquecendo a forja...</p>
        ) : filteredItems.length === 0 ? (
          <div className="legendary-forge-empty">
            <strong>Nenhuma arma lendária encontrada.</strong>
            <span>Crie a primeira relíquia ou ajuste o filtro.</span>
          </div>
        ) : (
          <div className="legendary-weapon-grid">
            {filteredItems.map(item => (
              <button key={item.id} type="button" onClick={() => selectItem(item)}
                className={`legendary-weapon-card ${selectedId === item.id ? 'is-selected' : ''}`}>
                <div className="legendary-weapon-image">
                  {item.image ? <img src={item.image} alt="" /> : <span className="font-cinzel">Lendária</span>}
                </div>
                <div className="legendary-weapon-body">
                  <div className="legendary-weapon-title">
                    <strong className="font-cinzel">{item.name}</strong>
                    <span className={rankColor.badge}>Lendária</span>
                    <span className="text-[10px] bg-amber-300/10 text-amber-200 px-1.5 py-0.5 rounded border border-amber-300/25">{powerLabel(item.power_level)}</span>
                  </div>
                  <p>{item.effect || 'Sem descrição.'}</p>
                  <div className="legendary-weapon-meta">
                    <span>{item.dano || 'Dano ?'}</span>
                    <span>{item.attr || 'AM'}</span>
                  </div>
                  {(item.habilidades.passivas.length + item.habilidades.ativas.length + item.habilidades.ultimates.length) > 0 && (
                    <div className="legendary-weapon-skill-count">
                      {item.habilidades.passivas.length > 0 && <span className="text-emerald-400/70 text-[10px]">{item.habilidades.passivas.length} pas.</span>}
                      {item.habilidades.ativas.length > 0 && <span className="text-sky-400/70 text-[10px]">{item.habilidades.ativas.length} atv.</span>}
                      {item.habilidades.ultimates.length > 0 && <span className="text-purple-400/70 text-[10px]">{item.habilidades.ultimates.length} ult.</span>}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {editorOpen && (
      <section ref={editorRef} className="legendary-forge-editor">
        <div className="legendary-forge-editor-head">
          <div>
            <span className="home-eyebrow">{selectedId ? 'Relíquia selecionada' : 'Nova relíquia'}</span>
            <h3 className="font-cinzel">{selectedId ? 'Editar Arma Lendária' : 'Criar Arma Lendária'}</h3>
          </div>
          {selectedId && (
            <button type="button" onClick={handleDelete} className="legendary-forge-delete">
              Excluir
            </button>
          )}
        </div>

        {error && <p className="legendary-forge-error">{error}</p>}

        <div className="legendary-forge-workbench">
          <button type="button" onClick={() => fileRef.current?.click()} className="legendary-forge-image-picker">
            {form.image ? <img src={form.image} alt="" /> : <span className="font-cinzel">Imagem da Relíquia</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />

          <div className="legendary-forge-fields">
             <input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Nome da arma" />
             <div className="legendary-forge-rank">Classificação: Lendária</div>
             <select value={form.power_level} onChange={e => setForm(prev => ({ ...prev, power_level: e.target.value }))}>
               {WEAPON_POWER_LEVELS.map(p => <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>)}
             </select>
             <select value={form.base} onChange={e => selectBase(e.target.value)}>
               <option value="custom">Base personalizada</option>
               {WEAPONS.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
             </select>
              <input value={form.dano} onChange={e => setForm(prev => ({ ...prev, dano: e.target.value }))} placeholder="Dano" />
              <input value={form.attr} onChange={e => setForm(prev => ({ ...prev, attr: e.target.value }))} placeholder="Atributo" />
            </div>
        </div>

        <div className="legendary-forge-textarea-wrap">
          <label className="legendary-forge-label">Historia e Origem</label>
          <textarea value={form.lore} onChange={e => setForm(prev => ({ ...prev, lore: e.target.value }))} rows={3} placeholder="Conte a historia da arma — sua origem, lendas, como foi forjada, quem a empunhou..." />
        </div>

        {warnings.length > 0 && (
          <div className="legendary-forge-warnings">
            {warnings.map((w, i) => (
              <div key={i} className="legendary-forge-warning">{w}</div>
            ))}
          </div>
        )}

        {['passivas', 'ativas', 'ultimates'].map(type => {
          const meta = SKILL_TYPE_META[type]
          const limit = SKILL_LIMITS[form.power_level]?.[type] ?? 99
          const skills = form.habilidades[type]
          return (
            <div key={type} className={`legendary-forge-skill-section ${meta.borderClass} ${meta.bgClass}`}>
              <div className="legendary-forge-skill-header">
                <div className="flex items-center gap-2">
                  <span className={`${meta.headerClass} text-xs font-semibold uppercase tracking-wider`}>{meta.label}</span>
                  <span className="text-txt-dim text-[10px]">({skills.length}/{limit === 99 ? '∞' : limit})</span>
                </div>
                <button type="button" onClick={() => addSkill(type)}
                  className={`text-xs border ${meta.btnBorder} ${meta.btnText} px-2.5 py-1 rounded transition-colors ${meta.btnHover}`}>
                  + {meta.singular}
                </button>
              </div>
              {skills.length === 0 && (
                <p className="text-txt-dim/40 text-[11px] italic py-1">Nenhuma {meta.singular.toLowerCase()} adicionada.</p>
              )}
              {skills.map((skill, i) => (
                <div key={i} className="legendary-forge-skill-card">
                  <div className="legendary-forge-skill-row">
                    <input value={skill.nome} onChange={e => updateSkill(type, i, 'nome', e.target.value)}
                      placeholder={`Nome da ${meta.singular.toLowerCase()}`} className="flex-1" />
                    <div className="legendary-forge-pe-wrap">
                      <span className="text-amber-300/60 text-[10px]">PE</span>
                      <input type="number" value={skill.custoPE || 0} onChange={e => updateSkill(type, i, 'custoPE', Number(e.target.value) || 0)}
                        className="w-20 text-center" />
                    </div>
                    <button type="button" onClick={() => removeSkill(type, i)}
                      className="text-err/50 hover:text-err text-sm px-2 transition-colors" title="Remover">✕</button>
                  </div>
                  <textarea value={skill.descricao} onChange={e => updateSkill(type, i, 'descricao', e.target.value)}
                    rows={2} placeholder="Descrição da habilidade — efeito, dano, duração, condições..." className="legendary-forge-skill-desc" />
                </div>
              ))}
            </div>
          )
        })}

        <div className="legendary-forge-textarea-wrap">
          <label className="legendary-forge-label">Efeito lendário completo</label>
          <textarea value={form.effect} onChange={e => setForm(prev => ({ ...prev, effect: e.target.value }))} rows={6} placeholder="Efeito lendário, custo, ativação, riscos — descrição narrativa completa da arma..." />
        </div>

        <div className="bg-indigo-400/5 border border-indigo-400/20 rounded-lg p-4 space-y-2.5 mx-5 mb-3">
          <div className="flex items-start gap-2">
            <div className="text-indigo-300 text-xs font-semibold uppercase tracking-[0.12em]">Oraculo — Forja Inteligente</div>
          </div>
          <div className="text-txt-dim text-[11px] leading-relaxed">
            O Oraculo pode <span className="text-indigo-300">GERAR</span> a arma completa a partir de um conceito (habilidades, dano, efeito), ou <span className="text-amber-300">BALANCEAR</span> os campos ja preenchidos. Descreva o conceito ou ajustes desejados — nivel de poder: <span className="text-amber-300">{powerLabel(form.power_level)}</span>.
          </div>
          <textarea value={analysisNote} onChange={e => setAnalysisNote(e.target.value)}
            rows={3} placeholder="Ex.: Espada katana Suprema focada em dano eletrico e velocidade. Ou: balanceie os valores desta arma, esta fraca para nivel Maior."
            className="admin-input resize-y" />
          <button type="button" onClick={handleAnalyze} disabled={analyzing}
            className="border border-indigo-400/30 text-indigo-300 px-4 py-2 rounded text-xs hover:bg-indigo-400/10 transition-colors disabled:opacity-50 font-medium">
            {analyzing ? 'Consultando o Oraculo...' : 'Consultar o Oraculo'}
          </button>
        </div>

        {selectedItem && (
          <div className="legendary-forge-preview">
            <span>Previa do catalogo</span>
            <strong>{selectedItem.name}</strong>
            <small>{selectedItem.dano || 'Dano ?'} · {powerLabel(selectedItem.power_level)}</small>
          </div>
        )}

        <div className="legendary-forge-savebar">
          <button type="button" onClick={closeEditor}>Fechar</button>
          <button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Arma Lendária'}
          </button>
        </div>
      </section>
      )}
    </div>
  )
}
