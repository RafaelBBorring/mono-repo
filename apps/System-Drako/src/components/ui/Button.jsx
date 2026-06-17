import React from 'react'

export function Button({ variant = 'gold', className = '', children, ...props }) {
  const cls = variant === 'gold' ? 'btn-drako'
    : variant === 'ghost' ? 'btn-ghost'
    : variant === 'danger' ? 'btn-danger-soft'
    : 'btn-drako'
  return (
    <button className={`${cls} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function IconButton({ icon, title, onClick, className = '', active = false }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`btn-ghost d-inline-flex align-items-center justify-content-center ${active ? 'is-active' : ''}`}
      style={{ width: 40, height: 40, padding: 0 }}
    >
      <i className={`bi ${icon}`} />
    </button>
  )
}
