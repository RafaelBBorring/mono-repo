import { SYSTEM_SKILLS, getSystemSkillById, EFFECT_PARAM_DEFS } from '../data/systemSkills'
import { getRaceAdjustedAttrs } from './raceCalculator'

export function getAssignedSystemSkills(char = {}) {
  return (char.systemSkills || [])
    .map((entry) => {
      const def = getSystemSkillById(entry.skillId || entry.id)
      return def ? { ...entry, skillId: def.id, definition: def } : null
    })
    .filter(Boolean)
}

export function createSystemSkillAssignment(skillId, patch = {}) {
  return {
    id: `skill_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    skillId,
    active: true,
    sourceAbilityIndex: null,
    notes: '',
    effects: [],
    createdAt: new Date().toISOString(),
    ...patch,
  }
}

export function createDefaultEffectsForSkill(skillId) {
  const def = getSystemSkillById(skillId)
  if (!def?.defaults) return []
  return [{ ...def.defaults }]
}

export function createSystemSkillNotification({ skillId = 'manual_integration', abilityIndex = null, title, message, details = '', source = 'manual', suggestedEffects = null }) {
  const def = getSystemSkillById(skillId) || getSystemSkillById('manual_integration')
  return {
    id: `notice_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    status: 'open',
    source,
    skillId: def?.id || 'manual_integration',
    abilityIndex,
    title: title || `Possivel Skill: ${def?.name || 'Pendencia de Skill'}`,
    message: message || def?.short || 'Esta passiva pode precisar de uma Skill dedicada.',
    details,
    suggestedEffects: suggestedEffects || null,
    createdAt: new Date().toISOString(),
  }
}

function resolveEffectParam(effect, paramName, defaultValue) {
  if (effect[paramName] != null) return effect[paramName]
  return defaultValue
}

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function intervalBonus(nivel, every, amount) {
  const step = Math.max(1, toNumber(every, 1))
  return Math.max(0, Math.floor((toNumber(nivel, 1)) / step) * toNumber(amount, 0))
}

function getAttributeSourceValue(char, attr, source) {
  const sk = char.skeletonPoints || {}
  if (source === 'skeleton') return toNumber(sk[attr], 0)
  const adjusted = getRaceAdjustedAttrs(char.atributos || {}, sk, char)
  return toNumber(adjusted[attr], 0)
}

