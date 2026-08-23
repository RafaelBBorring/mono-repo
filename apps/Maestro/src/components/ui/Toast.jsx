import { Check, Info, TriangleAlert, X } from 'lucide-react'
import { useEffect } from 'react'
import { animated, useTransition } from '@react-spring/web'

const icons = {
  success: Check,
  error: TriangleAlert,
  neutral: Info,
}

export function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(onClose, 4200)
    return () => window.clearTimeout(timer)
  }, [onClose, toast])

  const transitions = useTransition(toast, {
    from: { opacity: 0, transform: 'translate3d(0,16px,0) scale(.97)' },
    enter: { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' },
    leave: { opacity: 0, transform: 'translate3d(0,10px,0) scale(.98)' },
  })

  return transitions((styles, item) => {
    if (!item) return null
    const Icon = icons[item.tone] || Check
    return (
      <animated.div
        style={styles}
        className={`toast toast--${item.tone}`}
        role={item.tone === 'error' ? 'alert' : 'status'}
        aria-live={item.tone === 'error' ? 'assertive' : 'polite'}
      >
        <span className="toast__icon"><Icon size={16} /></span>
        <span>{item.message}</span>
        <button type="button" onClick={onClose} aria-label="Fechar aviso"><X size={15} /></button>
      </animated.div>
    )
  })
}
