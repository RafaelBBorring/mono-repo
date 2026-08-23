import { normalizeApplyUrl, normalizeDocumentUrl } from './format.js';

const DEV_STRONG = [
  'desenvolvimento', 'desenvolver', 'desenvolvedor', 'programação', 'programacao',
  'codificação', 'codificacao', 'fábrica de software', 'fabrica de software',
  'software sob medida', 'sistema sob medida',
  'manutenção de sistema', 'manutencao de sistema', 'manutenção de site',
  'manutencao de site', 'manutenção de portal', 'manutenção de software',
  'implantação de sistema', 'implantacao de sistema',
  'backend', 'back-end', 'frontend', 'front-end', 'fullstack', 'full-stack',
  'engenharia de software', 'criação de site', 'criação de portal',
  'refatoração', 'migração de sistema', 'modernização',
  'e-commerce', 'ecommerce', 'loja virtual'
];

const DEV_WEAK = [
  'software', 'sistema', 'sistemas', 'site', 'portal', 'aplicativo', 'app',
  'plataforma', 'web', 'mobile', 'chatbot', 'tecnologia da informação',
  'informatização', 'informatizacao', 'sistema informatizado',
  'solução de ti', 'solução tecnológica', 'solucao tecnologica',
  'automação', 'automacao', 'api', 'integração', 'integracao',
  'banco de dados', 'dashboard', 'erp', 'crm', 'saas',
  'serviços de ti', 'servicos de ti'
];

const GAMES_SIGNALS = [
  'jogo', 'jogos', 'game', 'games', 'serious game', 'serious games',
  'gamificação', 'gamificacao', 'gamification', 'desenvolvimento de jogo',
  'realidade virtual', 'realidade aumentada', ' rv ', ' ra ',
  'desenvolvimento de game', 'motor gráfico', 'unity', 'unreal', 'godot',
  'game design', 'gameplay', 'level design', 'simulador 3d',
  'desenvolvimento de simulador', 'imersivo'
];

const ACQUISITION_SIGNALS = [
  'aquisição', 'aquisicoes', 'aquisicao', 'locação', 'locacao', 'locar',
  'licença', 'licencas', 'licenças', 'licenciamento', 'licenciamento de uso',
  'assinatura', 'subscrição', 'subscricao', 'renovação', 'renovacao',
  'fornecimento', 'compra de', 'registrar preços',
  'registro de preços', 'registro de preco',
  'cessão de uso', 'cessao de uso'
];

const HARDWARE_SIGNALS = [
  'equipamento', 'equipamentos', 'material', 'materiais', 'hardware',
  'aparelho', 'aparelhos', 'ultrassom', 'audiovisual', 'áudio e vídeo',
  'audio e video', 'impressora', 'notebook', 'computador', 'computadores',
  'tonner', 'cartucho', 'cabo', 'cabos', 'roteador', 'switch',
  'monitor ', 'teclado', 'mouse ', 'desktop', 'gabinete', 'memória ram',
  'hd ', 'ssd', 'pendrive', 'câmera', 'camera', 'projetor',
  'tela interativa', 'quadro interativo', 'drone'
];

const SERVICE_NON_DEV = [
  'rastreamento', 'monitoramento de frota', 'monitoramento veicular',
  'monitoramento de câmeras', 'vigilância', 'vigilancia',
  'limpeza', 'faxina', 'dedetização', 'jardinagem',
  'transporte', 'merenda', 'alimentação escolar',
  'coveiro', 'funerário', 'segurança patrimonial', 'segurança armada',
  'brigada de incêndio', 'brigada de incendio', 'ministrar curso',
  'formatura', 'formações', 'formacoes', 'evento comemorativo', 'locomoção'
];

function countHits(text, list) {
  const lower = ` ${text} `.toLowerCase();
  let count = 0;
  for (const kw of list) {
    let idx = lower.indexOf(kw);
    while (idx !== -1) {
      count += 1;
      idx = lower.indexOf(kw, idx + kw.length);
    }
  }
  return count;
}

function hasAny(text, list) {
  const lower = ` ${text} `.toLowerCase();
  return list.some((kw) => lower.includes(kw));
}

export function scoreBidding({ title = '', description = '', organ = '' }) {
  const text = `${title} ${description} ${organ}`;
  const strongDev = hasAny(text, DEV_STRONG);
  const weakDev = hasAny(text, DEV_WEAK);
  const games = hasAny(text, GAMES_SIGNALS);
  const acq = hasAny(text, ACQUISITION_SIGNALS);
  const hw = hasAny(text, HARDWARE_SIGNALS);
  const svc = hasAny(text, SERVICE_NON_DEV);

  const blocked = acq || hw || svc;
  const isDev = !blocked && (strongDev || weakDev);
  const isGamesDev = !blocked && games;

  let scope = 'both';
  if (isGamesDev && !isDev) scope = 'games';
  else if (isDev && !isGamesDev) scope = 'software';

  let score = 0;
  if (strongDev) score += 50;
  if (weakDev) score += 15;
  if (games) score += 40;
  if (blocked) score = 0;
  score = Math.max(0, Math.min(100, score));

  const relevant = isDev || isGamesDev;

  return { score, scope, relevant };
}

export function urgencyFromDeadline(deadlineAt) {
  if (!deadlineAt) return 'medio';
  const diff = new Date(deadlineAt).getTime() - Date.now();
  const days = diff / 86400000;
  if (days < 0) return 'baixo';
  if (days <= 5) return 'critico';
  if (days <= 14) return 'alto';
  if (days <= 30) return 'medio';
  return 'baixo';
}

export function enrichBidding(b) {
  if (!b) return null;
  const score = scoreBidding({ title: b.title, description: b.description, organ: b.organ });
  const scope = b.scope && b.scope !== 'both' ? b.scope : score.scope;
  const urgency = urgencyFromDeadline(b.deadlineAt);
  const expired = b.deadlineAt ? new Date(b.deadlineAt).getTime() < Date.now() : false;
  return {
    ...b,
    scope,
    relevanceScore: b.relevanceScore ?? score.score,
    relevance: score.relevant,
    urgency,
    expired,
    applyUrl: normalizeApplyUrl(b.applyUrl, b),
    documentUrl: normalizeDocumentUrl(b.documentUrl, b),
    inspectedAt: b.inspectedAt || new Date().toISOString()
  };
}

const INACTIVE_SITUACAO = /suspen|revog|cancel|encerr|anul|invalid|desert|fracass|rescind|arquiv/i;

export function isActive(b) {
  if (!b) return false;
  if (INACTIVE_SITUACAO.test(b.situacao || '')) return false;
  if (!b.deadlineAt) return false;
  if (new Date(b.deadlineAt).getTime() < Date.now()) return false;
  const pub = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
  if (pub && Date.now() - pub > 1000 * 60 * 60 * 24 * 365) return false;
  return true;
}

export function keepRelevant(b) {
  if (!b) return false;
  if (b.source === 'SEED') return true;
  if (!isActive(b)) return false;
  return b.relevance !== false && (b.relevanceScore ?? 0) >= 15;
}
