import React, { useState } from 'react'

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

  const add = () => {
    if (!draft.label.trim()) return
    onChange([...tags, { label: draft.label.trim().slice(0, 24), color: draft.color }])
    setDraft({ label: '', color: draft.color })
  }

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 mb-2" style={{ minHeight: tags.length ? 'auto' : 0 }}>
        {tags.map((t, i) => (
          <Tag key={i} label={t.label} color={t.color} onRemove={() => onChange(tags.filter((_, j) => j !== i))} />
        ))}
      </div>
      <div className="d-flex gap-2 align-items-center" style={{ position: 'relative' }}>
        <button
          type="button"
          title="Cor da tag"
          onClick={() => setOpenPalette(v => !v)}
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

        {openPalette && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setOpenPalette(false)} />
            <div className="glass glass-tight p-3" style={{ position: 'absolute', left: 0, top: 46, zIndex: 21, width: 220 }}>
              <div className="label-drako">Escolha a cor</div>
              <div className="d-flex flex-wrap gap-2">
                {TAG_COLORS.map(col => (
                  <button key={col} type="button" title={col}
                    onClick={() => { setDraft({ ...draft, color: col }); setOpenPalette(false) }}
                    style={{ width: 28, height: 28, borderRadius: 999, background: col, border: draft.color === col ? '3px solid #fff8e6' : '2px solid rgba(0,0,0,0.4)', cursor: 'pointer', boxShadow: col === draft.color ? `0 0 12px ${col}` : 'none' }} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
