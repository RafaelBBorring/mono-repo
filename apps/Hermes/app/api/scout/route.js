import { NextResponse } from 'next/server';
import { runScout } from '@/lib/pncp';
import { upsertMany, markScan } from '@/lib/store';
import { enrichBidding, keepRelevant } from '@/lib/filters';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

export async function GET() {
  try {
    const { biddings, source, note } = await runScout();
    const enriched = biddings.map(enrichBidding).filter(Boolean);
    const filtered = enriched.filter(keepRelevant);
    const persisted = upsertMany(filtered);
    const meta = markScan({ source, note });
    return NextResponse.json({
      ok: true,
      source,
      note,
      count: filtered.length,
      discarded: enriched.length - filtered.length,
      persisted: persisted.total,
      meta,
      biddings: filtered
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Falha na varredura do Scout.', biddings: [] }, { status: 200 });
  }
}
