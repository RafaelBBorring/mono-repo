import { GRIMORIO_TIERS, MIN_LEVEL_FOR_CIRCLE } from '../data/grimorios'

export function getGrimorioAccessTier(char, knowledgeKey) {
  const attrs = char.atributos || {}
  const sk = char.skeletonPoints || {}
  const adjusted = {}
  for (const k of Object.keys(attrs)) {
    adjusted[k] = (attrs[k] || 0) + (sk[k] || 0)
  }

  const int = adjusted.INT || 0
  const am = adjusted.AM || 0
  const nivel = char.nivel || 1
  const pericias = char.pericias || {}

  let score = 0
  if (knowledgeKey === 'alchemy') {
    const alquimiaGrade = pericias.Alquimia || 0
    score = (int * 1.5) + (am * 1.0) + (alquimiaGrade * 8) + (nivel * 0.5)
  } else {
    const poderGrade = pericias.Poder || 0
    score = (am * 1.5) + (int * 1.0) + (poderGrade * 8) + (nivel * 0.5)
  }

  if (score >= 50) return 'mestre'
  if (score >= 30) return 'avancado'
  if (score >= 14) return 'iniciante'
  return null
}

export function getMaxCustomRituals(char, knowledgeKey) {
  const tier = getGrimorioAccessTier(char, knowledgeKey)
  if (!tier) return 0
  if (tier === 'mestre') return 6
  if (tier === 'avancado') return 4
  return 2
}

export function getAvailableGrimorioTiers(char, knowledgeKey) {
  const maxTier = getGrimorioAccessTier(char, knowledgeKey)
  if (!maxTier) return []
  const tierOrder = ['iniciante', 'avancado', 'mestre']
  const maxIdx = tierOrder.indexOf(maxTier)
  return GRIMORIO_TIERS.slice(0, maxIdx + 1)
}

export function getScoreForDisplay(char, knowledgeKey) {
  const attrs = char.atributos || {}
  const sk = char.skeletonPoints || {}
  const adjusted = {}
  for (const k of Object.keys(attrs)) {
    adjusted[k] = (attrs[k] || 0) + (sk[k] || 0)
  }
  const int = adjusted.INT || 0
  const am = adjusted.AM || 0
  const nivel = char.nivel || 1
  const pericias = char.pericias || {}

  if (knowledgeKey === 'alchemy') {
    const alquimiaGrade = pericias.Alquimia || 0
    return Math.floor((int * 1.5) + (am * 1.0) + (alquimiaGrade * 8) + (nivel * 0.5))
  }
  const poderGrade = pericias.Poder || 0
  return Math.floor((am * 1.5) + (int * 1.0) + (poderGrade * 8) + (nivel * 0.5))
}

export function getGrimorioMaxRituals(grimorio) {
  if (grimorio.tier === 'custom') return grimorio.maxRituals || 4
  const tier = GRIMORIO_TIERS.find(t => t.id === grimorio.tier)
  return tier?.maxRituals || 6
}

export function getGrimorioMaxCircle(grimorio) {
  return grimorio.maxCircle || 2
}

export function canAddRitualToGrimorio(grimorio, currentRituals, ritual) {
  const maxRituals = getGrimorioMaxRituals(grimorio)
  const maxCircle = getGrimorioMaxCircle(grimorio)
  const count = currentRituals.filter(r => (r.grimorioId || null) === grimorio.id).length

  if (count >= maxRituals) {
    return { allowed: false, reason: `Este grimório comporta no máximo ${maxRituals} rituais.` }
  }
  if (ritual.circle > maxCircle) {
    return { allowed: false, reason: `Este grimório suporta círculos até ${maxCircle}o.` }
  }
  return { allowed: true }
}

export function canCreateRitualAtCircle(char, circle) {
  const nivel = char.nivel || 1
  const minLevel = MIN_LEVEL_FOR_CIRCLE[circle] || 1
  if (nivel < minLevel) {
    return { allowed: false, reason: `Nível ${minLevel} necessário para rituais de ${circle}o círculo.` }
  }
  return { allowed: true }
}

export function getAvailableCirclesForChar(char, grimorio) {
  const nivel = char.nivel || 1
  const maxCircle = getGrimorioMaxCircle(grimorio)
  const circles = []
  for (let c = 1; c <= maxCircle; c++) {
    if (nivel >= (MIN_LEVEL_FOR_CIRCLE[c] || 1)) {
      circles.push(c)
    }
  }
  return circles
}
