import React, { useState } from 'react'
import { LayoutDashboard, Upload, Users, Calendar, DollarSign, MapPin, Plus, Building2 } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { useTheme } from '../../contexts/ThemeContext'
import { photographers } from '../../data/photographers'
import { clubs, events } from '../../data/clubs'
import { formatPrice } from '../../utils/priceCalculator'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'clubs', label: 'Clubes & Eventos', icon: Building2 },
  { id: 'photographers', label: 'Fotografos', icon: Users },
  { id: 'commissions', label: 'Comissoes', icon: DollarSign },
]

const stats = [
  { label: 'Vendas Hoje', value: formatPrice(1250), icon: LayoutDashboard, color: 'text-ocean-400' },
  { label: 'Vendas Semana', value: formatPrice(8430), icon: DollarSign, color: 'text-sand-400' },
  { label: 'Fotos Vendidas', value: '127', icon: Calendar, color: 'text-ocean-300' },
  { label: 'Videos Vendidos', value: '43', icon: DollarSign, color: 'text-sunset-400' },
]

const recentSales = [
  { id: 1, buyer: 'Joao S.', items: 3, total: 55, time: '14:32', photographer: 'Ricardo M.' },
  { id: 2, buyer: 'Maria L.', items: 1, total: 25, time: '13:15', photographer: 'Sofia T.' },
  { id: 3, buyer: 'Pedro C.', items: 5, total: 89.9, time: '12:40', photographer: 'Ricardo M.' },
  { id: 4, buyer: 'Ana O.', items: 2, total: 40, time: '11:20', photographer: 'Miguel A.' },
  { id: 5, buyer: 'Lucas F.', items: 1, total: 15, time: '10:05', photographer: 'Sofia T.' },
]

