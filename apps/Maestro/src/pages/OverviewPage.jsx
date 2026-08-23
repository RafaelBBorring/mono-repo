import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Compass,
  Database,
  Lightbulb,
  MessageSquareText,
  Send,
  ShieldAlert,
  Sparkles,
  TreePine,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useMaestro } from '../contexts/MaestroContext'
import { YggdrasilPreview } from '../components/visual/YggdrasilPreview'
import '../styles/home-redesign.css'

const modes = [
  { id: 'canon', label: 'Consultar', icon: BookOpen },
  { id: 'investigate', label: 'Investigar', icon: Compass },
  { id: 'create', label: 'Criar', icon: Lightbulb },
]

const CHAT_MODE_STORAGE_KEY = 'maestro-chat-mode'

const starterPrompts = [
  {
    label: 'Planejar próximos episódios',
    mode: 'create',
    prompt: 'Estou criando um novo episódio da campanha dos Primordiais em Nova Orleans. Sabendo como estão as coisas, me ajude a estruturar os próximos 3 episódios.',
  },
  {
    label: 'Encontrar pontas soltas',
    mode: 'investigate',
    prompt: 'Quais mistérios e conflitos do meu universo ainda estão em aberto?',
  },
  {
    label: 'Relembrar o cânone',
    mode: 'canon',
    prompt: 'Resuma o estado atual da história e cite os fatos mais importantes.',
  },
]

