import { useMemo } from 'react'
import clsx from 'clsx'
import { Activity, Loader2, CheckCircle, XCircle, Eye, Brain, Layers } from 'lucide-react'

const AGENT_CONFIG = {
  FaceAgent: {
    label: 'FaceAgent',
    icon: '\u{1F464}',
    color: 'sky',
    desc: 'InsightFace ArcFace 512d',
    border: 'border-sky-500/30',
    bg: 'bg-sky-500/5',
    text: 'text-sky-400',
    bar: 'bg-sky-500',
    dot: 'bg-sky-400',
  },
  PoseAgent: {
    label: 'PoseAgent',
    icon: '\u{1F938}',
    color: 'violet',
    desc: 'MediaPipe 33-keypoint',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/5',
    text: 'text-violet-400',
    bar: 'bg-violet-500',
    dot: 'bg-violet-400',
  },
  BoardAgent: {
    label: 'BoardAgent',
    icon: '\u{1F3C4}',
    color: 'amber',
    desc: 'YOLOv8 + SIFT/ORB',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    text: 'text-amber-400',
    bar: 'bg-amber-500',
    dot: 'bg-amber-400',
  },
  ClothingAgent: {
    label: 'ClothingAgent',
    icon: '\u{1F455}',
    color: 'emerald',
    desc: 'RGB+HSV hist + LBP',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-400',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-400',
  },
}

const PHASE_LABELS = {
  initializing: 'Inicializando modelo...',
  extracting: 'Extraindo features...',
  extracted: 'Features extra\u00eddas',
  matching: 'Comparando perfis...',
  done: 'Conclu\u00eddo',
}

const PHASE_ORDER = ['initializing', 'extracting', 'extracted', 'matching', 'done']

function phaseProgress(phase) {
  const idx = PHASE_ORDER.indexOf(phase)
  return idx >= 0 ? ((idx + 1) / PHASE_ORDER.length) * 100 : 0
}

function SimBar({ name, value, threshold, isBest }) {
  const pct = Math.round(value * 100)
  const aboveThreshold = value >= threshold
  return (
    <div className={clsx('flex items-center gap-2 text-[10px] py-0.5', isBest && 'font-bold')}>
      <span className={clsx('w-16 truncate', isBest ? 'text-white' : 'text-slate-500')} title={name}>
        {name}
      </span>
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', aboveThreshold ? 'bg-emerald-500' : 'bg-slate-600')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={clsx('w-10 text-right font-mono', aboveThreshold ? 'text-emerald-400' : 'text-slate-600')}>
        {pct}%
      </span>
      {isBest && <span className="text-emerald-400">\u2605</span>}
    </div>
  )
}

