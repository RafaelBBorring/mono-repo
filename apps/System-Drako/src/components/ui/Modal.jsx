import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children, footer, size = 'md', closable = true }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && closable) onClose?.() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, closable, onClose])

  if (!open) return null
  const maxW = { sm: '480px', md: '680px', lg: '920px', xl: '1180px' }[size] || '680px'

  return createPortal(
    <div className="drako-modal-backdrop position-fixed inset-0 d-flex align-items-center justify-content-center p-3" style={{ zIndex: 9000 }} onClick={() => closable && onClose?.()}>
      <div className="glass modal-panel w-100" style={{ maxWidth: maxW, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
        <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ borderBottom: '1px solid var(--drako-border)' }}>
          <h4 className="m-0" style={{ fontSize: '1.05rem' }}>{title}</h4>
          {closable && (
            <button className="btn-ghost" style={{ width: 36, height: 36, padding: 0 }} onClick={() => onClose?.()} aria-label="Fechar">
              <i className="bi bi-x-lg" />
            </button>
          )}
        </div>
        <div className="px-4 py-3" style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
        {footer && (
          <div className="d-flex align-items-center justify-content-end gap-2 px-4 py-3" style={{ borderTop: '1px solid var(--drako-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
