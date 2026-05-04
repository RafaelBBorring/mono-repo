import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { WEAPONS } from '../data/weapons'
import { WEAPON_POWER_LEVELS } from '../data/weapons'
import { RANK_COLORS } from '../data/colors'
import { fetchMysticWeapons, saveMysticWeapon, deleteMysticWeapon } from '../services/alchemyService'
import { analyzeLegendaryWeaponDraft } from '../services/aiService'
import { useAuth } from '../contexts/AuthContext'

function tagValue(tags = [], key) {
  const found = tags.find(t => t.startsWith(`${key}:`))
  return found ? found.slice(key.length + 1) : ''
}

function emptyForm() {
  return {
    name: '',
    rank: 'Lendária',
    base: 'custom',
    dano: '',
    attr: 'AM',
    short: '',
    effect: '',
    image: '',
    source: '',
    power_level: 'notavel',
  }
}

function toForgeItem(item) {
  const tags = item.tags || []
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
  }
}

function LegendaryForgeStage() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 90)
    camera.position.set(0, 0.4, 9.2)

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))

    const root = new THREE.Group()
    scene.add(root)

    const lime = new THREE.MeshBasicMaterial({ color: 0xbef264, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false })
    const gold = new THREE.MeshBasicMaterial({ color: 0xe8c97e, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false })
    const ember = new THREE.MeshBasicMaterial({ color: 0xff7a3d, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })
    const hotCore = new THREE.MeshBasicMaterial({ color: 0xffd37a, transparent: true, opacity: 0.58, blending: THREE.AdditiveBlending, depthWrite: false })
    const shadow = new THREE.MeshBasicMaterial({ color: 0x0f1511, transparent: true, opacity: 0.76, depthWrite: false })

    const anvil = new THREE.Group()
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.24, 0.62), shadow)
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.7, 0.5), shadow)
    foot.position.y = -0.48
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.15, 28), shadow)
    horn.rotation.z = Math.PI / 2
    horn.position.set(1.58, 0.02, 0)
    anvil.add(top, foot, horn)
    anvil.position.set(-0.55, -1.55, -0.35)
    anvil.rotation.x = -0.12
    root.add(anvil)

    const forgeMouth = new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.08, 12, 84), ember)
    forgeMouth.position.set(1.1, -0.7, -0.55)
    forgeMouth.rotation.x = Math.PI / 2.25
    root.add(forgeMouth)

    const core = new THREE.Mesh(new THREE.CircleGeometry(0.62, 64), hotCore)
    core.position.set(1.1, -0.7, -0.52)
    core.rotation.x = -0.42
    root.add(core)

    const ringGroup = new THREE.Group()
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.01, 8, 150), lime)
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.008, 8, 170), gold)
    ringA.rotation.x = Math.PI / 2.3
    ringB.rotation.x = Math.PI / 2.62
    ringGroup.position.set(0.15, 0.34, -0.05)
    ringGroup.add(ringA, ringB)
    root.add(ringGroup)

    const sparkCount = 190
    const sparkGeometry = new THREE.BufferGeometry()
    const positions = new Float32Array(sparkCount * 3)
    const velocities = new Float32Array(sparkCount * 3)
    const ages = new Float32Array(sparkCount)
    for (let i = 0; i < sparkCount; i += 1) {
      positions[i * 3] = 1.1
      positions[i * 3 + 1] = -0.7
      positions[i * 3 + 2] = -0.52
      ages[i] = 99
    }
    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const sparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({
      size: 0.055,
      color: 0xffe7a3,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }))
    root.add(sparks)

    const clock = new THREE.Clock()
    let frameId = 0
    let lastBurst = -10

    function burst(t) {
      lastBurst = t
      for (let i = 0; i < sparkCount; i += 1) {
        const angle = -0.15 + Math.random() * Math.PI * 0.85
        const force = 0.025 + Math.random() * 0.07
        positions[i * 3] = 1.1 + (Math.random() - 0.5) * 0.16
        positions[i * 3 + 1] = -0.7 + (Math.random() - 0.5) * 0.12
        positions[i * 3 + 2] = -0.52 + (Math.random() - 0.5) * 0.08
        velocities[i * 3] = Math.cos(angle) * force * (Math.random() > 0.45 ? 1 : -0.6)
        velocities[i * 3 + 1] = 0.035 + Math.random() * 0.08
        velocities[i * 3 + 2] = -0.012 - Math.random() * 0.035
        ages[i] = Math.random() * 0.22
      }
      sparkGeometry.getAttribute('position').needsUpdate = true
    }

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
      root.rotation.y = Math.sin(t * 0.18) * 0.08
      ringGroup.rotation.y = t * 0.16
      ringGroup.rotation.z = Math.sin(t * 0.22) * 0.06
      core.scale.setScalar(1 + Math.sin(t * 4.2) * 0.04)
      core.material.opacity = 0.5 + Math.sin(t * 3.7) * 0.08
      forgeMouth.material.opacity = 0.48 + Math.sin(t * 2.8) * 0.08

      if (t - lastBurst > 2.6 + Math.sin(t * 0.7) * 0.45) burst(t)

      const pos = sparkGeometry.getAttribute('position')
      for (let i = 0; i < sparkCount; i += 1) {
        ages[i] += 0.016
        if (ages[i] > 1.35) continue
        velocities[i * 3 + 1] -= 0.0014
        pos.setX(i, pos.getX(i) + velocities[i * 3])
        pos.setY(i, pos.getY(i) + velocities[i * 3 + 1])
        pos.setZ(i, pos.getZ(i) + velocities[i * 3 + 2])
      }
      pos.needsUpdate = true
      sparks.material.opacity = Math.max(0, 0.68 - (t - lastBurst) * 0.42)

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
      top.geometry.dispose()
      foot.geometry.dispose()
      horn.geometry.dispose()
      forgeMouth.geometry.dispose()
      core.geometry.dispose()
      ringA.geometry.dispose()
      ringB.geometry.dispose()
      sparkGeometry.dispose()
      lime.dispose()
      gold.dispose()
      ember.dispose()
      hotCore.dispose()
      shadow.dispose()
      sparks.material.dispose()
    }
  }, [])

  return <canvas ref={canvasRef} className="legendary-forge-canvas" aria-hidden="true" />
}

