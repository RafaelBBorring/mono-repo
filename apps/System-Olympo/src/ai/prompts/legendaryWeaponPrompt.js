/**
 * legendaryWeaponPrompt.js — Prompt para Criacao/Balanceamento de Armas Lendarias
 *
 * Finalidade: Cria ou balanceia armas lendarias completas (dano, efeito, habilidades,
 * lore) respeitando o nivel de poder e preservando conceitos do mestre.
 *
 * Tokens estimados: ~1500-2500 tokens (maior prompt do sistema)
 *
 * Niveis de poder: menor, notavel, maior, suprema
 */
export function buildLegendaryWeaponPrompt({ draft, powerLevel, analysisNote, improveWriting }) {
  const guide = POWER_LEVEL_GUIDE[powerLevel] || POWER_LEVEL_GUIDE.notavel
  const habs = draft.habilidades || { passivas: [], ativas: [], ultimates: [] }
  const totalHabs = habs.passivas.length + habs.ativas.length + habs.ultimates.length
  const hasContent = draft.name || draft.dano || draft.effect || totalHabs > 0
  const isGenerationMode = !hasContent && analysisNote?.length > 0

  return `VOCE E O ORACULO — ARTIFICE LENDARIO DO SISTEMA OLYMPO 2.0.

MODO: ${isGenerationMode ? 'GERACAO — Criar arma completa do zero.' : 'BALANCEAMENTO — Preservar conceitos, ajustar valores.'}

==
TABELA DE ARMAS (dano base COMUM):
==
Pistola: 1d8 | Espada Longa: 1d8 | Rifle: 1d10 | Katana: 1d8
Machado Guerra: 1d10 | Martelo Guerra: 1d10 | Adaga: 1d4 | Besta: 1d10
Arco Longo: 1d8 | Escopeta: 2d6 | Sniper: 2d8 | Escudo Grande: 1d6

RANKS (bonus cumulativos sobre base):
Comum(0) | Incomum(+1d6) | Raro(+2d6) | Epico(+3d8) | Heroico(+4d8) | Ancestral(+5d10) | Mitico(+6d12) | Transcendente(+8d12)
LENDARIA esta ACIMA de Transcendente.

==
TERMINOLOGIA:
==
PE = Pontos de Esforco | CA = Classe de Armadura | CD = Classe de Dificuldade
NdN = formato de dados | MOD = modificador de atributo | Vantagem/Desvantagem

==
NIVEL DE PODER: ${guide.label}
==
${guide.desc}
Dano base esperado: ${guide.danoBase}
Dano de habilidades ofensivas: ${guide.danoHabilidade}
Custo PE — Ativas: ${guide.peAtiva} | Ultimate: ${guide.peUltimate}
Quantidade de habilidades: ${guide.slotBudget}

==
RASCUNHO:
==
${JSON.stringify(draft, null, 2)}

==
INSTRUCAO DO MESTRE:
==
${analysisNote || 'Revisar, completar e balancear.'}

==
REGRAS OBRIGATORIAS:
==
1. PRESERVACAO DE MECANICAS: Se o Mestre descreveu uma habilidade, PRESERVE a mecanica central. Balancear != Substituir.
2. ANALISE INDIVIDUAL: Cada habilidade DEVE ser processada individualmente. NAO pule nenhuma.
3. MECANICAS CONCRETAS: TODOS os efeitos devem ter NdN, CDs, condicoes, duracoes. PROIBIDO prosa sem suporte mecanico.
4. DANO BASE: Referencia a tabela. Lendaria ${guide.label} deve superar Transcendente(+8d12).
5. TRADUCAO DE EFEITOS: Efeitos narrativos DEVEM ter traducao mecanica:
   - "Teleporte" → Vantagem no proximo ataque + Vantagem em esquiva
   - "Invisibilidade" → Vantagem em ataques, inimigos tem Desvantagem
   - "Deteccao" → +NdN Percepcao com Vantagem contra ilusoes
6. ECONOMIA DE ACOES: Cada habilidade ativa consome 1 Acao Padrao. Nenhuma concede acoes extras sem custo severo.

Responda EXCLUSIVAMENTE com JSON:
{
  "name": "nome",
  "dano": "dano base",
  "attr": "atributo",
  "effect": "efeito lendario com mecanicas concretas",
  "power_level": "${powerLevel}",
  "lore": "historia",
  "habilidades": {
    "passivas": [{ "nome": "nome", "descricao": "descricao com mecanicas concretas", "custoPE": 0 }],
    "ativas": [{ "nome": "nome", "descricao": "descricao com mecanicas concretas", "custoPE": X }],
    "ultimates": [{ "nome": "nome", "descricao": "descricao com mecanicas concretas", "custoPE": X }]
  },
  "ai_feedback": "Resumo de cada habilidade e decisoes de balanceamento."
}`
}

const POWER_LEVEL_GUIDE = {
  menor: { label: 'Menor', desc: 'Poderosa mas contida.', danoBase: '2d8 a 3d10+MOD', danoHabilidade: '2d6+8 a 4d8+15', peAtiva: '5-15 PE', peUltimate: '15-30 PE', slotBudget: '2-3' },
  notavel: { label: 'Notavel', desc: 'Forte e distinta.', danoBase: '3d10 a 5d10+MOD', danoHabilidade: '3d10+18 a 6d10+25', peAtiva: '10-25 PE', peUltimate: '25-50 PE', slotBudget: '3-4' },
  maior: { label: 'Maior', desc: 'Entre as mais poderosas.', danoBase: '5d12 a 8d12+MOD', danoHabilidade: '6d12+30 a 10d12+45', peAtiva: '15-40 PE', peUltimate: '40-80 PE', slotBudget: '4-6' },
  suprema: { label: 'Suprema', desc: 'Poder absoluto.', danoBase: '8d12+8 a 12d12+15', danoHabilidade: '10d12+50 a 16d12+75', peAtiva: '20-60 PE', peUltimate: '60-120 PE', slotBudget: '5-8' },
}
