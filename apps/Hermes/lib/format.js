export function normalizeUrl(url) {
  if (!url) return '';
  let u = String(url).trim();
  if (!u) return '';
  if (u.startsWith('http://')) u = 'https://' + u.slice(7);
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u;
}

const PORTAL_LANDING = {
  PNCP: 'https://pncp.gov.br/app/editais',
  COMPRASGOV: 'https://pncp.gov.br/app/editais',
  ANCINE: 'https://www.ancine.gov.br/editais',
  FINEP: 'https://www.finep.gov.br/editais',
  BNDES: 'https://www.bndes.gov.br/wps/portal/site/home/quem-somos/editais',
  ROUANET: 'https://www.gov.br/cultura/pt-br'
};

function searchQuery(bidding) {
  const q = `${bidding.title || ''} ${bidding.organ || ''}`.trim().replace(/\s+/g, ' ').slice(0, 90);
  return encodeURIComponent(q);
}

export function searchFallbackUrl(bidding) {
  const q = searchQuery(bidding);
  const portal = PORTAL_LANDING[(bidding.source || '').toUpperCase()];
  if (portal) return `${portal}?q=${q}`;
  return `https://www.google.com/search?q=${q}%20edital%20licita%C3%A7%C3%A3o`;
}

export function normalizeApplyUrl(url, bidding) {
  const direct = normalizeUrl(url);
  if (direct) return direct;
  if (bidding) {
    const doc = normalizeUrl(bidding.documentUrl);
    if (doc) return doc;
    return searchFallbackUrl(bidding);
  }
  return '';
}

export function normalizeDocumentUrl(url, bidding) {
  const direct = normalizeUrl(url);
  if (direct && /\.(pdf|docx?|zip)(\?|$)/i.test(direct)) return direct;
  if (bidding) return searchFallbackUrl(bidding);
  return direct;
}

export function formatCurrency(value, currency = 'BRL') {
  if (value == null || isNaN(Number(value))) return null;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(value));
  } catch {
    return null;
  }
}

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysUntil(iso) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

export function slugify(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function urgencyColor(level) {
  switch (level) {
    case 'critico': return { text: 'text-rose-300', ring: 'ring-rose-400/30', dot: 'bg-rose-400', glow: '' };
    case 'alto': return { text: 'text-amber2', ring: 'ring-amber2/30', dot: 'bg-amber2', glow: '' };
    case 'medio': return { text: 'text-sky-light', ring: 'ring-sky/30', dot: 'bg-sky', glow: '' };
    default: return { text: 'text-dusk', ring: 'ring-white/10', dot: 'bg-dusk', glow: '' };
  }
}

export function scopeMeta(scope) {
  switch (scope) {
    case 'games': return { label: 'Games', icon: '◈', color: 'text-mint-light', bg: 'bg-mint/5', ring: 'ring-mint/20' };
    case 'software': return { label: 'Software', icon: '⬡', color: 'text-sky-light', bg: 'bg-sky/5', ring: 'ring-sky/20' };
    default: return { label: 'Software + Games', icon: '✦', color: 'text-mint-light', bg: 'bg-mint/5', ring: 'ring-mint/20' };
  }
}
