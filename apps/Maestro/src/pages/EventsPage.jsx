import { useMemo, useState } from 'react'
import { Calendar, Search, Sparkles, Tag } from 'lucide-react'
import { useMaestro } from '../contexts/MaestroContext'

function loadPipelineState() {
  try {
    const stored = localStorage.getItem('maestro-pipeline-state-v1')
    return stored ? JSON.parse(stored) : null
  } catch { return null }
}

function loadEventsFromPipeline(pipelineState, fallback = []) {
  if (!pipelineState?.boxes) return fallback
  const box = pipelineState.boxes.campaigns_episodes
  if (!box?.items?.length) return fallback
  return box.items.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.polished || item.excerpt,
    bullets: item.bulletPoints || [],
    sources: item.sources || [],
    confidence: item.confidence || 0,
    date: new Date(item.createdAt || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }),
    tag: 'Campanha',
  }))
}

export function EventsPage() {
  const { episodes } = useMaestro()
  const pipelineState = useMemo(() => loadPipelineState(), [])
  const allEvents = useMemo(() => {
    const fromPipeline = loadEventsFromPipeline(pipelineState, [])
    const merged = [
      ...fromPipeline,
      ...(episodes || []).map((episode) => ({
        id: episode.id,
        title: episode.title || episode.label,
        summary: episode.summary,
        bullets: [],
        sources: [],
        confidence: episode.status === 'complete' ? 0.9 : 0.5,
        date: episode.date,
        tag: episode.campaign || 'Campanha',
      })),
    ]
    return merged
  }, [pipelineState, episodes])

  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const tags = useMemo(() => {
    const set = new Set(allEvents.map((event) => event.tag))
    return ['all', ...Array.from(set)]
  }, [allEvents])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allEvents.filter((event) => {
      if (tagFilter !== 'all' && event.tag !== tagFilter) return false
      if (!q) return true
      return `${event.title} ${event.summary}`.toLowerCase().includes(q)
    })
  }, [allEvents, query, tagFilter])

  return (
    <div className="page page--events">
      <header className="page-heading page-heading--actions">
        <div>
          <span className="eyebrow"><Calendar size={13} /> Campanhas e episódios</span>
          <h1>Eventos do universo</h1>
          <p>Anything que aconteceu ao longo de mesas, capítulos ou arcos narrativos. A IA revisa e poliu cada texto antes de chegar aqui.</p>
        </div>
        <div className="events-stats">
          <span><strong>{allEvents.length}</strong> eventos</span>
          <span><strong>{tags.length - 1}</strong> campanhas</span>
        </div>
      </header>

      <div className="events-toolbar">
        <div className="input-with-icon">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar evento por nome ou tema..." />
        </div>
        <div className="events-filters">
          {tags.map((tag) => (
            <button key={tag} type="button" className={tagFilter === tag ? 'active' : ''} onClick={() => setTagFilter(tag)}>
              <Tag size={12} /> {tag === 'all' ? 'Todos' : tag}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-projects">
          <span className="empty-mark"><Sparkles size={26} /></span>
          <h2>{allEvents.length === 0 ? 'A história ainda não foi escrita' : 'Nenhum evento encontrado'}</h2>
          <p>{allEvents.length === 0 ? 'Conecte suas fontes e rode o pipeline. Eventos de campanhas e episódios aparecem aqui automaticamente.' : 'Ajuste a busca ou filtros.'}</p>
        </div>
      ) : (
        <div className="events-grid">
          {filtered.map((event) => (
            <article key={event.id} className="event-card">
              <header>
                <span className="event-card__tag">{event.tag}</span>
                <small>{event.date}</small>
              </header>
              <h3>{event.title}</h3>
              <p>{event.summary}</p>
              {event.bullets?.length > 0 && (
                <ul className="event-card__bullets">
                  {event.bullets.map((bullet, i) => <li key={i}>{bullet}</li>)}
                </ul>
              )}
              <footer>
                <span><strong>{Math.round((event.confidence || 0) * 100)}%</strong> confiança</span>
                {event.sources?.length > 0 && <small>{event.sources.length} fonte{event.sources.length === 1 ? '' : 's'}</small>}
              </footer>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
