import React, { useState } from 'react'
import { User, Shield, Eye, EyeOff, Waves } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../ui/Modal'

export default function LoginModal({ isOpen, onClose }) {
  const { loginClient, loginGuest, loginAdmin } = useAuth()
  const [tab, setTab] = useState('client')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [guestName, setGuestName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')

  const handleClientLogin = (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Preencha todos os campos'); return }
    loginClient(email, password)
    onClose()
    resetForm()
  }

  const handleGuestLogin = (e) => {
    e.preventDefault()
    if (!guestName) { setError('Informe seu nome'); return }
    loginGuest(guestName)
    onClose()
    resetForm()
  }

  const handleAdminLogin = (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Preencha todos os campos'); return }
    const ok = loginAdmin(email, password)
    if (!ok) { setError('Credenciais invalidas'); return }
    onClose()
    resetForm()
  }

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setGuestName('')
    setError('')
    setShowPass(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); resetForm() }} title="Entrar">
      <div className="flex mb-6 bg-white/[0.03] rounded-xl p-1">
        <button
          onClick={() => { setTab('client'); setError('') }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === 'client' ? 'bg-ocean-500/20 text-ocean-400 shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          <User size={16} /> Cliente
        </button>
        <button
          onClick={() => { setTab('admin'); setError('') }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === 'admin' ? 'bg-sunset-500/20 text-sunset-400 shadow-sm' : 'text-slate-400 hover:text-white'}`}
        >
          <Shield size={16} /> Administrador
        </button>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400">{error}</div>
      )}

      {tab === 'client' ? (
        <form onSubmit={handleGuestLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Seu nome</label>
            <input
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder="Como podemos te chamar?"
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-slate-600 focus:outline-none focus:border-ocean-500/50 transition-colors"
            />
          </div>
          <button type="submit" className="w-full btn-primary text-center">
            Entrar como Visitante
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-slate-600">ou</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-slate-600 focus:outline-none focus:border-ocean-500/50 transition-colors"
            />
          </div>
          <div className="relative">
            <label className="block text-sm text-slate-400 mb-1.5">Senha</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-slate-600 focus:outline-none focus:border-ocean-500/50 transition-colors pr-10"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-[38px] text-slate-500 hover:text-slate-300">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button type="button" onClick={handleClientLogin} className="w-full btn-ghost border border-ocean-500/30 text-ocean-400 hover:bg-ocean-500/10">
            Entrar com Email
          </button>
        </form>
      ) : (
        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-sunset-500/5 border border-sunset-500/10">
            <Shield size={18} className="text-sunset-400" />
            <span className="text-sm text-sunset-300">Acesso restrito a fotografos e administradores</span>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ctsurf.com"
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-slate-600 focus:outline-none focus:border-sunset-500/50 transition-colors"
            />
          </div>
          <div className="relative">
            <label className="block text-sm text-slate-400 mb-1.5">Senha</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Senha de administrador"
              className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white placeholder:text-slate-600 focus:outline-none focus:border-sunset-500/50 transition-colors pr-10"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-[38px] text-slate-500 hover:text-slate-300">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button type="submit" className="w-full btn-sunset flex items-center justify-center gap-2">
            <Waves size={18} />
            Entrar como Admin
          </button>
          <p className="text-xs text-slate-600 text-center mt-2">Demo: admin@ctsurf.com / admin123</p>
        </form>
      )}
    </Modal>
  )
}
