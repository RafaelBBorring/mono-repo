import React from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { Camera, Video } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

const surferGradients = [
  'from-ocean-500 to-cyan-500',
  'from-sunset-500 to-amber-500',
  'from-teal-500 to-emerald-500',
  'from-violet-500 to-purple-500',
  'from-rose-500 to-pink-500',
  'from-blue-500 to-indigo-500',
]

export default function SurferGrid({ surfers, onSelect }) {
  const { isDark } = useTheme()

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {surfers.map((surfer, idx) => (
        <div key={surfer.id} className={`opacity-0 animate-slide-in-up stagger-${Math.min(idx + 1, 6)}`}>
          <Card onClick={() => onSelect(surfer.id)} className={`overflow-hidden group ${isDark ? '' : '!bg-white !border-slate-200/80'}`}>
            <div className={`aspect-square bg-gradient-to-br ${surferGradients[idx % surferGradients.length]} relative flex items-center justify-center`}>
              <span className="text-5xl font-display font-bold text-white/30">{surfer.name[0]}</span>
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="px-4 py-2 rounded-lg bg-white/20 backdrop-blur text-white text-sm font-semibold">Ver galeria</span>
              </div>
            </div>
            <div className="p-3">
              <h4 className={`font-display font-semibold text-sm truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{surfer.name}</h4>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="muted"><Camera size={10} className="mr-1" />{surfer.photoCount}</Badge>
                <Badge variant="muted"><Video size={10} className="mr-1" />{surfer.videoCount}</Badge>
                <span className={`text-xs ml-auto font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>R$ 15+</span>
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}
