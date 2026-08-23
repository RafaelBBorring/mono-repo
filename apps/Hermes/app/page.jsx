'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Dashboard from '@/components/Dashboard';

export default function HomePage() {
  const [liveCount, setLiveCount] = useState(null);
  return (
    <main className="relative">
      <Navbar />
      <Hero liveCount={liveCount} />
      <Dashboard onLiveCount={setLiveCount} />

      <section id="como-funciona" className="relative mx-auto max-w-7xl px-4 py-20">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ivory">Como o Hermes trabalha</h2>
          <p className="text-dusk max-w-xl mx-auto text-sm mt-2">Quatro etapas autônomas, do voo do scout à inscrição.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {STEPS.map((s, i) => (
            <div key={s.name} className="surface rounded-2xl p-5 card-hover">
              <div className="font-mono text-[0.7rem] text-dusk mb-3">0{i + 1}</div>
              <div className="text-2xl text-mint mb-2">{s.glyph}</div>
              <h3 className="font-display text-base text-ivory">{s.name}</h3>
              <div className="text-[0.6rem] tracking-[0.18em] uppercase text-sky-light/80 mb-2.5">{s.role}</div>
              <p className="text-xs text-dusk leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="fontes" className="relative mx-auto max-w-7xl px-4 py-16">
        <div className="surface rounded-2xl p-7 sm:p-9">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-ivory mb-2">Fonte oficial</h2>
          <p className="text-dusk text-sm max-w-2xl mb-5">
            Todos os editais são capturados diretamente da <span className="text-mint-light">API pública do PNCP</span> (Portal Nacional de Contratações Públicas).
            O link de candidatura aponta para o portal eletrônico real onde a proposta deve ser entregue.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="chip surface-2"><span className="text-mint">●</span> PNCP / Compras.gov.br</span>
            <span className="chip surface-2">Editais ativos</span>
            <span className="chip surface-2">Software · TI · Games</span>
            <span className="chip surface-2">Sem cadastro necessário</span>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/6 mt-6">
        <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-dusk">Hermes · Radar de Licitações de Software &amp; Games</div>
          <div className="text-xs text-dusk text-center sm:text-right max-w-md">
            Dados do PNCP. Sempre confira o edital original antes de se candidatar.
          </div>
        </div>
      </footer>
    </main>
  );
}

const STEPS = [
  { name: 'Scout', role: 'Varredura', glyph: '✦', desc: 'Varre o PNCP em tempo real buscando editais de software, jogos e TI.' },
  { name: 'Inspector', role: 'Filtro', glyph: '◈', desc: 'Aplica a taxonomia de Software/Games, descarta ruído e extrai o objeto da compra.' },
  { name: 'Analyst', role: 'IA', glyph: '✧', desc: 'Decifra o edital via IA e devolve resumo, requisitos, stack e match score.' },
  { name: 'Publisher', role: 'Ação', glyph: '⬡', desc: 'Entrega o card com o link real de inscrição no portal eletrônico do órgão.' }
];
