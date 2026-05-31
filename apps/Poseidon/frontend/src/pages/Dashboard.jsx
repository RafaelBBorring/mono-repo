import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { reviewAPI } from '../api/client'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, CheckCircle, AlertTriangle,
  GitMerge, ChevronRight, Loader2, X
} from 'lucide-react'
import clsx from 'clsx'

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfBadge({ value }) {
  const pct = Math.round((value ?? 0) * 100)
  return (
    <span className={clsx(
      'text-xs font-mono px-1.5 py-0.5 rounded',
      pct >= 85 ? 'bg-emerald-500/15 text-emerald-400'
        : pct >= 40 ? 'bg-amber-500/15 text-amber-400'
        : 'bg-rose-500/15 text-rose-400'
    )}>
      {pct}%
    </span>
  )
}

// ── Folder Card ───────────────────────────────────────────────────────────────
function FolderCard({ folder, onVerify, onMerge }) {
  const preview = folder.reference_image || folder.sample_thumbs?.[0]

  return (
    <Link
      to={`/folder/surfist/${folder.surfist_id}`}
      className="group relative aspect-square overflow-hidden rounded-lg border border-slate-800 bg-slate-900 hover:border-sky-500/70 transition-colors"
    >
      {preview ? (
        <img
          src={preview}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          alt=""
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs">sem preview</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/25 to-transparent" />
      <div className="absolute left-3 right-3 bottom-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: folder.color_hex }} />
              <span className="font-semibold text-white text-sm truncate">{folder.name}</span>
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              {folder.total_videos} vídeos · {folder.folder_name}
            </div>
          </div>
          <ConfBadge value={folder.avg_confidence} />
        </div>
        {folder.pending_review > 0 && (
          <div className="mt-2 inline-flex rounded bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-200">
            {folder.pending_review} em review
          </div>
        )}
      </div>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.preventDefault(); onVerify(folder.surfist_id) }}
          className="rounded bg-slate-950/80 p-1.5 text-emerald-300 hover:text-emerald-200"
          title="Verificar pasta"
        >
          <CheckCircle size={14} />
        </button>
        <button
          onClick={e => { e.preventDefault(); onMerge(folder) }}
          className="rounded bg-slate-950/80 p-1.5 text-slate-300 hover:text-white"
          title="Mesclar pasta"
        >
          <GitMerge size={14} />
        </button>
      </div>
    </Link>
  )
}

