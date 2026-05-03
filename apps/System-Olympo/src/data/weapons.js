export const WEAPONS = [
  { id: 'espada_longa', name: 'Espada Longa', dano: '1d8', attr: 'FOR', mec: 'Golpe Versátil: 2 mãos = +1d6 dano.' },
  { id: 'katana', name: 'Katana', dano: '1d8', attr: 'DES', mec: 'Iajutsu: sem ataque anterior, +4 acerto e +2d8 dano.' },
  { id: 'adaga', name: 'Adaga / Punhal', dano: '1d4', attr: 'DES', mec: 'Ataque Rápido: 2 ataques (2° com −2).' },
  { id: 'machado_guerra', name: 'Machado de Guerra', dano: '1d10', attr: 'FOR', mec: 'Golpe Pesado: −2 acerto, crítico em 18–20.' },
  { id: 'martelo_guerra', name: 'Martelo de Guerra', dano: '1d10', attr: 'FOR', mec: 'Impacto: 30% chance de atordoar (CD CON 14).' },
  { id: 'lanca', name: 'Lança', dano: '1d6', attr: 'FOR', mec: 'Alcance 3m. +2 CA contra ataques corpo-a-corpo.' },
  { id: 'mangual', name: 'Mangual', dano: '1d8', attr: 'FOR', mec: 'Ignora bônus de +4 de escudos inimigos.' },
  { id: 'chicote', name: 'Chicote', dano: '1d4', attr: 'DES', mec: 'Acerto pode desarmar o alvo (CD DES 14).' },
  { id: 'arco_longo', name: 'Arco Longo', dano: '1d8', attr: 'DES', mec: '+2 acerto se não se moveu.' },
  { id: 'besta', name: 'Besta', dano: '1d10', attr: 'DES', mec: '+4 dano contra armadura pesada.' },
  { id: 'pistola', name: 'Pistola', dano: '1d8', attr: 'DES', mec: '+3d8 dano contra alvos a menos de 5m.' },
  { id: 'submetralhadora', name: 'Sub-Metralhadora', dano: '1d6', attr: 'DES', mec: 'Rajada: ao acertar, gasta 3 munição para +2 ataques extras (−3 acerto cada). Recarga: 1 ação (carregador 30).' },
  { id: 'rifle', name: 'Rifle', dano: '1d10', attr: 'DES', mec: '+3 acerto para alvos a 30m ou mais.' },
  { id: 'escopeta', name: 'Escopeta', dano: '2d6', attr: 'DES', mec: 'Cone 5m: atinge todos no cone.' },
  { id: 'sniper', name: 'Sniper', dano: '2d8', attr: 'DES', mec: 'Se mirar 1 rodada, +5 acerto no próximo.' },
  { id: 'escudo_pequeno', name: 'Escudo Pequeno', dano: '1d4', attr: 'FOR', mec: '+2 CA. Ao bloquear, pode atacar como reação (empurra 3m).' },
  { id: 'escudo_grande', name: 'Escudo Grande', dano: '1d6', attr: 'FOR', mec: '+3 CA. Pode plantar para cobertura total.' },
  { id: 'manopla', name: 'Manopla', dano: '1d6', attr: 'FOR', mec: 'Golpes consecutivos no mesmo alvo: +1d4 (máx Mod.FOR), reseta ao errar.' },
  { id: 'foice', name: 'Foice', dano: '1d6', attr: 'FOR', mec: 'Gancho: acertos consecutivos causam sangramento (+1d4 por turno, máx 3). Alcance 2m.' },
]

export const WEAPON_RANKS = [
  { rank: 'Comum', danoBonus: '', caBonus: 2, slots: 0 },
  { rank: 'Incomum', danoBonus: '+1d6', caBonus: 3, slots: 1 },
  { rank: 'Raro', danoBonus: '+2d6', caBonus: 4, slots: 2 },
  { rank: 'Épico', danoBonus: '+3d8', caBonus: 5, slots: 3 },
  { rank: 'Heroico', danoBonus: '+4d8', caBonus: 6, slots: 4 },
  { rank: 'Lendário', danoBonus: '+5d10', caBonus: 7, slots: 5 },
  { rank: 'Mítico', danoBonus: '+6d12', caBonus: 9, slots: 6 },
  { rank: 'Transcendente', danoBonus: '+8d12', caBonus: 12, slots: 8 },
]

export const WEAPON_ABILITY_COST = { Fraca: 1, Média: 2, Forte: 3 }

export const RANK_LEVEL_BAND = {
  Comum: 'N1-5',
  Incomum: 'N3-8',
  Raro: 'N6-12',
  Épico: 'N10-16',
  Heroico: 'N14-20',
  Lendário: 'N18-25',
  Mítico: 'N22-28',
  Transcendente: 'N26-30',
}

export const WEAPON_LIMITS = [
  { minLevel: 1, maxWeapons: 1, maxRank: 'Raro' },
  { minLevel: 8, maxWeapons: 1, maxRank: 'Épico' },
  { minLevel: 14, maxWeapons: 2, maxRank: 'Heroico' },
  { minLevel: 20, maxWeapons: 2, maxRank: 'Lendário' },
  { minLevel: 26, maxWeapons: 3, maxRank: 'Transcendente' },
]

export const MARTIAL_ARTS_LIMITS = [
  { minLevel: 1, maxArts: 1, maxGrau: 1 },
  { minLevel: 8, maxArts: 1, maxGrau: 2 },
  { minLevel: 16, maxArts: 1, maxGrau: 3 },
  { minLevel: 23, maxArts: 2, maxGrau: 3 },
]

export function getWeaponLimitForLevel(nivel) {
  const limits = [...WEAPON_LIMITS].reverse()
  return limits.find(l => nivel >= l.minLevel) || WEAPON_LIMITS[0]
}

export function getMartialArtsLimitForLevel(nivel) {
  const limits = [...MARTIAL_ARTS_LIMITS].reverse()
  return limits.find(l => nivel >= l.minLevel) || MARTIAL_ARTS_LIMITS[0]
}

export function getRankIndex(rank) {
  return WEAPON_RANKS.findIndex(r => r.rank === rank)
}

export function canEquipRank(nivel, rank) {
  const limit = getWeaponLimitForLevel(nivel)
  const maxIdx = getRankIndex(limit.maxRank)
  const rankIdx = getRankIndex(rank)
  return rankIdx <= maxIdx
}

export const LEGENDARY_WEAPONS = [
  {
    id: 'requiem',
    name: 'Requiem',
    tipo: 'pistola',
    dano: '2d10',
    attr: 'DES',
    rank: 'Lendário',
    descricao: 'Pistola lendária forjada nas sombras do Abismo. Cada disparo ecoa como um acorde final — silenciando a vida de quem o ouve.',
    mec: 'Disparo FATAL: ao acertar crítico, o alvo recebe +4d12 dano necrótico e deve fazer CD CON 22 ou perder 1 ação no próximo turno. Recarga: 6 munições (ação parcial).',
    habilidades: [
      { nome: 'Acorde de Morte', potencia: 'Forte', tipo: 'Ativa', custo: '3 PE', descricao: 'Canaliza energia abissal em um disparo perfurante. Alvo recebe 3d12 dano necrótico adicional e −4 em todas as defesas por 2 rodadas.' },
      { nome: 'Sinfonia do Fim', potencia: 'Forte', tipo: 'Ativa', custo: '5 PE', descricao: 'Dispara uma salva de 3 projéteis sombrios em cone de 8m. Cada projétil causa 2d8 necrótico e reduz cura do alvo em 50% por 3 rodadas.' },
    ],
    assignedTo: null,
  },
]
