import { useState, useEffect, useRef, useCallback } from 'react'
import { getNpc, saveNpc, deleteNpc, resolveAvatarUrl, getFileHandleRecord, syncNpcFromFile, writeNpcToFile, isFileSystemAccessSupported } from '../../services/codexDb'
import { CODEX_PROFILES } from '../../data/codexProfiles'
import { CODEX_NA_MODS, NA_OPTIONS } from '../../data/codexNaMods'
import { DIST_TYPES, getAttrCapForLevel, getAttrPoolForLevel } from '../../data/codexAttrDist'
import { attrMod, calcCA, generateNpcStats } from '../../utils/codexCalculator'
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

const POLLINATIONS_URL = 'https://text.pollinations.ai/openai'

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

function buildNpcContext(npc) {
  const profInfo = CODEX_PROFILES[npc.profile] || CODEX_PROFILES.guerreiro
  const naInfo = CODEX_NA_MODS[npc.na]
  return `NPC: ${npc.nome || 'Sem Nome'}
Perfil: ${profInfo.name} (${profInfo.dice}) | Nivel: ${npc.nivel} | NA: ${npc.na} (${naInfo?.tag || '1v1'})
Raca: ${npc.raca || 'Livre'}
PV: ${npc.stats?.vida || '?'} | CA: ${npc.stats?.ca || '?'} | BA: +${npc.stats?.ba || '?'} | ARM: ${npc.stats?.arm || '?'}
Dano Base: ${npc.stats?.dano || '?'} ${npc.stats?.danoExtra || ''} | Reacoes: ${npc.stats?.reac || '?'}
Atributos: FOR ${npc.attrs?.[0] || '?'} (Mod${attrMod(npc.attrs?.[0] || 10)}) | DES ${npc.attrs?.[1] || '?'} (Mod${attrMod(npc.attrs?.[1] || 10)}) | CON ${npc.attrs?.[2] || '?'} (Mod${attrMod(npc.attrs?.[2] || 10)}) | INT ${npc.attrs?.[3] || '?'} (Mod${attrMod(npc.attrs?.[3] || 10)}) | APA ${npc.attrs?.[4] || '?'} | AM ${npc.attrs?.[5] || '?'} (Mod${attrMod(npc.attrs?.[5] || 10)})`
}

function extractJson(text) {
  if (!text) return null
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*\}/)
  let raw = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text
  raw = raw.replace(/```json\s*\n?/gi, '').replace(/```\s*\n?/g, '').trim()
  try { return JSON.parse(raw) } catch { return null }
}

function extractText(text) {
  if (!text) return ''
  return text.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').trim()
}

