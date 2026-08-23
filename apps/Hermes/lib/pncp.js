import { EMERGENCY_SEED } from './seed.js';
import { scoreBidding } from './filters.js';

const PNCP_SEARCH = 'https://pncp.gov.br/api/search/';
const PNCP_DETAIL = 'https://pncp.gov.br/api/consulta/v1';
const PNCP_API = 'https://pncp.gov.br/api/pncp/v1';
const PNCP_PORTAL = 'https://pncp.gov.br/app';

const QUERIES = [
  'desenvolvimento de software',
  'desenvolvimento de sistema',
  'desenvolvimento de site portal web',
  'desenvolvimento de aplicativo',
  'manutenção desenvolvimento sistema',
  'implantação sistema informatizado',
  'fábrica de software',
  'desenvolvimento jogo game',
  'solução tecnologia da informação',
  'terceirização tecnologia da informação'
];

const BROWSER_HEADERS = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'pt-BR,pt;q=0.9,en;q=0.6',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
};

function withTimeout(ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(t) };
}

function parseItemUrl(itemUrl) {
  if (!itemUrl) return null;
  const m = String(itemUrl).match(/\/compras\/([^/]+)\/([^/]+)\/([^/]+)/);
  if (!m) return null;
  return { cnpj: m[1], ano: m[2], sequencial: m[3] };
}

function portalDeepLink(itemUrl) {
  const p = parseItemUrl(itemUrl);
  if (!p) return '';
  return `${PNCP_PORTAL}/compras/${p.cnpj}/${p.ano}/${p.sequencial}`;
}

function parseDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function mapSearchItem(item) {
  if (!item) return null;
  const title = item.title || 'Licitação';
  const organ = item.orgao_nome || 'Órgão não informado';
  const ref = parseItemUrl(item.item_url);
  if (!ref) return null;
  const control = item.numero_controle_pncp || `${ref.cnpj}-${ref.ano}-${ref.sequencial}`;
  return {
    id: `PNCP:${control}`,
    source: 'PNCP',
    title,
    organ,
    modality: item.modalidade_licitacao_nome || 'Licitação',
    publishedAt: parseDate(item.data_publicacao_pncp),
    deadlineAt: parseDate(item.data_fim_vigencia),
    estimatedValue: item.valor_global ? Number(item.valor_global) : null,
    currency: 'BRL',
    applyUrl: '',
    documentUrl: portalDeepLink(item.item_url),
    region: item.uf || 'Nacional',
    description: item.description || title,
    pncpControl: control,
    situacao: item.situacao_nome || '',
    ref
  };
}

async function fetchJson(url, { timeoutMs = 12000, retries = 2 } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const { signal, clear } = withTimeout(timeoutMs);
    try {
      const res = await fetch(url, { signal, headers: BROWSER_HEADERS, redirect: 'follow' });
      clear();
      if (res.status === 429 || res.status === 503) {
        if (attempt < retries) {
          await sleep(800 * (attempt + 1) + Math.random() * 400);
          continue;
        }
        return null;
      }
      if (!res.ok) return null;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!ct.includes('json')) return null;
      return await res.json();
    } catch {
      clear();
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function mapWithConcurrency(items, limit, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx).catch(() => items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function searchPncp(query, { pageSize = 25, timeoutMs = 12000 } = {}) {
  const params = new URLSearchParams({
    q: query,
    tipos_documento: 'edital',
    ordenacao: '-data',
    pagina: '1',
    tamPagina: String(pageSize)
  });
  const data = await fetchJson(`${PNCP_SEARCH}?${params.toString()}`, { timeoutMs });
  if (!data || !Array.isArray(data.items)) return [];
  return data.items.map(mapSearchItem).filter(Boolean);
}

export async function fetchCompraDetail(ref) {
  if (!ref || !ref.cnpj) return null;
  const url = `${PNCP_DETAIL}/orgaos/${ref.cnpj}/compras/${ref.ano}/${ref.sequencial}`;
  return await fetchJson(url);
}

export async function fetchCompraArquivos(ref, { timeoutMs = 10000 } = {}) {
  if (!ref || !ref.cnpj) return [];
  const url = `${PNCP_API}/orgaos/${ref.cnpj}/compras/${ref.ano}/${ref.sequencial}/arquivos`;
  const data = await fetchJson(url, { timeoutMs });
  if (!Array.isArray(data)) return [];
  return data;
}

export async function enrichWithDetail(bidding) {
  const detail = await fetchCompraDetail(bidding.ref);
  if (!detail) return bidding;
  return {
    ...bidding,
    description: detail.objetoCompra || bidding.description,
    estimatedValue: detail.valorTotalEstimado ?? detail.valorTotalHomologado ?? bidding.estimatedValue,
    applyUrl: detail.linkProcessoEletronico || portalDeepLink(bidding.documentUrl),
    situacao: detail.situacaoCompraNome || bidding.situacao,
    rawSummary: detail.objetoCompra || '',
    enrichedAt: new Date().toISOString()
  };
}

export async function enrichAllWithDetail(biddings, { concurrency = 4 } = {}) {
  return mapWithConcurrency(biddings, concurrency, (b) => enrichWithDetail(b));
}

export async function fetchPncp({ timeoutMs = 12000 } = {}) {
  const out = [];
  const seen = new Set();
  for (const q of QUERIES) {
    const items = await searchPncp(q, { timeoutMs });
    for (const item of items) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
    }
    if (out.length >= 60) break;
  }
  return out;
}

export async function runScout({ timeoutMs } = {}) {
  const ms = timeoutMs || Number(process.env.SCOUT_TIMEOUT_MS) || 12000;
  const remote = await fetchPncp({ timeoutMs: ms }).catch(() => []);

  if (!remote.length) {
    return {
      biddings: EMERGENCY_SEED,
      source: 'fallback',
      note: 'PNCP indisponível neste momento — exibindo conjunto de segurança.'
    };
  }

  return {
    biddings: remote,
    source: 'pncp',
    note: `${remote.length} editais capturados do PNCP em tempo real.`
  };
}
