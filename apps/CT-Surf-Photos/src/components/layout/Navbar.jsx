import React, { useState, useEffect } from 'react'
import { ShoppingCart, Camera, Menu, X, User, LogOut, Sun, Moon } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

export default function Navbar({ onNavigate }) {
  const { items } = useCart()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setMobileOpen(false)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  const navBg = isDark ? 'bg-[rgba(10,14,23,0.8)]' : 'bg-[rgba(240,244,248,0.85)]'
  const borderColor = isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 ${navBg} backdrop-blur-xl border-b ${borderColor} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => onNavigate('')} className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center shadow-lg shadow-ocean-500/20 group-hover:shadow-ocean-500/40 transition-shadow">
            <Camera size={18} className="text-white" />
          </div>
          <span className={`font-display font-bold text-lg hidden sm:block ${isDark ? 'text-white' : 'text-slate-900'}`}>
            CT <span className="text-gradient-ocean">Surf Photos</span>
          </span>
        </button>

        <div className="hidden md:flex items-center gap-1">
          <button onClick={() => onNavigate('sessions')} className="btn-ghost px-4 py-2 text-sm font-medium">
            Sessoes
          </button>
          <button onClick={() => onNavigate('clubs')} className="btn-ghost px-4 py-2 text-sm font-medium">
            Clubes
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={toggle} className={`p-2.5 rounded-xl hover:bg-white/10 transition-all ${isDark ? 'text-sand-400' : 'text-ocean-600'}`}>
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          <button onClick={() => onNavigate('cart')} className="relative p-2.5 rounded-xl hover:bg-white/10 transition-colors group">
            <ShoppingCart size={20} className={isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'} />
            {items.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-to-r from-sunset-500 to-sunset-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-sunset-500/30">
                {items.length}
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-ocean-500 to-ocean-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {user.name[0].toUpperCase()}
                </div>
                <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{user.name}</span>
                {isAdmin && <span className="text-[10px] font-bold text-sunset-500 bg-sunset-500/15 px-1.5 py-0.5 rounded">ADMIN</span>}
              </div>
              {isAdmin && <button onClick={() => onNavigate('admin')} className="btn-ghost text-sm">Dashboard</button>}
              <button onClick={logout} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button onClick={() => onNavigate('login')} className="hidden md:flex btn-primary text-sm !px-4 !py-2 items-center gap-2">
              <User size={16} /> Entrar
            </button>
          )}

          <button onClick={() => setMobileOpen(!mobileOpen)} className={`md:hidden p-2 rounded-lg hover:bg-white/10 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className={`md:hidden border-t ${borderColor} ${isDark ? 'bg-[rgba(10,14,23,0.97)]' : 'bg-[rgba(240,244,248,0.97)]'} backdrop-blur-xl animate-slide-in-up`}>
          <div className="px-4 py-3 space-y-1">
            <button onClick={() => { onNavigate('sessions'); setMobileOpen(false) }} className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}>
              Sessoes
            </button>
            <button onClick={() => { onNavigate('clubs'); setMobileOpen(false) }} className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}>
              Clubes
            </button>
            {isAuthenticated ? (
              <>
                {isAdmin && <button onClick={() => { onNavigate('admin'); setMobileOpen(false) }} className={`block w-full text-left px-4 py-2.5 rounded-lg text-sm ${isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}>Admin</button>}
                <button onClick={() => { logout(); setMobileOpen(false) }} className="block w-full text-left px-4 py-2.5 rounded-lg text-rose-400 hover:bg-white/5 text-sm">Sair</button>
              </>
            ) : (
              <button onClick={() => { onNavigate('login'); setMobileOpen(false) }} className="block w-full text-left px-4 py-2.5 rounded-lg text-ocean-400 hover:bg-white/5 text-sm font-medium">Entrar</button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
