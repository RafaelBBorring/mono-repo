import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, BrainCircuit, Check, ChevronDown, Compass, Copy, Lightbulb, Maximize2, MessageSquareText, Send, Sparkles, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useMaestro } from '../contexts/MaestroContext'
import { useAuth } from '../contexts/AuthContext'
import { VisualAnswer } from '../components/visual/VisualAnswer'

const modes = [
  { id: 'canon', label: 'Consultar cânone', icon: BookOpen, hint: 'Prioriza fatos aceitos e citações' },
  { id: 'investigate', label: 'Investigar', icon: Compass, hint: 'Explora hipóteses rotuladas' },
  { id: 'create', label: 'Criar', icon: Lightbulb, hint: 'Gera campanhas e episódios inteiros' },
]

const CHAT_MODE_STORAGE_KEY = 'maestro-chat-mode'
const validModes = new Set(modes.map(({ id }) => id))

const storedChatMode = () => {
  const storedMode = window.sessionStorage.getItem(CHAT_MODE_STORAGE_KEY)
  return validModes.has(storedMode) ? storedMode : 'canon'
}

const suggestionsByMode = {
  canon: ['Quem é Silas Vane?', 'O que aconteceu em Nova Orleans?', 'Resuma o Episódio 18 em 5 linhas.'],
  investigate: ['Existe contradição entre a ordem e o véu?', 'Que mistérios ficaram em aberto?', 'Quem pode estar mentindo sobre o passado?'],
  create: ['Estruture os próximos 3 episódios dos Primordiais em Nova Orleans.', 'Estruture um arco de 3 episódios para a redenção de Silas.', 'Crie 3 episódios investigativos sobre o Véu em Nova Orleans.'],
}

export function ChatFullscreenPage() {
  const { messages, activeProject, sources, usage, sendMessage, startNewConversation, chatting, notify } = useMaestro()
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const [mode, setMode] = useState(storedChatMode)
  const [modeOpen, setModeOpen] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const activeMode = modes.find((item) => item.id === mode)
  const memoryUsed = Number(usage?.memory?.used || 0)
  const memoryLimit = Number(usage?.memory?.limit || 0)
  const memoryPercent = memoryLimit ? Math.min(100, Math.round((memoryUsed / memoryLimit) * 100)) : 0

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatting, messages])
  useEffect(() => { textareaRef.current?.focus() }, [])

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
    await sendMessage(text, { mode })
    textareaRef.current?.focus()
  }

  const copyMessage = async (content) => {
    try { await navigator.clipboard.writeText(content); notify('Resposta copiada.') }
    catch { notify('Não foi possível copiar.', 'error') }
  }

  return (
    <div className="chat-fullscreen">
      <header className="chat-fullscreen__topbar">
        <div className="chat-fullscreen__brand">
          <Link to="/app/overview" className="chat-back"><ArrowLeft size={15} /> Voltar</Link>
          <span className="chat-divider" />
          <span className="maestro-avatar"><Sparkles size={16} /></span>
          <div>
            <strong>Maestro · {activeProject?.name || 'Projeto'}</strong>
            <span>{sources.length} fonte{sources.length === 1 ? '' : 's'} · memória {memoryPercent}% usada</span>
          </div>
        </div>
        <div className="chat-fullscreen__actions">
          <button className="button button--subtle" type="button" onClick={startNewConversation} disabled={chatting}>
            <MessageSquareText size={14} /> Nova conversa
          </button>
          <div className="mode-picker">
            <button type="button" onClick={() => setModeOpen((value) => !value)}>
              {activeMode && <activeMode.icon size={14} />} {activeMode.label} <ChevronDown size={13} />
            </button>
            {modeOpen && (
              <div>
                {modes.map(({ id, label, hint, icon: Icon }) => (
                  <button key={id} type="button" className={mode === id ? 'active' : ''} onClick={() => selectMode(id)}>
                    <Icon size={15} />
                    <span><strong>{label}</strong><small>{hint}</small></span>
                    {mode === id && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="chat-fullscreen__body">
        <div className="messages">
          <div className="chat-date"><span>Conversa com o universo de {user?.name?.split(' ')[0] || 'Criador'}</span></div>
          {messages.map((message) => (
            <article className={`message message--${message.role}`} key={message.id}>
              <span className="message__avatar">{message.role === 'assistant' ? <Sparkles size={16} /> : <UserRound size={16} />}</span>
              <div className="message__body">
                <header><strong>{message.role === 'assistant' ? 'Maestro' : 'Você'}</strong><time>{message.createdAt}</time></header>
                <VisualAnswer presentation={message.presentation} />
                <p>{message.content}</p>
                {message.citations?.length > 0 && (
                  <div className="citations">
                    <span>Fontes consultadas</span>
                    {message.citations.map((citation) => (
                      <button type="button" key={citation.id || citation.label} onClick={() => citation.sourceUrl && window.open(citation.sourceUrl, '_blank', 'noopener,noreferrer')} disabled={!citation.sourceUrl}>
                        <span className={`citation-dot citation-dot--${citation.confidence.includes('infer') ? 'inferred' : citation.confidence === 'ambíguo' ? 'ambiguous' : 'confirmed'}`} />
                        <span><strong>{citation.label}</strong><small>{citation.source} · {citation.confidence}</small></span>
                      </button>
                    ))}
                  </div>
                )}
                {message.followUp && (
                  <div className="follow-up"><Compass size={15} /><span><strong>Informação ausente</strong>{message.followUp}</span></div>
                )}
                {message.role === 'assistant' && (
                  <div className="message-actions">
                    <button type="button" onClick={() => copyMessage(message.content)}><Copy size={13} /> Copiar</button>
                  </div>
                )}
                {message.suggestions && (
                  <div className="suggestions">{message.suggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => setInput(suggestion)}>{suggestion}</button>)}</div>
                )}
              </div>
            </article>
          ))}
          {chatting && (
            <article className="message message--assistant">
              <span className="message__avatar"><Sparkles size={16} /></span>
              <div className="message__body">
                <header><strong>Maestro</strong><span className="thinking-label">consultando evidências</span></header>
                <div className="typing"><i /><i /><i /></div>
              </div>
            </article>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <form className="chat-fullscreen__composer" onSubmit={submit}>
        <div className="composer-suggestions">
          {(suggestionsByMode[mode] || []).map((suggestion) => (
            <button type="button" key={suggestion} onClick={() => setInput(suggestion)}>{suggestion}</button>
          ))}
        </div>
        <div className="composer-row">
          <div className={`composer-mode composer-mode--${mode}`}>{activeMode && <activeMode.icon size={13} />} {activeMode.label}</div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit() } }}
            placeholder={mode === 'canon' ? 'Pergunte qualquer coisa sobre seu universo...' : mode === 'investigate' ? 'Qual hipótese você quer explorar?' : 'Descreva a campanha ou episódio que quer criar...'}
            rows="3"
          />
          <button type="submit" disabled={!input.trim() || chatting} aria-label="Enviar"><Send size={18} /></button>
        </div>
        <small><Maximize2 size={11} /> Tela cheia · <kbd>Enter</kbd> envia · <kbd>Shift+Enter</kbd> quebra linha · requisições longas são fragmentadas automaticamente para respeitar os limites do modelo.</small>
        <div className="composer-memory"><BrainCircuit size={13} /> {memoryUsed} / {memoryLimit} {usage?.memory?.unit || 'mil tokens'}</div>
      </form>
    </div>
  )
}
