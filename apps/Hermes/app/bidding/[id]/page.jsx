'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import HermesMark from '@/components/HermesMark';
import { urgencyColor, scopeMeta, formatCurrency, formatDate, daysUntil, normalizeApplyUrl, normalizeDocumentUrl } from '@/lib/format';

export default function BiddingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = decodeURIComponent(params?.id || '');
  const [bidding, setBidding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisSource, setAnalysisSource] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/biddings?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        const data = await res.json();
        setBidding(data.bidding || null);
      } catch {
        setBidding(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const analyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/analyze?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.ok && data.bidding) {
        setBidding(data.bidding);
        setAnalysisSource(data.source || '');
      }
    } catch {
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 pt-32">
          <div className="surface rounded-2xl p-10 animate-pulse h-96" />
        </div>
      </main>
    );
  }

  if (!bidding) {
    return (
      <main className="relative min-h-screen">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 pt-40 text-center">
          <div className="flex justify-center mb-4"><HermesMark size={52} /></div>
          <h1 className="font-display text-2xl mb-2 text-ivory">Edital não encontrado</h1>
          <p className="text-dusk text-sm mb-6">Esta oportunidade não está no registro do Hermes.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => router.push('/')} className="btn-primary text-sm">← Voltar ao radar</button>
            <button onClick={() => { window.dispatchEvent(new CustomEvent('hermes:rescan')); router.push('/'); }} className="btn-secondary text-sm">Nova varredura</button>
          </div>
        </div>
      </main>
    );
  }

  const analysis = bidding.analysis;
  const u = urgencyColor(analysis?.nivelUrgencia || bidding.urgency);
  const s = scopeMeta(bidding.scope);
  const days = daysUntil(bidding.deadlineAt);
  const applyHref = normalizeApplyUrl(bidding.applyUrl, bidding);
  const docHref = normalizeDocumentUrl(bidding.documentUrl, bidding);
  const isSeed = bidding.source === 'SEED';

  return (
    <main className="relative min-h-screen">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 pt-32 pb-20">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-dusk hover:text-mint-light transition-colors mb-5">
          ← Radar
        </Link>

        <div className="surface rounded-2xl p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`chip ${s.bg} ${s.color} ${s.ring} ring-1`}>{s.icon} {s.label}</span>
            <span className="chip surface-2">{bidding.source}</span>
            {bidding.modality && <span className="chip surface-2">{bidding.modality}</span>}
            {bidding.situacao && <span className="chip surface-2">{bidding.situacao}</span>}
            <span className={`chip ring-1 ${u.ring} ${u.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${u.dot}`} /> {labelUrgency(analysis?.nivelUrgencia || bidding.urgency)}
            </span>
          </div>

          <h1 className="font-display text-xl sm:text-3xl font-bold text-ivory leading-tight text-balance">{bidding.title}</h1>
          <p className="text-dusk mt-2 text-sm">{bidding.organ}{bidding.region ? ` · ${bidding.region}` : ''}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <Meta label="Valor estimado" value={formatCurrency(bidding.estimatedValue) || '—'} accent="text-mint-light" />
            <Meta label="Prazo final" value={days != null ? (days < 0 ? 'Encerrado' : `${days} dias`) : '—'} accent={days != null && days >= 0 ? u.text : 'text-dusk'} sub={formatDate(bidding.deadlineAt)} />
            <Meta label="Publicado em" value={formatDate(bidding.publishedAt)} accent="text-ivory" />
            <Meta label="Match (IA)" value={analysis ? `${analysis.scoreMatch}/100` : '—'} accent="text-sky-light" />
          </div>

          {!isSeed && (
            <div className="flex flex-wrap items-center gap-3 mt-6">
              <a href={applyHref} target="_blank" rel="noopener noreferrer nofollow" className="btn-primary text-sm">
                Candidatar-se ↗
              </a>
              <a href={docHref} target="_blank" rel="noopener noreferrer nofollow" className="btn-secondary text-sm">Ver edital ↗</a>
              <button onClick={analyze} disabled={analyzing} className="btn-secondary text-sm">
                <span className={analyzing ? 'animate-pulse' : ''}>{analyzing ? '⟳' : '✦'}</span>
                {analyzing ? 'Decifrando…' : analysis ? 'Reanalisar' : 'Decifrar com IA'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
          <div className="lg:col-span-2 space-y-5">
            {analysis ? (
              <div className="surface rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-display text-lg text-ivory">Decifração</h2>
                  <span className={`chip text-[0.56rem] font-mono ${analysis.source === 'heuristic' ? 'text-amber2' : 'text-mint-light'}`}>
                    {analysisSource || analysis.source || 'ia'}{analysis.model && analysis.model !== 'hermes-heuristic' ? ` · ${analysis.model}` : ''}
                  </span>
                </div>
                <Block title="Resumo executivo">
                  <p className="text-sm text-ivory/85 leading-relaxed">{analysis.resumoExecutivo}</p>
                </Block>
                {analysis.requisitosObrigatorios?.length > 0 && (
                  <Block title="Requisitos obrigatórios">
                    <ul className="space-y-1.5">
                      {analysis.requisitosObrigatorios.map((r, i) => (
                        <li key={i} className="text-sm text-ivory/85 flex gap-2"><span className="text-mint mt-0.5">◆</span> {r}</li>
                      ))}
                    </ul>
                  </Block>
                )}
                {analysis.stackExigida?.length > 0 && (
                  <Block title="Stack / tecnologias">
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.stackExigida.map((st, i) => (
                        <span key={i} className="chip bg-sky/5 text-sky-light ring-1 ring-sky/15 font-mono text-[0.6rem]">{st}</span>
                      ))}
                    </div>
                  </Block>
                )}
                {analysis.faixaFinanceira && (
                  <Block title="Faixa financeira">
                    <p className="text-sm text-ivory/85 font-mono">{analysis.faixaFinanceira}</p>
                  </Block>
                )}
              </div>
            ) : (
              <div className="surface rounded-2xl p-8 text-center">
                <div className="text-3xl mb-3 text-sky-light/70">✧</div>
                <h3 className="font-display text-lg text-ivory mb-1">Decifração disponível</h3>
                <p className="text-dusk text-sm mb-5">Gere resumo, requisitos e stack exigida com IA.</p>
                <button onClick={analyze} disabled={analyzing} className="btn-primary text-sm">
                  <span className={analyzing ? 'animate-pulse' : ''}>✧</span> {analyzing ? 'Decifrando…' : 'Decifrar com IA'}
                </button>
              </div>
            )}

            {bidding.description && (
              <div className="surface rounded-2xl p-6">
                <h3 className="font-display text-base text-ivory mb-3">Objeto da compra</h3>
                <p className="text-sm text-dusk leading-relaxed whitespace-pre-wrap">{bidding.description}</p>
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <div className="surface rounded-2xl p-5">
              <h3 className="font-display text-sm text-ivory mb-3">Identificação</h3>
              <Row label="Fonte" value={bidding.source} />
              <Row label="Órgão" value={bidding.organ} />
              {bidding.modality && <Row label="Modalidade" value={bidding.modality} />}
              {bidding.region && <Row label="Região" value={bidding.region} />}
              {bidding.pncpControl && <Row label="Controle PNCP" value={bidding.pncpControl} mono />}
            </div>

            <div className="surface-2 rounded-2xl p-5">
              <h3 className="font-display text-sm text-amber2 mb-2">Atenção</h3>
              <p className="text-xs text-dusk leading-relaxed">
                A análise por IA é um atalho, não substitui a leitura integral. Confira prazos e documentos no edital oficial.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Meta({ label, value, sub, accent }) {
  return (
    <div className="surface rounded-xl p-4">
      <div className="text-[0.56rem] uppercase tracking-wider text-dusk">{label}</div>
      <div className={`text-base font-mono ${accent} mt-1`}>{value}</div>
      {sub && <div className="text-[0.6rem] text-dusk/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div className="mt-5 first:mt-0">
      <div className="text-[0.56rem] tracking-[0.18em] uppercase text-dusk mb-2">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-dusk">{label}</span>
      <span className={`text-xs text-ivory/85 text-right ${mono ? 'font-mono break-all' : ''}`}>{value || '—'}</span>
    </div>
  );
}

function labelUrgency(l) {
  return { critico: 'Crítico', alto: 'Alto', medio: 'Médio', baixo: 'Baixo' }[l] || '—';
}
