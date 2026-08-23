import { NextResponse } from 'next/server';
import { getBidding, upsertBidding } from '@/lib/store';
import { enrichWithDetail } from '@/lib/pncp';
import { enrichBidding } from '@/lib/filters';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 });

    let bidding = getBidding(id);
    if (!bidding) return NextResponse.json({ ok: false, error: 'Não encontrada' }, { status: 404 });

    if (bidding.enrichedAt) {
      return NextResponse.json({ ok: true, cached: true, bidding: enrichBidding(bidding) });
    }

    const detailed = await enrichWithDetail(bidding);
    const updated = upsertBidding(detailed);
    return NextResponse.json({ ok: true, cached: false, bidding: enrichBidding(updated) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Falha no enriquecimento.' }, { status: 200 });
  }
}
