import React, { useState } from 'react'
import { useHashRoute } from '../../hooks/useHashRoute.js'
import { isAIConfigured } from '../../lib/ai.js'
import { useDatabase } from '../../contexts/DatabaseContext.jsx'
import DatabasePanel from '../ui/DatabasePanel.jsx'

const NAV = [
  { to: '', label: 'Início', icon: 'bi-house' },
  { to: 'biblioteca', label: 'Biblioteca', icon: 'bi-collection' },
  { to: 'novo', label: 'Nova Ficha', icon: 'bi-plus-square' },
  { to: 'quadros', label: 'Quadros', icon: 'bi-grid-3x3-gap' }
]

export default function AppShell({ children }) {
  const { route, navigate } = useHashRoute()
  const current = route.path[0] || ''
  const aiOn = isAIConfigured()
  const db = useDatabase()
  const [showDb, setShowDb] = useState(false)
  const dbColor = db.status === 'connected' ? '#2ecc71' : db.status === 'pending' ? '#f1c40f' : '#9b59b6'
  const dbLabel = { checking: 'Banco…', local: 'Banco local', connected: db.fileName || 'Arquivo', pending: 'Reconectar' }[db.status]

  return (
    <div id="drako-app" className="d-flex flex-column min-vh-100">
      <header className="sticky-top glass" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <div className="container-fluid d-flex align-items-center justify-content-between px-3 py-2">
          <button className="d-flex align-items-center gap-2" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('')}>
            <span style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'linear-gradient(135deg,#f6d98c,#c8921b 50%,#543c0a)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 18px rgba(224,173,51,0.4)'
            }}>
              <i className="bi bi-dragon-fill" style={{ color: '#1a1408', fontSize: '1.2rem' }} />
            </span>
            <div className="text-start">
              <div className="font-display gold-text" style={{ fontSize: '1.05rem', lineHeight: 1 }}>System-Drako</div>
              <div className="text-muted-drako" style={{ fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Forjador de Fichas</div>
            </div>
          </button>

          <nav className="d-none d-md-flex align-items-center gap-1">
            {NAV.map((n) => {
              const active = (n.to || '') === current
              return (
                <button key={n.label} className="btn-ghost d-flex align-items-center gap-2" style={active ? { borderColor: 'rgba(224,173,51,0.7)', background: 'rgba(224,173,51,0.1)' } : {}} onClick={() => navigate(n.to)}>
                  <i className={`bi ${n.icon}`} />
                  <span style={{ fontSize: '0.82rem' }}>{n.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="d-flex align-items-center gap-2">
            <button className="d-flex align-items-center gap-1 btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', color: dbColor, borderColor: 'rgba(224,173,51,0.25)' }} onClick={() => setShowDb(true)} title="Banco de dados">
              <i className="bi bi-database-fill" />
              <span style={{ width: 7, height: 7, borderRadius: 999, background: dbColor, boxShadow: `0 0 8px ${dbColor}`, display: 'inline-block' }} />
              <span className="d-none d-lg-inline" style={{ color: 'var(--drako-muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dbLabel}</span>
            </button>
            <span className="d-flex align-items-center gap-1" title={aiOn ? 'Oráculo (IA) conectado' : 'Configure VITE_OPENROUTER_API_KEY no .env'} style={{ fontSize: '0.72rem', color: aiOn ? '#7bd88f' : 'var(--drako-muted)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: aiOn ? '#27ae60' : '#7f8c8d', boxShadow: aiOn ? '0 0 8px #27ae60' : 'none', display: 'inline-block' }} />
              <span className="d-none d-lg-inline">{aiOn ? 'Oráculo Online' : 'Oráculo Offline'}</span>
            </span>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="d-md-none d-flex overflow-auto px-2 pb-2 gap-1">
          {NAV.map((n) => {
            const active = (n.to || '') === current
            return (
              <button key={n.label} className="btn-ghost d-flex align-items-center gap-1" style={active ? { borderColor: 'rgba(224,173,51,0.7)' } : {}} onClick={() => navigate(n.to)}>
                <i className={`bi ${n.icon}`} /><span style={{ fontSize: '0.78rem' }}>{n.label}</span>
              </button>
            )
          })}
        </div>
      </header>

      <main className="flex-grow-1">{children}</main>

      <footer className="text-center text-muted-drako py-3" style={{ fontSize: '0.72rem' }}>
        System-Drako · d6 puro por atributos · Banco local (IndexedDB) + arquivo opcional
      </footer>

      <DatabasePanel open={showDb} onClose={() => setShowDb(false)} />
    </div>
  )
}
