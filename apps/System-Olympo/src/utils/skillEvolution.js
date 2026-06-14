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

export function getMaxEvolucao(tipo, charNivel = 30) {
  if (tipo === 'Passiva')  return 4
  if (tipo === 'Ultimate') return 5
  let max = 5
  if (charNivel >= 38) max += 1
  if (charNivel >= 45) max += 1
  if (charNivel >= 50) max += 1
  return max
}

const DELTAS = {
  FRACA:    { dadoExtra: '1d8',  flat: 5,  energia: 6 },
  MEDIA:    { dadoExtra: '1d10', flat: 8,  energia: 10 },
  FORTE:    { dadoExtra: '2d10', flat: 12, energia: 14 },
  ULTIMATE: { dadoExtra: '2d12', flat: 16, energia: 20 },
  PASSIVA:  { dadoExtra: '',     flat: 0,  energia: 0 },
}

const HEAL_DELTAS = {
  FRACA: 10,
  MEDIA: 16,
  FORTE: 24,
  ULTIMATE: 32,
  PASSIVA: 0,
}

const ENERGY_RECOVERY_DELTAS = {
  FRACA: 6,
  MEDIA: 10,
  FORTE: 14,
  ULTIMATE: 20,
  PASSIVA: 0,
}

const DURATION_ROUND_ENERGY = {
  FRACA: 2,
  MEDIA: 4,
  FORTE: 5,
  ULTIMATE: 8,
  PASSIVA: 0,
}

const COMPLEXITY_ENERGY_SURCHARGE = {
  FRACA: 0.5,
  MEDIA: 1,
  FORTE: 1.5,
  ULTIMATE: 2,
  PASSIVA: 0,
}

const ENERGY_DIMINISHING_EXPONENT = 0.65

const EVOLUTION_LEVEL_COST = {
  DEFAULT: [0, 1, 1, 2, 2, 3, 4, 5, 6],
  ULTIMATE: [0, 2, 2, 3, 3, 4, 5, 6, 7],
}

const DURACAO_BONUS = {
  FRACA:    [0, 0, 1, 1, 1, 2],
  MEDIA:    [0, 0, 1, 1, 2, 2],
  FORTE:    [0, 1, 1, 2, 2, 3],
  ULTIMATE: [0, 1, 2, 2, 3, 3],
  PASSIVA:  [0, 0, 0, 0, 0, 0],
}

const DT_BONUS = [0, 2, 2, 3, 3, 4]

const TAG_ORDER = [
  'custoEnergia', 'dano', 'cura', 'curaEnergia', 'duracao', 'dt', 'bonusAtaque', 'bonusCA',
  'bonusResultado', 'bonusReacoes', 'vantagem', 'area', 'deslocamento', 'resistencia',
  'paralisia', 'curaStatus', 'invisibilidade', 'invocacao',
]

const TAG_LABELS = {
  custoEnergia: 'Energia',
  dano: 'Dano',
  cura: 'Cura',
  curaEnergia: 'Cura Energia',
  duracao: 'Duracao',
  dt: 'DT',
  bonusAtaque: 'Ataque',
  bonusCA: 'CA',
  bonusResultado: 'Resultado',
  bonusReacoes: 'Reacoes',
  vantagem: 'Vantagem',
  area: 'Area',
  deslocamento: 'Deslocamento',
  resistencia: 'Resistencia',
  paralisia: 'Controle',
  curaStatus: 'Status',
  invisibilidade: 'Invisibilidade',
  invocacao: 'Invocacao',
}

export const SKILL_TAG_OPTIONS = TAG_ORDER.map(tag => ({
  tag,
  label: TAG_LABELS[tag] || tag,
}))

export const TAG_CHIP_META = {
  custoEnergia:   { icon: '⚡',  color: '#38bdf8', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.25)' },
  dano:           { icon: '⚔',  color: '#f87171', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)' },
  cura:           { icon: '✚',  color: '#34d399', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.25)' },
  curaEnergia:    { icon: '↺',  color: '#22d3ee', bg: 'rgba(34,211,238,0.10)',  border: 'rgba(34,211,238,0.25)' },
  duracao:        { icon: '⏱',  color: '#fbbf24', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)' },
  dt:             { icon: '🎯', color: '#a855f7', bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.25)' },
  bonusAtaque:    { icon: '⌁',  color: '#818cf8', bg: 'rgba(129,140,248,0.10)', border: 'rgba(129,140,248,0.25)' },
  bonusCA:        { icon: '◆',  color: '#22d3ee', bg: 'rgba(34,211,238,0.10)',  border: 'rgba(34,211,238,0.25)' },
  bonusResultado: { icon: '+',  color: '#818cf8', bg: 'rgba(129,140,248,0.10)', border: 'rgba(129,140,248,0.25)' },
  bonusReacoes:   { icon: '↻',  color: '#818cf8', bg: 'rgba(129,140,248,0.10)', border: 'rgba(129,140,248,0.25)' },
  vantagem:       { icon: '★',  color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.25)' },
  area:           { icon: '◎',  color: '#a8a29e', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)' },
  deslocamento:   { icon: '↗',  color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.20)' },
  resistencia:    { icon: '◈',  color: '#34d399', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.20)' },
  paralisia:      { icon: '✕',  color: '#e879f9', bg: 'rgba(217,70,239,0.08)',  border: 'rgba(217,70,239,0.20)' },
  curaStatus:     { icon: '⚕',  color: '#34d399', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.20)' },
  invisibilidade: { icon: '👻', color: '#c084fc', bg: 'rgba(192,132,252,0.08)', border: 'rgba(192,132,252,0.20)' },
  invocacao:      { icon: '☩',  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.20)' },
}

