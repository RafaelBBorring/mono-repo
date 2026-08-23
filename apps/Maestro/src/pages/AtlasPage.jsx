import { useMemo, useState } from 'react'
import { animated, useSpring } from '@react-spring/web'
import { Aperture, ArrowRight, CircleHelp, Eye, Layers3, MessageSquareText, Orbit, ShieldCheck, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SceneReconstruction } from '../components/visual/SceneReconstruction'
import { useMaestro } from '../contexts/MaestroContext'

const lenses = [
  { id: 'scene', label: 'Cena', icon: Aperture },
  { id: 'evidence', label: 'Evidências', icon: ShieldCheck },
  { id: 'unknowns', label: 'Lacunas', icon: CircleHelp },
]

export function AtlasPage() {
  const { entities, episodes, reviews } = useMaestro()
  const [lens, setLens] = useState('scene')
  const [selectedId, setSelectedId] = useState(() => entities.find((entity) => entity.category === 'Personagem')?.id || entities[0]?.id)
  const navigate = useNavigate()
  const currentEpisode = episodes.find((episode) => episode.status === 'needs-context') || episodes[0]
  const currentReview = reviews.find((review) => review.status === 'pending') || reviews[0]
  const sceneEntities = useMemo(() => entities.filter((entity) => entity.category !== 'Local').slice(0, 6), [entities])
  const location = useMemo(() => {
    const mentioned = entities.find((entity) => entity.category === 'Local' && currentEpisode?.summary?.includes(entity.name))
    return mentioned || entities.find((entity) => entity.category === 'Local')
  }, [currentEpisode, entities])
  const selected = entities.find((entity) => entity.id === selectedId) || sceneEntities[0] || entities[0]
  const detailSpring = useSpring({
    from: { opacity: 0, transform: 'translateY(10px)' },
    to: { opacity: selected ? 1 : 0, transform: 'translateY(0px)' },
    reset: true,
    config: { tension: 240, friction: 24 },
  })

  const askAboutGap = () => {
    const subject = currentEpisode?.title || location?.name || 'esta cena'
    navigate(`/app/chat?prompt=${encodeURIComponent(`Ajude-me a completar o contexto de ${subject}. Mostre primeiro o que está confirmado, o que foi inferido e o que continua ausente.`)}`)
  }

  return (
    <div className="page atlas-page">
      <section className="page-heading page-heading--actions">
        <div><span className="eyebrow"><Orbit size={12} /> Memória espacial</span><h1>Atlas vivo</h1><p>Explore seu universo como cenas, presenças e tensões — não apenas como uma coleção de documentos.</p></div>
        <button className="button button--primary" type="button" onClick={askAboutGap}><MessageSquareText size={16} /> Conversar sobre esta cena</button>
      </section>

      <section className="atlas-command">
        <div><span><Sparkles size={14} /> Lente ativa</span><strong>{currentEpisode?.label || 'Memória mais recente'} · {currentEpisode?.title || 'Cena em formação'}</strong></div>
        <div className="atlas-lenses" role="group" aria-label="Camada da reconstrução">
          {lenses.map(({ id, label, icon: Icon }) => <button className={lens === id ? 'active' : ''} type="button" key={id} onClick={() => setLens(id)}><Icon size={14} />{label}</button>)}
        </div>
      </section>

      {entities.length ? <section className="atlas-layout">
        <article className="atlas-stage">
          <SceneReconstruction
            title={currentEpisode?.title}
            subtitle={`${currentEpisode?.label || 'Cena'} · ${currentEpisode?.date || 'data não registrada'}`}
            location={location?.name}
            entities={sceneEntities}
            unknown={currentReview?.title || 'Objetivo e desfecho ainda não registrados'}
            lens={lens}
            selectedId={selected?.id}
            onSelect={setSelectedId}
          />
          <div className="atlas-thread">
            <span>Fio narrativo</span>
            {episodes.slice(0, 3).reverse().map((episode, index) => <button type="button" className={episode.id === currentEpisode?.id ? 'active' : ''} key={episode.id} onClick={() => navigate(`/app/timeline`)}><i>{String(index + 1).padStart(2, '0')}</i><span><strong>{episode.title}</strong><small>{episode.label}</small></span></button>)}
          </div>
        </article>

        <animated.aside className="atlas-entity" style={detailSpring}>
          {selected && <>
            <div className="atlas-entity__portrait" style={{ '--entity-accent': selected.accent }}><i /><i /><span>{selected.initials}</span><b><Eye size={12} /> {selected.confidence}%</b></div>
            <span className="eyebrow">Presença selecionada</span>
            <h2>{selected.name}</h2>
            <p>{selected.summary}</p>
            <div className="atlas-entity__status"><span><i className={selected.confidence >= 90 ? 'legend-confirmed' : 'legend-inferred'} />{selected.confidence >= 90 ? 'Identidade confirmada' : 'Associação a revisar'}</span><small>{selected.category}</small></div>
            <div className="atlas-entity__orbit"><strong>Órbita narrativa</strong><div>{selected.tags?.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div></div>
            <div className="atlas-entity__question"><CircleHelp size={15} /><span><strong>O que ainda pulsa</strong><p>{currentReview?.title || 'Nenhuma lacuna diretamente associada foi encontrada.'}</p></span></div>
            <button className="button button--subtle button--full" type="button" onClick={() => navigate(`/app/knowledge?entity=${selected.id}`)}>Abrir experiência completa <ArrowRight size={14} /></button>
          </>}
        </animated.aside>
      </section> : <section className="empty-state"><Layers3 size={22} /><h3>O Atlas ainda está em silêncio</h3><p>Conecte e processe uma fonte para revelar cenas e presenças.</p></section>}

      <section className="atlas-primitives">
        <article><Eye size={17} /><span><strong>O que foi visto</strong><small>Texto, imagem, nome e posição preservados como evidência.</small></span></article>
        <article><Sparkles size={17} /><span><strong>O que foi conectado</strong><small>Relações prováveis aparecem com linguagem e traços distintos.</small></span></article>
        <article><CircleHelp size={17} /><span><strong>O que falta contar</strong><small>O vazio continua visível até você decidir o que aconteceu.</small></span></article>
      </section>
    </div>
  )
}
