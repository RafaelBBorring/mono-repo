export const SPACE_COST_BY_CIRCLE = {
  1: 4,
  2: 6,
  3: 10,
  4: 15,
}

export const ALCHEMY_TRAINING_RULES = {
  0: { label: 'Nao Treinado', budget: -2, maxCircle: 1, notes: ['Sem treino formal: aprende apenas formulas basicas e instaveis.'] },
  1: { label: 'Treinado', budget: 0, maxCircle: 2, notes: ['Ja consegue executar rituais com seguranca minima.'] },
  2: { label: 'Veterano', budget: 2, maxCircle: 3, notes: ['Entende componentes, custo energetico e cadeias de sigilos.'] },
  3: { label: 'Especialista', budget: 4, maxCircle: 4, notes: ['Mantem rituais complexos e administra risco de ruptura.'] },
  4: { label: 'Mestre', budget: 6, maxCircle: 4, notes: ['Opera formulas profundas e sustenta mais espacos alquimicos.'] },
}

export const BASE_RULES_BY_LEVEL = [
  { maxLevel: 4, spaceBudget: 8, maxCircle: 1, maxByCircle: { 1: 2, 2: 0, 3: 0, 4: 0 } },
  { maxLevel: 9, spaceBudget: 12, maxCircle: 2, maxByCircle: { 1: 3, 2: 1, 3: 0, 4: 0 } },
  { maxLevel: 14, spaceBudget: 16, maxCircle: 3, maxByCircle: { 1: 4, 2: 2, 3: 1, 4: 0 } },
  { maxLevel: 19, spaceBudget: 20, maxCircle: 4, maxByCircle: { 1: 4, 2: 3, 3: 2, 4: 1 } },
  { maxLevel: 24, spaceBudget: 24, maxCircle: 4, maxByCircle: { 1: 5, 2: 3, 3: 2, 4: 1 } },
  { maxLevel: 30, spaceBudget: 28, maxCircle: 4, maxByCircle: { 1: 6, 2: 4, 3: 3, 4: 2 } },
]

export const CLASS_AFFINITY = {
  GUERREIRO: {
    budget: 0,
    circle: 0,
    circleCaps: { 1: 0, 2: 0, 3: 0, 4: 0 },
    notes: ['Conhecimento marcial: aprende alquimia devagar, priorizando poucas formulas de impacto direto.'],
  },
  OPERATIVO: {
    budget: 2,
    circle: 0,
    circleCaps: { 1: 0, 2: 1, 3: 0, 4: 0 },
    notes: ['Perfil tecnico favorece composicoes precisas e rituais utilitarios.'],
  },
  MISTICO: {
    budget: 6,
    circle: 1,
    circleCaps: { 1: 0, 2: 1, 3: 1, 4: 1 },
    notes: ['Classe mais apta a absorver PE, formula e risco metafisico.'],
  },
}

