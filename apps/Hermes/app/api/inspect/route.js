import { NextResponse } from 'next/server';
import { getBidding, upsertBidding } from '@/lib/store';
import { extractTextFromUrl } from '@/lib/pdf';
import { scoreBidding } from '@/lib/filters';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 });

    let bidding = getBidding(id);
    if (!bidding) return NextResponse.json({ ok: false, error: 'Não encontrada' }, { status: 404 });

    let rawSummary = bidding.rawSummary;
    if (!rawSummary && bidding.documentUrl) {
      rawSummary = await extractTextFromUrl(bidding.documentUrl);
    }
    const score = scoreBidding({ title: bidding.title, description: bidding.description, organ: bidding.organ });

    const updated = upsertBidding({
      ...bidding,
      rawSummary: rawSummary || bidding.description || '',
      scope: bidding.scope && bidding.scope !== 'both' ? bidding.scope : score.scope,
      relevanceScore: bidding.relevanceScore || score.score,
      inspectedAt: new Date().toISOString()
    });

    return NextResponse.json({
      ok: true,
      rawSummaryLength: (rawSummary || '').length,
      scope: updated.scope,
      relevanceScore: updated.relevanceScore,
      bidding: updated
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Falha na inspeção.' }, { status: 200 });
  }
}