const TAG_ALIASES = {
  custo: 'custoEnergia',
  custoenergia: 'custoEnergia',
  energia: 'custoEnergia',
  pe: 'custoEnergia',
  dano: 'dano',
  damage: 'dano',
  cura: 'cura',
  heal: 'cura',
  curaenergia: 'curaEnergia',
  regeneraenergia: 'curaEnergia',
  recuperaenergia: 'curaEnergia',
  energiaregen: 'curaEnergia',
  regenerape: 'curaEnergia',
  duracao: 'duracao',
  duration: 'duracao',
  tempo: 'duracao',
  dt: 'dt',
  cd: 'dt',
  teste: 'dt',
  bonusataque: 'bonusAtaque',
  ataque: 'bonusAtaque',
  acerto: 'bonusAtaque',
  bonusca: 'bonusCA',
  ca: 'bonusCA',
  classearmadura: 'bonusCA',
  armadura: 'bonusCA',
  bonusresultado: 'bonusResultado',
  resultado: 'bonusResultado',
  pericia: 'bonusResultado',
  bonusreacoes: 'bonusReacoes',
  reacao: 'bonusReacoes',
  reacoes: 'bonusReacoes',
  vantagem: 'vantagem',
  area: 'area',
  deslocamento: 'deslocamento',
  movimento: 'deslocamento',
  teleporte: 'deslocamento',
  dash: 'deslocamento',
  resistencia: 'resistencia',
  paralisia: 'paralisia',
  atordoamento: 'paralisia',
  stun: 'paralisia',
  curastatus: 'curaStatus',
  status: 'curaStatus',
  invisibilidade: 'invisibilidade',
  furtividade: 'invisibilidade',
  invocacao: 'invocacao',
}

const POWER_TAGS = new Set([
  'dano', 'cura', 'curaEnergia', 'bonusAtaque', 'bonusCA', 'bonusResultado', 'bonusReacoes', 'vantagem',
  'area', 'deslocamento', 'resistencia', 'paralisia', 'curaStatus',
  'invisibilidade', 'invocacao',
])

function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizeSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function cleanKey(value) {
  return stripAccents(value).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

const DT_TEST_TYPE_KEYS = [
  'Forca', 'Destreza', 'Constituicao', 'Inteligencia', 'Aparencia', 'Aura Magica',
  'Fortitude', 'Reflexo', 'Reflexos', 'Vontade', 'Acrobacia', 'Atletismo',
  'Lutar', 'Pontaria', 'Furtividade', 'Percepcao', 'Investigacao', 'Intimidacao',
  'Persuasao', 'Enganacao', 'Medicina', 'Sobrevivencia', 'Ocultismo', 'Arcana',
  'Tecnologia', 'Religiao', 'Historia', 'Performance',
].map(cleanKey)

function hasDtTypeText(value) {
  const normalized = stripAccents(value)
  if (/\b(FOR|DES|CON|INT|APA|AM)\b/i.test(normalized)) return true
  const key = cleanKey(normalized)
  return DT_TEST_TYPE_KEYS.some(type => key.includes(type))
}

function buildDtDisplay(value, testType = '') {
  let raw = normalizeSpaces(value)
  if (!raw) return ''
  raw = raw.replace(/^(dt|cd)\s*:?/i, 'DT ')
  if (!/^dt\b/i.test(raw)) raw = `DT ${raw}`
  if (testType && !hasDtTypeText(raw)) raw = `${raw} ${normalizeSpaces(testType)}`
  return normalizeSpaces(raw)
}

export function getSkillDtDisplay(skill = {}) {
  const values = skill.valores || {}
  const genericType = values.dtTipo || values.tipoDt || ''
  const specificType = values.dtTeste || values.testeDt || values.dtAtributo || values.dtPericia || values.teste || ''
  const testType = specificType || (/^(atributo|pericia)$/i.test(stripAccents(genericType)) ? '' : genericType)
  const direct = skill.dt || values.dtCompleta || values.dtFull || values.dt_full || values.dtTexto || values.dt_texto
  if (direct != null && direct !== '') return buildDtDisplay(direct, testType)
  if (values.dt != null && values.dt !== '') return buildDtDisplay(values.dt, testType)

  const text = [skill.descricao, skill.descricaoBalanceada].filter(Boolean).join(' ')
  const match = text.match(/\b(?:DT|CD)\s*:?\s*(\d+)(?:\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,2}))?/i)
  if (!match) return ''
  const inferredType = match[2] && hasDtTypeText(match[2]) ? match[2] : ''
  return buildDtDisplay(match[1], inferredType)
}

