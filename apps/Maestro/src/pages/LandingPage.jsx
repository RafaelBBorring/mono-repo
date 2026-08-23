import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleHelp,
  DatabaseZap,
  Eye,
  Lightbulb,
  MessageSquareText,
  ScanSearch,
  Settings2,
  ShieldCheck,
  Sparkles,
  TreePine,
} from 'lucide-react'
import { Brand } from '../components/ui/Brand'
import { useAuth } from '../contexts/AuthContext'
import { YggdrasilPreview } from '../components/visual/YggdrasilPreview'
import '../styles/landing-redesign.css'

const principles = [
  { icon: ScanSearch, title: 'Lê o que você já criou', copy: 'Boards, documentos, imagens e relações espaciais entram em uma única memória.' },
  { icon: ShieldCheck, title: 'Não confunde ideia com fato', copy: 'Cânone, inferência, lacuna e sugestão criativa continuam claramente separados.' },
  { icon: BrainCircuit, title: 'Lembra para você criar', copy: 'Recupere detalhes, encontre conflitos e desenvolva o próximo arco sem recomeçar do zero.' },
]

const creativeEpisodes = [
  {
    number: '01',
    title: 'A procissão sem santos',
    hook: 'Os Primordiais descobrem um ritual atravessando o French Quarter.',
    canon: 'A Ordem do Sal vigia as rupturas no Véu e Silas continua desaparecido.',
    gap: 'O objetivo do grupo no Cemitério Lafayette ainda não foi registrado.',
    idea: 'A procissão oferece uma pista sobre Silas, mas cobra uma memória de cada personagem.',
  },
  {
    number: '02',
    title: 'O nome no fundo do rio',
    hook: 'Uma aliança improvável leva o grupo de volta ao bayou.',
    canon: 'A ruptura temporal do bayou apareceu pela primeira vez no episódio 16.',
    gap: 'Não existe confirmação sobre quem controla a passagem.',
    idea: 'Transforme a travessia em uma escolha: recuperar uma verdade ou preservar uma relação.',
  },
  {
    number: '03',
    title: 'Tudo que o Véu devolve',
    hook: 'As consequências convergem em uma decisão que muda Nova Orleans.',
    canon: 'O Clã Carmesim mantém influência política no French Quarter.',
    gap: 'As fontes divergem sobre a origem do Véu.',
    idea: 'Revele apenas uma parte da origem e use a contradição como motor do próximo arco.',
  },
]