// ── Merge Modal ───────────────────────────────────────────────────────────────
function MergeModal({ source, folders, onClose, onMerge }) {
  const [targetId, setTarget] = useState('')
  const others = folders.filter(f => f.surfist_id !== source.surfist_id)

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Merge Folder</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Move all videos from <strong className="text-white">{source.name}</strong> into:
        </p>
        <div className="space-y-2 max-h-52 overflow-y-auto mb-5">
          {others.map(f => (
            <label key={f.surfist_id}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors',
                targetId === f.surfist_id
                  ? 'border-sky-500 bg-sky-500/10'
                  : 'border-slate-800 hover:border-slate-600'
              )}
            >
              <input
                type="radio"
                name="merge-target"
                value={f.surfist_id}
                checked={targetId === f.surfist_id}
                onChange={() => setTarget(f.surfist_id)}
                className="accent-sky-500"
              />
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: f.color_hex }} />
              <span className="text-sm text-white">{f.name}</span>
              <span className="ml-auto text-xs text-slate-400">{f.total_videos} videos</span>
            </label>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800">
            Cancel
          </button>
          <button
            disabled={!targetId}
            onClick={() => onMerge(source.surfist_id, targetId)}
            className="flex-1 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg transition-colors">
            Merge
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
function UploadToast({ summary, onClose }) {
  if (!summary) return null
  const hasWarnings = (summary.unclassified ?? 0) > 0 || (summary.pending_review ?? 0) > 0
  return (
    <div className={clsx(
      'fixed right-5 bottom-5 z-50 max-w-sm rounded-lg border p-4 shadow-2xl',
      hasWarnings
        ? 'border-amber-500/30 bg-amber-950 text-amber-50'
        : 'border-emerald-500/30 bg-emerald-950 text-emerald-50'
    )}>
      <button onClick={onClose} className="absolute right-2 top-2 text-white/60 hover:text-white">
        <X size={14} />
      </button>
      <div className="pr-5 text-sm font-semibold">
        {hasWarnings ? 'Upload concluído com atenção' : 'Todos os vídeos subiram corretamente'}
      </div>
      <div className="mt-1 text-xs leading-relaxed text-white/75">
        Sessão atual: {summary.total} vídeo{summary.total === 1 ? '' : 's'} ·
        {' '}{summary.auto_classified ?? 0} classificados ·
        {' '}{summary.pending_review ?? 0} revisar ·
        {' '}{summary.unclassified ?? 0} não classificados
        {summary.newSurfers > 0 && (
          <> · <span className="text-sky-300">{summary.newSurfers} novo{summary.newSurfers > 1 ? 's' : ''} surfista{summary.newSurfers > 1 ? 's' : ''} detectado{summary.newSurfers > 1 ? 's' : ''}</span></>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [mergeSource, setMergeSource] = useState(null)
  const [toast, setToast] = useState(location.state?.uploadSummary ?? null)

  useEffect(() => {
    if (location.state?.uploadSummary) {
      navigate('/dashboard', { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const { data, isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn:  reviewAPI.folders,
    refetchInterval: 20_000,
  })

  const { data: simData } = useQuery({
    queryKey: ['similarity'],
    queryFn:  reviewAPI.similarity,
  })

  const verifyMutation = useMutation({
    mutationFn: reviewAPI.verifyFolder,
    onSuccess:  () => queryClient.invalidateQueries(['folders']),
  })

  const mergeMutation = useMutation({
    mutationFn: ({ source, target }) => reviewAPI.mergeFolders(source, target),
    onSuccess: () => {
      queryClient.invalidateQueries(['folders'])
      setMergeSource(null)
    },
  })

  const folders = data?.surfist_folders ?? []
  const reviewCount  = data?.human_review_queue ?? 0
  const unclassCount = data?.unclassified ?? 0

  // Similarity warnings: pairs > 0.75 similarity
  const similarityWarnings = []
  if (simData?.matrix) {
    const { matrix, names } = simData
    const ids = Object.keys(matrix)
    ids.forEach((a, i) => {
      ids.slice(i + 1).forEach(b => {
        const sim = matrix[a]?.[b] ?? 0
        if (sim > 0.75) {
          similarityWarnings.push({ a, b, sim, nameA: names[a], nameB: names[b] })
        }
      })
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-sky-400" size={32} />
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <LayoutGrid className="text-sky-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
      </div>

      {/* Queue stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Surfer Folders" value={folders.length} color="text-sky-400" />
        <StatCard label="Human Review" value={reviewCount}
          color="text-amber-400"
          action={reviewCount > 0 && <Link to="/review" className="text-xs text-amber-400 hover:underline flex items-center gap-0.5">Review <ChevronRight size={12}/></Link>}
        />
        <StatCard label="Unclassified" value={unclassCount} color="text-rose-400"
          action={unclassCount > 0 && <Link to="/folder/unclassified" className="text-xs text-rose-400 hover:underline flex items-center gap-0.5">Abrir <ChevronRight size={12}/></Link>}
        />
        <StatCard
          label="Total Verified"
          value={folders.reduce((s, f) => s + f.verified_count, 0)}
          color="text-emerald-400"
        />
      </div>

      {/* Similarity warnings */}
      {similarityWarnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm mb-2">
            <AlertTriangle size={15} /> Possible misclassification — high similarity between folders
          </div>
          <div className="flex flex-wrap gap-2">
            {similarityWarnings.map(w => (
              <span key={`${w.a}-${w.b}`} className="text-xs bg-amber-500/15 text-amber-300 px-2.5 py-1 rounded-full">
                {w.nameA} ↔ {w.nameB} ({Math.round(w.sim * 100)}%)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Folder grid */}
      {folders.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          No surfers registered yet. Go to{' '}
          <Link to="/surfists" className="text-sky-400 hover:underline">Surfers</Link>{' '}
          to add your team.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {folders.map(f => (
            <FolderCard
              key={f.surfist_id}
              folder={f}
              onVerify={id => verifyMutation.mutate(id)}
              onMerge={folder => setMergeSource(folder)}
            />
          ))}
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <Link
          to="/folder/unclassified"
          className="w-full max-w-xl rounded-lg border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-center text-sm font-bold tracking-wide text-rose-200 hover:bg-rose-500/15"
        >
          NÃO CLASSIFICADO · {unclassCount} vídeo{unclassCount === 1 ? '' : 's'}
        </Link>
      </div>

      <UploadToast summary={toast} onClose={() => setToast(null)} />

      {mergeSource && (
        <MergeModal
          source={mergeSource}
          folders={folders}
          onClose={() => setMergeSource(null)}
          onMerge={(src, tgt) => mergeMutation.mutate({ source: src, target: tgt })}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, color, action }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-start justify-between">
        <span className="text-xs text-slate-500">{label}</span>
        {action}
      </div>
      <div className={clsx('text-3xl font-bold mt-1', color)}>{value}</div>
    </div>
  )
}
