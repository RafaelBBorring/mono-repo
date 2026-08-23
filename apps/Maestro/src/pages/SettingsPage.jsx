import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  Boxes,
  Check,
  ChevronRight,
  Cloud,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Gem,
  HardDrive,
  KeyRound,
  LayoutGrid,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useMaestro } from '../contexts/MaestroContext'
import { maestroApi } from '../services/maestroApi'
import { encryptSecret } from '../services/localVault/clientCrypto'
import '../styles/settings-redesign.css'

const tabs = [
  { id: 'overview', label: 'Visão geral', icon: LayoutGrid },
  { id: 'ai', label: 'Inteligência artificial', icon: Bot },
  { id: 'profile', label: 'Perfil', icon: UserRound },
  { id: 'security', label: 'Segurança', icon: ShieldCheck },
]

const integrations = [
  {
    id: 'miro',
    name: 'Miro',
    eyebrow: 'Board visual',
    icon: LayoutGrid,
    mark: 'M',
    tone: 'miro',
    state: 'available',
    description: 'Boards, frames, textos e referências visuais reunidos na memória do universo.',
    instructions: [
      'Autorize o Maestro a ler sua conta do Miro.',
      'Escolha somente os boards que pertencem a este projeto.',
      'Acompanhe a leitura e sincronize mudanças quando precisar.',
    ],
  },
  {
    id: 'notion',
    name: 'Notion',
    eyebrow: 'Documentos e bases',
    icon: FileText,
    mark: 'N',
    tone: 'notion',
    state: 'roadmap',
    description: 'Páginas, databases e documentos organizados sem sair do seu fluxo de escrita.',
    instructions: [
      'Autorize somente o workspace que deseja conectar.',
      'Selecione as páginas e bases que poderão alimentar o projeto.',
      'O Maestro manterá a origem de cada informação nas respostas.',
    ],
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    eyebrow: 'Vault local',
    icon: Gem,
    mark: 'O',
    tone: 'obsidian',
    state: 'roadmap',
    description: 'Notas Markdown, links e anexos do seu vault tratados como uma fonte rastreável.',
    instructions: [
      'Instale o conector local do Maestro no Obsidian.',
      'Escolha as pastas do vault que poderão ser indexadas.',
      'Revise alterações antes de enviá-las à memória do projeto.',
    ],
  },
  {
    id: 'drive',
    name: 'Google Drive',
    eyebrow: 'Arquivos na nuvem',
    icon: Cloud,
    mark: 'D',
    tone: 'drive',
    state: 'roadmap',
    description: 'Documentos e pastas compartilhadas disponíveis como contexto para o Maestro.',
    instructions: [
      'Conecte a conta Google com acesso somente de leitura.',
      'Escolha as pastas e arquivos ligados ao projeto.',
      'Remova o vínculo a qualquer momento nas configurações da conta.',
    ],
  },
]

const futureIntegrations = [
  {
    id: 'onedrive',
    name: 'OneDrive',
    eyebrow: 'Arquivos Microsoft',
    icon: Cloud,
    mark: '1',
    tone: 'onedrive',
    state: 'locked',
    description: 'Pastas e documentos do ecossistema Microsoft como fontes do projeto.',
    instructions: ['Autorize sua conta Microsoft.', 'Selecione as pastas permitidas.', 'Controle o vínculo pelas configurações do workspace.'],
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    eyebrow: 'Arquivos compartilhados',
    icon: Boxes,
    mark: 'D',
    tone: 'dropbox',
    state: 'locked',
    description: 'Pastas compartilhadas e arquivos de referência conectados ao universo.',
    instructions: ['Autorize sua conta Dropbox.', 'Selecione as pastas do projeto.', 'Acompanhe o estado de indexação de cada arquivo.'],
  },
  {
    id: 'local',
    name: 'Pasta local',
    eyebrow: 'Arquivos do dispositivo',
    icon: HardDrive,
    mark: 'L',
    tone: 'local',
    state: 'locked',
    description: 'Uma pasta monitorada no computador para notas e referências mantidas localmente.',
    instructions: ['Instale o aplicativo local do Maestro.', 'Escolha uma pasta específica.', 'Defina quando novos arquivos poderão ser sincronizados.'],
  },
]

