/**
 * mysticDraftPrompt.js — Prompt para Criacao de Rituais/Feiticos/Runas/Magias
 *
 * Finalidade: Cria e balanceia conhecimentos misticos (Alquimia, Feiticos,
 * Runas, Magias) com base nos Regentes e leis fisicas distorcidas.
 *
 * Tokens estimados: ~1200-1800 tokens
 *
 * Hierarquia de poder:
 * - Rituais (Alquimia): ate 4o circulo — UTILITARIO, suporte
 * - Feiticos: ate 9o circulo — COMBATE direto, versatilidade crescente
 * - Runas: Menor/Comum/Maior — SELADORES, efeitos persistentes
 * - Magias: ate 4o circulo (Basica/Intermediaria/Avancada/Suprema) — PODER PURO
 *
 * IMPORTANTE: Conhecimentos NAO substituem Habilidades do personagem.
 * Um mago deve depender principalmente de suas habilidades; magias sao APOIO.
 */
export function buildMysticDraftPrompt({ systemType, draft, context }) {
  const analysisNote = typeof context.analysis_note === 'string' ? context.analysis_note.trim() : ''

  const REGENT_LORE = `
UNIVERSO NARRATIVO — REGENTES E DISTORCAO DE LEIS FISICAS:
Todo ritual e uma CHAMADA a um Regente que DISTORCE sua respectiva lei da fisica.
1. Senhor da Anti-Termodinamica — calor, frio, energia termica, entropia
2. Senhor da Anti-Relatividade — espaco, tempo, gravidade, velocidade
3. Senhor da Anti-Inercia — forca, momento, movimento, energia cinetica
4. Senhor da Biofisica e Entropia Genetica — vida, genetica, mutacao, decomposicao

REGRA CRUCIAL: NADA e puramente narrativo. Todo efeito DEVE ter mecanica de jogo:
teste especifico de atributo/pericia, CD/DT, NdN+MOD, condicao, duracao, contrapeso.

O DEFENSOR SEMPRE TEM CHANCE DE SE DEFENDER:
- NENHUM efeito pode causar dano ou condicao automatica sem teste especifico.
- Se o jogador descreve "acerta dano massivo se passar de DT", isso e INCORRETO.
- O CORRETO e: "Alvo realiza teste de Constituicao DT [X]" ou "teste de Fortitude DT [X]". DT por pericia deve ser 3-5 pontos maior que DT por atributo equivalente.
`

  const blocks = {
    alchemy: {
      title: 'SISTEMA: ALQUIMIA DO OLYMPO — RITUAIS DE DISTORCAO',
      lore: '- Alquimia canaliza distorcoes atraves de Regentes interdimensionais.\n- Cada ritual enfraquece o Veu. Quanto maior o circulo, maior o risco de Ruptura.',
      balance: '- 1o circulo: utilitario/tatico. PE 4-8. CD 12-14.\n- 2o circulo: impacto moderado. PE 8-16. CD 14-16.\n- 3o circulo: poder alto. PE 16-24. CD 17-19.\n- 4o circulo: devastador e raro. PE 24-38. CD 20-23.',
      protocol: '- Dano TOTAL: C1 max 2d8+MOD, C2 max 3d10+8, C3 max 5d10+15, C4 max 8d12+20.\n- Cura: max 20% vida da faixa.\n- Controle total: max 1 rodada em C3-4.\n- Buffs/Debuffs: max +/-2.\n- Risco Ruptura: C1=1, C2=2, C3=3, C4=5.',
      role: 'Rituais sao APOIO. NAO substituem habilidades de combate do personagem.',
    },
    spell: {
      title: 'SISTEMA: FEITICOS DO OLYMPO — RITUAIS DE DISTORCAO',
      lore: '- Feiticos sao conjuracoes que chamam Regentes para distorcer leis fisicas.\n- Bruxaria: vinculo, maldicao, sacrificio — biofisica e termodinamica.\n- Arcana: rajadas, barreiras, teleporte — relatividade e inercia.',
      balance: `- 1o circulo: suporte basico. PE 6-12. CD 12-14.
- 2o circulo: combate regular. PE 12-20. CD 14-16.
- 3o circulo: impacto alto. PE 20-30. CD 17-19.
- 4o circulo: raro, epico. PE 30-42. CD 20-23.
- 5o circulo: poder elevado. PE 42-55. CD 22-25.
- 6o circulo: devastador. PE 55-70. CD 24-27.
- 7o circulo: lenda viva. PE 70-90. CD 26-29.
- 8o circulo: quase divino. PE 90-120. CD 28-31.
- 9o circulo: apice absoluto. PE 120-160. CD 30-34.`,
      protocol: `- Dano TOTAL: C1 max 2d8+MOD, C2 max 3d10+8, C3 max 5d10+15, C4 max 7d12+18.
- C5: max 9d12+25 | C6: max 11d12+35 | C7: max 14d12+45 | C8: max 18d12+60 | C9: max 22d12+80
- Cura: max 20% vida da faixa.
- Controle total: max 1 rodada; prefira penalidade parcial.
- TODO efeito DEVE ter mecanica de jogo concreta.
- O DEFENSOR SEMPRE TEM CHANCE DE SE DEFENDER com teste especifico de atributo ou pericia.`,
      role: 'Feiticos sao APOIO mais versatil. NAO substituem habilidades — um personagem com 9 feiticos ainda depende de suas habilidades em combate.',
    },
    rune: {
      title: 'SISTEMA: RUNAS DO OLYMPO',
      lore: '- Runas sao fragmentos das Runas Primordiais — selos de vinculo com poder ancestral.\n- Cada runa carrega uma distorcao especifica cristalizada em forma de selo.',
      balance: '- Menores (1o circulo): efeito leve, custo baixo.\n- Comuns (2o-3o circulo): efeito moderado.\n- Maiores (3o-4o circulo): efeito poderoso com restricoes.',
      protocol: '- Toda runa indica grau e primordial-base.\n- TODO efeito DEVE ter mecanica de jogo concreta.',
      role: 'Runas sao APOIO passivo/reativo. NAO substituem habilidades.',
    },
    magic: {
      title: 'SISTEMA: MAGIAS DO OLYMPO — RITUAIS DE DISTORCAO',
      lore: '- Magias sao a forma pura de conjurar Regentes para distorcer leis fisicas.\n- Mais densas e exigentes que feiticos. Investem PEH pesado.',
      balance: '- 1o circulo (Basica): PE 5-10. CD 12-14.\n- 2o circulo (Intermediaria): PE 10-18. CD 14-16.\n- 3o circulo (Avancada): PE 18-28. CD 17-20.\n- 4o circulo (Suprema): PE 28-42. CD 21-24.',
      protocol: '- Magias sao MAIS PODEROSAS que feiticos do mesmo circulo: +10-15% nos tetos.\n- Dano TOTAL: C1 max 2d10+MOD, C2 max 4d10+10, C3 max 6d10+18, C4 max 9d12+24.\n- Cura: max 25% vida da faixa.\n- Buffs/Debuffs: max +/-3.\n- TODO efeito DEVE ter mecanica concreta.',
      role: 'Magias sao APOIO poderoso mas NAO substituem habilidades. Um Mago com magias supremas ainda usa suas habilidades como principal forma de combate.',
    },
  }

  const block = blocks[systemType] || blocks.alchemy

  return `${block.title}

${REGENT_LORE}

LORE E LIMITES:
${block.lore}

PAPEL NO COMBATE:
${block.role}

BALANCEAMENTO POR CIRCULO:
${block.balance}

PROTOCOLO:
${block.protocol}

RASCUNHO:
${JSON.stringify(draft, null, 2)}

CONTEXTO:
${JSON.stringify(context, null, 2)}

INSTRUCAO DO ADMIN:
${analysisNote || 'Voce tem LIBERDADE CRIATIVA TOTAL. REGRAS: (1) Mantenha o nome original. (2) Mecanica DEVE ser coerente com a lei do Regente. (3) O efeito e DEFINITIVO. (4) O DEFENSOR SEMPRE pode se defender com teste especifico de atributo ou pericia.'}

Responda EXCLUSIVAMENTE com JSON:
{
  "name": "nome refinado",
  "circle": 1,
  "category": "Ataque|Defesa|Suporte|Controle|Mobilidade|Utilidade|Cura|Maldicao",
  "pe_cost": 0,
  "min_level": 1,
  "action_cost": "Acao Padrao",
  "duration": "Instantaneo",
  "range": "18m",
  "short_description": "Distorcao [REGENTE]: breve explicacao + resumo.",
  "effect": "efeito com testes, CD, NdN+MOD, condicoes, duracoes, contrapesos. DEFENSOR SEMPRE PODE RESISTIR.",
  "source_kind": "regente|limiar|neutro",
  "source_name": "nome do Regente",
  "law_name": "lei fisica distorcida",
  "price": "custo narrativo ou contrapeso",
  "rupture_risk": 1,
  "protocol_layer": 2,
  "pp_estimate": 0,
  "tags": ["tag1", "tag2"],
  "ai_feedback": "explicacao de balanceamento"
}`
}