export function hasSkillDtType(skill = {}) {
  return hasDtTypeText(getSkillDtDisplay(skill))
}

function normalizeTagName(tag) {
  const key = cleanKey(tag)
  return TAG_ALIASES[key] || (TAG_ORDER.includes(tag) ? tag : '')
}

function tagList(input) {
  if (Array.isArray(input)) return input
  if (typeof input === 'string') return input.split(/[,\n|;]/)
  if (input && typeof input === 'object') return Object.entries(input).filter(([, value]) => !!value).map(([key]) => key)
  return []
}

function addTag(set, tag) {
  const normalized = normalizeTagName(tag)
  if (normalized) set.add(normalized)
}

function normalizeTagSet(input) {
  const set = new Set()
  tagList(input).forEach(tag => addTag(set, tag))
  return set
}

function sourceText(skill = {}) {
  return stripAccents([
    skill.nome,
    skill.descricao,
    skill.descricaoBalanceada,
    skill.dano,
    skill.duracao,
    skill.dt,
  ].filter(Boolean).join(' ')).toLowerCase()
}

function hasOneTurnDuration(value) {
  const text = stripAccents(value).toLowerCase()
  const number = Number(text.match(/\b(\d+)\b/)?.[1] || 0)
  return number <= 1 && /\b(turno|turnos|rodada|rodadas|round|rounds)\b/.test(text)
}

export function hasMeaningfulDuration(skill = {}) {
  const duration = String(skill.duracao ?? skill.duration ?? skill.valores?.duracao ?? '').trim()
  const text = sourceText(skill)
  if (/instantane|instantaneo|instantanea|imediat|sem duracao|sem duração/.test(text)) return false
  if (duration) {
    if (hasOneTurnDuration(duration)) return false
    if (/\b(rodada|rodadas|turno|turnos|round|rounds|minuto|minutos|hora|horas)\b/i.test(duration)) return true
  }
  const declared = text.match(/\b(?:dura|duracao|por|mantem|mantem-se|permanece|persiste)\D{0,20}(\d+)\s*(rodada|rodadas|turno|turnos|round|rounds|minuto|minutos|hora|horas)\b/)
  if (!declared) return false
  return !(Number(declared[1]) <= 1 && /turno|turnos|rodada|rodadas|round|rounds/.test(declared[2]))
}

function inferSkillTags(skill = {}) {
  const tags = new Set()
  const text = sourceText(skill)
  const values = skill.valores || {}

  if ((skill.tipo === 'Ativa' || skill.tipo === 'Ultimate' || Number(skill.custoEnergia) > 0 || /custo|energia/.test(text)) && skill.tipo !== 'Passiva') addTag(tags, 'custoEnergia')
  if (skill.dano || values.dano || hasDamageText(text)) addTag(tags, 'dano')
  if (values.cura || hasLifeHealingText(text)) addTag(tags, 'cura')
  if (values.curaEnergia || hasEnergyRecoveryText(text)) addTag(tags, 'curaEnergia')
  if (hasMeaningfulDuration(skill)) addTag(tags, 'duracao')
  if (getSkillDtDisplay(skill) || /\b(dt|cd)\s*\d+|\bteste de\b/.test(text)) addTag(tags, 'dt')
  if (values.bonusCA || /\+\s*\d+\s*(?:de\s*)?(?:bonus\s*(?:de\s*)?)?ca\b|\bca\s*\+\s*\d+|classe de armadura/.test(text)) addTag(tags, 'bonusCA')
  if (values.bonusAtaque || /\+\s*\d+\s*(ataque|acerto|lutar|pontaria)\b/.test(text)) addTag(tags, 'bonusAtaque')
  if (values.bonusResultado || /[+-]\s*\d+\s*(resultado|teste|pericia|pericias)\b/.test(text) || hasActionResultPenaltyText(text)) addTag(tags, 'bonusResultado')
  if (values.bonusReacoes || /[+-]\s*\d+\s*(reacao|reacoes)\b|perde.{0,12}reac|sem.{0,12}reac|nao pode reagir/.test(text)) addTag(tags, 'bonusReacoes')
  if (/\bvantagem\b/.test(text)) addTag(tags, 'vantagem')
  if (/\b(area|raio|cone|linha|explosao|explosao)\b/.test(text)) addTag(tags, 'area')
  if (/\b(teleporte|teleporta|deslocamento|dash|movimento|metros|m\b)/.test(text)) addTag(tags, 'deslocamento')
  if (/\bresistencia|resiste|reduz dano|reducao de dano/.test(text)) addTag(tags, 'resistencia')
  if (/\b(paralis|atordo|stun|imobiliz|incapacit)/.test(text)) addTag(tags, 'paralisia')
  if (/\b(remove|cura).{0,18}(condicao|status|veneno|medo|sangramento)/.test(text)) addTag(tags, 'curaStatus')
  if (/\binvis|furtividade|ficar ocult|oculto/.test(text)) addTag(tags, 'invisibilidade')
  if (/\binvoca|invocacao|conjura criatura|servo\b/.test(text)) addTag(tags, 'invocacao')

  return [...tags]
}