export default function AdminDashboard() {
  const [active, setActive] = useState('dashboard')
  const { isDark } = useTheme()

  const txtPrimary = isDark ? 'text-white' : 'text-slate-900'
  const txtSecondary = isDark ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className="relative z-10 pt-24 pb-16 px-4 sm:px-6 max-w-7xl mx-auto page-enter">
      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-56 flex-shrink-0">
          <Card className="p-2 !rounded-xl" hoverable={false}>
            <nav className="space-y-1">
              {navItems.map(item => (
                <button key={item.id} onClick={() => setActive(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active === item.id ? 'bg-ocean-500/15 text-ocean-400' : `${txtSecondary} hover:bg-white/[0.04] hover:text-white`
                  }`}>
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>
          </Card>
        </aside>

        <main className="flex-1 min-w-0">
          {active === 'dashboard' && <DashboardView isDark={isDark} txtPrimary={txtPrimary} txtSecondary={txtSecondary} />}
          {active === 'upload' && <UploadView isDark={isDark} txtPrimary={txtPrimary} />}
          {active === 'clubs' && <ClubsManagerView isDark={isDark} txtPrimary={txtPrimary} txtSecondary={txtSecondary} />}
          {active === 'photographers' && <PhotographersView isDark={isDark} txtPrimary={txtPrimary} txtSecondary={txtSecondary} />}
          {active === 'commissions' && <CommissionsView isDark={isDark} txtPrimary={txtPrimary} txtSecondary={txtSecondary} />}
        </main>
      </div>
    </div>
  )
}

function DashboardView({ isDark, txtPrimary, txtSecondary }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-display font-bold ${txtPrimary}`}>Dashboard</h2>
        <p className={`text-sm mt-1 ${txtSecondary}`}>Visao geral das vendas e performance</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div key={idx} className={`opacity-0 animate-slide-in-up stagger-${idx + 1}`}>
            <Card className="p-5" hoverable={false}>
              <stat.icon size={20} className={`${stat.color} mb-3`} />
              <div className={`font-mono font-bold text-2xl ${stat.color}`}>{stat.value}</div>
              <div className={`text-xs mt-1 ${txtSecondary}`}>{stat.label}</div>
            </Card>
          </div>
        ))}
      </div>
      <Card className="overflow-hidden" hoverable={false}>
        <div className={`p-5 border-b ${isDark ? 'border-white/[0.06]' : 'border-slate-200'}`}>
          <h3 className={`font-display font-semibold ${txtPrimary}`}>Vendas Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/[0.04]' : 'border-slate-100'}`}>
                {['Comprador','Itens','Total','Fotografo','Hora'].map(h => (
                  <th key={h} className={`text-left text-xs font-medium px-5 py-3 ${txtSecondary}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSales.map(s => (
                <tr key={s.id} className={`border-b ${isDark ? 'border-white/[0.02] hover:bg-white/[0.02]' : 'border-slate-50 hover:bg-slate-50'} transition-colors`}>
                  <td className={`px-5 py-3 text-sm ${isDark?'text-slate-300':'text-slate-600'}`}>{s.buyer}</td>
                  <td className={`px-5 py-3 text-sm ${txtSecondary}`}>{s.items}</td>
                  <td className="px-5 py-3 text-sm font-mono text-sand-500">{formatPrice(s.total)}</td>
                  <td className={`px-5 py-3 text-sm ${txtSecondary}`}>{s.photographer}</td>
                  <td className={`px-5 py-3 text-sm ${isDark?'text-slate-500':'text-slate-400'}`}>{s.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function UploadView({ isDark, txtPrimary }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-display font-bold ${txtPrimary}`}>Upload de Sessao</h2>
        <p className={`text-sm mt-1 ${isDark?'text-slate-400':'text-slate-500'}`}>Envie uma pasta com a estrutura de sessoes</p>
      </div>
      <Card className="p-12" hoverable={false}>
        <div className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${isDark?'border-white/[0.08] hover:border-ocean-500/30':'border-slate-200 hover:border-ocean-400'}`}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-ocean-500/10 flex items-center justify-center">
            <Upload size={28} className="text-ocean-400" />
          </div>
          <p className={`text-lg font-display font-semibold ${txtPrimary} mb-2`}>Arraste uma pasta aqui</p>
          <p className={`text-sm ${isDark?'text-slate-400':'text-slate-500'} mb-6`}>ou clique para selecionar</p>
          <div className={`inline-flex items-center gap-2 text-xs ${isDark?'text-slate-500 bg-white/[0.03]':'text-slate-400 bg-slate-50'} px-4 py-2 rounded-lg`}>
            Estrutura: Data / Horario / Lado / Surfista / Arquivos
          </div>
        </div>
      </Card>
    </div>
  )
}

function ClubsManagerView({ isDark, txtPrimary, txtSecondary }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-2xl font-display font-bold ${txtPrimary}`}>Clubes & Eventos</h2>
          <p className={`text-sm mt-1 ${txtSecondary}`}>Gerenciar localizacoes e eventos</p>
        </div>
        <button className="btn-primary !px-4 !py-2 text-sm flex items-center gap-2">
          <Plus size={16} /> Novo Clube
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club, idx) => {
          const clubEvents = events.filter(e => e.clubId === club.id)
          return (
            <div key={club.id} className={`opacity-0 animate-slide-in-up stagger-${idx + 1}`}>
              <Card className="p-5" hoverable={false}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark?'bg-ocean-500/10':'bg-ocean-50'}`}>
                    <Building2 size={18} className="text-ocean-500" />
                  </div>
                  <div>
                    <h4 className={`font-display font-semibold ${txtPrimary}`}>{club.name}</h4>
                    <span className={`text-xs ${txtSecondary}`}>{club.location}</span>
                  </div>
                </div>
                <p className={`text-xs mb-3 ${txtSecondary}`}>{club.description}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="ocean"><Calendar size={11} className="mr-1" />{clubEvents.length} eventos</Badge>
                  <Badge variant={club.active ? 'ocean' : 'muted'}>{club.active ? 'Ativo' : 'Inativo'}</Badge>
                </div>
              </Card>
            </div>
          )
        })}
      </div>

      <div>
        <h3 className={`font-display font-semibold text-lg mb-4 ${txtPrimary}`}>Todos os Eventos</h3>
        <div className="space-y-3">
          {events.map((evt) => {
            const club = clubs.find(c => c.id === evt.clubId)
            return (
              <Card key={evt.id} className="p-4" hoverable={false}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark?'bg-sunset-500/10':'bg-sunset-50'}`}>
                      <Calendar size={16} className="text-sunset-500" />
                    </div>
                    <div>
                      <span className={`font-display font-semibold ${txtPrimary}`}>{evt.title}</span>
                      <div className={`flex items-center gap-2 text-xs ${txtSecondary}`}>
                        <MapPin size={11} />{club?.name}
                        <span>{evt.date}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={evt.status === 'ativo' ? 'ocean' : 'muted'}>{evt.status}</Badge>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PhotographersView({ isDark, txtPrimary, txtSecondary }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-display font-bold ${txtPrimary}`}>Fotografos</h2>
        <p className={`text-sm mt-1 ${txtSecondary}`}>Gerenciar equipe e comissoes</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photographers.map((ph, idx) => (
          <div key={ph.id} className={`opacity-0 animate-slide-in-up stagger-${idx + 1}`}>
            <Card className="p-5" hoverable={false}>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center text-white font-bold">
                  {ph.initials}
                </div>
                <div>
                  <h4 className={`font-display font-semibold ${txtPrimary}`}>{ph.name}</h4>
                  <span className={`text-sm ${txtSecondary}`}>Comissao: {(ph.commission * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Badge variant={ph.active ? 'ocean' : 'muted'}>{ph.active ? 'Ativo' : 'Inativo'}</Badge>
                <span className={`text-xs ${txtSecondary}`}>R$ 3.420 vendido</span>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommissionsView({ isDark, txtPrimary, txtSecondary }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-display font-bold ${txtPrimary}`}>Comissoes</h2>
        <p className={`text-sm mt-1 ${txtSecondary}`}>Acompanhe pagamentos e metas</p>
      </div>
      <div className="grid gap-4">
        {photographers.map((ph, idx) => {
          const sold = [3420, 2810, 2200][idx]
          const commission = sold * ph.commission
          const goal = 70 + idx * 10
          return (
            <div key={ph.id} className={`opacity-0 animate-slide-in-up stagger-${idx + 1}`}>
              <Card className="p-5" hoverable={false}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center text-white text-sm font-bold">{ph.initials}</div>
                    <div>
                      <h4 className={`font-display font-semibold ${txtPrimary}`}>{ph.name}</h4>
                      <span className={`text-xs ${txtSecondary}`}>{(ph.commission * 100).toFixed(0)}% de comissao</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-sand-500">{formatPrice(commission)}</div>
                    <span className={`text-xs ${txtSecondary}`}>a receber</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className={txtSecondary}>Meta mensal</span>
                    <span className={txtSecondary}>{goal}% alcancado</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark?'bg-white/[0.06]':'bg-slate-100'}`}>
                    <div className="h-full bg-gradient-to-r from-ocean-500 to-ocean-400 rounded-full" style={{ width: `${goal}%` }} />
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Badge variant="ocean">Vendas: {formatPrice(sold)}</Badge>
                  <Badge variant="gold">Comissao: {formatPrice(commission)}</Badge>
                  <Badge variant="muted">Pendente</Badge>
                </div>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}
