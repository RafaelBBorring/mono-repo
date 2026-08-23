import { NextResponse } from 'next/server';
import { listBiddings, getBidding, upsertMany, getMeta } from '@/lib/store';
import { enrichBidding, scoreBidding, isActive } from '@/lib/filters';

export const dynamic = 'force-dynamic';

async function hydrate() {
  const { runScout } = await import('@/lib/pncp');
  const { biddings } = await runScout();
  const enriched = biddings.map(enrichBidding).filter(Boolean);
  upsertMany(enriched);
  return enriched;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      let b = getBidding(id);
      if (!b) {
        await hydrate();
        b = getBidding(id);
      }
      if (!b) return NextResponse.json({ ok: false, error: 'Não encontrada' }, { status: 404 });
      return NextResponse.json({ ok: true, bidding: enrichBidding(b) });
    }

    let list = listBiddings();
    if (list.length === 0) {
      list = await hydrate();
    }

    const scope = searchParams.get('scope');
    const source = searchParams.get('source');
    const q = (searchParams.get('q') || '').toLowerCase().trim();
    const minScore = Number(searchParams.get('minScore') || 0);

    let filtered = list.map(enrichBidding).filter((b) => isActive(b) || b.source === 'SEED');
    if (scope && scope !== 'all') filtered = filtered.filter((b) => b.scope === scope || b.scope === 'both');
    if (source && source !== 'all') filtered = filtered.filter((b) => (b.source || '').toUpperCase() === source.toUpperCase());
    if (q) filtered = filtered.filter((b) => `${b.title} ${b.organ} ${b.description || ''}`.toLowerCase().includes(q));
    if (minScore) filtered = filtered.filter((b) => (b.relevanceScore || 0) >= minScore);

    filtered.sort((a, b) => {
      const ad = a.deadlineAt ? new Date(a.deadlineAt).getTime() : Infinity;
      const bd = b.deadlineAt ? new Date(b.deadlineAt).getTime() : Infinity;
      return ad - bd;
    });

    return NextResponse.json({ ok: true, count: filtered.length, biddings: filtered, meta: getMeta() });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Falha ao listar licitações.', biddings: [] }, { status: 200 });
  }
}