function readInitialTab() {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
  const requested = params.get('tab')
  if (requested === 'general') return 'profile'
  if (requested === 'plans' || requested === 'integrations') return 'overview'
  return tabs.some((item) => item.id === requested) ? requested : 'overview'
}

function UsageMeter({ label, metric }) {
  const used = Number(metric?.used || 0)
  const limit = Number(metric?.limit || 0)
  const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0

  return (
    <article className="settings-v2-usage">
      <div><span>{label}</span><strong>{used.toLocaleString('pt-BR')} <small>de {limit.toLocaleString('pt-BR')} {metric?.unit || ''}</small></strong></div>
      <div className="settings-v2-usage__track" role="progressbar" aria-label={`Uso de ${label}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
        <i style={{ width: `${percent}%` }} />
      </div>
    </article>
  )
}

function IntegrationMark({ integration, compact = false }) {
  const Icon = integration.icon
  return (
    <span className={`settings-v2-integration-mark settings-v2-integration-mark--${integration.tone} ${compact ? 'settings-v2-integration-mark--compact' : ''}`} aria-hidden="true">
      <Icon size={compact ? 17 : 23} strokeWidth={1.7} />
      <b>{integration.mark}</b>
    </span>
  )
}

function IntegrationStatus({ integration, miroCount }) {
  if (integration.id === 'miro' && miroCount > 0) {
    return <span className="settings-v2-status settings-v2-status--connected"><Check size={12} /> {miroCount} board{miroCount === 1 ? '' : 's'}</span>
  }
  if (integration.state === 'available') return <span className="settings-v2-status settings-v2-status--available">Disponível</span>
  if (integration.state === 'roadmap') return <span className="settings-v2-status"><LockKeyhole size={12} /> Em preparação</span>
  return <span className="settings-v2-status"><LockKeyhole size={12} /> Bloqueado</span>
}

function IntegrationDialog({ integration, miroCount, onClose, onOpenMiro }) {
  const dialogRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    if (!integration) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus())

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [integration, onClose])

  if (!integration) return null
  const isMiro = integration.id === 'miro'

  return (
    <div className="settings-v2-dialog-backdrop" onMouseDown={onClose} role="presentation">
      <section ref={dialogRef} className="settings-v2-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-integration-title" aria-describedby="settings-integration-description" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <IntegrationMark integration={integration} />
          <div><span>{integration.eyebrow}</span><h2 id="settings-integration-title">Conectar {integration.name}</h2></div>
          <button ref={closeRef} type="button" className="settings-v2-dialog__close" onClick={onClose} aria-label="Fechar detalhes da integração"><X size={18} /></button>
        </header>
        <div className="settings-v2-dialog__body">
          <IntegrationStatus integration={integration} miroCount={miroCount} />
          <p id="settings-integration-description">{integration.description}</p>
          <div className="settings-v2-dialog__steps">
            <span>Como o vínculo funciona</span>
            <ol>{integration.instructions.map((instruction, index) => <li key={instruction}><b>{index + 1}</b><span>{instruction}</span></li>)}</ol>
          </div>
          <div className="settings-v2-dialog__privacy"><ShieldCheck size={17} /><p><strong>Você mantém o controle.</strong> O Maestro só lê o que for autorizado e preserva a origem das informações.</p></div>
        </div>
        <footer>
          <button className="button button--ghost" type="button" onClick={onClose}>Agora não</button>
          {isMiro ? (
            <button className="button button--primary" type="button" onClick={onOpenMiro}>{miroCount ? 'Gerenciar boards' : 'Iniciar vínculo'} <ChevronRight size={15} /></button>
          ) : (
            <button className="button button--primary" type="button" disabled><LockKeyhole size={14} /> Ainda indisponível</button>
          )}
        </footer>
      </section>
    </div>
  )
}

export function SettingsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(readInitialTab)
  const [selectedIntegration, setSelectedIntegration] = useState(null)
  const integrationTriggerRef = useRef(null)
  const [provider, setProvider] = useState('openrouter')
  const [model, setModel] = useState('openrouter/free')
  const [power, setPower] = useState('medium')
  const [endpointUrl, setEndpointUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [hasSavedKey, setHasSavedKey] = useState(false)
  const [savedProvider, setSavedProvider] = useState('')
  const [savedProviderHasKey, setSavedProviderHasKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [systemContext, setSystemContext] = useState('')
  const [visionProvider, setVisionProvider] = useState('openrouter')
  const [visionModel, setVisionModel] = useState('')
  const [visionEndpointUrl, setVisionEndpointUrl] = useState('')
  const [visionApiKey, setVisionApiKey] = useState('')
  const [hasSavedVisionKey, setHasSavedVisionKey] = useState(false)
  const [showVisionKey, setShowVisionKey] = useState(false)
  const [vaultPass, setVaultPass] = useState('')
  const { user, isDemo } = useAuth()
  const { activeProject, planName, usage, sources, saveProvider, resetDemo, notify, vault, unlockVault, lockVault } = useMaestro()

  const currentPlan = planName || user?.plan || 'Plano atual'
  const miroSources = useMemo(() => sources.filter((source) => String(source.provider || 'miro').toLowerCase() === 'miro'), [sources])
  const fullAccessPlan = /vip|desenvolvimento|development/i.test(currentPlan)

  useEffect(() => {
    if (isDemo || !activeProject?.id) return
    maestroApi.getProvider(activeProject.id).then(({ provider: saved }) => {
      if (!saved) return
      setProvider(saved.provider)
      setModel(saved.model)
      setPower(saved.power)
      setEndpointUrl(saved.endpointUrl || '')
      setHasSavedKey(Boolean(saved.hasCustomKey))
      setSavedProvider(saved.provider)
      setSavedProviderHasKey(Boolean(saved.hasCustomKey))
      setSystemContext(saved.systemContext || '')
      setVisionModel(saved.visionModel || '')
      setVisionEndpointUrl(saved.visionEndpointUrl || '')
      setHasSavedVisionKey(Boolean(saved.hasVisionKey))
      setVisionProvider(saved.visionModel ? (String(saved.visionEndpointUrl || '').includes('z.ai') ? 'zai' : saved.visionEndpointUrl ? 'openai-compatible' : 'openrouter') : 'openrouter')
    }).catch((error) => notify(error.message || 'Não foi possível carregar o provedor configurado.', 'error'))
  }, [activeProject?.id, isDemo, notify])

  const selectTab = (nextTab) => {
    setTab(nextTab)
    navigate(`/app/settings?tab=${nextTab}`, { replace: true })
  }

  const openIntegration = (integration, event) => {
    integrationTriggerRef.current = event.currentTarget
    setSelectedIntegration(integration)
  }

  const closeIntegration = () => {
    setSelectedIntegration(null)
    window.requestAnimationFrame(() => integrationTriggerRef.current?.focus())
  }

  const openMiro = () => {
    setSelectedIntegration(null)
    navigate('/app/sources')
  }

  const saveAi = async (event) => {
    event.preventDefault()
    setSaving(true)
    try {
      let apiKeyBlob
      let visionApiKeyBlob
      if ((apiKey || visionApiKey) && !vaultPass) throw new Error('Informe a passphrase do cofre para criptografar a chave.')
      if (apiKey) apiKeyBlob = await encryptSecret(apiKey, vaultPass)
      if (visionApiKey) visionApiKeyBlob = await encryptSecret(visionApiKey, vaultPass)
      await saveProvider({
        provider, model, power, endpointUrl: endpointUrl || undefined, systemContext,
        visionModel: visionModel || undefined,
        visionEndpointUrl: visionEndpointUrl || undefined,
        apiKeyBlob, visionApiKeyBlob,
      })
      const nextHasSavedKey = Boolean(apiKey) || (provider === savedProvider && savedProviderHasKey)
      setHasSavedKey(nextHasSavedKey)
      setSavedProviderHasKey(nextHasSavedKey)
      setSavedProvider(provider)
      setApiKey('')
      if (visionApiKey) setHasSavedVisionKey(true)
      setVisionApiKey('')
      notify('Configuração salva. A chave foi criptografada no seu navegador — desbloqueie o cofre para usá-la.')
    } catch (error) {
      notify(error.message || 'Não foi possível salvar o provedor de IA.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const revertToDefaultKey = async () => {
    setSaving(true)
    try {
      await saveProvider({ provider, model, power, apiKey: '', endpointUrl: endpointUrl || undefined, clearCustomKey: true })
      setHasSavedKey(false)
      setSavedProviderHasKey(false)
      setApiKey('')
      notify('Chave pessoal removida. O Maestro volta a usar o pool padrão.')
    } catch (error) {
      notify(error.message || 'Não foi possível reverter.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page settings-page settings-page-v2">
      <section className="page-heading settings-v2-heading">
        <span className="eyebrow">Seu espaço de criação</span>
        <h1>Configurações</h1>
        <p>Conecte suas fontes, acompanhe seu plano e ajuste somente o que realmente precisa.</p>
      </section>

      <nav className="settings-v2-tabs" aria-label="Seções das configurações">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => selectTab(id)} aria-current={tab === id ? 'page' : undefined}>
            <Icon size={16} />{label}
          </button>
        ))}
      </nav>

      <div className="settings-v2-content">
        {tab === 'overview' && (
          <div className="settings-v2-overview">
            <section className="settings-v2-plan" aria-labelledby="current-plan-title">
              <div className="settings-v2-plan__main">
                <span className="settings-v2-plan__icon"><Sparkles size={22} /></span>
                <div><span>Plano atual</span><h2 id="current-plan-title">{currentPlan}</h2><p>{fullAccessPlan ? 'Acesso completo habilitado para construir e validar o Maestro.' : 'Seu acesso e limites são calculados por workspace.'}</p></div>
                <span className={`settings-v2-plan__badge ${fullAccessPlan ? 'settings-v2-plan__badge--full' : ''}`}><Check size={12} /> {fullAccessPlan ? 'Acesso completo' : 'Plano ativo'}</span>
              </div>
              <div className="settings-v2-plan__usage">
                <UsageMeter label="Projetos" metric={usage?.projects} />
                <UsageMeter label="Memória" metric={usage?.memory} />
                <UsageMeter label="Análises de IA" metric={usage?.analyses} />
              </div>
              <button type="button" className="settings-v2-plan__manage" onClick={() => notify(fullAccessPlan ? 'Este workspace já possui acesso completo.' : 'A gestão de assinatura será liberada na próxima etapa.', 'neutral')}>
                <CreditCard size={15} /> Gerenciar assinatura <ChevronRight size={14} />
              </button>
            </section>

            <section className="settings-v2-integrations" aria-labelledby="integrations-title">
              <header><div><span className="eyebrow">Memória conectada</span><h2 id="integrations-title">Onde suas ideias vivem</h2><p>O Maestro unifica o contexto sem substituir as ferramentas que já funcionam para você.</p></div><span>{miroSources.length} fonte{miroSources.length === 1 ? '' : 's'} do Miro</span></header>
              <div className="settings-v2-integration-grid">
                {integrations.map((integration) => (
                  <button key={integration.id} type="button" className={`settings-v2-integration-card settings-v2-integration-card--${integration.state}`} onClick={(event) => openIntegration(integration, event)} aria-haspopup="dialog">
                    <div><IntegrationMark integration={integration} /><IntegrationStatus integration={integration} miroCount={miroSources.length} /></div>
                    <span>{integration.eyebrow}</span>
                    <strong>{integration.name}</strong>
                    <p>{integration.description}</p>
                    <em>Ver como conectar <ChevronRight size={14} /></em>
                  </button>
                ))}
              </div>
            </section>

            <section className="settings-v2-future" aria-labelledby="future-integrations-title">
              <header><div><h2 id="future-integrations-title">Próximos vínculos</h2><p>Estas opções já fazem parte do mapa do produto, mas permanecem bloqueadas por enquanto.</p></div><LockKeyhole size={17} /></header>
              <div>
                {futureIntegrations.map((integration) => (
                  <button key={integration.id} type="button" onClick={(event) => openIntegration(integration, event)} aria-haspopup="dialog">
                    <IntegrationMark integration={integration} compact />
                    <span><strong>{integration.name}</strong><small>{integration.eyebrow}</small></span>
                    <LockKeyhole size={14} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'ai' && (
          <section className="settings-section settings-v2-section">
            <header><div><span className="eyebrow"><Sparkles size={12} /> Configuração avançada</span><h2>Inteligência artificial</h2><p>Configure texto e visão com sua própria chave (OpenRouter, Z.AI, OpenAI, Gemini e outros compatíveis). Credenciais nunca são exibidas novamente.</p></div></header>
            <div className="vault-card">
              <div className="vault-card__head"><KeyRound size={16} /><div><strong>Cofre de chaves (zero-conhecimento)</strong><small>Suas chaves são criptografadas no navegador com esta passphrase. O servidor guarda somente o ciphertext — nem operadores do Supabase conseguem ler.</small></div></div>
              <div className="vault-card__status">
                {(vault.hasTextKey || vault.hasVisionKey) ? (
                  vault.unlocked
                    ? <span className="connection-badge connection-badge--synced"><Check size={12} /> Desbloqueado para esta sessão</span>
                    : <span className="connection-badge"><LockKeyhole size={12} /> Bloqueado — digite a passphrase</span>
                ) : <span className="connection-badge">Nenhuma chave própria salva ainda</span>}
              </div>
              {!vault.unlocked ? (
                <div className="secret-input"><KeyRound size={16} /><input value={vaultPass} onChange={(event) => setVaultPass(event.target.value)} type="password" autoComplete="off" placeholder="Passphrase do cofre" /><button type="button" className="button button--primary" onClick={async () => { const result = await unlockVault(vaultPass); if (!result.ok) notify(result.error, 'error'); else notify('Cofre desbloqueado.') }}>Desbloquear</button></div>
              ) : (
                <button type="button" className="button button--ghost" onClick={() => { lockVault(); setVaultPass(''); notify('Cofre bloqueado.') }}><LockKeyhole size={14} /> Bloquear cofre</button>
              )}
            </div>
            <form className="provider-form" onSubmit={saveAi}>
              <div className="form-section-title"><div><Bot size={16} /><span><strong>Modelo de texto</strong><small>Usado para conversa, extração e síntese</small></span></div><span className="connection-badge connection-badge--synced"><Check size={12} /> Ativo</span></div>
              <div className="field-grid field-grid--two">
                <label>Provedor<select value={provider} onChange={(event) => { const nextProvider = event.target.value; setProvider(nextProvider); setEndpointUrl(nextProvider === 'zai' ? 'https://api.z.ai/api/paas/v4/chat/completions' : ''); setModel(nextProvider === 'zai' ? 'glm-5.2' : nextProvider === 'openrouter' ? 'openrouter/free' : ''); setHasSavedKey(nextProvider === savedProvider && savedProviderHasKey) }}><option value="openrouter">OpenRouter · pool padrão do Maestro</option><option value="zai">Z.AI · GLM-5.2</option><option value="openai-compatible">Endpoint compatível com OpenAI</option></select></label>
                <label>Modelo<input value={model} onChange={(event) => setModel(event.target.value)} placeholder="openrouter/free · glm-5.2 · gpt-4o-mini..." /></label>
              </div>
              {provider !== 'openrouter' && <label>Endpoint compatível com OpenAI<input value={endpointUrl} onChange={(event) => setEndpointUrl(event.target.value)} placeholder={provider === 'zai' ? 'https://api.z.ai/api/paas/v4/chat/completions' : 'https://api.openai.com/v1/chat/completions'} /></label>}
              <label>
                Chave de API
                <span>{provider === 'openrouter' ? 'opcional; sem chave usa o pool seguro do Maestro' : hasSavedKey ? 'deixe vazio para manter a chave criptografada atual' : 'obrigatória para este provedor'}</span>
                <div className="secret-input"><KeyRound size={16} /><input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type={showKey ? 'text' : 'password'} autoComplete="off" placeholder={hasSavedKey ? 'Chave já armazenada — preencha para substituir' : 'Cole sua chave pessoal'} /><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? 'Ocultar chave' : 'Mostrar chave'}>{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
              </label>
              <div className="security-note"><ShieldCheck size={15} /><p><strong>A chave padrão do Maestro nunca é visível.</strong>Sua chave pessoal, quando informada, é criptografada no servidor e nunca retorna ao navegador.</p></div>
              {hasSavedKey && <button type="button" className="button button--ghost button--full" onClick={revertToDefaultKey} disabled={saving}><RotateCcw size={14} /> Reverter para a chave padrão do sistema</button>}
              <div className="form-section-title"><div><Eye size={16} /><span><strong>Modelo de visão</strong><small>Análise de imagens dos boards (use sua própria chave pra escapar do limite free)</small></span></div>{hasSavedVisionKey && <span className="connection-badge connection-badge--synced"><Check size={12} /> Chave própria</span>}</div>
              <div className="field-grid field-grid--two">
                <label>Provedor de visão<select value={visionProvider} onChange={(event) => { const next = event.target.value; setVisionProvider(next); setVisionEndpointUrl(next === 'zai' ? 'https://api.z.ai/api/paas/v4/chat/completions' : ''); setVisionModel(next === 'zai' ? 'glm-4v' : '') }}><option value="openrouter">OpenRouter · pool padrão (free)</option><option value="zai">Z.AI · GLM-V</option><option value="openai-compatible">Endpoint compatível com OpenAI</option></select></label>
                <label>Modelo de visão<input value={visionModel} onChange={(event) => setVisionModel(event.target.value)} placeholder="google/gemini-2.0-flash-001 · gpt-4o · glm-4v..." /></label>
              </div>
              {visionProvider !== 'openrouter' && <label>Endpoint de visão (compatível com OpenAI)<input value={visionEndpointUrl} onChange={(event) => setVisionEndpointUrl(event.target.value)} placeholder={visionProvider === 'zai' ? 'https://api.z.ai/api/paas/v4/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'} /></label>}
              <label>
                Chave de visão
                <span>{visionProvider === 'openrouter' ? 'opcional; sem chave usa o pool do Maestro (sujeito ao limite free)' : hasSavedVisionKey ? 'deixe vazio para manter a chave criptografada atual' : 'obrigatória para este provedor de visão'}</span>
                <div className="secret-input"><KeyRound size={16} /><input value={visionApiKey} onChange={(event) => setVisionApiKey(event.target.value)} type={showVisionKey ? 'text' : 'password'} autoComplete="off" placeholder={hasSavedVisionKey ? 'Chave já armazenada — preencha para substituir' : 'Cole sua chave de visão'} /><button type="button" onClick={() => setShowVisionKey((value) => !value)} aria-label={showVisionKey ? 'Ocultar chave' : 'Mostrar chave'}>{showVisionKey ? <EyeOff size={15} /> : <Eye size={15} />}</button></div>
              </label>
              <label>Contexto geral da IA<span>instruções que guiam tom e estilo em todas as requisições</span><textarea value={systemContext} onChange={(event) => setSystemContext(event.target.value)} rows="3" placeholder="Ex.: mantenha um tom sóbrio e cinematográfico; evite clichês; priorize a coerência do universo..." /></label>
              <fieldset className="power-picker"><legend>Profundidade da resposta</legend>{[
                { id: 'low', title: 'Rápida', copy: 'Direta e econômica', bullets: '6 evidências · 1 passe' },
                { id: 'medium', title: 'Equilibrada', copy: 'Recomendada para o dia a dia', bullets: '12 evidências · verificação' },
                { id: 'max', title: 'Profunda', copy: 'Contexto e rigor máximos', bullets: '24 evidências · 3 passes' },
              ].map((item) => <label key={item.id} className={power === item.id ? 'active' : ''}><input type="radio" name="power" value={item.id} checked={power === item.id} onChange={() => setPower(item.id)} /><span><strong>{item.title}{item.id === 'medium' && <b>Recomendado</b>}</strong><small>{item.copy}</small><em>{item.bullets}</em></span></label>)}</fieldset>
              <div className="settings-actions"><span>{isDemo ? 'O modo de demonstração não armazena segredos.' : 'As alterações passam a valer nas próximas mensagens.'}</span><button className="button button--primary" type="submit" disabled={saving}><Save size={15} /> {saving ? 'Salvando...' : 'Salvar configuração'}</button></div>
            </form>
          </section>
        )}

        {tab === 'profile' && (
          <section className="settings-section settings-v2-section">
            <header><div><span className="eyebrow">Sua identidade</span><h2>Perfil e workspace</h2><p>Informações visíveis para os colaboradores dos seus projetos.</p></div></header>
            <div className="profile-card"><span>{user?.initials}</span><div><strong>{user?.name}</strong><p>{user?.email}</p></div><button className="button button--subtle" type="button" disabled title="Edição de perfil ficará disponível na beta comercial">Edição na beta</button></div>
            <div className="form-card"><label>Nome do workspace<input defaultValue={`Workspace de ${user?.name || 'Maestro'}`} disabled /></label><label>Idioma<select defaultValue="pt-BR" disabled><option value="pt-BR">Português (Brasil)</option><option value="en">English</option></select></label><button className="button button--primary" type="button" disabled>Salvar alterações</button></div>
            {isDemo && <div className="danger-card"><div><strong>Restaurar workspace de demonstração</strong><p>Retorna entidades, conversas e revisões ao estado inicial.</p></div><button className="button button--subtle" type="button" onClick={resetDemo}><RotateCcw size={14} /> Restaurar</button></div>}
          </section>
        )}

        {tab === 'security' && (
          <section className="settings-section settings-v2-section">
            <header><div><span className="eyebrow">Proteção do universo</span><h2>Segurança e privacidade</h2><p>Como seu conteúdo, suas fontes e suas credenciais são protegidos.</p></div></header>
            {[
              { icon: KeyRound, title: 'Credenciais criptografadas', copy: 'Tokens OAuth e chaves pessoais são cifrados no servidor.' },
              { icon: ShieldCheck, title: 'Isolamento por workspace', copy: 'Políticas de acesso impedem leitura entre contas e projetos.' },
              { icon: SlidersHorizontal, title: 'Controle sobre o cânone', copy: 'Propostas criativas permanecem separadas dos fatos do universo.' },
            ].map(({ icon: Icon, title, copy }) => <article className="security-row" key={title}><span><Icon size={18} /></span><div><strong>{title}</strong><p>{copy}</p></div><Check size={16} /></article>)}
          </section>
        )}
      </div>

      <IntegrationDialog integration={selectedIntegration} miroCount={miroSources.length} onClose={closeIntegration} onOpenMiro={openMiro} />
    </div>
  )
}
