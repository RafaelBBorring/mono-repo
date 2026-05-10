import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { analyzeBalance, chatAboutAbility } from '../services/aiService'

const QUICK_ACTIONS = [
  { id: 'analyze_all', label: 'Analisar Tudo', icon: '✦' },
  { id: 'apply', label: 'Aplicar Valores', icon: '⚡', requiresResult: true },
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

function AbilityCard({ ability, original, onApplySingle }) {
  const [showDesc, setShowDesc] = useState(false)
  const changed =
    ability.custoEnergia !== (original?.custoEnergia || 0) ||
    ability.dano !== (original?.dano || '') ||
    ability.duracao !== (original?.duracao || '')
  const descChanged = ability.descricaoBalanceada && ability.descricaoBalanceada !== (original?.descricao || ability.descricao)
  const isIrbalanceavel = ability.status === 'irbalanceavel'

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
          {ability.feedback && (
            <p className="text-gold/50 text-[11px] italic leading-relaxed">💡 {ability.feedback}</p>
          )}
        </>
      )}
      {onApplySingle && !isIrbalanceavel && (
        <button onClick={() => onApplySingle(ability)}
          className="text-[11px] text-gold/70 hover:text-gold border border-gold/20 hover:border-gold/40 px-3 py-1 rounded-lg transition-colors">
          Aplicar esta
        </button>
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

function MessageBubble({ msg, char, onApplySingle }) {
  if (msg.role === 'system') {
    return (
      <div className="flex justify-center">
        <div className="bg-gold/5 border border-gold/15 rounded-full px-3 py-1 text-[10px] text-gold/60">
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
              <p className="text-txt-main text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
          {msg.type === 'analysis' && msg.data && (
            <div className="space-y-2">
              {(msg.data.habilidades || []).map((h, i) => (
                <AbilityCard key={`h${i}`} ability={h} original={char?.habilidades?.[h.index]} onApplySingle={onApplySingle} />
              ))}
              {(msg.data.armaHabilidades || []).map((h, i) => (
                <WeaponAbilityCard key={`w${i}`} ability={h} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-end">
      <div className="bg-void/70 border border-sep/20 rounded-lg rounded-tr-sm p-4 max-w-[85%] backdrop-blur-sm">
        <p className="text-txt-dim text-[13px] leading-relaxed">{msg.content}</p>
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

export default function AbilityAnalysisChat({ char, onApply, characterId }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState(null)
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
    if (open && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Sou o Oráculo, motor de balanceamento do Sistema Olympo 2.0.\n\nPosso analisar habilidades, explicar regras de balanceamento e ajustar valores. Use os botões abaixo ou digite sua solicitação.`,
        },
      ])
    }
  }, [open])

  function addMessage(msg) {
    setMessages(prev => [...prev, { ...msg, id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }])
  }

  async function runAnalysis(userMessage) {
    if (loading) return
    setLoading(true)
    addMessage({ role: 'user', content: userMessage })
    addMessage({ role: 'system', content: 'Oráculo está analisando...' })

    try {
      const data = await analyzeBalance(char)
      setLastResult(data)
      const habs = data.habilidades || []
      const weaponHabs = data.armaHabilidades || []
      const total = habs.length + weaponHabs.length
      addMessage({
        role: 'assistant',
        content: `Análise concluída — ${total} habilidade${total !== 1 ? 's' : ''} revisada${total !== 1 ? 's' : ''}. Revise os cards abaixo e aplique individualmente ou use "Aplicar Valores".`,
        type: 'analysis',
        data,
      })
    } catch (err) {
      addMessage({ role: 'assistant', content: `Erro: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  async function handleChat(userMessage) {
    if (loading) return
    setLoading(true)
    addMessage({ role: 'user', content: userMessage })

    try {
      const response = await chatAboutAbility(char, userMessage, messages.filter(m => m.role === 'user' || m.role === 'assistant').slice(-6))
      addMessage({ role: 'assistant', content: response })
    } catch (err) {
      addMessage({ role: 'assistant', content: `Erro: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  function handleApplySingle(ability) {
    if (!lastResult || !onApply) return
    const result = {
      habilidades: ability.index !== undefined && !ability.tipo ? [ability] : [],
      armaHabilidades: ability.tipo === 'arma' ? [ability] : [],
    }
    onApply(result)
    addMessage({ role: 'system', content: `"${ability.nome}" aplicada.` })
  }

  function handleApplyAll() {
    if (!lastResult || !onApply) return
    onApply(lastResult)
    addMessage({ role: 'system', content: 'Todos os valores balanceados foram aplicados.' })
  }

  function handleExplain() {
    addMessage({ role: 'user', content: 'Explique as regras de balanceamento' })
    addMessage({
      role: 'assistant',
      content: `O Sistema Olympo 2.0 usa as seguintes regras:\n\n✦ SCP — Camadas de Poder (14.1)\nBase (ilimitada) + Tático (limitada por faixa) + Épico (limitada por faixa).\n\n✦ TDH — Teto de Dano por Habilidade (14.4)\nLimites de dano por faixa de nível e tipo (Fraca/Média/Forte/Ultimate).\n\n✦ IPL — Índice de Pontos de Poder (14.5)\nCada efeito tem custo em PP. Total não excede o limite do tipo na faixa.\n\n✦ LCP — Limite Cumulativo de Poder (14.6)\nBônus de TODAS as habilidades somados não excedem limites globais por faixa.\n\n✦ PEH — Pontos de Evolução\nHabilidades evoluídas recebem valores escalados ao investimento.\n\nUse "Analisar Tudo" para ver na prática.`,
    })
  }

  function handleQuickAction(action) {
    switch (action.id) {
      case 'analyze_all': runAnalysis('Analisar todas as habilidades'); break
      case 'apply': handleApplyAll(); break
      case 'explain': handleExplain(); break
    }
  }

  function handleSend() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    if (text.toLowerCase().includes('analisar') || text.toLowerCase().includes('balancear') || text.toLowerCase().includes('todas')) {
      runAnalysis(text)
    } else {
      handleChat(text)
    }
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
          <div className="relative w-full max-w-lg h-full bg-deep/98 border-l border-gold/20 shadow-2xl shadow-black/50 flex flex-col drawer-panel">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gold/15 bg-gradient-to-r from-void/80 via-deep/90 to-void/80">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/25 to-amber-600/15 border border-gold/30 flex items-center justify-center text-gold text-base font-cinzel font-bold">
                O
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-gold text-sm font-cinzel font-semibold">Oráculo</h3>
                <p className="text-txt-dim/50 text-[11px]">Motor de Balanceamento</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="text-txt-dim/40 hover:text-txt-dim text-lg px-2 transition-colors">
                ✕
              </button>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-void/30 via-deep/10 to-void/30">
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} char={char} onApplySingle={handleApplySingle} />
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
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Pergunte ou solicite análise..."
                  disabled={loading}
                  className="flex-1 bg-void/60 border border-sep/25 rounded-lg px-4 py-2.5 text-[13px] text-txt-main placeholder:text-txt-dim/25 focus:border-gold/30 focus:outline-none disabled:opacity-40 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-gold/15 border border-gold/25 text-gold hover:bg-gold/25 px-4 py-2.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
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
