import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Database,
  FileText,
  LayoutGrid,
  Link2,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { useMaestro } from '../contexts/MaestroContext'
import { readMeta, writeMeta } from '../services/localVault/db'

const providers = [
  {
    id: 'miro',
    name: 'Miro',
    icon: LayoutGrid,
    accent: '#5651d7',
    available: true,
    short: 'Boards visuais',
    long: 'Cada board vira uma fonte. A IA mapeia frames, lê textos e imagens e mantém a posição original de cada item.',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    icon: FileText,
    accent: '#a88b54',
    available: true,
    short: 'Vaults em Markdown',
    long: 'Selecione arquivos .md do seu vault. Tudo é processado no navegador, sem enviar para servidores externos.',
  },
  {
    id: 'notion',
    name: 'Notion',
    icon: Database,
    accent: '#9aa0a6',
    available: false,
    short: 'Em breve',
    long: 'Databases e páginas sincronizadas por integração oficial.',
  },
]

function providerMatches(source, providerId) {
  if (providerId === 'obsidian') return source.provider === 'upload' || source.provider === 'paste'
  return source.provider === providerId
}

export function ConnectionsPage() {
  const { sources, syncJob, connectMiro, listMiroBoards, importMiroBoards, addManualSource, notify } = useMaestro()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [openProvider, setOpenProvider] = useState(null)
  const [miroBoards, setMiroBoards] = useState([])
  const [loadingBoards, setLoadingBoards] = useState(false)
  const [selectedBoards, setSelectedBoards] = useState(new Set())
  const [runningPipeline, setRunningPipeline] = useState(false)
  const [storageMode, setStorageMode] = useState(null)
  const [pendingProvider, setPendingProvider] = useState(null)
  const isOnboarding = searchParams.get('onboarding') === '1'
  const hasSources = (sources?.length || 0) > 0

  useEffect(() => { readMeta('storageMode').then((mode) => setStorageMode(mode || null)) }, [])

  useEffect(() => {
    if (!isOnboarding && !hasSources) {
      setSearchParams({ onboarding: '1' }, { replace: true })
    }
  }, [isOnboarding, hasSources, setSearchParams])

  const openModal = (provider) => {
    if (!provider.available) {
      notify(`${provider.name} estará disponível em breve.`, 'neutral')
      return
    }
    if (!storageMode) {
      setPendingProvider(provider)
      return
    }
    reallyOpenModal(provider)
  }

  const reallyOpenModal = (provider) => {
    setOpenProvider(provider)
    setSelectedBoards(new Set())
    if (provider.id === 'miro') {
      setLoadingBoards(true)
      setMiroBoards([])
      Promise.resolve(listMiroBoards())
        .then((result) => setMiroBoards(result?.boards || []))
        .catch(() => setMiroBoards([]))
        .finally(() => setLoadingBoards(false))
    }
  }

  const chooseStorage = async (mode) => {
    await writeMeta('storageMode', mode)
    setStorageMode(mode)
    const next = pendingProvider
    setPendingProvider(null)
    if (next) reallyOpenModal(next)
  }

  const toggleBoard = (id) => {
    setSelectedBoards((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirmMiro = async () => {
    if (selectedBoards.size === 0 && miroBoards.length === 0) {
      const fakeName = `Board Miro ${sources.length + 1}`
      await connectMiro({ name: fakeName, boardUrl: '' })
      setOpenProvider(null)
      setRunningPipeline(true)
      return
    }
    const picks = miroBoards.filter((board) => selectedBoards.has(board.id))
    if (picks.length) await importMiroBoards(picks)
    else await connectMiro({ name: `Board Miro ${sources.length + 1}` })
    setOpenProvider(null)
    setRunningPipeline(true)
  }

  const confirmObsidian = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const files = formData.getAll('files')
    if (!files?.length) {
      notify('Selecione arquivos Markdown ou a pasta do vault.', 'error')
      return
    }
    for (const file of files.slice(0, 8)) {
      await addManualSource({ kind: 'upload', title: file.name, content: '' })
    }
    setOpenProvider(null)
    setRunningPipeline(true)
  }

  if (runningPipeline) {
    return (
      <PipelineLoader
        progress={syncJob?.progress || 0}
        stage={syncJob?.stage}
        status={syncJob?.status}
        coverage={syncJob?.coverage}
        regions={syncJob?.regions}
        onComplete={() => navigate('/app/yggdrasil')}
        onSkip={() => navigate('/app/overview')}
      />
    )
  }

  return (
    <div className="page page--connections">
      <header className="page-heading page-heading--actions">
        <div>
          <span className="eyebrow"><Link2 size={13} /> Fontes do projeto</span>
          <h1>Conecte seu universo</h1>
          <p>Escolha uma fonte, deixe a IA ler e veja tudo aparecer no Yggdrasil.</p>
        </div>
        {hasSources && (
          <button className="button button--ghost" type="button" onClick={() => navigate('/app/sources')}>
            Gerenciar fontes <ChevronRight size={14} />
          </button>
        )}
      </header>

      <ol className="connection-steps" aria-label="Como funciona">
        <li>
          <span className="connection-steps__num"><Link2 size={14} /></span>
          <div>
            <strong>Escolha a fonte</strong>
            <small>Miro ou Obsidian</small>
          </div>
        </li>
        <li aria-hidden="true" className="connection-steps__divider" />
        <li>
          <span className="connection-steps__num"><Sparkles size={14} /></span>
          <div>
            <strong>A IA lê</strong>
            <small>Textos, imagens e relações</small>
          </div>
        </li>
        <li aria-hidden="true" className="connection-steps__divider" />
        <li>
          <span className="connection-steps__num"><BookOpen size={14} /></span>
          <div>
            <strong>Vai pro Yggdrasil</strong>
            <small>Para você explorar</small>
          </div>
        </li>
      </ol>

      {hasSources && (
        <section className="add-source-banner" role="note">
          <Plus size={15} />
          <span>Cada card abaixo adiciona uma fonte nova. Suas <strong>{sources.length} fonte{sources.length === 1 ? '' : 's'}</strong> atuais não serão substituídas.</span>
        </section>
      )}

      <section className="providers-grid providers-grid--compact">
        {providers.map((provider) => {
          const Icon = provider.icon
          const connected = sources?.some((source) => providerMatches(source, provider.id))
          const count = sources?.filter((source) => providerMatches(source, provider.id)).length || 0
          const statusLabel = !provider.available
            ? provider.short
            : connected
              ? `${count} conectada${count === 1 ? '' : 's'}`
              : 'Disponível'
          return (
            <article
              key={provider.id}
              className={`provider-card provider-card--compact ${connected ? 'provider-card--connected' : ''} ${!provider.available ? 'provider-card--disabled' : ''}`}
              style={{ '--provider-accent': provider.accent }}
            >
              <header>
                <span className="provider-card__logo"><Icon size={20} /></span>
                <div>
                  <h2>{provider.name}</h2>
                  <small>{statusLabel}</small>
                </div>
                {connected && <span className="provider-card__pulse"><Check size={12} /> Conectado</span>}
              </header>
              <button
                className="button button--ghost button--full"
                type="button"
                disabled={!provider.available}
                onClick={() => openModal(provider)}
              >
                {connected ? <>Adicionar outra fonte</> : <>Conectar <ArrowRight size={15} /></>}
              </button>
            </article>
          )
        })}
      </section>

      {isOnboarding && !hasSources && (
        <p className="connections-tip">
          <Sparkles size={13} /> Sem pressa: comece com <strong>Miro</strong> e adicione outras fontes quando quiser.
        </p>
      )}

      {openProvider && openProvider.id === 'miro' && (
        <div className="modal-backdrop" onClick={() => setOpenProvider(null)}>
          <div className="modal modal--large" role="dialog" aria-modal="true" aria-labelledby="miro-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div>
                <span className="eyebrow"><LayoutGrid size={13} /> Miro</span>
                <h2 id="miro-modal-title">Escolher boards</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setOpenProvider(null)}>×</button>
            </div>
            <div className="modal__body">
              <p className="boards-help">Cada board vira uma fonte separada. Você pode selecionar vários.</p>

              {loadingBoards ? (
                <div className="boards-loading"><RefreshCw size={20} /> Buscando seus boards...</div>
              ) : miroBoards.length === 0 ? (
                <div className="boards-empty">
                  <LayoutGrid size={26} />
                  <p>Nenhum board acessível nesta conta. No plano <strong>Free</strong>, simulamos um board fictício para você ver a leitura em ação.</p>
                  <button className="button button--primary" type="button" onClick={confirmMiro}>
                    Simular leitura <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <>
                  <ul className="boards-list">
                    {miroBoards.map((board) => (
                      <li key={board.id}>
                        <label>
                          <input type="checkbox" checked={selectedBoards.has(board.id)} onChange={() => toggleBoard(board.id)} />
                          <span>
                            <strong>{board.name}</strong>
                            <small>{board.itemCount || 0} itens · atualizado {board.updatedAt || 'recentemente'}</small>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className="modal-actions">
                    <span>{selectedBoards.size} selecionado{selectedBoards.size === 1 ? '' : 's'}</span>
                    <button className="button button--primary" type="button" disabled={selectedBoards.size === 0} onClick={confirmMiro}>
                      Iniciar leitura <ArrowRight size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {openProvider && openProvider.id === 'obsidian' && (
        <div className="modal-backdrop" onClick={() => setOpenProvider(null)}>
          <div className="modal modal--large" role="dialog" aria-modal="true" aria-labelledby="obsidian-modal-title" onClick={(event) => event.stopPropagation()}>
            <form className="modal__body" onSubmit={confirmObsidian}>
              <div className="modal__header">
                <div>
                  <span className="eyebrow"><FileText size={13} /> Obsidian / Markdown</span>
                  <h2 id="obsidian-modal-title">Carregar vault</h2>
                </div>
                <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setOpenProvider(null)}>×</button>
              </div>
              <p className="boards-help">Escolha arquivos <code>.md</code> do seu vault. Processados no navegador.</p>
              <label className="file-drop">
                <input type="file" accept=".md,.markdown,text/markdown" multiple name="files" />
                <FileText size={22} />
                <span>Arraste arquivos .md ou clique para escolher</span>
                <small>Vários arquivos de uma vez.</small>
              </label>
              <div className="modal-actions">
                <span>Suas fontes vão direto para a leitura.</span>
                <button className="button button--primary" type="submit">
                  Enviar para a IA <ArrowRight size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingProvider && !storageMode && (
        <div className="modal-backdrop" onClick={() => setPendingProvider(null)}>
          <div className="modal modal--large storage-choice" role="dialog" aria-modal="true" aria-labelledby="storage-choice-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div>
                <span className="eyebrow"><Database size={13} /> Como o Maestro vai guardar seu universo</span>
                <h2 id="storage-choice-title">Arquivo local ou consulta ao vivo?</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setPendingProvider(null)}>×</button>
            </div>
            <div className="modal__body">
              <p className="boards-help">Você pode mudar isso depois. As duas opções conectam a fonte do mesmo jeito — o que muda é onde a interpretação da IA fica guardada.</p>
              <div className="storage-options">
                <button className="storage-option" type="button" onClick={() => chooseStorage('local')}>
                  <span className="storage-option__icon"><Database size={18} /></span>
                  <div>
                    <strong>Criar arquivo local (.maestro)</strong>
                    <small>A IA interpreta as fontes e guarda o universo num arquivo no seu navegador. Você pode exportar o <code>.maestro</code>, jogar no Drive e abrir em outra máquina. Ideal pra memória duradoura.</small>
                  </div>
                  <ArrowRight size={15} />
                </button>
                <button className="storage-option" type="button" onClick={() => chooseStorage('mcp')}>
                  <span className="storage-option__icon"><RefreshCw size={18} /></span>
                  <div>
                    <strong>Só consulta ao vivo (MCP)</strong>
                    <small>Sem arquivo local: a IA consulta a fonte (ex.: Miro) na hora a cada pergunta. Mais leve, mas sem memória interpretada e sujeito ao limite de consultas da fonte.</small>
                  </div>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PipelineLoader({ progress, stage, status, coverage, regions = 0, onComplete, onSkip }) {
  const safeProgress = Math.max(0, Math.min(100, progress))
  const display = useMemo(() => Math.round(safeProgress), [safeProgress])
  const isDone = display === 100 || status === 'complete'

  const analyzedChunks = Number(coverage?.analyzedChunks || 0)
  const totalChunks = Number(coverage?.totalChunks || 0)
  const failedChunks = Number(coverage?.failedChunks || 0)
  const skippedChunks = Number(coverage?.skippedChunks || 0)
  const hasChunks = totalChunks > 0
  const hasFailures = failedChunks > 0
  const hasSkipped = skippedChunks > 0

  useEffect(() => {
    if (isDone) {
      const id = window.setTimeout(() => onComplete(), 1100)
      return () => window.clearTimeout(id)
    }
    return undefined
  }, [isDone, onComplete])

  return (
    <div className="pipeline-loader" role="status" aria-live="polite">
      <div className="pipeline-loader__backdrop" />
      <div className="pipeline-loader__core">
        <div className="pipeline-orb" data-status={isDone ? 'done' : 'running'}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="pipeline-orb__track" />
            <circle cx="60" cy="60" r="52" className="pipeline-orb__value" style={{ strokeDashoffset: 326 - (326 * display) / 100 }} />
          </svg>
          <div className="pipeline-orb__content">
            <strong>{display}<small>%</small></strong>
            <span>{isDone ? 'Pronto' : 'Lendo'}</span>
          </div>
        </div>
        <div className="pipeline-loader__copy">
          <span className="eyebrow"><Sparkles size={13} /> Orquestração em andamento</span>
          <h2>{isDone ? 'Leitura concluída' : stage || 'Lendo seu material'}</h2>

          {hasChunks ? (
            <p className="pipeline-chunks">
              <strong>{analyzedChunks.toLocaleString('pt-BR')}</strong> de <strong>{totalChunks.toLocaleString('pt-BR')}</strong> lotes analisados
              {regions > 0 && <> · {regions.toLocaleString('pt-BR')} regiões mapeadas</>}
            </p>
          ) : (
            <p>
              {isDone
                ? 'A Yggdrasil está pronta para exploração.'
                : 'A IA está lendo, classificando e revisando seu material para que nada se perca.'}
            </p>
          )}

          {hasFailures && (
            <div className="pipeline-failures" role="alert">
              <AlertTriangle size={16} />
              <div>
                <strong>{failedChunks.toLocaleString('pt-BR')} lote{failedChunks === 1 ? '' : 's'} com falha até agora</strong>
                <span>A leitura continua. Ao terminar, você pode reprocessar os lotes com falha pela fonte.</span>
              </div>
            </div>
          )}

          {isDone && (hasSkipped || hasFailures) && (
            <div className="pipeline-summary">
              {coverage?.imageItems != null && (
                <span><strong>{Number(coverage.imageItems).toLocaleString('pt-BR')}</strong> imagens</span>
              )}
              {coverage?.textItems != null && (
                <span><strong>{Number(coverage.textItems).toLocaleString('pt-BR')}</strong> textos</span>
              )}
              {hasSkipped && (
                <span><strong>{skippedChunks.toLocaleString('pt-BR')}</strong> lote{skippedChunks === 1 ? '' : 's'} pulado{skippedChunks === 1 ? '' : 's'}</span>
              )}
            </div>
          )}

          {!isDone && (
            <button className="text-button" type="button" onClick={onSkip}>
              Continuar em segundo plano <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
