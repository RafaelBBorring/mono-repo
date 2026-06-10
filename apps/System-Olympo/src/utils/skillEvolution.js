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

const TAG_ORDER = [
  'custoEnergia', 'dano', 'cura', 'duracao', 'dt', 'bonusAtaque', 'bonusCA',
  'bonusResultado', 'vantagem', 'area', 'deslocamento', 'resistencia',
  'paralisia', 'curaStatus', 'invisibilidade', 'invocacao',
]

const TAG_LABELS = {
  custoEnergia: 'Energia',
  dano: 'Dano',
  cura: 'Cura',
  duracao: 'Duracao',
  dt: 'DT',
  bonusAtaque: 'Ataque',
  bonusCA: 'CA',
  bonusResultado: 'Resultado',
  vantagem: 'Vantagem',
  area: 'Area',
  deslocamento: 'Deslocamento',
  resistencia: 'Resistencia',
  paralisia: 'Controle',
  curaStatus: 'Status',
  invisibilidade: 'Invisibilidade',
  invocacao: 'Invocacao',
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
  'dano', 'cura', 'bonusAtaque', 'bonusCA', 'bonusResultado', 'vantagem',
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
  if (skill.dano || values.dano || /\b\d+d\d+\b|\bdano\b/.test(text)) addTag(tags, 'dano')
  if (values.cura || /\bcura|curar|regenera/.test(text)) addTag(tags, 'cura')
  if (hasMeaningfulDuration(skill)) addTag(tags, 'duracao')
  if (getSkillDtDisplay(skill) || /\b(dt|cd)\s*\d+|\bteste de\b/.test(text)) addTag(tags, 'dt')
  if (values.bonusCA || /\+\s*\d+\s*ca\b|\bca\s*\+\s*\d+|classe de armadura/.test(text)) addTag(tags, 'bonusCA')
  if (values.bonusAtaque || /\+\s*\d+\s*(ataque|acerto|lutar|pontaria)\b/.test(text)) addTag(tags, 'bonusAtaque')
  if (values.bonusResultado || /\+\s*\d+\s*(resultado|teste|pericia|pericias)\b/.test(text)) addTag(tags, 'bonusResultado')
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
  const tags = new Set()
  tagList(skill.tags).forEach(tag => addTag(tags, tag))
  inferSkillTags(skill).forEach(tag => addTag(tags, tag))
  if (!hasMeaningfulDuration(skill)) tags.delete('duracao')
  if (skill.tipo === 'Passiva') tags.delete('custoEnergia')
  return TAG_ORDER.filter(tag => tags.has(tag))
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

export function getSkillTagValue(skill = {}, tag) {
  const values = skill.valores || {}
  const text = [
    skill.descricao,
    skill.descricaoBalanceada,
    skill.duracao,
    skill.dt,
  ].filter(Boolean).join(' ')

  if (tag === 'dt') return getSkillDtDisplay(skill)
  if (values[tag] != null && values[tag] !== '') {
    const raw = String(values[tag])
    if (/^bonus/.test(tag) && /^-?\d+$/.test(raw)) return raw.startsWith('-') ? raw : `+${raw}`
    return raw
  }
  if (tag === 'custoEnergia' && Number(skill.custoEnergia) > 0) return String(skill.custoEnergia)
  if (tag === 'dano' && skill.dano) return skill.dano
  if (tag === 'cura' && values.cura) return String(values.cura)
  if (tag === 'duracao' && skill.duracao) return skill.duracao
  if (tag === 'bonusCA') return extractSignedValue(text, [/[+]?(-?\d+)\s*CA\b/i, /\bCA\s*([+-]?\d+)\b/i])
  if (tag === 'bonusAtaque') return extractSignedValue(text, [/[+]?(-?\d+)\s*(?:ataque|acerto)\b/i])
  if (tag === 'bonusResultado') return extractSignedValue(text, [/[+]?(-?\d+)\s*(?:resultado|teste|pericia|pericias)\b/i])
  if (tag === 'area') return text.match(/\b(\d+\s*m)\b/i)?.[1] || ''
  if (tag === 'deslocamento') return text.match(/\b(\d+\s*m)\b/i)?.[1] || ''
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
  const qtd = scaleNumber(parseInt(match[1]) * evolNivel, multiplier)
  return qtd > 0 ? `+${qtd}${match[2]}` : ''
}

export function calcEvolucaoDelta(skill, evolNivel) {
  if (!evolNivel || evolNivel <= 0) return null
  const bracket = getSkillBracket(skill.custoEnergia || 0, skill.tipo)
  const delta = DELTAS[bracket]
  const duracaoBonusArr = DURACAO_BONUS[bracket] || [0,0,0,0,0,0]
  const tags = normalizeSkillTags(skill)
  const damageMultiplier = splitBudgetByTags(tags)

  const duracaoExtra = tags.includes('duracao') ? sumProgression(duracaoBonusArr, evolNivel) : 0
  const flatExtra    = tags.includes('dano') ? scaleNumber(delta.flat * evolNivel, damageMultiplier) : 0
  const energiaExtra = tags.includes('custoEnergia') ? delta.energia * evolNivel : 0
  const dtExtra      = tags.includes('dt') ? sumProgression(DT_BONUS, evolNivel) : 0
  const curaExtra    = tags.includes('cura') ? scaleNumber(delta.flat * evolNivel, splitBudgetByTags(tags)) : 0
  const caExtra      = tags.includes('bonusCA') ? Math.ceil(evolNivel / 2) : 0
  const ataqueExtra  = tags.includes('bonusAtaque') ? Math.ceil(evolNivel / 2) : 0
  const resultadoExtra = tags.includes('bonusResultado') ? evolNivel : 0

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
    energiaExtra > 0 && { tag: 'custoEnergia', label: 'Energia', value: `+${energiaExtra}` },
    duracaoExtra > 0 && { tag: 'duracao', label: 'Duracao', value: `+${duracaoExtra} rod.` },
    dtExtra > 0 && { tag: 'dt', label: 'DT', value: `+${dtExtra}` },
    caExtra > 0 && { tag: 'bonusCA', label: 'CA', value: `+${caExtra}` },
    ataqueExtra > 0 && { tag: 'bonusAtaque', label: 'Ataque', value: `+${ataqueExtra}` },
    resultadoExtra > 0 && { tag: 'bonusResultado', label: 'Resultado', value: `+${resultadoExtra}` },
  ].filter(Boolean)

  const valores = {
    dadoExtraStr,
    flatExtra,
    energiaExtra,
    duracaoExtra,
    dtExtra,
    curaExtra,
    caExtra,
    ataqueExtra,
    resultadoExtra,
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
    curaExtra:    curaExtra > 0 ? `+${curaExtra}` : '',
    caExtra,
    ataqueExtra,
    resultadoExtra,
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
    const maxEvo = getMaxEvolucao(h.tipo, charNivel)
    const evoDelta = calcEvolucaoDelta(h, evoNivel)
    const tags = normalizeSkillTags(h)
    const bonusText = evoDelta?.tagBonuses?.length
      ? evoDelta.tagBonuses.map(item => `${item.label} ${item.value}`).join(', ')
      : 'nenhum incremento numerico direto'

    const instrucaoIA = evoNivel === 0
      ? `PEH investido: 0. Use valores BASE (${bracket}). NAO escale por nivel do personagem. Tags reconhecidas: ${tags.join(', ') || 'nenhuma'}.`
      : `PEH investido: ${evoNivel}/${maxEvo}. Escale SOMENTE as tags reconhecidas nesta habilidade: ${tags.join(', ') || 'nenhuma'}. Incrementos sugeridos: ${bonusText}. TDH efetivo: ${tdhEfetivo}. Se a tag duracao estiver ausente, NAO crie nem aumente duracao. Se a tag dano estiver ausente, NAO adicione dano novo. Custo de energia aumenta apenas em Ativas/Ultimates.`
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
