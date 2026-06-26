import React, { useRef, useState } from 'react'
import { healthColor } from '../../lib/calculator.js'

const W = 118, H = 132
const POLY = '59,3 115,35 115,97 59,129 3,97 3,35'

function strokeColor(pct, kind) {
  const p = Math.max(0, Math.min(1, pct))
  if (p <= 0) return 'rgba(120,40,40,0.65)'
  const base = healthColor(p, kind)
  return base.replace('hsl', 'hsla').replace(')', ',0.92)')
}

export default function HexagonResource({ kind, label, icon, value, max, editable = false, onChange, onOpenAdjust }) {
  const safeMax = Math.max(1, max || 1)
  const rawPct = value / safeMax
  const pct = Math.max(0, Math.min(1, rawPct))
  const over = value > safeMax
  const fillH = pct * H
  const surfaceY = H - fillH
  const fillColor = healthColor(pct, kind)
  const gradId = `hexg-${kind}`
  const clipId = `hexc-${kind}`
  const stroke = strokeColor(pct, kind)
  const textTone = pct <= 0 ? '#7a6a55' : '#fff8e6'
  const drag = useRef({ active: false, startY: 0, startVal: 0, moved: false, pid: null })
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState(String(value))

  const commit = (raw) => {
    const n = Math.max(0, Math.round(Number(raw)))
    if (Number.isFinite(n)) onChange?.(n)
  }

  const onWheel = (e) => {
    if (!editable || typing) return
    e.preventDefault()
    commit(value + (e.deltaY < 0 ? 1 : -1))
  }
  const onPointerDown = (e) => {
    if (!editable || typing) return
    if (e.button !== 0) return
    drag.current = { active: true, startY: e.clientY, startVal: value, moved: false, pid: e.pointerId }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!drag.current.active) return
    const dy = drag.current.startY - e.clientY
    if (Math.abs(dy) > 3) drag.current.moved = true
    const next = Math.max(0, Math.round(drag.current.startVal + dy / 6))
    if (next !== value) onChange?.(next)
  }
  const onPointerUp = (e) => {
    if (drag.current.active) {
      const moved = drag.current.moved
      drag.current.active = false
      try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch {}
      if (moved) e.stopPropagation()
    }
  }

  const startType = (e) => {
    if (!editable) return
    e.stopPropagation()
    setDraft(String(value))
    setTyping(true)
  }
  const commitType = () => {
    const n = parseInt(draft, 10)
    setTyping(false)
    if (Number.isFinite(n)) commit(n)
  }

  const surfaceW = (() => {
    if (surfaceY <= 35) return 112 * Math.max(0, (surfaceY - 3)) / 32
    if (surfaceY >= 97) return 112 * Math.max(0, (129 - surfaceY)) / 32
    return 112
  })()

  return (
    <div className="d-flex flex-column align-items-center">
      <div
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'relative', width: W, height: H,
          filter: `drop-shadow(0 0 ${over ? 18 : 12}px ${over ? 'rgba(80,180,255,0.55)' : stroke})`,
          cursor: editable && !typing ? 'ns-resize' : 'default',
          touchAction: editable ? 'none' : 'auto',
          userSelect: 'none'
        }}
        title={editable ? 'Arraste, role ou clique no número' : ''}
      >
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
          <defs>
            <clipPath id={clipId}><polygon points={POLY} /></clipPath>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={healthColor(Math.min(1, pct + 0.04), kind)} />
              <stop offset="100%" stopColor={healthColor(Math.max(0, pct - 0.18), kind)} />
            </linearGradient>
          </defs>

          <polygon points={POLY} fill="#0c0a07" />

          <g clipPath={`url(#${clipId})`}>
            {fillH > 0 && (
              <>
                <rect x="0" y={surfaceY} width={W} height={fillH} fill={`url(#${gradId})`} style={{ transition: 'y .35s cubic-bezier(.2,.7,.2,1), height .35s cubic-bezier(.2,.7,.2,1)' }} />
                {surfaceW > 4 && (
                  <ellipse cx={W / 2} cy={surfaceY} rx={surfaceW / 2} ry="2.4" fill={healthColor(Math.min(1, pct + 0.12), kind)} opacity="0.9" style={{ transition: 'cy .35s cubic-bezier(.2,.7,.2,1), rx .35s' }} />
                )}
              </>
            )}
          </g>

          {over && (
            <circle cx={W / 2} cy={H / 2} r="60" fill="none" stroke="rgba(90,185,255,0.5)" strokeWidth="1.5" strokeDasharray="3 5" style={{ animation: 'spin 16s linear infinite' }} />
          )}

          <polygon points={POLY} fill="none" stroke={over ? 'rgba(120,200,255,0.85)' : stroke} strokeWidth="2.5" strokeLinejoin="round" />
        </svg>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <i className={`bi ${icon}`} style={{ color: fillColor, fontSize: '0.9rem', opacity: 0.85 }} />
          {typing ? (
            <input
              type="number" inputMode="numeric" value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onBlur={commitType}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitType() } else if (e.key === 'Escape') { e.preventDefault(); setTyping(false) } }}
              autoFocus
              className="no-spin font-display"
              style={{ width: 76, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(224,173,51,0.6)', borderRadius: 6, textAlign: 'center', color: '#fff8e6', fontSize: '1.5rem', fontWeight: 700, outline: 'none' }}
              aria-label={`Editar ${label}`}
            />
          ) : (
            <div className="font-display" onPointerDown={(e) => e.stopPropagation()} onClick={startType}
              style={{ color: textTone, fontSize: '2rem', lineHeight: 1, fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.9)', cursor: editable ? 'text' : 'default', pointerEvents: editable ? 'auto' : 'none' }}>
              {value}
            </div>
          )}
        </div>

        {editable && !typing && (
          <div style={{ position: 'absolute', top: 4, right: 6, pointerEvents: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem' }}>
            <i className="bi bi-arrows-vertical" />
          </div>
        )}
        {over && (
          <div className="font-mono" style={{ position: 'absolute', top: 4, left: 6, color: 'rgba(120,200,255,0.95)', fontSize: '0.62rem', background: 'rgba(0,0,0,0.5)', borderRadius: 5, padding: '1px 4px' }}>
            +{value - safeMax}
          </div>
        )}
      </div>

      <div className="font-display mt-1" style={{ fontSize: '0.92rem', color: fillColor }}>{label}</div>
      <span className="font-mono" style={{ fontSize: '0.74rem', color: 'var(--drako-muted)', letterSpacing: '0.04em' }}>
        máx <b style={{ color: over ? 'rgba(120,200,255,0.95)' : '#cdc1a6' }}>{max}</b>
      </span>
      {editable && (
        <button type="button" className="btn-ghost mt-1 d-inline-flex align-items-center gap-1" onClick={() => onOpenAdjust?.(kind)} title={`Ajustar ${label}`} style={{ height: 24, padding: '0 0.55rem', fontSize: '0.66rem' }}>
          <i className="bi bi-sliders2" />{Math.round(pct * 100)}%
        </button>
      )}
    </div>
  )
}
