import { useState, useRef, useCallback, useEffect } from 'react'
import { CODEX_PROFILES, KEY_LEVELS } from '../../data/codexProfiles'
import { NA_OPTIONS } from '../../data/codexNaMods'
import { DIST_TYPES } from '../../data/codexAttrDist'
import { generateNpcStats } from '../../utils/codexCalculator'
import { generateNpcAbilities } from '../../services/codexAi'
import { saveNpc } from '../../services/codexDb'

export default function NpcCreator({ onCreated, onBack }) {
  const [nome, setNome] = useState('')
  const [raca, setRaca] = useState('')
  const [nivel, setNivel] = useState(10)
  const [na, setNa] = useState('1')
  const [profile, setProfile] = useState('guerreiro')
  const [distType, setDistType] = useState('balanceada')
  const [description, setDescription] = useState('')
  const [avatar, setAvatar] = useState('')
  const [avatarOriginal, setAvatarOriginal] = useState('')
  const [avatarTransform, setAvatarTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [attrs, setAttrs] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [showAvatarEditor, setShowAvatarEditor] = useState(false)
  const [customLevel, setCustomLevel] = useState('')
  const [selectedAttr, setSelectedAttr] = useState(null)
  const fileRef = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => {
    const preview = generateNpcStats(profile, nivel, na, distType)
    if (preview) setAttrs(preview.attrs)
  }, [profile, nivel, na, distType])

  function handleAvatarFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setAvatar(e.target.result)
      setAvatarOriginal(e.target.result)
      setAvatarTransform({ x: 0, y: 0, scale: 1 })
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    dropRef.current?.classList.remove('border-primary/50')
    const file = e.dataTransfer?.files?.[0]
    if (file) handleAvatarFile(file)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    dropRef.current?.classList.add('border-primary/50')
  }, [])

  const handleDragLeave = useCallback(() => {
    dropRef.current?.classList.remove('border-primary/50')
  }, [])

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items || []
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          handleAvatarFile(item.getAsFile())
          break
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  function handleLevelSelect(lv) {
    setNivel(lv)
    setCustomLevel('')
  }

  function handleCustomLevel() {
    const lv = parseInt(customLevel)
    if (lv >= 5 && lv <= 50) {
      setNivel(lv)
    }
  }

  async function handleGenerate() {
    setError('')
    setGenerating(true)
    try {
      const result = generateNpcStats(profile, nivel, na, distType)
      if (!result) throw new Error('Perfil inválido.')

      const finalAttrs = attrs || result.attrs
      const abilities = await generateNpcAbilities(nivel, na, profile, result.stats, finalAttrs, description, nome)

      const npcId = `npc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const npcData = {
        id: npcId,
        nome: nome || 'Sem Nome',
        raca: raca || '',
        profile,
        nivel,
        na,
        avatar,
        avatarTransform,
        stats: result.stats,
        attrs: finalAttrs,
        abilities,
        distType,
        description,
        created_at: new Date().toISOString(),
      }

      await saveNpc(npcData)
      onCreated?.(null)
    } catch (err) {
      setError(err.message || 'Erro ao gerar ficha.')
    }
    setGenerating(false)
  }

  function clearAvatar() {
    setAvatar('')
    setAvatarOriginal('')
    setAvatarTransform({ x: 0, y: 0, scale: 1 })
    if (fileRef.current) fileRef.current.value = ''
  }

  const attrNames = ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM']

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gold text-sm hover:text-gold-light transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Voltar ao Codex
        </button>
        <h2 className="font-cinzel text-primary text-xl tracking-wider">Criar NPC</h2>
      </div>

      {error && (
        <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-300/60 hover:text-red-300 ml-2">✕</button>
        </div>
      )}

      <div className="glass-card p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-outline text-[10px] uppercase tracking-widest mb-2">Nome do NPC</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: Kratos, o Implacável"
              className="w-full bg-surface-container border border-outline/20 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-outline/40" />
          </div>
          <div>
            <label className="block font-mono text-outline text-[10px] uppercase tracking-widest mb-2">Raça (opcional)</label>
            <input type="text" value={raca} onChange={e => setRaca(e.target.value)}
              placeholder="Ex: Semi-deus, Demônio, etc."
              className="w-full bg-surface-container border border-outline/20 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-outline/40" />
          </div>
        </div>

        <div>
          <label className="block font-mono text-outline text-[10px] uppercase tracking-widest mb-2">Avatar</label>
          <div ref={dropRef} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
            onClick={() => !avatar && fileRef.current?.click()}
            className="border border-dashed border-outline/30 rounded-lg p-4 flex items-center justify-center gap-4 cursor-pointer hover:border-primary/30 transition-colors min-h-[100px]">
            {avatar ? (
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-xl border border-primary/30 overflow-hidden group">
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                  <button onClick={(e) => { e.stopPropagation(); setShowAvatarEditor(true) }}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-white text-sm">crop</span>
                  </button>
                </div>
                <button onClick={(e) => { e.stopPropagation(); clearAvatar() }}
                  className="px-3 py-1.5 border border-err/30 text-err text-xs rounded hover:bg-err/10 transition-colors">
                  Remover
                </button>
              </div>
            ) : (
              <div className="text-center">
                <span className="material-symbols-outlined text-outline/40 text-3xl mb-1 block">add_photo_alternate</span>
                <p className="text-outline/60 text-xs">Arraste, cole ou clique para selecionar</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleAvatarFile(e.target.files[0]) }} />
          </div>
        </div>

        <div>
          <label className="block font-mono text-outline text-[10px] uppercase tracking-widest mb-2">Nível</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {KEY_LEVELS.map(lv => (
              <button key={lv} onClick={() => handleLevelSelect(lv)}
                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${
                  nivel === lv && !customLevel
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-outline border border-outline/15 hover:border-primary/30'
                }`}>
                {lv}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input type="number" min={5} max={50} value={customLevel} onChange={e => setCustomLevel(e.target.value)}
              placeholder="Nível customizado (5-50)"
              className="bg-surface-container border border-outline/20 rounded-lg px-3 py-1.5 text-xs text-on-surface placeholder:text-outline/40 w-48" />
            <button onClick={handleCustomLevel}
              className="px-3 py-1.5 border border-outline/20 rounded text-xs text-outline hover:border-primary/30 hover:text-primary transition-colors">
              Aplicar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-mono text-outline text-[10px] uppercase tracking-widest mb-2">NA / CD</label>
            <select value={na} onChange={e => setNa(e.target.value)}
              className="w-full bg-surface-container border border-outline/20 rounded-lg px-3 py-2 text-sm text-on-surface">
              {NA_OPTIONS.map(n => (
                <option key={n} value={n}>NA {n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-mono text-outline text-[10px] uppercase tracking-widest mb-2">Perfil</label>
            <div className="flex gap-2">
              {Object.entries(CODEX_PROFILES).map(([key, p]) => (
                <button key={key} onClick={() => setProfile(key)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-cinzel tracking-wider transition-colors ${
                    profile === key
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-outline border border-outline/15 hover:border-primary/30'
                  }`}>
                  {p.name}
                  <span className="block text-[10px] font-mono text-outline/60 mt-0.5">{p.dice}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block font-mono text-outline text-[10px] uppercase tracking-widest mb-2">Distribuição de Atributos</label>
          <div className="flex gap-2">
            {DIST_TYPES.map(d => (
              <button key={d.key} onClick={() => setDistType(d.key)}
                disabled={d.key === 'extrema' && nivel < 15}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono tracking-wider transition-colors ${
                  distType === d.key
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : d.key === 'extrema' && nivel < 15
                      ? 'text-outline/30 border border-outline/10 cursor-not-allowed'
                      : 'text-outline border border-outline/15 hover:border-primary/30'
                }`}>
                {d.label}
                <span className="block text-[10px] opacity-60 mt-0.5">{d.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {attrs && (
          <div>
            <label className="block font-mono text-outline text-[10px] uppercase tracking-widest mb-2">
              Atributos — clique em dois para trocar valores
            </label>
            <div className="grid grid-cols-6 gap-2">
              {attrs.map((val, i) => {
                const isSelected = selectedAttr === i
                return (
                  <div key={i}
                    onClick={() => {
                      if (selectedAttr === null) {
                        setSelectedAttr(i)
                      } else if (selectedAttr === i) {
                        setSelectedAttr(null)
                      } else {
                        const next = [...attrs]
                        next[selectedAttr] = val
                        next[i] = attrs[selectedAttr]
                        setAttrs(next)
                        setSelectedAttr(null)
                      }
                    }}
                    className={`text-center rounded-lg p-2 cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-primary/20 border-primary/50 ring-1 ring-primary/30'
                        : 'bg-surface-container border-outline/15 hover:border-primary/30'
                    }`}>
                    <span className="block text-[10px] font-mono text-outline/60 uppercase">{attrNames[i]}</span>
                    <input type="number" value={val}
                      onClick={e => e.stopPropagation()}
                      onChange={e => {
                        const next = [...attrs]
                        next[i] = Math.max(1, parseInt(e.target.value) || 1)
                        setAttrs(next)
                      }}
                      className="w-full bg-transparent text-center text-sm text-on-surface font-cinzel mt-1 border-0 outline-none" />
                    <span className="block text-[10px] font-mono text-primary/70 mt-0.5">
                      {Math.floor((val - 10) / 2) >= 0 ? '+' : ''}{Math.floor((val - 10) / 2)}
                    </span>
                  </div>
                )
              })}
            </div>
            {selectedAttr !== null && (
              <p className="text-primary/60 text-[10px] mt-2 text-center">
                Selecione outro atributo para trocar com <strong className="text-primary">{attrNames[selectedAttr]} ({attrs[selectedAttr]})</strong>
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block font-mono text-outline text-[10px] uppercase tracking-widest mb-2">Descrição / Contexto (para IA)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Descreva o NPC, sua história, poderes, tema... Quanto mais detalhe, melhor a IA criará as habilidades."
            className="w-full bg-surface-container border border-outline/20 rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-outline/40 resize-y" />
        </div>

        <button onClick={handleGenerate} disabled={generating}
          className={`w-full py-3 rounded-xl font-cinzel text-sm tracking-widest transition-all ${
            generating
              ? 'bg-primary/10 text-primary/50 cursor-not-allowed border border-primary/20'
              : 'sigil-button bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
          }`}>
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
              Gerando Ficha...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              Gerar Ficha
            </span>
          )}
        </button>
      </div>

      {showAvatarEditor && avatarOriginal && (
        <AvatarEditorModal
          originalUrl={avatarOriginal}
          initialTransform={avatarTransform}
          onConfirm={(transform, croppedUrl) => {
            setAvatar(croppedUrl)
            setAvatarTransform(transform)
            setShowAvatarEditor(false)
          }}
          onClose={() => setShowAvatarEditor(false)}
        />
      )}
    </div>
  )
}

function AvatarEditorModal({ originalUrl, initialTransform, onConfirm, onClose }) {
  const [transform, setTransform] = useState({ ...initialTransform })
  const cropRef = useRef(null)
  const imgRef = useRef(null)
  const sliderRef = useRef(null)
  const stateRef = useRef({ ...initialTransform, dragging: false, startX: 0, startY: 0, startBgX: 0, startBgY: 0 })

  const apply = (t) => {
    if (imgRef.current) {
      imgRef.current.style.backgroundSize = `${t.scale * 100}%`
      imgRef.current.style.backgroundPosition = `${t.x}px ${t.y}px`
    }
    if (sliderRef.current) sliderRef.current.value = t.scale
  }

  useEffect(() => { apply(transform) }, [])

  function onDown(e) {
    e.preventDefault()
    const s = stateRef.current
    s.dragging = true
    const pt = e.touches ? e.touches[0] : e
    s.startX = pt.clientX
    s.startY = pt.clientY
    s.startBgX = s.x
    s.startBgY = s.y
    if (imgRef.current) imgRef.current.style.cursor = 'grabbing'
  }

  useEffect(() => {
    function onMove(e) {
      const s = stateRef.current
      if (!s.dragging) return
      e.preventDefault()
      const pt = e.touches ? e.touches[0] : e
      const newT = { ...transform, x: s.startBgX + (pt.clientX - s.startX), y: s.startBgY + (pt.clientY - s.startY), scale: s.scale }
      s.x = newT.x
      s.y = newT.y
      setTransform(newT)
      apply(newT)
    }
    function onUp() {
      const s = stateRef.current
      s.dragging = false
      if (imgRef.current) imgRef.current.style.cursor = 'grab'
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
    }
  }, [transform])

  function handleZoom(delta) {
    const newScale = Math.min(5, Math.max(0.1, transform.scale + delta))
    const newT = { ...transform, scale: newScale }
    stateRef.current.scale = newScale
    setTransform(newT)
    apply(newT)
  }

  function handleReset() {
    const newT = { x: 0, y: 0, scale: 1 }
    Object.assign(stateRef.current, newT)
    setTransform(newT)
    apply(newT)
  }

  function handleConfirm() {
    const CROP_SIZE = 280
    const canvas = document.createElement('canvas')
    canvas.width = CROP_SIZE
    canvas.height = CROP_SIZE
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      const renderedW = CROP_SIZE * transform.scale
      const renderedH = img.naturalHeight * (renderedW / img.naturalWidth)
      ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, transform.x, transform.y, renderedW, renderedH)
      const croppedUrl = canvas.toDataURL('image/png')
      onConfirm(transform, croppedUrl)
    }
    img.src = originalUrl
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-deep border border-sep rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-sep/30 flex items-center justify-between">
          <span className="font-cinzel text-primary text-sm">Ajustar Imagem</span>
          <span className="text-outline text-[10px] font-mono">Arraste para mover · Scroll para zoom</span>
        </div>
        <div className="p-4 flex justify-center">
          <div ref={cropRef}
            onMouseDown={onDown} onTouchStart={onDown} onWheel={(e) => { e.preventDefault(); handleZoom(e.deltaY > 0 ? -0.05 : 0.05) }}
            className="w-[280px] h-[280px] relative overflow-hidden rounded-lg border border-primary/30 cursor-grab">
            <div ref={imgRef}
              className="absolute inset-0"
              style={{ backgroundImage: `url(${originalUrl})`, backgroundRepeat: 'no-repeat' }} />
          </div>
        </div>
        <div className="px-5 py-3 flex items-center gap-3">
          <button onClick={() => handleZoom(-0.1)} className="w-8 h-8 grid place-items-center rounded border border-sep text-outline hover:text-primary hover:border-primary/30">
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <input ref={sliderRef} type="range" min={0.1} max={5} step={0.01} defaultValue={transform.scale}
            onChange={e => { const s = parseFloat(e.target.value); stateRef.current.scale = s; const t = { ...transform, scale: s }; setTransform(t); apply(t) }}
            className="flex-1" />
          <button onClick={() => handleZoom(0.1)} className="w-8 h-8 grid place-items-center rounded border border-sep text-outline hover:text-primary hover:border-primary/30">
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
          <button onClick={handleReset} className="px-2 py-1 text-[10px] text-outline border border-sep rounded hover:text-primary">Reset</button>
        </div>
        <div className="px-5 py-3 border-t border-sep/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-sep rounded text-xs text-outline hover:text-primary">Cancelar</button>
          <button onClick={handleConfirm}
            className="px-4 py-2 bg-primary/20 border border-primary/30 rounded text-xs text-primary hover:bg-primary/30">
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
