/**
 * SISTEMA DE EVOLUÇÃO DE HABILIDADES — Olympo 2.0
 *
 * Regras de evolução:
 *  - Passiva:   Evolui automaticamente nos níveis 10, 20 e 30 (sem custo de PEH).
 *               O valor exibido é contextual; a IA recalibra durante a análise.
 *  - Ativa:     Máximo 5 níveis de evolução. Custo: 1 PEH por nível.
 *  - Ultimate:  Máximo 3 níveis de evolução. Custo: 1 PEH por nível.
 *               Restrição: 1º ponto requer char ≥ N15 | 2º requer ≥ N25 | 3º requer N30.
 *
 * Deltas padrão por tipo de Ativa (usados para PREVIEW — valores finais
 * são recalibrados pela IA durante a análise de balanceamento):
 *  - Fraca  (< 20 Energia):  +1d6 dano, +4 flat, +2 Energia por nível
 *  - Média  (20–50 Energia): +1d8 dano, +6 flat, +3 Energia por nível
 *  - Forte  (> 50 Energia):  +1d10 dano, +8 flat, +5 Energia por nível
 *  - Ultimate:               +2d10 dano, +12 flat, +8 Energia por nível
 */

// ─── Brackets de custo ────────────────────────────────────────────────────────
export function getSkillBracket(custoEnergia, tipo) {
  if (tipo === 'Ultimate') return 'ULTIMATE'
  if (tipo === 'Passiva')  return 'PASSIVA'
  if (custoEnergia < 20)   return 'FRACA'
  if (custoEnergia <= 50)  return 'MEDIA'
  return 'FORTE'
}

// ─── Cap de evolução por tipo ─────────────────────────────────────────────────
export function getMaxEvolucao(tipo) {
  if (tipo === 'Passiva')  return 3   // auto, sem custo PEH
  if (tipo === 'Ultimate') return 3
  return 5                             // Ativas padrão e Extra
}

// ─── Deltas por bracket (para preview estimado) ───────────────────────────────
const DELTAS = {
  FRACA:    { dadoExtra: '1d6',  flat: 4,  energia: 2 },
  MEDIA:    { dadoExtra: '1d8',  flat: 6,  energia: 3 },
  FORTE:    { dadoExtra: '1d10', flat: 8,  energia: 5 },
  ULTIMATE: { dadoExtra: '2d10', flat: 12, energia: 8 },
  PASSIVA:  { dadoExtra: '',     flat: 0,  energia: 0 },
}

// ─── Bônus de duração (nível de evolução → rodadas extras) ───────────────────
const DURACAO_BONUS = {
  FRACA:    [0, 0, 1, 0, 1, 1],   // evo 2 e 4 e 5
  MEDIA:    [0, 0, 1, 0, 1, 2],
  FORTE:    [0, 0, 0, 1, 1, 2],
  ULTIMATE: [0, 0, 1, 2, 0, 0],   // max 3 níveis
  PASSIVA:  [0, 0, 0, 0, 0, 0],
}

/**
 * Retorna o delta cumulativo de uma habilidade dado o nível de evolução.
 * Usado para o preview estimado no UI.
 */
export function calcEvolucaoDelta(skill, evolNivel) {
  if (!evolNivel || evolNivel <= 0) return null
  const bracket = getSkillBracket(skill.custoEnergia || 0, skill.tipo)
  const delta = DELTAS[bracket]
  const duracaoBonusArr = DURACAO_BONUS[bracket] || [0,0,0,0,0,0]

  // Acumula ao longo dos níveis de evolução
  const duracaoExtra = duracaoBonusArr.slice(0, evolNivel + 1).reduce((a, b) => a + b, 0)
  const flatExtra    = delta.flat * evolNivel
  const energiaExtra = delta.energia * evolNivel

  // Constrói string de dado extra cumulativa (ex: evo 3 Média = +3d8)
  let dadoExtraStr = ''
  if (delta.dadoExtra) {
    const match = delta.dadoExtra.match(/^(\d+)(d\d+)$/)
    if (match) {
      const qtd  = parseInt(match[1]) * evolNivel
      dadoExtraStr = `+${qtd}${match[2]}`
    }
  }

  let danoTotal = ''
  if (dadoExtraStr && flatExtra > 0) {
    danoTotal = `${dadoExtraStr}+${flatExtra}`
  } else if (dadoExtraStr) {
    danoTotal = dadoExtraStr
  } else if (flatExtra > 0) {
    danoTotal = `+${flatExtra}`
  }

  return {
    bracket,
    dadoExtra:    dadoExtraStr,
    flatExtra:    flatExtra > 0 ? `+${flatExtra}` : '',
    danoTotal,
    energiaExtra: energiaExtra > 0 ? `+${energiaExtra}` : '',
    duracaoExtra: duracaoExtra > 0 ? `+${duracaoExtra} rod.` : '',
  }
}

