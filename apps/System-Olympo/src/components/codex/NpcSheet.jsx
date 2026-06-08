import { useState, useEffect, useRef, useCallback } from 'react'
import { getNpc, saveNpc, deleteNpc } from '../../services/codexDb'
import { CODEX_PROFILES } from '../../data/codexProfiles'
import { CODEX_NA_MODS } from '../../data/codexNaMods'
import { attrMod, calcCA } from '../../utils/codexCalculator'

const AB_COLORS = {
  passiva: { border: 'border-l-blue-400', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  ativa: { border: 'border-l-amber-400', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  ultimate: { border: 'border-l-rose-400', bg: 'bg-rose-500/10', text: 'text-rose-400' },
}

const AB_PREFIX = {
  passiva: 'PASSIVA',
  ativa: 'ATIVA',
  ultimate: 'ULTIMATE',
}

const ATTR_NAMES = ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM']
const ATTR_LABELS = { FOR: 'Força', DES: 'Destreza', CON: 'Constituição', INT: 'Inteligência', APA: 'Aparência', AM: 'Aura Mágica' }

function scaleHTMLNumbers(html, factor) {
  if (!html || typeof html !== 'string') return html
  return html.replace(/>([^<]+)</g, (match, text) => {
    let s = text
    s = s.replace(/(\d+)d(\d+)([+-]\d+)?/gi, (m, c, d, mod) => {
      const nc = Math.max(1, Math.round(+c * factor))
      if (mod) {
        const sign = mod[0]
        const val = Math.max(0, Math.round(Math.abs(+mod.slice(1)) * factor))
        return `${nc}d${d}${sign}${val}`
      }
      return `${nc}d${d}`
    })
    s = s.replace(/(CD|DT)\s*(\d+)/gi, (m, p, n) => `${p} ${Math.max(1, Math.round(+n * factor))}`)
    s = s.replace(/\b(\d{2,})\b/g, (m, n) => Math.max(1, Math.round(+n * factor)).toString())
    return `>${s}<`
  })
}

function EditableField({ value, onChange, className = '', tag = 'span', ...props }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const ref = useRef(null)

  useEffect(() => { setDraft(String(value)) }, [value])
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select() } }, [editing])

  function confirm() {
    setEditing(false)
    if (draft !== String(value)) onChange(draft)
  }

  if (editing) {
    const InputTag = tag === 'textarea' ? 'textarea' : 'input'
    return (
      <InputTag ref={ref} value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={confirm}
        onKeyDown={e => { if (e.key === 'Enter' && tag !== 'textarea') { e.preventDefault(); confirm() } }}
        className={`bg-surface-container border border-primary/30 rounded px-1 text-on-surface ${className}`}
        rows={tag === 'textarea' ? 3 : undefined}
        {...props} />
    )
  }

  const El = tag === 'textarea' ? 'div' : 'span'
  return (
    <El onClick={() => setEditing(true)}
      className={`cursor-pointer hover:text-primary transition-colors border-b border-transparent hover:border-primary/30 ${className}`}
      title="Clique para editar"
      dangerouslySetInnerHTML={typeof value === 'string' && (value.includes('<span') || value.includes('class="text-'))
        ? { __html: value } : undefined}
      {...(typeof value === 'string' && (value.includes('<span') || value.includes('class="text-')) ? {} : { children: value })} />
  )
}

