import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, BookOpen, BrainCircuit, Check, ChevronDown, Compass, Copy, Lightbulb, MessageSquareText, Radio, Send, Sparkles, UserRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useMaestro } from '../contexts/MaestroContext'
import { maestroApi } from '../services/maestroApi'
import { VisualAnswer } from '../components/visual/VisualAnswer'

const modes = [
  { id: 'canon', label: 'Consultar cânone', icon: BookOpen, hint: 'Prioriza fatos aceitos e citações' },
  { id: 'investigate', label: 'Investigar', icon: Compass, hint: 'Explora hipóteses rotuladas' },
  { id: 'create', label: 'Criar', icon: Lightbulb, hint: 'Ideias não canônicas' },
]

const CHAT_MODE_STORAGE_KEY = 'maestro-chat-mode'
const validModes = new Set(modes.map(({ id }) => id))

const storedChatMode = () => {
  const storedMode = window.sessionStorage.getItem(CHAT_MODE_STORAGE_KEY)
  return validModes.has(storedMode) ? storedMode : 'canon'
}

export function ChatPage() {
  const { messages, activeProject, sources, usage, conversationId, conversations, selectConversation, sendMessage, startNewConversation, chatting, notify } = useMaestro()
  const [searchParams, setSearchParams] = useSearchParams()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState(() => {
    const requestedMode = searchParams.get('mode')
    return validModes.has(requestedMode) ? requestedMode : storedChatMode()
  })
  const [modeOpen, setModeOpen] = useState(false)
  const [liveMiro, setLiveMiro] = useState(false)
  const bottomRef = useRef(null)
  const messagesRef = useRef(null)
  const textareaRef = useRef(null)
  const activeMode = modes.find((item) => item.id === mode)
  const hasMiroSource = (sources || []).some((source) => source.provider === 'miro' && source.id)
  const memoryUsed = Number(usage?.memory?.used || 0)
  const memoryLimit = Number(usage?.memory?.limit || 0)
  const memoryPercent = memoryLimit ? Math.min(100, Math.round((memoryUsed / memoryLimit) * 100)) : 0

  useEffect(() => {
    const container = messagesRef.current
    if (!container) return
    container.scrollTo({
      top: container.scrollHeight,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [chatting, messages])

  useEffect(() => {
    const prompt = searchParams.get('prompt')
    const modeParam = searchParams.get('mode')
    const requestedMode = validModes.has(modeParam) ? modeParam : null

    if (requestedMode) {
      setMode(requestedMode)
      window.sessionStorage.setItem(CHAT_MODE_STORAGE_KEY, requestedMode)
    }
    if (prompt) setInput(prompt)
    if (!prompt && !modeParam) return

    setSearchParams({}, { replace: true })
    if (prompt) window.requestAnimationFrame(() => textareaRef.current?.focus())
  }, [searchParams, setSearchParams])

  const selectMode = (nextMode) => {
    setMode(nextMode)
    window.sessionStorage.setItem(CHAT_MODE_STORAGE_KEY, nextMode)
    setModeOpen(false)
  }

  const submit = async (event) => {
    event?.preventDefault()
    const text = input.trim()
    if (!text || chatting) return
    setInput('')
    let liveEvidence = []
    if (liveMiro && hasMiroSource && activeProject?.id) {
      const miroSource = sources.find((source) => source.provider === 'miro' && source.id)
      try {
        const result = await maestroApi.liveSearchMiro(activeProject.id, miroSource.id, text)
        liveEvidence = result?.matches || []
        if (!liveEvidence.length) notify('Consulta ao vivo: nada encontrado no board para este termo.', 'neutral')
      } catch {
        notify('Consulta ao vivo indisponível agora; enviando sem ela.', 'neutral')
      }
    }
    await sendMessage(text, { mode, liveEvidence })
    textareaRef.current?.focus()
  }

  const chooseSuggestion = (suggestion) => {
    setInput(suggestion)
    textareaRef.current?.focus()
  }

  const copyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content)
      notify('Resposta copiada.')
    } catch {
      notify('Não foi possível copiar a resposta.', 'error')
    }
  }

  return (
    <div className="chat-page">
      <aside className="chat-history">
        <button className="button button--subtle button--full" type="button" onClick={startNewConversation} disabled={chatting}><MessageSquareText size={15} /> Nova conversa</button>
        <div className="chat-history__group">
          <span>Conversas anteriores</span>
          {(conversations?.length || 0) === 0 ? (
            <div className="chat-history__empty">Nenhuma conversa salva ainda neste projeto.</div>
          ) : (
            <ul className="chat-history__list">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button type="button" className={conversationId === conv.id ? 'active' : ''} onClick={() => selectConversation(conv.id)} disabled={chatting}>
                    <strong>{conv.title || 'Sem título'}</strong>
                    <small>{new Date(conv.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · {new Date(conv.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="chat-memory"><span><BrainCircuit size={15} /> Memória usada</span><div className="usage-bar"><i style={{ width: `${memoryPercent}%` }} /></div><small>{memoryUsed} de {memoryLimit} {usage?.memory?.unit || 'mil tokens'}</small></div>
      </aside>
      <section className="chat-workspace">
        <header className="chat-header">
          <div><span className="maestro-avatar"><Sparkles size={17} /></span><div><strong>Maestro</strong><span><i /> {activeProject?.name || 'Projeto'} · {sources.length} fonte{sources.length === 1 ? '' : 's'} ativa{sources.length === 1 ? '' : 's'}</span></div></div>
          <div className="mode-picker"><button type="button" onClick={() => setModeOpen((value) => !value)}>{activeMode && <activeMode.icon size={14} />} {activeMode.label}<ChevronDown size={13} /></button>{modeOpen && <div>{modes.map(({ id, label, hint, icon: Icon }) => <button key={id} type="button" className={mode === id ? 'active' : ''} onClick={() => selectMode(id)}><Icon size={15} /><span><strong>{label}</strong><small>{hint}</small></span>{mode === id && <Check size={14} />}</button>)}</div>}</div>
        </header>
        <div className="messages" ref={messagesRef}>
          <div className="chat-date"><span>Hoje</span></div>
          {messages.map((message) => (
            <article className={`message message--${message.role}`} key={message.id}>
              <span className="message__avatar">{message.role === 'assistant' ? <Sparkles size={16} /> : <UserRound size={16} />}</span>
              <div className="message__body"><header><strong>{message.role === 'assistant' ? 'Maestro' : 'Você'}</strong><time>{message.createdAt}</time></header><VisualAnswer presentation={message.presentation} /><p>{message.content}</p>
                {message.citations?.length > 0 && <div className="citations"><span>Fontes consultadas</span>{message.citations.map((citation) => <button type="button" key={citation.id || citation.label} onClick={() => citation.sourceUrl && window.open(citation.sourceUrl, '_blank', 'noopener,noreferrer')} disabled={!citation.sourceUrl} title={citation.sourceUrl ? 'Abrir evidência' : 'Evidência sem link externo'}><span className={`citation-dot citation-dot--${citation.confidence.includes('infer') ? 'inferred' : citation.confidence === 'ambíguo' ? 'ambiguous' : 'confirmed'}`} /><span><strong>{citation.label}</strong><small>{citation.source} · {citation.confidence}</small></span></button>)}</div>}
                {message.followUp && <div className="follow-up"><Compass size={15} /><span><strong>Informação ausente</strong>{message.followUp}</span></div>}
                {message.conflicts?.length > 0 && (
                  <div className="canon-flag">
                    {message.conflicts.map((conflict, index) => (
                      <div key={index} className={`canon-flag__item canon-flag__item--${conflict.severity || 'medium'}`} role="alert">
                        <AlertTriangle size={15} />
                        <div>
                          <strong>Conflito com o cânone · {conflict.ruleTitle}</strong>
                          <p>{conflict.explanation}</p>
                          {conflict.userStatement && <small>Você afirmou: “{conflict.userStatement}”</small>}
                          {conflict.suggestedResolution && <span>Sugestão da IA: {conflict.suggestedResolution}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {message.role === 'assistant' && <div className="message-actions"><button type="button" onClick={() => copyMessage(message.content)}><Copy size={13} /> Copiar</button></div>}
                {message.suggestions && <div className="suggestions">{message.suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => chooseSuggestion(suggestion)}>{suggestion}</button>)}</div>}
              </div>
            </article>
          ))}
          {chatting && <article className="message message--assistant"><span className="message__avatar"><Sparkles size={16} /></span><div className="message__body"><header><strong>Maestro</strong><span className="thinking-label">consultando evidências</span></header><div className="typing"><i /><i /><i /></div></div></article>}
          <div ref={bottomRef} />
        </div>
        <form className="chat-composer" onSubmit={submit}>
          <div className="composer-meta">
            <span className={`composer-mode composer-mode--${mode}`}>{activeMode && <activeMode.icon size={13} />} {activeMode.label}</span>
            {hasMiroSource && (
              <button type="button" className={`composer-live ${liveMiro ? 'composer-live--on' : ''}`} onClick={() => setLiveMiro((value) => !value)} aria-pressed={liveMiro} title="Consultar o board do Miro em tempo real, sem precisar importar">
                <Radio size={12} /> Consulta ao vivo
              </button>
            )}
          </div>
          <textarea ref={textareaRef} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }} placeholder={mode === 'canon' ? 'Pergunte qualquer coisa sobre seu universo...' : mode === 'investigate' ? 'Qual hipótese você quer explorar?' : 'O que vamos imaginar juntos?'} rows="2" />
          <button type="submit" disabled={!input.trim() || chatting} aria-label="Enviar"><Send size={17} /></button>
          <small>O Maestro cita fontes e sinaliza quando não sabe. <kbd>Enter</kbd> para enviar · <kbd>Shift Enter</kbd> para quebrar linha.</small>
        </form>
      </section>
    </div>
  )
}
