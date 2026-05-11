import { SYSTEM_SKILLS, getSystemSkillById } from '../data/systemSkills'

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
    createdAt: new Date().toISOString(),
    ...patch,
  }
}

export function createSystemSkillNotification({ skillId = 'integracao_manual', abilityIndex = null, title, message, details = '', source = 'manual' }) {
  const def = getSystemSkillById(skillId) || getSystemSkillById('integracao_manual')
  return {
    id: `notice_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    status: 'open',
    source,
    skillId: def?.id || 'integracao_manual',
    abilityIndex,
    title: title || `Possivel Skill: ${def?.name || 'Integracao Manual'}`,
    message: message || def?.short || 'Esta passiva pode precisar de integracao sistemica.',
    details,
    createdAt: new Date().toISOString(),
  }
}

function intervalBonus(nivel, every, amount) {
  return Math.max(0, Math.floor((Number(nivel) || 1) / every) * amount)
}

export function calcSystemSkillBonuses(char = {}) {
  const bonuses = {
    skeletonPoints: 0,
    vida: 0,
    energia: 0,
    pe: 0,
    peh: 0,
    ataque: 0,
    dano: 0,
    armadura: 0,
    equipmentDurability: 0,
    forgeUnlocks: [],
    knowledgeUnlocks: [],
    manualFlags: [],
  }

  const nivel = Number(char.nivel) || 1
  for (const assigned of getAssignedSystemSkills(char)) {
    if (assigned.active === false) continue
    for (const effect of assigned.definition.effects || []) {
      switch (effect.type) {
        case 'skeleton_points_per_level_interval':
          bonuses.skeletonPoints += intervalBonus(nivel, effect.every || 5, effect.amount || 1)
          break
        case 'hp_per_level':
          bonuses.vida += nivel * (effect.amount || 0)
          break
        case 'energy_per_level':
          bonuses.energia += nivel * (effect.amount || 0)
          break
        case 'pe_per_level_interval':
          bonuses.pe += intervalBonus(nivel, effect.every || 5, effect.amount || 1)
          break
        case 'peh_per_level_interval':
          bonuses.peh += intervalBonus(nivel, effect.every || 10, effect.amount || 1)
          break
        case 'attack_bonus':
          bonuses.ataque += effect.amount || 0
          break
        case 'damage_bonus':
          bonuses.dano += effect.amount || 0
          break
        case 'armor_bonus':
          bonuses.armadura += effect.amount || 0
          break
        case 'equipment_durability_bonus':
          bonuses.equipmentDurability += effect.amount || 0
          break
        case 'forge_unlock':
          bonuses.forgeUnlocks.push(...(effect.unlocks || []))
          break
        case 'knowledge_unlock':
          bonuses.knowledgeUnlocks.push(...(effect.unlocks || []))
          break
        case 'manual_flag':
          bonuses.manualFlags.push(assigned.notes || assigned.definition.name)
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
  if (b.equipmentDurability) parts.push(`+${b.equipmentDurability} Durabilidade`)
  if (b.forgeUnlocks.length) parts.push(`Forja: ${b.forgeUnlocks.join(', ')}`)
  if (b.knowledgeUnlocks.length) parts.push(`Acessos: ${b.knowledgeUnlocks.join(', ')}`)
  return parts
}

export function suggestSystemSkillsForCharacter(char = {}) {
  const suggestions = []
  ;(char.habilidades || []).forEach((h, index) => {
    if (h.tipo !== 'Passiva') return
    const text = `${h.nome || ''} ${h.descricao || ''}`.toLowerCase()
    const add = (skillId, reason) => suggestions.push({
      skillId,
      abilityIndex: index,
      title: `Passiva pode usar Skill: ${getSystemSkillById(skillId)?.name || skillId}`,
      message: reason,
      details: `${h.nome || 'Passiva sem nome'}: ${h.descricao || 'Sem descricao'}`,
      source: 'analysis',
    })
    if (/esqueleto|atributo|evolu/i.test(text) && /nivel|niveis|level|progress/i.test(text)) add('zeus_progressao_acelerada', 'A passiva parece alterar progressao ou pontos de esqueleto.')
    if (/forja|ferreir|arma|equipamento|hefesto|rank|metal|a[cç]o/i.test(text)) add('hefestiana_forja_superior', 'A passiva parece modificar criacao ou melhoria de armas/equipamentos.')
    if (/vida|hp|vigor|resist|vital/i.test(text)) add('vigor_titanico', 'A passiva parece alterar vida maxima de forma permanente.')
    if (/energia|mana|eter|arcana|mental/i.test(text)) add('reservatorio_eterico', 'A passiva parece alterar energia maxima de forma permanente.')
    if (/peh|evolu[cç][aã]o de habilidade|trein/i.test(text)) add('disciplina_de_evolucao', 'A passiva parece acelerar evolucao de habilidades.')
  })
  const known = new Set()
  return suggestions.filter(s => {
    const key = `${s.skillId}:${s.abilityIndex}`
    if (known.has(key)) return false
    known.add(key)
    return true
  })
}

export { SYSTEM_SKILLS }
