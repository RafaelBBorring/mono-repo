import { useState, useEffect, useRef, useCallback } from 'react'
import { getNpc, saveNpc, deleteNpc, resolveAvatarUrl, getFileHandleRecord, syncNpcFromFile, writeNpcToFile, isFileSystemAccessSupported } from '../../services/codexDb'
import { CODEX_PROFILES } from '../../data/codexProfiles'
import { CODEX_NA_MODS, NA_OPTIONS } from '../../data/codexNaMods'
import { attrMod, calcCA, generateNpcStats, getAttrDist } from '../../utils/codexCalculator'
import { supabase } from '../../lib/supabase'

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
const ATTR_LABELS = { FOR: 'Forca', DES: 'Destreza', CON: 'Constituicao', INT: 'Inteligencia', APA: 'Aparencia', AM: 'Aura Magica' }

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

const POLLINATIONS_URL = 'https://text.pollinations.ai/openai'

async function callOracleForNpc(npc) {
  const profInfo = CODEX_PROFILES[npc.profile] || CODEX_PROFILES.guerreiro
  const naInfo = CODEX_NA_MODS[npc.na]
  const abilitiesList = (npc.abilities || []).map((ab, i) =>
    `${i + 1}. [${(ab.type || 'ativa').toUpperCase()}] ${ab.name || 'Sem nome'}: ${ab.description || 'Sem descricao'}`
  ).join('\n')

  const prompt = `Voce e o ORACULO — motor de balanceamento do System-Olympo 2.0. Rebalanceie as habilidades deste NPC.

NPC: ${npc.nome || 'Sem Nome'}
Perfil: ${profInfo.name} (${profInfo.dice}) | Nivel: ${npc.nivel} | NA: ${npc.na} (${naInfo?.tag || '1v1'})
Raca: ${npc.raca || 'Livre'}
PV: ${npc.stats?.vida || '?'} | CA: ${npc.stats?.ca || '?'} | BA: +${npc.stats?.ba || '?'} | ARM: ${npc.stats?.arm || '?'}
Dano Base: ${npc.stats?.dano || '?'} ${npc.stats?.danoExtra || ''} | Reacoes: ${npc.stats?.reac || '?'}
Atributos: FOR ${npc.attrs?.[0] || '?'} DES ${npc.attrs?.[1] || '?'} CON ${npc.attrs?.[2] || '?'} INT ${npc.attrs?.[3] || '?'} APA ${npc.attrs?.[4] || '?'} AM ${npc.attrs?.[5] || '?'}

HABILIDADES ATUAIS:
${abilitiesList || 'Nenhuma'}

REGRAS DE BALANCEAMENTO PARA NPC NIVEL ${npc.nivel} NA ${npc.na}:
- Use TDH (Teto de Dano por Habilidade) adequado para o nivel/NA do NPC
- Passivas: efeitos permanentes sem custo de PE
- Ativas: custo PE proporcional ao poder (nivel x 1.5 ~ nivel x 3)
- Ultimate: alto custo PE (nivel x 4+), impacto decisivo em combate
- Cada habilidade DEVE ter pelo menos 1 efeito mecanico numerico mensuravel
- CDs/DTs devem ser consistentes com o BA do NPC
- PV curados/drenados: max 15% do PV total do NPC
- Duracoes: 1-3 rodadas para ativas, 2-5 para ultimates
- NA alto (10+): habilidades podem ser mais poderosas, multiplas acoes/efeitos

Responda EXCLUSIVAMENTE com JSON:
{
  "habilidades": [
    { "name": "nome da habilidade", "type": "passiva|ativa|ultimate", "description": "descricao completa com mecanicas numericas balanceadas", "stats": ["PE 25", "2 rodadas"] }
  ]
}`

  const body = {
    model: 'openai',
    messages: [
      { role: 'system', content: 'Voce e o Oraculo do System-Olympo. Responda SEMPRE com JSON puro, sem markdown, sem comentarios.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.15,
  }

  const res = await fetch(POLLINATIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Oracle falhou: ${res.status}`)
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  let cleaned = content.replace(/```json\s*\n?/gi, '').replace(/```\s*\n?/g, '').trim()
  return JSON.parse(cleaned)
}

export default function NpcSheet({ npcId, onBack, onDeleted }) {
  const [npc, setNpc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAvatarEditor, setShowAvatarEditor] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [oracleLoading, setOracleLoading] = useState(false)
  const [showLevelModal, setShowLevelModal] = useState(false)
  const [levelDraft, setLevelDraft] = useState({ nivel: 5, na: '1' })
  const [fileHandleInfo, setFileHandleInfo] = useState(null)
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [writing, setWriting] = useState(false)
  const saveTimer = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => { loadNpc() }, [npcId])

  async function loadNpc() {
    setLoading(true)
    const data = await getNpc(npcId)
    setNpc(data)
    setLoading(false)
    const handleRec = await getFileHandleRecord(npcId)
    setFileHandleInfo(handleRec)
    if (handleRec) {
      setSyncStatus('pending')
      const result = await syncNpcFromFile(npcId)
      setSyncStatus(result.status)
      if (result.npc) setNpc(result.npc)
    }
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

  async function handleLevelChange(direction) {
    setNpc(prev => {
      const newLevel = Math.max(1, Math.min(50, prev.nivel + direction))
      const result = generateNpcStats(prev.profile, newLevel, prev.na, 'balanceada')
      if (!result) return prev
      const next = {
        ...prev,
        nivel: newLevel,
        stats: result.stats,
        attrs: result.attrs,
      }
      debouncedSave(next)
      return next
    })
  }

  function openLevelModal() {
    setLevelDraft({ nivel: npc.nivel, na: String(npc.na) })
    setShowLevelModal(true)
  }

  async function applyLevelModal() {
    const result = generateNpcStats(npc.profile, levelDraft.nivel, levelDraft.na, 'balanceada')
    if (!result) return
    const next = {
      ...npc,
      nivel: levelDraft.nivel,
      na: levelDraft.na,
      stats: result.stats,
      attrs: result.attrs,
    }
    await saveNpc(next)
    setNpc(next)
    setShowLevelModal(false)
  }

  async function handleOracleRebalance() {
    if (!confirm('O Oraculo vai reformular todas as habilidades baseado no nivel/NA atual. Continuar?')) return
    setOracleLoading(true)
    try {
      const result = await callOracleForNpc(npc)
      const newAbilities = (result.habilidades || []).map(h => ({
        name: h.name || h.nome || '',
        type: (h.type || h.tipo || 'ativa').toLowerCase().replace(/extra.*/i, 'ativa'),
        description: h.description || h.descricao || '',
        stats: h.stats || [],
      }))
      const next = { ...npc, abilities: newAbilities }
      await saveNpc(next)
      setNpc(next)
    } catch (err) {
      console.error('[Oracle] erro:', err)
      alert('Erro ao consultar o Oraculo. Tente novamente.')
    }
    setOracleLoading(false)
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

  async function handleExportPDF() {
    setShowExportMenu(false)
    const sheetEl = document.querySelector('.glass-card')
    if (!sheetEl) return

    const editables = sheetEl.querySelectorAll('input, textarea')
    const origStyles = Array.from(editables).map(el => ({ el, border: el.style.borderColor, bg: el.style.background }))
    editables.forEach(el => { el.style.borderColor = 'transparent'; el.style.background = 'transparent' })

    const origOverflow = sheetEl.style.overflow
    const origMaxHeight = sheetEl.style.maxHeight
    sheetEl.style.overflow = 'visible'
    sheetEl.style.maxHeight = 'none'

    const btn = document.createElement('button')
    btn.textContent = 'Gerando PDF...'
    btn.className = 'fixed bottom-4 right-4 bg-primary/20 border border-primary/30 text-primary text-sm px-4 py-2 rounded-lg z-[300] animate-pulse'
    document.body.appendChild(btn)

    try {
      const loadScript = (src) => new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve()
        const s = document.createElement('script')
        s.src = src
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
      })

      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')

      const canvas = await window.html2canvas(sheetEl, {
        scale: 2,
        backgroundColor: '#10141e',
        useCORS: true,
        logging: false,
      })

      const { jsPDF } = window.jspdf
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      pdf.save(`${(npc.nome || 'npc').replace(/[^a-zA-Z0-9À-ÿ]/g, '_')}.pdf`)
    } catch (err) {
      console.error('[PDF] erro:', err)
      alert('Nao foi possivel gerar o PDF. Use a opcao Imprimir do navegador (Ctrl+P) e escolha "Salvar como PDF".')
      window.print()
    } finally {
      btn.remove()
      sheetEl.style.overflow = origOverflow
      sheetEl.style.maxHeight = origMaxHeight
      origStyles.forEach(({ el, border, bg }) => { el.style.borderColor = border; el.style.background = bg })
    }
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

  async function handleSyncFromFile() {
    setSyncing(true)
    const result = await syncNpcFromFile(npcId)
    setSyncStatus(result.status)
    if (result.npc) setNpc(result.npc)
    setSyncing(false)
  }

  async function handleWriteToFile() {
    if (!fileHandleInfo) return
    setWriting(true)
    const result = await writeNpcToFile(npcId)
    if (result.status === 'written') {
      setSyncStatus('synced')
    } else if (result.status === 'permission_needed') {
      alert('Permissão de escrita negada. Clique novamente e autorize a escrita no arquivo.')
    } else if (result.status === 'error') {
      alert('Erro ao salvar no arquivo: ' + (result.error || 'desconhecido'))
    }
    setWriting(false)
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
        <p className="text-outline">NPC nao encontrado.</p>
        <button onClick={onBack} className="text-primary text-sm mt-4 hover:text-primary-light">Voltar</button>
      </div>
    )
  }

  const profInfo = CODEX_PROFILES[npc.profile] || CODEX_PROFILES.guerreiro
  const naInfo = CODEX_NA_MODS[npc.na]
  const stats = npc.stats || {}
  const avatarUrl = resolveAvatarUrl(npc.avatar)

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
          {fileHandleInfo && (
            <>
              <button onClick={handleSyncFromFile} disabled={syncing}
                className="px-3 py-1.5 border rounded text-xs transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Sincronizar do arquivo vinculado">
                <span className={`material-symbols-outlined text-sm align-middle ${syncing ? 'animate-spin' : ''}`}>
                  {syncing ? 'progress_activity' : 'cloud_sync'}
                </span>
                {syncing ? '...' : 'Sync'}
              </button>
              <button onClick={handleWriteToFile} disabled={writing || !isFileSystemAccessSupported()}
                className="px-3 py-1.5 border border-emerald-400/30 rounded text-xs text-emerald-400 hover:bg-emerald-400/10 transition-colors flex items-center gap-1 disabled:opacity-50"
                title="Salvar alterações no arquivo vinculado (write-back)">
                <span className={`material-symbols-outlined text-sm align-middle ${writing ? 'animate-spin' : ''}`}>
                  {writing ? 'progress_activity' : 'cloud_upload'}
                </span>
                {writing ? '...' : 'Salvar no Arquivo'}
              </button>
            </>
          )}
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3 py-1.5 border border-sep rounded text-xs text-txt-dim hover:border-gold hover:text-gold transition-colors">
              <span className="material-symbols-outlined text-sm align-middle mr-1">download</span>
              Exportar
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-deep border border-sep rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
                <button onClick={handleExportPDF} className="w-full px-4 py-2 text-xs text-on-surface hover:bg-primary/10 text-left flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
                </button>
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
                Trocar icone
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
              {fileHandleInfo && syncStatus && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border ${
                  syncStatus === 'synced' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  syncStatus === 'local_newer' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  syncStatus === 'permission_needed' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                  syncStatus === 'pending' ? 'bg-white/5 text-txt-dim border-white/10' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`} title={`Arquivo: ${fileHandleInfo.fileName}`}>
                  <span className={`material-symbols-outlined text-[11px] ${syncStatus === 'pending' ? 'animate-spin' : ''}`}>
                    {syncStatus === 'synced' ? 'cloud_done' :
                     syncStatus === 'local_newer' ? 'edit_note' :
                     syncStatus === 'permission_needed' ? 'lock' :
                     syncStatus === 'pending' ? 'sync' : 'error'}
                  </span>
                  {syncStatus === 'synced' ? 'Sincronizado' :
                   syncStatus === 'local_newer' ? 'Alteração local' :
                   syncStatus === 'permission_needed' ? 'Requer permissão' :
                   syncStatus === 'pending' ? 'Verificando…' : 'Erro'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-outline">
              <span>Raca:</span>
              <EditableField value={npc.raca || 'Livre'} onChange={v => update({ raca: v })}
                className="text-primary/70" />
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="text-center bg-primary/5 border border-primary/20 rounded-xl px-5 py-3">
              <div className="text-[10px] font-mono text-outline uppercase tracking-widest">Nivel</div>
              <div className="font-cinzel text-primary text-3xl">{npc.nivel}</div>
              <div className="text-[10px] font-mono text-primary/60">NA {npc.na}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleLevelChange(-1)} disabled={npc.nivel <= 1}
                className="w-9 h-9 grid place-items-center rounded-lg border border-sep text-outline hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Regredir 1 nivel">
                <span className="material-symbols-outlined text-sm">remove</span>
              </button>
              <button onClick={openLevelModal}
                className="px-2 h-9 grid place-items-center rounded-lg border border-sep text-outline hover:text-primary hover:border-primary/30 transition-colors"
                title="Evolucao avancada">
                <span className="material-symbols-outlined text-sm">trending_up</span>
              </button>
              <button onClick={() => handleLevelChange(1)} disabled={npc.nivel >= 50}
                className="w-9 h-9 grid place-items-center rounded-lg border border-sep text-outline hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Evoluir 1 nivel">
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
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
              { label: 'Reacoes', key: 'reac', color: 'text-on-surface' },
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

        <div className="border-t border-sep/30 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-outline text-[10px] uppercase tracking-widest">
              Habilidades · {(npc.abilities || []).length}
            </h3>
            <button onClick={handleOracleRebalance} disabled={oracleLoading}
              className="px-3 py-1.5 rounded-lg text-xs font-cinzel border transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                oracleLoading
                  ? 'bg-violet-500/20 border-violet-500/30 text-violet-400 animate-pulse'
                  : 'bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/40'
              }">
              <span className={`material-symbols-outlined text-sm ${oracleLoading ? 'animate-spin' : ''}`}>
                {oracleLoading ? 'progress_activity' : 'auto_fix_high'}
              </span>
              {oracleLoading ? 'Consultando...' : 'Oraculo'}
            </button>
          </div>
          {(npc.abilities || []).length > 0 ? (
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
                          title="Buff +18%">+</button>
                        <button onClick={() => buffNerfAbility(idx, 'nerf')}
                          className="w-6 h-6 grid place-items-center rounded text-[10px] font-bold text-red-400/70 border border-red-400/20 hover:bg-red-400/15 hover:text-red-400 transition-colors"
                          title="Nerf -15%">-</button>
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
          ) : (
            <div className="text-center py-6 border border-dashed border-outline/20 rounded-lg">
              <span className="material-symbols-outlined text-outline/30 text-2xl mb-2 block">auto_fix_high</span>
              <p className="text-outline/50 text-xs">Nenhuma habilidade. Use o Oraculo para gerar.</p>
            </div>
          )}
        </div>

        <div className="border-t border-sep/30 pt-5">
          <h3 className="font-mono text-outline text-[10px] uppercase tracking-widest mb-2">Notas</h3>
          <EditableField value={npc.description || ''} onChange={v => update({ description: v })}
            tag="textarea"
            className="text-on-surface-variant text-xs w-full leading-relaxed" />
        </div>
      </div>

      {showLevelModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowLevelModal(false)}>
          <div className="bg-deep border border-sep rounded-xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-sep/30 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
              <span className="font-cinzel text-primary text-sm">Evolucao do NPC</span>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-mono text-outline uppercase tracking-widest block mb-1">Nivel (1-50)</label>
                <input type="number" min={1} max={50} value={levelDraft.nivel}
                  onChange={e => setLevelDraft(prev => ({ ...prev, nivel: Math.max(1, Math.min(50, parseInt(e.target.value) || 1)) }))}
                  className="w-full bg-surface-container border border-outline/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-primary/50 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-mono text-outline uppercase tracking-widest block mb-1">Nivel de Ameaca (NA)</label>
                <div className="grid grid-cols-5 gap-1">
                  {NA_OPTIONS.map(na => (
                    <button key={na} onClick={() => setLevelDraft(prev => ({ ...prev, na }))}
                      className={`py-1.5 rounded text-[11px] font-mono transition-colors ${
                        levelDraft.na === na
                          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                          : 'text-on-surface-variant/70 border border-outline/15 hover:border-primary/30 hover:text-on-surface'
                      }`}>
                      {na}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-outline/40 font-mono">
                Os stats serao recalculados automaticamente para o novo nivel/NA.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-sep/30 flex justify-end gap-2">
              <button onClick={() => setShowLevelModal(false)}
                className="px-4 py-2 border border-sep rounded-lg text-xs text-outline hover:text-primary transition-colors">
                Cancelar
              </button>
              <button onClick={applyLevelModal}
                className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-lg text-xs text-primary hover:bg-primary/30 transition-colors">
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {showAvatarUpload && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAvatarUpload(false)}>
          <div className="bg-deep border border-sep rounded-xl w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-cinzel text-primary text-sm mb-4">Trocar Icone do NPC</h3>
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
          originalUrl={avatarUrl}
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
