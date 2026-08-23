'use client';

import AnimatedCounter from './AnimatedCounter';

export default function StatsBar({ biddings }) {
  const active = biddings.filter((b) => !b.expired && (!b.deadlineAt || new Date(b.deadlineAt).getTime() >= Date.now())).length;
  const closingSoon = biddings.filter((b) => {
    if (!b.deadlineAt || b.expired) return false;
    const days = (new Date(b.deadlineAt).getTime() - Date.now()) / 86400000;
    return days <= 7;
  }).length;
  const totalValue = biddings.reduce((acc, b) => acc + (Number(b.estimatedValue) || 0), 0);
  const analyzed = biddings.filter((b) => b.analysis).length;
  const avgMatch = analyzed
    ? Math.round(biddings.filter((b) => b.analysis).reduce((acc, b) => acc + (b.analysis.scoreMatch || 0), 0) / analyzed)
    : 0;

  const items = [
    { label: 'Editais ativos', value: active, accent: 'text-mint-light' },
    { label: 'Encerram em 7 dias', value: closingSoon, accent: 'text-amber2' },
    { label: 'Volume somado', value: totalValue, prefix: 'R$ ', format: true, accent: 'text-ivory' },
    { label: 'Match médio', value: avgMatch, suffix: '/100', accent: 'text-sky-light' }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it.label} className="surface rounded-xl p-4">
          <div className="text-[0.56rem] uppercase tracking-[0.16em] text-dusk">{it.label}</div>
          <div className={`mt-1.5 font-mono text-xl sm:text-2xl font-semibold ${it.accent}`}>
            <AnimatedCounter value={it.value} prefix={it.prefix || ''} suffix={it.suffix || ''} format={it.format} />
          </div>
        </div>
      ))}
    </div>
  );
}
