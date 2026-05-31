import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { uploadFile, uploadAPI, updateVideoMedia, applyClustering } from '../api/client'
import { analyzeVideo } from '../analysis/surfAnalyzer'
import { Upload, CheckCircle, XCircle, Loader2, Waves, Film, Sparkles } from 'lucide-react'
import clsx from 'clsx'

const STATUS_ICON = {
  pending:    <Loader2 size={14} className="text-slate-400 animate-spin" />,
  uploading:  <Loader2 size={14} className="text-sky-400 animate-spin" />,
  analyzing:  <Loader2 size={14} className="text-violet-400 animate-spin" />,
  clustering: <Sparkles size={14} className="text-sky-400 animate-pulse" />,
  done:       <CheckCircle size={14} className="text-emerald-400" />,
  error:      <XCircle size={14} className="text-rose-400" />,
}

const STATUS_LABEL = {
  auto_classified: { label: 'Classificado', color: 'text-emerald-400' },
  pending_review:  { label: 'Revisar',       color: 'text-amber-400' },
  unclassified:    { label: 'Não classificado', color: 'text-rose-400' },
}

function FileRow({ file }) {
  const status = file.status ?? 'pending'
  const label  = STATUS_LABEL[file.classStatus] ?? null

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-0">
      {file.thumbnailUrl ? (
        <img src={file.thumbnailUrl} alt="" className="w-10 h-7 rounded object-cover shrink-0 bg-slate-800" />
      ) : (
        <Film size={14} className="text-slate-500 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm text-slate-300 truncate">{file.name}</span>
          <span className="flex items-center gap-1.5 shrink-0 text-xs text-slate-400">
            {STATUS_ICON[status]}
            {status === 'uploading'  && `${file.uploadPct ?? 0}%`}
            {status === 'analyzing'  && <span className="text-violet-300">{file.message || 'Analisando...'}</span>}
            {status === 'clustering' && <span className="text-sky-300">Agrupando surfistas...</span>}
            {status === 'done' && label &&
              <span className="flex items-center gap-1.5">
                {file.newSurfer && <span className="font-medium text-sky-400">Novo surfista</span>}
                <span className={clsx('font-medium', label.color)}>{!file.newSurfer && label.label}</span>
                {file.surfistName && <span className="text-slate-400">→ {file.surfistName}</span>}
              </span>
            }
            {status === 'error' && <span className="text-rose-400">{file.error}</span>}
          </span>
        </div>
        {status === 'done' && file.reason && (
          <div className="mt-1 text-xs text-slate-500 truncate">{file.reason}</div>
        )}
      </div>
      {file.confidence != null && status === 'done' && (
        <span className={clsx(
          'text-xs font-mono shrink-0',
          file.confidence >= 0.70 ? 'text-emerald-400'
            : file.confidence >= 0.50 ? 'text-amber-400'
            : 'text-rose-400'
        )}>
          {(file.confidence * 100).toFixed(0)}%
        </span>
      )}
    </div>
  )
}

export default function UploadPage() {
  const [files, setFiles]       = useState([])
  const [sessionId, setSession] = useState(null)
  const [toast, setToast] = useState(null)
  const wsRef = useRef(null)
  const completionHandledRef = useRef(false)
  const navigate = useNavigate()

  useEffect(() => {
    uploadAPI.createSession().then(({ session_id }) => setSession(session_id))
    return () => wsRef.current?.close()
  }, [])

  useEffect(() => {
    if (!sessionId) return
    const wsBase = import.meta.env.VITE_USE_MOCK === 'true' ? null : `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
    if (!wsBase) return
    const ws = new WebSocket(`${wsBase}/api/upload/ws/${sessionId}`)
    wsRef.current = ws
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'progress') {
        setFiles(prev => prev.map(f =>
          f.videoId === msg.video_id ? { ...f, status: 'analyzing', message: msg.message } : f
        ))
      }
      if (msg.type === 'done') {
        setFiles(prev => prev.map(f =>
          f.videoId === msg.video_id
            ? { ...f, status: 'done', classStatus: msg.status, confidence: msg.confidence, reason: msg.reason }
            : f
        ))
      }
      if (msg.type === 'error') {
        setFiles(prev => prev.map(f =>
          f.videoId === msg.video_id ? { ...f, status: 'error', error: msg.message } : f
        ))
      }
    }
  }, [sessionId])

  useEffect(() => {
    if (!files.length || completionHandledRef.current) return
    const terminal = files.every(f => ['done', 'error'].includes(f.status))
    if (!terminal) return

    completionHandledRef.current = true
    const errors = files.filter(f => f.status === 'error')
    if (errors.length > 0) {
      setToast({
        type: 'error',
        title: 'Alguns uploads falharam',
        body: `${errors.length} de ${files.length} vídeo${files.length === 1 ? '' : 's'} tiveram erro.`,
      })
      return
    }

    const summary = files.reduce((acc, file) => {
      acc.total += 1
      acc[file.classStatus] = (acc[file.classStatus] ?? 0) + 1
      if (file.newSurfer) acc.newSurfers = (acc.newSurfers ?? 0) + 1
      return acc
    }, { total: 0 })

    navigate('/dashboard', { state: { uploadSummary: summary } })
  }, [files, navigate])

  const onDrop = useCallback(async (accepted) => {
    if (!sessionId) return
    completionHandledRef.current = false
    setToast(null)

    const newFiles = accepted.map(f => ({
      id: crypto.randomUUID(),
      name: f.name,
      size: f.size,
      status: 'pending',
      uploadPct: 0,
      fileObj: f,
      fileUrl: URL.createObjectURL(f),
    }))
    setFiles(prev => [...prev, ...newFiles])

    const videoData = []

    // Phase 1: Upload + Analyze each video
    for (let i = 0; i < accepted.length; i++) {
      const fileObj = accepted[i]
      const localId = newFiles[i].id
      const fileUrl = newFiles[i].fileUrl

      setFiles(prev => prev.map(f =>
        f.id === localId ? { ...f, status: 'uploading' } : f
      ))

      try {
        const result = await uploadFile(sessionId, fileObj, pct => {
          setFiles(prev => prev.map(f =>
            f.id === localId ? { ...f, uploadPct: pct } : f
          ))
        })

        setFiles(prev => prev.map(f =>
          f.id === localId ? { ...f, status: 'analyzing', videoId: result.video_id, message: 'Extraindo frames...' } : f
        ))

        const { fingerprint, thumbnail } = await analyzeVideo(fileUrl, msg => {
          setFiles(prev => prev.map(f =>
            f.id === localId ? { ...f, message: msg } : f
          ))
        })

        updateVideoMedia(result.video_id, fileUrl, thumbnail)

        videoData.push({
          videoId: result.video_id,
          fingerprint,
          localId,
        })

        setFiles(prev => prev.map(f =>
          f.id === localId
            ? { ...f, status: 'analyzing', message: 'Aguardando classificação...', thumbnailUrl: thumbnail }
            : f
        ))
      } catch (err) {
        setFiles(prev => prev.map(f =>
          f.id === localId ? { ...f, status: 'error', error: err.message } : f
        ))
      }
    }

    // Phase 2: Classify — confidence-based assignment per video
    const validData = videoData.filter(d => d.fingerprint)
    if (validData.length > 0) {
      setFiles(prev => prev.map(f =>
        f.status === 'analyzing' ? { ...f, status: 'clustering' } : f
      ))

      await new Promise(r => setTimeout(r, 400))

      const fps = validData.map(d => d.fingerprint)
      const dummyAssignments = new Map(fps.map((_, i) => [i, 0]))
      const results = applyClustering(dummyAssignments, fps, validData.map(d => d.videoId))

      for (const r of results) {
        const match = validData.find(d => d.videoId === r.video_id)
        if (!match) continue
        setFiles(prev => prev.map(f =>
          f.id === match.localId
            ? {
                ...f,
                status: 'done',
                classStatus: r.classStatus,
                confidence: r.confidence,
                reason: r.reason,
                surfistName: r.surfistName,
                newSurfer: r.newSurfer,
              }
            : f
        ))
      }
    } else {
      applyClustering(new Map(), [], [])
    }

    setFiles(prev => prev.map(f =>
      f.status === 'analyzing' || f.status === 'clustering'
        ? {
            ...f,
            status: 'done',
            classStatus: 'unclassified',
            confidence: 0.2,
            reason: 'Não foi possível analisar este vídeo.',
            surfistName: null,
            newSurfer: false,
          }
        : f
    ))
  }, [sessionId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'] },
    disabled: !sessionId,
  })

  const done       = files.filter(f => f.status === 'done').length
  const inProgress = files.filter(f => ['uploading', 'analyzing', 'clustering'].includes(f.status)).length
  const errors     = files.filter(f => f.status === 'error').length

  return (
    <div className="p-8 max-w-3xl mx-auto relative">
      <div className="flex items-center gap-3 mb-8">
        <Waves className="text-sky-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Videos</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Solte os vídeos da sessão — a IA analisa cores, prancha e estilo para identificar cada surfista
          </p>
        </div>
      </div>

      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'drop-active'
            : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/30'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto mb-4 text-slate-500" size={36} />
        <p className="text-slate-300 font-medium">
          {isDragActive ? 'Solte os vídeos aqui…' : 'Solte os vídeos, ou clique para selecionar'}
        </p>
        <p className="text-slate-500 text-sm mt-1.5">
          MP4 · MOV · AVI · MKV · WebM &nbsp;·&nbsp; até 1 GB cada
        </p>
      </div>

      {files.length > 0 && (
        <div className="flex gap-6 mt-6 mb-4 text-sm">
          <span className="text-slate-400">Sessão: {files.length} vídeo{files.length !== 1 ? 's' : ''}</span>
          {inProgress > 0 && <span className="text-violet-400">{inProgress} processando</span>}
          {done > 0       && <span className="text-emerald-400">{done} completo{done !== 1 ? 's' : ''}</span>}
          {errors > 0     && <span className="text-rose-400">{errors} erro{errors !== 1 ? 's' : ''}</span>}
        </div>
      )}

      {files.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 px-4 mt-2">
          {files.map(f => <FileRow key={f.id} file={f} />)}
        </div>
      )}

      {toast && (
        <div className="fixed right-5 bottom-5 z-50 max-w-sm rounded-lg border border-rose-500/30 bg-rose-950 p-4 text-rose-50 shadow-2xl">
          <button onClick={() => setToast(null)} className="absolute right-2 top-2 text-white/60 hover:text-white">×</button>
          <div className="pr-5 text-sm font-semibold">{toast.title}</div>
          <div className="mt-1 text-xs leading-relaxed text-white/75">{toast.body}</div>
        </div>
      )}
    </div>
  )
}
