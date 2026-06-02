import { getSelectedSubrace } from './raceCalculator'
import { getTagValue } from './mysticTagHelpers'
import { BASE_RULES_BY_LEVEL, SPACE_COST_BY_CIRCLE, normalizeClassKey } from './alchemyRules'

export const SPELL_TRAINING_RULES = {
  0: { label: 'Sem Foco', budget: -4, maxCircle: 1, notes: ['Sem treino real em Poder, o personagem so estabiliza feitiços curtos e lineares.'] },
  1: { label: 'Canalizador', budget: 0, maxCircle: 3, notes: ['Consegue moldar feitiços basicos com regularidade.'] },
  2: { label: 'Condutor', budget: 3, maxCircle: 5, notes: ['Ja manipula escolas e custos com consistencia.'] },
  3: { label: 'Conjurador', budget: 6, maxCircle: 7, notes: ['Sustenta cadeias de feitiços de alto impacto.'] },
  4: { label: 'Hierofante', budget: 10, maxCircle: 9, notes: ['Mestre absoluto de feitiços. Acessa todos os 9 circulos com eficiencia maxima.'] },
}

const SPELL_SPACE_COST_BY_CIRCLE = {
  1: 4, 2: 6, 3: 10, 4: 15, 5: 20, 6: 26, 7: 33, 8: 42, 9: 52,
}

const SPELL_BASE_RULES = [
  { maxLevel: 4, spaceBudget: 14, maxCircle: 2, maxByCircle: { 1: 3, 2: 1, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 } },
  { maxLevel: 9, spaceBudget: 22, maxCircle: 3, maxByCircle: { 1: 4, 2: 2, 3: 1, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 } },
  { maxLevel: 14, spaceBudget: 32, maxCircle: 5, maxByCircle: { 1: 5, 2: 3, 3: 2, 4: 1, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0 } },
  { maxLevel: 19, spaceBudget: 44, maxCircle: 6, maxByCircle: { 1: 5, 2: 4, 3: 2, 4: 2, 5: 1, 6: 1, 7: 0, 8: 0, 9: 0 } },
  { maxLevel: 24, spaceBudget: 58, maxCircle: 7, maxByCircle: { 1: 6, 2: 4, 3: 3, 4: 2, 5: 2, 6: 1, 7: 1, 8: 0, 9: 0 } },
  { maxLevel: 27, spaceBudget: 72, maxCircle: 8, maxByCircle: { 1: 7, 2: 5, 3: 3, 4: 2, 5: 2, 6: 2, 7: 1, 8: 1, 9: 0 } },
  { maxLevel: 30, spaceBudget: 90, maxCircle: 9, maxByCircle: { 1: 8, 2: 5, 3: 4, 4: 3, 5: 2, 6: 2, 7: 1, 8: 1, 9: 1 } },
]

const CLASS_AFFINITY = {
  GUERREIRO: { budget: 0, circle: 0, circleCaps: {}, notes: ['Guerreiros nao acessam feitiços naturalmente.'] },
  OPERATIVO: { budget: 0, circle: 0, circleCaps: {}, notes: ['Operativos nao acessam feitiços naturalmente.'] },
  MISTICO: { budget: 3, circle: 1, circleCaps: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0, 7: 0, 8: 0, 9: 0 }, notes: ['Misticos com raca apta ampliam o repertorio de feitiços significativamente.'] },
}

const SPELL_ELIGIBLE_RACES = ['BRUXA', 'HUMANO_MISTICO']

const RACE_AFFINITY = {
  BRUXA: { budget: 8, circle: 2, circleCaps: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 0, 8: 0, 9: 0 }, notes: ['Bruxas sao a referencia de feitiços rituais e de maldicao. Acessam ate 6o circulo.'] },
  HUMANO_MISTICO: { budget: 8, circle: 2, circleCaps: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 }, notes: ['Guardioes misticos navegam feitiços e sistemas epicos com alta sincronia. Unicos com potencial para 9o circulo.'] },
}

export function getSpellTrainingLevel(char = {}) {
  return Math.max(0, Math.min(4, char?.pericias?.Poder || 0))
}

export function getSpellSpaceCost(circle) {
  return SPELL_SPACE_COST_BY_CIRCLE[circle] || 0
}

export function getSpellSpaceUsed(spells = []) {
  return (spells || []).reduce((sum, spell) => sum + getSpellSpaceCost(spell.circle), 0)
}

export function getSpellTraditions(char = {}) {
  const raceKey = char.raca || ''
  const traditions = new Set()

  if (raceKey === 'BRUXA') traditions.add('bruxaria')
  if (raceKey === 'HUMANO_MISTICO') {
    traditions.add('bruxaria')
    traditions.add('arcana')
  }

  return [...traditions]
}

