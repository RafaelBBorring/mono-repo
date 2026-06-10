import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { reviewAPI, mediaUrl } from '../api/client'
import {
  ArrowLeft, AlertTriangle, FolderOpen, Loader2,
  MoveRight, Play, Trash2, X
} from 'lucide-react'
import clsx from 'clsx'
import AgentReportPanel from '../components/AgentReportPanel'

function VideoTile({ video, onOpen }) {
  return (
    <button
      onClick={() => onOpen(video)}
      className="group text-left rounded-lg overflow-hidden border border-slate-800 bg-slate-900 hover:border-sky-500/70 transition-colors"
    >
      <div className="aspect-square bg-slate-800 relative">
        {video.thumbnail_url ? (
          <img src={mediaUrl(video.thumbnail_url)} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-slate-600">
            <Play size={28} />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 rounded-full bg-sky-500 text-white p-3 transition-opacity">
            <Play size={18} />
          </span>
        </div>
      </div>
      <div className="p-3">
        <div className="text-sm font-medium text-white truncate">{video.filename}</div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {video.duration ? `${video.duration.toFixed(1)}s` : 'sem duração'}
          </span>
          <span className={clsx(
            video.status === 'pending_review' ? 'text-amber-400'
              : video.status === 'unclassified' ? 'text-rose-400'
              : 'text-emerald-400'
          )}>
            {Math.round((video.final_confidence ?? 0) * 100)}%
          </span>
        </div>
      </div>
    </button>
  )
}

function VideoModal({ video, surfists, onClose, onMove, onDelete, busy }) {
  const [target, setTarget] = useState(video.surfist_id ? `surfist:${video.surfist_id}` : 'unclassified')

  const movePayload = useMemo(() => {
    if (target.startsWith('surfist:')) {
      return { target: 'surfist', surfist_id: target.replace('surfist:', '') }
    }
    return { target }
  }, [target])

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="min-w-0">
            <div className="font-semibold text-white truncate">{video.filename}</div>
            <div className="text-xs text-slate-500">{video.status}</div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-0">
          <div className="lg:col-span-2 bg-black">
            {video.video_url ? (
              <video src={mediaUrl(video.video_url)} controls className="w-full max-h-[70vh] bg-black" />
            ) : (
              <div className="aspect-video flex items-center justify-center text-slate-500">Vídeo indisponível</div>
            )}
          </div>

          <div className="p-4 space-y-4">
            {video.decision_reason && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                <div className="flex items-center gap-2 text-amber-300 font-medium mb-1">
                  <AlertTriangle size={14} /> Saída da IA
                </div>
                <p className="text-xs leading-relaxed text-amber-100/85">{video.decision_reason}</p>
              </div>
            )}

            <AgentReportPanel report={video.agent_report} />

            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Mover para</label>
              <select
                value={target}
                onChange={e => setTarget(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="review">Review</option>
                <option value="unclassified">NÃO CLASSIFICADO</option>
                {surfists.map(s => (
                  <option key={s.id} value={`surfist:${s.id}`}>
                    {s.folder_name} · {s.name}
                  </option>
                ))}
              </select>
              <button
                disabled={busy}
                onClick={() => onMove(movePayload)}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 px-3 py-2 text-sm font-medium text-white"
              >
                <MoveRight size={15} /> Mover vídeo
              </button>
            </div>

            <button
              disabled={busy}
              onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-rose-600/85 hover:bg-rose-500 disabled:opacity-50 px-3 py-2 text-sm font-medium text-white"
            >
              <Trash2 size={15} /> Deletar vídeo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FolderPage() {
  const { folderType, folderId } = useParams()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState(null)

  const isUnclassified = folderType === 'unclassified'
  const queryKey = ['folder-videos', folderType, folderId]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => isUnclassified
      ? reviewAPI.unclassifiedVideos()
      : reviewAPI.folderVideos(folderId),
    refetchInterval: 20_000,
  })

  const moveMutation = useMutation({
    mutationFn: payload => reviewAPI.moveVideo(selected.id, payload),
    onSuccess: () => {
      setSelected(null)
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['review-progress'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => reviewAPI.deleteVideo(selected.id),
    onSuccess: () => {
      setSelected(null)
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['review-progress'] })
    },
  })

  const folder = data?.folder
  const videos = data?.videos ?? []
  const surfists = data?.all_surfists ?? []
  const busy = moveMutation.isPending || deleteMutation.isPending

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-sky-400" size={32} />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/dashboard" className="p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className={isUnclassified ? 'text-rose-400' : 'text-sky-400'} size={22} />
              <h1 className="text-xl font-bold text-white">{folder?.name ?? 'Pasta'}</h1>
            </div>
            <p className="text-sm text-slate-500">{videos.length} vídeo{videos.length === 1 ? '' : 's'}</p>
          </div>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-10 text-center text-slate-500">
          Esta pasta ainda não tem vídeos.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {videos.map(video => (
            <VideoTile key={video.id} video={video} onOpen={setSelected} />
          ))}
        </div>
      )}

      {selected && (
        <VideoModal
          video={selected}
          surfists={surfists}
          busy={busy}
          onClose={() => setSelected(null)}
          onMove={payload => moveMutation.mutate(payload)}
          onDelete={() => {
            if (confirm(`Deletar ${selected.filename}?`)) deleteMutation.mutate()
          }}
        />
      )}
    </div>
  )
}
