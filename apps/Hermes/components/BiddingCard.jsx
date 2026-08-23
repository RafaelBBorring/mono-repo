'use client';

import Link from 'next/link';
import { urgencyColor, scopeMeta, formatCurrency, daysUntil, normalizeApplyUrl } from '@/lib/format';

export default function BiddingCard({ bidding, onAnalyze, analyzing }) {
  const analysis = bidding.analysis;
  const u = urgencyColor(analysis?.nivelUrgencia || bidding.urgency);
  const s = scopeMeta(bidding.scope);
  const days = daysUntil(bidding.deadlineAt);
  const expired = days != null && days < 0;
  const applyHref = normalizeApplyUrl(bidding.applyUrl, bidding);
  const urgencyLabel = analysis?.nivelUrgencia || bidding.urgency;
  const detailHref = `/bidding/${encodeURIComponent(bidding.id)}`;
  const isSeed = bidding.source === 'SEED';

  return (
    <article className="card-hover surface rounded-2xl p-5 flex flex-col gap-3.5 relative overflow-hidden h-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`chip ${s.bg} ${s.color} ${s.ring} ring-1`}>{s.icon} {s.label}</span>
          <span className="chip surface-2">{bidding.source}</span>
          {bidding.modality && <span className="chip surface-2">{bidding.modality}</span>}
        </div>
        <span className={`chip ring-1 ${u.ring} ${u.text} shrink-0`}>
          <span className={`h-1.5 w-1.5 rounded-full ${u.dot} ${urgencyLabel === 'critico' ? 'animate-pulse' : ''}`} />
          {urgencyLabel ? labelUrgency(urgencyLabel) : '—'}
        </span>
      </div>

      <div>
        <h3 className="font-display text-[0.98rem] font-semibold leading-snug text-ivory line-clamp-2">
          <Link href={detailHref} className="stretched-link hover:text-mint-light transition-colors">
            {bidding.title}
          </Link>
        </h3>
        <div className="mt-1.5 text-xs text-dusk flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-ivory/75">{bidding.organ}</span>
          {bidding.region && (<><span className="text-white/15">•</span><span>{bidding.region}</span></>)}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-dusk line-clamp-3">
        {analysis?.resumoExecutivo ? truncate(analysis.resumoExecutivo, 150) : truncate(bidding.description || '', 150) || 'Abra o edital para decifrá-lo com IA.'}
      </p>

      <div className="mt-auto grid grid-cols-3 gap-2 pt-3 border-t border-white/6">
        <Stat label="Valor" value={formatCurrency(bidding.estimatedValue) || '—'} accent="text-mint-light" />
        <Stat label="Prazo" value={days != null ? (expired ? 'Encerrado' : `${days}d`) : '—'} accent={expired ? 'text-dusk line-through' : u.text} />
        <Stat label="Match" value={analysis?.scoreMatch != null ? `${analysis.scoreMatch}` : '—'} accent="text-sky-light" />
      </div>

      {!isSeed && (
        <div className="flex items-center gap-2 relative z-10">
          <a href={applyHref} target="_blank" rel="noopener noreferrer nofollow" className="btn-primary flex-1 text-xs !py-2">
            Candidatar-se
          </a>
          {!analysis && (
            <button onClick={() => onAnalyze?.(bidding.id)} disabled={analyzing} className="btn-secondary text-xs !py-2" title="Decifrar com IA">
              <span className={analyzing ? 'animate-pulse' : ''}>{analyzing ? '⟳' : '✦'}</span>
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="text-center">
      <div className="text-[0.54rem] uppercase tracking-wider text-dusk">{label}</div>
      <div className={`text-xs font-mono mt-0.5 ${accent} truncate`}>{value}</div>
    </div>
  );
}

function labelUrgency(l) {
  return { critico: 'Crítico', alto: 'Alto', medio: 'Médio', baixo: 'Baixo' }[l] || '—';
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n).trim() + '…' : s;
}
