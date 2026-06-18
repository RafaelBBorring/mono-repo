import React from 'react'

const variantStyles = {
  ocean: 'bg-sky-500/15 text-sky-500 border-sky-500/20',
  sunset: 'bg-orange-500/15 text-orange-500 border-orange-500/20',
  gold: 'bg-amber-400/15 text-amber-500 border-amber-400/20',
  coral: 'bg-rose-500/15 text-rose-500 border-rose-500/20',
  muted: 'bg-slate-500/15 text-slate-500 border-slate-500/20',
}

export default function Badge({ variant = 'muted', children, className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full border ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  )
}
