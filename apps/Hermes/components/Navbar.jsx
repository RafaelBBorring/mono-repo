'use client';

import { useEffect, useState } from 'react';
import HermesMark from './HermesMark';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const triggerRescan = () => {
    if (busy) return;
    setBusy(true);
    window.dispatchEvent(new CustomEvent('hermes:rescan'));
    setTimeout(() => setBusy(false), 3500);
  };

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'py-2' : 'py-3'}`}>
      <div className="mx-auto max-w-7xl px-4">
        <nav className={`flex items-center justify-between gap-4 rounded-2xl px-4 py-2.5 transition-all duration-300 ${scrolled ? 'surface shadow-card' : 'border border-transparent'}`}>
          <a href="#top" className="flex items-center gap-2.5">
            <HermesMark size={30} />
            <div className="leading-none">
              <div className="font-display text-[0.95rem] font-bold tracking-[0.16em] text-ivory">HERMES</div>
              <div className="text-[0.55rem] tracking-[0.28em] text-dusk uppercase mt-0.5">Radar de Licitações</div>
            </div>
          </a>

          <div className="hidden md:flex items-center gap-1 text-sm">
            <a href="#radar" className="px-3 py-1.5 rounded-lg text-dusk hover:text-ivory hover:bg-white/4 transition-colors text-[0.86rem]">Radar</a>
            <a href="#fontes" className="px-3 py-1.5 rounded-lg text-dusk hover:text-ivory hover:bg-white/4 transition-colors text-[0.86rem]">Fontes</a>
            <a href="#como-funciona" className="px-3 py-1.5 rounded-lg text-dusk hover:text-ivory hover:bg-white/4 transition-colors text-[0.86rem]">Como funciona</a>
          </div>

          <button onClick={triggerRescan} disabled={busy} className="btn-primary text-xs">
            <span className={busy ? 'animate-pulse' : ''}>{busy ? '⟳' : '↻'}</span>
            <span className="hidden sm:inline">{busy ? 'Varrendo…' : 'Nova varredura'}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
