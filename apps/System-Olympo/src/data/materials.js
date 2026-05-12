export const SPECIAL_MATERIALS = {
  ferro_hefestiano: {
    id: 'ferro_hefestiano',
    name: 'Ferro Hefestiano',
    description: 'Metal divino forjado nas fornalhas do Olimpo. É o metal mais poderoso do universo.',
    color: '#f59e0b',
    damageBonus: '3d8',
    armorBonus: 4,
    durabilityBonus: 12,
    special: 'Vantagem em testes de Forja e Críticos confirmados.',
    icon: '⚒️',
  },
  ferro_tartaro: {
    id: 'ferro_tartaro',
    name: 'Ferro do Tártaro',
    description: 'Metal negro extraído das profundezas do Tártaro. Infundido com escuridão primordial.',
    color: '#6366f1',
    damageBonus: '2d10',
    armorBonus: 5,
    durabilityBonus: 8,
    special: 'Ignora totalmente a resistência a dano físico do alvo.',
    icon: '🔥',
  },
  aco_astrano: {
    id: 'aco_astrano',
    name: 'Aço Astrano',
    description: 'Aço forjado com meteoritos estelares. Brilha com luz cósmica.',
    color: '#8b5cf6',
    damageBonus: '2d8',
    armorBonus: 3,
    durabilityBonus: 6,
    special: '+3 em Arcanismo e Identificação Mágica.',
    icon: '✨',
  },
  vibranium: {
    id: 'vibranium',
    name: 'Vibranium',
    description: 'Metal vibrante de Wakanda. Absorve impactos cinéticos.',
    color: '#06b6d4',
    damageBonus: '2d6',
    armorBonus: 6,
    durabilityBonus: 10,
    special: 'Reduz 2d8 de dano recebido de qualquer fonte. Imune a dano de queda.',
    icon: '💎',
  },
  aco_olimpiano: {
    id: 'aco_olimpiano',
    name: 'Aço Olimpiano',
    description: 'Aço sagrado forjado com a bênção dos deuses do Olimpo.',
    color: '#eab308',
    damageBonus: '2d8',
    armorBonus: 4,
    durabilityBonus: 8,
    special: 'Vantagem em testes de Persuasão com Deuses. Causa 1d4 de dano radiante a mortos-vivos.',
    icon: '🏛️',
  },
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
  return SPECIAL_MATERIALS[materialKey]?.icon || '⚙️'
}
