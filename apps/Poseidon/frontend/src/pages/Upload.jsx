import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { uploadFile, uploadAPI } from '../api/client'
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
  auto_classified: { label: 'Auto-classified', color: 'text-emerald-400' },
  pending_review:  { label: 'Needs review',    color: 'text-amber-400'   },
  unclassified:    { label: 'Unclassified',    color: 'text-rose-400'    },
}

function FileRow({ file }) {
  const pct     = file.uploadPct ?? 0
  const status  = file.status ?? 'pending'
  const label   = STATUS_LABEL[file.classStatus] ?? null

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-800 last:border-0">
      <Film size={14} className="text-slate-500 shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm text-slate-300 truncate">{file.name}</span>
          <span className="flex items-center gap-1 shrink-0 text-xs text-slate-400">
            {STATUS_ICON[status]}
            {status === 'uploading'  && `${pct}%`}
            {status === 'processing' && file.message}
            {status === 'done'       && label &&
              <span className={clsx('font-medium', label.color)}>{label.label}</span>
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
        {status === 'done' && file.reason && file.classStatus !== 'auto_classified' && (
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

  // Create session on mount
  useEffect(() => {
    uploadAPI.createSession().then(({ session_id }) => setSession(session_id))
    return () => wsRef.current?.close()
  }, [])

  // Open WebSocket once session exists
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
    }))
    setFiles(prev => [...prev, ...newFiles])

    // Upload each file sequentially (avoids saturating bandwidth)
    for (let i = 0; i < accepted.length; i++) {
      const fileObj  = accepted[i]
      const localId  = newFiles[i].id

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

        if (import.meta.env.VITE_USE_MOCK === 'true') {
          for (let pct = 15; pct <= 90; pct += 25) {
            await new Promise(r => setTimeout(r, 350))
            setFiles(prev => prev.map(f =>
              f.id === localId ? { ...f, processPct: pct } : f
            ))
          }
          await new Promise(r => setTimeout(r, 400))
          setFiles(prev => prev.map(f =>
            f.id === localId
              ? { ...f, status: 'done', classStatus: result.classStatus, confidence: result.confidence, reason: result.reason }
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
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Waves className="text-sky-400" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Videos</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Drag surf footage here — AI classifies each surfer automatically
          </p>
        </div>
      </div>

      {/* Drop zone */}
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
          {isDragActive ? 'Drop videos here…' : 'Drop videos, or click to browse'}
        </p>
        <p className="text-slate-500 text-sm mt-1.5">
          MP4 · MOV · AVI · MKV · WebM &nbsp;·&nbsp; up to 1 GB each
        </p>
      </div>

      {/* Stats bar */}
      {files.length > 0 && (
        <div className="flex gap-6 mt-6 mb-4 text-sm">
          <span className="text-slate-400">Sessão atual: {files.length} vídeo{files.length !== 1 ? 's' : ''}</span>
          {inProgress > 0 && <span className="text-amber-400">{inProgress} processing</span>}
          {done > 0       && <span className="text-emerald-400">{done} complete</span>}
          {errors > 0     && <span className="text-rose-400">{errors} error</span>}
        </div>
      )}

      {/* File list */}
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
