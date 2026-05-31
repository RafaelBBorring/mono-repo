import { useState } from 'react'
import { Cpu } from 'lucide-react'
import clsx from 'clsx'

const AGENTS = [
  { key: 'BoardAgent', label: 'Prancha', icon: '🏄' },
  { key: 'ClothingAgent', label: 'Roupa', icon: '👕' },
  { key: 'PoseAgent', label: 'Postura', icon: '🤸' },
  { key: 'FaceAgent', label: 'Rosto', icon: '👤' },
]

export default function AgentReportPanel({ report }) {
  const [open, setOpen] = useState(false)
  if (!report) return null

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-xs font-medium text-slate-400 hover:text-white transition-colors"
      >
        <Cpu size={14} />
        <span>Relatório dos Agentes de IA</span>
        <span className={clsx('ml-auto transition-transform', open && 'rotate-180')}>▾</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {AGENTS.map(({ key, label, icon }) => {
            const a = report[key]
            if (!a) return null
            const pct = Math.round((a.confidence ?? 0) * 100)
            const statusColor = a.status === 'ok'
              ? 'text-emerald-400' : a.status === 'weak'
              ? 'text-amber-400' : 'text-slate-500'
            return (
              <div key={key} className="bg-slate-800/60 rounded-lg px-3 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <span className="text-xs font-semibold text-slate-200">{label}</span>
                    <span className={clsx('text-[10px] font-mono px-1.5 py-0.5 rounded', statusColor, 'bg-slate-900/60')}>
                      {a.status === 'ok' ? 'OK' : a.status === 'weak' ? 'FRACO' : 'SEM SINAL'}
                    </span>
                  </div>
                  <span className={clsx('text-xs font-mono', pct >= 55 ? 'text-emerald-400' : pct >= 20 ? 'text-amber-400' : 'text-rose-400')}>
                    {pct}%
                  </span>
                </div>
                <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={clsx('h-full rounded-full transition-all', pct >= 55 ? 'bg-emerald-500' : pct >= 20 ? 'bg-amber-500' : 'bg-rose-500')}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mb-0.5">{a.method}</div>
                <div className="text-[11px] text-slate-300 leading-relaxed">{a.detail}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
