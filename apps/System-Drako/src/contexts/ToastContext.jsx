import React, { createContext, useCallback, useContext, useState } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((msg, type = 'info', ttl = 3200) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttl)
  }, [])

  const api = {
    push,
    info: (m) => push(m, 'info'),
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    warn: (m) => push(m, 'warn')
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className="toast-item glass glass-tight px-3 py-2 d-flex align-items-center gap-2" style={{ minWidth: 240, maxWidth: 360 }}>
            <i className={`bi ${iconFor(t.type)} text-gold`} />
            <span style={{ fontSize: '0.92rem' }}>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

function iconFor(type) {
  return { info: 'bi-info-circle', success: 'bi-check-circle', error: 'bi-exclamation-octagon', warn: 'bi-exclamation-triangle' }[type] || 'bi-info-circle'
}

export const useToast = () => useContext(ToastCtx)
