import { Eye, MapPin, ScanLine, Sparkles } from 'lucide-react'

const placements = [
  { x: 18, y: 27 },
  { x: 79, y: 24 },
  { x: 22, y: 72 },
  { x: 77, y: 70 },
  { x: 49, y: 16 },
  { x: 50, y: 83 },
]

function evidenceState(entity) {
  if (entity.state) return entity.state
  if (Number(entity.confidence || 0) >= 90) return 'confirmed'
  return 'inferred'
}

export function SceneReconstruction({
  title,
  subtitle,
  location,
  entities = [],
  unknown,
  compact = false,
  lens = 'scene',
  selectedId,
  onSelect,
}) {
  const visibleEntities = entities.slice(0, placements.length)

  return (
    <div className={`scene-reconstruction ${compact ? 'scene-reconstruction--compact' : ''}`} data-lens={lens}>
      <div className="scene-reconstruction__atmosphere" aria-hidden="true"><i /><i /><i /></div>
      <header className="scene-reconstruction__header">
        <div><span><ScanLine size={12} /> Reconstrução de cena</span><strong>{title || 'Cena em formação'}</strong><small>{subtitle || 'Composição semântica das fontes disponíveis'}</small></div>
        <b><Eye size={12} /> {lens === 'unknowns' ? 'Lacunas visíveis' : lens === 'evidence' ? 'Lente de evidência' : 'Cena viva'}</b>
      </header>

      <div className="scene-reconstruction__canvas">
        <div className="scene-reconstruction__scan" aria-hidden="true" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {visibleEntities.map((entity, index) => {
            const point = placements[index]
            return <line key={entity.id || entity.name} x1={point.x} y1={point.y} x2="50" y2="51" className={`scene-link scene-link--${evidenceState(entity)}`} />
          })}
        </svg>

        <div className="scene-place">
          <span><MapPin size={16} /></span>
          <small>Local associado</small>
          <strong>{location || 'Local não identificado'}</strong>
        </div>

        {visibleEntities.map((entity, index) => {
          const point = placements[index]
          const state = evidenceState(entity)
          const Element = onSelect ? 'button' : 'div'
          return (
            <Element
              className={`scene-presence scene-presence--${state} ${selectedId === entity.id ? 'scene-presence--selected' : ''}`}
              key={entity.id || entity.name}
              style={{ left: `${point.x}%`, top: `${point.y}%`, '--presence-accent': entity.accent || '#d7b26d' }}
              type={onSelect ? 'button' : undefined}
              onClick={onSelect ? () => onSelect(entity.id) : undefined}
            >
              <span>{entity.initials || entity.name?.split(' ').slice(0, 2).map((part) => part[0]).join('')}</span>
              <strong>{entity.name}</strong>
              <small>{state === 'confirmed' ? 'observado' : 'associação'}</small>
            </Element>
          )
        })}

        {unknown && <div className="scene-unknown"><Sparkles size={13} /><span><small>Névoa narrativa</small><strong>{unknown}</strong></span></div>}
      </div>

      <footer className="scene-reconstruction__legend">
        <span><i className="legend-confirmed" /> Observado nas fontes</span>
        <span><i className="legend-inferred" /> Associação inferida</span>
        <small>Representa a organização das evidências, não a posição física dos personagens no mundo.</small>
      </footer>
    </div>
  )
}
