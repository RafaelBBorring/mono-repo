import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  FolderKanban,
  LogOut,
  Maximize2,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sparkles,
  TreePine,
  X,
} from 'lucide-react'
import anime from 'animejs'
import { Brand } from '../ui/Brand'
import { Toast } from '../ui/Toast'
import { OnboardingTutorial } from '../onboarding/OnboardingTutorial'
import { useAuth } from '../../contexts/AuthContext'
import { useMaestro } from '../../contexts/MaestroContext'
import '../../styles/shell-redesign.css'

const primaryNavigation = [
  { to: '/app/chat', label: 'Conversar', icon: MessageSquareText },
  { to: '/app/yggdrasil', label: 'Árvore da Vida', icon: TreePine },
  { to: '/app/canon', label: 'Cânone', icon: BookOpen },
  { to: '/app/settings', label: 'Configurações', icon: Settings },
]

const pageNames = {
  projects: 'Seus projetos',
  overview: 'Início',
  yggdrasil: 'Árvore da Vida · Yggdrasil',
  canon: 'Cânone · regras-mor do universo',
  connections: 'Conectar fontes',
  pipeline: 'Pipeline de caixas',
  events: 'Campanhas e episódios',
  discards: 'Caixa de descartes',
  atlas: 'Atlas vivo',
  sources: 'Fontes conectadas',
  knowledge: 'Biblioteca de conhecimento',
  timeline: 'Linha do tempo',
  review: 'Central de revisão',
  chat: 'Converse com seu universo',
  settings: 'Configurações',
  'miro-capture': 'Captura complementar do Miro',
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [projectMenu, setProjectMenu] = useState(false)
  const [switchingProjectId, setSwitchingProjectId] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(() => !sessionStorage.getItem('maestro-onboarding-seen'))
  const projectMenuRef = useRef(null)
  const { user, signOut, isDemo } = useAuth()
  const { activeProject, projects = [], setActiveProject, planName, usage, toast, clearToast, workspaceLoading, workspaceError, reloadWorkspace } = useMaestro()
  const location = useLocation()
  const navigate = useNavigate()
  const pageKey = location.pathname.split('/').filter(Boolean).at(-1)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const animation = anime({
      targets: '.page-content > *',
      translateY: [7, 0],
      duration: 420,
      delay: anime.stagger(28),
      easing: 'easeOutCubic',
    })
    return () => animation.pause()
  }, [location.pathname])

  useEffect(() => {
    if (!projectMenu) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setProjectMenu(false)
        projectMenuRef.current?.querySelector('.project-switcher')?.focus()
      }
    }
    const closeOnOutsideClick = (event) => {
      if (!projectMenuRef.current?.contains(event.target)) setProjectMenu(false)
    }

    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('pointerdown', closeOnOutsideClick)
    }
  }, [projectMenu])

  const closeOnboarding = () => {
    sessionStorage.setItem('maestro-onboarding-seen', '1')
    setShowOnboarding(false)
  }

  const logout = async () => {
    await signOut()
    navigate('/')
  }

  const selectProject = async (projectId) => {
    setProjectMenu(false)
    setUserMenu(false)
    setMobileOpen(false)

    if (projectId !== activeProject.id) {
      setSwitchingProjectId(projectId)
      try {
        await setActiveProject(projectId)
      } catch {
        return
      } finally {
        setSwitchingProjectId(null)
      }
    }

    navigate('/app/chat')
  }

  if (workspaceLoading) {
    return <div className="app-loader"><span /><p>Carregando seu workspace...</p></div>
  }

  if (!activeProject && pageKey === 'projects') {
    return (
      <div className="project-gate-shell">
        <header className="project-gate-shell__header">
          <Brand />
          <button className="project-gate-shell__logout" type="button" onClick={logout}>
            <LogOut size={16} aria-hidden="true" />
            <span>Sair</span>
          </button>
        </header>
        {workspaceError && (
          <div className="project-gate-shell__notice" role="status">
            <span>{workspaceError}</span>
            <button type="button" onClick={reloadWorkspace}>Tentar novamente</button>
          </div>
        )}
        <main className="project-gate-shell__content">
          <Outlet />
        </main>
        <Toast toast={toast} onClose={clearToast} />
      </div>
    )
  }

  if (!activeProject) {
    return (
      <div className="app-loader">
        <span />
        <p>{workspaceError || 'Nenhum projeto foi encontrado neste workspace.'}</p>
        <div className="project-gate-shell__fallback-actions">
          <button className="button button--primary" type="button" onClick={() => navigate('/app/projects')}>Ver projetos</button>
          <button className="button button--subtle" type="button" onClick={reloadWorkspace}>Tentar novamente</button>
        </div>
        <Toast toast={toast} onClose={clearToast} />
      </div>
    )
  }

  const memoryUsed = Number(usage?.memory?.used || 0)
  const memoryLimit = Number(usage?.memory?.limit || 0)
  const memoryPercent = memoryLimit ? Math.min(100, Math.round((memoryUsed / memoryLimit) * 100)) : 0
  const projectOptions = projects.length ? projects : [activeProject]
  const projectInitials = (name) => name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  return (
    <div className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      <aside className={`sidebar ${mobileOpen ? 'sidebar--mobile-open' : ''}`}>
        <div className="sidebar__top">
          <Brand compact={collapsed} />
          <button className="sidebar__mobile-close" type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={19} /></button>
        </div>

        <div className="project-switcher-wrap" ref={projectMenuRef}>
          <button
            className="project-switcher"
            type="button"
            aria-haspopup="menu"
            aria-expanded={projectMenu}
            aria-controls="project-switcher-menu"
            aria-label={collapsed ? `Trocar projeto. Atual: ${activeProject.name}` : undefined}
            onClick={() => {
              setProjectMenu((value) => !value)
              setUserMenu(false)
            }}
          >
            <span className="project-switcher__sigil">{projectInitials(activeProject.name)}</span>
            {!collapsed && (
              <span className="project-switcher__copy">
                <small>Projeto atual</small>
                <strong>{activeProject.name}</strong>
              </span>
            )}
            {!collapsed && <ChevronDown className={projectMenu ? 'project-switcher__chevron--open' : ''} size={15} />}
          </button>

          {projectMenu && (
            <div className="project-dropdown" id="project-switcher-menu" role="menu" aria-label="Selecionar projeto">
              <span className="project-dropdown__label">Seus projetos</span>
              {projectOptions.map((project) => {
                const isActive = project.id === activeProject.id
                return (
                  <button
                    className={`project-dropdown__option ${isActive ? 'project-dropdown__option--active' : ''}`}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    disabled={Boolean(switchingProjectId)}
                    key={project.id}
                    onClick={() => selectProject(project.id)}
                  >
                    <span className="project-dropdown__sigil">{projectInitials(project.name)}</span>
                    <span className="project-dropdown__copy">
                      <strong>{project.name}</strong>
                      <small>{project.type || 'Projeto criativo'}</small>
                    </span>
                    {isActive && <Check size={14} aria-hidden="true" />}
                  </button>
                )
              })}
              <button
                className="project-dropdown__manage"
                type="button"
                role="menuitem"
                onClick={() => {
                  setProjectMenu(false)
                  setMobileOpen(false)
                  navigate('/app/projects')
                }}
              >
                <FolderKanban size={15} aria-hidden="true" />
                <span>Gerenciar projetos</span>
              </button>
            </div>
          )}
        </div>

        <nav className="sidebar__nav" aria-label="Navegação do projeto">
          <div className="shell-nav-group">
            {!collapsed && <span className="sidebar__label">Essencial</span>}
            {primaryNavigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon size={19} strokeWidth={1.65} />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </div>

        </nav>

        <div className="sidebar__bottom">
          <a className="nav-item" href="mailto:suporte@maestro.app" onClick={() => setMobileOpen(false)} aria-label={collapsed ? 'Ajuda e suporte' : undefined} title={collapsed ? 'Ajuda' : undefined}>
            <CircleHelp size={18} strokeWidth={1.7} />
            {!collapsed && <span>Ajuda e suporte</span>}
          </a>
          {!collapsed && (
            <div className="plan-card">
              <span><Sparkles size={14} /> Plano {planName || user.plan}</span>
              <p>{memoryPercent}% da memória utilizada</p>
              <div className="usage-bar"><i style={{ width: `${memoryPercent}%` }} /></div>
              <button type="button" onClick={() => navigate('/app/settings')}>Ver planos</button>
            </div>
          )}
          <button className="collapse-button" type="button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}>
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            {!collapsed && <span>Recolher menu</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && <button className="mobile-overlay" type="button" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />}

      <main className="app-main">
        <header className="topbar">
          <div className="topbar__title">
            <button className="topbar__menu" type="button" onClick={() => {
              setCollapsed(false)
              setMobileOpen(true)
            }} aria-label="Abrir menu"><Menu size={20} /></button>
            <div>
              <span className="topbar__breadcrumb">{activeProject.name}</span>
              <strong>{pageNames[pageKey] || 'Maestro'}</strong>
            </div>
          </div>
          <div className="topbar__actions">
            {isDemo && <span className="demo-chip" title="Plano Free · backend ainda não configurado"><span /> Plano Free · local</span>}
            <button className="search-trigger" type="button" aria-label="Buscar na Árvore da Vida" onClick={() => navigate('/app/yggdrasil')}>
              <Search size={16} />
              <span>Buscar na Árvore...</span>
              <kbd><Command size={11} /> K</kbd>
            </button>
            <button
              className={`maestro-ask-cta ${pageKey === 'chat' ? 'maestro-ask-cta--active' : ''}`}
              type="button"
              aria-label="Perguntar ao Maestro"
              onClick={() => navigate('/app/chat')}
            >
              <Sparkles size={16} aria-hidden="true" />
              <span>Perguntar ao Maestro</span>
            </button>
            <button className="icon-button chat-fullscreen-trigger" type="button" aria-label="Abrir chat em tela cheia" onClick={() => navigate('/chat')} title="Chat em tela cheia">
              <Maximize2 size={16} />
            </button>
            <div className="user-menu-wrap">
              <button className="user-button" type="button" aria-haspopup="menu" aria-expanded={userMenu} aria-label="Abrir menu da conta" onClick={() => {
                setUserMenu((value) => !value)
                setProjectMenu(false)
              }}>
                <span>{user.initials}</span>
                <ChevronDown size={14} />
              </button>
              {userMenu && (
                <div className="user-dropdown" role="menu">
                  <div><strong>{user.name}</strong><span>{user.email}</span></div>
                  <button type="button" role="menuitem" onClick={logout}><LogOut size={15} /> Sair</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
      <Toast toast={toast} onClose={clearToast} />
      <OnboardingTutorial open={showOnboarding} onClose={closeOnboarding} onComplete={closeOnboarding} />
    </div>
  )
}
