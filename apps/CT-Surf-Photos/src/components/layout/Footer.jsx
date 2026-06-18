import React from 'react'
import { Camera } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export default function Footer() {
  const { isDark } = useTheme()

  return (
    <footer className={`relative z-10 border-t ${isDark ? 'border-white/[0.06] bg-[rgba(10,14,23,0.9)]' : 'border-slate-200 bg-white/80'} backdrop-blur-xl transition-colors`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center">
              <Camera size={14} className="text-white" />
            </div>
            <span className={`font-display font-bold text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CT Surf Photos</span>
          </div>
          <p className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>&copy; 2025 CT-Surf-Photos. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
