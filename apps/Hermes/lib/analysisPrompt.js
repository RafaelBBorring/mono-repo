export function buildAnalysisPrompt({ title, organ, modality, deadlineAt, estimatedValue, description, rawSummary }) {
  const deadline = deadlineAt ? new Date(deadlineAt).toLocaleDateString('pt-BR') : 'não informado';
  const value = estimatedValue ? `R$ ${Number(estimatedValue).toLocaleString('pt-BR')}` : 'não informado';
  const corpus = (rawSummary && rawSummary.trim()) || (description && description.trim()) || '';

  return `Você é o ANALYST do sistema Hermes, especialista em licitações brasileiras de SOFTWARE e GAMES.
Analise o edital abaixo e extraia os pontos críticos. Responda APENAS com um JSON válido (sem markdown, sem texto adicional).

Edital:
- Título: ${title}
- Órgão: ${organ}
- Modalidade: ${modality}
- Prazo final: ${deadline}
- Valor estimado: ${value}

Conteúdo:
"""
${corpus.slice(0, 6000)}
"""

Retorne EXATAMENTE este schema JSON:
{
  "resumoExecutivo": "3 a 4 frases objetivas sobre o objeto da contratação.",
  "requisitosObrigatorios": ["atestados/certificações/linguagens exigidas"],
  "faixaFinanceira": "faixa ou valor estimado, se disponível",
  "stackExigida": ["tecnologias citadas"],
  "scoreMatch": número inteiro de 0 a 100,
  "nivelUrgencia": "baixo" | "medio" | "alto" | "critico"
}

Regras:
- scoreMatch: quão claro e aderente é o edital a desenvolvimento de software/games (0-100).
- nivelUrgencia: considere o prazo final. Se próximo (<=5 dias) = "critico".
- Se um campo não existir no edital, use array vazio [] ou string vazia.
- NÃO inclua nada fora do JSON.`;
}

export function extractJsonFromText(text) {
  if (!text) return null;
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  const slice = t.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    try {
      return JSON.parse(slice.replace(/,\s*([}\]])/g, '$1'));
    } catch {
      return null;
    }
  }
}
