import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export default function Card({ children, className = '', onClick, hoverable = true }) {
  const { isDark } = useTheme()

  return (
    <div
      onClick={onClick}
      className={`
        ${isDark ? 'bg-[rgba(17,24,39,0.7)]' : 'bg-white'}
        backdrop-blur-xl
        border ${isDark ? 'border-white/[0.08]' : 'border-slate-200/80'}
        rounded-2xl
        transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${hoverable ? 'hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(14,165,233,0.12)] hover:border-ocean-500/25 cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