export default function NpcSheet({ npcId, onBack, onDeleted }) {
  const [npc, setNpc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAvatarEditor, setShowAvatarEditor] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const saveTimer = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => { loadNpc() }, [npcId])

  async function loadNpc() {
    setLoading(true)
    const data = await getNpc(npcId)
    setNpc(data)
    setLoading(false)
  }

  const debouncedSave = useCallback((updated) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await saveNpc(updated)
    }, 500)
  }, [])

  function update(patch) {
    setNpc(prev => {
      const next = { ...prev, ...patch }
      debouncedSave(next)
      return next
    })
  }

  function updateStats(patch) {
    setNpc(prev => {
      const next = { ...prev, stats: { ...prev.stats, ...patch } }
      debouncedSave(next)
      return next
    })
  }

  function updateAttr(index, value) {
    setNpc(prev => {
      const attrs = [...(prev.attrs || [])]
      attrs[index] = Math.max(1, parseInt(value) || 1)
      const next = { ...prev, attrs }
      debouncedSave(next)
      return next
    })
  }

  function updateAbility(index, patch) {
    setNpc(prev => {
      const abilities = [...(prev.abilities || [])]
      abilities[index] = { ...(abilities[index] || {}), ...patch }
      const next = { ...prev, abilities }
      debouncedSave(next)
      return next
    })
  }

  function buffNerfAbility(index, direction) {
    setNpc(prev => {
      const abilities = [...(prev.abilities || [])]
      const ab = abilities[index]
      const factor = direction === 'buff' ? 1.18 : 0.85
      abilities[index] = {
        ...ab,
        description: scaleHTMLNumbers(ab.description || '', factor),
        stats: (ab.stats || []).map(s => scaleHTMLNumbers(s, factor)),
      }
      const next = { ...prev, abilities }
      debouncedSave(next)
      return next
    })
  }

  async function handleDelete() {
    if (!confirm('Excluir este NPC permanentemente?')) return
    await deleteNpc(npcId)
    onDeleted?.()
  }

  function handleExportJSON() {
    const blob = new Blob([JSON.stringify(npc, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(npc.nome || 'npc').replace(/[^a-zA-Z0-9À-ÿ]/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  function handleExportCodex() {
    const exportData = { format: 'codex-arcanum', version: '2.0', exported_at: new Date().toISOString(), npcs: [npc] }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(npc.nome || 'npc').replace(/[^a-zA-Z0-9À-ÿ]/g, '_')}.codex`
    a.click()
    URL.revokeObjectURL(url)
    setShowExportMenu(false)
  }

  function handleAvatarFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = (e) => {
      update({ avatar: e.target.result, avatarTransform: { x: 0, y: 0, scale: 1 } })
      setShowAvatarUpload(false)
    }
    reader.readAsDataURL(file)
  }

  async function handleSaveAndBack() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await saveNpc(npc)
    onBack?.()
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
        <p className="text-outline font-mono text-xs mt-4 uppercase tracking-widest">Carregando ficha...</p>
      </div>
    )
  }

  if (!npc) {
    return (
      <div className="text-center py-16">
        <p className="text-outline">NPC não encontrado.</p>
        <button onClick={onBack} className="text-primary text-sm mt-4 hover:text-primary-light">Voltar</button>
      </div>
    )
  }

  const profInfo = CODEX_PROFILES[npc.profile] || CODEX_PROFILES.guerreiro
  const naInfo = CODEX_NA_MODS[npc.na]
  const stats = npc.stats || {}
  const avatarUrl = npc.avatar

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={onBack} className="text-gold text-sm hover:text-gold-light transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Codex
        </button>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleSaveAndBack}
            className="px-3 py-1.5 bg-primary/15 border border-primary/30 rounded text-xs text-primary hover:bg-primary/25 transition-colors font-semibold">
            <span className="material-symbols-outlined text-sm align-middle mr-1">save</span>
            Salvar e Voltar
          </button>
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 border border-sep rounded text-xs text-txt-dim hover:border-gold hover:text-gold transition-colors">
              <span className="material-symbols-outlined text-sm align-middle mr-1">download</span>
              Exportar
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-deep border border-sep rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
                <button onClick={handleExportJSON} className="w-full px-4 py-2 text-xs text-on-surface hover:bg-primary/10 text-left">JSON</button>
                <button onClick={handleExportCodex} className="w-full px-4 py-2 text-xs text-on-surface hover:bg-primary/10 text-left">.codex</button>
              </div>
            )}
          </div>
          <button onClick={handleDelete}
            className="px-3 py-1.5 border border-err/30 rounded text-xs text-err/70 hover:bg-err/10 hover:text-err transition-colors">
            <span className="material-symbols-outlined text-sm align-middle mr-1">delete</span>
            Excluir
          </button>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8 space-y-6">
        <div className="flex items-start gap-6 flex-wrap md:flex-nowrap">
          <div className="shrink-0">
            <div className="w-28 h-28 rounded-xl border-2 border-primary/30 overflow-hidden bg-surface-container flex items-center justify-center cursor-pointer group relative"
              onClick={() => { if (avatarUrl) setShowAvatarEditor(true); else fileRef.current?.click() }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt=""
                  className="w-full h-full object-cover"
                  style={npc.avatarTransform ? {
                    objectPosition: `${npc.avatarTransform.x || 0}px ${npc.avatarTransform.y || 0}px`,
                  } : undefined} />
              ) : (
                <span className="font-cinzel text-primary text-3xl">{(npc.nome || '?').charAt(0).toUpperCase()}</span>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                {avatarUrl ? (
                  <span className="material-symbols-outlined text-white text-lg">crop</span>
                ) : (
                  <span className="material-symbols-outlined text-white text-lg">add_photo_alternate</span>
                )}
              </div>
            </div>
            {avatarUrl && (
              <button onClick={(e) => { e.stopPropagation(); setShowAvatarUpload(true) }}
                className="w-full mt-1 px-2 py-1 border border-sep/30 rounded text-[10px] text-outline hover:text-primary hover:border-primary/30 transition-colors text-center">
                Trocar ícone
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleAvatarFile(e.target.files[0]) }} />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <EditableField value={npc.nome || 'Sem Nome'} onChange={v => update({ nome: v })}
              className="font-cinzel text-primary text-2xl tracking-wider block" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                {profInfo.name} ({profInfo.dice})
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/20">
                NA {npc.na} · {naInfo?.tag || ''}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-outline">
              <span>Nível</span>
              <EditableField value={npc.nivel} onChange={v => update({ nivel: parseInt(v) || npc.nivel })}
                className="text-primary font-bold" />
              <span className="text-outline/30">|</span>
              <span>Raça:</span>
              <EditableField value={npc.raca || 'Livre'} onChange={v => update({ raca: v })}
                className="text-primary/70" />
            </div>
          </div>
          <div className="shrink-0 text-center bg-primary/5 border border-primary/20 rounded-xl px-5 py-3">
            <div className="text-[10px] font-mono text-outline uppercase tracking-widest">Nível</div>
            <div className="font-cinzel text-primary text-3xl">{npc.nivel}</div>
            <div className="text-[10px] font-mono text-primary/60">NA {npc.na}</div>
          </div>
        </div>

        <div className="border-t border-sep/30 pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-outline/60 uppercase tracking-widest">Pontos de Vida</span>
              <EditableField value={stats.vida || 0} onChange={v => updateStats({ vida: parseInt(v) || 0 })}
                className="font-cinzel text-green-400 text-2xl block" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'CA', key: 'ca', color: 'text-cyan-400' },
              { label: 'Reações', key: 'reac', color: 'text-on-surface' },
              { label: 'Armadura', key: 'arm', color: 'text-on-surface' },
            ].map(item => (
              <div key={item.key} className="text-center bg-surface-container/50 rounded-lg p-3 border border-outline/10">
                <EditableField value={stats[item.key] || 0} onChange={v => updateStats({ [item.key]: parseInt(v) || 0 })}
                  className={`font-cinzel ${item.color} text-xl block text-center`} />
                <span className="text-[10px] font-mono text-outline/60 uppercase tracking-widest">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Ataque', key: 'ba', prefix: 'd20+' },
              { label: 'Defesa', key: 'bd', prefix: 'd20+' },
              { label: 'Dano Base', key: 'dano', prefix: '', isString: true },
            ].map(item => (
              <div key={item.key} className="text-center bg-surface-container/50 rounded-lg p-3 border border-outline/10">
                <div className="flex items-center justify-center gap-1">
                  {item.prefix && <span className="text-[10px] font-mono text-outline/60">{item.prefix}</span>}
                  <EditableField
                    value={stats[item.key] || (item.isString ? '' : 0)}
                    onChange={v => updateStats({ [item.key]: item.isString ? v : (parseInt(v) || 0) })}
                    className={`font-cinzel text-sm block text-center ${item.key === 'dano' ? 'text-red-400' : 'text-on-surface'}`} />
                </div>
                {stats.danoExtra && item.key === 'dano' && (
                  <span className="text-red-400/60 text-[10px]">{stats.danoExtra}</span>
                )}
                <span className="block text-[10px] font-mono text-outline/60 uppercase tracking-widest">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-sep/30 pt-5">
          <h3 className="font-mono text-outline text-[10px] uppercase tracking-widest mb-3">Atributos</h3>
          <div className="grid grid-cols-6 gap-2">
            {(npc.attrs || []).map((val, i) => (
              <div key={i} className="text-center bg-surface-container/50 rounded-lg p-2 border border-outline/10">
                <span className="block text-[10px] font-mono text-outline/60 uppercase">{ATTR_NAMES[i]}</span>
                <input type="number" value={val}
                  onChange={e => updateAttr(i, e.target.value)}
                  className="w-full bg-transparent text-center text-sm text-on-surface font-cinzel mt-1" />
                <span className="block text-[10px] font-mono text-primary/70 mt-0.5">{attrMod(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {(npc.abilities || []).length > 0 && (
          <div className="border-t border-sep/30 pt-5">
            <h3 className="font-mono text-outline text-[10px] uppercase tracking-widest mb-3">
              Habilidades · 1 Passiva · 3 Ativas · 1 Ultimate
            </h3>
            <div className="space-y-3">
              {npc.abilities.map((ab, idx) => {
                const colors = AB_COLORS[ab.type] || AB_COLORS.ativa
                return (
                  <div key={idx} className={`border-l-2 ${colors.border} ${colors.bg} rounded-r-lg p-4`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-mono ${colors.text} uppercase tracking-wider`}>
                        {AB_PREFIX[ab.type] || ab.type?.toUpperCase()}
                      </span>
                      <EditableField value={ab.name || ''} onChange={v => updateAbility(idx, { name: v })}
                        className="font-cinzel text-on-surface text-sm flex-1" />
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => buffNerfAbility(idx, 'buff')}
                          className="w-6 h-6 grid place-items-center rounded text-[10px] font-bold text-green-400/70 border border-green-400/20 hover:bg-green-400/15 hover:text-green-400 transition-colors"
                          title="Buff +18%">↑</button>
                        <button onClick={() => buffNerfAbility(idx, 'nerf')}
                          className="w-6 h-6 grid place-items-center rounded text-[10px] font-bold text-red-400/70 border border-red-400/20 hover:bg-red-400/15 hover:text-red-400 transition-colors"
                          title="Nerf -15%">↓</button>
                      </div>
                    </div>
                    <EditableField value={ab.description || ''} onChange={v => updateAbility(idx, { description: v })}
                      tag="textarea"
                      className="text-on-surface-variant text-xs w-full mt-1 leading-relaxed" />
                    {(ab.stats || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {ab.stats.map((s, si) => (
                          <EditableField key={si} value={s} onChange={v => {
                            const next = [...(ab.stats || [])]
                            next[si] = v
                            updateAbility(idx, { stats: next })
                          }}
                            className="text-[10px] font-mono bg-surface-container px-2 py-0.5 rounded border border-outline/10" />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {npc.description && (
          <div className="border-t border-sep/30 pt-5">
            <h3 className="font-mono text-outline text-[10px] uppercase tracking-widest mb-2">Notas</h3>
            <EditableField value={npc.description} onChange={v => update({ description: v })}
              tag="textarea"
              className="text-on-surface-variant text-xs w-full leading-relaxed" />
          </div>
        )}
      </div>

      {showAvatarUpload && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAvatarUpload(false)}>
          <div className="bg-deep border border-sep rounded-xl w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-cinzel text-primary text-sm mb-4">Trocar Ícone do NPC</h3>
            <div className="border border-dashed border-outline/30 rounded-lg p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => fileRef.current?.click()}>
              <span className="material-symbols-outlined text-outline/40 text-3xl">add_photo_alternate</span>
              <p className="text-outline/60 text-xs">Clique para selecionar uma nova imagem</p>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAvatarUpload(false)}
                className="px-4 py-2 border border-sep rounded text-xs text-outline hover:text-primary">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showAvatarEditor && npc.avatar && (
        <AvatarCropModal
          originalUrl={npc.avatar}
          initialTransform={npc.avatarTransform || { x: 0, y: 0, scale: 1 }}
          onConfirm={(transform, croppedUrl) => {
            update({ avatar: croppedUrl, avatarTransform: transform })
            setShowAvatarEditor(false)
          }}
          onClose={() => setShowAvatarEditor(false)}
        />
      )}
    </div>
  )
}

function AvatarCropModal({ originalUrl, initialTransform, onConfirm, onClose }) {
  const [transform, setTransform] = useState({ ...initialTransform })
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
      stateRef.current.dragging = false
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
      onConfirm(transform, canvas.toDataURL('image/png'))
    }
    img.src = originalUrl
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-deep border border-sep rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-sep/30 flex items-center justify-between">
          <span className="font-cinzel text-primary text-sm">Ajustar Avatar</span>
          <span className="text-outline text-[10px] font-mono">Arraste · Scroll para zoom</span>
        </div>
        <div className="p-4 flex justify-center">
          <div onMouseDown={onDown} onTouchStart={onDown}
            onWheel={e => { e.preventDefault(); const d = e.deltaY > 0 ? -0.05 : 0.05; const s = Math.min(5, Math.max(0.1, transform.scale + d)); stateRef.current.scale = s; const t = { ...transform, scale: s }; setTransform(t); apply(t) }}
            className="w-[280px] h-[280px] relative overflow-hidden rounded-lg border border-primary/30 cursor-grab">
            <div ref={imgRef} className="absolute inset-0"
              style={{ backgroundImage: `url(${originalUrl})`, backgroundRepeat: 'no-repeat' }} />
          </div>
        </div>
        <div className="px-5 py-3 flex items-center gap-3">
          <button onClick={() => { const s = Math.max(0.1, transform.scale - 0.1); stateRef.current.scale = s; const t = { ...transform, scale: s }; setTransform(t); apply(t) }}
            className="w-8 h-8 grid place-items-center rounded border border-sep text-outline hover:text-primary">
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <input ref={sliderRef} type="range" min={0.1} max={5} step={0.01} defaultValue={transform.scale}
            onChange={e => { const s = parseFloat(e.target.value); stateRef.current.scale = s; const t = { ...transform, scale: s }; setTransform(t); apply(t) }}
            className="flex-1" />
          <button onClick={() => { const s = Math.min(5, transform.scale + 0.1); stateRef.current.scale = s; const t = { ...transform, scale: s }; setTransform(t); apply(t) }}
            className="w-8 h-8 grid place-items-center rounded border border-sep text-outline hover:text-primary">
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
        <div className="px-5 py-3 border-t border-sep/30 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-sep rounded text-xs text-outline">Cancelar</button>
          <button onClick={handleConfirm} className="px-4 py-2 bg-primary/20 border border-primary/30 rounded text-xs text-primary">Confirmar</button>
        </div>
      </div>
    </div>
  )
}
