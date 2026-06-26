export const WEAPON_PROPS = {
  attacks: 'Armas com 2 ataques realizam duas rolagens de acerto e duas de dano separadas na mesma rodada. O defensor esquiva de cada uma individualmente.',
  peCost: 'Armas pesadas corpo a corpo e arma de fogo pesada exigem 1 Ponto de Esforço por ataque realizado. Não é opcional.',
  dodgePenalty: 'Enquanto empunha uma arma com penalidade, o defensor subtrai os dados indicados da pool de Agilidade ao esquivar. A pool nunca cai abaixo de 1d6.',
  ocultavel: 'Passa despercebida em situações sociais e revistas superficiais. Em buscas rigorosas o Narrador pode pedir Agilidade ou Presença.',
  socialReach: 'Pode ser portada em ambientes formais e locais com restrição de armamentos sem ser confiscada automaticamente.',
  reload: 'Bestas e armas de fogo precisam de rodadas inteiras para recarregar após cada disparo. Na rodada de recarga o personagem não ataca e sofre -2d6 na esquiva. Agilidade 6+ reduz o tempo de recarga em 1 rodada.'
}

export const MELEE_WEAPONS = [
  { key: 'desarmado', name: 'Desarmado', porte: 'leve', category: 'corpo', hitAttr: 'for', damage: 1, attacks: 2, peCost: 0, dodgePenalty: 0, ocultavel: true, socialReach: true, reload: 0, tags: ['Soco', 'Base'] },
  { key: 'faca', name: 'Faca', porte: 'leve', category: 'corpo', hitAttr: 'for', damage: 2, attacks: 2, peCost: 0, dodgePenalty: 0, ocultavel: true, socialReach: true, reload: 0, tags: ['Faca'] },
  { key: 'adaga', name: 'Adaga', porte: 'leve', category: 'corpo', hitAttr: 'for', damage: 2, attacks: 2, peCost: 0, dodgePenalty: 0, ocultavel: true, socialReach: true, reload: 0, tags: ['Adaga'] },
  { key: 'espada', name: 'Espada', porte: 'medio', category: 'corpo', hitAttr: 'for', damage: 3, attacks: 1, peCost: 0, dodgePenalty: 0, ocultavel: false, socialReach: false, reload: 0, tags: ['Espada'] },
  { key: 'sabre', name: 'Sabre', porte: 'medio', category: 'corpo', hitAttr: 'for', damage: 3, attacks: 1, peCost: 0, dodgePenalty: 0, ocultavel: false, socialReach: false, reload: 0, tags: ['Sabre'] },
  { key: 'lanca', name: 'Lança', porte: 'medio', category: 'corpo', hitAttr: 'for', damage: 3, attacks: 1, peCost: 0, dodgePenalty: 0, ocultavel: false, socialReach: false, reload: 0, tags: ['Lança'] },
  { key: 'machado', name: 'Machado', porte: 'pesado', category: 'corpo', hitAttr: 'for', damage: 4, attacks: 1, peCost: 1, dodgePenalty: 2, ocultavel: false, socialReach: false, reload: 0, tags: ['Machado'] },
  { key: 'mandoble', name: 'Mandoble', porte: 'pesado', category: 'corpo', hitAttr: 'for', damage: 5, attacks: 1, peCost: 1, dodgePenalty: 2, ocultavel: false, socialReach: false, reload: 0, tags: ['Mandoble'] },
  { key: 'maca_grande', name: 'Maça Grande', porte: 'pesado', category: 'corpo', hitAttr: 'for', damage: 5, attacks: 1, peCost: 1, dodgePenalty: 2, ocultavel: false, socialReach: false, reload: 0, tags: ['Maça'] },
  { key: 'improvisada', name: 'Arma Improvisada', porte: 'leve', category: 'corpo', hitAttr: 'for', damage: 1, attacks: 1, peCost: 0, dodgePenalty: 0, ocultavel: true, socialReach: true, reload: 0, tags: ['Banco', 'Caneco'], contextual: true }
]

