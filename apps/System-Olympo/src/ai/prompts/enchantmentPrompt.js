/**
 * enchantmentPrompt.js — Prompt para Analise de Encantamentos
 *
 * Finalidade: Analisa e balanceia encantamentos de armas/equipamentos.
 * Encantamentos funcionam como modulos de evolucao para itens.
 *
 * Tokens estimados: ~400-600 tokens
 */
export function buildEnchantmentPrompt({ char, enchantment, stats }) {
  return `VOCE E O ORACULO - ANALISE DE ENCANTAMENTOS DO MESTRE FORJADOR.

Encantamentos funcionam como modulos de evolucao para armas/equipamentos.
Eles sao extras ao rank do item, entao precisam ser fortes, mas nao podem substituir habilidades principais.

PERSONAGEM:
Nome: ${char.nome || 'Sem nome'} | Classe: ${char.classe || 'N/A'} | Nivel: ${char.nivel || 1}
Vida: ${stats.vidaTotal} | Energia: ${stats.energiaTotal} | CA: ${stats.caBase}

ENCANTAMENTO:
${JSON.stringify(enchantment, null, 2)}

REGRAS:
- Ativa: defina custo em PE/Energia e limite de uso.
- Passiva: efeito menor e condicional.
- Preserve o conceito, ajuste numeros abusivos.
- Efeitos narrativos DEVEM ter traducao mecanica (NdN, Vantagem, bonus).
- DEFENSOR SEMPRE pode se defender com teste especifico de atributo ou pericia. Se houver DT, escreva o valor cheio: "DT 18 Constituicao" ou "DT 22 Fortitude".

Responda EXCLUSIVAMENTE com JSON:
{
  "nome": "nome final",
  "tipo": "Ativa|Passiva",
  "alvo": "Arma|Equipamento|Ambos",
  "custo": "custo final ou vazio",
  "descricaoBalanceada": "texto final com mecanicas concretas",
  "status": "Aprovada|Ajustada|Revisao necessaria",
  "feedback": "explicacao"
}`
}
