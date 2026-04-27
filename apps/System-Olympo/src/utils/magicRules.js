import { getSelectedSubrace } from './raceCalculator'
import { getTagValue } from './mysticTagHelpers'
import { SPACE_COST_BY_CIRCLE, normalizeClassKey } from './alchemyRules'

export const MAGIC_CATEGORIES = ['Ataque', 'Defesa', 'Suporte', 'Controle', 'Mobilidade', 'Utilidade', 'Cura']

export const MAGIC_COMPLEXITY = {
  1: 'Basica',
  2: 'Intermediaria',
  3: 'Avancada',
  4: 'Suprema',
}

export const MAGIC_TRAINING_RULES = {
  0: { label: 'Sem Foco', budget: -4, maxCircle: 1, notes: ['Sem treino em Poder, o mago so estabiliza magias simples e lineares.'] },
  1: { label: 'Aprendiz', budget: 0, maxCircle: 2, notes: ['Canaliza magias basicas com regularidade.'] },
  2: { label: 'Conjurador', budget: 3, maxCircle: 3, notes: ['Manipula escolas e custos com consistencia.'] },
  3: { label: 'Arquimago', budget: 6, maxCircle: 4, notes: ['Sustenta cadeias de magia de alto impacto.'] },
  4: { label: 'Magus Supremo', budget: 8, maxCircle: 4, notes: ['Opera magias densas com menor desperdicio energetico.'] },
}

const MAGIC_BASE_RULES = [
  { maxLevel: 4, spaceBudget: 8, maxCircle: 1, maxByCircle: { 1: 2, 2: 0, 3: 0, 4: 0 } },
  { maxLevel: 9, spaceBudget: 12, maxCircle: 2, maxByCircle: { 1: 3, 2: 2, 3: 0, 4: 0 } },
  { maxLevel: 14, spaceBudget: 18, maxCircle: 3, maxByCircle: { 1: 4, 2: 3, 3: 1, 4: 0 } },
  { maxLevel: 19, spaceBudget: 22, maxCircle: 4, maxByCircle: { 1: 4, 2: 3, 3: 2, 4: 1 } },
  { maxLevel: 24, spaceBudget: 26, maxCircle: 4, maxByCircle: { 1: 5, 2: 4, 3: 2, 4: 1 } },
  { maxLevel: 30, spaceBudget: 30, maxCircle: 4, maxByCircle: { 1: 6, 2: 4, 3: 3, 4: 2 } },
]

const CLASS_AFFINITY = {
  GUERREIRO: { budget: 0, circle: 0, circleCaps: {}, notes: ['Guerreiros nao acessam magias arcana.'] },
  OPERATIVO: { budget: 0, circle: 0, circleCaps: {}, notes: ['Operativos nao acessam magias arcana.'] },
  MISTICO: { budget: 2, circle: 0, circleCaps: { 1: 1, 2: 1, 3: 0, 4: 0 }, notes: ['Misticos que sejam Magos recebem leve ampliacao de repertorio.'] },
}

const RACE_AFFINITY = {
  MAGO: { budget: 6, circle: 1, circleCaps: { 1: 1, 2: 1, 3: 1, 4: 1 }, notes: ['Magos sao a unica raca com acesso nativo a Magias. Foco arcano e parte da identidade racial.'] },
  HUMANO_MISTICO: { budget: 2, circle: 0, circleCaps: { 1: 0, 2: 0, 3: 0, 4: 0 }, notes: ['Guardioes misticos nao acessam magias — usam feitiços e rituais.'] },
}

export function getMagicTrainingLevel(char = {}) {
  return Math.max(0, Math.min(4, char?.pericias?.Poder || 0))
}

export function getMagicSpaceCost(circle) {
  return SPACE_COST_BY_CIRCLE[circle] || 0
}

export function getMagicSpaceUsed(magics = []) {
  return (magics || []).reduce((sum, m) => sum + getMagicSpaceCost(m.circle), 0)
}

