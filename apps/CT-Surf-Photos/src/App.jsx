import React, { useState, useEffect, useCallback } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { ToastProvider } from './components/ui/Toast'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import ThreeBackdrop from './components/layout/ThreeBackdrop'
import ParallaxHero from './components/layout/ParallaxHero'
import SessionBrowser from './components/gallery/SessionBrowser'
import ClubsPage from './components/gallery/ClubsPage'
import MediaCard from './components/gallery/MediaCard'
import MediaPreview from './components/gallery/MediaPreview'
import CartSidebar from './components/cart/CartSidebar'
import LoginModal from './components/auth/LoginModal'
import AdminDashboard from './components/admin/AdminDashboard'
import { getSurferById } from './data/mockSessions'

function AppContent() {
  const [page, setPage] = useState('home')
  const [params, setParams] = useState({})
  const [cartOpen, setCartOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const { isAdmin } = useAuth()
  const { isDark } = useTheme()

  const parseHash = useCallback(() => {
    const hash = window.location.hash.replace('#/', '') || ''
    const [path, query] = hash.split('?')
    const parts = path.split('/')

    if (!path || path === '') {
      setPage('home'); setParams({})
    } else if (parts[0] === 'sessions') {
      setPage('sessions'); setParams({ query: query || '' })
    } else if (parts[0] === 'clubs') {
      setPage('clubs'); setParams({})
    } else if (parts[0] === 'surfer') {
      setPage('surfer'); setParams({ id: parts[1] || '' })
    } else if (parts[0] === 'preview') {
      setPage('preview'); setParams({ mediaId: parts[1] || '' })
    } else if (parts[0] === 'cart') {
      setCartOpen(true); setPage('home'); setParams({}); window.location.hash = '#/'
    } else if (parts[0] === 'login') {
      setLoginOpen(true); setPage('home'); setParams({}); window.location.hash = '#/'
    } else if (parts[0] === 'admin') {
      if (isAdmin) { setPage('admin'); setParams({}) }
      else { setLoginOpen(true); setPage('home'); window.location.hash = '#/' }
    } else {
      setPage('home'); setParams({})
    }
  }, [isAdmin])

  useEffect(() => {
    parseHash()
    window.addEventListener('hashchange', parseHash)
    return () => window.removeEventListener('hashchange', parseHash)
  }, [parseHash])

  const handleNavigate = useCallback((path) => {
    window.location.hash = '#/' + path
  }, [])

  const surfer = params.id ? getSurferById(params.id) : null
  const allMediaFlat = surfer ? surfer.media : []
  const currentPreviewMedia = params.mediaId && surfer ? surfer.media.find(m => m.id === params.mediaId) : null

  const showThree = page === 'home' || page === 'sessions' || page === 'clubs'
  const sceneType = page === 'home' ? 'ocean' : 'particles'

  const overlayGrad = isDark
    ? 'from-[#0a0e17] via-[rgba(10,14,23,0.5)] to-[#0a0e17]'
    : 'from-[#f0f4f8] via-[rgba(240,244,248,0.5)] to-[#f0f4f8]'

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0a0e17]' : 'bg-[#f0f4f8]'}`}>

      {showThree && <ThreeBackdrop key={sceneType} sceneType={sceneType} />}

      {showThree && (
        <div className={`fixed inset-0 z-[2] pointer-events-none bg-gradient-to-b ${overlayGrad}`} />
      )}

      <div className="relative z-10">
        <Navbar onNavigate={handleNavigate} />

        <main className="relative">
          {page === 'home' && <ParallaxHero onNavigate={handleNavigate} />}
          {page === 'sessions' && <SessionBrowser onNavigate={handleNavigate} />}
          {page === 'clubs' && <ClubsPage onNavigate={handleNavigate} />}

          {page === 'surfer' && surfer && (
            <div className={`pt-24 pb-16 px-4 sm:px-6 max-w-6xl mx-auto page-enter`}>
              <div className="mb-8">
                <button onClick={() => handleNavigate('sessions')} className={`text-sm transition-colors mb-3 inline-flex items-center gap-1 ${isDark ? 'text-ocean-400 hover:text-ocean-300' : 'text-ocean-600 hover:text-ocean-500'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  Voltar as sessoes
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-500 to-cyan-500 flex items-center justify-center text-3xl font-display font-bold text-white/30">
                    {surfer.name[0]}
                  </div>
                  <div>
                    <h1 className={`text-3xl font-display font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{surfer.name}</h1>
                    <div className={`flex items-center gap-3 mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>{surfer.sessionTime}</span>
                      <span className="text-slate-600">|</span>
                      <span className="capitalize">{surfer.side}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex flex-wrap items-center gap-4">
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{surfer.photoCount + surfer.videoCount} itens</span>
                  <span className="text-slate-600">|</span>
                  <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{surfer.photoCount} fotos + {surfer.videoCount} videos</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-sm font-mono text-sand-500">A partir de R$ 15</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {surfer.media.map((media, idx) => (
                  <div key={media.id} className={`opacity-0 animate-slide-in-up stagger-${Math.min(idx + 1, 6)}`}>
                    <MediaCard media={media} surferName={surfer.name} sessionTime={surfer.sessionTime} onPreview={(m) => handleNavigate(`preview/${m.id}`)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {page === 'admin' && isAdmin && <AdminDashboard />}
        </main>

        {(page === 'home' || page === 'clubs') && <Footer />}
      </div>

      <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} onNavigate={handleNavigate} />
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />

      {page === 'preview' && currentPreviewMedia && surfer && (
        <MediaPreview media={currentPreviewMedia} surfer={surfer} allMedia={allMediaFlat} onClose={() => handleNavigate(`surfer/${surfer.id}`)} onNavigate={handleNavigate} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