export const RACE_AFFINITY = {
  HUMANO: { budget: 2, circle: 0, circleCaps: { 1: 1, 2: 0, 3: 0, 4: 0 }, notes: ['Adaptabilidade humana favorece estudo alquimico.'] },
  HUMANO_APRIMORADO: { budget: 2, circle: 0, circleCaps: { 1: 0, 2: 1, 3: 0, 4: 0 }, notes: ['Corpo modificado suporta reagentes e stress celular.'] },
  ELFO: { budget: 2, circle: 0, circleCaps: { 1: 1, 2: 0, 3: 0, 4: 0 }, notes: ['Longevidade e disciplina ampliam repertorio ritual.'] },
  BRUXA: { budget: 4, circle: 1, circleCaps: { 1: 0, 2: 1, 3: 1, 4: 0 }, notes: ['Bruxas canalizam melhor ritos, componentes e pactos.'] },
  MAGO: { budget: 4, circle: 1, circleCaps: { 1: 0, 2: 1, 3: 1, 4: 0 }, notes: ['Magos traduzem teoria em ritual com eficiencia alta.'] },
  FEITICEIRO: { budget: 1, circle: 0, circleCaps: { 1: 0, 2: 0, 3: 0, 4: 0 }, notes: ['Afinidade inata ajuda, mas o foco principal continua no dom.'] },
  VAMPIRO: { budget: -2, circle: 0, circleCaps: { 1: 0, 2: 0, 3: -1, 4: -1 }, notes: ['Natureza predatoria dificulta estudo formal e preparo paciente.'] },
  LOBISOMEM: { budget: -2, circle: 0, circleCaps: { 1: 0, 2: 0, 3: -1, 4: -1 }, notes: ['Instinto brutal dificulta cadeias alquimicas precisas.'] },
  DEMONIO: { budget: -2, circle: 0, circleCaps: { 1: 0, 2: 0, 3: 0, 4: -1 }, notes: ['Energia infernal interfere em procedimentos delicados.'] },
  DASARIANO: { budget: 0, circle: 0, circleCaps: { 1: 0, 2: 0, 3: 0, 4: 0 }, notes: ['Versatilidade corporal ajuda em componentes vivos.'] },
  FINGER: { budget: -2, circle: 0, circleCaps: { 1: 0, 2: -1, 3: -1, 4: -1 }, notes: ['Dependencia de hospedeiro limita preparo autonomo.'] },
  SEMIDEUS: { budget: 2, circle: 0, circleCaps: { 1: 0, 2: 0, 3: 1, 4: 0 }, notes: ['Sangue divino suporta PE e reagentes raros.'] },
  HUMANO_MISTICO: { budget: 6, circle: 1, circleCaps: { 1: 0, 2: 1, 3: 1, 4: 1 }, notes: ['Guardiao mistico tem sincronia excepcional com rituais.'] },
}

export function getAlchemyTrainingLevel(char = {}) {
  const raw = char?.pericias?.Alquimia || 0
  return Math.max(0, Math.min(4, raw))
}

export function getAlchemyRitualSpaceCost(circle) {
  return SPACE_COST_BY_CIRCLE[circle] || 0
}

export function getAlchemySpaceUsed(rituals = []) {
  return (rituals || []).reduce((sum, ritual) => sum + getAlchemyRitualSpaceCost(ritual.circle), 0)
}

export function getAlchemyProfile(char = {}) {
  const nivel = Math.max(1, Math.min(30, char.nivel || 1))
  const trainingLevel = getAlchemyTrainingLevel(char)
  const hasAccess = trainingLevel >= 1

  if (!hasAccess) {
    return {
      nivel,
      trainingLevel,
      trainingLabel: ALCHEMY_TRAINING_RULES[trainingLevel]?.label || 'Nao Treinado',
      maxCircle: 0,
      spaceBudget: 0,
      maxByCircle: { 1: 0, 2: 0, 3: 0, 4: 0 },
      ritualCosts: SPACE_COST_BY_CIRCLE,
      hasAccess: false,
      accessReason: 'Alquimia requer pericia Alquimia treinada (grau 1+).',
      notes: [],
    }
  }

  const base = BASE_RULES_BY_LEVEL.find((rule) => nivel <= rule.maxLevel) || BASE_RULES_BY_LEVEL[BASE_RULES_BY_LEVEL.length - 1]
  const classKey = normalizeClassKey(char.classe)
  const raceKey = char.raca || ''

  const classAffinity = CLASS_AFFINITY[classKey] || { budget: 0, circle: 0, circleCaps: {}, notes: [] }
  const raceAffinity = RACE_AFFINITY[raceKey] || { budget: 0, circle: 0, circleCaps: {}, notes: [] }
  const training = ALCHEMY_TRAINING_RULES[trainingLevel] || ALCHEMY_TRAINING_RULES[0]

  const levelCircleCap = Math.min(4, Math.max(1, base.maxCircle + classAffinity.circle + raceAffinity.circle))
  const trainingCircleCap = Math.min(4, Math.max(1, training.maxCircle + classAffinity.circle + raceAffinity.circle))
  const maxCircle = Math.min(levelCircleCap, trainingCircleCap)

  const spaceBudget = Math.max(4, base.spaceBudget + training.budget + classAffinity.budget + raceAffinity.budget)
  const baseCircleCaps = base.maxByCircle || { 1: 0, 2: 0, 3: 0, 4: 0 }
  const maxByCircle = {}

  for (const circle of [1, 2, 3, 4]) {
    const rawCap = (baseCircleCaps[circle] || 0) + (classAffinity.circleCaps?.[circle] || 0) + (raceAffinity.circleCaps?.[circle] || 0)
    maxByCircle[circle] = circle <= maxCircle ? Math.max(0, rawCap) : 0
  }

  if (raceKey === 'VAMPIRO' && classKey !== 'MISTICO') maxByCircle[4] = 0
  if (raceKey === 'LOBISOMEM' && classKey === 'GUERREIRO') maxByCircle[3] = Math.max(0, maxByCircle[3] - 1)
  if (raceKey === 'DEMONIO' && classKey !== 'MISTICO') maxByCircle[4] = Math.max(0, maxByCircle[4] - 1)

  const maxFirstCircleOnly = Math.max(1, Math.floor(spaceBudget / SPACE_COST_BY_CIRCLE[1]))
  maxByCircle[1] = Math.max(maxByCircle[1], Math.min(8, maxFirstCircleOnly))

  return {
    nivel,
    trainingLevel,
    trainingLabel: training.label,
    maxCircle,
    spaceBudget,
    maxByCircle,
    ritualCosts: SPACE_COST_BY_CIRCLE,
    hasAccess: true,
    accessReason: 'Pericia Alquimia treinada.',
    notes: [...training.notes, ...classAffinity.notes, ...raceAffinity.notes],
  }
}