export function normalizeSkillTags(skill = {}) {
  const inferred = new Set(inferSkillTags(skill))
  const manualEnabled = normalizeTagSet(skill.tagsManuais || skill.manualTags || skill.tagOverrides?.enabled)
  const hidden = normalizeTagSet(skill.tagsOcultas || skill.hiddenTags || skill.tagOverrides?.disabled)
  const tags = new Set()
  inferred.forEach(tag => tags.add(tag))
  manualEnabled.forEach(tag => tags.add(tag))
  tagList(skill.tags).forEach(raw => {
    const tag = normalizeTagName(raw)
    if (!tag || hidden.has(tag) || manualEnabled.has(tag)) return
    if (inferred.has(tag) || getSkillTagValue(skill, tag)) tags.add(tag)
  })
  if (!hasMeaningfulDuration(skill)) tags.delete('duracao')
  if (skill.tipo === 'Passiva') tags.delete('custoEnergia')
  hidden.forEach(tag => tags.delete(tag))
  return TAG_ORDER.filter(tag => tags.has(tag))
}

export function buildSkillTagOverridePatch(skill = {}, tag) {
  const normalized = normalizeTagName(tag)
  if (!normalized) return {}
  const active = normalizeSkillTags(skill).includes(normalized)
  const tagsManuais = normalizeTagSet(skill.tagsManuais || skill.manualTags || skill.tagOverrides?.enabled)
  const tagsOcultas = normalizeTagSet(skill.tagsOcultas || skill.hiddenTags || skill.tagOverrides?.disabled)

  if (active) {
    tagsOcultas.add(normalized)
    tagsManuais.delete(normalized)
  } else {
    tagsOcultas.delete(normalized)
    tagsManuais.add(normalized)
  }

  const draft = {
    ...skill,
    tagsManuais: [...tagsManuais],
    tagsOcultas: [...tagsOcultas],
  }

  return {
    tagsManuais: draft.tagsManuais,
    tagsOcultas: draft.tagsOcultas,
    tags: normalizeSkillTags(draft),
  }
}

export function buildSkillTagValuePatch(skill = {}, tag, value) {
  const normalized = normalizeTagName(tag)
  if (!normalized) return {}
  const cleanValue = String(value ?? '')
  const valores = { ...(skill.valores || {}) }
  if (cleanValue.trim()) valores[normalized] = cleanValue
  else delete valores[normalized]

  const patch = { valores }
  if (normalized === 'custoEnergia') patch.custoEnergia = Number(cleanValue) || 0
  if (normalized === 'dano') patch.dano = cleanValue
  if (normalized === 'duracao') patch.duracao = cleanValue
  if (normalized === 'dt') patch.dt = cleanValue

  const draft = { ...skill, ...patch }
  return {
    ...patch,
    tags: normalizeSkillTags(draft),
  }
}

export function hasSkillTag(skill = {}, tag) {
  return normalizeSkillTags(skill).includes(normalizeTagName(tag))
}

function extractSignedValue(text, patterns) {
  const normalized = stripAccents(text)
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match) return `${match[1].startsWith('-') ? '' : '+'}${match[1].replace(/^\+/, '')}`
  }
  return ''
}

function hasEnergyRecoveryText(text) {
  return /(?:regenera\w*|recupera\w*|restaura\w*|ganha\w*|recebe\w*)\s*\d+\s*(?:ponto|pontos)?\s*(?:de\s*)?(?:energia|pe)\b|\+\s*\d+\s*(?:energia|pe)\s*(?:por|\/)\s*(?:rodada|turno)|(?:energia|pe).{0,24}(?:por|\/)\s*(?:rodada|turno)/.test(text)
}

