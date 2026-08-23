import { buildAnalysisPrompt, extractJsonFromText } from './analysisPrompt.js';
import { urgencyFromDeadline } from './filters.js';
import crypto from 'crypto';

const BASE = 'https://openrouter.ai/api/v1/chat/completions';
const PRIMARY = process.env.OPENROUTER_PRIMARY_MODEL || 'google/gemma-4-26b-a4b-it:free';
const FALLBACK = process.env.OPENROUTER_FALLBACK_MODEL || 'openai/gpt-oss-20b:free';

export function contentHash(bidding) {
  const corpus = `${bidding?.title || ''}|${bidding?.organ || ''}|${bidding?.description || ''}|${bidding?.rawSummary || ''}|${bidding?.deadlineAt || ''}`;
  return crypto.createHash('sha1').update(corpus).digest('hex').slice(0, 12);
}

async function callModel(model, messages, { timeoutMs = 45000 } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('NO_API_KEY');
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(BASE, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'x-title': 'Hermes Radar'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 1200
      })
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${errBody.slice(0, 200)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return content;
  } finally {
    clearTimeout(t);
  }
}

export async function analyzeWithOpenRouter(bidding) {
  const messages = [
    { role: 'system', content: 'Você é um assistente de análise de licitações que responde apenas em JSON válido.' },
    { role: 'user', content: buildAnalysisPrompt(bidding) }
  ];

  const chain = [PRIMARY, FALLBACK].filter((v, i, a) => v && a.indexOf(v) === i);
  let lastError = null;
  for (const model of chain) {
    try {
      const content = await callModel(model, messages);
      const parsed = extractJsonFromText(content);
      if (parsed) {
        return normalizeAnalysis({ ...parsed, model, source: 'openrouter' }, bidding);
      }
      lastError = new Error('JSON inválido do modelo');
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('Falha na análise por IA');
}

export function heuristicAnalysis(bidding) {
  const text = `${bidding.title || ''} ${bidding.description || ''} ${bidding.rawSummary || ''}`.toLowerCase();
  const stackList = ['react', 'node', 'node.js', 'next.js', 'angular', 'vue', 'python', 'java', 'c#', '.net', 'php', 'laravel', 'kotlin', 'swift', 'flutter', 'docker', 'kubernetes', 'aws', 'azure', 'unity', 'unreal', 'godot', 'postgresql', 'mysql', 'mongodb', 'redis', 'graphql', 'typescript', 'javascript', 'go', 'rust'];
  const stack = stackList.filter((s) => text.includes(s));
  const reqList = [];
  if (/atestado|capacidade técnica|certificação|iso 27001|lgpd|cmmi|registro no cqp|habilitação jurídica/.test(text)) reqList.push('Habilitação e/ou atestado de capacidade técnica');
  if (/porte|me|epp|microempresa|lei complementar 123/.test(text)) reqList.push('Enquadramento ME/EPP possível');
  if (/certidão negativa|cnd|fgts|tributária|trabalhista/.test(text)) reqList.push('Certidões negativas (tributárias/trabalhistas)');
  const value = bidding.estimatedValue ? `R$ ${Number(bidding.estimatedValue).toLocaleString('pt-BR')}` : 'Não informado no cadastro';
  const score = Math.max(20, Math.min(85, 40 + stack.length * 6 + (bidding.description ? 15 : 0)));
  return {
    resumoExecutivo: `${bidding.title}. Contratação/edital junto a ${bidding.organ || 'órgão contratante'} (${bidding.modality || 'modalidade não informada'}). Resumo gerado heuristicamente pelo Hermes quando o oráculo de IA estava indisponível; recomendamos leitura integral do edital antes da candidatura.`,
    requisitosObrigatorios: reqList.length ? reqList : ['Verificar edital para requisitos de habilitação'],
    faixaFinanceira: value,
    stackExigida: stack,
    scoreMatch: score,
    nivelUrgencia: urgencyFromDeadline(bidding.deadlineAt),
    model: 'hermes-heuristic',
    source: 'heuristic',
    analyzedAt: new Date().toISOString()
  };
}

function normalizeAnalysis(parsed, bidding) {
  const nivel = String(parsed.nivelUrgencia || parsed.nivel_urgencia || parsed.urgencia || '').toLowerCase();
  const normalized = nivel.includes('crit') ? 'critico' : nivel.includes('alt') ? 'alto' : nivel.includes('med') ? 'medio' : 'baixo';
  let score = Number(parsed.scoreMatch ?? parsed.score_match ?? parsed.score ?? 0);
  if (isNaN(score)) score = 50;
  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    resumoExecutivo: parsed.resumoExecutivo || parsed.resumo_executivo || parsed.resumo || '',
    requisitosObrigatorios: toArray(parsed.requisitosObrigatorios ?? parsed.requisitos_obrigatorios ?? parsed.requisitos),
    faixaFinanceira: parsed.faixaFinanceira || parsed.faixa_financeira || parsed.faixa || '',
    stackExigida: toArray(parsed.stackExigida ?? parsed.stack_exigida ?? parsed.stack),
    scoreMatch: score,
    nivelUrgencia: normalized || urgencyFromDeadline(bidding.deadlineAt),
    model: parsed.model || '',
    source: parsed.source || 'openrouter',
    analyzedAt: new Date().toISOString()
  };
}

function toArray(v) {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  if (typeof v === 'string' && v.trim()) return v.split(/\n|,|;|•/).map((s) => s.trim()).filter(Boolean);
  return [];
}
