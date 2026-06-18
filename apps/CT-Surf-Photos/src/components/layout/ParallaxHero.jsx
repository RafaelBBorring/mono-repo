import React, { useRef, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext'

export default function ParallaxHero({ onNavigate }) {
  const containerRef = useRef(null)
  const { isDark } = useTheme()

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return
      const scrollY = window.scrollY
      const layers = containerRef.current.querySelectorAll('[data-speed]')
      layers.forEach(layer => {
        const speed = parseFloat(layer.dataset.speed)
        layer.style.transform = `translateY(${scrollY * speed}px)`
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div data-speed="0.1" className="absolute inset-0">
        <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-br from-ocean-950 via-[#0a0e17] to-ocean-900/50' : 'bg-gradient-to-br from-sky-100 via-[#f0f4f8] to-ocean-200/50'}`} />
        <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] animate-float ${isDark ? 'bg-ocean-500/10' : 'bg-sky-300/20'}`} />
        <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] animate-wave ${isDark ? 'bg-sunset-500/8' : 'bg-orange-200/20'}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border rounded-full ${isDark ? 'border-ocean-500/10' : 'border-sky-300/30'}`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border rounded-full ${isDark ? 'border-ocean-500/5' : 'border-sky-300/20'}`} />
      </div>

      <div data-speed="0.3" className={`absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t to-transparent z-10 ${isDark ? 'from-[#0a0e17]' : 'from-[#f0f4f8]'}`} />

      <div data-speed="0.15" className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 200" className="w-full" preserveAspectRatio="none">
          <path d="M0,100 C240,150 480,50 720,100 C960,150 1200,50 1440,100 L1440,200 L0,200 Z" fill={isDark ? 'rgba(14,165,233,0.05)' : 'rgba(14,165,233,0.08)'} />
          <path d="M0,120 C360,170 720,70 1080,120 C1260,145 1350,95 1440,120 L1440,200 L0,200 Z" fill={isDark ? 'rgba(14,165,233,0.03)' : 'rgba(14,165,233,0.05)'} />
        </svg>
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8 animate-fade-in ${isDark ? 'bg-ocean-500/10 border border-ocean-500/20' : 'bg-sky-100 border border-sky-200'}`}>
          <span className="w-2 h-2 rounded-full bg-ocean-400 animate-pulse" />
          <span className={`text-sm font-medium ${isDark ? 'text-ocean-300' : 'text-ocean-600'}`}>Sessoes disponiveis hoje</span>
        </div>

        <h1 data-speed="-0.05" className="text-5xl sm:text-7xl lg:text-8xl font-display font-bold leading-[0.9] mb-6">
          <span className={isDark ? 'text-white' : 'text-slate-900'}>Capture</span><br />
          <span className="text-gradient-ocean">Every Wave</span>
        </h1>

        <p data-speed="-0.03" className={`text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Fotografias e videos profissionais de surf. Encontre suas melhores ondas capturadas pelos nossos fotografos.
        </p>

        <div data-speed="-0.02" className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={() => onNavigate('sessions')} className="btn-sunset text-lg !px-8 !py-4 flex items-center gap-3">
            <span>Explorar Sessoes</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </button>
          <button onClick={() => onNavigate('clubs')} className={`btn-ghost !px-6 !py-3.5 text-base border ${isDark ? 'border-white/10' : 'border-slate-300'}`}>
            Nossos Clubes
          </button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-8 max-w-md mx-auto">
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-gradient-ocean">500+</div>
            <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Fotos/Semana</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-gradient-sunset">3</div>
            <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Clubes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-display font-bold text-gradient-ocean">200+</div>
            <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Surfistas</div>
          </div>
        </div>
      </div>
    </section>
  )
}
