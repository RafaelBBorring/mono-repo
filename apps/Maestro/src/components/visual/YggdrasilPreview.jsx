import { useId } from 'react'
import { Network, TreePine } from 'lucide-react'
import '../../styles/yggdrasil-redesign.css'

const DEFAULT_LABELS = ['Pessoas', 'Lugares', 'Eventos']

export function YggdrasilPreview({ compact = false, labels = DEFAULT_LABELS, className = '', onClick, ariaLabel = 'Abrir Yggdrasil' }) {
  const titleId = useId()
  const visibleLabels = [...labels, ...DEFAULT_LABELS].filter(Boolean).slice(0, 3)
  const previewClassName = `ygg-preview ${compact ? 'ygg-preview--compact' : ''} ${onClick ? 'ygg-preview--interactive' : ''} ${className}`.trim()
  const content = (
    <>
      <svg viewBox="0 0 320 128" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M160 102 C160 76 160 64 160 49" />
        <path d="M160 68 C132 64 103 53 76 31" />
        <path d="M160 60 C192 57 221 46 246 26" />
        <path d="M160 81 C198 82 234 92 270 106" />
      </svg>
      <span className="ygg-preview__root" aria-hidden="true"><TreePine size={compact ? 15 : 18} /></span>
      <span className="ygg-preview__node ygg-preview__node--one"><i /><b>{visibleLabels[0]}</b></span>
      <span className="ygg-preview__node ygg-preview__node--two"><i /><b>{visibleLabels[1]}</b></span>
      <span className="ygg-preview__node ygg-preview__node--three"><i /><b>{visibleLabels[2]}</b></span>
      {!compact && <span className="ygg-preview__center" aria-hidden="true"><Network size={14} /></span>}
    </>
  )

  if (onClick) {
    return <button type="button" className={previewClassName} onClick={onClick} aria-label={ariaLabel}>{content}</button>
  }

  return (
    <figure className={previewClassName} aria-labelledby={titleId}>
      <figcaption id={titleId} className="ygg-sr-only">Prévia de uma árvore de conhecimento conectando {visibleLabels.join(', ')}</figcaption>
      {content}
    </figure>
  )
}