export function getSpellProfile(char = {}) {
  const nivel = Math.max(1, Math.min(30, char.nivel || 1))
  const trainingLevel = getSpellTrainingLevel(char)
  const base = SPELL_BASE_RULES.find((rule) => nivel <= rule.maxLevel) || SPELL_BASE_RULES[SPELL_BASE_RULES.length - 1]
  const classKey = normalizeClassKey(char.classe)
  const raceKey = char.raca || ''
  const subrace = getSelectedSubrace(char)

  const classAffinity = CLASS_AFFINITY[classKey] || { budget: 0, circle: 0, circleCaps: {}, notes: [] }
  const raceAffinity = RACE_AFFINITY[raceKey] || { budget: 0, circle: 0, circleCaps: {}, notes: [] }
  const training = SPELL_TRAINING_RULES[trainingLevel] || SPELL_TRAINING_RULES[0]
  const traditions = getSpellTraditions(char)

  const hasAccess = traditions.length > 0
  const accessReason = hasAccess
    ? 'Seu personagem pode estudar feiticops.'
    : 'Feiticops requer linhagem apta (Bruxa ou Humano Mistico).'

  const levelCircleCap = Math.min(4, Math.max(1, base.maxCircle + classAffinity.circle + raceAffinity.circle))
  const trainingCircleCap = Math.min(4, Math.max(1, training.maxCircle + classAffinity.circle + raceAffinity.circle))
  const maxCircle = hasAccess ? Math.min(9, Math.min(levelCircleCap, trainingCircleCap)) : 0

  const int = Math.max(0, (char.atributos?.INT || 0) + (char.skeletonPoints?.INT || 0))
  const am = Math.max(0, (char.atributos?.AM || 0) + (char.skeletonPoints?.AM || 0))
  let spaceBudget = hasAccess ? Math.max(0, base.spaceBudget + training.budget + classAffinity.budget + raceAffinity.budget + Math.floor(am / 4) + Math.floor(int / 4)) : 0

  const baseCircleCaps = base.maxByCircle || {}
  const maxByCircle = {}
  for (const circle of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    const rawCap = (baseCircleCaps[circle] || 0) + (classAffinity.circleCaps?.[circle] || 0) + (raceAffinity.circleCaps?.[circle] || 0)
    maxByCircle[circle] = circle <= maxCircle ? Math.max(0, rawCap) : 0
  }

  return {
    nivel,
    trainingLevel,
    trainingLabel: training.label,
    maxCircle,
    spaceBudget,
    maxByCircle,
    notes: [accessReason, ...training.notes, ...classAffinity.notes, ...raceAffinity.notes],
    hasAccess,
    accessReason,
    traditions,
  }
}

export function canLearnSpell(char = {}, selectedSpells = [], spell) {
  if (!spell) return { allowed: false, reason: 'Feitico invalido.' }

  const profile = getSpellProfile(char)
  if (!profile.hasAccess) return { allowed: false, reason: profile.accessReason }

  const selected = selectedSpells || []
  const alreadyKnown = selected.some((item) => item.id === spell.id)
  const level = char.nivel || 1
  const spaceUsed = getSpellSpaceUsed(selected)
  const spellCost = getSpellSpaceCost(spell.circle)
  const tradition = getTagValue(spell.tags, 'tradition')

  if (alreadyKnown) return { allowed: true, reason: '' }
  if (tradition && !profile.traditions.includes(tradition)) {
    return { allowed: false, reason: `Seu repertorio atual nao acessa a tradicao ${tradition}.` }
  }
  if (spell.min_level > level) {
    return { allowed: false, reason: `Exige nivel ${spell.min_level}.` }
  }
  if (spell.circle > profile.maxCircle) {
    return { allowed: false, reason: `Seu limite atual vai ate o ${profile.maxCircle}o circulo.` }
  }
  if (spaceUsed + spellCost > profile.spaceBudget) {
    return { allowed: false, reason: `Espacos insuficientes: ${spaceUsed}/${profile.spaceBudget} usados e este feitico custa ${spellCost}.` }
  }

  const sameCircleCount = selected.filter((item) => item.circle === spell.circle).length
  if (sameCircleCount >= (profile.maxByCircle[spell.circle] || 0)) {
    return { allowed: false, reason: `Limite de feiticos do ${spell.circle}o circulo atingido.` }
  }

  return { allowed: true, reason: '' }
}

export function normalizeSelectedSpell(spell) {
  if (!spell) return null
  return {
    id: spell.id,
    name: spell.name,
    ritual_type: 'spell',
    circle: spell.circle,
    category: spell.category,
    pe_cost: spell.pe_cost,
    min_level: spell.min_level,
    action_cost: spell.action_cost,
    duration: spell.duration,
    range: spell.range,
    short_description: spell.short_description,
    effect: spell.effect,
    source_kind: spell.source_kind,
    source_name: spell.source_name,
    law_name: spell.law_name,
    price: spell.price,
    rupture_risk: spell.rupture_risk,
    protocol_layer: spell.protocol_layer,
    tags: spell.tags || [],
    space_cost: getSpellSpaceCost(spell.circle),
  }
}
