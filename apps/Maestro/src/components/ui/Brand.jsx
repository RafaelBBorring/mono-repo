import { Sparkles } from 'lucide-react'
import clsx from 'clsx'

export function Brand({ compact = false, light = false }) {
  return (
    <div className={clsx('brand', compact && 'brand--compact', light && 'brand--light')}>
      <span className="brand__mark" aria-hidden="true">
        <span className="brand__orbit" />
        <Sparkles size={16} strokeWidth={1.8} />
      </span>
      {!compact && (
        <span className="brand__wordmark">
          Maestro
          <small>Creative intelligence</small>
        </span>
      )}
    </div>
  )
}
