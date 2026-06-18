import React, { useEffect, useRef, useState } from 'react'

export default function EditableNumber({
  value, min = 0, max = 9999, step = 1, onChange, onCommit,
  className = '', style = {}, align = 'center',
  ariaLabel, mono = true, disabled = false
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef(null)

  useEffect(() => { if (!editing) setDraft(String(value)) }, [value, editing])

  useEffect(() => {
    if (editing && inputRef.current) {
      const inp = inputRef.current
      inp.focus()
      inp.select()
    }
  }, [editing])

  const commit = () => {
    const n = Number(draft)
    let next = Number.isFinite(n) ? n : value
    next = Math.max(min, Math.min(max, next))
    setEditing(false)
    if (next !== value) {
      onChange?.(next)
      onCommit?.(next)
    }
  }
  const cancel = () => { setDraft(String(value)); setEditing(false) }

  const onKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    else if (e.key === 'Escape') { e.preventDefault(); cancel() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); onChange?.(Math.max(min, Math.min(max, value + step))) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); onChange?.(Math.max(min, Math.min(max, value - step))) }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.target.blur()}
        className={`no-spin ${mono ? 'font-mono' : ''} ${className}`}
        style={{ width: '100%', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(224,173,51,0.55)', borderRadius: 6, padding: '0.1rem 0.3rem', textAlign: align, color: 'inherit', outline: 'none', ...style }}
        aria-label={ariaLabel}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (!disabled) setEditing(true) }}
      onPointerDown={(e) => e.stopPropagation()}
      className={`${className}`}
      style={{ background: 'none', border: 'none', padding: 0, cursor: disabled ? 'default' : 'text', color: 'inherit', textAlign: align, width: '100%', ...style }}
      disabled={disabled}
      title={disabled ? '' : 'Clique para editar'}
      aria-label={ariaLabel}
    >
      {value}
    </button>
  )
}