function hasDamageText(text) {
  const normalized = stripAccents(text).toLowerCase()
  const offensiveDamage = /\b(?:causa|causam|causar|sofre|sofrem|inflige|infligem|provoca|provocam|aplica|aplicam|recebe|recebem)\b.{0,50}\b(?:\d+d\d+|[+-]?\d+).{0,24}\bdano\b/.test(normalized)
  const damageValue = /\b(?:\d+d\d+(?:[+-]\d+)?|[+-]?\d+)\s*(?:de\s*)?dano\b/.test(normalized)
  const damageField = /\bdano\b.{0,24}(?:\d+d\d+|[+-]?\d+)/.test(normalized)
  const rawOffense = normalized.match(/\b(?:causa|causam|causar|sofre|sofrem|inflige|infligem|provoca|provocam|aplica|aplicam)\b.{0,35}\b(?:\d+d\d+|[+-]?\d+)/)
  if (rawOffense && !/\b(cura|curar|recupera|regenera|restaura|vida|pv|hp|energia|pe|ca|armadura)\b/.test(rawOffense[0])) return true
  if (offensiveDamage || damageValue || damageField) return true
  if (/\b(?:reduz|reduzir|reducao|resistencia|resiste|absorve|imune|ignora)\b.{0,28}\bdano\b/.test(normalized)) return false
  return /\bdano\b/.test(normalized) && /\b(?:ataque|golpe|atinge|alvo|inimigo)\b/.test(normalized)
}

function extractDamageValue(text) {
  const normalized = normalizeSpaces(stripAccents(text))
  const patterns = [
    /\b((?:\d+d\d+(?:[+-]\d+)?|[+-]?\d+)\s*(?:de\s*)?dano(?:\s+[A-Za-z]+)?)/i,
    /\b(?:causa|causam|sofre|sofrem|inflige|provoca|aplica|recebe)\D{0,24}((?:\d+d\d+(?:[+-]\d+)?|[+-]?\d+))(?=.{0,24}\bdano\b)/i,
    /\b(?:causa|causam|causar|sofre|sofrem|inflige|infligem|provoca|provocam|aplica|aplicam)\D{0,24}((?:\d+d\d+(?:[+-]\d+)?|[+-]?\d+)(?!\s*(?:de\s*)?(?:vida|pv|hp|energia|pe|ca|armadura)))/i,
    /\bdano\D{0,12}((?:\d+d\d+(?:[+-]\d+)?|[+-]?\d+))/i,
  ]
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match) return normalizeSpaces(match[1])
  }
  return ''
}

function hasLifeHealingText(text) {
  if (/\b(?:cura\w*|curar|regenera\w*|recupera\w*|restaura\w*)\b.{0,40}\b(?:vida|pv|hp|ferimento|ferimentos|saude)\b/.test(text)) return true
  if (/\b\d+\s*(?:ponto|pontos)?\s*(?:de\s*)?(?:vida|pv|hp)\b/.test(text)) return true
  return /\bcura\b/.test(text) && !hasEnergyRecoveryText(text)
}

function extractLifeHealingValue(text) {
  const normalized = normalizeSpaces(stripAccents(text))
  const patterns = [
    /\b(?:cura\w*|curar|regenera\w*|recupera\w*|restaura\w*)\D{0,24}((?:\d+d\d+(?:[+-]\d+)?|[+-]?\d+)(?!\s*(?:de\s*)?(?:energia|pe|ca|armadura))(?:\s*(?:pontos?\s*)?(?:de\s*)?(?:vida|pv|hp))?)/i,
    /\b((?:\d+d\d+(?:[+-]\d+)?|[+-]?\d+)\s*(?:pontos?\s*)?(?:de\s*)?(?:vida|pv|hp))/i,
  ]
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (match) return normalizeSpaces(match[1])
  }
  return ''
}

function extractEnergyRecoveryValue(text) {
  const normalized = stripAccents(text)
  const patterns = [
    /(?:regenera\w*|recupera\w*|restaura\w*|ganha\w*|recebe\w*)\s*([+-]?\d+)\s*(?:ponto|pontos)?\s*(?:de\s*)?(?:energia|pe)\b(?:.{0,18}\b(?:por|\/)\s*(rodada|turno))?/i,
    /([+-]?\d+)\s*(?:ponto|pontos)?\s*(?:de\s*)?(?:energia|pe)\b.{0,18}\b(?:por|\/)\s*(rodada|turno)/i,
    /\+\s*(\d+)\s*(?:energia|pe)\s*(?:por|\/)\s*(rodada|turno)/i,
  ]
  for (const pattern of patterns) {
    const match = normalized.match(pattern)
    if (!match) continue
    const value = String(match[1]).replace(/^\+/, '')
    const suffix = match[2] ? '/rod.' : ''
    return `+${value}${suffix}`
  }
  return ''
}

function hasActionResultPenaltyText(text) {
  return /\b(lento|lentos|velocidade reduzida|reduz.*velocidade|slow|desvantagem.*acao|perde.*acao.*movimento|-?\d+.*resultado|-?\d+.*teste)/.test(text)
}

