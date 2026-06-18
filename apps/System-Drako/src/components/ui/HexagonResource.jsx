import React, { useRef } from 'react'
import { healthColor, healthGradient } from '../../lib/calculator.js'

function hexStroke(pct, kind) {
  const p = Math.max(0, Math.min(1, pct))
  if (p <= 0) return 'rgba(120,40,40,0.6)'
  const base = healthColor(p, kind)
  return base.replace('hsl', 'hsla').replace(')', ',0.9)')
}

export default function HexagonResource({ kind, label, icon, value, max, editable = false, onChange, onMaxChange }) {
  const pct = Math.max(0, Math.min(1, value / Math.max(1, max)))
  const fillColor = healthColor(pct, kind)
  const fillGradient = healthGradient(pct, kind)
  const stroke = hexStroke(pct, kind)
  const textTone = pct <= 0 ? '#7a6a55' : '#fff8e6'
  const dragInfo = useRef({ active: false, startY: 0, startVal: 0, moved: false })

  const commit = (raw) => {
    const next = Math.max(0, Math.min(max, Number(raw) || 0))
    onChange?.(next)
  }

  const onWheel = (e) => {
    if (!editable) return
    e.preventDefault()
    const dir = e.deltaY < 0 ? 1 : -1
    commit(value + dir)
  }

  const onPointerDown = (e) => {
    if (!editable) return
    if (e.button !== 0) return
    dragInfo.current = { active: true, startY: e.clientY, startVal: value, moved: false, pid: e.pointerId }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragInfo.current.active) return
    const dy = dragInfo.current.startY - e.clientY
    if (Math.abs(dy) > 3) dragInfo.current.moved = true
    const delta = Math.round(dy / 6)
    const next = Math.max(0, Math.min(max, dragInfo.current.startVal + delta))
    if (next !== value) onChange?.(next)
  }
  const onPointerUp = (e) => {
    if (dragInfo.current.active) {
      const moved = dragInfo.current.moved
      dragInfo.current.active = false
      try { e.currentTarget.releasePointerCapture?.(e.pointerId) } catch {}
      if (moved) e.stopPropagation()
    }
  }

  return (
    <div className="d-flex flex-column align-items-center">
      <div
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'relative', width: 118, height: 132,
          filter: `drop-shadow(0 0 14px ${stroke})`,
          cursor: editable ? 'ns-resize' : 'default',
          touchAction: editable ? 'none' : 'auto',
          userSelect: 'none'
        }}
        title={editable ? 'Scroll ou arraste verticalmente para alterar' : ''}
      >
        <div className="hex" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 35%, #15110c, #08060400)' }} />
        <div className="hex" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${pct * 100}%`, background: fillGradient, transition: 'height .4s cubic-bezier(.2,.7,.2,1), background .3s' }} />
        <svg className="hex" width="118" height="132" viewBox="0 0 118 132" style={{ position: 'absolute', inset: 0, overflow: 'visible' }} fill="none">
          <polygon points="59,2 116,34 116,98 59,130 2,98 2,34" stroke={stroke} strokeWidth="2.5" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <i className={`bi ${icon}`} style={{ color: fillColor, fontSize: '0.9rem', opacity: 0.85 }} />
          <div className="font-display" style={{ color: textTone, fontSize: '2rem', lineHeight: 1, fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}>{value}</div>
        </div>
        {editable && (
          <div style={{ position: 'absolute', top: 4, right: 6, pointerEvents: 'none', color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem' }}>
            <i className="bi bi-arrows-vertical" />
          </div>
        )}
      </div>

      <div className="font-display mt-1" style={{ fontSize: '0.92rem', color: fillColor }}>{label}</div>
      <span className="font-mono text-muted-drako" style={{ fontSize: '0.78rem' }}>máx {max}</span>
      {editable && (
        <button type="button" className="btn-ghost mt-1" onClick={onMaxChange} title={`Alterar máximo de ${label}`} style={{ height: 24, padding: '0 0.5rem', fontSize: '0.66rem' }}>
          <i className="bi bi-sliders me-1" />{Math.round(pct * 100)}%
        </button>
      )}
    </div>
  )
}
