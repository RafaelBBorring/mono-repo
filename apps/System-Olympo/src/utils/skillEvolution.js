export function getLevelBand(nivel) {
  if (nivel <= 7) return 'N1-7'
  if (nivel <= 13) return 'N8-13'
  if (nivel <= 22) return 'N14-22'
  if (nivel <= 30) return 'N23-30'
  if (nivel <= 38) return 'N31-38'
  return 'N39-50'
}

export function getSkillBracket(custoEnergia, tipo) {
  if (tipo === 'Ultimate') return 'ULTIMATE'
  if (tipo === 'Passiva')  return 'PASSIVA'
  if (custoEnergia < 12)   return 'FRACA'
  if (custoEnergia <= 25)  return 'MEDIA'
  return 'FORTE'
}

export function getMaxEvolucao(tipo) {
  if (tipo === 'Passiva')  return 4
  if (tipo === 'Ultimate') return 5
  return 5
}

const DELTAS = {
  FRACA:    { dadoExtra: '2d8',  flat: 8,  energia: 6 },
  MEDIA:    { dadoExtra: '2d10', flat: 12, energia: 10 },
  FORTE:    { dadoExtra: '3d12', flat: 18, energia: 16 },
  ULTIMATE: { dadoExtra: '4d12', flat: 25, energia: 25 },
  PASSIVA:  { dadoExtra: '',     flat: 0,  energia: 0 },
}

const DURACAO_BONUS = {
  FRACA:    [0, 0, 1, 1, 1, 2],
  MEDIA:    [0, 0, 1, 1, 2, 2],
  FORTE:    [0, 1, 1, 2, 2, 3],
  ULTIMATE: [0, 1, 2, 2, 3, 3],
  PASSIVA:  [0, 0, 0, 0, 0, 0],
}

const DT_BONUS = [0, 2, 2, 3, 3, 4]

export function calcEvolucaoDelta(skill, evolNivel) {
  if (!evolNivel || evolNivel <= 0) return null
  const bracket = getSkillBracket(skill.custoEnergia || 0, skill.tipo)
  const delta = DELTAS[bracket]
  const duracaoBonusArr = DURACAO_BONUS[bracket] || [0,0,0,0,0,0]

  const duracaoExtra = duracaoBonusArr.slice(0, evolNivel + 1).reduce((a, b) => a + b, 0)
  const flatExtra    = delta.flat * evolNivel
  const energiaExtra = delta.energia * evolNivel
  const dtExtra      = DT_BONUS.slice(0, evolNivel + 1).reduce((a, b) => a + b, 0)

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

  const valores = {
    dadoExtraStr,
    flatExtra,
    energiaExtra,
    duracaoExtra,
    dtExtra,
    danoTotal,
  }

  return {
    bracket,
    dadoExtra:    dadoExtraStr,
    flatExtra:    flatExtra > 0 ? `+${flatExtra}` : '',
    danoTotal,
    energiaExtra: energiaExtra > 0 ? `+${energiaExtra}` : '',
    duracaoExtra: duracaoExtra > 0 ? `+${duracaoExtra} rod.` : '',
    dtExtra,
    allTags:      [],
    valores,
  }
}

export function canEvolveSkill(skill, currentEvolNivel, charNivel) {
  const max = getMaxEvolucao(skill.tipo)
  if (currentEvolNivel >= max) return { allowed: false, reason: `Nível máximo de evolução atingido (${max})` }

  if (skill.tipo === 'Passiva') return { allowed: false, reason: 'A Passiva evolui automaticamente' }

  if (skill.tipo === 'Ultimate') {
    const thresholds = [15, 25, 30, 38, 45]
    const required = thresholds[currentEvolNivel]
    if (!required) return { allowed: false, reason: 'Nível máximo de evolução atingido' }
    if (charNivel < required)
      return { allowed: false, reason: `Requer Nível ${required}+ para evoluir a Ultimate` }
  }

  return { allowed: true, reason: null }
}

export function calcPassivaAutoEvolucao(charNivel) {
  if (charNivel >= 40) return 4
  if (charNivel >= 30) return 3
  if (charNivel >= 20) return 2
  if (charNivel >= 10) return 1
  return 0
}

export function calcPEHSpent(habilidades) {
  return (habilidades || [])
    .filter(h => h.tipo !== 'Passiva')
    .reduce((sum, h) => sum + (h.evolucaoNivel || 0), 0)
}

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
    const delta = DELTAS[bracket]
    const dtExtra = DT_BONUS.slice(0, evoNivel + 1).reduce((a, b) => a + b, 0)
    const flatExtra = delta.flat * evoNivel
    const energiaExtra = delta.energia * evoNivel
    const duracaoBonusArr = DURACAO_BONUS[bracket] || [0,0,0,0,0,0]
    const duracaoExtra = duracaoBonusArr.slice(0, evoNivel + 1).reduce((a, b) => a + b, 0)

    const instrucaoIA = evoNivel === 0
      ? `PEH investido: 0. Use valores BASE (${bracket}). NAO escale por nivel do personagem.`
      : `PEH investido: ${evoNivel}/${maxEvo}. O jogador INVESTIU ${evoNivel} PEH nesta habilidade. Escale TODOS os efeitos: dadoExtra ${delta.dadoExtra || 'N/A'} x${evoNivel}, +${flatExtra} flat, +${energiaExtra} energia, +${dtExtra} DT, +${duracaoExtra} rodadas. TDH efetivo: ${tdhEfetivo}. CUSTO DE ENERGIA DEVE AUMENTAR com o PEH investido.`
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
