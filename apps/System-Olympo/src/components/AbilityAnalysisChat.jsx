import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { chatAboutAbility } from '../services/aiService'
import { useAuth } from '../contexts/AuthContext'
import { getSkillTagChips } from '../utils/skillEvolution'

const QUICK_ACTIONS = [
  { id: 'apply', label: 'Aplicar Resultado', icon: '⚡', requiresResult: true },
  { id: 'explain', label: 'Regras', icon: '📖' },
]

const TYPE_BADGE = {
  Passiva: 'text-emerald-400 bg-emerald-400/10',
  Ativa: 'text-sky-400 bg-sky-400/10',
  Ultimate: 'text-amber-400 bg-amber-400/10',
  arma: 'text-orange-400 bg-orange-400/10',
}

function extractTipoBadge(tipo) {
  if (!tipo) return 'text-txt-dim bg-white/5'
  const key = Object.keys(TYPE_BADGE).find(k => tipo.includes(k))
  return key ? TYPE_BADGE[key] : 'text-txt-dim bg-white/5'
}

function AbilityCard({ ability, original, onApplySingle, onRefine, onGmRequest }) {
  const [showDesc, setShowDesc] = useState(false)
  const [gmDialogOpen, setGmDialogOpen] = useState(false)
  const [gmNote, setGmNote] = useState('')
  const [gmLoading, setGmLoading] = useState(false)
  const { isAdmin } = useAuth()
  const changed =
    ability.custoEnergia !== (original?.custoEnergia || 0) ||
    ability.dano !== (original?.dano || '') ||
    ability.duracao !== (original?.duracao || '') ||
    ability.dt !== (original?.dt || '')
  const descChanged = ability.descricaoBalanceada && ability.descricaoBalanceada !== (original?.descricao || ability.descricao)
  const isIrbalanceavel = ability.status === 'irbalanceavel'
  const tagChips = getSkillTagChips({ ...original, ...ability })

  async function handleGmSubmit() {
    if (!gmNote.trim()) return
    setGmLoading(true)
    try {
      const tipo = original?.tipo || ability.tipo || ''
      const nome = ability.nome || 'habilidade'
      await onGmRequest?.({
        ability,
        original,
        gmNote,
        tipo,
        nome,
      })
    } finally {
      setGmLoading(false)
      setGmDialogOpen(false)
      setGmNote('')
    }
  }

  return (
    <div className={`rounded-xl p-4 space-y-3 ${isIrbalanceavel ? 'bg-red-500/5 border-2 border-red-400/30' : 'bg-void/60 border border-sep/30'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-txt-main text-sm font-semibold">{ability.nome}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${extractTipoBadge(original?.tipo || ability.tipo)}`}>
          {original?.tipo || ability.tipo || '?'}
        </span>
        {(original?.evolucaoNivel || 0) > 0 && (
          <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded">★ Evo {original.evolucaoNivel}</span>
        )}
        {isIrbalanceavel && (
          <span className="text-[10px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded font-semibold ml-auto">IRBALANCEÁVEL</span>
        )}
        {!isIrbalanceavel && (changed || descChanged) && (
          <span className="text-[10px] bg-emerald-400/10 text-emerald-400 px-2 py-0.5 rounded ml-auto">balanceado</span>
        )}
      </div>

      {isIrbalanceavel ? (
        <div className="bg-red-500/8 border border-red-400/20 rounded-lg p-3 space-y-2">
          <p className="text-red-300 text-xs font-semibold">Esta habilidade não pode ser balanceada mantendo o conceito original.</p>
          {ability.feedback && (
            <p className="text-txt-dim/80 text-[11px] leading-relaxed">{ability.feedback}</p>
          )}
          <div className="bg-void/40 border border-sep/20 rounded-lg p-2.5">
            <span className="text-[10px] text-gold/60 uppercase tracking-wider block mb-1">Descrição original (referência para reescrita)</span>
            <p className="text-txt-dim/60 text-[11px] leading-relaxed line-clamp-3">{original?.descricao || ability.descricao}</p>
          </div>
          <p className="text-amber-300/70 text-[11px]">💡 Reescreva a habilidade com conceito mais específico ou restrito, depois analise novamente.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 text-[11px]">
            <div className="space-y-1">
              <span className="text-txt-dim/50 block text-[10px] uppercase">Energia</span>
              <div className="flex items-center gap-1.5">
                <span className="text-txt-dim/40">{original?.custoEnergia || 0}</span>
                <span className="text-txt-dim/25">→</span>
                <span className={`${changed ? 'text-amber-300 font-semibold' : 'text-txt-main'}`}>{ability.custoEnergia || 0}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-txt-dim/50 block text-[10px] uppercase">Dano</span>
              <div className="flex items-center gap-1.5">
                <span className="text-txt-dim/40 truncate">{original?.dano || '—'}</span>
                <span className="text-txt-dim/25">→</span>
                <span className={`${changed ? 'text-amber-300 font-semibold' : 'text-txt-main'} truncate`}>{ability.dano || '—'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-txt-dim/50 block text-[10px] uppercase">Duração</span>
              <div className="flex items-center gap-1.5">
                <span className="text-txt-dim/40 truncate">{original?.duracao || '—'}</span>
                <span className="text-txt-dim/25">→</span>
                <span className={`${changed ? 'text-amber-300 font-semibold' : 'text-txt-main'} truncate`}>{ability.duracao || '—'}</span>
              </div>
            </div>
          </div>
          {descChanged && (
            <div className="space-y-1.5">
              <button onClick={() => setShowDesc(v => !v)}
                className="text-[11px] text-amber-400/70 hover:text-amber-400 flex items-center gap-1 transition-colors">
                <span className={`transition-transform ${showDesc ? 'rotate-90' : ''}`}>▸</span>
                Descrição balanceada
              </button>
              {showDesc && (
                <div className="space-y-2 pl-1">
                  <div className="bg-red-400/5 border border-red-400/10 rounded-lg p-3">
                    <span className="text-[10px] text-red-400/40 block mb-1">Original</span>
                    <p className="text-txt-dim/50 text-[11px] leading-relaxed whitespace-pre-wrap line-through decoration-red-400/20">{original?.descricao || ability.descricao}</p>
                  </div>
                  <div className="bg-emerald-400/5 border border-emerald-400/10 rounded-lg p-3">
                    <span className="text-[10px] text-emerald-400/40 block mb-1">Balanceado</span>
                    <p className="text-txt-main text-[11px] leading-relaxed whitespace-pre-wrap">{ability.descricaoBalanceada}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          {tagChips.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tagChips.map(chip => (
                <span key={chip.tag} className="text-[10px] bg-void/45 border border-sep/25 text-txt-dim/75 px-2 py-0.5 rounded font-mono">
                  {chip.tag === 'dt' ? (
                    <>
                      DT: {chip.value || 'tipo?'}{chip.missingType ? <span className="text-amber-300/80"> tipo?</span> : null}
                    </>
                  ) : (
                    <>
                      {chip.label}{chip.value ? ` ${chip.value}` : ''}
                    </>
                  )}
                </span>
              ))}
            </div>
          )}
          {ability.feedback && (
            <p className="text-gold/50 text-[11px] italic leading-relaxed">💡 {ability.feedback}</p>
          )}
        </>
      )}
      {!isIrbalanceavel && (
        <div className="border-t border-sep/15 pt-2.5 space-y-2">
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => setGmDialogOpen(v => !v)}
                className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${gmDialogOpen ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 'border-sep/20 text-txt-dim/40 hover:text-txt-dim hover:border-sep/40'}`}>
                ✎ Ajuste do Mestre
              </button>
            )}
            {onRefine && (
              <button onClick={() => onRefine(ability, original)}
                className="text-[10px] px-2.5 py-1 rounded border border-purple-400/20 text-purple-400/60 hover:text-purple-400 hover:border-purple-400/40 transition-colors ml-auto">
                ✦ Refinar com Oráculo
              </button>
            )}
          </div>
          {isAdmin && gmDialogOpen && (
            <div className="bg-void/50 border border-amber-400/15 rounded-lg p-3 space-y-2.5">
              <label className="text-[10px] text-amber-400/70 uppercase tracking-wider block">O que deseja ajustar?</label>
              <textarea
                value={gmNote}
                onChange={e => setGmNote(e.target.value)}
                placeholder="Descreva as alterações desejadas. O Oráculo avaliará criticamente antes de aplicar..."
                rows={3}
                className="w-full bg-void border border-sep/25 rounded-lg px-3 py-2 text-[12px] text-txt-main placeholder:text-txt-dim/25 focus:border-amber-400/30 outline-none resize-none leading-relaxed"
              />
              <button onClick={handleGmSubmit} disabled={gmLoading || !gmNote.trim()}
                className="text-[11px] bg-amber-400/10 border border-amber-400/25 text-amber-400 hover:bg-amber-400/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                {gmLoading ? 'Consultando Oráculo...' : 'Enviar ao Oráculo'}
              </button>
            </div>
          )}
          <button onClick={() => onApplySingle?.(ability)}
            className="text-[11px] text-gold/70 hover:text-gold border border-gold/20 hover:border-gold/40 px-3 py-1 rounded-lg transition-colors">
            Aplicar esta
          </button>
        </div>
      )}
    </div>
  )
}

function WeaponAbilityCard({ ability }) {
  return (
    <div className="bg-void/60 border border-orange-400/15 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-txt-main text-xs font-semibold">{ability.nome}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded font-medium text-orange-400 bg-orange-400/10">
          {ability.tipo || 'Ativa'}
        </span>
        {ability.custo && <span className="text-gold/60 text-[9px] ml-auto font-mono">{ability.custo}</span>}
      </div>
      {ability.feedback && (
        <p className="text-gold/50 text-[9px] italic leading-relaxed">💡 {ability.feedback}</p>
      )}
    </div>
  )
}

function RefinementCard({ parsedAbility, originalAbility, onApplySingle }) {
  const [expanded, setExpanded] = useState(false)
  if (!parsedAbility) return null

  function handleApply() {
    const ability = {
      ...parsedAbility,
      index: originalAbility ? (char_habs_cache || []).findIndex(h => h.nome === originalAbility.nome) : undefined,
    }
    onApplySingle?.(ability)
  }

  return (
    <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-lg p-3 space-y-2.5 mt-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] bg-emerald-400/15 text-emerald-400 px-2 py-0.5 rounded font-semibold">AJUSTE SUGERIDO</span>
        <span className="text-txt-main text-sm font-semibold">{parsedAbility.nome}</span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-[11px]">
        <div>
          <span className="text-txt-dim/50 block text-[10px] uppercase">Energia</span>
          <div className="flex items-center gap-1.5">
            {originalAbility && <span className="text-txt-dim/40 line-through">{originalAbility.custoEnergia || 0}</span>}
            <span className="text-emerald-400 font-semibold">{parsedAbility.custoEnergia ?? '—'}</span>
          </div>
        </div>
        <div>
          <span className="text-txt-dim/50 block text-[10px] uppercase">Dano</span>
          <div className="flex items-center gap-1.5">
            {originalAbility && <span className="text-txt-dim/40 line-through text-xs">{originalAbility.dano || '—'}</span>}
            <span className="text-emerald-400 font-semibold truncate">{parsedAbility.dano || '—'}</span>
          </div>
        </div>
        <div>
          <span className="text-txt-dim/50 block text-[10px] uppercase">Duração</span>
          <div className="flex items-center gap-1.5">
            {originalAbility && <span className="text-txt-dim/40 line-through text-xs">{originalAbility.duracao || '—'}</span>}
            <span className="text-emerald-400 font-semibold truncate">{parsedAbility.duracao || '—'}</span>
          </div>
        </div>
      </div>
      {parsedAbility.descricaoBalanceada && (
        <div className="space-y-1">
          <button onClick={() => setExpanded(v => !v)}
            className="text-[10px] text-emerald-400/70 hover:text-emerald-400 flex items-center gap-1 transition-colors">
            <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▸</span>
            Descrição ajustada
          </button>
          {expanded && (
            <p className="text-txt-main text-[11px] leading-relaxed whitespace-pre-wrap bg-void/30 rounded p-2 border border-sep/10">
              {parsedAbility.descricaoBalanceada}
            </p>
          )}
        </div>
      )}
      <button onClick={handleApply}
        className="text-[11px] bg-emerald-400/10 border border-emerald-400/25 text-emerald-400 hover:bg-emerald-400/20 px-3 py-1.5 rounded-lg transition-colors">
        Aplicar este ajuste
      </button>
    </div>
  )
}

function GmForceActions({ meta, onGmRequest }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return null

  return (
    <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3 space-y-2">
      <p className="text-amber-300/70 text-[10px] uppercase tracking-wider">O Oráculo não aplicou as alterações</p>
      <div className="flex gap-2">
        <button
          onClick={() => onGmRequest({ ...meta, forceOverride: true })}
          className="text-[10px] bg-red-500/10 border border-red-400/25 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          🔑 Forçar Alteração
        </button>
        <span className="text-txt-dim/30 text-[10px] flex items-center">ou ajuste e envie novamente</span>
      </div>
    </div>
  )
}

function MessageBubble({ msg, char, onApplySingle, onRefine, onGmRequest }) {
  if (msg.role === 'system') {
    return (
      <div className="flex justify-center">
        <div className="bg-gold/5 border border-gold/15 rounded-full px-3 py-1 text-xs text-gold/70">
          {msg.content}
        </div>
      </div>
    )
  }

  if (msg.role === 'assistant') {
    return (
      <div className="flex gap-2.5 items-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gold/30 to-amber-600/20 border border-gold/30 flex items-center justify-center text-gold text-xs font-cinzel font-bold mt-0.5">
          O
        </div>
        <div className="space-y-2 min-w-0 flex-1">
          <div className="bg-deep/80 border border-gold/15 rounded-lg rounded-tl-sm p-4 backdrop-blur-sm">
            {msg.content && (
              <p className="text-txt-main text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
          {msg.type === 'analysis' && msg.data && (
            <div className="space-y-2">
              {(msg.data.habilidades || []).map((h, i) => (
                <AbilityCard key={`h${i}`} ability={h} original={char?.habilidades?.[h.index]} onApplySingle={onApplySingle} onRefine={onRefine} onGmRequest={onGmRequest} />
              ))}
              {(msg.data.armaHabilidades || []).map((h, i) => (
                <WeaponAbilityCard key={`w${i}`} ability={h} />
              ))}
            </div>
          )}
          {msg.type === 'gm_result' && msg.data && (
            <div className="space-y-2">
              {(msg.data.habilidades || []).map((h, i) => (
                <AbilityCard key={`gm${i}`} ability={h} original={char?.habilidades?.[h.index]} onApplySingle={onApplySingle} onRefine={onRefine} onGmRequest={onGmRequest} />
              ))}
              {msg.gmMeta && !msg.gmMeta.aiAppliedChanges && !msg.gmMeta.forceOverride && (
                <GmForceActions meta={msg.gmMeta} onGmRequest={onGmRequest} />
              )}
            </div>
          )}
          {msg.type === 'refinement' && msg.parsedAbility && (
            <RefinementCard parsedAbility={msg.parsedAbility} originalAbility={msg.originalAbility} onApplySingle={onApplySingle} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <div className="bg-void/70 border border-sep/20 rounded-lg rounded-tr-sm p-4 max-w-[85%] backdrop-blur-sm">
        <p className="text-txt-dim text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>
  )
}

function LoadingDots() {
  return (
    <div className="flex gap-2.5 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gold/30 to-amber-600/20 border border-gold/30 flex items-center justify-center text-gold text-xs font-cinzel font-bold mt-0.5">
        O
      </div>
      <div className="bg-deep/80 border border-gold/15 rounded-lg rounded-tl-sm p-3.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <span className="animate-bounce inline-block w-1.5 h-1.5 bg-gold/60 rounded-full" style={{ animationDelay: '0ms' }} />
          <span className="animate-bounce inline-block w-1.5 h-1.5 bg-gold/60 rounded-full" style={{ animationDelay: '150ms' }} />
          <span className="animate-bounce inline-block w-1.5 h-1.5 bg-gold/60 rounded-full" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

export default function AbilityAnalysisChat({ char, onApply, characterId, focusRequest }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const handledFocusRef = useRef(null)
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const scrollContainerRef = useRef(null)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
      }
    }, 50)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [open])

  useEffect(() => {
    if (open) window.__oracleChar = char
  }, [open, char])

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Sou o Oraculo, motor de balanceamento do Sistema Olympo 2.0.\n\nUse o botao Oraculo em uma habilidade para analisar aquele card, ou digite uma duvida/ajuste aqui.`,
        },
      ])
    }
  }, [open])

  function addMessage(msg) {
    setMessages(prev => [...prev, { ...msg, id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }])
  }

  useEffect(() => {
    if (!focusRequest?.id || handledFocusRef.current === focusRequest.id) return
    setOpen(true)
    if (loading) return
    handledFocusRef.current = focusRequest.id
    setTimeout(() => runSingleAbilityAnalysis(focusRequest), 0)
  }, [focusRequest, loading])

  function handleRefine(ability, original) {
    const tipo = original?.tipo || ability.tipo || ''
    const nome = ability.nome || 'habilidade'
    setInput(`Sobre a ${tipo} "${nome}": `)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function extractJsonFromResponse(resp) {
    const jsonBlock = resp.match(/```json\s*\n?([\s\S]*?)\n?\s*```/)
    if (jsonBlock) {
      try {
        const parsed = JSON.parse(jsonBlock[1].trim())
        if (parsed.habilidade) return parsed.habilidade
        if (Array.isArray(parsed.habilidades)) return parsed.habilidades[0] || null
        return parsed
      } catch {}
    }
    try {
      const parsed = JSON.parse(resp.trim())
      if (parsed.habilidade) return parsed.habilidade
      if (Array.isArray(parsed.habilidades)) return parsed.habilidades[0] || null
      return parsed
    } catch {}
    const looseJson = resp.match(/\{[\s\S]*"custoEnergia"[\s\S]*\}/)
    if (looseJson) {
      try { return JSON.parse(looseJson[0]) } catch {}
    }
    return null
  }

  function extractTextBeforeJson(resp) {
    const before = resp.match(/^([\s\S]*?)(?=```json|\{[\s\S]*"custoEnergia")/)
    return before ? before[1].trim() : ''
  }

  async function handleGmRequest({ ability, original, gmNote, tipo, nome, forceOverride }) {
    setLoading(true)
    const prefix = forceOverride ? '[CHAVE_MESTRA] ' : ''
    addMessage({
      role: 'user',
      content: `[Ajuste do Mestre${forceOverride ? ' — FORÇADO' : ''}] Sobre a ${tipo} "${nome}":\n${gmNote}`,
    })
    addMessage({ role: 'system', content: forceOverride ? 'Oráculo executando ordem do mestre...' : 'Oráculo avaliando pedido do mestre...' })

    try {
      const forceInstruction = forceOverride
        ? `\n\n[CHAVE MESTRA ATIVA] Aplique EXATAMENTE o pedido abaixo sem questionar. Retorne os valores solicitados.`
        : ''

      const gmPrompt = `[DESEJO DO MESTRE — Prioridade elevada]
Habilidade: "${nome}" (${tipo})
VALORES ATUAIS (balanceados): Energia=${ability.custoEnergia ?? original?.custoEnergia ?? 0} | Dano=${ability.dano || original?.dano || '—'} | Duração=${ability.duracao || original?.duracao || '—'}
${ability.descricaoBalanceada ? `Descrição balanceada atual: ${ability.descricaoBalanceada}` : `Descrição original: ${original?.descricao || ability.descricao || '—'}`}
${ability.feedback ? `Feedback anterior: ${ability.feedback}` : ''}

PEDIDO DO MESTRE: ${gmNote}${forceInstruction}
FORMATO CRITICO: comece pelo bloco JSON. Depois dele, escreva no maximo 3 linhas de analise.

Retorne sua análise e OBRIGATORIAMENTE um bloco JSON com os valores FINAIS:
\`\`\`json
{ "custoEnergia": <numero>, "dano": "<string>", "duracao": "<string ou vazio/null se instantanea>", "dt": "DT <numero> <Atributo|Pericia> ou vazio", "tags": ["custoEnergia", "bonusCA", "curaEnergia"], "valores": { "custoEnergia": 0, "bonusCA": "+2", "curaEnergia": "+5/rodada" }, "descricaoBalanceada": "<descrição completa ajustada>", "feedback": "<explicação>" }
\`\`\`
Campos não alterados mantenham o valor atual.`

      const resp = await chatAboutAbility(
        char,
        gmPrompt,
        messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-6)
      )
      const adjusted = { ...ability }
      let feedbackText = extractTextBeforeJson(resp)
      let aiAppliedChanges = false
      const parsed = extractJsonFromResponse(resp)

      if (parsed) {
        if (parsed.custoEnergia !== undefined) { adjusted.custoEnergia = parsed.custoEnergia; aiAppliedChanges = true }
        if (parsed.dano !== undefined) { adjusted.dano = parsed.dano; aiAppliedChanges = true }
        if (parsed.duracao !== undefined) { adjusted.duracao = parsed.duracao; aiAppliedChanges = true }
        if (parsed.dt !== undefined) { adjusted.dt = parsed.dt; aiAppliedChanges = true }
        if (parsed.tags !== undefined) { adjusted.tags = parsed.tags; aiAppliedChanges = true }
        if (parsed.valores !== undefined) { adjusted.valores = parsed.valores; aiAppliedChanges = true }
        if (parsed.descricaoBalanceada) { adjusted.descricaoBalanceada = parsed.descricaoBalanceada; aiAppliedChanges = true }
        if (parsed.feedback && !feedbackText) feedbackText = parsed.feedback
      }

      if (!feedbackText && !aiAppliedChanges) {
        feedbackText = forceOverride
          ? 'Valores aplicados conforme pedido do mestre.'
          : 'O Oráculo avaliou o pedido. Verifique o card abaixo — se os valores não mudaram, use "Forçar Alteração".'
      }

      const gmData = { habilidades: [adjusted], armaHabilidades: [] }
      setLastResult(prev => prev ? { ...prev, habilidades: [...(prev.habilidades || []), adjusted] } : gmData)

      addMessage({
        role: 'assistant',
        content: feedbackText ? `💡 ${feedbackText}` : '',
        type: 'gm_result',
        data: gmData,
        gmMeta: { ability, original, gmNote, tipo, nome, aiAppliedChanges, forceOverride },
      })
    } catch (err) {
      addMessage({ role: 'assistant', content: `Erro ao processar ajuste: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  async function runSingleAbilityAnalysis(request) {
    if (loading) return
    const ability = request?.ability || {}
    const index = Number.isInteger(request?.index) ? request.index : (char.habilidades || []).indexOf(ability)
    const tipo = ability.tipo || 'Habilidade'
    const nome = ability.nome || `${tipo} ${index >= 0 ? index + 1 : ''}`.trim()

    setLoading(true)
    addMessage({
      role: 'user',
      content: `Analisar habilidade individual: ${nome}\nTipo: ${tipo}\nEnergia: ${ability.custoEnergia || 0}\nDano: ${ability.dano || '-'}\nDuracao: ${ability.duracao || '-'}\n\n${ability.descricao || 'Sem descricao.'}`,
    })
    addMessage({ role: 'system', content: 'Oraculo analisando esta habilidade...' })

    const prompt = `[ANALISE INDIVIDUAL DE HABILIDADE]
Analise SOMENTE a habilidade abaixo. Use as outras habilidades do personagem apenas como contexto de LCP/combos, sem revisar o lote inteiro.

Index: ${index}
Tipo: ${tipo}
Nome: "${nome}"
Descricao original: ${ability.descricao || 'Sem descricao.'}
Custo Energia atual: ${ability.custoEnergia || 0}
Dano atual: ${ability.dano || ''}
Duracao atual: ${ability.duracao || ''}
DT atual: ${ability.dt || ''}
Tags atuais/inferidas: ${getSkillTagChips(ability).map(chip => chip.tag).join(', ') || 'nenhuma'}
Status atual: ${ability.status || 'Pendente'}

Regras de tags:
- Retorne tags padronizadas: custoEnergia, dano, cura, curaEnergia, duracao, dt, bonusAtaque, bonusCA, bonusResultado, bonusReacoes, vantagem, area, deslocamento, resistencia, paralisia, curaStatus, invisibilidade, invocacao.
- CA significa Classe de Armadura. Use bonusCA para efeitos como "+2 CA"; nao confunda com armadura de equipamento.
- Regeneracao/restauracao de energia usa curaEnergia, nao cura. Ex: "regenera 5 energia por rodada" => valores.curaEnergia "+5/rodada".
- Nao existe tag lentidao. Reducao de velocidade deve virar bonusResultado negativo, bonusReacoes negativo ou outra mecanica real.
- Nao use tag duracao e nao preencha duracao para habilidades instantaneas. "1 turno/1 rodada" so deve ser duracao se for um efeito persistente real, nao janela de resolucao.

Retorne primeiro um bloco JSON obrigatorio com os valores finais desta habilidade:
\`\`\`json
{
  "index": ${index >= 0 ? index : 0},
  "nome": "${nome.replace(/"/g, '\\"')}",
  "custoEnergia": 0,
  "dano": "",
  "duracao": "",
  "dt": "",
  "tags": ["custoEnergia", "bonusCA", "curaEnergia"],
  "valores": { "custoEnergia": 0, "bonusCA": "+2", "curaEnergia": "+5/rodada" },
  "descricaoBalanceada": "descricao completa balanceada",
  "status": "aprovada|ajustada|irbalanceavel",
  "feedback": "analise curta, limites aplicados e motivo"
}
\`\`\`
Depois do JSON, escreva no maximo 3 linhas de explicacao.`

    try {
      const response = await chatAboutAbility(
        char,
        prompt,
        messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-6)
      )
      const parsed = extractJsonFromResponse(response)

      if (parsed) {
        const adjusted = {
          ...ability,
          ...parsed,
          index: parsed.index ?? index,
          nome: parsed.nome || nome,
          descricao: ability.descricao || parsed.descricao || '',
          descricaoBalanceada: parsed.descricaoBalanceada || parsed.descricao || ability.descricao || '',
          status: parsed.status || 'ajustada',
        }
        const data = { habilidades: [adjusted], armaHabilidades: [] }
        setLastResult(data)
        addMessage({
          role: 'assistant',
          content: parsed.feedback ? `Analise: ${parsed.feedback}` : 'Analise individual concluida. Revise o card abaixo e aplique se estiver de acordo.',
          type: 'analysis',
          data,
        })
      } else {
        addMessage({ role: 'assistant', content: response })
      }
    } catch (err) {
      addMessage({ role: 'assistant', content: `Erro: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  function parseAbilityFromResponse(text) {
    const jsonMatch = text.match(/```json\s*\n?([\s\S]*?)\n?\s*```/)
    if (!jsonMatch) return null
    try {
      const parsed = JSON.parse(jsonMatch[1])
      if (parsed.habilidade && parsed.habilidade.nome) return parsed.habilidade
      if (parsed.nome) return parsed
    } catch {}
    return null
  }

  async function handleChat(userMessage) {
    if (loading) return
    setLoading(true)
    addMessage({ role: 'user', content: userMessage })

    try {
      const response = await chatAboutAbility(char, userMessage, messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-6))
      const parsedAbility = parseAbilityFromResponse(response)
      if (parsedAbility) {
        const originalHab = (char.habilidades || []).find(h =>
          h.nome?.toLowerCase() === parsedAbility.nome?.toLowerCase()
        )
        addMessage({
          role: 'assistant',
          content: response,
          type: 'refinement',
          parsedAbility,
          originalAbility: originalHab,
        })
      } else {
        addMessage({ role: 'assistant', content: response })
      }
    } catch (err) {
      addMessage({ role: 'assistant', content: `Erro: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  function handleApplySingle(ability) {
    if (!onApply) return
    if (ability.index !== undefined) {
      const isWeapon = ability.tipo === 'arma'
      const result = {
        habilidades: !isWeapon ? [ability] : [],
        armaHabilidades: isWeapon ? [ability] : [],
      }
      onApply(result)
      addMessage({ role: 'system', content: `"${ability.nome}" aplicada.` })
    } else {
      const originalHab = (char.habilidades || []).find(h =>
        h.nome?.toLowerCase() === ability.nome?.toLowerCase()
      )
      if (originalHab) {
        const idx = char.habilidades.indexOf(originalHab)
        const result = {
          habilidades: [{
            ...ability,
            index: idx,
            nome: ability.nome || originalHab.nome,
          }],
          armaHabilidades: [],
        }
        onApply(result)
        addMessage({ role: 'system', content: `"${ability.nome}" ajustada e aplicada.` })
      } else {
        addMessage({ role: 'system', content: `Não foi possível encontrar "${ability.nome}" nas habilidades do personagem.` })
      }
    }
  }

  function handleApplyAll() {
    if (!lastResult || !onApply) return
    onApply(lastResult)
    addMessage({ role: 'system', content: 'Resultado balanceado aplicado.' })
  }

  function handleExplain() {
    addMessage({ role: 'user', content: 'Explique as regras de balanceamento' })
    addMessage({
      role: 'assistant',
      content: `O Sistema Olympo 3.0 usa as seguintes regras:\n\n✦ SCP — Camadas de Poder (14.1)\nBase (ilimitada) + Tático (limitada por faixa) + Épico (limitada por faixa).\n\n✦ TDH — Teto de Dano por Habilidade (14.4)\nLimites de dano por faixa de nível e tipo (Fraca/Média/Forte/Ultimate).\n\n✦ IPL — Índice de Pontos de Poder (14.5)\nCada efeito tem custo em PP. Total não excede o limite do tipo na faixa.\n\n✦ LCP — Limite Cumulativo de Poder (14.6)\nBônus de TODAS as habilidades somados não excedem limites globais por faixa.\n\n✦ PEH v3.0 — Pontos de Evolução com Retornos Decrescentes\nEnergia escala como PEH^0.65, Dano/cura como PEH^0.70. DELTAS base reduzidos 60% vs v2.0. Regra dos 45%: nenhuma habilidade custa mais de 45% da energia total.\n\nUse o botao Oraculo no card de uma habilidade para analisar uma por vez.`,
    })
  }

  function handleQuickAction(action) {
    switch (action.id) {
      case 'apply': handleApplyAll(); break
      case 'explain': handleExplain(); break
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    handleChat(text)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const pendingCount = (char.habilidades || []).filter(h => h.status === 'Pendente').length
  const revisionCount = (char.habilidades || []).filter(h => h.status === 'Revisão necessária').length

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-gradient-to-r from-gold/10 to-amber-500/5 border border-gold/25 hover:border-gold/50 text-gold/90 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:shadow-lg hover:shadow-gold/5"
      >
        <span className="text-sm">✦</span>
        Oráculo
        {(pendingCount > 0 || revisionCount > 0) && (
          <span className="flex gap-1 ml-1">
            {pendingCount > 0 && <span className="bg-warn/20 text-warn text-[9px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
            {revisionCount > 0 && <span className="bg-err/20 text-err text-[9px] px-1.5 py-0.5 rounded-full">{revisionCount}</span>}
          </span>
        )}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm drawer-overlay" onClick={() => setOpen(false)} />
          <div className="oracle-chat-panel relative w-full max-w-xl h-full bg-deep/98 border-l border-gold/20 shadow-2xl shadow-black/50 flex flex-col drawer-panel">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gold/15 bg-gradient-to-r from-void/80 via-deep/90 to-void/80">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/25 to-amber-600/15 border border-gold/30 flex items-center justify-center text-gold text-base font-cinzel font-bold">
                O
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-gold text-sm font-cinzel font-semibold">Oráculo</h3>
                <p className="text-txt-dim/60 text-xs">Motor de Balanceamento</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="text-txt-dim/40 hover:text-txt-dim text-lg px-2 transition-colors">
                ✕
              </button>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-void/30 via-deep/10 to-void/30">
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} char={char} onApplySingle={handleApplySingle} onRefine={handleRefine} onGmRequest={handleGmRequest} />
              ))}
              {loading && <LoadingDots />}
              <div ref={chatEndRef} />
            </div>

            <div className="border-t border-gold/10 bg-deep/50 p-2.5 flex gap-1.5 flex-wrap">
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  disabled={loading || (action.requiresResult && !lastResult)}
                  className="text-[11px] bg-gold/8 border border-gold/15 text-gold/70 hover:text-gold hover:border-gold/35 px-3 py-1.5 rounded-md transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  {action.icon} {action.label}
                </button>
              ))}
            </div>

            <div className="border-t border-sep/20 bg-deep/80 p-3">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte ou solicite análise... (Shift+Enter para nova linha)"
                  disabled={loading}
                  rows={1}
                  className="flex-1 bg-void/60 border border-sep/25 rounded-lg px-4 py-2.5 text-sm text-txt-main placeholder:text-txt-dim/25 focus:border-gold/30 focus:outline-none disabled:opacity-40 transition-colors resize-none leading-relaxed min-h-[40px] max-h-[120px] overflow-y-auto"
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-gold/15 border border-gold/25 text-gold hover:bg-gold/25 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-25 disabled:cursor-not-allowed flex-shrink-0"
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
