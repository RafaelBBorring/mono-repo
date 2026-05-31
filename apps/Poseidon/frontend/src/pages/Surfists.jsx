import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { surfistsAPI } from '../api/client'
import { Users, Plus, Upload, Trash2, CheckCircle, Loader2, X, Camera, Video } from 'lucide-react'
import clsx from 'clsx'

const COLORS = [
  '#0EA5E9','#10B981','#F59E0B','#F43F5E','#8B5CF6',
  '#EC4899','#14B8A6','#F97316','#6366F1','#84CC16',
]

// ── Create Surfist Modal ──────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }) {
  const [name, setName]   = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setLoading(true)
    await onCreate(name.trim(), color)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">Add Surfer</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18}/></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5">Name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="e.g. João Silva"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={clsx('w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                    color === c ? 'border-white scale-110' : 'border-transparent')}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || loading}
            className="flex-1 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin"/> : null}
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Surfist Card ──────────────────────────────────────────────────────────────
function SurfistCard({ surfist, onRefresh }) {
  const imgRef   = useRef()
  const vidRef   = useRef()
  const qc       = useQueryClient()

  const [imgLoading, setImgLoading] = useState(false)
  const [vidLoading, setVidLoading] = useState(false)
  const [clearLoading, setClearLoading] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const showFeedback = (msg, ok = true) => {
    setFeedback({ msg, ok })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImgLoading(true)
    try {
      const result = await surfistsAPI.registerImage(surfist.id, file)
      const updated = Object.entries(result.updated || {}).filter(([,v]) => v).map(([k]) => k)
      showFeedback(updated.length ? `Registered: ${updated.join(', ')}` : 'No signal extracted')
      qc.invalidateQueries(['surfists'])
    } catch {
      showFeedback('Upload failed', false)
    } finally {
      setImgLoading(false)
      e.target.value = ''
    }
  }

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setVidLoading(true)
    try {
      const result = await surfistsAPI.registerVideo(surfist.id, file)
      const updated = Object.entries(result.updated || {}).filter(([,v]) => v).map(([k]) => k)
      showFeedback(updated.length ? `Registered: ${updated.join(', ')}` : 'No signal extracted')
      qc.invalidateQueries(['surfists'])
    } catch {
      showFeedback('Upload failed', false)
    } finally {
      setVidLoading(false)
      e.target.value = ''
    }
  }

  const handleClear = async () => {
    if (!confirm(`Clear all embeddings for ${surfist.name}?`)) return
    setClearLoading(true)
    await surfistsAPI.clearEmbeddings(surfist.id)
    setClearLoading(false)
    qc.invalidateQueries(['surfists'])
  }

  const counts = surfist.embedding_counts ?? {}
  const hasAnyEmb = Object.values(counts).some(v => v > 0)

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      {/* Color bar */}
      <div className="h-1.5" style={{ background: surfist.color_hex }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white">{surfist.name}</span>
              <span className="text-xs text-slate-500 font-mono">#{surfist.display_id}</span>
            </div>
            <span className="text-xs text-slate-400">{surfist.folder_name}</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">{surfist.video_count}</div>
            <div className="text-xs text-slate-500">videos</div>
          </div>
        </div>

        {/* Embedding status */}
        <div className="grid grid-cols-4 gap-1.5 mb-4">
          {[
            { key: 'face',  label: 'Face'  },
            { key: 'pose',  label: 'Pose'  },
            { key: 'style', label: 'Style' },
            { key: 'board', label: 'Board' },
          ].map(({ key, label }) => {
            const n = counts[key] ?? 0
            return (
              <div key={key} className={clsx(
                'text-center py-1.5 rounded-lg text-xs',
                n > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'
              )}>
                {n > 0 ? <CheckCircle size={10} className="mx-auto mb-0.5"/> : null}
                <div className="font-medium">{label}</div>
                <div className="text-[10px] opacity-70">{n} ref{n !== 1 ? 's' : ''}</div>
              </div>
            )
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={clsx(
            'text-xs px-3 py-2 rounded-lg mb-3',
            feedback.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
          )}>
            {feedback.msg}
          </div>
        )}

        {/* Register buttons */}
        <div className="flex gap-2">
          {/* Image reference */}
          <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <button
            onClick={() => imgRef.current?.click()}
            disabled={imgLoading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {imgLoading ? <Loader2 size={12} className="animate-spin"/> : <Camera size={12}/>}
            Add Photo
          </button>

          {/* Video reference */}
          <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
          <button
            onClick={() => vidRef.current?.click()}
            disabled={vidLoading}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {vidLoading ? <Loader2 size={12} className="animate-spin"/> : <Video size={12}/>}
            Add Video
          </button>

          {hasAnyEmb && (
            <button
              onClick={handleClear}
              disabled={clearLoading}
              className="px-2.5 py-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 rounded-lg transition-colors disabled:opacity-50"
              title="Clear all embeddings"
            >
              {clearLoading ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>}
            </button>
          )}
        </div>

        {!hasAnyEmb && (
          <p className="text-xs text-slate-600 text-center mt-3">
            Add reference photos or videos to enable AI recognition
          </p>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SurfistsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const qc = useQueryClient()

  const { data: surfists = [], isLoading } = useQuery({
    queryKey: ['surfists'],
    queryFn:  surfistsAPI.list,
  })

  const createMutation = useMutation({
    mutationFn: ({ name, color }) => surfistsAPI.create(name, color),
    onSuccess: () => qc.invalidateQueries(['surfists']),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-sky-400" size={32} />
    </div>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="text-sky-400" size={24} />
          <h1 className="text-2xl font-bold text-white">Surfers</h1>
          <span className="text-sm text-slate-400">{surfists.length} registered</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          <Plus size={16} /> Add Surfer
        </button>
      </div>

      {surfists.length === 0 ? (
        <div className="text-center py-24 text-slate-500">
          <Users size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">No surfers registered yet</p>
          <p className="text-sm mt-1">Add surfers and upload reference photos/videos to enable AI recognition.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-5 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Add first surfer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {surfists.map(s => (
            <SurfistCard key={s.id} surfist={s} onRefresh={() => qc.invalidateQueries(['surfists'])} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={(name, color) => createMutation.mutateAsync({ name, color })}
        />
      )}
    </div>
  )
}
