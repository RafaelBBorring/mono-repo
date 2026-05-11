import { SYSTEM_SKILLS, getSystemSkillById, EFFECT_PARAM_DEFS } from '../data/systemSkills'

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
  if (!def) return []
  const defaults = def.defaults
  if (!defaults) return []
  return [{ ...defaults }]
}

export function createSystemSkillNotification({ skillId = 'manual_integration', abilityIndex = null, title, message, details = '', source = 'manual', suggestedEffects = null }) {
  const def = getSystemSkillById(skillId) || getSystemSkillById('manual_integration')
  return {
    id: `notice_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    status: 'open',
    source,
    skillId: def?.id || 'manual_integration',
    abilityIndex,
    title: title || `Possível Skill: ${def?.name || 'Integração Manual'}`,
    message: message || def?.short || 'Esta passiva pode precisar de integração sistêmica.',
    details,
    suggestedEffects: suggestedEffects || null,
    createdAt: new Date().toISOString(),
  }
}

function resolveEffectParam(effect, paramName, defaultValue) {
  if (effect[paramName] != null) return effect[paramName]
  return defaultValue
}

function intervalBonus(nivel, every, amount) {
  return Math.max(0, Math.floor((Number(nivel) || 1) / every) * amount)
}

function parseListParam(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(',').map(s => s.trim()).filter(Boolean)
  return []
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
    forgeUnlocks: [],
    forgeRankBonus: 0,
    forgeEnchantmentSlots: 0,
    forgeEnchantmentScaling: 'flat',
    forgeQualityBonus: 0,
    knowledgeUnlocks: [],
    manualFlags: [],
  }

  const nivel = Number(char.nivel) || 1
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
          const levels = parseListParam(resolveEffectParam(effect, 'levels', '5,10,15,20,25,30')).map(Number).filter(n => !isNaN(n))
          const amt = resolveEffectParam(effect, 'amount', 2)
          bonuses.skeletonPoints += levels.filter(l => nivel >= l).length * amt
          break
        }
        case 'hp_per_level':
          bonuses.vida += nivel * resolveEffectParam(effect, 'amount', 3)
          break
        case 'energy_per_level':
          bonuses.energia += nivel * resolveEffectParam(effect, 'amount', 3)
          break
        case 'pe_per_level_interval':
          bonuses.pe += intervalBonus(nivel, resolveEffectParam(effect, 'every', 5), resolveEffectParam(effect, 'amount', 1))
          break
        case 'peh_per_level_interval':
          bonuses.peh += intervalBonus(nivel, resolveEffectParam(effect, 'every', 10), resolveEffectParam(effect, 'amount', 1))
          break
        case 'attack_bonus':
          bonuses.ataque += resolveEffectParam(effect, 'amount', 1)
          break
        case 'damage_bonus':
          bonuses.dano += resolveEffectParam(effect, 'amount', 2)
          break
        case 'armor_bonus':
          bonuses.armadura += resolveEffectParam(effect, 'amount', 2)
          break
        case 'ca_bonus':
          bonuses.ca += resolveEffectParam(effect, 'amount', 1)
          break
        case 'equipment_durability_bonus':
          bonuses.equipmentDurability += resolveEffectParam(effect, 'amount', 2)
          break
        case 'carry_capacity_bonus':
          bonuses.carryCapacity += resolveEffectParam(effect, 'amount', 5)
          break
        case 'forge_rank_bonus':
          bonuses.forgeRankBonus += resolveEffectParam(effect, 'rankBonus', 1)
          break
        case 'forge_enchantment_slots':
          bonuses.forgeEnchantmentSlots += resolveEffectParam(effect, 'slots', 1)
          bonuses.forgeEnchantmentScaling = resolveEffectParam(effect, 'scaling', 'flat')
          break
        case 'forge_quality_bonus':
          bonuses.forgeQualityBonus += resolveEffectParam(effect, 'qualityBonus', 1)
          break
        case 'forge_unlock':
          bonuses.forgeUnlocks.push(...parseListParam(resolveEffectParam(effect, 'unlocks', '')))
          break
        case 'knowledge_unlock':
          bonuses.knowledgeUnlocks.push(...parseListParam(resolveEffectParam(effect, 'unlocks', '')))
          break
        case 'manual_flag':
          bonuses.manualFlags.push(assigned.notes || assigned.definition?.name || 'Manual')
          break
      }
    }
  }
  bonuses.forgeUnlocks = [...new Set(bonuses.forgeUnlocks)]
  bonuses.knowledgeUnlocks = [...new Set(bonuses.knowledgeUnlocks)]
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
  if (b.dano) parts.push(`+${b.dano} Dano`)
  if (b.armadura) parts.push(`+${b.armadura} Armadura`)
  if (b.ca) parts.push(`+${b.ca} CA`)
  if (b.equipmentDurability) parts.push(`+${b.equipmentDurability} Durabilidade`)
  if (b.carryCapacity) parts.push(`+${b.carryCapacity} kg Carga`)
  if (b.forgeRankBonus) parts.push(`Forja +${b.forgeRankBonus} rank`)
  if (b.forgeEnchantmentSlots) {
    const scaleLabel = b.forgeEnchantmentScaling === 'int_half' ? ' (INT/2)' : b.forgeEnchantmentScaling === 'level_half' ? ' (Nível/5)' : ''
    parts.push(`Encantamentos: ${b.forgeEnchantmentSlots}${scaleLabel}`)
  }
  if (b.forgeQualityBonus) parts.push(`Qualidade Forja +${b.forgeQualityBonus}`)
  if (b.forgeUnlocks.length) parts.push(`Técnicas: ${b.forgeUnlocks.join(', ')}`)
  if (b.knowledgeUnlocks.length) parts.push(`Acessos: ${b.knowledgeUnlocks.join(', ')}`)
  return parts
}

export function suggestSystemSkillsForCharacter(char = {}) {
  const suggestions = []
  ;(char.habilidades || []).forEach((h, index) => {
    if (h.tipo !== 'Passiva') return
    const text = `${h.nome || ''} ${h.descricao || ''}`.toLowerCase()
    const add = (skillId, reason, suggestedEffects = null) => suggestions.push({
      skillId,
      abilityIndex: index,
      title: `Passiva pode usar Skill: ${getSystemSkillById(skillId)?.name || skillId}`,
      message: reason,
      details: `${h.nome || 'Passiva sem nome'}: ${h.descricao || 'Sem descrição'}`,
      source: 'analysis',
      suggestedEffects,
    })

    const numMatch = text.match(/(\d+)\s*pontos?\s*(de\s*)?esqueleto/i)
    const intervalMatch = text.match(/cada\s*(\d+)?\s*n[ií]ve/i)
    if (/esqueleto|atributo|evolu/i.test(text) && /n[ií]vel|level|progress/i.test(text)) {
      const every = intervalMatch ? (intervalMatch[1] ? Number(intervalMatch[1]) : 1) : 5
      const effects = [{ type: 'skeleton_points_per_level_interval', every, amount: numMatch ? Number(numMatch[1]) : 1 }]
      add('skeleton_progression', 'A passiva altera progressão ou pontos de esqueleto.', effects)
    }
    if (/marco|milestone/i.test(text) && /esqueleto|atributo/i.test(text)) {
      add('skeleton_progression', 'A passiva concede esqueleto em marcos específicos.', [{ type: 'skeleton_points_on_milestone', levels: '5,10,15,20,25,30', amount: numMatch ? Number(numMatch[1]) : 2 }])
    }

    const hpMatch = text.match(/(\d+)\s*(vida|hp)/i)
    if (/vida|hp|vigor|resist|vital/i.test(text) && !(/armadura|escudo|durabilidade/i.test(text))) {
      add('hp_boost', 'A passiva altera vida máxima.', [{ type: 'hp_per_level', amount: hpMatch ? Number(hpMatch[1]) : 3 }])
    }

    const energyMatch = text.match(/(\d+)\s*energia/i)
    if (/energia|mana|eter|arcana|mental/i.test(text)) {
      add('energy_boost', 'A passiva altera energia máxima.', [{ type: 'energy_per_level', amount: energyMatch ? Number(energyMatch[1]) : 3 }])
    }

    if (/peh|evolu[cç][aã]o de habilidade|trein/i.test(text)) {
      add('peh_boost', 'A passiva acelera evolução de habilidades.')
    }

    if (/forja|ferreir|criar?\s*arma|forjar|metal|a[cç]o|encantamento/i.test(text)) {
      const forgeEffects = []
      if (/rank|superior/i.test(text)) forgeEffects.push({ type: 'forge_rank_bonus', rankBonus: 1 })
      if (/encantamento|encantar/i.test(text)) {
        const encMatch = text.match(/int\s*\/\s*2|intelig[eê]ncia\s*\/\s*2/i)
        forgeEffects.push({ type: 'forge_enchantment_slots', slots: encMatch ? 1 : 2, scaling: encMatch ? 'int_half' : 'flat' })
      }
      if (/qualidade|afiado|melhor/i.test(text)) forgeEffects.push({ type: 'forge_quality_bonus', qualityBonus: 1 })
      if (forgeEffects.length === 0) forgeEffects.push({ type: 'forge_quality_bonus', qualityBonus: 1 })
      add('forge_master', 'A passiva modifica criação ou melhoria de armas/equipamentos.', forgeEffects)
    }

    if (/grim[oó]rio|runa|alquimia|magia|arcano|subsistema/i.test(text)) {
      const unlocks = []
      if (/grim[oó]rio/i.test(text)) unlocks.push('grimórios')
      if (/runa/i.test(text)) unlocks.push('runas')
      if (/alquimia/i.test(text)) unlocks.push('alquimia')
      if (/magia/i.test(text)) unlocks.push('magia')
      add('knowledge_access', 'A passiva acessa subsistemas místicos.', [{ type: 'knowledge_unlock', unlocks: unlocks.join(',') || 'grimórios,runas' }])
    }

    if (/carga|carregar|peso|kg/i.test(text)) {
      const loadMatch = text.match(/(\d+)\s*kg/i)
      add('load_mastery', 'A passiva altera capacidade de carga.', [{ type: 'carry_capacity_bonus', amount: loadMatch ? Number(loadMatch[1]) : 5 }])
    }

    if (/dano\s*\+|bonus.*dano|\+\d+.*dano|ataque\s*\+/i.test(text) && /passiv/i.test(text)) {
      const dmgMatch = text.match(/\+(\d+).*dano/i)
      const atkMatch = text.match(/\+(\d+).*ataque/i)
      const effects = []
      if (dmgMatch) effects.push({ type: 'damage_bonus', amount: Number(dmgMatch[1]) })
      if (atkMatch) effects.push({ type: 'attack_bonus', amount: Number(atkMatch[1]) })
      if (effects.length === 0) effects.push({ type: 'damage_bonus', amount: 2 })
      add('combat_style', 'A passiva concede bônus permanente de combate.', effects)
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
