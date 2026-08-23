import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowUpRight, BookOpenText, Filter, Orbit, Search, Sparkles, X } from 'lucide-react'
import { useMaestro } from '../contexts/MaestroContext'
import { StatusBadge } from '../components/ui/StatusBadge'

export function KnowledgePage() {
  const { entities } = useMaestro()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const selectedId = searchParams.get('entity')
  const selected = entities.find((entity) => entity.id === selectedId)
  const categories = useMemo(() => ['Todos', ...new Set(entities.map((entity) => entity.category).filter(Boolean))], [entities])

  useEffect(() => {
    if (selectedId && !selected) setSearchParams({})
  }, [selected, selectedId, setSearchParams])

  const filtered = useMemo(() => entities.filter((entity) => {
    const matchesCategory = category === 'Todos' || entity.category === category
    const haystack = `${entity.name} ${entity.summary} ${entity.tags.join(' ')}`.toLocaleLowerCase('pt-BR')
    return matchesCategory && haystack.includes(query.toLocaleLowerCase('pt-BR'))
  }), [category, entities, query])
  const visibleRelations = filtered.reduce((total, entity) => total + Number(entity.relations || 0), 0)

  return (
    <div className="page">
      <section className="page-heading"><span className="eyebrow">Memória estruturada</span><h1>Biblioteca de conhecimento</h1><p>Personagens, lugares, eventos e conceitos reunidos a partir de todas as fontes do projeto.</p></section>

      <section className="knowledge-toolbar">
        <div className="knowledge-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nome, relação ou conceito..." />{query && <button type="button" onClick={() => setQuery('')}><X size={14} /></button>}</div>
        <div className="category-filter"><Filter size={15} />{categories.map((item) => <button key={item} type="button" className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </section>

      <section className="knowledge-summary"><span><BookOpenText size={15} /><b>{filtered.length}</b> entidades visíveis</span><span><Sparkles size={15} /><b>{visibleRelations.toLocaleString('pt-BR')}</b> relações mapeadas</span><span className="legend"><i className="legend-confirmed" /> Confirmado <i className="legend-inferred" /> Inferido</span></section>

      <section className="entity-grid">
        {filtered.map((entity) => (
          <button className="entity-card" type="button" key={entity.id} onClick={() => setSearchParams({ entity: entity.id })}>
            <div className="entity-card__top"><span className="entity-avatar entity-avatar--large" style={{ '--entity-accent': entity.accent }}>{entity.initials}</span><span className="entity-category">{entity.category}</span><span className="confidence"><i style={{ '--confidence': `${entity.confidence}%` }} />{entity.confidence}%</span></div>
            <h2>{entity.name}</h2><p>{entity.summary}</p>
            <div className="tag-row">{entity.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div>
            <div className="entity-card__footer"><span><b>{entity.facts}</b> fatos</span><span><b>{entity.relations}</b> relações</span><small>{entity.updatedAt}</small><ArrowUpRight size={15} /></div>
          </button>
        ))}
      </section>

      {selected && (
        <>
          <button className="drawer-backdrop" type="button" onClick={() => setSearchParams({})} aria-label="Fechar detalhes" />
          <aside className="entity-drawer">
            <header className="entity-drawer__header"><div className="entity-vignette" style={{ '--entity-accent': selected.accent }}><i /><i /><span className="entity-avatar entity-avatar--xl">{selected.initials}</span>{selected.tags?.slice(0, 3).map((tag, index) => <b className={`entity-vignette__tag entity-vignette__tag--${index + 1}`} key={tag}>{tag}</b>)}</div><button className="icon-button" type="button" onClick={() => setSearchParams({})} aria-label="Fechar detalhes"><X size={17} /></button></header>
            <span className="entity-category">{selected.category}</span><h2>{selected.name}</h2><p>{selected.summary}</p>
            <div className="drawer-stats"><span><strong>{selected.facts}</strong>fatos</span><span><strong>{selected.relations}</strong>relações</span><span><strong>{selected.confidence}%</strong>confiança</span></div>
            <div className="drawer-section"><div className="drawer-section__title"><h3>Conhecimento principal</h3><span>Com proveniência</span></div>
              {(selected.claims || [
                { label: 'Classificação', value: selected.category, status: 'confirmed', source: 'Boards conectados' },
                { label: 'Associações', value: selected.tags.join(', '), status: 'inferred', source: 'Relações espaciais e textuais' },
              ]).map((claim) => <article className="claim-row" key={claim.label}><div><span>{claim.label}</span><strong>{claim.value}</strong><small>{claim.source}</small></div><StatusBadge status={claim.status} /></article>)}
            </div>
            <div className="drawer-section"><div className="drawer-section__title"><h3>Marcadores</h3></div><div className="tag-row">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>
            <div className="entity-drawer__actions"><button className="button button--subtle" type="button" onClick={() => navigate('/app/atlas')}><Orbit size={14} /> Ver no Atlas</button><button className="button button--primary" type="button" onClick={() => navigate(`/app/chat?prompt=${encodeURIComponent(`O que as fontes confirmam sobre ${selected.name}?`)}`)}>Perguntar sobre {selected.name.split(' ')[0]}</button></div>
          </aside>
        </>
      )}
    </div>
  )
}
