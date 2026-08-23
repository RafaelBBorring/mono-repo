'use client';

import dynamic from 'next/dynamic';
import HermesMark from './HermesMark';

const ThreeBackground = dynamic(() => import('./ThreeBackground'), { ssr: false });

export default function Hero({ liveCount = null }) {
  const goToRadar = () => {
    const el = document.getElementById('radar');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.dispatchEvent(new CustomEvent('hermes:rescan'));
  };

  return (
    <section id="top" className="relative min-h-[72vh] flex items-center overflow-hidden">
      <ThreeBackground />
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-28 pb-14 text-center">
        <div className="flex justify-center mb-6">
          <HermesMark size={56} />
        </div>

        <div className="inline-flex items-center gap-2 chip surface-2 mb-5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-mint opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-mint" />
          </span>
          <span className="text-mint-light tracking-[0.22em] uppercase text-[0.56rem]">PNCP ao vivo</span>
        </div>

        <h1 className="font-display text-4xl sm:text-6xl font-bold leading-[1.05] tracking-tight text-ivory">
          Encontre e <span className="text-mint">concorra</span><br className="hidden sm:block" /> a licitações de software
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-dusk text-sm sm:text-base leading-relaxed text-balance">
          Radar em tempo real sobre o PNCP. Filtra editais de desenvolvimento, jogos e TI,
          decifra o edital com IA e leva você direto à inscrição — dos pequenos (R$ 40 mil) aos grandes.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button onClick={goToRadar} className="btn-primary text-sm">
            Ver oportunidades →
          </button>
          <a href="#como-funciona" className="btn-secondary text-sm">Como funciona</a>
        </div>

        {liveCount != null && (
          <div className="mt-8 text-xs text-dusk">
            <span className="font-mono text-mint-light text-base">{liveCount}</span> editais ativos agora
          </div>
        )}
      </div>
    </section>
  );
}
