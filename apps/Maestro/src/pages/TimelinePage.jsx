import { CalendarDays, Check, ChevronDown, CircleHelp, Eye, MapPin, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMaestro } from '../contexts/MaestroContext'

export function TimelinePage() {
  const { episodes, notify } = useMaestro()
  const navigate = useNavigate()
  const campaign = episodes[0]?.campaign || null
  const documented = episodes.filter((episode) => episode.status === 'complete').length
  const totalSources = episodes.reduce((total, episode) => total + Number(episode.sources || 0), 0)
  return (
    <div className="page">
      <section className="page-heading page-heading--actions"><div><span className="eyebrow">História conectada</span><h1>Linha do tempo</h1><p>Eventos reconstruídos a partir das suas notas, documentos e referências visuais.</p></div><button className="button button--subtle" type="button" disabled title="O filtro será habilitado quando houver mais de uma campanha"><CalendarDays size={16} /> Todas as campanhas <ChevronDown size={14} /></button></section>

      {episodes.length ? <section className="timeline-hero">
        <div><span className="eyebrow"><MapPin size={12} /> Campanha atual</span><h2>{campaign || 'Campanha sem título'}</h2><p>Linha reconstruída somente a partir dos episódios e evidências disponíveis.</p></div>
        <div className="timeline-hero__stats"><span><b>{episodes.length}</b> episódios</span><span><b>{documented}</b> documentados</span><span><b>{totalSources}</b> fontes</span></div>
      </section> : <section className="empty-state"><CalendarDays size={22} /><h3>Linha do tempo ainda vazia</h3><p>Eventos reconhecidos nas fontes aparecerão aqui após a análise.</p></section>}

      {episodes.length > 0 && <section className="timeline-layout">
        <div className="timeline-line">
          {episodes.map((episode, index) => (
            <article className={`episode-card ${episode.status === 'needs-context' ? 'episode-card--attention' : ''}`} key={episode.id}>
              <div className="episode-marker"><span>{episode.status === 'complete' ? <Check size={14} /> : <CircleHelp size={14} />}</span>{index < episodes.length - 1 && <i />}</div>
              <div className="episode-card__content">
                <header><div><span>{episode.label} · {episode.date}</span><h2>{episode.title}</h2></div>{episode.status === 'needs-context' ? <b className="connection-badge connection-badge--attention"><CircleHelp size={12} /> Contexto incompleto</b> : <b className="connection-badge connection-badge--synced"><Check size={12} /> Documentado</b>}</header>
                <p>{episode.summary}</p>
                <footer><span><Eye size={13} /> {episode.sources} fontes relacionadas</span><button type="button" onClick={() => navigate(`/app/chat?prompt=${encodeURIComponent(`Resuma o episódio ${episode.title} e cite as evidências disponíveis.`)}`)}>Explorar episódio</button></footer>
              </div>
            </article>
          ))}
          <div className="timeline-earlier"><span /><button type="button" onClick={() => notify('Todos os episódios encontrados nas fontes já estão carregados.', 'neutral')}>Verificar episódios anteriores</button></div>
        </div>
        <aside className="timeline-aside">
          <article className="panel"><span className="eyebrow"><Sparkles size={12} /> Cobertura narrativa</span><h3>{documented} de {episodes.length} episódios documentados.</h3><p>Itens com contexto incompleto permanecem rotulados até você confirmar o que aconteceu.</p><div className="trend-bars">{episodes.slice(0, 5).reverse().map((episode) => <i key={episode.id} style={{ height: episode.status === 'complete' ? '88%' : '35%' }} />)}</div><small>Estado por episódio</small></article>
          <article className="panel timeline-legend"><h3>Como ler esta linha</h3><span><i className="legend-confirmed" />Evento documentado</span><span><i className="legend-inferred" />Contexto inferido</span><span><i className="legend-missing" />Informação ausente</span></article>
        </aside>
      </section>}
    </div>
  )
}
