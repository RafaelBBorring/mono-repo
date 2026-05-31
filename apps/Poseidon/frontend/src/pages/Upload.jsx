import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { uploadFile, uploadAPI, updateVideoMedia } from '../api/client'
import { Upload, CheckCircle, XCircle, Loader2, Waves, Film } from 'lucide-react'
import clsx from 'clsx'

const STATUS_ICON = {
  pending:    <Loader2 size={14} className="text-slate-400 animate-spin" />,
  uploading:  <Loader2 size={14} className="text-sky-400 animate-spin" />,
  processing: <Loader2 size={14} className="text-amber-400 animate-spin" />,
  done:       <CheckCircle size={14} className="text-emerald-400" />,
  error:      <XCircle size={14} className="text-rose-400" />,
}

const STATUS_LABEL = {
  auto_classified: { label: 'Classificado', color: 'text-emerald-400' },
  pending_review:  { label: 'Revisar',       color: 'text-amber-400'   },
  unclassified:    { label: 'Não classificado', color: 'text-rose-400' },
}

function extractThumbnail(videoUrl) {
  return new Promise(resolve => {
    const video = document.createElement('video')
    video.src = videoUrl
    video.muted = true
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'
    const timeout = setTimeout(() => { video.src = ''; resolve(null) }, 6000)
    video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration * 0.1) }
    video.onseeked = () => {
      clearTimeout(timeout)
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = Math.max(1, Math.round(320 * (video.videoHeight / Math.max(video.videoWidth, 1))))
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      } catch { resolve(null) }
    }
    video.onerror = () => { clearTimeout(timeout); resolve(null) }
  })
}

function FileRow({ file }) {
  const pct     = file.uploadPct ?? 0
  const status  = file.status ?? 'pending'
  const label   = STATUS_LABEL[file.classStatus] ?? null

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
            {status === 'uploading'  && `${pct}%`}
            {status === 'processing' && file.message}
            {status === 'done'       && label &&
              <span className="flex items-center gap-1.5">
                {file.newSurfer && <span className="font-medium text-sky-400">Novo surfista</span>}
                <span className={clsx('font-medium', label.color)}>{!file.newSurfer && label.label}</span>
                {file.surfistName && <span className="text-slate-400">→ {file.surfistName}</span>}
              </span>
            }
            {status === 'error'      && <span className="text-rose-400">{file.error}</span>}
          </span>
        </div>

        {(status === 'uploading' || status === 'processing') && (
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-300',
                status === 'uploading'  ? 'bg-sky-500'  : 'bg-amber-500'
              )}
              style={{ width: `${file.processPct ?? pct}%` }}
            />
          </div>
        )}
        {status === 'done' && file.reason && (
          <div className="mt-1 text-xs text-slate-500 truncate">{file.reason}</div>
        )}
      </div>

      {file.confidence != null && (
        <span className={clsx(
          'text-xs font-mono shrink-0',
          file.confidence >= 0.85 ? 'text-emerald-400'
            : file.confidence >= 0.4 ? 'text-amber-400'
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
    const wsUrl = `${wsBase}/api/upload/ws/${sessionId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.type === 'progress') {
        setFiles(prev => prev.map(f =>
          f.videoId === msg.video_id
            ? { ...f, status: 'processing', message: msg.message, processPct: msg.percent }
            : f
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
          f.videoId === msg.video_id
            ? { ...f, status: 'error', error: msg.message }
            : f
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
        body: `${errors.length} de ${files.length} vídeo${files.length === 1 ? '' : 's'} tiveram erro. Confira a lista antes de reenviar.`,
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
      id:      crypto.randomUUID(),
      name:    f.name,
      size:    f.size,
      status:  'pending',
      uploadPct: 0,
      fileObj: f,
      fileUrl: URL.createObjectURL(f),
    }))
    setFiles(prev => [...prev, ...newFiles])

    for (let i = 0; i < accepted.length; i++) {
      const fileObj  = accepted[i]
      const localId  = newFiles[i].id
      const fileUrl  = newFiles[i].fileUrl

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
          f.id === localId
            ? { ...f, status: 'processing', videoId: result.video_id, processPct: 0 }
            : f
        ))

        const thumbPromise = extractThumbnail(fileUrl)

        if (import.meta.env.VITE_USE_MOCK === 'true') {
          for (let pct = 15; pct <= 90; pct += 25) {
            await new Promise(r => setTimeout(r, 350))
            setFiles(prev => prev.map(f =>
              f.id === localId ? { ...f, processPct: pct } : f
            ))
          }
          await new Promise(r => setTimeout(r, 400))

          const thumbUrl = await thumbPromise
          updateVideoMedia(result.video_id, fileUrl, thumbUrl)

          setFiles(prev => prev.map(f =>
            f.id === localId
              ? {
                  ...f,
                  status: 'done',
                  classStatus: result.classStatus,
                  confidence: result.confidence,
                  reason: result.reason,
                  surfistName: result.surfistName,
                  newSurfer: result.newSurfer,
                  thumbnailUrl: thumbUrl,
                }
              : f
          ))
        }
      } catch (err) {
        setFiles(prev => prev.map(f =>
          f.id === localId
            ? { ...f, status: 'error', error: err.message }
            : f
        ))
      }
    }
  }, [sessionId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'] },
    disabled: !sessionId,
  })

  const done       = files.filter(f => f.status === 'done').length
  const inProgress = files.filter(f => ['uploading','processing'].includes(f.status)).length
  const errors     = files.filter(f => f.status === 'error').length

  return (
    <div className="p-8 max-w-3xl mx-auto relative">
      <div className="flex items-center gap-3 mb-8">
        <Waves className="text-sky-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Videos</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Solte os vídeos da sessão — a IA identifica e classifica cada surfista automaticamente
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
          {inProgress > 0 && <span className="text-amber-400">{inProgress} processando</span>}
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
