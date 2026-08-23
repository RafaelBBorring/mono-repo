import { NextResponse } from 'next/server';
import { getBidding, upsertBidding, upsertMany, listBiddings } from '@/lib/store';
import { analyzeWithOpenRouter, heuristicAnalysis, contentHash } from '@/lib/openrouter';
import { extractTextFromUrl } from '@/lib/pdf';
import { enrichBidding } from '@/lib/filters';

export const dynamic = 'force-dynamic';

async function ensureSeeded() {
  if (listBiddings().length === 0) {
    const { runScout } = await import('@/lib/pncp');
    const { biddings } = await runScout();
    upsertMany(biddings.map(enrichBidding).filter(Boolean));
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const force = searchParams.get('force') === '1';
    if (!id) return NextResponse.json({ ok: false, error: 'id obrigatório' }, { status: 400 });

    let bidding = getBidding(id);
    if (!bidding) {
      await ensureSeeded();
      bidding = getBidding(id);
    }
    if (!bidding) return NextResponse.json({ ok: false, error: 'Não encontrada' }, { status: 404 });

    const hash = contentHash(bidding);
    const cached = bidding.analysis;
    const fresh = cached && cached.contentHash === hash && process.env.ANALYZE_CACHE !== '0';
    if (fresh && !force) {
      return NextResponse.json({ ok: true, cached: true, source: cached.source, model: cached.model, analysis: cached, bidding: enrichBidding(bidding) });
    }

    if (!bidding.rawSummary && bidding.documentUrl) {
      const raw = await extractTextFromUrl(bidding.documentUrl);
      bidding = upsertBidding({ ...bidding, rawSummary: raw || bidding.description || '' });
    }

    let analysis;
    let source;
    let model;
    try {
      analysis = await analyzeWithOpenRouter(bidding);
      source = analysis.source || 'openrouter';
      model = analysis.model || '';
    } catch (e) {
      analysis = heuristicAnalysis(bidding);
      source = 'heuristic';
      model = analysis.model || 'hermes-heuristic';
    }
    analysis.contentHash = hash;

    const updated = upsertBidding({ ...bidding, analysis });

    return NextResponse.json({
      ok: true,
      cached: false,
      source,
      model,
      analysis,
      bidding: enrichBidding(updated)
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Falha na análise.' }, { status: 200 });
  }
}
