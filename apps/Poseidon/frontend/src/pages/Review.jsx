import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { reviewAPI } from '../api/client'
import {
  Eye, ChevronLeft, ChevronRight, CheckCircle,
  XCircle, SkipForward, RefreshCw, Loader2
} from 'lucide-react'
import clsx from 'clsx'
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'

// ── Confidence Gauge ──────────────────────────────────────────────────────────
function Gauge({ label, value }) {
  const pct = Math.round((value ?? 0) * 100)
  const color = pct >= 85 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#F43F5E'
  const data  = [{ value: pct, fill: color }]

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <RadialBarChart
          width={80} height={80}
          cx={40} cy={40}
          innerRadius={26} outerRadius={36}
          data={data}
          startAngle={90} endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#1E293B' }} />
        </RadialBarChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 mt-1">{label}</span>
    </div>
  )
}

// ── Video Player ──────────────────────────────────────────────────────────────
function VideoPlayer({ src }) {
  const ref = useRef(null)
  if (!src) return (
    <div className="w-full aspect-video bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-sm">
      No video
    </div>
  )
  return (
    <video
      ref={ref}
      src={src}
      controls
      className="w-full rounded-xl bg-black"
      style={{ maxHeight: 340 }}
    />
  )
}

// ── Evidence Images ────────────────────────────────────────────────────────────
function Evidence({ label, src }) {
  if (!src) return null
  return (
    <div className="text-center">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <img
        src={src}
        className="w-full h-24 object-cover rounded-lg bg-slate-800"
        alt={label}
        onError={e => { e.target.style.display = 'none' }}
      />
    </div>
  )
}