export function getMagicProfile(char = {}) {
  const nivel = Math.max(1, Math.min(30, char.nivel || 1))
  const trainingLevel = getMagicTrainingLevel(char)
  const base = MAGIC_BASE_RULES.find((rule) => nivel <= rule.maxLevel) || MAGIC_BASE_RULES[MAGIC_BASE_RULES.length - 1]
  const classKey = normalizeClassKey(char.classe)
  const raceKey = char.raca || ''

  const raceAffinity = RACE_AFFINITY[raceKey] || null
  const hasAccess = raceKey === 'MAGO'

  if (!hasAccess) {
    return {
      nivel,
      trainingLevel,
      trainingLabel: MAGIC_TRAINING_RULES[trainingLevel]?.label || 'Sem Foco',
      maxCircle: 0,
      spaceBudget: 0,
      maxByCircle: { 1: 0, 2: 0, 3: 0, 4: 0 },
      hasAccess: false,
      accessReason: 'Apenas Magos possuem acesso a Magias. Outras racas usam Feitiços, Rituais ou Runas.',
      complexityLabels: MAGIC_COMPLEXITY,
      notes: [],
    }
  }

  const classAffinity = CLASS_AFFINITY[classKey] || { budget: 0, circle: 0, circleCaps: {}, notes: [] }
  const training = MAGIC_TRAINING_RULES[trainingLevel] || MAGIC_TRAINING_RULES[0]

  const levelCircleCap = Math.min(4, Math.max(1, base.maxCircle + raceAffinity.circle + classAffinity.circle))
  const trainingCircleCap = Math.min(4, Math.max(1, training.maxCircle + raceAffinity.circle + classAffinity.circle))
  const maxCircle = Math.min(levelCircleCap, trainingCircleCap)

  const spaceBudget = Math.max(4, base.spaceBudget + training.budget + raceAffinity.budget + classAffinity.budget)

  const baseCircleCaps = base.maxByCircle || { 1: 0, 2: 0, 3: 0, 4: 0 }
  const maxByCircle = {}
  for (const circle of [1, 2, 3, 4]) {
    const rawCap = (baseCircleCaps[circle] || 0) + (raceAffinity.circleCaps?.[circle] || 0) + (classAffinity.circleCaps?.[circle] || 0)
    maxByCircle[circle] = circle <= maxCircle ? Math.max(0, rawCap) : 0
  }

  if (classKey === 'MISTICO') maxByCircle[3] += 1

  return {
    nivel,
    trainingLevel,
    trainingLabel: training.label,
    maxCircle,
    spaceBudget,
    maxByCircle,
    hasAccess: true,
    accessReason: 'Seu sangue arcano permite canalizar Magias diretamente.',
    complexityLabels: MAGIC_COMPLEXITY,
    notes: [...training.notes, ...classAffinity.notes, ...raceAffinity.notes],
  }
}

export function canLearnMagic(char = {}, selectedMagics = [], magic) {
  if (!magic) return { allowed: false, reason: 'Magia invalida.' }

  const profile = getMagicProfile(char)
  if (!profile.hasAccess) return { allowed: false, reason: profile.accessReason }

  const selected = selectedMagics || []
  const alreadyKnown = selected.some((item) => item.id === magic.id)
  const level = char.nivel || 1
  const spaceUsed = getMagicSpaceUsed(selected)
  const magicCost = getMagicSpaceCost(magic.circle)

  if (alreadyKnown) return { allowed: true, reason: '' }
  if (magic.min_level > level) return { allowed: false, reason: `Exige nivel ${magic.min_level}.` }
  if (magic.circle > profile.maxCircle) return { allowed: false, reason: `Seu limite atual vai ate o ${profile.maxCircle}o circulo (${MAGIC_COMPLEXITY[profile.maxCircle]}).` }
  if (spaceUsed + magicCost > profile.spaceBudget) return { allowed: false, reason: `Espacos insuficientes: ${spaceUsed}/${profile.spaceBudget} usados e esta magia custa ${magicCost}.` }

  const sameCircleCount = selected.filter((item) => item.circle === magic.circle).length
  if (sameCircleCount >= (profile.maxByCircle[magic.circle] || 0)) return { allowed: false, reason: `Limite de magias do ${magic.circle}o circulo (${MAGIC_COMPLEXITY[magic.circle]}) atingido.` }

  return { allowed: true, reason: '' }
}

export function normalizeSelectedMagic(magic) {
  if (!magic) return null
  return {
    id: magic.id,
    name: magic.name,
    ritual_type: 'magic',
    circle: magic.circle,
    category: magic.category,
    pe_cost: magic.pe_cost,
    min_level: magic.min_level,
    action_cost: magic.action_cost,
    duration: magic.duration,
    range: magic.range,
    short_description: magic.short_description,
    effect: magic.effect,
    source_kind: magic.source_kind || 'neutro',
    source_name: magic.source_name || '',
    law_name: magic.law_name || '',
    price: magic.price || '',
    rupture_risk: magic.rupture_risk || 1,
    protocol_layer: magic.protocol_layer || 2,
    tags: magic.tags || [],
    space_cost: getMagicSpaceCost(magic.circle),
  }
}
