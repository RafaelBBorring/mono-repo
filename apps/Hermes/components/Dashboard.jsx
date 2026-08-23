'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Filters from './Filters';
import StatsBar from './StatsBar';
import BiddingCard from './BiddingCard';
import StatusPill from './StatusPill';

const DEFAULT_FILTERS = { q: '', scope: 'all', sort: 'deadline' };

export default function Dashboard({ onLiveCount }) {
  const [biddings, setBiddings] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [note, setNote] = useState('');
  const [meta, setMeta] = useState(null);
  const debounceRef = useRef(null);

  const sortList = useCallback((list, sort) => {
    const arr = [...list];
    if (sort === 'value') arr.sort((a, b) => (Number(b.estimatedValue) || 0) - (Number(a.estimatedValue) || 0));
    else if (sort === 'score') arr.sort((a, b) => ((b.analysis?.scoreMatch) || 0) - ((a.analysis?.scoreMatch) || 0));
    else arr.sort((a, b) => {
      const ad = a.deadlineAt ? new Date(a.deadlineAt).getTime() : Infinity;
      const bd = b.deadlineAt ? new Date(b.deadlineAt).getTime() : Infinity;
      return ad - bd;
    });
    return arr;
  }, []);

  const loadList = useCallback(async (f) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.q.trim()) params.set('q', f.q.trim());
      if (f.scope && f.scope !== 'all') params.set('scope', f.scope);
      const res = await fetch(`/api/biddings?${params.toString()}`, { cache: 'no-store' });
      const data = await res.json();
      setBiddings(sortList(data.biddings || [], f.sort));
      if (data.meta) setMeta(data.meta);
    } catch {
      setBiddings([]);
    } finally {
      setLoading(false);
    }
  }, [sortList]);

  const rescan = useCallback(async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/scout', { cache: 'no-store' });
      const data = await res.json();
      if (data.note) setNote(data.note);
      if (data.meta) setMeta(data.meta);
      await loadList(filters);
    } catch {
    } finally {
      setScanning(false);
    }
  }, [filters, loadList]);

  useEffect(() => {
    (async () => {
      await loadList(DEFAULT_FILTERS);
      rescan();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (onLiveCount) {
      const active = biddings.filter((b) => !b.expired).length;
      onLiveCount(active);
    }
  }, [biddings, onLiveCount]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadList(filters), 220);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [filters, loadList]);

  useEffect(() => {
    const handler = () => rescan();
    window.addEventListener('hermes:rescan', handler);
    return () => window.removeEventListener('hermes:rescan', handler);
  }, [rescan]);

  const handleAnalyze = async (id) => {
    setAnalyzingId(id);
    try {
      const res = await fetch(`/api/analyze?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.ok && data.bidding) {
        setBiddings((prev) => sortList(prev.map((b) => (b.id === id ? data.bidding : b)), filters.sort));
      }
    } catch {
    } finally {
      setAnalyzingId(null);
    }
  };

  const count = biddings.length;

  return (
    <section id="radar" className="relative mx-auto max-w-7xl px-4 py-14">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <h2 className="section-title text-2xl sm:text-3xl font-bold text-ivory">Oportunidades no radar</h2>
          <StatusPill meta={meta} scanning={scanning} />
        </div>
        <p className="text-dusk max-w-2xl mx-auto text-sm text-center">
          Capturados do PNCP em tempo real, filtrados por Software &amp; Games. Clique no card para detalhes e decifração por IA.
        </p>
      </div>

      <div className="mb-5"><StatsBar biddings={biddings} /></div>
      <div className="mb-5"><Filters filters={filters} onChange={setFilters} count={count} /></div>

      {note && (
        <div className="mb-4 surface-2 rounded-xl px-4 py-2.5 text-xs text-dusk flex items-center gap-2">
          <span className="text-mint">●</span> {note}
        </div>
      )}

      {loading ? (
        <SkeletonGrid />
      ) : count === 0 ? (
        <EmptyState onRescan={rescan} scanning={scanning} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {biddings.map((b, i) => (
            <div key={b.id} className="fade-in" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
              <BiddingCard bidding={b} onAnalyze={handleAnalyze} analyzing={analyzingId === b.id} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="surface rounded-2xl p-5 h-64 animate-pulse">
          <div className="h-3 w-20 bg-white/5 rounded mb-4" />
          <div className="h-4 w-3/4 bg-white/5 rounded mb-2" />
          <div className="h-4 w-1/2 bg-white/5 rounded mb-5" />
          <div className="h-2.5 w-full bg-white/4 rounded mb-2" />
          <div className="h-2.5 w-5/6 bg-white/4 rounded" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onRescan, scanning }) {
  return (
    <div className="surface rounded-2xl p-12 text-center">
      <div className="text-3xl mb-3 text-dusk">∅</div>
      <h3 className="font-display text-lg mb-2 text-ivory">Nada no radar ainda</h3>
      <p className="text-dusk text-sm mb-5 max-w-md mx-auto">
        Nenhum edital com esses filtros. Ajuste a busca ou dispare uma nova varredura do PNCP.
      </p>
      <button onClick={onRescan} disabled={scanning} className="btn-primary text-sm">
        <span className={scanning ? 'animate-pulse' : ''}>{scanning ? '⟳' : '↻'}</span> {scanning ? 'Varrendo PNCP…' : 'Nova varredura'}
      </button>
    </div>
  );
}