// ── Assign Dropdown ────────────────────────────────────────────────────────────
function AssignDropdown({ surfists, onAssign }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-sm rounded-xl transition-colors w-full"
      >
        <RefreshCw size={14} />
        <span>Reassign  <kbd className="kbd ml-1">3</kbd></span>
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-20">
          {surfists.map(s => (
            <button
              key={s.id}
              onClick={() => { onAssign(s.id); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <span className="font-mono text-xs text-slate-500">#{s.display_id}</span>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Review Page ──────────────────────────────────────────────────────────
export default function ReviewPage() {
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()

  const [page, setPage]  = useState(1)
  const [cursor, setCursor] = useState(0)
  const [showAssign, setShowAssign] = useState(false)

  const { data: queueData, isLoading } = useQuery({
    queryKey: ['review-queue', page],
    queryFn:  () => reviewAPI.queue(page, 20),
    refetchInterval: 30_000,
  })

  const items   = queueData?.items ?? []
  const current = items[cursor]

  const { data: detail } = useQuery({
    queryKey: ['video-detail', current?.id],
    queryFn:  () => reviewAPI.videoDetail(current.id),
    enabled:  !!current,
  })

  const invalidate = () => {
    qc.invalidateQueries(['review-queue'])
    qc.invalidateQueries(['review-progress'])
  }

  const doAction = useCallback(async (action, payload) => {
    if (!current) return
    if      (action === 'confirm') await reviewAPI.confirm(current.id)
    else if (action === 'reject')  await reviewAPI.reject(current.id)
    else if (action === 'assign')  await reviewAPI.assign(current.id, payload)
    else if (action === 'skip')    await reviewAPI.skip(current.id)
    invalidate()
    // Auto-advance
    setCursor(c => Math.min(c + 1, items.length - 1))
  }, [current, items])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
      if (e.key === '1') doAction('confirm')
      if (e.key === '2') doAction('reject')
      if (e.key === '3') setShowAssign(v => !v)
      if (e.key === 's' || e.key === 'S') doAction('skip')
      if (e.key === 'ArrowRight') setCursor(c => Math.min(c + 1, items.length - 1))
      if (e.key === 'ArrowLeft')  setCursor(c => Math.max(c - 1, 0))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [doAction, items.length])

  const progress = queueData
    ? Math.round((cursor / Math.max(queueData.total, 1)) * 100)
    : 0

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-sky-400" size={32} />
    </div>
  )

  if (!queueData?.total) return (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <CheckCircle className="text-emerald-400 mb-4" size={48} />
      <h2 className="text-xl font-bold text-white mb-2">Review queue is empty!</h2>
      <p className="text-slate-400">All videos have been reviewed or classified automatically.</p>
    </div>
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Eye className="text-sky-400" size={22} />
          <h1 className="text-xl font-bold text-white">Video Review</h1>
          <span className="text-sm text-slate-400">
            {cursor + 1} / {queueData.total}
          </span>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-40 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{progress}% done</span>
        </div>
      </div>

      {current ? (
        <div className="grid grid-cols-5 gap-6">
          {/* ── Left: Video + Evidence ──────────────────────────── */}
          <div className="col-span-3 space-y-4">
            <VideoPlayer src={current.video_url} />

            {/* AI Evidence crops */}
            {detail && (
              <div className="grid grid-cols-3 gap-3">
                <Evidence label="Face Crop"     src={detail.face_crop_url} />
                <Evidence label="Pose Skeleton" src={detail.pose_sketch_url} />
                <Evidence label="Board Crop"    src={detail.board_crop_url} />
              </div>
            )}
          </div>

          {/* ── Right: Info + Actions ──────────────────────────── */}
          <div className="col-span-2 space-y-4">
            {/* File info */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <p className="text-sm font-medium text-white truncate">{current.filename}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {current.duration ? `${current.duration.toFixed(1)}s` : ''} &nbsp;·&nbsp;
                <span className={clsx(
                  current.final_confidence >= 0.85 ? 'text-emerald-400'
                    : current.final_confidence >= 0.4 ? 'text-amber-400'
                    : 'text-rose-400'
                )}>
                  {Math.round((current.final_confidence ?? 0) * 100)}% confidence
                </span>
              </p>
              {detail?.surfist && (
                <div className="mt-2 text-xs bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-1.5 text-sky-300">
                  AI predicts: <strong>{detail.surfist.name}</strong> ({detail.surfist.folder_name})
                </div>
              )}
              {detail?.decision_reason && (
                <div className="mt-2 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-100 leading-relaxed">
                  <strong className="text-amber-300">Motivo da IA:</strong> {detail.decision_reason}
                </div>
              )}
            </div>

            {/* Agent confidence gauges */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-xs font-medium text-slate-400 mb-3">Agent Confidence</div>
              <div className="grid grid-cols-4 gap-2">
                <Gauge label="Face"  value={current.face_confidence}  />
                <Gauge label="Pose"  value={current.pose_confidence}  />
                <Gauge label="Board" value={current.board_confidence} />
                <Gauge label="Clothing" value={current.clothing_confidence} />
              </div>
            </div>

            {/* Action buttons */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="text-xs font-medium text-slate-400 mb-3">Quick Actions</div>

              <button
                onClick={() => doAction('confirm')}
                className="w-full flex items-center gap-2 justify-center py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <CheckCircle size={15} />
                Confirm Classification
                <kbd className="kbd ml-auto bg-emerald-700/50 border-emerald-500/30">1</kbd>
              </button>

              <button
                onClick={() => doAction('reject')}
                className="w-full flex items-center gap-2 justify-center py-2.5 bg-rose-600/80 hover:bg-rose-500/80 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <XCircle size={15} />
                Move to Unclassified
                <kbd className="kbd ml-auto bg-rose-700/50 border-rose-500/30">2</kbd>
              </button>

              {detail?.all_surfists && (
                <AssignDropdown
                  surfists={detail.all_surfists}
                  onAssign={id => doAction('assign', id)}
                />
              )}

              <button
                onClick={() => doAction('skip')}
                className="w-full flex items-center gap-2 justify-center py-2.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 text-sm rounded-xl transition-colors"
              >
                <SkipForward size={15} />
                Skip for later
                <kbd className="kbd ml-auto">S</kbd>
              </button>
            </div>

            {/* Navigation */}
            <div className="flex gap-2">
              <button
                onClick={() => setCursor(c => Math.max(0, c - 1))}
                disabled={cursor === 0}
                className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-slate-400 border border-slate-700 rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setCursor(c => Math.min(items.length - 1, c + 1))}
                disabled={cursor >= items.length - 1}
                className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-slate-400 border border-slate-700 rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>

            {/* Keyboard shortcuts cheat-sheet */}
            <div className="text-xs text-slate-600 space-y-0.5">
              <p><kbd className="kbd mr-1 text-[10px]">← →</kbd> Navigate videos</p>
              <p><kbd className="kbd mr-1 text-[10px]">1</kbd> Confirm &nbsp;
                 <kbd className="kbd mx-1 text-[10px]">2</kbd> Unclassify &nbsp;
                 <kbd className="kbd mx-1 text-[10px]">3</kbd> Reassign &nbsp;
                 <kbd className="kbd mx-1 text-[10px]">S</kbd> Skip
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400">
          No more videos on this page.
        </div>
      )}
    </div>
  )
}
