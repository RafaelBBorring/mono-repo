import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  Image,
  Link2,
  Link2Off,
  Plus,
  RefreshCw,
  ScanSearch,
  Upload,
} from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { ProgressRing } from '../components/ui/ProgressRing'
import { useMaestro } from '../contexts/MaestroContext'
import { useAuth } from '../contexts/AuthContext'
import { config } from '../lib/config'
import { findReferencedMiroBoard, getMiroBoardUrlState } from '../lib/integrationUrls'

const MANUAL_SOURCE_LIMIT = 400_000
const ACCEPTED_UPLOAD_TYPES = new Set(['text/plain', 'text/markdown', 'text/x-markdown'])
const PENDING_MIRO_REFERENCE_KEY = 'maestro:pending-miro-board-reference'

function savePendingMiroReference(reference) {
  try {
    window.sessionStorage.setItem(PENDING_MIRO_REFERENCE_KEY, JSON.stringify(reference))
  } catch {
    return false
  }
  return true
}

function takePendingMiroReference(projectId) {
  try {
    const raw = window.sessionStorage.getItem(PENDING_MIRO_REFERENCE_KEY)
    if (!raw) return null
    const reference = JSON.parse(raw)
    if (reference?.projectId !== projectId) return null
    window.sessionStorage.removeItem(PENDING_MIRO_REFERENCE_KEY)
    return reference
  } catch {
    clearPendingMiroReference()
    return null
  }
}

function clearPendingMiroReference() {
  try {
    window.sessionStorage.removeItem(PENDING_MIRO_REFERENCE_KEY)
  } catch {
    return
  }
}

function buildMiroCaptureUrl(projectId, sourceId) {
  const params = new URLSearchParams({ projectId, sourceId })
  const hashIndex = config.miroWebSdkUrl.indexOf('#')
  if (hashIndex >= 0) {
    const base = config.miroWebSdkUrl.slice(0, hashIndex)
    const fragment = config.miroWebSdkUrl.slice(hashIndex + 1)
    const separator = fragment.includes('?') ? '&' : '?'
    return `${base}#${fragment}${separator}${params.toString()}`
  }
  const separator = config.miroWebSdkUrl.includes('?') ? '&' : '?'
  return `${config.miroWebSdkUrl}${separator}${params.toString()}`
}

