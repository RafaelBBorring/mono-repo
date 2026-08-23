import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ChevronRight, Plus, Search, Sparkles, Users, Wand2 } from 'lucide-react'
import { useMaestro } from '../contexts/MaestroContext'
import { useAuth } from '../contexts/AuthContext'

const covers = ['atlas', 'veil', 'ember', 'nova', 'oracle', 'tide']
const accents = ['#d9b777', '#baa0f6', '#79d9b1', '#83bdf0', '#ec8992', '#f0c875']

function projectInitials(name) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function timeAgo(value) {
  if (!value) return 'agora mesmo'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'recentemente'
  const diff = Date.now() - date.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'agora mesmo'
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days}d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function ProjectsPage() {
  const { projects, activeProjectId, setActiveProject, createProject, usage, planName, notify } = useMaestro()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState('rpg')
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(() => {
    if (!projects?.length) return []
    const normal = query.trim().toLowerCase()
    if (!normal) return projects
    return projects.filter((p) => `${p.name} ${p.description || ''} ${p.type || ''}`.toLowerCase().includes(normal))
  }, [projects, query])

  const projectLimit = usage?.projects?.limit ?? 1
  const projectUsed = usage?.projects?.used ?? (projects?.length || 0)
  const canCreate = projectUsed < projectLimit

  useEffect(() => {
    if (!creating) {
      setNewName('')
      setNewKind('rpg')
    }
  }, [creating])

  const openProject = async (project) => {
    if (project.id !== activeProjectId) {
      try { await setActiveProject(project.id) } catch { /* noop */ }
    }
    navigate('/app/overview')
  }

  const submitCreate = async (event) => {
    event.preventDefault()
    if (!newName.trim() || submitting) return
    setSubmitting(true)
    try {
      await createProject({ name: newName, kind: newKind })
      setCreating(false)
      navigate('/app/connections?onboarding=1')
    } catch (error) {
      notify(error.message || 'Não foi possível criar este projeto.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const kinds = [
    { id: 'rpg', label: 'Mesa de RPG', copy: 'Campanhas, NPCs e cânone' },
    { id: 'book', label: 'Livro / Roteiro', copy: 'Personagens, arcos, capítulos' },
    { id: 'world', label: 'Worldbuilding', copy: 'Geografia, factions, história' },
  ]

  return (
    <div className="page page--projects">
      <header className="projects-header">
        <div>
          <span className="eyebrow"><Sparkles size={13} /> Workspace de {user?.name?.split(' ')[0] || 'Criador'}</span>
          <h1>Seus projetos</h1>
          <p>Cada projeto é um universo independente. Conecte fontes, deixe a IA compreender e converse com o cânone.</p>
        </div>
        <button className="button button--primary" type="button" onClick={() => setCreating(true)} disabled={!canCreate}>
          <Plus size={16} /> Novo projeto
        </button>
      </header>

      {!canCreate && (
        <div className="plan-reminder">
          <span>Você atingiu o limite de {projectLimit} projeto{projectLimit === 1 ? '' : 's'} do plano {planName || 'Free'}.</span>
          <button type="button" onClick={() => navigate('/app/settings?tab=plans')}>Ver planos <ChevronRight size={14} /></button>
        </div>
      )}

      <div className="projects-toolbar">
        <div className="input-with-icon projects-search">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar projeto por nome ou tema..." />
        </div>
        <span className="projects-count">{filtered.length} de {projects?.length || 0}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-projects">
          <span className="empty-mark"><Wand2 size={26} /></span>
          <h2>{(projects?.length || 0) === 0 ? 'Seu primeiro universo começa aqui' : 'Nenhum projeto encontrado'}</h2>
          <p>{(projects?.length || 0) === 0 ? 'Crie um projeto, conecte seu Miro e deixe o Maestro montar o mapa mental do seu universo.' : 'Ajuste a busca para encontrar o que procura.'}</p>
          {(projects?.length || 0) === 0 && (
            <button className="button button--primary button--large" type="button" onClick={() => setCreating(true)}>
              Criar primeiro projeto <ArrowRight size={16} />
            </button>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {filtered.map((project, index) => {
            const accent = accents[index % accents.length]
            const initials = projectInitials(project.name)
            return (
              <button key={project.id} className={`project-card ${project.id === activeProjectId ? 'project-card--active' : ''}`} type="button" onClick={() => openProject(project)} style={{ '--card-accent': accent }}>
                <div className="project-card__cover" data-cover={covers[index % covers.length]}>
                  <span>{initials}</span>
                  <div className="project-card__cover-grid" />
                </div>
                <div className="project-card__body">
                  <span className="project-card__eyebrow">{project.type === 'rpg' ? 'RPG' : project.type === 'book' ? 'Livro' : project.type === 'world' ? 'Mundo' : (project.type || 'Projeto')}</span>
                  <h3>{project.name}</h3>
                  <p>{project.description || 'Ainda sem sinopse. Adicione contexto nas configurações do projeto.'}</p>
                  <div className="project-card__meta">
                    <span><Users size={12} /> {project.health || 0}% mapeado</span>
                    <span>·</span>
                    <span>{timeAgo(project.updatedAt)}</span>
                  </div>
                </div>
                <span className="project-card__cta"><ArrowRight size={16} /></span>
              </button>
            )
          })}
        </div>
      )}

      {creating && (
        <div className="modal-backdrop" onClick={() => setCreating(false)}>
          <div className="modal modal--large" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div>
                <span className="eyebrow"><Sparkles size={13} /> Novo universo</span>
                <h2>Criar projeto</h2>
              </div>
              <button className="icon-button" type="button" onClick={() => setCreating(false)}>×</button>
            </div>
            <form className="modal__body" onSubmit={submitCreate}>
              <label>Nome do projeto
                <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Ex.: Crônicas do Véu" autoFocus required />
              </label>
              <label>Tipo de projeto</label>
              <div className="kind-picker">
                {kinds.map((kind) => (
                  <button key={kind.id} type="button" className={newKind === kind.id ? 'active' : ''} onClick={() => setNewKind(kind.id)}>
                    <strong>{kind.label}</strong>
                    <small>{kind.copy}</small>
                  </button>
                ))}
              </div>
              <div className="modal-actions">
                <span>Você será guiado a conectar suas fontes em seguida.</span>
                <button className="button button--primary" type="submit" disabled={!newName.trim() || submitting}>{submitting ? 'Criando…' : 'Criar e continuar'} {!submitting && <ArrowRight size={16} />}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
