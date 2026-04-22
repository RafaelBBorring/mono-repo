import { useState } from 'react'

const styles = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fadeInUp 0.6s ease-out both;
}
`

function RuneCircle() {
  return (
    <svg viewBox="0 0 200 200" className="w-28 h-28 mx-auto mb-4 text-gold opacity-60" fill="none" stroke="currentColor">
      <circle cx="100" cy="100" r="95" strokeWidth="0.5" strokeDasharray="4 6" />
      <circle cx="100" cy="100" r="80" strokeWidth="0.8" />
      <circle cx="100" cy="100" r="60" strokeWidth="0.5" strokeDasharray="2 4" />
      <polygon points="100,20 180,100 100,180 20,100" strokeWidth="0.7" />
      <polygon points="100,40 160,100 100,160 40,100" strokeWidth="0.5" opacity="0.5" />
      <line x1="100" y1="5" x2="100" y2="195" strokeWidth="0.4" opacity="0.4" />
      <line x1="5" y1="100" x2="195" y2="100" strokeWidth="0.4" opacity="0.4" />
      <circle cx="100" cy="20" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="100" cy="180" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="100" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="180" cy="100" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="100" cy="100" r="6" fill="currentColor" opacity="0.3" />
    </svg>
  )
}

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Informe o nome do jogador.')
      return
    }
    localStorage.setItem('olympo_user', trimmed)
    onLogin(trimmed)
  }

  const handleGuest = () => {
    const guest = 'Convidado'
    localStorage.setItem('olympo_user', guest)
    onLogin(guest)
  }

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-void flex items-center justify-center px-4">
        <div className="animate-fade-in-up w-full max-w-md bg-deep border-2 border-gold/60 rounded-lg p-8 shadow-lg shadow-gold/5">
          <RuneCircle />

          <h1 className="font-cinzel text-gold text-3xl text-center tracking-wide">
            SISTEMA OLYMPO 2.0
          </h1>
          <p className="text-txt-dim text-center text-sm mt-1 mb-8">
            Criador de Personagens
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-txt-dim text-sm mb-1">Nome do Jogador</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError('') }}
                className="w-full bg-void border border-sep text-txt-main rounded px-3 py-2 text-sm focus:outline-none focus:border-gold transition-colors"
                placeholder="Seu nome..."
                autoFocus
              />
              {error && <p className="text-err text-xs mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-gold text-void font-semibold py-2 rounded hover:bg-gold-light transition-colors text-sm"
            >
              Entrar
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={handleGuest}
              className="text-txt-dim text-sm hover:text-gold transition-colors underline underline-offset-2"
            >
              Entrar como Convidado
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