export function SourcesPage() {
  const { sources, activeProject, workspaceLoading, connectMiro, syncSource, syncJob, listMiroBoards, importMiroBoards, addManualSource, unlinkSource, resumeSource, notify } = useMaestro()
  const { isDemo } = useAuth()
  const activeProjectId = activeProject?.id
  const [searchParams, setSearchParams] = useSearchParams()
  const [connectOpen, setConnectOpen] = useState(false)
  const [name, setName] = useState('')
  const [boardUrl, setBoardUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [availableBoards, setAvailableBoards] = useState([])
  const [selectedBoardIds, setSelectedBoardIds] = useState([])
  const [boardReferenceNotice, setBoardReferenceNotice] = useState('')
  const [loadingBoards, setLoadingBoards] = useState(false)
  const [importing, setImporting] = useState(false)
  const [syncingSourceId, setSyncingSourceId] = useState(null)
  const [manualMode, setManualMode] = useState(null)
  const [manualTitle, setManualTitle] = useState('')
  const [manualContent, setManualContent] = useState('')
  const [manualFile, setManualFile] = useState(null)
  const [manualError, setManualError] = useState('')
  const [manualBusy, setManualBusy] = useState(false)
  const oauthHandled = useRef(false)
  const miroBoardUrlState = getMiroBoardUrlState(boardUrl)

  const loadBoards = useCallback(async () => {
    if (isDemo) return
    setLoadingBoards(true)
    setPickerOpen(true)
    try {
      const result = await listMiroBoards()
      const boards = result.boards || []
      setAvailableBoards(boards)
      const pendingReference = takePendingMiroReference(activeProjectId)
      if (pendingReference) {
        const referencedBoard = findReferencedMiroBoard(boards, pendingReference)
        if (referencedBoard) {
          setSelectedBoardIds([referencedBoard.id])
          setBoardReferenceNotice(`“${referencedBoard.name}” foi pré-selecionado usando a referência informada.`)
        } else {
          setBoardReferenceNotice('A referência não correspondeu a um board acessível nesta conta. Escolha o board manualmente.')
        }
      } else {
        setBoardReferenceNotice('')
      }
    } catch (error) {
      notify(error.message || 'Não foi possível listar seus boards.', 'error')
    } finally {
      setLoadingBoards(false)
    }
  }, [activeProjectId, isDemo, listMiroBoards, notify])

  useEffect(() => {
    if (searchParams.get('miro') !== 'connected' || workspaceLoading || !activeProjectId || oauthHandled.current) return
    oauthHandled.current = true
    loadBoards().finally(() => setSearchParams({}, { replace: true }))
  }, [activeProjectId, loadBoards, searchParams, setSearchParams, workspaceLoading])

  const connect = async (event) => {
    event.preventDefault()
    if (!['empty', 'valid'].includes(miroBoardUrlState.status)) return
    setBusy(true)
    const shouldRememberReference = !isDemo && Boolean(name.trim() || boardUrl.trim())
    if (shouldRememberReference) savePendingMiroReference({ projectId: activeProjectId, name: name.trim(), boardUrl: boardUrl.trim() })
    try {
      await connectMiro({ name, boardUrl })
      setConnectOpen(false)
      setName('')
      setBoardUrl('')
    } catch (error) {
      if (shouldRememberReference) clearPendingMiroReference()
      notify(error.message || 'Não foi possível iniciar a conexão com o Miro.', 'error')
    } finally {
      setBusy(false)
    }
  }

  const totalItems = sources.reduce((total, source) => total + source.itemCount, 0)
  const totalImages = sources.reduce((total, source) => total + source.imageCount, 0)
  const averageCoverage = sources.length ? Math.round(sources.reduce((total, source) => total + Number(source.progress || 0), 0) / sources.length) : 0
  const readySources = sources.filter((source) => source.status === 'synced').length
  const failedChunks = sources.reduce((total, source) => total + Number(source.coverage?.failedChunks || 0), 0)

  const importSelected = async () => {
    const selected = availableBoards.filter((board) => selectedBoardIds.includes(board.id))
    if (!selected.length) return
    setImporting(true)
    try {
      await importMiroBoards(selected)
      setPickerOpen(false)
      setSelectedBoardIds([])
    } catch (error) {
      notify(error.message || 'Não foi possível adicionar os boards selecionados.', 'error')
    } finally {
      setImporting(false)
    }
  }

  const synchronize = async (sourceId) => {
    setSyncingSourceId(sourceId)
    try {
      await syncSource(sourceId)
    } catch (error) {
      notify(error.message || 'Não foi possível iniciar a sincronização.', 'error')
    } finally {
      setSyncingSourceId(null)
    }
  }

  const startMiroConnect = async () => {
    const hasMiro = sources.some((source) => source.provider === 'miro')
    if (hasMiro) {
      loadBoards()
      return
    }
    try {
      await connectMiro({ name: '', boardUrl: '' })
    } catch (error) {
      notify(error.message || 'Não foi possível iniciar a conexão com o Miro.', 'error')
    }
  }

  const handleUnlink = async (sourceId, sourceName) => {
    if (!window.confirm(`Desvincular “${sourceName}”? O que já foi lido continua disponível; novas leituras só voltam se você restaurar o vínculo.`)) return
    try {
      await unlinkSource(sourceId)
    } catch (error) {
      notify(error.message || 'Não foi possível desvincular a fonte.', 'error')
    }
  }

  const resetManualSource = () => {
    setManualTitle('')
    setManualContent('')
    setManualFile(null)
    setManualError('')
  }

  const openManualSource = (mode) => {
    resetManualSource()
    setManualMode(mode)
  }

  const closeManualSource = () => {
    if (manualBusy) return
    setManualMode(null)
    resetManualSource()
  }

  const readManualFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setManualError('')
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['txt', 'md'].includes(extension)) {
      setManualFile(null)
      setManualContent('')
      setManualError('Envie um arquivo com extensão .txt ou .md.')
      return
    }

    try {
      const content = await file.text()
      if (!content.trim()) throw new Error('O arquivo está vazio.')
      if (content.length > MANUAL_SOURCE_LIMIT) throw new Error('O arquivo ultrapassa o limite de 400.000 caracteres.')
      const fallbackMime = extension === 'md' ? 'text/markdown' : 'text/plain'
      setManualFile({
        name: file.name,
        size: file.size,
        mimeType: ACCEPTED_UPLOAD_TYPES.has(file.type) ? file.type : fallbackMime,
      })
      setManualContent(content)
      setManualTitle((current) => current || file.name.replace(/\.(txt|md)$/i, ''))
    } catch (error) {
      setManualFile(null)
      setManualContent('')
      setManualError(error.message || 'Não foi possível ler este arquivo.')
    }
  }

  const saveManualSource = async (event) => {
    event.preventDefault()
    const title = manualTitle.trim()
    const content = manualContent.trim()
    if (!title) {
      setManualError('Dê um nome para identificar esta fonte.')
      return
    }
    if (!content) {
      setManualError(manualMode === 'upload' ? 'Selecione um arquivo TXT ou Markdown.' : 'Cole algum conteúdo antes de continuar.')
      return
    }
    if (content.length > MANUAL_SOURCE_LIMIT) {
      setManualError('O conteúdo ultrapassa o limite de 400.000 caracteres.')
      return
    }

    setManualBusy(true)
    setManualError('')
    try {
      await addManualSource({
        kind: manualMode,
        title,
        content,
        ...(manualMode === 'upload' ? { fileName: manualFile?.name, mimeType: manualFile?.mimeType || 'text/plain' } : {}),
      })
      setManualMode(null)
      resetManualSource()
    } catch (error) {
      const message = error.message || 'Não foi possível adicionar esta fonte.'
      setManualError(message)
      notify(message, 'error')
    } finally {
      setManualBusy(false)
    }
  }

  return (
    <div className="page">
      <section className="page-heading page-heading--actions">
        <div><span className="eyebrow">Memória conectada</span><h1>Fontes do projeto</h1><p>Escolha onde suas ideias vivem. O Maestro cuida de compreendê-las e manter as mudanças rastreáveis.</p></div>
        <button className="button button--primary" type="button" onClick={startMiroConnect}><Plus size={16} /> Conectar fonte</button>
      </section>

      {syncJob?.status === 'running' && (
        <section className="sync-banner">
          <div className="sync-visual"><ProgressRing value={syncJob.progress} size={58} stroke={4} /></div>
          <div>
            <span className="eyebrow"><span className="pulse-dot" /> Leitura em andamento</span>
            <h3>{syncJob.stage}</h3>
            <p>
              {syncJob.coverage?.totalChunks
                ? <>{Number(syncJob.coverage.analyzedChunks || 0).toLocaleString('pt-BR')} de {Number(syncJob.coverage.totalChunks).toLocaleString('pt-BR')} lotes analisados · {syncJob.regions} regiões mapeadas</>
                : <>{syncJob.regions} regiões mapeadas. A IA continua lendo em segundo plano.</>}
            </p>
          </div>
          <div className="sync-banner__bar"><span style={{ width: `${syncJob.progress}%` }} /></div>
          <strong>{syncJob.progress}%</strong>
        </section>
      )}
      {syncJob?.status === 'running' && Number(syncJob?.coverage?.failedChunks || 0) > 0 && (
        <section className="sync-alert">
          <AlertTriangle size={16} />
          <div>
            <strong>{Number(syncJob.coverage.failedChunks).toLocaleString('pt-BR')} lote{syncJob.coverage.failedChunks === 1 ? '' : 's'} com falha até agora</strong>
            <span>A leitura continua. Ao terminar, você poderá reprocessar os lotes com falha pela fonte.</span>
          </div>
        </section>
      )}
      {syncJob?.status === 'rate-limited' && (
        <section className="sync-alert sync-alert--rate">
          <Clock3 size={16} />
          <div>
            <strong>Limite diário gratuito da IA atingido</strong>
            <span>{syncJob.message || 'A leitura foi pausada com segurança. Reabra o projeto mais tarde (ou amanhã) e ela continua de onde parou, um board por vez.'}</span>
          </div>
        </section>
      )}

      <section className="source-summary-grid">
        <article><span><Database size={17} /></span><div><strong>{sources.length}</strong><small>Fontes conectadas</small></div></article>
        <article><span><ScanSearch size={17} /></span><div><strong>{totalItems.toLocaleString('pt-BR')}</strong><small>Itens indexados</small></div></article>
        <article><span><Image size={17} /></span><div><strong>{totalImages.toLocaleString('pt-BR')}</strong><small>Imagens analisadas</small></div></article>
        <article><span><Clock3 size={17} /></span><div><strong>Manual</strong><small>Frequência no plano Free</small></div></article>
      </section>

      <section className="source-layout">
        <div className="source-column">
          <div className="section-title-row"><h2>Conectadas</h2><span>{sources.length} fontes</span></div>
          <div className="source-cards">
            {sources.map((source) => {
              const provider = String(source.provider || 'miro').toLowerCase()
              const isMiro = provider === 'miro'
              const isUpload = provider === 'upload'
              const providerLabel = isMiro ? 'Miro' : isUpload ? 'Arquivo' : 'Texto'
              const captureUrl = !isDemo && isMiro && activeProjectId ? buildMiroCaptureUrl(activeProjectId, source.id) : null
              return (
                <article className={`source-card source-card--${provider}`} key={source.id}>
                  <div className="source-card__top">
                    <span className={`provider-mark provider-mark--large ${isMiro ? 'provider-mark--miro' : 'provider-mark--manual'}`}>
                      {isMiro ? 'M' : isUpload ? <Upload size={16} /> : <FileText size={16} />}
                    </span>
                    <div><span className="source-provider">{providerLabel} · {source.kind}</span><h3>{source.name}</h3></div>
                    <span className={`connection-badge connection-badge--${source.status}`}>{source.status === 'synced' ? <><Check size={12} /> Sincronizado</> : source.status === 'processing' ? 'Analisando' : source.status === 'attention' ? <><AlertTriangle size={12} /> Atenção</> : source.status === 'unlinked' ? <><Link2Off size={12} /> Desvinculado</> : 'Na fila'}</span>
                  </div>
                  <div className="source-card__metrics">
                    <span><strong>{Number(source.itemCount || 0).toLocaleString('pt-BR')}</strong> itens</span>
                    <span><strong>{source.documentCount || 0}</strong> textos</span>
                    <span><strong>{source.imageCount || 0}</strong> imagens</span>
                    <span><strong>{source.progress || 0}%</strong> cobertura</span>
                  </div>
                  <div className="source-card__footer">
                    <span><Clock3 size={13} /> Última leitura: {source.lastSync}</span>
                    <div>
                      {isMiro ? (
                        source.status === 'unlinked' ? (
                          <button className="button button--subtle" type="button" onClick={() => resumeSource(source.id)}><Link2 size={14} /> Restaurar vínculo</button>
                        ) : (
                          <>
                            <button className="button button--subtle" type="button" onClick={() => synchronize(source.id)} disabled={source.status === 'processing' || syncingSourceId === source.id}><RefreshCw size={14} /> {syncingSourceId === source.id ? 'Enfileirando...' : 'Sincronizar'}</button>
                            <button className="button button--subtle" type="button" onClick={() => handleUnlink(source.id, source.name)} disabled={source.status === 'processing'} title="Desvincular board (mantém o que já foi lido)"><Link2Off size={14} /> Desvincular</button>
                            {captureUrl && <a className="button button--subtle source-web-sdk" href={captureUrl} target="_blank" rel="noreferrer"><ScanSearch size={14} /> Web SDK</a>}
                            {source.sourceUrl && <a className="icon-button" href={source.sourceUrl} target="_blank" rel="noreferrer" aria-label="Abrir no Miro"><ExternalLink size={15} /></a>}
                          </>
                        )
                      ) : <span className="manual-source-ready"><Check size={13} /> Conteúdo indexado</span>}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <aside className="source-aside">
          <article className="panel coverage-panel"><span className="eyebrow">Qualidade da leitura</span><h3>Cobertura transparente</h3><p>“Concluído” não esconde falhas: o índice abaixo reflete somente os lotes realmente processados.</p><div><span>Cobertura média <b>{averageCoverage}%</b></span><div className="usage-bar"><i style={{ width: `${averageCoverage}%` }} /></div><span>Fontes concluídas <b>{readySources}/{sources.length}</b></span><div className="usage-bar"><i style={{ width: `${sources.length ? Math.round((readySources / sources.length) * 100) : 0}%` }} /></div><span>Lotes com falha <b>{failedChunks}</b></span><div className="usage-bar"><i style={{ width: `${failedChunks ? Math.min(100, failedChunks * 10) : 0}%` }} /></div></div><button className="text-button" type="button" onClick={() => failedChunks ? notify(`${failedChunks} lote${failedChunks === 1 ? '' : 's'} precisa${failedChunks === 1 ? '' : 'm'} ser reprocessado${failedChunks === 1 ? '' : 's'}.`, 'neutral') : notify('Nenhuma falha de processamento registrada.')}>Ver relatório de cobertura <ChevronRight size={14} /></button></article>
          <article className="panel source-policy"><Link2 size={17} /><h3>Como o Maestro lê o Miro</h3><ol><li><span>1</span>Mapeia frames, itens e coordenadas</li><li><span>2</span>Divide regiões por densidade</li><li><span>3</span>Analisa texto e imagens separadamente</li><li><span>4</span>Relaciona tudo preservando a fonte</li></ol></article>
        </aside>
      </section>

      <section className="future-connectors">
        <div><span className="eyebrow">Importação direta</span><h2>Traga uma referência agora, sem integração.</h2></div>
        <div className="connector-list">
          <button type="button" onClick={() => openManualSource('paste')}><b><FileText size={15} /></b>Colar texto<small>Adicionar agora</small></button>
          <button type="button" onClick={() => openManualSource('upload')}><b><Upload size={15} /></b>TXT ou MD<small>Enviar arquivo</small></button>
          <span><b>N</b>Notion<small>Em breve</small></span>
          <span><b>O</b>Obsidian<small>Em breve</small></span>
        </div>
      </section>

      <Modal open={Boolean(manualMode)} onClose={closeManualSource} title={manualMode === 'upload' ? 'Enviar documento' : 'Colar texto'} eyebrow="Fonte manual">
        <form className="connect-form manual-source-form" onSubmit={saveManualSource}>
          <div className="connect-provider">
            <span className="provider-mark provider-mark--large provider-mark--manual">{manualMode === 'upload' ? <Upload size={16} /> : <FileText size={16} />}</span>
            <div><strong>{manualMode === 'upload' ? 'Arquivo TXT ou Markdown' : 'Texto e histórico'}</strong><p>{manualMode === 'upload' ? 'O conteúdo do arquivo será indexado como uma fonte rastreável.' : 'Use para notas, resumos, sessões e conversas que estão fora do Miro.'}</p></div>
          </div>

          {manualMode === 'upload' && (
            <label className={`manual-file-picker ${manualFile ? 'manual-file-picker--ready' : ''}`}>
              <input type="file" accept=".txt,.md,text/plain,text/markdown,text/x-markdown" onChange={readManualFile} disabled={manualBusy} />
              <span>{manualFile ? <Check size={18} /> : <Upload size={18} />}</span>
              <div>
                <strong>{manualFile?.name || 'Escolher arquivo'}</strong>
                <small>{manualFile ? `${(manualFile.size / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} KB · ${manualContent.length.toLocaleString('pt-BR')} caracteres` : 'Somente .txt ou .md · até 400.000 caracteres'}</small>
              </div>
              <em>{manualFile ? 'Trocar' : 'Procurar'}</em>
            </label>
          )}

          <label>Nome da fonte<input value={manualTitle} onChange={(event) => setManualTitle(event.target.value)} maxLength={240} placeholder={manualMode === 'upload' ? 'Ex.: Notas da sessão 18' : 'Ex.: Contexto da campanha'} disabled={manualBusy} /></label>

          {manualMode === 'paste' && (
            <label>Conteúdo
              <textarea value={manualContent} onChange={(event) => { setManualContent(event.target.value); setManualError('') }} maxLength={MANUAL_SOURCE_LIMIT} placeholder="Cole aqui suas notas, um resumo ou o histórico de uma conversa..." disabled={manualBusy} />
              <span className="manual-character-count">{manualContent.length.toLocaleString('pt-BR')} / {MANUAL_SOURCE_LIMIT.toLocaleString('pt-BR')} caracteres</span>
            </label>
          )}

          {manualError && <div className="manual-source-error" role="alert"><AlertTriangle size={14} /> {manualError}</div>}
          <div className="manual-source-actions">
            <button className="button button--ghost" type="button" onClick={closeManualSource} disabled={manualBusy}>Cancelar</button>
            <button className="button button--primary" type="submit" disabled={manualBusy || !manualTitle.trim() || !manualContent.trim()}>{manualBusy ? 'Adicionando...' : <>Adicionar à memória <ArrowRight size={15} /></>}</button>
          </div>
          <small className="form-footnote">A fonte mantém sua origem identificada para que o chat possa citar o conteúdo nas respostas.</small>
        </form>
      </Modal>

      <Modal open={connectOpen} onClose={() => setConnectOpen(false)} title="Conectar ao Miro" eyebrow="Nova fonte">
        <form className="connect-form" onSubmit={connect}>
          <div className="connect-provider"><span className="provider-mark provider-mark--large provider-mark--miro">M</span><div><strong>Miro</strong><p>Autorize sua conta e selecione quantos boards seu plano permitir.</p></div></div>
          <label>Nome para identificar o board<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Linha do Tempo" /></label>
          <div className="connect-field">
            <label htmlFor="miro-board-url">Link do board <span>opcional na conexão OAuth</span></label>
            <input
              id="miro-board-url"
              value={boardUrl}
              onChange={(event) => setBoardUrl(event.target.value)}
              placeholder="https://miro.com/app/board/..."
              type="url"
              inputMode="url"
              autoComplete="url"
              spellCheck="false"
              aria-invalid={['invalid', 'incomplete'].includes(miroBoardUrlState.status) ? 'true' : undefined}
              aria-describedby="miro-board-url-feedback"
              data-validation-state={miroBoardUrlState.status}
            />
            <small id="miro-board-url-feedback" className={`miro-url-feedback miro-url-feedback--${miroBoardUrlState.status}`} aria-live="polite">
              {miroBoardUrlState.status === 'valid' ? <Check size={13} /> : miroBoardUrlState.status === 'invalid' ? <AlertTriangle size={13} /> : miroBoardUrlState.status === 'incomplete' ? <Clock3 size={13} /> : <Link2 size={13} />}
              {miroBoardUrlState.message}
            </small>
          </div>
          <div className="security-note"><Check size={15} /><p><strong>Acesso somente de leitura</strong>O Maestro nunca altera seu board sem uma ação explícita.</p></div>
          <button className="button button--primary button--full" type="submit" disabled={busy || !['empty', 'valid'].includes(miroBoardUrlState.status)}>{busy ? 'Conectando...' : <>Autorizar com o Miro <ArrowRight size={16} /></>}</button>
          <small className="form-footnote">No plano Free, a análise executa localmente. Com o backend configurado, você será direcionado ao OAuth oficial do Miro.</small>
        </form>
      </Modal>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Escolha os boards" eyebrow="Conta Miro autorizada" size="large">
        <div className="board-picker">
          <p>Selecione um ou mais boards. Cada um será inventariado em lotes e poderá ser retomado se a leitura for interrompida.</p>
          {boardReferenceNotice && <div className="board-reference-notice" role="status"><Link2 size={14} /> {boardReferenceNotice}</div>}
          {loadingBoards ? <div className="picker-loading"><RefreshCw size={18} /> Buscando boards acessíveis...</div> : availableBoards.length ? <div className="board-options">{availableBoards.map((board) => {
            const selected = selectedBoardIds.includes(board.id)
            return <button key={`${board.connectionId}-${board.id}`} className={selected ? 'selected' : ''} type="button" onClick={() => setSelectedBoardIds((current) => selected ? current.filter((id) => id !== board.id) : [...current, board.id])}><span className="provider-mark provider-mark--miro">M</span><span><strong>{board.name}</strong><small>{board.teamName || 'Equipe Miro'}{board.modifiedAt ? ` · atualizado em ${new Date(board.modifiedAt).toLocaleDateString('pt-BR')}` : ''}</small></span><i>{selected && <Check size={13} />}</i></button>
          })}</div> : <div className="empty-state"><AlertTriangle size={20} /><h3>Nenhum board disponível</h3><p>Verifique a equipe autorizada na sua conta do Miro.</p></div>}
          <div className="board-picker__actions"><button className="button button--ghost" type="button" onClick={() => setPickerOpen(false)}>Cancelar</button><button className="button button--primary" type="button" disabled={!selectedBoardIds.length || importing} onClick={importSelected}>{importing ? 'Adicionando...' : <>Analisar {selectedBoardIds.length || ''} board{selectedBoardIds.length === 1 ? '' : 's'} <ArrowRight size={15} /></>}</button></div>
        </div>
      </Modal>
    </div>
  )
}
