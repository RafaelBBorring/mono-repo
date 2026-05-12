import { getSelectedSubrace, getRaceAdjustedAttrs } from './raceCalculator'
import { getTagValue } from './mysticTagHelpers'
import { SPACE_COST_BY_CIRCLE, normalizeClassKey } from './alchemyRules'

export const RUNE_TRAINING_RULES = {
  0: { label: 'Sem Vinculo', budget: 0, maxCircle: 1, active: 1, notes: ['Qualquer um pode portar runas, mas sem treino o vinculo fica superficial.'] },
  1: { label: 'Portador', budget: 2, maxCircle: 2, active: 1, notes: ['Ja sustenta runas menores e comuns de forma segura.'] },
  2: { label: 'Condutor', budget: 4, maxCircle: 3, active: 2, notes: ['Canaliza runas em cadeia e mantém efeitos com menos perda.'] },
  3: { label: 'Escriba', budget: 6, maxCircle: 4, active: 2, notes: ['Le e ativa matrizes runicas complexas com consistencia.'] },
  4: { label: 'Soberano', budget: 8, maxCircle: 4, active: 3, notes: ['Porta runas maiores com presença suficiente para ativacoes paralelas.'] },
}

const RUNE_BASE_RULES = [
  { maxLevel: 4, spaceBudget: 6, maxCircle: 1, maxByCircle: { 1: 2, 2: 0, 3: 0, 4: 0 }, active: 1 },
  { maxLevel: 9, spaceBudget: 10, maxCircle: 2, maxByCircle: { 1: 3, 2: 1, 3: 0, 4: 0 }, active: 1 },
  { maxLevel: 14, spaceBudget: 14, maxCircle: 3, maxByCircle: { 1: 4, 2: 2, 3: 1, 4: 0 }, active: 2 },
  { maxLevel: 19, spaceBudget: 18, maxCircle: 4, maxByCircle: { 1: 4, 2: 3, 3: 2, 4: 1 }, active: 2 },
  { maxLevel: 24, spaceBudget: 22, maxCircle: 4, maxByCircle: { 1: 5, 2: 3, 3: 2, 4: 1 }, active: 3 },
  { maxLevel: 30, spaceBudget: 26, maxCircle: 4, maxByCircle: { 1: 6, 2: 4, 3: 3, 4: 2 }, active: 3 },
]

const CLASS_AFFINITY = {
  GUERREIRO: { budget: 1, circle: 0, active: 0, circleCaps: { 1: 1, 2: 0, 3: 0, 4: 0 }, notes: ['Guerreiros costumam preferir poucas runas de impacto direto.'] },
  OPERATIVO: { budget: 2, circle: 0, active: 0, circleCaps: { 1: 1, 2: 1, 3: 0, 4: 0 }, notes: ['Operativos tiram muito valor de mobilidade e sigilo runico.'] },
  MISTICO: { budget: 4, circle: 1, active: 1, circleCaps: { 1: 1, 2: 1, 3: 1, 4: 0 }, notes: ['Misticos mantem mais runas ligadas ao mesmo tempo.'] },
}

const RACE_AFFINITY = {
  HUMANO: { budget: 1, circle: 0, active: 0, circleCaps: { 1: 1, 2: 0, 3: 0, 4: 0 }, notes: ['Humanos adaptam runas bem quando realmente escolhem estudar.'] },
  HUMANO_APRIMORADO: { budget: 2, circle: 0, active: 0, circleCaps: { 1: 1, 2: 1, 3: 0, 4: 0 }, notes: ['Corpos modificados aguentam inscrições e catalisadores.'] },
  ELFO: { budget: 2, circle: 0, active: 0, circleCaps: { 1: 1, 2: 1, 3: 0, 4: 0 }, notes: ['Elfos leem a simbologia com grande precisão.'] },
  BRUXA: { budget: 2, circle: 0, active: 0, circleCaps: { 1: 1, 2: 1, 3: 0, 4: 0 }, notes: ['Bruxas cruzam runas com tradição ritual com facilidade.'] },
  MAGO: { budget: 3, circle: 0, active: 0, circleCaps: { 1: 1, 2: 1, 3: 1, 4: 0 }, notes: ['Magos tratam runas como escrita de campo rápido.'] },
  HUMANO_MISTICO: { budget: 3, circle: 1, active: 1, circleCaps: { 1: 1, 2: 1, 3: 1, 4: 0 }, notes: ['Guardioes rúnicos conseguem manter selos mais densos.'] },
  DEMONIO: { budget: 1, circle: 0, active: 0, circleCaps: { 1: 0, 2: 1, 3: 0, 4: 0 }, notes: ['Energia infernal aceita runas de controle e esmagamento, mas cobra estabilidade.'] },
}

