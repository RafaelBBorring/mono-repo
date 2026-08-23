import { Aperture, BookOpen, CircleHelp, Lightbulb, Orbit, ShieldCheck, Sparkles } from 'lucide-react'
import { SceneReconstruction } from './SceneReconstruction'
import '../../styles/creative-artifact.css'

function ConstellationAnswer({ presentation }) {
  const nodes = presentation.nodes || []
  return (
    <div className="visual-answer visual-answer--constellation">
      <header><span><Orbit size={14} /> Cápsula viva</span><b>{presentation.state === 'mixed' ? 'Cânone + inferências' : 'Fontes confirmadas'}</b></header>
      <div className="answer-constellation">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {nodes.slice(0, 4).map((node, index) => <line key={node.label} x1="50" y1="50" x2={[17, 82, 24, 76][index]} y2={[24, 24, 78, 78][index]} className={node.state === 'inferred' ? 'is-inferred' : ''} />)}
        </svg>
        <div className="answer-constellation__core"><span>{presentation.initials}</span><strong>{presentation.title}</strong><small>{presentation.subtitle}</small></div>
        {nodes.slice(0, 4).map((node, index) => <div className={`answer-constellation__node answer-constellation__node--${index + 1}`} key={node.label}><i className={node.state === 'inferred' ? 'legend-inferred' : 'legend-confirmed'} /><strong>{node.label}</strong><small>{node.kind}</small></div>)}
      </div>
      <footer><ShieldCheck size={13} /> Selecione as citações abaixo para conferir a origem de cada vínculo.</footer>
    </div>
  )
}

function UnknownAnswer({ presentation }) {
  return (
    <div className="visual-answer visual-answer--unknown">
      <div className="unknown-orbit" aria-hidden="true"><i /><i /><span>?</span></div>
      <div><span><CircleHelp size={14} /> Espaço não escrito</span><h3>{presentation.title || 'As fontes não definem esta parte'}</h3><p>{presentation.unknown || 'O Maestro preservou a lacuna para que uma suposição genérica não se torne parte do seu cânone.'}</p></div>
    </div>
  )
}

function StoryPlanAnswer({ presentation }) {
  const episodes = Array.isArray(presentation.episodes)
    ? presentation.episodes.filter((episode) => episode && typeof episode === 'object')
    : []
  return (
    <div className="visual-answer visual-answer--story-plan">
      <header>
        <span className="story-plan__mark"><Sparkles size={15} /></span>
        <div><strong>{presentation.title || 'Rascunho de arco'}</strong><small>{presentation.subtitle || `${episodes.length} episódios sugeridos`}</small></div>
        <b>Não canônico</b>
      </header>
      <div className="story-plan__episodes">
        {episodes.map((episode) => (
          <details key={`${episode.number}-${episode.title}`}>
            <summary>
              <span className="story-plan__number">{episode.number}</span>
              <span className="story-plan__summary-copy"><strong>{episode.title}</strong><small>{episode.hook}</small></span>
              <i aria-hidden="true" />
            </summary>
            <div className="story-plan__detail">
              {episode.canon && <section><span className="story-plan__chip story-plan__chip--canon"><BookOpen size={11} /> Fato usado</span><p>{episode.canon}</p></section>}
              <section><span className="story-plan__chip story-plan__chip--gap"><CircleHelp size={11} /> Lacuna preservada</span><p>{episode.gap}</p></section>
              <section><span className="story-plan__chip story-plan__chip--idea"><Lightbulb size={11} /> Proposta criativa</span><p>{episode.idea}</p></section>
            </div>
          </details>
        ))}
      </div>
      <footer><ShieldCheck size={13} /> Rascunho criativo; não altera o cânone.</footer>
    </div>
  )
}

export function VisualAnswer({ presentation }) {
  if (!presentation) return null
  if (presentation.type === 'scene') {
    return (
      <div className="visual-answer visual-answer--scene">
        <SceneReconstruction
          compact
          title={presentation.title}
          subtitle={presentation.subtitle}
          location={presentation.location}
          entities={presentation.entities}
          unknown={presentation.unknown}
          lens="unknowns"
        />
      </div>
    )
  }
  if (presentation.type === 'character' || presentation.type === 'constellation') return <ConstellationAnswer presentation={presentation} />
  if (presentation.type === 'story-plan') return <StoryPlanAnswer presentation={presentation} />
  if (presentation.type === 'unknown') return <UnknownAnswer presentation={presentation} />
  return <div className="visual-answer visual-answer--signal"><Aperture size={16} /><Sparkles size={13} /><span>{presentation.title}</span></div>
}
