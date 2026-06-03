/**
 * SISTEMA DE EVOLUCAO DE HABILIDADES — Olympo 2.0
 *
 * PARADIGMA PEH: Habilidades comecam no nivel BASE (PEH=0).
 * Os Pontos de Evolucao (PEH) sao o UNICO motor de escala.
 * O jogador investe PEH → aciona o Oraculo → IA recalibra com novos valores.
 *
 * Regras:
 *  - Passiva:   Evolui automaticamente nos niveis 10, 20 e 30 (sem custo PEH).
 *  - Ativa:     Maximo 5 niveis. Custo: 1 PEH por nivel.
 *  - Ultimate:  Maximo 3 niveis. Custo: 1 PEH por nivel.
 *               1o ponto: N15+ | 2o: N25+ | 3o: N30.
 *
 * Deltas por PEH (preview estimado — valores finais sao recalibrados pela IA):
 *  - Fraca:  +1d6,  +4 flat,  +5E por PEH
 *  - Media:  +1d8,  +7 flat,  +8E por PEH
 *  - Forte:  +1d10, +10 flat, +13E por PEH
 *  - Ultimate: +5d12, +21 flat, +30E por PEH
 */

export function getSkillBracket(custoEnergia, tipo) {
  if (tipo === 'Ultimate') return 'ULTIMATE'
  if (tipo === 'Passiva')  return 'PASSIVA'
  if (custoEnergia < 12)   return 'FRACA'
  if (custoEnergia <= 25)  return 'MEDIA'
  return 'FORTE'
}

export function getMaxEvolucao(tipo) {
  if (tipo === 'Passiva')  return 3
  if (tipo === 'Ultimate') return 3
  return 5
}

const DELTAS = {
  FRACA:    { dadoExtra: '1d6',  flat: 4,  energia: 5 },
  MEDIA:    { dadoExtra: '1d8',  flat: 7,  energia: 8 },
  FORTE:    { dadoExtra: '1d10', flat: 10, energia: 13 },
  ULTIMATE: { dadoExtra: '5d12', flat: 21, energia: 30 },
  PASSIVA:  { dadoExtra: '',     flat: 0,  energia: 0 },
}

const DURACAO_BONUS = {
  FRACA:    [0, 0, 1, 0, 1, 1],
  MEDIA:    [0, 0, 1, 0, 1, 2],
  FORTE:    [0, 0, 0, 1, 1, 2],
  ULTIMATE: [0, 0, 1, 2, 0, 0],
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
      ? `PEH investido: 0. Use valores BASE (${bracket}). NAO escale por nivel do personagem.`
      : `PEH investido: ${evoNivel}/${maxEvo}. O jogador INVESTIU ${evoNivel} PEH nesta habilidade. Escale TODOS os efeitos proporcionalmente: +${evoNivel} dados, +flat proporcional, +custo de energia proporcional. DT +${evoNivel} se aplicavel. TDH efetivo: ${tdhEfetivo}. CUSTO DE ENERGIA DEVE AUMENTAR com o PEH investido.`
    return {
      index: i,
      nome: h.nome || `Habilidade ${i + 1}`,
      tipo: h.tipo,
      evolucaoNivel: evoNivel,
      bracket,
      tdhBracketEfetivo: tdhEfetivo,
      custoEnergiaAtual: h.custoEnergia || 0,
      instrucaoIA,
    }
  })
}