export function OverviewPage() {
  const { user, isDemo } = useAuth()
  const { activeProject, sources, entities, reviews, sendMessage, chatting } = useMaestro()
  const [question, setQuestion] = useState('')
  const [mode, setMode] = useState('create')
  const textareaRef = useRef(null)
  const navigate = useNavigate()
  const pending = reviews.filter((review) => review.status === 'pending')
  const primaryReview = pending[0]
  const syncedSources = sources.filter((source) => source.status === 'synced').length
  const firstName = user?.name?.split(' ')[0] || 'Criador'

  const ask = async (event) => {
    event.preventDefault()
    const text = question.trim()
    if (!text || chatting) return
    window.sessionStorage.setItem(CHAT_MODE_STORAGE_KEY, mode)
    await sendMessage(text, { mode })
    navigate(`/app/chat?mode=${mode}`)
  }

  const choosePrompt = (starter) => {
    setQuestion(starter.prompt)
    setMode(starter.mode)
    window.requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const openChat = () => {
    window.sessionStorage.setItem(CHAT_MODE_STORAGE_KEY, mode)
    navigate(`/app/chat?mode=${mode}`)
  }

  const openYggdrasil = () => navigate('/app/yggdrasil')

  return (
    <div className="page page--home">
      {isDemo && (
        <section className="home-demo-note">
          <span><Sparkles size={14} /></span>
          <p><strong>Workspace demonstrativo</strong> Explore a experiência com dados locais de exemplo.</p>
        </section>
      )}

      <section className="home-welcome">
        <span className="eyebrow"><BrainCircuit size={14} /> {activeProject?.name}</span>
        <h1>O que vamos criar hoje, {firstName}?</h1>
        <p>Converse com um cérebro que conhece o seu universo — e sabe separar cânone, hipótese e ideia nova.</p>
      </section>

      <section className="home-assistant" aria-label="Conversar com o Maestro">
        <div className="home-assistant__topline">
          <span className="maestro-orb"><Sparkles size={18} /></span>
          <div>
            <strong>Maestro</strong>
            <span><i /> {entities.length} entidades e {syncedSources} fonte{syncedSources === 1 ? '' : 's'} em contexto</span>
          </div>
        </div>

        <form onSubmit={ask}>
          <div className="home-mode-picker" role="group" aria-label="Modo da conversa">
            {modes.map(({ id, label, icon: Icon }) => (
              <button
                className={mode === id ? 'active' : ''}
                type="button"
                key={id}
                aria-pressed={mode === id}
                onClick={() => setMode(id)}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          <div className="home-composer">
            <label className="home-sr-only" htmlFor="home-maestro-question">Mensagem para o Maestro</label>
            <textarea
              id="home-maestro-question"
              ref={textareaRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={mode === 'create' ? 'Conte o que você está criando e onde precisa de ajuda...' : 'Pergunte qualquer coisa sobre o seu universo...'}
              rows="3"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  ask(event)
                }
              }}
            />
            <button type="submit" disabled={!question.trim() || chatting} aria-label="Enviar ao Maestro">
              {chatting ? <span className="home-composer__loading" /> : <Send size={18} />}
            </button>
          </div>
        </form>

        <div className="home-starters" role="group" aria-label="Sugestões para começar">
          {starterPrompts.map((starter) => (
            <button type="button" key={starter.label} onClick={() => choosePrompt(starter)}>
              {starter.label} <ArrowRight size={13} />
            </button>
          ))}
        </div>
      </section>

      <section className="home-section-heading">
        <div>
          <span className="eyebrow">Continue de onde parou</span>
          <h2>Seu universo, sem ruído.</h2>
        </div>
        <button className="text-button" type="button" onClick={() => navigate('/app/projects')}>Trocar projeto</button>
      </section>

      <section className="home-grid">
        <article className="home-yggdrasil">
          <div className="home-yggdrasil__copy">
            <small><TreePine size={14} /> Yggdrasil</small>
            <strong>Veja como tudo se conecta.</strong>
            <span>Explore pessoas, lugares, eventos e ideias em um mapa vivo. Passe o mouse para entender; clique para mergulhar.</span>
            <button className="home-yggdrasil__cta" type="button" onClick={openYggdrasil}>Explorar o mapa <ArrowRight size={15} /></button>
          </div>
          <YggdrasilPreview className="home-yggdrasil__map" labels={['Silas', 'Nova Orleans', 'O Véu']} onClick={openYggdrasil} ariaLabel="Explorar o mapa da Yggdrasil" />
        </article>

        <article className="home-focus-card">
          <header>
            <span className="home-card-icon home-card-icon--attention"><ShieldAlert size={17} /></span>
            <div><small>Precisa de você</small><strong>{pending.length} pendência{pending.length === 1 ? '' : 's'}</strong></div>
          </header>
          {primaryReview ? (
            <button type="button" onClick={() => navigate('/app/review')}>
              <span>{primaryReview.type}</span>
              <strong>{primaryReview.title}</strong>
              <p>{primaryReview.description}</p>
              <b>Revisar contexto <ChevronRight size={14} /></b>
            </button>
          ) : (
            <div className="home-empty-focus">
              <CheckCircle2 size={22} />
              <strong>Tudo em ordem</strong>
              <span>Nenhuma interpretação aguarda sua decisão.</span>
            </div>
          )}
        </article>

        <article className="home-memory-card">
          <header>
            <span className="home-card-icon"><Database size={17} /></span>
            <div><small>Memória recente</small><strong>Últimas atualizações</strong></div>
            <button type="button" onClick={() => navigate('/app/knowledge')} aria-label="Abrir biblioteca"><ArrowRight size={15} /></button>
          </header>
          <div>
            {entities.slice(0, 3).map((entity) => (
              <button type="button" key={entity.id} onClick={() => navigate(`/app/knowledge?entity=${entity.id}`)}>
                <span className="home-entity-dot" style={{ '--entity-accent': entity.accent }} />
                <span><strong>{entity.name}</strong><small>{entity.category} · {entity.facts} fatos</small></span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="home-context-strip">
        <div><Database size={15} /><span><strong>{syncedSources}/{sources.length}</strong> fontes sincronizadas</span></div>
        <i />
        <div><TreePine size={15} /><span><strong>{entities.length}</strong> elementos na Yggdrasil</span></div>
        <i />
        <button type="button" onClick={openChat}><MessageSquareText size={15} /> Abrir conversa completa <ArrowRight size={14} /></button>
      </section>
    </div>
  )
}
