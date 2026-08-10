import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export const TAG_COLORS = [
  '#e0ad33', '#f6d98c', '#f39c12', '#f2661b', '#ff5e5e',
  '#c0392b', '#2ecc71', '#16a085', '#1abc9c', '#27ae60',
  '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#e84393',
  '#fd79a8', '#a29bfe', '#74b9ff', '#7f8c8d', '#bdc3c7'
]

export default function Tag({ label, color = '#e0ad33', onRemove }) {
  return (
    <span className="tag-chip" style={{ color, fontSize: '0.78rem', padding: '0.28rem 0.7rem' }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: color, display: 'inline-block', boxShadow: `0 0 8px ${color}` }} />
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, lineHeight: 1, marginLeft: 2 }} aria-label={`Remover ${label}`}>
          <i className="bi bi-x-lg" style={{ fontSize: '0.7rem' }} />
        </button>
      )}
    </span>
  )
}

export function TagEditor({ tags = [], onChange }) {
  const [draft, setDraft] = useState({ label: '', color: TAG_COLORS[0] })
  const [openPalette, setOpenPalette] = useState(false)
  const [palettePos, setPalettePos] = useState(null)
  const colorBtnRef = useRef(null)

  const add = () => {
    if (!draft.label.trim()) return
    onChange([...tags, { label: draft.label.trim().slice(0, 24), color: draft.color }])
    setDraft({ label: '', color: draft.color })
  }

  const placePalette = () => {
    const btn = colorBtnRef.current
    if (!btn) { setOpenPalette(true); return }
    const r = btn.getBoundingClientRect()
    const W = 220, H = 156
    let left = r.left
    let top = r.bottom + 6
    if (left + W > window.innerWidth - 8) left = Math.max(8, window.innerWidth - W - 8)
    if (top + H > window.innerHeight - 8) top = Math.max(8, r.top - H - 6)
    setPalettePos({ left, top })
    setOpenPalette(true)
  }

  useEffect(() => {
    if (!openPalette) return
    const close = () => setOpenPalette(false)
    const replace = () => placePalette()
    window.addEventListener('resize', replace)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('resize', replace)
      window.removeEventListener('scroll', close, true)
    }
  }, [openPalette])

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 mb-2" style={{ minHeight: tags.length ? 'auto' : 0 }}>
        {tags.map((t, i) => (
          <Tag key={i} label={t.label} color={t.color} onRemove={() => onChange(tags.filter((_, j) => j !== i))} />
        ))}
      </div>
      <div className="d-flex gap-2 align-items-center">
        <button
          ref={colorBtnRef}
          type="button"
          title="Cor da tag"
          onClick={() => (openPalette ? setOpenPalette(false) : placePalette())}
          style={{ width: 38, height: 38, borderRadius: 999, border: '2px solid rgba(255,255,255,0.25)', background: draft.color, cursor: 'pointer', boxShadow: `0 0 12px ${draft.color}88`, flex: '0 0 auto' }}
        />
        <input
          className="input-drako"
          style={{ flex: 1 }}
          placeholder="Nova tag (ex.: Acumulativa, Fogo, Reativa)"
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <button type="button" className="btn-drako" style={{ padding: '0.55rem 1rem' }} onClick={add} title="Adicionar tag"><i className="bi bi-plus-lg" /></button>
      </div>

      {openPalette && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9098 }} onClick={() => setOpenPalette(false)} />
          <div className="glass glass-tight p-3 scroll-drako" style={{ position: 'fixed', left: (palettePos?.left ?? 0) + 'px', top: (palettePos?.top ?? 0) + 'px', zIndex: 9099, width: 220, animation: 'fadeUp .22s both' }}>
            <div className="label-drako">Escolha a cor</div>
            <div className="d-flex flex-wrap gap-2">
              {TAG_COLORS.map(col => (
                <button key={col} type="button" title={col}
                  onClick={() => { setDraft({ ...draft, color: col }); setOpenPalette(false) }}
                  style={{ width: 28, height: 28, borderRadius: 999, background: col, border: draft.color === col ? '3px solid #fff8e6' : '2px solid rgba(0,0,0,0.4)', cursor: 'pointer', boxShadow: col === draft.color ? `0 0 12px ${col}` : 'none' }} />
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