export function canLearnAlchemyRitual(char = {}, selectedRituals = [], ritual) {
  if (!ritual) return { allowed: false, reason: 'Ritual invalido.' }

  const profile = getAlchemyProfile(char)
  const selected = selectedRituals || []
  const alreadyKnown = selected.some((item) => item.id === ritual.id)
  const level = char.nivel || 1
  const spaceUsed = getAlchemySpaceUsed(selected)
  const ritualCost = getAlchemyRitualSpaceCost(ritual.circle)

  if (alreadyKnown) return { allowed: true, reason: '' }
  if (ritual.min_level > level) {
    return { allowed: false, reason: `Exige nivel ${ritual.min_level}.` }
  }
  if (ritual.circle > profile.maxCircle) {
    return { allowed: false, reason: `Seu limite atual vai ate o ${profile.maxCircle}o circulo.` }
  }
  if (spaceUsed + ritualCost > profile.spaceBudget) {
    return {
      allowed: false,
      reason: `Espacos insuficientes: ${spaceUsed}/${profile.spaceBudget} usados e este ritual custa ${ritualCost}.`,
    }
  }

  const sameCircleCount = selected.filter((item) => item.circle === ritual.circle).length
  if (sameCircleCount >= (profile.maxByCircle[ritual.circle] || 0)) {
    return { allowed: false, reason: `Limite de rituais do ${ritual.circle}o circulo atingido.` }
  }

  return { allowed: true, reason: '' }
}

export function normalizeSelectedAlchemyRitual(ritual) {
  if (!ritual) return null
  return {
    id: ritual.id,
    name: ritual.name,
    circle: ritual.circle,
    category: ritual.category,
    pe_cost: ritual.pe_cost,
    min_level: ritual.min_level,
    action_cost: ritual.action_cost,
    duration: ritual.duration,
    range: ritual.range,
    short_description: ritual.short_description,
    effect: ritual.effect,
    source_kind: ritual.source_kind,
    source_name: ritual.source_name,
    law_name: ritual.law_name,
    price: ritual.price,
    rupture_risk: ritual.rupture_risk,
    protocol_layer: ritual.protocol_layer,
    tags: ritual.tags || [],
    space_cost: getAlchemyRitualSpaceCost(ritual.circle),
  }
}

export function normalizeClassKey(classe = '') {
  if (!classe) return ''
  const upper = classe
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
  if (upper === 'MISTICO') return 'MISTICO'
  if (upper === 'OPERATIVO') return 'OPERATIVO'
  if (upper === 'GUERREIRO') return 'GUERREIRO'
  return upper
}