export function getRuneTrainingLevel(char = {}) {
  return Math.max(0, Math.min(4, char?.pericias?.Poder || 0))
}

export function getRuneSpaceCost(circle) {
  return SPACE_COST_BY_CIRCLE[circle] || 0
}

export function getRuneSpaceUsed(runes = []) {
  return (runes || []).reduce((sum, rune) => sum + getRuneSpaceCost(rune.circle), 0)
}

export function getRuneActiveCount(runes = []) {
  return (runes || []).filter((rune) => rune.active).length
}

export function getRuneProfile(char = {}) {
  const nivel = Math.max(1, Math.min(50, char.nivel || 1))
  const trainingLevel = getRuneTrainingLevel(char)
  const hasModule = (char.modulosAdquiridos || []).some(m => m.id === 'vinculo_runico')
  const hasAccess = hasModule

  if (!hasAccess) {
    return {
      nivel,
      trainingLevel,
      trainingLabel: RUNE_TRAINING_RULES[trainingLevel]?.label || 'Sem Vinculo',
      maxCircle: 0,
      spaceBudget: 0,
      maxByCircle: { 1: 0, 2: 0, 3: 0, 4: 0 },
      activeSlots: 0,
      hasAccess: false,
      accessReason: 'Runas requer o modulo de evolucao "Vinculo Runico" (CON 14+ ou FOR 14+).',
      notes: [],
    }
  }

  const adjustedAttrs = getRaceAdjustedAttrs(char.atributos, char.skeletonPoints || {}, char)
  const base = RUNE_BASE_RULES.find((rule) => nivel <= rule.maxLevel) || RUNE_BASE_RULES[RUNE_BASE_RULES.length - 1]
  const classKey = normalizeClassKey(char.classe)
  const raceKey = char.raca || ''
  const subrace = getSelectedSubrace(char)

  const classAffinity = CLASS_AFFINITY[classKey] || { budget: 0, circle: 0, active: 0, circleCaps: {}, notes: [] }
  const raceAffinity = RACE_AFFINITY[raceKey] || { budget: 0, circle: 0, active: 0, circleCaps: {}, notes: [] }
  const training = RUNE_TRAINING_RULES[trainingLevel] || RUNE_TRAINING_RULES[0]

  let maxCircle = Math.min(4, Math.max(1, Math.min(base.maxCircle + classAffinity.circle + raceAffinity.circle, training.maxCircle + classAffinity.circle + raceAffinity.circle)))
  let spaceBudget = Math.max(4, base.spaceBudget + training.budget + classAffinity.budget + raceAffinity.budget)
  let activeSlots = Math.max(1, base.active + training.active + classAffinity.active + raceAffinity.active)

  const maxByCircle = {}
  for (const circle of [1, 2, 3, 4]) {
    const rawCap = (base.maxByCircle[circle] || 0) + (classAffinity.circleCaps?.[circle] || 0) + (raceAffinity.circleCaps?.[circle] || 0)
    maxByCircle[circle] = circle <= maxCircle ? Math.max(0, rawCap) : 0
  }

  if (raceKey === 'HUMANO_APRIMORADO' && subrace?.id === 'RUNICO') {
    spaceBudget += 4
    activeSlots += 1
    maxByCircle[2] += 1
    maxByCircle[3] += 1
  }
  if (raceKey === 'DEMONIO' && !['SUPERIOR', 'SENHOR_CIRCULO'].includes(subrace?.id)) {
    maxByCircle[4] = 0
  }

  return {
    nivel,
    trainingLevel,
    trainingLabel: training.label,
    maxCircle,
    spaceBudget,
    maxByCircle,
    activeSlots,
    hasAccess: true,
    accessReason: 'Seu personagem atende aos requisitos para portar runas.',
    notes: [...training.notes, ...classAffinity.notes, ...raceAffinity.notes],
  }
}

