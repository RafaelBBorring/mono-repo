import { CircleCheck, CircleDashed, Eye, HelpCircle, TriangleAlert } from 'lucide-react'

const statuses = {
  confirmed: { label: 'Confirmado', icon: CircleCheck },
  inferred: { label: 'Inferência', icon: Eye },
  unknown: { label: 'Não documentado', icon: HelpCircle },
  conflicted: { label: 'Contradição', icon: TriangleAlert },
  pending: { label: 'Em revisão', icon: CircleDashed },
}

export function StatusBadge({ status = 'pending', compact = false }) {
  const detail = statuses[status] || statuses.pending
  const Icon = detail.icon
  return (
    <span className={`status-badge status-badge--${status} ${compact ? 'status-badge--compact' : ''}`}>
      <Icon size={compact ? 12 : 13} />
      {!compact && detail.label}
    </span>
  )
}
