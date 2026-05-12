export const SPECIAL_MATERIALS = {
  ferro_hefestiano: {
    id: 'ferro_hefestiano',
    name: 'Ferro Hefestiano',
    description: 'Metal divino forjado nas fornalhas do Olimpo. E o metal mais poderoso do universo.',
    specialty: 'Poder bruto e confiabilidade divina.',
    color: '#f59e0b',
    damageBonus: '3d8',
    armorBonus: 4,
    durabilityBonus: 12,
    special: 'Vantagem em testes de Forja e criticos confirmados.',
    icon: 'hammer',
  },
  ferro_tartaro: {
    id: 'ferro_tartaro',
    name: 'Ferro do Tartaro',
    description: 'Metal negro extraido das profundezas do Tartaro. Infundido com escuridao primordial.',
    specialty: 'Perfura defesas e resistencias fisicas.',
    color: '#6366f1',
    damageBonus: '2d10',
    armorBonus: 5,
    durabilityBonus: 8,
    special: 'Ignora totalmente a resistencia a dano fisico do alvo.',
    icon: 'local_fire_department',
  },
  aco_astrano: {
    id: 'aco_astrano',
    name: 'Aco Astrano',
    description: 'Aco forjado com meteoritos estelares. Brilha com luz cosmica.',
    specialty: 'Sinergia arcana, leitura mistica e artefatos.',
    color: '#8b5cf6',
    damageBonus: '2d8',
    armorBonus: 3,
    durabilityBonus: 6,
    special: '+3 em Arcanismo e Identificacao Magica.',
    icon: 'auto_awesome',
  },
  vibranium: {
    id: 'vibranium',
    name: 'Vibranium',
    description: 'Metal vibrante de Wakanda. Absorve impactos cineticos.',
    specialty: 'Absorcao de impacto e defesa absoluta.',
    color: '#06b6d4',
    damageBonus: '2d6',
    armorBonus: 6,
    durabilityBonus: 10,
    special: 'Reduz 2d8 de dano recebido de qualquer fonte. Imune a dano de queda.',
    icon: 'diamond',
  },
  aco_olimpiano: {
    id: 'aco_olimpiano',
    name: 'Aco Olimpiano',
    description: 'Aco sagrado forjado com a bencao dos deuses do Olimpo.',
    specialty: 'Autoridade divina e dano sagrado.',
    color: '#eab308',
    damageBonus: '2d8',
    armorBonus: 4,
    durabilityBonus: 8,
    special: 'Vantagem em testes de Persuasao com Deuses. Causa 1d4 de dano radiante a mortos-vivos.',
    icon: 'account_balance',
  },
}

export function getMaterialGrantUsage(char = {}, materialId) {
  const equipmentItems = Array.isArray(char.equipamentos) ? char.equipamentos : Object.values(char.equipamentos || {})
  return equipmentItems.reduce((count, item) => {
    const self = item?.materialEspecial === materialId ? 1 : 0
    const pieces = Array.isArray(item?.pieces) ? item.pieces : Array.isArray(item?.itens) ? item.itens : []
    const nested = pieces.filter(piece => piece?.materialEspecial === materialId).length
    return count + self + nested
  }, 0)
}

export function getForgeMaterialGrants(char = {}) {
  return Array.isArray(char.forgeMaterialGrants) ? char.forgeMaterialGrants : []
}

export function getAvailableForgeMaterials(char = {}) {
  return getForgeMaterialGrants(char)
    .map(grant => {
      const material = SPECIAL_MATERIALS[grant.materialId]
      if (!material) return null
      const used = getMaterialGrantUsage(char, grant.materialId)
      const limit = grant.unlimited ? Infinity : Math.max(0, Number(grant.limit) || 0)
      return {
        ...grant,
        material,
        used,
        remaining: grant.unlimited ? Infinity : Math.max(0, limit - used),
        available: grant.unlimited || used < limit,
      }
    })
    .filter(Boolean)
}

export function getMaterialBonus(materialKey, bonusType) {
  const material = SPECIAL_MATERIALS[materialKey]
  if (!material) return 0

  switch (bonusType) {
    case 'damage':
      return material.damageBonus || ''
    case 'armor':
      return material.armorBonus || 0
    case 'durability':
      return material.durabilityBonus || 0
    case 'special':
      return material.special || ''
    default:
      return 0
  }
}

export function getMaterialDamageBonus(materialKey) {
  return getMaterialBonus(materialKey, 'damage')
}

export function getMaterialArmorBonus(materialKey) {
  return getMaterialBonus(materialKey, 'armor')
}

export function getMaterialDurabilityBonus(materialKey) {
  return getMaterialBonus(materialKey, 'durability')
}

export function getMaterialSpecial(materialKey) {
  return getMaterialBonus(materialKey, 'special')
}

export function getMaterialLabel(materialKey) {
  return SPECIAL_MATERIALS[materialKey]?.name || 'Material Comum'
}

export function getMaterialIcon(materialKey) {
  return SPECIAL_MATERIALS[materialKey]?.icon || 'settings'
}