/**
 * Verifica se o personagem pode investir PEH nessa habilidade no nível dado.
 * Para Ultimate, restringe conforme a tabela LoL-like.
 */
export function canEvolveSkill(skill, currentEvolNivel, charNivel) {
  const max = getMaxEvolucao(skill.tipo)
  if (currentEvolNivel >= max) return { allowed: false, reason: `Nível máximo de evolução atingido (${max})` }

  if (skill.tipo === 'Passiva') return { allowed: false, reason: 'A Passiva evolui automaticamente' }

  if (skill.tipo === 'Ultimate') {
    const thresholds = [15, 25, 30]  // nível mínimo para 1º, 2º e 3º ponto
    const required = thresholds[currentEvolNivel]
    if (charNivel < required)
      return { allowed: false, reason: `Requer Nível ${required}+ para evoluir a Ultimate` }
  }

  return { allowed: true, reason: null }
}

/**
 * Calcula o nível de evolução automático da Passiva com base no nível do personagem.
 */
export function calcPassivaAutoEvolucao(charNivel) {
  if (charNivel >= 30) return 3
  if (charNivel >= 20) return 2
  if (charNivel >= 10) return 1
  return 0
}

/**
 * Total de PEH gasto no conjunto de habilidades.
 * Ignora a Passiva (evolução automática sem custo).
 */
export function calcPEHSpent(habilidades) {
  return (habilidades || [])
    .filter(h => h.tipo !== 'Passiva')
    .reduce((sum, h) => sum + (h.evolucaoNivel || 0), 0)
}

/**
 * Monta um resumo textual da evolução para enviar à IA durante análise.
 */
const BRACKET_TIERS = ['FRACA', 'MEDIA', 'FORTE', 'ULTIMATE']

export function getEffectiveBracket(bracket, evolucaoNivel, tipo) {
  if (tipo === 'Passiva') return 'PASSIVA'
  if (tipo === 'Ultimate') return 'ULTIMATE'
  const tierIdx = BRACKET_TIERS.indexOf(bracket)
  const upgrades = Math.floor((evolucaoNivel || 0) / 2)
  const effectiveIdx = Math.min(tierIdx + upgrades, BRACKET_TIERS.indexOf('FORTE'))
  return BRACKET_TIERS[effectiveIdx]
}

export function buildEvolucaoContext(habilidades, charNivel) {
  return (habilidades || []).map((h, i) => {
    const autoEvo = h.tipo === 'Passiva' ? calcPassivaAutoEvolucao(charNivel) : null
    const evoNivel = autoEvo !== null ? autoEvo : (h.evolucaoNivel || 0)
    const bracket = getSkillBracket(h.custoEnergia || 0, h.tipo)
    const tdhEfetivo = getEffectiveBracket(bracket, evoNivel, h.tipo)
    const maxEvo = getMaxEvolucao(h.tipo)
    const instrucaoIA = evoNivel === 0
      ? 'Calibrar para valores base do nível do personagem.'
      : tdhEfetivo !== bracket
        ? `EVOLUÇÃO Nível ${evoNivel}/${maxEvo}: o jogador INVESTIU ${evoNivel} PEH. O bracket base é ${bracket}, mas a evolução PROMOVE o TDH efetivo para ${tdhEfetivo}. Use a tabela TDH do bracket ${tdhEfetivo} para esta habilidade, NÃO use ${bracket}. Escale danos, duração, bônus e CDs proporcionalmente ao investimento.`
        : `EVOLUÇÃO Nível ${evoNivel}/${maxEvo}: o jogador INVESTIU ${evoNivel} PEH no bracket ${bracket}. Escale todos os efeitos proporcionalmente ao nível de evolução dentro do bracket ${bracket}.`
    return {
      index: i,
      nome: h.nome || `Habilidade ${i + 1}`,
      tipo: h.tipo,
      evolucaoNivel: evoNivel,
      bracket,
      tdhBracketEfetivo: tdhEfetivo,
      instrucaoIA,
    }
  })
}