async function callOracleForNpc(npc) {
  const abilitiesList = (npc.abilities || []).map((ab, i) =>
    `${i + 1}. [${(ab.type || 'ativa').toUpperCase()}] ${ab.name || 'Sem nome'}: ${ab.description || 'Sem descricao'}`
  ).join('\n')

  const prompt = `${buildNpcContext(npc)}

HABILIDADES ATUAIS:
${abilitiesList || 'Nenhuma'}

REGRAS DE BALANCEAMENTO PARA NPC NIVEL ${npc.nivel} NA ${npc.na}:
- Use TDH (Teto de Dano por Habilidade) adequado para o nivel/NA do NPC
- Considere que personagens jogadores neste nivel possuem atributos ate ${getAttrCapForLevel(npc.nivel)}
- Passivas: efeitos permanentes sem custo de PE
- Ativas: custo PE proporcional ao poder (nivel x 1.5 ~ nivel x 3)
- Ultimate: alto custo PE (nivel x 4+), impacto decisivo em combate
- Cada habilidade DEVE ter pelo menos 1 efeito mecanico numerico mensuravel
- CDs/DTs devem especificar o atributo (ex: "DT 18 Constituicao")
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

async function callOracleChat(npc, message, history) {
  const abilitiesList = (npc.abilities || []).map((ab, i) =>
    `${i + 1}. [${(ab.type || 'ativa').toUpperCase()}] ${ab.name || 'Sem nome'}: ${ab.description || 'Sem descricao'}`
  ).join('\n')

  const systemPrompt = `Voce e o ORACULO — motor de balanceamento do System-Olympo 3.0.
Voce analisa habilidades de NPCs considerando fichas de personagens jogadores, o nivel do NPC, sua NA (Nivel de Ameaca), e eventual combate entre NPCs.

${buildNpcContext(npc)}

HABILIDADES DO NPC:
${abilitiesList || 'Nenhuma'}

REGRAS:
- Personagens jogadores neste nivel possuem atributos ate ${getAttrCapForLevel(npc.nivel)}
- Use TDH, IPL, LCP do Sistema Olympo 3.0
- CDs/DTs DEVEM especificar o atributo (ex: "DT 18 Constituicao", "DT 22 Fortitude")
- Considere o contexto de combate: o NPC enfrenta personagens de nivel similar
- Para NA alto, o NPC pode ser mais poderoso
- Responda em portugues de forma clara e concisa`

  const body = {
    model: 'openai',
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ],
    temperature: 0.3,
  }

  const res = await fetch(POLLINATIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Oracle falhou: ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function callOracleBuffNerf(npc, abilityIndex, direction) {
  const ab = npc.abilities?.[abilityIndex]
  if (!ab) throw new Error('Habilidade nao encontrada')

  const factor = direction === 'buff' ? '+30%' : '-15%'
  const mult = direction === 'buff' ? 1.3 : 0.85

  const prompt = `Reformule a seguinte habilidade aplicando um ${direction.toUpperCase()} de ${factor}.
${direction === 'buff' ? 'Aumente todos os valores numericos (dano, cura, duracao) em ~30%. Reduza custos em ~10%.' : 'Reduza todos os valores numericos (dano, cura, duracao) em ~15%. Aumente custos em ~10%.'}
Mantenha o conceito e tema da habilidade, apenas ajuste os numeros.

HABILIDADE ATUAL:
Nome: ${ab.name || 'Sem nome'}
Tipo: ${ab.type || 'ativa'}
Descricao: ${ab.description || ''}
Stats: ${(ab.stats || []).join(', ')}

${buildNpcContext(npc)}

Responda EXCLUSIVAMENTE com JSON:
{ "name": "nome", "type": "passiva|ativa|ultimate", "description": "descricao reformulada", "stats": ["stat1", "stat2"] }`

  const body = {
    model: 'openai',
    messages: [
      { role: 'system', content: 'Voce e o Oraculo do System-Olympo. Responda SEMPRE com JSON puro, sem markdown.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
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

function EditableField({ value, onChange, className = '', tag = 'span', multiline = false, ...props }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const ref = useRef(null)

  useEffect(() => { setDraft(String(value ?? '')) }, [value])
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select?.() } }, [editing])

  function confirm() {
    setEditing(false)
    if (draft !== String(value ?? '')) onChange(draft)
  }

  if (editing) {
    const InputTag = tag === 'textarea' ? 'textarea' : 'input'
    return (
      <InputTag ref={ref} value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={confirm}
        onKeyDown={e => { if (e.key === 'Enter' && tag !== 'textarea') { e.preventDefault(); confirm() }
                          if (e.key === 'Escape') { setDraft(String(value ?? '')); setEditing(false) } }}
        className={`bg-surface-container border border-primary/30 rounded px-1 text-on-surface ${className}`}
        rows={tag === 'textarea' ? 4 : undefined}
        {...props} />
    )
  }

  const hasHtml = typeof value === 'string' && (value.includes('<span') || value.includes('class="text-'))
  const El = tag === 'textarea' ? 'div' : 'span'
  return (
    <El onClick={() => setEditing(true)}
      className={`cursor-pointer hover:text-primary transition-colors border-b border-transparent hover:border-primary/30 ${multiline ? 'whitespace-pre-wrap' : ''} ${className}`}
      title="Clique para editar"
      dangerouslySetInnerHTML={hasHtml ? { __html: value } : undefined}
      {...(hasHtml ? {} : { children: value })} />
  )
}

export default function NpcSheet({ npcId, onBack, onDeleted }) {
  const [npc, setNpc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAvatarEditor, setShowAvatarEditor] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showAvatarUpload, setShowAvatarUpload] = useState(false)
  const [oracleLoading, setOracleLoading] = useState(false)
  const [showLevelModal, setShowLevelModal] = useState(false)
  const [levelDraft, setLevelDraft] = useState({ nivel: 5, na: '1', distType: 'balanceada' })
  const [fileHandleInfo, setFileHandleInfo] = useState(null)
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [writing, setWriting] = useState(false)
  const [showOracleChat, setShowOracleChat] = useState(false)
  const [oracleChat, setOracleChat] = useState([])
  const [oracleChatInput, setOracleChatInput] = useState('')
  const [oracleChatLoading, setOracleChatLoading] = useState(false)
  const [oracleChatPending, setOracleChatPending] = useState(null)
  const [abilityLoading, setAbilityLoading] = useState({})
  const [showDmgModal, setShowDmgModal] = useState(false)
  const [dmgInput, setDmgInput] = useState('')
  const [showAttrModal, setShowAttrModal] = useState(false)
  const [attrDraft, setAttrDraft] = useState([])
  const saveTimer = useRef(null)
  const fileRef = useRef(null)
  const npcRef = useRef(null)
  const loadedRef = useRef(false)
  const chatScrollRef = useRef(null)

  useEffect(() => { npcRef.current = npc }, [npc])

  const debouncedSave = useCallback((updated) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        await saveNpc(updated)
      } catch (err) {
        console.error('[NpcSheet] saveNpc failed:', err)
      }
    }, 500)
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        const latest = npcRef.current
        if (latest) {
          saveNpc(latest).catch(err => console.error('[NpcSheet] save on unmount failed:', err))
        }
      }
    }
  }, [])

  useEffect(() => { loadNpc() }, [npcId])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [oracleChat, oracleChatLoading])

  async function loadNpc() {
    setLoading(true)
    loadedRef.current = false
    const data = await getNpc(npcId)
    if (data && data.stats?.vida && data.vidaAtual == null) {
      data.vidaAtual = data.stats.vida
    }
    setNpc(data)
    npcRef.current = data
    setLoading(false)
    loadedRef.current = true

    const handleRec = await getFileHandleRecord(npcId)
    setFileHandleInfo(handleRec)
    if (handleRec) {
      setSyncStatus('pending')
      const result = await syncNpcFromFile(npcId)
      setSyncStatus(result.status)
      if (result.npc && loadedRef.current) {
        const current = npcRef.current
        const fileUpdated = result.npc.updated_at || ''
        const localUpdated = current?.updated_at || ''
        if (fileUpdated > localUpdated) {
          if (result.npc.stats?.vida && result.npc.vidaAtual == null) {
            result.npc.vidaAtual = result.npc.stats.vida
          }
          setNpc(result.npc)
          npcRef.current = result.npc
        }
      }
    }
  }

  function update(patch) {
    const next = { ...npcRef.current, ...patch }
    npcRef.current = next
    setNpc(next)
    debouncedSave(next)
  }

  function updateStats(patch) {
    const prev = npcRef.current
    const next = { ...prev, stats: { ...prev.stats, ...patch } }
    if (patch.vida != null && (prev.vidaAtual == null || prev.vidaAtual === prev.stats?.vida)) {
      next.vidaAtual = patch.vida
    }
    npcRef.current = next
    setNpc(next)
    debouncedSave(next)
  }

  function updateVidaAtual(value) {
    const prev = npcRef.current
    const next = { ...prev, vidaAtual: Math.max(0, value) }
    npcRef.current = next
    setNpc(next)
    debouncedSave(next)
  }

  function updateAttr(index, value) {
    const prev = npcRef.current
    const attrs = [...(prev.attrs || [])]
    attrs[index] = Math.max(1, parseInt(value) || 1)
    const next = { ...prev, attrs }
    npcRef.current = next
    setNpc(next)
    debouncedSave(next)
  }

  function updateAbility(index, patch) {
    const prev = npcRef.current
    const abilities = [...(prev.abilities || [])]
    abilities[index] = { ...(abilities[index] || {}), ...patch }
    const next = { ...prev, abilities }
    npcRef.current = next
    setNpc(next)
    debouncedSave(next)
  }

  function buffNerfAbility(index, direction) {
    const prev = npcRef.current
    const abilities = [...(prev.abilities || [])]
    const ab = abilities[index]
    const factor = direction === 'buff' ? 1.18 : 0.85
    abilities[index] = {
      ...ab,
      description: scaleHTMLNumbers(ab.description || '', factor),
      stats: (ab.stats || []).map(s => scaleHTMLNumbers(s, factor)),
    }
    const next = { ...prev, abilities }
    npcRef.current = next
    setNpc(next)
    debouncedSave(next)
  }

  async function handleAIBuffNerf(index, direction) {
    const prev = npcRef.current
    setAbilityLoading(s => ({ ...s, [index]: direction }))
    try {
      const result = await callOracleBuffNerf(prev, index, direction)
      const newAb = {
        name: result.name || result.nome || prev.abilities[index].name,
        type: (result.type || result.tipo || prev.abilities[index].type || 'ativa').toLowerCase().replace(/extra.*/i, 'ativa'),
        description: result.description || result.descricao || prev.abilities[index].description,
        stats: result.stats || prev.abilities[index].stats || [],
      }
      updateAbility(index, newAb)
    } catch (err) {
      console.error('[Oracle buff/nerf] erro:', err)
      buffNerfAbility(index, direction)
    }
    setAbilityLoading(s => { const n = { ...s }; delete n[index]; return n })
  }

  function handleLevelChange(direction) {
    const prev = npcRef.current
    if (!prev) return
    const newLevel = Math.max(1, Math.min(50, prev.nivel + direction))
    const result = generateNpcStats(prev.profile, newLevel, prev.na, prev.distType || 'balanceada', prev.attrs)
    if (!result) return
    const next = {
      ...prev,
      nivel: newLevel,
      stats: result.stats,
      attrs: result.attrs,
      attrCap: result.attrCap,
    }
    if (next.vidaAtual === prev.stats?.vida || next.vidaAtual == null) {
      next.vidaAtual = result.stats.vida
    }
    npcRef.current = next
    setNpc(next)
    debouncedSave(next)
  }

  function openLevelModal() {
    const current = npcRef.current
    setLevelDraft({ nivel: current.nivel, na: String(current.na), distType: current.distType || 'balanceada' })
    setShowLevelModal(true)
  }

  async function applyLevelModal() {
    const prev = npcRef.current
    if (!prev) return
    const result = generateNpcStats(prev.profile, levelDraft.nivel, levelDraft.na, levelDraft.distType, prev.attrs)
    if (!result) return
    const next = {
      ...prev,
      nivel: levelDraft.nivel,
      na: levelDraft.na,
      stats: result.stats,
      attrs: result.attrs,
      distType: levelDraft.distType,
      attrCap: result.attrCap,
      vidaAtual: result.stats.vida,
    }
    npcRef.current = next
    try { await saveNpc(next) } catch (err) { console.error('[NpcSheet] applyLevelModal save failed:', err) }
    setNpc(next)
    setShowLevelModal(false)
  }

  async function handleOracleRebalance() {
    if (!confirm('O Oraculo vai reformular todas as habilidades baseado no nivel/NA atual. Continuar?')) return
    const prev = npcRef.current
    setOracleLoading(true)
    try {
      const result = await callOracleForNpc(prev)
      const newAbilities = (result.habilidades || []).map(h => ({
        name: h.name || h.nome || '',
        type: (h.type || h.tipo || 'ativa').toLowerCase().replace(/extra.*/i, 'ativa'),
        description: h.description || h.descricao || '',
        stats: h.stats || [],
      }))
      const next = { ...prev, abilities: newAbilities }
      npcRef.current = next
      try { await saveNpc(next) } catch (err) { console.error('[NpcSheet] oracle save failed:', err) }
      setNpc(next)
    } catch (err) {
      console.error('[Oracle] erro:', err)
      alert('Erro ao consultar o Oraculo. Tente novamente.')
    }
    setOracleLoading(false)
  }

  async function handleOracleChatSend() {
    const prev = npcRef.current
    if (!prev || !oracleChatInput.trim() || oracleChatLoading) return
    const userMsg = oracleChatInput.trim()
    const newHistory = [...oracleChat, { role: 'user', content: userMsg }]
    setOracleChat(newHistory)
    setOracleChatInput('')
    setOracleChatLoading(true)
    setOracleChatPending(null)
    try {
      const resp = await callOracleChat(prev, userMsg, newHistory.slice(-6))
      const text = extractText(resp) || resp
      setOracleChat(h => [...h, { role: 'assistant', content: text }])
      const parsed = extractJson(resp)
      if (parsed?.habilidades) {
        setOracleChatPending({ type: 'all', data: parsed })
      } else if (parsed?.name || parsed?.nome) {
        setOracleChatPending({ type: 'single', data: parsed })
      }
    } catch (err) {
      setOracleChat(h => [...h, { role: 'assistant', content: 'Erro: ' + (err.message || 'Nao foi possivel contatar o Oraculo.') }])
    }
    setOracleChatLoading(false)
  }

  function applyChatPending() {
    if (!oracleChatPending) return
    const prev = npcRef.current
    if (oracleChatPending.type === 'all') {
      const newAbilities = (oracleChatPending.data.habilidades || []).map(h => ({
        name: h.name || h.nome || '',
        type: (h.type || h.tipo || 'ativa').toLowerCase().replace(/extra.*/i, 'ativa'),
        description: h.description || h.descricao || '',
        stats: h.stats || [],
      }))
      const next = { ...prev, abilities: newAbilities }
      npcRef.current = next
      setNpc(next)
      debouncedSave(next)
    } else if (oracleChatPending.type === 'single') {
      const d = oracleChatPending.data
      setOracleChat(h => [...h, { role: 'assistant', content: `Habilidade reformulada: "${d.name || d.nome}". Clique em uma habilidade para aplicar.` }])
    }
    setOracleChatPending(null)
  }

  function openAttrModal() {
    const current = npcRef.current
    setAttrDraft([...(current.attrs || [])])
    setShowAttrModal(true)
  }

  function applyAttrModal() {
    const next = { ...npcRef.current, attrs: [...attrDraft] }
    npcRef.current = next
    setNpc(next)
    debouncedSave(next)
    setShowAttrModal(false)
  }

  function applyDamage(amount) {
    const prev = npcRef.current
    const maxVida = prev.stats?.vida || 0
    const current = prev.vidaAtual ?? maxVida
    const newVida = Math.max(0, Math.min(maxVida, current - amount))
    updateVidaAtual(newVida)
    setDmgInput('')
    setShowDmgModal(false)
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
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const latest = npcRef.current
    if (latest) {
      try { await saveNpc(latest) } catch (err) { console.error('[NpcSheet] saveAndBack failed:', err) }
    }
    onBack?.()
  }

  async function handleSyncFromFile() {
    setSyncing(true)
    const result = await syncNpcFromFile(npcId)
    setSyncStatus(result.status)
    if (result.npc) {
      if (result.npc.stats?.vida && result.npc.vidaAtual == null) {
        result.npc.vidaAtual = result.npc.stats.vida
      }
      setNpc(result.npc)
      npcRef.current = result.npc
    }
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
  const vidaMax = stats.vida || 0
  const vidaAtual = npc.vidaAtual ?? vidaMax
  const vidaPct = vidaMax > 0 ? (vidaAtual / vidaMax) * 100 : 0
  const vidaColor = vidaPct > 66 ? 'text-green-400' : vidaPct > 33 ? 'text-amber-400' : 'text-red-400'
  const attrCap = npc.attrCap || getAttrCapForLevel(npc.nivel)
  const distType = npc.distType || 'balanceada'
  const attrPool = getAttrPoolForLevel(npc.nivel)
  const usedPool = (npc.attrs || []).reduce((s, v) => s + v, 0)

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

        {/* HP System: Current / Max + Damage Calculator */}
        <div className="border-t border-sep/30 pt-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] font-mono text-outline/60 uppercase tracking-widest block mb-1">Pontos de Vida</span>
                <div className="flex items-baseline gap-2">
                  <EditableField value={vidaAtual} onChange={v => updateVidaAtual(parseInt(v) || 0)}
                    className={`font-cinzel ${vidaColor} text-3xl block`} />
                  <span className="font-cinzel text-outline/40 text-xl">/ {vidaMax}</span>
                </div>
              </div>
              {vidaAtual < vidaMax && (
                <button onClick={() => updateVidaAtual(vidaMax)}
                  className="px-2 py-1 border border-green-400/30 rounded text-[10px] text-green-400 hover:bg-green-400/10 transition-colors flex items-center gap-1"
                  title="Curar totalmente">
                  <span className="material-symbols-outlined text-sm">healing</span>
                  Curar
                </button>
              )}
            </div>
            <button onClick={() => setShowDmgModal(true)}
              className="px-3 py-1.5 bg-red-500/10 border border-red-400/30 rounded-lg text-xs text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">local_fire_department</span>
              Aplicar Dano
            </button>
          </div>
          {vidaMax > 0 && (
            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
              <div className={`h-full transition-all ${vidaPct > 66 ? 'bg-green-500' : vidaPct > 33 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${vidaPct}%` }} />
            </div>
          )}

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

        {/* Attributes with distribution info */}
        <div className="border-t border-sep/30 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-outline text-[10px] uppercase tracking-widest">Atributos</h3>
            <div className="flex items-center gap-2">
              {distType === 'livre' && (
                <span className={`text-[10px] font-mono ${usedPool === attrPool ? 'text-green-400' : usedPool > attrPool ? 'text-red-400' : 'text-amber-400'}`}>
                  {usedPool}/{attrPool} pts
                </span>
              )}
              <button onClick={openAttrModal}
                className="text-[10px] text-primary/70 hover:text-primary border border-primary/20 rounded px-2 py-0.5 transition-colors flex items-center gap-1"
                title="Distribuir atributos">
                <span className="material-symbols-outlined text-[12px]">tune</span>
                Distribuir
              </button>
            </div>
          </div>
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

        {/* Abilities with Oracle Chat + AI Buff/Nerf */}
        <div className="border-t border-sep/30 pt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-mono text-outline text-[10px] uppercase tracking-widest">
              Habilidades · {(npc.abilities || []).length}
            </h3>
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setShowOracleChat(true); setOracleChat([]); setOracleChatPending(null) }}
                className="px-3 py-1.5 rounded-lg text-xs font-cinzel border bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/40 transition-all flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">forum</span>
                Conversar
              </button>
              <button onClick={handleOracleRebalance} disabled={oracleLoading}
                className={`px-3 py-1.5 rounded-lg text-xs font-cinzel border transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                  oracleLoading
                    ? 'bg-violet-500/20 border-violet-500/30 text-violet-400 animate-pulse'
                    : 'bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/40'
                }`}>
                <span className={`material-symbols-outlined text-sm ${oracleLoading ? 'animate-spin' : ''}`}>
                  {oracleLoading ? 'progress_activity' : 'auto_fix_high'}
                </span>
                {oracleLoading ? 'Consultando...' : 'Reformular Todas'}
              </button>
            </div>
          </div>
          {(npc.abilities || []).length > 0 ? (
            <div className="space-y-3">
              {npc.abilities.map((ab, idx) => {
                const colors = AB_COLORS[ab.type] || AB_COLORS.ativa
                const isLoading = abilityLoading[idx]
                return (
                  <div key={idx} className={`border-l-2 ${colors.border} ${colors.bg} rounded-r-lg p-4`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-mono ${colors.text} uppercase tracking-wider`}>
                        {AB_PREFIX[ab.type] || ab.type?.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-outline/40">#{idx + 1}</span>
                      <EditableField value={ab.name || ''} onChange={v => updateAbility(idx, { name: v })}
                        className="font-cinzel text-on-surface text-sm flex-1" />
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => handleAIBuffNerf(idx, 'buff')} disabled={!!isLoading}
                          className="w-6 h-6 grid place-items-center rounded text-[10px] font-bold text-green-400/70 border border-green-400/20 hover:bg-green-400/15 hover:text-green-400 transition-colors disabled:opacity-50"
                          title="Buff +30% (IA)">
                          {isLoading === 'buff' ? <span className="animate-spin inline-block w-2.5 h-2.5 border border-green-400/30 border-t-green-400 rounded-full" /> : '+'}
                        </button>
                        <button onClick={() => handleAIBuffNerf(idx, 'nerf')} disabled={!!isLoading}
                          className="w-6 h-6 grid place-items-center rounded text-[10px] font-bold text-red-400/70 border border-red-400/20 hover:bg-red-400/15 hover:text-red-400 transition-colors disabled:opacity-50"
                          title="Nerf -15% (IA)">
                          {isLoading === 'nerf' ? <span className="animate-spin inline-block w-2.5 h-2.5 border border-red-400/30 border-t-red-400 rounded-full" /> : '-'}
                        </button>
                      </div>
                    </div>
                    <EditableField value={ab.description || ''} onChange={v => updateAbility(idx, { description: v })}
                      tag="textarea" multiline
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
            tag="textarea" multiline
            className="text-on-surface-variant text-xs w-full leading-relaxed" />
        </div>
      </div>

      {/* Level Modal */}
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
              <div>
                <label className="text-[10px] font-mono text-outline uppercase tracking-widest block mb-1">Distribuicao de Atributos</label>
                <div className="grid grid-cols-2 gap-1">
                  {DIST_TYPES.map(dt => (
                    <button key={dt.key} onClick={() => setLevelDraft(prev => ({ ...prev, distType: dt.key }))}
                      className={`py-1.5 px-2 rounded text-[11px] font-mono transition-colors text-left ${
                        levelDraft.distType === dt.key
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : 'text-on-surface-variant/70 border border-outline/15 hover:border-primary/30 hover:text-on-surface'
                      }`}>
                      {dt.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-outline/40 font-mono">
                Os stats e atributos serao recalculados para o novo nivel/NA.
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

      {/* Attribute Distribution Modal */}
      {showAttrModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowAttrModal(false)}>
          <div className="bg-deep border border-sep rounded-xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-sep/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-sm">tune</span>
                <span className="font-cinzel text-primary text-sm">Distribuir Atributos</span>
              </div>
              <span className={`text-[10px] font-mono ${attrDraft.reduce((s, v) => s + v, 0) === attrPool ? 'text-green-400' : 'text-amber-400'}`}>
                {attrDraft.reduce((s, v) => s + v, 0)} / {attrPool} pts
              </span>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[10px] text-outline/50 font-mono">
                Cap maximo por atributo: {attrCap}. Mínimo: 1. Use as setas ou digite o valor.
              </p>
              {attrDraft.map((val, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24">
                    <span className="text-[11px] font-mono text-outline uppercase">{ATTR_NAMES[i]}</span>
                    <span className="text-[9px] text-outline/40 block">{ATTR_LABELS[ATTR_NAMES[i]]}</span>
                  </div>
                  <button onClick={() => setAttrDraft(d => d.map((v, j) => j === i ? Math.max(1, v - 1) : v))}
                    className="w-7 h-7 grid place-items-center rounded border border-sep text-outline hover:text-primary hover:border-primary/30">
                    <span className="material-symbols-outlined text-sm">remove</span>
                  </button>
                  <input type="number" min={1} max={attrCap + 5} value={val}
                    onChange={e => setAttrDraft(d => d.map((v, j) => j === i ? Math.max(1, Math.min(attrCap + 5, parseInt(e.target.value) || 1)) : v))}
                    className="w-16 text-center bg-surface-container border border-outline/30 rounded px-2 py-1 text-sm text-on-surface" />
                  <button onClick={() => setAttrDraft(d => d.map((v, j) => j === i ? Math.min(attrCap + 5, v + 1) : v))}
                    className="w-7 h-7 grid place-items-center rounded border border-sep text-outline hover:text-primary hover:border-primary/30">
                    <span className="material-symbols-outlined text-sm">add</span>
                  </button>
                  <span className="text-[10px] font-mono text-primary/60">Mod {attrMod(val)}</span>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                {DIST_TYPES.filter(d => d.key !== 'livre').map(dt => (
                  <button key={dt.key}
                    onClick={() => {
                      const result = generateNpcStats(npcRef.current.profile, npcRef.current.nivel, npcRef.current.na, dt.key)
                      if (result) setAttrDraft(result.attrs)
                    }}
                    className="flex-1 py-1.5 rounded text-[10px] font-mono border border-outline/15 text-outline hover:border-primary/30 hover:text-primary transition-colors">
                    {dt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-sep/30 flex justify-end gap-2">
              <button onClick={() => setShowAttrModal(false)}
                className="px-4 py-2 border border-sep rounded-lg text-xs text-outline hover:text-primary transition-colors">
                Cancelar
              </button>
              <button onClick={applyAttrModal}
                className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-lg text-xs text-primary hover:bg-primary/30 transition-colors">
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Damage Modal */}
      {showDmgModal && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowDmgModal(false)}>
          <div className="bg-deep border border-sep rounded-xl w-full max-w-xs shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-sep/30 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-400 text-sm">local_fire_department</span>
              <span className="font-cinzel text-red-400 text-sm">Calculadora de Dano</span>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-center">
                <span className="text-[10px] font-mono text-outline/60 uppercase tracking-widest">Vida Atual</span>
                <p className={`font-cinzel ${vidaColor} text-3xl`}>{vidaAtual} <span className="text-outline/40 text-lg">/ {vidaMax}</span></p>
              </div>
              <div>
                <label className="text-[10px] font-mono text-outline uppercase tracking-widest block mb-1">Dano</label>
                <input type="number" min={0} value={dmgInput} autoFocus
                  onChange={e => setDmgInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && dmgInput) applyDamage(parseInt(dmgInput) || 0) }}
                  placeholder="Ex: 45"
                  className="w-full bg-surface-container border border-red-400/30 rounded-lg px-4 py-2.5 text-sm text-on-surface focus:border-red-400/50 focus:outline-none text-center" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => applyDamage(-(parseInt(dmgInput) || 0))}
                  className="py-2 border border-green-400/30 rounded-lg text-xs text-green-400 hover:bg-green-400/10 transition-colors">
                  Curar
                </button>
                <button onClick={() => dmgInput && applyDamage(parseInt(dmgInput) || 0)}
                  className="py-2 bg-red-500/15 border border-red-400/30 rounded-lg text-xs text-red-400 hover:bg-red-500/25 transition-colors">
                  Aplicar Dano
                </button>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-sep/30 flex justify-end">
              <button onClick={() => setShowDmgModal(false)}
                className="px-4 py-2 border border-sep rounded-lg text-xs text-outline hover:text-primary transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Oracle Chat Modal */}
      {showOracleChat && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowOracleChat(false)}>
          <div className="bg-deep border border-violet-500/30 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-sep/30 flex items-center justify-between shrink-0">
              <span className="font-cinzel text-violet-400 text-sm flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">forum</span> Conversa com o Oraculo
              </span>
              <button className="text-outline text-xs hover:text-txt-main" onClick={() => setShowOracleChat(false)}>✕</button>
            </div>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px]">
              {oracleChat.length === 0 && (
                <p className="text-xs text-outline/50 italic text-center py-4">
                  Descreva o que gostaria de mudar nas habilidades do NPC. Ex: "A terceira habilidade precisa de um DT com atributo especificado" ou "Buffe todas as habilidades em 30%".
                </p>
              )}
              {oracleChat.map((msg, i) => (
                <div key={i} className={`text-xs leading-relaxed ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <span className={`inline-block max-w-[85%] px-3 py-2 rounded-lg whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-violet-500/15 text-violet-300'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}>{msg.content}</span>
                </div>
              ))}
              {oracleChatLoading && (
                <div className="flex items-center gap-2 text-violet-400/60 text-xs px-3">
                  <span className="animate-spin inline-block w-3 h-3 border border-violet-400/30 border-t-violet-400 rounded-full" />
                  pensando…
                </div>
              )}
            </div>
            {oracleChatPending && (
              <div className="px-4 py-3 border-t border-sep/30 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-violet-400/70 uppercase tracking-wider">
                    {oracleChatPending.type === 'all' ? `${oracleChatPending.data.habilidades?.length || 0} habilidades propostas` : 'Habilidade proposta'}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={applyChatPending}
                      className="px-3 py-1 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded text-[10px] hover:bg-violet-500/30">
                      Aplicar
                    </button>
                    <button onClick={() => setOracleChatPending(null)}
                      className="px-3 py-1 border border-sep text-outline rounded text-[10px] hover:text-txt-main">
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="px-4 py-3 border-t border-sep/30 shrink-0 flex gap-2">
              <input value={oracleChatInput} onChange={e => setOracleChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleOracleChatSend() } }}
                placeholder="Mensagem para o Oraculo..."
                className="flex-1 bg-surface-container border border-sep/30 rounded-lg px-3 py-2 text-xs text-on-surface focus:border-violet-400/40 focus:outline-none" />
              <button onClick={handleOracleChatSend} disabled={oracleChatLoading || !oracleChatInput.trim()}
                className="px-4 py-2 bg-violet-500/15 border border-violet-500/30 text-violet-400 rounded-lg text-xs hover:bg-violet-500/25 disabled:opacity-50 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
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