export const RANGED_WEAPONS = [
  { key: 'arremessada', name: 'Arma Arremessada', porte: 'leve', category: 'distancia', hitAttr: 'agi', damage: 1, attacks: 2, peCost: 0, dodgePenalty: 0, ocultavel: true, socialReach: true, reload: 0, tags: ['Faca', 'Pedra'] },
  { key: 'arco_curto', name: 'Arco Curto', porte: 'leve', category: 'distancia', hitAttr: 'agi', damage: 2, attacks: 2, peCost: 0, dodgePenalty: 0, ocultavel: false, socialReach: false, reload: 0, tags: ['Arco'] },
  { key: 'besta_leve', name: 'Besta Leve', porte: 'leve', category: 'distancia', hitAttr: 'agi', damage: 2, attacks: 1, peCost: 0, dodgePenalty: 0, ocultavel: false, socialReach: false, reload: 1, tags: ['Besta'] },
  { key: 'arco_longo', name: 'Arco Longo', porte: 'medio', category: 'distancia', hitAttr: 'agi', damage: 3, attacks: 1, peCost: 0, dodgePenalty: 1, ocultavel: false, socialReach: false, reload: 0, tags: ['Arco longo'] },
  { key: 'besta_pesada', name: 'Besta Pesada', porte: 'medio', category: 'distancia', hitAttr: 'agi', damage: 3, attacks: 1, peCost: 0, dodgePenalty: 1, ocultavel: false, socialReach: false, reload: 2, tags: ['Besta'] },
  { key: 'fogo_leve', name: 'Arma de Fogo Leve', porte: 'medio', category: 'distancia', hitAttr: 'agi', damage: 4, attacks: 2, peCost: 0, dodgePenalty: 0, ocultavel: true, socialReach: false, reload: 1, tags: ['Pistola'] },
  { key: 'fogo_pesada', name: 'Arma de Fogo Pesada', porte: 'pesado', category: 'distancia', hitAttr: 'agi', damage: 5, attacks: 1, peCost: 1, dodgePenalty: 2, ocultavel: false, socialReach: false, reload: 2, tags: ['Rifle', 'Escopeta'] }
]

export const MAGIC_WEAPONS = [
  { key: 'menor', name: 'Feitiço Menor', category: 'magia', hitAttr: 'am', damage: 1, attacks: 1, ignoresArmor: true, energia: 2, tags: ['Truque'] },
  { key: 'medio', name: 'Feitiço Médio', category: 'magia', hitAttr: 'am', damage: 2, attacks: 1, ignoresArmor: true, energia: 4, tags: ['Raio'] },
  { key: 'maior', name: 'Feitiço Maior', category: 'magia', hitAttr: 'am', damage: 3, attacks: 1, ignoresArmor: true, energia: 7, tags: ['Bola de fogo'] },
  { key: 'absoluto', name: 'Feitiço Absoluto', category: 'magia', hitAttr: 'am', damage: 4, attacks: 1, ignoresArmor: true, energia: 12, tags: ['Devastador'] },
  { key: 'celeste', name: 'Feitiço Celeste', category: 'magia', hitAttr: 'am', damage: 5, attacks: 1, ignoresArmor: true, energia: 12, tags: ['Divino'] }
]

export const ENVIRONMENTAL = [
  { key: 'leve', name: 'Leve', dice: 2 },
  { key: 'moderada', name: 'Moderada', dice: 3 },
  { key: 'severa', name: 'Severa', dice: 4 },
  { key: 'extrema', name: 'Extrema', dice: 5 },
  { key: 'catastrofica', name: 'Catastrófica', dice: 6 }
]

export const ALL_WEAPONS = [...MELEE_WEAPONS, ...RANGED_WEAPONS, ...MAGIC_WEAPONS]
export const WEAPON_BY_KEY = Object.fromEntries(ALL_WEAPONS.map(w => [w.key, w]))