function parseListParam(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

function addAttrCapBonus(bonuses, attr, amount) {
  if (!attr || !amount) return
  bonuses.attrCapBonuses[attr] = (bonuses.attrCapBonuses[attr] || 0) + amount
}

export function calcSystemSkillBonuses(char = {}) {
  if (char == null) char = {}
  const bonuses = {
    skeletonPoints: 0,
    vida: 0,
    energia: 0,
    pe: 0,
    peh: 0,
    ataque: 0,
    dano: 0,
    armadura: 0,
    ca: 0,
    equipmentDurability: 0,
    carryCapacity: 0,
    attrCapBonuses: {},
    forgeRankBonus: 0,
    forgeRankLabels: [],
    forgeEnchantmentSlots: 0,
    forgeEnchantmentScaling: [],
    forgeQualityBonus: 0,
    manualFlags: [],
  }

  const nivel = toNumber(char.nivel, 1)
  for (const assigned of getAssignedSystemSkills(char)) {
    if (assigned.active === false) continue
    const effects = assigned.effects && assigned.effects.length > 0
      ? assigned.effects
      : assigned.definition?.defaults
        ? [assigned.definition.defaults]
        : []

    for (const effect of effects) {
      switch (effect.type) {
        case 'skeleton_points_per_level_interval':
          bonuses.skeletonPoints += intervalBonus(nivel, resolveEffectParam(effect, 'every', 5), resolveEffectParam(effect, 'amount', 1))
          break
        case 'skeleton_points_on_milestone': {
          const levels = parseListParam(resolveEffectParam(effect, 'levels', '5,10,15,20,25,30')).map(Number).filter(n => Number.isFinite(n))
          const amount = toNumber(resolveEffectParam(effect, 'amount', 2), 2)
          bonuses.skeletonPoints += levels.filter(level => nivel >= level).length * amount
          break
        }
        case 'damage_per_level_interval':
          bonuses.dano += intervalBonus(nivel, resolveEffectParam(effect, 'every', 5), resolveEffectParam(effect, 'amount', 5))
          break
        case 'damage_per_attribute_interval': {
          const attr = resolveEffectParam(effect, 'attr', 'FOR')
          const source = resolveEffectParam(effect, 'source', 'skeleton')
          const value = getAttributeSourceValue(char, attr, source)
          bonuses.dano += intervalBonus(value, resolveEffectParam(effect, 'every', 5), resolveEffectParam(effect, 'amount', 10))
          break
        }
        case 'resource_per_level': {
          const resource = resolveEffectParam(effect, 'resource', 'energia')
          const amount = nivel * toNumber(resolveEffectParam(effect, 'amount', 3), 3)
          if (resource === 'vida') bonuses.vida += amount
          else if (resource === 'pe') bonuses.pe += amount
          else bonuses.energia += amount
          break
        }
        case 'hp_per_level':
          bonuses.vida += nivel * toNumber(resolveEffectParam(effect, 'amount', 3), 3)
          break
        case 'energy_per_level':
          bonuses.energia += nivel * toNumber(resolveEffectParam(effect, 'amount', 3), 3)
          break
        case 'pe_per_level_interval':
          bonuses.pe += intervalBonus(nivel, resolveEffectParam(effect, 'every', 5), resolveEffectParam(effect, 'amount', 1))
          break
        case 'peh_per_level_interval':
          bonuses.peh += intervalBonus(nivel, resolveEffectParam(effect, 'every', 10), resolveEffectParam(effect, 'amount', 1))
          break
        case 'damage_bonus':
          bonuses.dano += toNumber(resolveEffectParam(effect, 'amount', 2), 2)
          break
        case 'attack_bonus':
          bonuses.ataque += toNumber(resolveEffectParam(effect, 'amount', 1), 1)
          break
        case 'armor_bonus':
          bonuses.armadura += toNumber(resolveEffectParam(effect, 'amount', 2), 2)
          break
        case 'ca_bonus':
          bonuses.ca += toNumber(resolveEffectParam(effect, 'amount', 1), 1)
          break
        case 'equipment_durability_bonus':
          bonuses.equipmentDurability += toNumber(resolveEffectParam(effect, 'amount', 2), 2)
          break
        case 'carry_capacity_bonus':
          bonuses.carryCapacity += toNumber(resolveEffectParam(effect, 'amount', 5), 5)
          break
        case 'attribute_cap_bonus': {
          const attr = resolveEffectParam(effect, 'attr', 'FOR')
          const amount = toNumber(resolveEffectParam(effect, 'amount', 1), 1)
          const purchases = Math.min(3, Math.max(1, toNumber(resolveEffectParam(effect, 'purchases', 1), 1)))
          addAttrCapBonus(bonuses, attr, amount * purchases)
          break
        }
        case 'forge_rank_bonus': {
          bonuses.forgeRankBonus += toNumber(resolveEffectParam(effect, 'rankBonus', 1), 1)
          const label = resolveEffectParam(effect, 'label', '')
          if (label) bonuses.forgeRankLabels.push(label)
          break
        }
        case 'forge_enchantment_slots': {
          const base = toNumber(resolveEffectParam(effect, 'slots', 1), 1)
          const scaling = resolveEffectParam(effect, 'scaling', 'flat')
          const every = Math.max(1, toNumber(resolveEffectParam(effect, 'every', 5), 5))
          const amount = toNumber(resolveEffectParam(effect, 'amount', 1), 1)
          let scaled = 0
          if (scaling === 'level_interval') scaled = Math.floor(nivel / every) * amount
          if (scaling === 'int_interval') scaled = Math.floor(getAttributeSourceValue(char, 'INT', 'total') / every) * amount
          bonuses.forgeEnchantmentSlots += Math.max(0, base + scaled)
          bonuses.forgeEnchantmentScaling.push({ scaling, every, amount })
          break
        }
        case 'forge_quality_bonus':
          bonuses.forgeQualityBonus += toNumber(resolveEffectParam(effect, 'qualityBonus', 1), 1)
          break
        case 'manual_flag':
          bonuses.manualFlags.push(resolveEffectParam(effect, 'label', assigned.notes || assigned.definition?.name || 'Pendencia manual'))
          break
      }
    }
  }

  bonuses.forgeRankLabels = [...new Set(bonuses.forgeRankLabels)]
  return bonuses
}

export function summarizeSystemSkillBonuses(char = {}) {
  const b = calcSystemSkillBonuses(char)
  const parts = []
  if (b.skeletonPoints) parts.push(`+${b.skeletonPoints} Pontos de Esqueleto`)
  if (b.vida) parts.push(`+${b.vida} Vida`)
  if (b.energia) parts.push(`+${b.energia} Energia`)
  if (b.pe) parts.push(`+${b.pe} PE`)
  if (b.peh) parts.push(`+${b.peh} PEH`)
  if (b.ataque) parts.push(`+${b.ataque} Ataque`)
  if (b.dano) parts.push(`+${b.dano} Dano Base`)
  if (b.armadura) parts.push(`+${b.armadura} Armadura`)
  if (b.ca) parts.push(`+${b.ca} CA`)
  if (b.equipmentDurability) parts.push(`+${b.equipmentDurability} Durabilidade`)
  if (b.carryCapacity) parts.push(`+${b.carryCapacity} kg Carga`)
  Object.entries(b.attrCapBonuses || {}).forEach(([attr, amount]) => {
    if (amount) parts.push(`${attr} limite +${amount}`)
  })
  if (b.forgeRankBonus) {
    const label = b.forgeRankLabels.length ? ` (${b.forgeRankLabels.join(', ')})` : ''
    parts.push(`Forja +${b.forgeRankBonus} rank${label}`)
  }
  if (b.forgeEnchantmentSlots) parts.push(`Encantamentos: ${b.forgeEnchantmentSlots}`)
  if (b.forgeQualityBonus) parts.push(`Qualidade Forja +${b.forgeQualityBonus}`)
  if (b.manualFlags.length) parts.push(...b.manualFlags)
  return parts
}

export function suggestSystemSkillsForCharacter(char = {}) {
  const suggestions = []
  ;(char.habilidades || []).forEach((h, index) => {
    if (h.tipo !== 'Passiva') return
    const raw = `${h.nome || ''} ${h.descricao || ''}`
    const text = raw.toLowerCase()
    const add = (skillId, reason, suggestedEffects = null) => suggestions.push({
      skillId,
      abilityIndex: index,
      title: `Passiva pode usar Skill: ${getSystemSkillById(skillId)?.name || skillId}`,
      message: reason,
      details: `${h.nome || 'Passiva sem nome'}: ${h.descricao || 'Sem descricao'}`,
      source: 'analysis',
      suggestedEffects,
    })

    const numberMatch = text.match(/(\d+)/)
    const everyMatch = text.match(/cada\s*(\d+)?\s*n[ií]ve/)
    if (/esqueleto|atributo|evolu/.test(text) && /n[ií]vel|level|progress/.test(text)) {
      add('skeleton_progression', 'A passiva altera progressao ou pontos de esqueleto.', [{
        type: 'skeleton_points_per_level_interval',
        every: everyMatch ? Number(everyMatch[1] || 1) : 5,
        amount: numberMatch ? Number(numberMatch[1]) : 1,
      }])
    }

    if (/dano/.test(text) && (/n[ií]vel|level|for[cç]a|destreza|constitui|intelig|aparencia|alma|esqueleto|atributo/.test(text))) {
      const attr = /destreza|des\b/.test(text) ? 'DES'
        : /constitui|con\b/.test(text) ? 'CON'
        : /intelig|int\b/.test(text) ? 'INT'
        : /aparencia|apa\b/.test(text) ? 'APA'
        : /alma|am\b/.test(text) ? 'AM'
        : 'FOR'
      const amount = numberMatch ? Number(numberMatch[1]) : 5
      const every = text.match(/cada\s*(\d+)?\s*(pontos?|pts|de\s*for|de\s*des|de\s*con|de\s*int|de\s*apa|de\s*am)/i)
      add('scaling_damage', 'A passiva transforma nivel ou atributo em dano permanente.', [{
        type: /n[ií]vel|level/.test(text) && !/atributo|esqueleto|for[cç]a|destreza|constitui|intelig|aparencia|alma/.test(text)
          ? 'damage_per_level_interval'
          : 'damage_per_attribute_interval',
        attr,
        source: /esqueleto/.test(text) ? 'skeleton' : 'total',
        every: every ? Number(every[1] || 5) : 5,
        amount,
      }])
    }

    if (/vida|hp|energia|mana|pe\b|reservatorio|reserva/.test(text)) {
      const resource = /vida|hp/.test(text) ? 'vida' : /pe\b/.test(text) ? 'pe' : 'energia'
      add('resource_growth', 'A passiva aumenta um recurso maximo diretamente na ficha.', [{
        type: 'resource_per_level',
        resource,
        amount: numberMatch ? Number(numberMatch[1]) : 3,
      }])
    }

    if (/limite|ultrapass|teto|cap\b/.test(text) && /for[cç]a|destreza|constitui|intelig|aparencia|alma|atributo/.test(text)) {
      const attr = /destreza|des\b/.test(text) ? 'DES'
        : /constitui|con\b/.test(text) ? 'CON'
        : /intelig|int\b/.test(text) ? 'INT'
        : /aparencia|apa\b/.test(text) ? 'APA'
        : /alma|am\b/.test(text) ? 'AM'
        : 'FOR'
      add('attribute_cap_break', 'A passiva permite superar o limite de um atributo.', [{
        type: 'attribute_cap_bonus',
        attr,
        amount: numberMatch ? Number(numberMatch[1]) : 1,
        purchases: 1,
      }])
    }

    if (/forja|ferreir|criar?\s*arma|forjar|metal|a[cç]o|encantamento|encantar/.test(text)) {
      const effects = []
      if (/rank|metal|a[cç]o|superior/.test(text)) effects.push({ type: 'forge_rank_bonus', rankBonus: 1, label: 'Aco especial' })
      if (/encantamento|encantar|habilidade extra/.test(text)) effects.push({ type: 'forge_enchantment_slots', slots: 1, scaling: 'flat', every: 5, amount: 1 })
      if (/qualidade|afiado|melhor|obra-prima/.test(text)) effects.push({ type: 'forge_quality_bonus', qualityBonus: 1 })
      add('forge_master', 'A passiva altera criacao de armas, ranks ou encantamentos.', effects.length ? effects : [{ type: 'forge_enchantment_slots', slots: 1, scaling: 'flat', every: 5, amount: 1 }])
    }
  })

  const known = new Set()
  return suggestions.filter(s => {
    const key = `${s.skillId}:${s.abilityIndex}`
    if (known.has(key)) return false
    known.add(key)
    return true
  })
}

export { SYSTEM_SKILLS, EFFECT_PARAM_DEFS }