export function canLearnRune(char = {}, selectedRunes = [], rune) {
  if (!rune) return { allowed: false, reason: 'Runa invalida.' }

  const profile = getRuneProfile(char)
  const selected = selectedRunes || []
  const alreadyKnown = selected.some((item) => item.id === rune.id)
  const level = char.nivel || 1
  const spaceUsed = getRuneSpaceUsed(selected)
  const runeCost = getRuneSpaceCost(rune.circle)

  if (alreadyKnown) return { allowed: true, reason: '' }
  if (rune.min_level > level) {
    return { allowed: false, reason: `Exige nivel ${rune.min_level}.` }
  }
  if (rune.circle > profile.maxCircle) {
    return { allowed: false, reason: `Seu limite atual vai ate o ${profile.maxCircle}o circulo.` }
  }
  if (spaceUsed + runeCost > profile.spaceBudget) {
    return { allowed: false, reason: `Espacos insuficientes: ${spaceUsed}/${profile.spaceBudget} usados e esta runa custa ${runeCost}.` }
  }

  const sameCircleCount = selected.filter((item) => item.circle === rune.circle).length
  if (sameCircleCount >= (profile.maxByCircle[rune.circle] || 0)) {
    return { allowed: false, reason: `Limite de runas do ${rune.circle}o circulo atingido.` }
  }

  return { allowed: true, reason: '' }
}

export function canActivateRune(char = {}, selectedRunes = [], runeId) {
  const profile = getRuneProfile(char)
  const activeCount = getRuneActiveCount(selectedRunes)
  const target = (selectedRunes || []).find((rune) => rune.id === runeId)
  if (!target) return { allowed: false, reason: 'Runa nao encontrada.' }
  if (target.active) return { allowed: true, reason: '' }

  if (activeCount >= profile.activeSlots) {
    return { allowed: false, reason: `Limite de runas ativas atingido (${activeCount}/${profile.activeSlots}).` }
  }
  const grade = getTagValue(target.tags, 'grade')
  if (grade === 'maior' && (selectedRunes || []).some((rune) => rune.active && getTagValue(rune.tags, 'grade') === 'maior')) {
    return { allowed: false, reason: 'Apenas 1 runa maior pode ficar ativa ao mesmo tempo.' }
  }
  return { allowed: true, reason: '' }
}

export function toggleRuneActiveState(char = {}, selectedRunes = [], runeId) {
  const runes = selectedRunes || []
  const target = runes.find((rune) => rune.id === runeId)
  if (!target) return { next: runes, gate: { allowed: false, reason: 'Runa nao encontrada.' } }
  if (target.active) {
    return {
      next: runes.map((rune) => rune.id === runeId ? { ...rune, active: false } : rune),
      gate: { allowed: true, reason: '' },
    }
  }

  const gate = canActivateRune(char, runes, runeId)
  if (!gate.allowed) return { next: runes, gate }
  return {
    next: runes.map((rune) => rune.id === runeId ? { ...rune, active: true } : rune),
    gate,
  }
}

export function normalizeSelectedRune(rune) {
  if (!rune) return null
  return {
    id: rune.id,
    name: rune.name,
    ritual_type: 'rune',
    circle: rune.circle,
    category: rune.category,
    pe_cost: rune.pe_cost,
    min_level: rune.min_level,
    action_cost: rune.action_cost,
    duration: rune.duration,
    range: rune.range,
    short_description: rune.short_description,
    effect: rune.effect,
    source_kind: rune.source_kind,
    source_name: rune.source_name,
    law_name: rune.law_name,
    price: rune.price,
    rupture_risk: rune.rupture_risk,
    protocol_layer: rune.protocol_layer,
    tags: rune.tags || [],
    space_cost: getRuneSpaceCost(rune.circle),
    active: false,
  }
}