function AgentCard({ agentName, state }) {
  const cfg = AGENT_CONFIG[agentName]
  if (!cfg) return null

  const phase = state?.phase || null
  const result = state?.result || null
  const sims = state?.all_similarities || {}
  const threshold = state?.threshold || 0.60
  const matchDetail = state?.match_detail || ''
  const signal = state?.signal || null
  const isWorking = phase && phase !== 'done'
  const isDone = phase === 'done'
  const hasError = result?.error

  const simEntries = Object.entries(sims).sort((a, b) => b[1].best_sim - a[1].best_sim)
  const bestSimId = simEntries.length > 0 ? simEntries[0][0] : null

  return (
    <div className={clsx(
      'rounded-xl border p-3 transition-all duration-300',
      cfg.border, cfg.bg,
      isWorking && 'ring-1 ring-white/10',
      isDone && !hasError && 'ring-1 ring-emerald-500/20',
      isDone && hasError && 'ring-1 ring-rose-500/20',
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.icon}</span>
          <div>
            <div className={clsx('text-xs font-bold', cfg.text)}>{cfg.label}</div>
            <div className="text-[9px] text-slate-600">{cfg.desc}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isWorking && (
            <div className="flex items-center gap-1">
              <Loader2 size={12} className={clsx('animate-spin', cfg.text)} />
              <span className="text-[10px] text-slate-400">{PHASE_LABELS[phase] || phase}</span>
            </div>
          )}
          {isDone && !hasError && <CheckCircle size={14} className="text-emerald-400" />}
          {isDone && hasError && <XCircle size={14} className="text-rose-400" />}
          {!phase && (
            <div className="flex items-center gap-1">
              <div className={clsx('w-1.5 h-1.5 rounded-full', cfg.dot, 'opacity-40')} />
              <span className="text-[10px] text-slate-600">Aguardando</span>
            </div>
          )}
        </div>
      </div>

      {isWorking && (
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-1.5">
          <div
            className={clsx('h-full rounded-full transition-all duration-700', cfg.bar)}
            style={{ width: `${phaseProgress(phase)}%` }}
          />
        </div>
      )}

      {phase === 'extracted' && signal && (
        <div className="mt-1 px-2 py-1 bg-slate-900/80 rounded text-[10px] text-slate-400">
          Embedding: {signal.embedding_dim}d {signal.has_signal ? '\u2713' : '\u2717'}
        </div>
      )}

      {isDone && result && (
        <>
          <div className="flex items-center justify-between mt-1 mb-1.5">
            <span className="text-[10px] text-slate-500">Confian\u00e7a</span>
            <span className={clsx(
              'text-xs font-mono font-bold',
              (result.confidence ?? 0) >= 0.55 ? 'text-emerald-400'
                : (result.confidence ?? 0) >= 0.20 ? 'text-amber-400'
                : 'text-rose-400'
            )}>
              {Math.round((result.confidence ?? 0) * 100)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-500',
                (result.confidence ?? 0) >= 0.55 ? 'bg-emerald-500'
                  : (result.confidence ?? 0) >= 0.20 ? 'bg-amber-500'
                  : 'bg-rose-500'
              )}
              style={{ width: `${Math.round((result.confidence ?? 0) * 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mb-1 truncate">{matchDetail}</div>
        </>
      )}

      {isDone && simEntries.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-slate-600">Similaridade por perfil</span>
            <span className="text-[9px] text-slate-700">limiar: {Math.round(threshold * 100)}%</span>
          </div>
          <div className="space-y-0.5 max-h-24 overflow-y-auto">
            {simEntries.map(([sid, info]) => (
              <SimBar
                key={sid}
                name={info.name || sid}
                value={info.best_sim}
                threshold={threshold}
                isBest={sid === bestSimId}
              />
            ))}
          </div>
        </div>
      )}

      {isDone && !result?.error && simEntries.length === 0 && (
        <div className="mt-2 pt-2 border-t border-slate-800/60">
          <div className="text-[10px] text-slate-600 italic">Sem perfis para comparar</div>
        </div>
      )}
    </div>
  )
}

function FusionPanel({ fusionResult, agentStates, pipelineState }) {
  if (!fusionResult && !pipelineState) return null

  const fusion = fusionResult?.fusion || null
  const agentSummary = pipelineState?.agent_summary || null

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/80 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Layers size={14} className="text-slate-400" />
        <span className="text-xs font-bold text-slate-300">Fus\u00e3o & Decis\u00e3o</span>
      </div>

      {agentSummary && (
        <div className="grid grid-cols-4 gap-2 mb-2">
          {Object.entries(agentSummary).map(([name, info]) => {
            const cfg = AGENT_CONFIG[name]
            return (
              <div key={name} className="text-center">
                <span className="text-[10px] text-slate-500">{cfg?.icon} {name.replace('Agent', '')}</span>
                <div className={clsx(
                  'text-xs font-mono font-bold',
                  (info.confidence ?? 0) >= 0.55 ? 'text-emerald-400'
                    : (info.confidence ?? 0) >= 0.20 ? 'text-amber-400'
                    : 'text-rose-400'
                )}>
                  {Math.round((info.confidence ?? 0) * 100)}%
                </div>
                {info.surfist_id && (
                  <div className="text-[9px] text-slate-600 truncate" title={info.surfist_id}>
                    \u2192 {info.surfist_id}
                  </div>
                )}
                {info.error && (
                  <div className="text-[9px] text-rose-500 truncate">{info.error}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {fusion && (
        <>
          <div className="flex items-center justify-between py-1.5 border-t border-slate-800">
            <span className="text-[10px] text-slate-500">Decis\u00e3o Final</span>
            <span className={clsx(
              'text-xs font-bold px-2 py-0.5 rounded',
              fusion.status === 'auto_classified' ? 'bg-emerald-500/15 text-emerald-400'
                : fusion.status === 'pending_review' ? 'bg-amber-500/15 text-amber-400'
                : 'bg-rose-500/15 text-rose-400'
            )}>
              {fusion.status === 'auto_classified' ? 'CLASSIFICADO'
                : fusion.status === 'pending_review' ? 'REVISAR'
                : 'NAO CLASSIFICADO'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">Confian\u00e7a</span>
            <span className="text-sm font-mono font-bold text-white">
              {Math.round((fusion.final_confidence ?? 0) * 100)}%
            </span>
          </div>
          {fusion.surfist_id && (
            <div className="text-[10px] text-sky-400 mt-1">
              Surfist: {fusion.surfist_id.slice(0, 8)}...
            </div>
          )}
          {fusion.reason && (
            <div className="text-[10px] text-slate-400 mt-1 leading-relaxed">{fusion.reason}</div>
          )}
        </>
      )}
    </div>
  )
}

function PipelineTimeline({ events }) {
  if (!events.length) return null

  return (
    <div className="rounded-xl border border-slate-800/50 bg-slate-950/50 p-3 max-h-40 overflow-y-auto">
      <div className="flex items-center gap-2 mb-2">
        <Activity size={12} className="text-slate-500" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Timeline</span>
      </div>
      <div className="space-y-1">
        {events.map((ev, i) => (
          <div key={i} className="flex items-start gap-2 text-[10px]">
            <span className="text-slate-700 w-8 shrink-0 font-mono">{ev.pct ?? ''}%</span>
            <span className={clsx(
              'shrink-0',
              ev.type === 'agent_result' ? 'text-emerald-500' :
              ev.type === 'fusion_result' ? 'text-violet-400' :
              ev.type === 'pipeline_complete' ? 'text-sky-400' :
              ev.type === 'pipeline_error' ? 'text-rose-400' :
              'text-slate-500'
            )}>
              {ev.type === 'agent_status' ? '\u25CB' :
               ev.type === 'agent_result' ? '\u25CF' :
               ev.type === 'fusion_result' ? '\u25C6' :
               ev.type === 'pipeline_complete' ? '\u2605' :
               ev.type === 'pipeline_error' ? '\u2717' :
               '\u25CB'}
            </span>
            <span className="text-slate-400 leading-tight">
              {ev.agent ? (
                <span className="text-slate-300 font-medium">{ev.agent.replace('Agent', '')}</span>
              ) : null}
              {' '}{ev.detail || ev.message || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProfileSummary({ profiles }) {
  if (!profiles || !profiles.length) return null

  return (
    <div className="rounded-xl border border-slate-800/50 bg-slate-950/50 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Eye size={12} className="text-slate-500" />
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Perfis Carregados ({profiles.length})
        </span>
      </div>
      <div className="space-y-1">
        {profiles.map((p, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-300 font-medium w-24 truncate">{p.name}</span>
            <span className="text-slate-600">
              {'👤'}{p.face_refs}
              {' '}{'🤸'}{p.pose_refs}
              {' '}{'🏄'}{p.board_refs}
              {' '}{'👕'}{p.clothing_refs}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AnalysisDebugPanel({ videoId, debugEvents }) {
  const agentStates = {}
  const allAgentNames = ['FaceAgent', 'PoseAgent', 'BoardAgent', 'ClothingAgent']

  for (const name of allAgentNames) {
    agentStates[name] = null
  }

  const latestEvents = []
  let fusionResult = null
  let pipelineState = null
  let profiles = null
  let completeResult = null

  for (const ev of debugEvents) {
    if (ev.agent && allAgentNames.includes(ev.agent)) {
      if (ev.type === 'agent_status' || ev.type === 'agent_result') {
        agentStates[ev.agent] = { ...agentStates[ev.agent], ...ev }
      }
    }
    if (ev.type === 'fusion_result') {
      fusionResult = ev
    }
    if (ev.type === 'pipeline_status' && ev.phase === 'agents_starting') {
      pipelineState = ev
    }
    if (ev.type === 'pipeline_status' && ev.phase === 'profiles_loaded') {
      profiles = ev.profiles
    }
    if (ev.type === 'pipeline_complete') {
      completeResult = ev
    }
    latestEvents.push(ev)
  }

  const visibleEvents = useMemo(() => {
    const seen = new Set()
    const deduped = []
    for (const ev of [...debugEvents].reverse()) {
      const key = `${ev.type}-${ev.agent || ''}-${ev.phase || ''}`
      if (!seen.has(key)) {
        seen.add(key)
        deduped.unshift(ev)
      }
    }
    return deduped.slice(-30)
  }, [debugEvents])

  if (!debugEvents.length) return null

  return (
    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 mb-1">
        <Brain size={16} className="text-violet-400" />
        <h3 className="text-sm font-bold text-white">Debug da An\u00e1lise</h3>
        <span className="text-[10px] text-slate-600">{debugEvents.length} eventos</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {allAgentNames.map(name => (
          <AgentCard key={name} agentName={name} state={agentStates[name]} />
        ))}
      </div>

      <FusionPanel
        fusionResult={fusionResult}
        agentStates={agentStates}
        pipelineState={pipelineState}
      />

      {profiles && <ProfileSummary profiles={profiles} />}

      <PipelineTimeline events={visibleEvents} />

      {completeResult && (
        <div className={clsx(
          'rounded-xl border p-3 text-center',
          completeResult.status === 'auto_classified'
            ? 'border-emerald-500/30 bg-emerald-500/5'
            : completeResult.status === 'pending_review'
              ? 'border-amber-500/30 bg-amber-500/5'
              : 'border-rose-500/30 bg-rose-500/5'
        )}>
          <div className={clsx(
            'text-sm font-bold mb-1',
            completeResult.status === 'auto_classified' ? 'text-emerald-400'
              : completeResult.status === 'pending_review' ? 'text-amber-400'
              : 'text-rose-400'
          )}>
            {completeResult.status === 'auto_classified' ? '\u2713 Classificado'
              : completeResult.status === 'pending_review' ? '\u26A0 Revis\u00e3o necess\u00e1ria'
              : '\u2717 N\u00e3o classificado'}
          </div>
          <div className="text-xs text-slate-400">{completeResult.reason}</div>
          {completeResult.surfist_name && (
            <div className="text-xs text-sky-400 mt-1">
              Surfista: <strong>{completeResult.surfist_name}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
