import { useEffect, useState } from 'react'
import { Check, ExternalLink, Image, RefreshCw, ScanSearch, TriangleAlert } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { maestroApi } from '../services/maestroApi'

function loadSdk() {
  if (window.miro) return Promise.resolve(window.miro)
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-maestro-miro-sdk]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.miro), { once: true })
      existing.addEventListener('error', reject, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://miro.com/app/static/sdk/v2/miro.js'
    script.async = true
    script.dataset.maestroMiroSdk = 'true'
    script.onload = () => resolve(window.miro)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export function MiroCapturePage() {
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('projectId')
  const sourceId = searchParams.get('sourceId')
  const [sdkReady, setSdkReady] = useState(false)
  const [status, setStatus] = useState('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    loadSdk().then((sdk) => {
      if (!sdk) throw new Error('SDK indisponível')
      setSdkReady(true)
    }).catch(() => setError('Abra esta tela como aplicativo dentro de um board do Miro.'))
  }, [])

  const capture = async () => {
    if (!window.miro || !projectId || !sourceId) return
    setStatus('running')
    setError('')
    try {
      const boardItems = await window.miro.board.get()
      setProgress({ current: 0, total: boardItems.length })
      const captured = []
      for (let index = 0; index < boardItems.length; index += 1) {
        const item = boardItems[index]
        let filename = null
        if (item.type === 'image' && typeof item.getFile === 'function') {
          try {
            const file = await item.getFile('original')
            filename = file?.name || null
          } catch {
            filename = null
          }
        }
        captured.push({ id: item.id, type: item.type, parentId: item.parentId || null, title: item.title || null, filename, x: item.x, y: item.y, width: item.width, height: item.height, rotation: item.rotation, relativeTo: item.relativeTo || null })
        if (captured.length === 200 || index === boardItems.length - 1) {
          await maestroApi.saveMiroSdkCapture(projectId, sourceId, captured.splice(0))
          setProgress({ current: index + 1, total: boardItems.length })
        }
      }
      setStatus('complete')
    } catch (captureError) {
      setError(captureError.message || 'Não foi possível capturar os itens deste board.')
      setStatus('error')
    }
  }

  const missingContext = !projectId || !sourceId

  return (
    <div className="page miro-capture-page">
      <section className="page-heading"><span className="eyebrow">Complemento Web SDK</span><h1>Captura de precisão do Miro</h1><p>Recupere geometria e nomes de arquivo que a API REST pode não fornecer para imagens coladas ou itens parcialmente suportados.</p></section>
      <section className="capture-card">
        <span className="capture-card__icon"><ScanSearch size={25} /></span>
        <div><h2>{status === 'complete' ? 'Captura concluída' : 'Completar metadados do board'}</h2><p>Esta operação lê posição, tamanho, rotação, agrupamento e o melhor nome disponível. Nenhum item do board é modificado.</p></div>
        {status === 'complete' ? <span className="connection-badge connection-badge--synced"><Check size={13} /> {progress.current} itens enviados</span> : <button className="button button--primary" type="button" onClick={capture} disabled={!sdkReady || missingContext || status === 'running'}>{status === 'running' ? <><RefreshCw size={15} /> {progress.current} de {progress.total}</> : <><Image size={15} /> Capturar board</>}</button>}
      </section>
      {(error || missingContext) && <div className="capture-warning"><TriangleAlert size={17} /><div><strong>{missingContext ? 'Vínculo da fonte ausente' : 'Web SDK indisponível'}</strong><p>{missingContext ? 'Abra este complemento pelo botão da fonte dentro do Maestro para informar projeto e sourceId.' : error}</p></div></div>}
      <section className="capture-steps"><h2>Por que esta etapa existe?</h2><div><article><b>01</b><strong>REST primeiro</strong><p>A importação normal cobre textos, frames, imagens e a maior parte da geometria.</p></article><article><b>02</b><strong>SDK complementa</strong><p>Itens criados pela interface podem omitir dimensões na API. O SDK lê o que está renderizado.</p></article><article><b>03</b><strong>IA relaciona</strong><p>Os novos dados entram na próxima segmentação espacial, sempre como evidência rastreável.</p></article></div><a href="https://developers.miro.com/docs/websdk-reference-image" target="_blank" rel="noreferrer">Documentação oficial do Miro <ExternalLink size={13} /></a></section>
    </div>
  )
}
