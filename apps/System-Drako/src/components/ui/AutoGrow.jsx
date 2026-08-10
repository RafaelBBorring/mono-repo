import React, { useEffect, useRef } from 'react'

export default function AutoGrow({ value, onChange, placeholder, minRows = 2, maxHeight = 280, className = '', style, ...rest }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    const base = minRows * 26 + 16
    const content = el.scrollHeight
    const target = Math.min(Math.max(base, content), maxHeight)
    el.style.height = target + 'px'
    el.style.overflowY = content > maxHeight ? 'auto' : 'hidden'
  }, [value, minRows, maxHeight])

  return (
    <textarea
      ref={ref}
      className={`textarea-drako scroll-drako ${className}`}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      style={{ resize: 'none', maxHeight: maxHeight + 'px', ...style }}
      {...rest}
    />
  )
}
