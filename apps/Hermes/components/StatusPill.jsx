'use client';

export default function StatusPill({ meta, scanning }) {
  const source = meta?.lastSource || (scanning ? 'scanning' : 'idle');
  const labelMap = {
    pncp: 'PNCP ao vivo',
    fallback: 'Conjunto de segurança',
    scanning: 'Varrendo PNCP…',
    idle: 'Aguardando'
  };
  const isLive = source === 'pncp';
  const isFallback = source === 'fallback';

  const dot = scanning ? 'bg-sky animate-pulse' : isLive ? 'bg-mint' : isFallback ? 'bg-amber2' : 'bg-dusk';
  const text = scanning ? 'text-sky-light' : isLive ? 'text-mint-light' : isFallback ? 'text-amber2' : 'text-dusk';

  return (
    <span className={`chip surface-2 ${text} text-[0.6rem]`} title={meta?.lastNote || ''}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot} ${isLive ? 'animate-pulse' : ''}`} />
      {labelMap[source] || source}
      {meta?.lastScanAt && !scanning && (
        <span className="text-dusk/70 ml-1 hidden sm:inline">· {timeAgo(meta.lastScanAt)}</span>
      )}
    </span>
  );
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