function extractActionResultPenaltyValue(text) {
  const normalized = stripAccents(text)
  const direct = extractSignedValue(normalized, [/[+]?(-?\d+)\s*(?:resultado|teste|pericia|pericias)\b/i])
  if (direct) return direct
  const speed = normalized.match(/\b(?:velocidade\s+reduzida\s+em|reduz.{0,18}velocidade.{0,12}em)\s*(\d+)\b/i)?.[1]
  if (speed) return `-${Math.max(1, Number(speed)) * 2}`
  if (/\b(lento|lentos|slow|desvantagem.*acao|perde.*acao.*movimento)\b/i.test(normalized)) return '-2'
  return ''
}

function extractReactionValue(text) {
  const normalized = stripAccents(text)
  const lost = normalized.match(/\bperde\D{0,12}(\d+)\s*(?:reacao|reacoes)\b/i)?.[1]
  if (lost) return `-${lost}`
  if (/\b(?:sem|nao pode usar|nao pode fazer|nao pode gastar|nao pode reagir).{0,18}(?:reacao|reacoes|reagir)\b/i.test(normalized)) return '-1'
  const direct = normalized.match(/([+-]\d+)\s*(?:reacao|reacoes)\b/i)?.[1]
  if (direct) return direct
  return ''
}

export function getSkillTagValue(skill = {}, tag) {
  const values = skill.valores || {}
  const text = [
    skill.descricao,
    skill.descricaoBalanceada,
    skill.duracao,
    skill.dt,
  ].filter(Boolean).join(' ')

  if (values[tag] != null && values[tag] !== '') {
    const raw = String(values[tag])
    if (/^bonus/.test(tag) && /^-?\d+$/.test(raw)) return raw.startsWith('-') ? raw : `+${raw}`
    return raw
  }
  if (tag === 'dt') return getSkillDtDisplay(skill)
  if (tag === 'custoEnergia' && Number(skill.custoEnergia) > 0) return String(skill.custoEnergia)
  if (tag === 'dano') return skill.dano || extractDamageValue(text)
  if (tag === 'cura') return extractLifeHealingValue(text)
  if (tag === 'curaEnergia') return extractEnergyRecoveryValue(text)
  if (tag === 'duracao' && skill.duracao) return skill.duracao
  if (tag === 'bonusCA') return extractSignedValue(text, [/[+]?(-?\d+)\s*(?:de\s*)?(?:bonus\s*(?:de\s*)?)?CA\b/i, /\bCA\s*([+-]?\d+)\b/i])
  if (tag === 'bonusAtaque') return extractSignedValue(text, [/[+]?(-?\d+)\s*(?:ataque|acerto)\b/i])
  if (tag === 'bonusResultado') return extractActionResultPenaltyValue(text) || extractSignedValue(text, [/[+]?(-?\d+)\s*(?:resultado|teste|pericia|pericias)\b/i])
  if (tag === 'bonusReacoes') return extractReactionValue(text)
  if (tag === 'area') return stripAccents(text).match(/\b(\d+\s*(?:m|metros?|pes|pés))\b/i)?.[1] || ''
  if (tag === 'deslocamento') return stripAccents(text).match(/\b(\d+\s*(?:m|metros?|pes|pés))\b/i)?.[1] || ''
  if (tag === 'resistencia') return text.match(/\b(\d+%|-?\d+\s*dano)\b/i)?.[1] || ''
  return ''
}

export function getSkillTagChips(skill = {}) {
  return normalizeSkillTags(skill).map(tag => {
    const value = getSkillTagValue(skill, tag)
    return {
      tag,
      label: TAG_LABELS[tag] || tag,
      value,
      missingType: tag === 'dt' && !!value && !hasDtTypeText(value),
    }
  })
}

function sumProgression(values, evolNivel) {
  let total = 0
  for (let i = 0; i <= evolNivel; i++) total += values[i] ?? values[values.length - 1] ?? 0
  return total
}

function splitBudgetByTags(tags) {
  const powerCount = tags.filter(tag => POWER_TAGS.has(tag)).length
  if (powerCount <= 1) return 1
  return Math.max(0.55, 1 - ((powerCount - 1) * 0.15))
}

function scaleNumber(value, multiplier) {
  return Math.max(0, Math.round(value * multiplier))
}

function buildDiceExtra(dadoExtra, evolNivel, multiplier) {
  if (!dadoExtra) return ''
  const match = dadoExtra.match(/^(\d+)(d\d+)$/)
  if (!match) return ''
  const scaledEvol = Math.pow(evolNivel, 0.7)
  const qtd = scaleNumber(parseInt(match[1]) * scaledEvol, multiplier)
  return qtd > 0 ? `+${qtd}${match[2]}` : ''
}

