export const MELEE_WEAPONS = [
  { key: 'desarmado', name: 'Desarmado', category: 'corpo', bonusDice: 0, valuePerSuccess: 2, attacks: 2, peCost: 0, dodgePenaltyDefender: 0, ocultavel: false, tags: ['Soco', 'Base'] },
  { key: 'leve', name: 'Arma Leve (faca/adaga)', category: 'corpo', bonusDice: 1, valuePerSuccess: 3, attacks: 2, peCost: 0, dodgePenaltyDefender: 0, ocultavel: true, tags: ['Faca', 'Adaga'] },
  { key: 'media', name: 'Arma Média (espada/machado)', category: 'corpo', bonusDice: 2, valuePerSuccess: 4, attacks: 1, peCost: 0, dodgePenaltyDefender: 0, ocultavel: false, tags: ['Espada', 'Machado'] },
  { key: 'pesada', name: 'Arma Pesada (mandoble/maça)', category: 'corpo', bonusDice: 3, valuePerSuccess: 6, attacks: 1, peCost: 1, dodgePenaltyDefender: -2, ocultavel: false, tags: ['Mandoble', 'Maça'] },
  { key: 'improvisada', name: 'Arma Improvisada', category: 'corpo', bonusDice: 0, valuePerSuccess: 2, attacks: 1, peCost: 0, dodgePenaltyDefender: 0, ocultavel: false, tags: ['Banco', 'Caneco'] }
]

export const RANGED_WEAPONS = [
  { key: 'arremesso', name: 'Arremessada', category: 'distancia', bonusDice: 0, valuePerSuccess: 2, attacks: 2, peCost: 0, dodgePenaltyDefender: 0, ocultavel: true, tags: ['Faca', 'Pedra'] },
  { key: 'arco_curto', name: 'Arco Curto / Besta Leve', category: 'distancia', bonusDice: 1, valuePerSuccess: 3, attacks: 2, peCost: 0, dodgePenaltyDefender: 0, ocultavel: false, tags: ['Arco', 'Besta'] },
  { key: 'arco_longo', name: 'Arco Longo / Besta Pesada', category: 'distancia', bonusDice: 2, valuePerSuccess: 4, attacks: 1, peCost: 0, dodgePenaltyDefender: -1, ocultavel: false, tags: ['Arco longo'] },
  { key: 'fogo_leve', name: 'Arma de Fogo Leve', category: 'distancia', bonusDice: 2, valuePerSuccess: 5, attacks: 2, peCost: 0, dodgePenaltyDefender: 0, ocultavel: true, tags: ['Pistola'] },
  { key: 'fogo_pesada', name: 'Arma de Fogo Pesada', category: 'distancia', bonusDice: 3, valuePerSuccess: 6, attacks: 1, peCost: 1, dodgePenaltyDefender: 0, ocultavel: false, tags: ['Rifle', 'Escopeta'] }
]

export const MAGIC_WEAPONS = [
  { key: 'menor', name: 'Feitiço Menor', category: 'magia', bonusDice: 0, valuePerSuccess: 3, attacks: 1, ignoresArmor: true, energia: 2, tags: ['Truque'] },
  { key: 'medio', name: 'Feitiço Médio', category: 'magia', bonusDice: 1, valuePerSuccess: 5, attacks: 1, ignoresArmor: true, energia: 4, tags: ['Raio'] },
  { key: 'maior', name: 'Feitiço Maior', category: 'magia', bonusDice: 2, valuePerSuccess: 7, attacks: 1, ignoresArmor: true, energia: 7, tags: ['Bola de fogo'] },
  { key: 'absoluto', name: 'Feitiço Absoluto', category: 'magia', bonusDice: 3, valuePerSuccess: 10, attacks: 1, ignoresArmor: true, energia: 12, tags: ['Devastador'] },
  { key: 'celeste', name: 'Feitiço Celeste', category: 'magia', bonusDice: 3, valuePerSuccess: 12, attacks: 1, ignoresArmor: true, energia: 12, tags: ['Divino'] }
]

export const ENVIRONMENTAL = [
  { key: 'leve', name: 'Leve', dice: 2, valuePerSuccess: 2 },
  { key: 'moderada', name: 'Moderada', dice: 3, valuePerSuccess: 3 },
  { key: 'severa', name: 'Severa', dice: 4, valuePerSuccess: 5 },
  { key: 'extrema', name: 'Extrema', dice: 5, valuePerSuccess: 7 },
  { key: 'catastrofica', name: 'Catastrófica', dice: 6, valuePerSuccess: 10 }
]

export const ALL_WEAPONS = [...MELEE_WEAPONS, ...RANGED_WEAPONS, ...MAGIC_WEAPONS]
export const WEAPON_BY_KEY = Object.fromEntries(ALL_WEAPONS.map(w => [w.key, w]))
