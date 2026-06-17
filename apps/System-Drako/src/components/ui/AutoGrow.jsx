import React, { useEffect, useRef } from 'react'

export default function AutoGrow({ value, onChange, placeholder, minRows = 2, style, ...rest }) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.max(minRows * 26 + 16, el.scrollHeight) + 'px'
  }, [value, minRows])
  return (
    <textarea
      ref={ref}
      className="textarea-drako"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      style={{ overflow: 'hidden', resize: 'none', ...style }}
      {...rest}
    />
  )
}