function getDeclaredDurationRounds(skill = {}) {
  const values = skill.valores || {}
  const text = stripAccents([
    values.duracao,
    skill.duracao,
    skill.descricao,
    skill.descricaoBalanceada,
  ].filter(Boolean).join(' ')).toLowerCase()

  if (!text || /instantane|imediat|sem duracao/.test(text)) return 0
  const match = text.match(/\b(\d+)\s*(rodada|rodadas|turno|turnos|round|rounds|cena|cenas|minuto|minutos|hora|horas)\b/)
  if (!match) return 0
  const amount = Number(match[1]) || 0
  const unit = match[2]
  if (/cena/.test(unit)) return Math.max(5, amount * 5)
  if (/minuto|hora/.test(unit)) return Math.max(10, amount * 10)
  return amount
}

function calcDurationEnergyPressure(skill, bracket, evolNivel, hasDurationTag) {
  if (!hasDurationTag || !evolNivel) return 0
  const rounds = getDeclaredDurationRounds(skill)
  if (rounds <= 1) return 0
  const perRound = DURATION_ROUND_ENERGY[bracket] || 0
  const roundWeight = rounds >= 8 ? 1.25 : rounds >= 5 ? 1.1 : 1
  return Math.round(Math.max(0, rounds - 1) * perRound * evolNivel * roundWeight)
}

export function calcEvolucaoDelta(skill, evolNivel) {
  if (!evolNivel || evolNivel <= 0) return null
  const bracket = getSkillBracket(skill.custoEnergia || 0, skill.tipo)
  const delta = DELTAS[bracket]
  const tags = normalizeSkillTags(skill)
  const powerCount = tags.filter(tag => POWER_TAGS.has(tag)).length
  const damageMultiplier = splitBudgetByTags(tags)
  const supportMultiplier = Math.max(0.75, damageMultiplier)

  const duracaoExtra = 0
  const durationEnergyPressure = calcDurationEnergyPressure(skill, bracket, evolNivel, tags.includes('duracao'))
  const flatExtra    = tags.includes('dano') ? scaleNumber(delta.flat * Math.pow(evolNivel, 0.7), damageMultiplier) : 0
  const energiaExtra = tags.includes('custoEnergia')
    ? Math.round(delta.energia * Math.pow(evolNivel, ENERGY_DIMINISHING_EXPONENT))
      + durationEnergyPressure
      + Math.round(Math.max(0, powerCount - 2) * Math.pow(evolNivel, 0.5) * (COMPLEXITY_ENERGY_SURCHARGE[bracket] || 0))
    : 0
  const dtExtra      = tags.includes('dt') ? sumProgression(DT_BONUS, evolNivel) : 0
  const curaExtra    = tags.includes('cura') ? scaleNumber((HEAL_DELTAS[bracket] || 0) * Math.pow(evolNivel, 0.7), supportMultiplier) : 0
  const curaEnergiaExtra = tags.includes('curaEnergia') ? scaleNumber((ENERGY_RECOVERY_DELTAS[bracket] || 0) * Math.pow(evolNivel, 0.7), supportMultiplier) : 0
  const caExtra      = tags.includes('bonusCA') ? Math.ceil(evolNivel / 2) : 0
  const ataqueExtra  = tags.includes('bonusAtaque') ? Math.ceil(evolNivel / 2) : 0
  const resultadoBase = getSkillTagValue(skill, 'bonusResultado')
  const resultadoSign = /^-/.test(String(resultadoBase).trim()) ? -1 : 1
  const resultadoExtra = tags.includes('bonusResultado') ? evolNivel * resultadoSign : 0
  const reacoesBase = getSkillTagValue(skill, 'bonusReacoes')
  const reacoesSign = /^-/.test(String(reacoesBase).trim()) ? -1 : 1
  const reacoesExtra = tags.includes('bonusReacoes') ? Math.ceil(evolNivel / 2) * reacoesSign : 0

  const dadoExtraStr = tags.includes('dano') ? buildDiceExtra(delta.dadoExtra, evolNivel, damageMultiplier) : ''

  let danoTotal = ''
  if (dadoExtraStr && flatExtra > 0) {
    danoTotal = `${dadoExtraStr}+${flatExtra}`
  } else if (dadoExtraStr) {
    danoTotal = dadoExtraStr
  } else if (flatExtra > 0) {
    danoTotal = `+${flatExtra}`
  }

  const tagBonuses = [
    danoTotal && { tag: 'dano', label: 'Dano', value: danoTotal },
    curaExtra > 0 && { tag: 'cura', label: 'Cura', value: `+${curaExtra}` },
    curaEnergiaExtra > 0 && { tag: 'curaEnergia', label: 'Cura Energia', value: `+${curaEnergiaExtra}` },
    energiaExtra > 0 && { tag: 'custoEnergia', label: 'Energia', value: `+${energiaExtra}` },
    duracaoExtra > 0 && { tag: 'duracao', label: 'Duracao', value: `+${duracaoExtra} rod.` },
    dtExtra > 0 && { tag: 'dt', label: 'DT', value: `+${dtExtra}` },
    caExtra > 0 && { tag: 'bonusCA', label: 'CA', value: `+${caExtra}` },
    ataqueExtra > 0 && { tag: 'bonusAtaque', label: 'Ataque', value: `+${ataqueExtra}` },
    resultadoExtra !== 0 && { tag: 'bonusResultado', label: 'Resultado', value: `${resultadoExtra > 0 ? '+' : ''}${resultadoExtra}` },
    reacoesExtra !== 0 && { tag: 'bonusReacoes', label: 'Reacoes', value: `${reacoesExtra > 0 ? '+' : ''}${reacoesExtra}` },
  ].filter(Boolean)

  const valores = {
    dadoExtraStr,
    flatExtra,
    energiaExtra,
    duracaoExtra,
    durationEnergyPressure,
    dtExtra,
    curaExtra,
    curaEnergiaExtra,
    caExtra,
    ataqueExtra,
    resultadoExtra,
    reacoesExtra,
    danoTotal,
  }

  return {
    bracket,
    dadoExtra:    dadoExtraStr,
    flatExtra:    flatExtra > 0 ? `+${flatExtra}` : '',
    danoTotal,
    energiaExtra: energiaExtra > 0 ? `+${energiaExtra}` : '',
    duracaoExtra: duracaoExtra > 0 ? `+${duracaoExtra} rod.` : '',
    durationEnergyPressure,
    dtExtra,
    curaExtra:    curaExtra > 0 ? `+${curaExtra}` : '',
    curaEnergiaExtra: curaEnergiaExtra > 0 ? `+${curaEnergiaExtra}` : '',
    caExtra,
    ataqueExtra,
    resultadoExtra,
    reacoesExtra,
    allTags:      tags,
    tagBonuses,
    valores,
  }
}