export function LandingPage() {
  const landingRef = useRef(null)
  const [activeEpisode, setActiveEpisode] = useState(0)
  const navigate = useNavigate()
  const { user } = useAuth()
  const episode = creativeEpisodes[activeEpisode]

  useEffect(() => {
    const root = landingRef.current
    if (!root || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    root.classList.add('reveal-ready')
    const targets = root.querySelectorAll('[data-reveal]')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: .12 })
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [])

  const scrollToSection = (sectionId) => document.getElementById(sectionId)?.scrollIntoView({
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  })
  const openDestination = (destination = '/app/chat') => {
    if (user) {
      navigate(destination)
      return
    }
    sessionStorage.setItem('maestro-after-auth', destination)
    navigate('/login')
  }
  const openAuth = () => openDestination('/app/chat')
  const creativePrompt = 'Estou criando um novo episódio da campanha dos Primordiais em Nova Orleans. Sabendo como estão as coisas, me ajude a estruturar os próximos 3 episódios.'
  const openCreativeChat = () => openDestination(`/app/chat?mode=create&prompt=${encodeURIComponent(creativePrompt)}`)

  return (
    <div className="landing landing-v2" ref={landingRef}>
      <nav className="landing-nav landing-v2__nav" aria-label="Navegação principal">
        <Brand />
        <div className="landing-nav__links">
          <button type="button" onClick={() => scrollToSection('como-funciona')}>Como funciona</button>
          <button type="button" onClick={() => scrollToSection('yggdrasil')}>Árvore da Vida</button>
          <button type="button" onClick={() => scrollToSection('maestro')}>Maestro</button>
          <button type="button" onClick={() => scrollToSection('planos')}>Planos</button>
        </div>
        <div className="landing-nav__actions">
          <button className="button button--ghost" type="button" onClick={openAuth}>{user ? 'Abrir workspace' : 'Entrar'}</button>
          <button className="button button--light" type="button" onClick={openAuth}>{user ? 'Continuar' : 'Começar grátis'}</button>
        </div>
      </nav>

      <main>
        <section className="landing-v2__hero">
          <div className="landing-v2__hero-copy">
            <span className="landing-v2__kicker"><Sparkles size={14} /> Um segundo cérebro para o seu universo</span>
            <h1>Organize tudo.<br /><em>Lembre de tudo.</em><br />Crie o que vem depois.</h1>
            <p>O Maestro transforma suas fontes em uma memória viva: você explora tudo pela Yggdrasil e conversa com uma IA que conhece o contexto sem poluir seu processo.</p>
            <div className="landing-v2__hero-actions">
              <button className="button button--primary button--large" type="button" onClick={openAuth}>{user ? 'Abrir meu universo' : 'Criar meu universo'} <ArrowRight size={17} /></button>
              <button className="button button--ghost button--large" type="button" onClick={() => scrollToSection('yggdrasil')}><TreePine size={16} /> Conhecer a Árvore da Vida</button>
            </div>
            <span className="landing-v2__hero-note"><Check size={14} /> Comece grátis · sem cartão</span>
          </div>

          <div className="landing-v2__hero-product" aria-label="Prévia do Maestro">
            <header>
              <span><i /> Crônicas do Véu</span>
              <small>Memória sincronizada</small>
            </header>
            <div className="landing-v2__hero-map">
              <YggdrasilPreview onClick={() => openDestination('/app/yggdrasil')} ariaLabel="Abrir uma Yggdrasil de exemplo" />
            </div>
            <div className="landing-v2__hero-prompt">
              <span><Sparkles size={14} /> Maestro</span>
              <p>Me ajude a planejar os próximos 3 episódios em Nova Orleans.</p>
              <button type="button" onClick={openCreativeChat} aria-label="Experimentar esta conversa"><ArrowRight size={15} /></button>
            </div>
          </div>
        </section>

        <section className="landing-v2__audience" aria-label="Feito para criadores de universos">
          <span>Feito para universos que já não cabem só na sua cabeça</span>
          <div><b>Mestres de RPG</b><i />Worldbuilders<i />Escritores<i />Roteiristas<i />Game designers</div>
        </section>

        <section className="section landing-v2__workflow" id="como-funciona" data-reveal>
          <div className="section-heading">
            <span className="eyebrow">Três áreas. Um universo.</span>
            <h2>Tudo o que importa,<br /><em>em três lugares.</em></h2>
          </div>
          <div className="landing-v2__steps">
            <article>
              <span>01</span><div><MessageSquareText size={21} /></div>
              <h3>Conversar</h3>
              <p>Consulte o cânone, investigue lacunas ou crie novos caminhos com todo o contexto.</p>
            </article>
            <article>
              <span>02</span><div><TreePine size={21} /></div>
              <h3>Árvore da Vida</h3>
              <p>A Yggdrasil transforma personagens, eventos e relações em um mapa explorável.</p>
            </article>
            <article>
              <span>03</span><div><Settings2 size={21} /></div>
              <h3>Configurações</h3>
              <p>Veja seu plano, conecte o Miro e acompanhe os próximos vínculos em um só lugar.</p>
            </article>
          </div>
        </section>

        <section className="section landing-v2__yggdrasil" id="yggdrasil" data-reveal>
          <div className="landing-v2__section-copy">
            <span className="eyebrow"><TreePine size={14} /> Árvore da Vida · Yggdrasil</span>
            <h2>Um mapa vivo.<br /><em>Não outra pasta.</em></h2>
            <p>Abra o universo e veja somente o essencial. Passe por um elemento para entender seu papel; clique quando quiser ler, relacionar ou editar.</p>
            <ul>
              <li><Eye size={15} /><span><strong>Detalhes progressivos</strong> O mapa permanece limpo até você pedir contexto.</span></li>
              <li><ShieldCheck size={15} /><span><strong>Origem visível</strong> Cada conexão preserva suas evidências e seu grau de confiança.</span></li>
              <li><MessageSquareText size={15} /><span><strong>Conversa contextual</strong> Leve qualquer elemento direto para o Maestro.</span></li>
            </ul>
            <button className="button button--ghost" type="button" onClick={() => openDestination('/app/yggdrasil')}>Explorar minha Árvore <ArrowRight size={15} /></button>
          </div>
          <div className="landing-v2__yggdrasil-stage">
            <header><span><i /> Yggdrasil · Crônicas do Véu</span><small>Uma prévia do mapa interativo</small></header>
            <YggdrasilPreview onClick={() => openDestination('/app/yggdrasil')} ariaLabel="Explorar a Yggdrasil no Maestro" />
          </div>
        </section>

        <section className="section landing-v2__maestro" id="maestro" data-reveal>
          <div className="section-heading">
            <span className="eyebrow"><MessageSquareText size={14} /> Criação com contexto</span>
            <h2>Ele conhece a história.<br /><em>Você decide o futuro.</em></h2>
            <p>Peça ajuda como falaria com um parceiro criativo que realmente leu tudo.</p>
          </div>

          <div className="landing-v2__conversation">
            <div className="landing-v2__question">
              <span>Você</span>
              <p>Estou criando um novo episódio da campanha dos Primordiais em Nova Orleans. Sabendo como estão as coisas, me ajuda a estruturar os próximos 3 episódios?</p>
            </div>
            <div className="landing-v2__answer">
              <header><span className="maestro-orb"><Sparkles size={17} /></span><div><strong>Maestro</strong><small>Modo Criar · usando 18 fatos do cânone</small></div></header>
              <p>Montei um arco em três partes. As propostas criativas continuam separadas dos fatos confirmados.</p>
              <div className="landing-v2__episode-tabs" role="tablist" aria-label="Próximos episódios">
                {creativeEpisodes.map((item, index) => (
                  <button
                    type="button"
                    role="tab"
                    id={`episode-tab-${index}`}
                    aria-controls="episode-panel"
                    aria-selected={activeEpisode === index}
                    tabIndex={activeEpisode === index ? 0 : -1}
                    className={activeEpisode === index ? 'active' : ''}
                    key={item.number}
                    onClick={() => setActiveEpisode(index)}
                    onKeyDown={(event) => {
                      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
                      event.preventDefault()
                      const next = event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? creativeEpisodes.length - 1
                          : (activeEpisode + (event.key === 'ArrowRight' ? 1 : -1) + creativeEpisodes.length) % creativeEpisodes.length
                      setActiveEpisode(next)
                      document.getElementById(`episode-tab-${next}`)?.focus()
                    }}
                  >
                    <span>{item.number}</span><strong>{item.title}</strong><small>{item.hook}</small><ChevronRight size={15} />
                  </button>
                ))}
              </div>
              <div className="landing-v2__episode-detail" id="episode-panel" role="tabpanel" aria-labelledby={`episode-tab-${activeEpisode}`}>
                <div><span className="evidence-chip evidence-chip--canon"><BookOpen size={12} /> Baseado no cânone</span><p>{episode.canon}</p></div>
                <div><span className="evidence-chip evidence-chip--gap"><CircleHelp size={12} /> Lacuna identificada</span><p>{episode.gap}</p></div>
                <div><span className="evidence-chip evidence-chip--idea"><Lightbulb size={12} /> Sugestão criativa</span><p>{episode.idea}</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="section landing-v2__principles" data-reveal>
          <div className="landing-v2__principles-intro">
            <span className="eyebrow">Memória sem alucinação</span>
            <h2>Profundo quando precisa.<br />Discreto quando não precisa.</h2>
          </div>
          <div>
            {principles.map(({ icon: Icon, title, copy }) => (
              <article key={title}><Icon size={19} /><span><strong>{title}</strong><p>{copy}</p></span></article>
            ))}
          </div>
        </section>

        <section className="section pricing landing-v2__pricing" id="planos">
          <div className="section-heading"><span className="eyebrow">Comece pequeno, expanda quando quiser</span><h2>Um espaço para cada universo.</h2></div>
          <div className="pricing-grid">
            <article><span>Free</span><h3>R$ 0<small>/mês</small></h3><p>Para experimentar seu segundo cérebro.</p><ul><li><Check size={14} />1 projeto criativo</li><li><Check size={14} />Até 3 boards do Miro</li><li><Check size={14} />100 mil tokens de memória</li><li><Check size={14} />Sincronização manual</li></ul><button className="button button--ghost" type="button" onClick={openAuth}>Criar conta</button></article>
            <article className="pricing-card--featured"><b>Mais escolhido</b><span>Creator</span><h3>R$ 49<small>/mês</small></h3><p>Para universos que estão sempre crescendo.</p><ul><li><Check size={14} />10 projetos criativos</li><li><Check size={14} />Múltiplos boards</li><li><Check size={14} />2 milhões de tokens</li><li><Check size={14} />Novos conectores</li></ul><button className="button button--primary" type="button" onClick={openAuth}>Começar agora</button></article>
            <article><span>Studio</span><h3>R$ 149<small>/mês</small></h3><p>Para equipes que constroem juntas.</p><ul><li><Check size={14} />Projetos e fontes ampliados</li><li><Check size={14} />Até 10 colaboradores</li><li><Check size={14} />10 milhões de tokens</li><li><Check size={14} />Controles avançados</li></ul><button className="button button--ghost" type="button" disabled>Disponível na beta</button></article>
          </div>
        </section>

        <section className="landing-v2__final" data-reveal>
          <span className="eyebrow"><DatabaseZap size={14} /> O seu universo, finalmente compreendido</span>
          <h2>Menos tempo procurando.<br /><em>Mais tempo criando.</em></h2>
          <p>Conecte o que você já tem e faça sua primeira pergunta.</p>
          <button className="button button--primary button--large" type="button" onClick={openAuth}>{user ? 'Voltar ao meu universo' : 'Começar gratuitamente'} <ArrowRight size={17} /></button>
        </section>
      </main>

      <footer className="landing-footer"><Brand /><p>Seu universo. Finalmente compreendido.</p><span>© 2026 Maestro Creative Intelligence</span></footer>
    </div>
  )
}