export default function MysticWeaponAdminPanel() {
  const { user } = useAuth()
  const fileRef = useRef(null)
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
    return forgeItems.filter(item => !term || `${item.name} ${item.base} ${item.source} ${item.dano}`.toLowerCase().includes(term))
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
      short: view.short || '',
      effect: view.effect || '',
      image: view.image || '',
      source: view.source || '',
      power_level: view.power_level || 'notavel',
    })
    setEditorOpen(true)
    setError('')
    setAnalysisNote('')
  }

  function handleNew() {
    setSelectedId(null)
    setForm(emptyForm())
    setEditorOpen(true)
    setError('')
    setAnalysisNote('')
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
      short: weapon?.mec || prev.short,
      name: prev.name || weapon?.name || '',
    }))
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    setError('')
    try {
      const draft = {
        name: form.name.trim(),
        dano: form.dano.trim(),
        attr: form.attr.trim(),
        short_description: form.short.trim(),
        effect: form.effect.trim(),
        base: form.base,
        source: form.source.trim() || 'Forja Lendária',
        power_level: form.power_level,
        image: form.image,
      }
      const analyzed = await analyzeLegendaryWeaponDraft(draft, {
        analysis_note: analysisNote.trim(),
      })
      setForm(prev => ({
        ...prev,
        name: analyzed.name || prev.name,
        dano: analyzed.dano || prev.dano,
        attr: analyzed.attr || prev.attr,
        short: analyzed.short_description || prev.short,
        effect: analyzed.effect || prev.effect,
        source: analyzed.source || prev.source,
        power_level: analyzed.power_level || prev.power_level,
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
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        setForm(prev => ({ ...prev, image: canvas.toDataURL('image/webp', 0.78) }))
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
      short_description: form.short.trim(),
      effect: form.effect.trim(),
      source_kind: 'neutro',
      source_name: form.source.trim() || 'Forja Lendária',
      law_name: form.base,
      price: form.dano.trim(),
      rupture_risk: 1,
      protocol_layer: 3,
      pp_estimate: 0,
      tags: [`rank:Lendária`, `base:${form.base}`, `attr:${form.attr}`, `power_level:${form.power_level}`, ...(form.image ? [`image:${form.image}`] : [])],
      ai_feedback: '',
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

  return (
    <div className="legendary-forge-page">
      <section className="legendary-forge-hero">
        <LegendaryForgeStage />
        <div className="legendary-forge-hero-content">
          <span className="home-eyebrow">Mesa do Mestre</span>
          <h2 className="font-cinzel">Forja Lendária</h2>
          <p>Catalogue relíquias únicas, destaque suas imagens e molde armas que só entram na campanha pela mão do Mestre.</p>
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
                  <p>{item.short || item.effect || 'Sem descrição visual.'}</p>
                  <div className="legendary-weapon-meta">
                    <span>{item.dano || 'Dano ?'}</span>
                    <span>{item.attr || 'AM'}</span>
                    <span>{item.source || 'Forja Lendária'}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {editorOpen && (
      <section className="legendary-forge-editor">
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
             <input value={form.source} onChange={e => setForm(prev => ({ ...prev, source: e.target.value }))} placeholder="Origem / Forja / Patrono" />
           </div>

         <div className="bg-indigo-400/5 border border-indigo-400/20 rounded-lg p-3 space-y-2">
           <div className="flex items-start gap-2">
             <div className="text-indigo-300 text-[11px] font-semibold uppercase tracking-[0.12em]">Diretriz para IA</div>
             <div className="text-txt-dim text-[11px] leading-relaxed">
               Descreva o conceito da arma ou aponte problemas antes de clicar em <span className="text-indigo-300">Analisar</span>. A IA vai balancear números sem alterar a descrição narrativa.
             </div>
           </div>
           <textarea
             value={analysisNote}
             onChange={e => setAnalysisNote(e.target.value)}
             rows={2}
             placeholder="Ex.: adaga lendária Menor focada em furtividade. Ou: esta arma está fraca demais para nível Supremo."
             className="admin-input resize-y"
           />
           <button type="button" onClick={handleAnalyze} disabled={analyzing}
             className="border border-indigo-400/30 text-indigo-300 px-3 py-1.5 rounded text-xs hover:bg-indigo-400/10 transition-colors disabled:opacity-50">
             {analyzing ? 'Analisando...' : 'Analisar com IA'}
           </button>
         </div>
        </div>

        <textarea value={form.short} onChange={e => setForm(prev => ({ ...prev, short: e.target.value }))} rows={2} placeholder="Descrição visual e conceito..." />
        <textarea value={form.effect} onChange={e => setForm(prev => ({ ...prev, effect: e.target.value }))} rows={6} placeholder="Efeito lendário, custo, ativação, riscos e habilidades..." />

        {selectedItem && (
          <div className="legendary-forge-preview">
            <span>Prévia do catálogo</span>
            <strong>{selectedItem.name}</strong>
            <small>{selectedItem.source} · {selectedItem.dano || 'Dano ?'}</small>
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