export function canEvolveSkill(skill, currentEvolNivel, charNivel) {
  const max = getMaxEvolucao(skill.tipo, charNivel)
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
    .reduce((sum, h) => sum + calcEvolucaoCost(h.tipo, h.evolucaoNivel || 0), 0)
}

export function getEvolucaoLevelCost(tipo, level) {
  if (!level || level <= 0) return 0
  const table = tipo === 'Ultimate' ? EVOLUTION_LEVEL_COST.ULTIMATE : EVOLUTION_LEVEL_COST.DEFAULT
  return table[level] ?? table[table.length - 1] ?? 1
}

export function calcEvolucaoCost(tipo, evolNivel = 0) {
  let total = 0
  for (let level = 1; level <= evolNivel; level++) {
    total += getEvolucaoLevelCost(tipo, level)
  }
  return total
}

export function getNextEvolucaoCost(skill = {}, currentEvolNivel = 0) {
  return getEvolucaoLevelCost(skill.tipo, currentEvolNivel + 1)
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
    const maxEvo = getMaxEvolucao(h.tipo, charNivel)
    const pehCost = h.tipo === 'Passiva' ? 0 : calcEvolucaoCost(h.tipo, evoNivel)
    const evoDelta = calcEvolucaoDelta(h, evoNivel)
    const tags = normalizeSkillTags(h)
    const bonusText = evoDelta?.tagBonuses?.length
      ? evoDelta.tagBonuses.map(item => `${item.label} ${item.value}`).join(', ')
      : 'nenhum incremento numerico direto'

    const instrucaoIA = evoNivel === 0
      ? `PEH investido: 0. Use valores BASE (${bracket}). NAO escale por nivel do personagem. Tags reconhecidas: ${tags.join(', ') || 'nenhuma'}.`
      : `Nivel de evolucao: ${evoNivel}/${maxEvo}. Custo acumulado: ${pehCost} PEH. Escale com RETORNOS DIMINUINTOS (PEH^0.7 para dano, PEH^0.65 para energia). Escale SOMENTE as tags reconhecidas: ${tags.join(', ') || 'nenhuma'}. Incrementos sugeridos: ${bonusText}. TDH efetivo: ${tdhEfetivo}. CUSTO DE ENERGIA NUNCA deve exceder 45% da energia total do personagem. PEH NAO aumenta duracao; duracao longa pesa no custo de energia. Se a tag dano estiver ausente, NAO adicione dano novo. Custo de energia aumenta apenas em Ativas/Ultimates.`
    return {
      index: i,
      nome: h.nome || `Habilidade ${i + 1}`,
      tipo: h.tipo,
      evolucaoNivel: evoNivel,
      maxEvolucao: maxEvo,
      bracket,
      tdhBracketEfetivo: tdhEfetivo,
      custoEnergiaAtual: h.custoEnergia || 0,
      tags,
      bonusEvolucao: evoDelta?.tagBonuses || [],
      instrucaoIA,
    }
  })
}
