import React, { useState } from 'react'
import { Calendar, MapPin, Clock, ChevronDown, ChevronUp, Users, Waves } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { useTheme } from '../../contexts/ThemeContext'
import { clubs, events, getClubById } from '../../data/clubs'
import { sessions, getSessionsByEvent } from '../../data/mockSessions'
import { photographers } from '../../data/photographers'
import SideSelector from './SideSelector'

export default function SessionBrowser({ onNavigate }) {
  const { isDark } = useTheme()
  const [selectedClub, setSelectedClub] = useState(null)
  const [expandedEvent, setExpandedEvent] = useState(null)
  const [expandedSession, setExpandedSession] = useState(null)

  const filteredEvents = selectedClub ? events.filter(e => e.clubId === selectedClub) : events
  const sortedEvents = [...filteredEvents].sort((a, b) => new Date(b.date) - new Date(a.date))

  const formatDate = (d) => {
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const getStatusColor = (status) => {
    if (status === 'ativo') return 'ocean'
    if (status === 'encerrado') return 'muted'
    return 'gold'
  }

  return (
    <div className="relative z-10 pt-24 pb-16 px-4 sm:px-6 max-w-6xl mx-auto page-enter">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={18} className="text-ocean-400" />
          <span className="text-sm font-medium text-ocean-400">Eventos</span>
        </div>
        <h1 className={`text-3xl sm:text-4xl font-display font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Sessoes de Surf
        </h1>
        <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Navegue por clube, data e horario para encontrar suas fotos
        </p>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedClub(null)}
          className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            !selectedClub
              ? 'bg-gradient-to-r from-ocean-500 to-ocean-600 text-white shadow-lg shadow-ocean-500/25'
              : isDark ? 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] border border-white/[0.06]' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          Todos
        </button>
        {clubs.map(club => (
          <button
            key={club.id}
            onClick={() => setSelectedClub(club.id)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              selectedClub === club.id
                ? 'bg-gradient-to-r from-ocean-500 to-ocean-600 text-white shadow-lg shadow-ocean-500/25'
                : isDark ? 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] border border-white/[0.06]' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <MapPin size={14} />
            {club.name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {sortedEvents.map((event, eIdx) => {
          const club = getClubById(event.clubId)
          const evtSessions = getSessionsByEvent(event.id)
          const isEventExpanded = expandedEvent === event.id
          const totalSurfers = evtSessions.reduce((sum, s) =>
            sum + s.sides.esquerdo.surfers.length + s.sides.direito.surfers.length, 0)
          const totalMedia = evtSessions.reduce((sum, s) =>
            sum + s.sides.esquerdo.surfers.reduce((ss, su) => ss + su.media.length, 0)
              + s.sides.direito.surfers.reduce((ss, su) => ss + su.media.length, 0), 0)

          return (
            <div key={event.id} className={`opacity-0 animate-slide-in-up stagger-${Math.min(eIdx + 1, 8)}`}>
              <Card
                onClick={() => setExpandedEvent(isEventExpanded ? null : event.id)}
                className={`p-5 ${isDark ? '' : '!bg-white !border-slate-200/80'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center border ${
                      isDark ? 'bg-ocean-500/10 border-ocean-500/20' : 'bg-ocean-50 border-ocean-200'
                    }`}>
                      <Calendar size={22} className="text-ocean-500" />
                    </div>
                    <div>
                      <h3 className={`font-display font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {event.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatDate(event.date)}
                        </span>
                        <span className={`text-sm ${isDark ? 'text-slate-600' : 'text-slate-300'}`}>|</span>
                        <span className={`text-sm flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <MapPin size={12} /> {club?.name}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-2">
                      <Badge variant={getStatusColor(event.status)}>{event.status}</Badge>
                      <Badge variant="muted"><Clock size={11} className="mr-1" />{evtSessions.length}h</Badge>
                      <Badge variant="muted"><Users size={11} className="mr-1" />{totalSurfers}</Badge>
                      <Badge variant="muted">{totalMedia} itens</Badge>
                    </div>
                    {isEventExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </div>

                {isEventExpanded && (
                  <div className="mt-5 pt-5 border-t border-white/[0.06] space-y-3 animate-slide-in-up">
                    <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-white/[0.03] text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin size={14} className="text-ocean-400" />
                        <span className="font-medium">{club?.name}</span>
                        <span className="text-slate-500">— {club?.location}</span>
                      </div>
                      <p className="text-xs text-slate-500">{club?.description}</p>
                    </div>

                    {evtSessions.map((session) => {
                      const ph = photographers.find(p => p.id === session.photographerId)
                      const isSessionExpanded = expandedSession === session.id
                      const sSurfers = session.sides.esquerdo.surfers.length + session.sides.direito.surfers.length

                      return (
                        <Card
                          key={session.id}
                          onClick={(e) => { e.stopPropagation(); setExpandedSession(isSessionExpanded ? null : session.id) }}
                          className={`p-4 !rounded-xl ${isDark ? '' : '!bg-slate-50 !border-slate-200/60'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isDark ? 'bg-sunset-500/10' : 'bg-sunset-50'
                              }`}>
                                <Clock size={16} className="text-sunset-500" />
                              </div>
                              <div>
                                <span className={`font-display font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {session.time}
                                </span>
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  Fotografo: {ph?.name} &middot; {sSurfers} surfistas
                                </p>
                              </div>
                            </div>
                            {isSessionExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                          </div>

                          {isSessionExpanded && (
                            <div className="mt-4 pt-4 border-t border-white/[0.06] animate-slide-in-up" onClick={e => e.stopPropagation()}>
                              <SideSelector
                                sides={session.sides}
                                onSelectSurfer={(surferId) => onNavigate(`surfer/${surferId}`)}
                              />
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                )}
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
