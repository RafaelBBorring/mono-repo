import React from 'react'
import { MapPin, Waves, Calendar, ArrowRight } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { useTheme } from '../../contexts/ThemeContext'
import { clubs, getEventsByClub } from '../../data/clubs'

const clubGradients = [
  'from-ocean-500 via-cyan-500 to-teal-500',
  'from-sunset-500 via-amber-500 to-yellow-500',
  'from-violet-500 via-purple-500 to-indigo-500',
]

export default function ClubsPage({ onNavigate }) {
  const { isDark } = useTheme()

  return (
    <div className="relative z-10 pt-24 pb-16 px-4 sm:px-6 max-w-6xl mx-auto page-enter">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={18} className="text-ocean-400" />
          <span className="text-sm font-medium text-ocean-400">Localizacoes</span>
        </div>
        <h1 className={`text-3xl sm:text-4xl font-display font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Nossos Clubes
        </h1>
        <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Cada clube tem suas proprias sessoes de fotos e videos
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club, idx) => {
          const evtCount = getEventsByClub(club.id).length
          return (
            <div key={club.id} className={`opacity-0 animate-slide-in-up stagger-${idx + 1}`}>
              <Card onClick={() => onNavigate(`sessions?club=${club.id}`)} className="overflow-hidden group">
                <div className={`h-44 bg-gradient-to-br ${clubGradients[idx % clubGradients.length]} relative flex items-center justify-center`}>
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <div className="relative text-center">
                    <Waves size={40} className="text-white/30 mx-auto mb-2" />
                    <h3 className="font-display font-bold text-xl text-white">{club.name}</h3>
                    <p className="text-white/70 text-sm flex items-center justify-center gap-1 mt-1">
                      <MapPin size={12} /> {club.location}
                    </p>
                  </div>
                </div>
                <div className="p-5">
                  <p className={`text-sm mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {club.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="ocean"><Calendar size={11} className="mr-1" />{evtCount} eventos</Badge>
                      <Badge variant="muted">{club.active ? 'Ativo' : 'Inativo'}</Badge>
                    </div>
                    <ArrowRight size={18} className={`transition-transform group-hover:translate-x-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                  </div>
                </div>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
