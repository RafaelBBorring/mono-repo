import React, { useState } from 'react'

function stateColor(kind, pct) {
  if (pct <= 0) return { fill: '#241013', glow: 'rgba(0,0,0,0.6)', text: '#7a6a55' }
  if (kind === 'vida') {
    if (pct > 0.6) return { fill: 'linear-gradient(180deg,#43e886,#1f9d54)', glow: 'rgba(46,204,113,0.6)', text: '#9bf2bd' }
    if (pct > 0.3) return { fill: 'linear-gradient(180deg,#f3d24a,#c79a12)', glow: 'rgba(241,196,64,0.6)', text: '#f3e3a0' }
    return { fill: 'linear-gradient(180deg,#ff6a5a,#c0392b)', glow: 'rgba(231,76,60,0.6)', text: '#ffb0a6' }
  }
  if (kind === 'energia') {
    if (pct > 0.3) return { fill: 'linear-gradient(180deg,#ffb547,#e67e22)', glow: 'rgba(243,156,18,0.6)', text: '#ffd79a' }
    return { fill: 'linear-gradient(180deg,#c97032,#8a4513)', glow: 'rgba(230,126,34,0.45)', text: '#e8b483' }
  }
  if (pct > 0.3) return { fill: 'linear-gradient(180deg,#b989e0,#8e44ad)', glow: 'rgba(155,89,182,0.6)', text: '#d9bbf0' }
  return { fill: 'linear-gradient(180deg,#6c4287,#3e2353)', glow: 'rgba(155,89,182,0.4)', text: '#b794d4' }
}

export default function HexagonResource({ kind, label, icon, value, max, onChange, onMaxChange, editable = true }) {
  const pct = Math.max(0, Math.min(1, value / Math.max(1, max)))
  const st = stateColor(kind, pct)
  const [custom, setCustom] = useState('')

  const setVal = (v) => onChange?.(Math.max(0, Math.min(max, v)))
  const applyCustom = (dir) => {
    const n = Math.abs(parseInt(custom, 10))
    if (!n) return
    setVal(value + dir * n); setCustom('')
  }

  return (
    <div className="d-flex flex-column align-items-center">
      <div style={{ position: 'relative', width: 118, height: 132, filter: `drop-shadow(0 0 14px ${st.glow})` }}>
        {/* base hex */}
        <div className="hex" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 35%, #15110c, #08060400)', border: '0px' }} />
        {/* fill hex anchored bottom */}
        <div className="hex" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: `${pct * 100}%`, background: st.fill, transition: 'height .5s cubic-bezier(.2,.7,.2,1), background .4s' }} />
        {/* outline hex (border via stroke) */}
        <svg className="hex" width="118" height="132" viewBox="0 0 118 132" style={{ position: 'absolute', inset: 0, overflow: 'visible' }} fill="none">
          <polygon points="59,2 116,34 116,98 59,130 2,98 2,34" stroke={st.glow.replace('0.6', '0.9').replace('0.45', '0.8').replace('0.4', '0.75')} strokeWidth="2.5" />
        </svg>
        {/* value */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`bi ${icon}`} style={{ color: st.text, fontSize: '0.9rem', opacity: 0.8 }} />
          <div className="font-display" style={{ color: '#fff8e6', fontSize: '2rem', lineHeight: 1, fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{value}</div>
        </div>
      </div>

      <div className="font-display mt-1" style={{ fontSize: '0.92rem', color: st.text }}>{label}</div>
      <button onClick={() => onMaxChange?.(max)} title="Máximo (clique p/ editar)" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span className="font-mono text-muted-drako" style={{ fontSize: '0.78rem' }}>máx {max}</span>
      </button>

      {editable && (
        <div className="d-flex flex-column align-items-center gap-1 mt-1" style={{ width: '100%' }}>
          <div className="d-flex align-items-center gap-1">
            <button className="btn-ghost" style={{ width: 30, height: 30, padding: 0, borderColor: 'rgba(231,76,60,0.4)', color: '#ff8a7a' }} onClick={() => setVal(value - 1)} title="−1"><i className="bi bi-dash" /></button>
            <button className="btn-ghost" style={{ width: 30, height: 30, padding: 0, borderColor: 'rgba(46,204,113,0.4)', color: '#7bf2a4' }} onClick={() => setVal(value + 1)} title="+1"><i className="bi bi-plus" /></button>
          </div>
          <div className="d-flex align-items-center gap-1" style={{ maxWidth: '100%' }}>
            <input className="input-drako no-spin" type="number" min={0} placeholder="qtd" value={custom} onChange={(e) => setCustom(e.target.value)} style={{ width: 52, height: 30, padding: '0 6px', fontSize: '0.82rem', textAlign: 'center' }} />
            <button className="btn-ghost" style={{ width: 28, height: 30, padding: 0, fontSize: '0.8rem', borderColor: 'rgba(231,76,60,0.4)', color: '#ff8a7a' }} onClick={() => applyCustom(-1)} title="Aplicar dano"><i className="bi bi-arrow-down-short" /></button>
            <button className="btn-ghost" style={{ width: 28, height: 30, padding: 0, fontSize: '0.8rem', borderColor: 'rgba(46,204,113,0.4)', color: '#7bf2a4' }} onClick={() => applyCustom(1)} title="Aplicar cura"><i className="bi bi-arrow-up-short" /></button>
          </div>
        </div>
      )}
    </div>
  )
}
