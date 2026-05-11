export const WEAPONS = [
  { id: 'espada_longa', name: 'Espada Longa', dano: '1d8', attr: 'FOR', peso: 1.8, mec: 'Golpe Versátil: 2 mãos = +1d6 dano.' },
  { id: 'katana', name: 'Katana', dano: '1d8', attr: 'DES', peso: 1.4, mec: 'Iajutsu: sem ataque anterior, +4 acerto e +2d8 dano.' },
  { id: 'adaga', name: 'Adaga / Punhal', dano: '1d4', attr: 'DES', peso: 0.5, mec: 'Ataque Rápido: 2 ataques (2° com −2).' },
  { id: 'machado_guerra', name: 'Machado de Guerra', dano: '1d10', attr: 'FOR', peso: 4.0, mec: 'Golpe Pesado: −2 acerto, crítico em 18–20.' },
  { id: 'martelo_guerra', name: 'Martelo de Guerra', dano: '1d10', attr: 'FOR', peso: 5.0, mec: 'Impacto: 30% chance de atordoar (CD CON 14).' },
  { id: 'lanca', name: 'Lança', dano: '1d6', attr: 'FOR', peso: 3.0, mec: 'Alcance 3m. +2 CA contra ataques corpo-a-corpo.' },
  { id: 'mangual', name: 'Mangual', dano: '1d8', attr: 'FOR', peso: 3.5, mec: 'Ignora bônus de +4 de escudos inimigos.' },
  { id: 'chicote', name: 'Chicote', dano: '1d4', attr: 'DES', peso: 1.0, mec: 'Acerto pode desarmar o alvo (CD DES 14).' },
  { id: 'arco_longo', name: 'Arco Longo', dano: '1d8', attr: 'DES', peso: 1.5, mec: '+2 acerto se não se moveu.' },
  { id: 'besta', name: 'Besta', dano: '1d10', attr: 'DES', peso: 2.5, mec: '+4 dano contra armadura pesada.' },
  { id: 'pistola', name: 'Pistola', dano: '1d8', attr: 'DES', peso: 1.0, mec: '+3d8 dano contra alvos a menos de 5m.' },
  { id: 'submetralhadora', name: 'Sub-Metralhadora', dano: '1d6', attr: 'DES', peso: 3.5, mec: 'Rajada: ao acertar, gasta 3 munição para +2 ataques extras (−3 acerto cada). Recarga: 1 ação (carregador 30).' },
  { id: 'rifle', name: 'Rifle', dano: '1d10', attr: 'DES', peso: 3.5, mec: '+3 acerto para alvos a 30m ou mais.' },
  { id: 'escopeta', name: 'Escopeta', dano: '2d6', attr: 'DES', peso: 3.5, mec: 'Cone 5m: atinge todos no cone.' },
  { id: 'sniper', name: 'Sniper', dano: '2d8', attr: 'DES', peso: 5.0, mec: 'Se mirar 1 rodada, +5 acerto no próximo.' },
  { id: 'escudo_pequeno', name: 'Escudo Pequeno', dano: '1d4', attr: 'FOR', peso: 4.0, mec: '+2 CA. Ao bloquear, pode atacar como reação (empurra 3m).' },
  { id: 'escudo_grande', name: 'Escudo Grande', dano: '1d6', attr: 'FOR', peso: 7.0, mec: '+3 CA. Pode plantar para cobertura total.' },
  { id: 'manopla', name: 'Manopla', dano: '1d6', attr: 'FOR', peso: 1.8, mec: 'Golpes consecutivos no mesmo alvo: +1d4 (máx Mod.FOR), reseta ao errar.' },
  { id: 'foice', name: 'Foice', dano: '1d6', attr: 'FOR', peso: 1.5, mec: 'Gancho: acertos consecutivos causam sangramento (+1d4 por turno, máx 3). Alcance 2m.' },
]

export const WEAPON_RANKS = [
  { rank: 'Comum', danoBonus: '', caBonus: 0, slots: 0 },
  { rank: 'Incomum', danoBonus: '+1d6', caBonus: 0, slots: 1 },
  { rank: 'Raro', danoBonus: '+2d6', caBonus: 0, slots: 2 },
  { rank: 'Épico', danoBonus: '+3d8', caBonus: 0, slots: 3 },
  { rank: 'Heroico', danoBonus: '+4d8', caBonus: 0, slots: 4 },
  { rank: 'Ancestral', danoBonus: '+5d10', caBonus: 0, slots: 5 },
  { rank: 'Mítico', danoBonus: '+6d12', caBonus: 0, slots: 6 },
  { rank: 'Transcendente', danoBonus: '+8d12', caBonus: 0, slots: 8 },
]

export const WEAPON_ABILITY_COST = { Fraca: 1, Média: 2, Forte: 3 }

export const RANK_LEVEL_BAND = {
  Comum: 'N1-5',
  Incomum: 'N3-8',
  Raro: 'N6-12',
  Épico: 'N10-16',
  Heroico: 'N14-20',
  Ancestral: 'N18-25',
  Mítico: 'N22-28',
  Transcendente: 'N26-30',
}

export const WEAPON_LIMITS = [
  { minLevel: 1, maxWeapons: 1, maxRank: 'Comum' },
  { minLevel: 4, maxWeapons: 1, maxRank: 'Incomum' },
  { minLevel: 7, maxWeapons: 1, maxRank: 'Raro' },
  { minLevel: 10, maxWeapons: 2, maxRank: 'Épico' },
  { minLevel: 14, maxWeapons: 2, maxRank: 'Heroico' },
  { minLevel: 18, maxWeapons: 2, maxRank: 'Ancestral' },
  { minLevel: 22, maxWeapons: 3, maxRank: 'Mítico' },
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

export function canEquipRank(nivel, rank, rankBonus = 0) {
  const limit = getWeaponLimitForLevel(nivel)
  const maxIdx = getRankIndex(limit.maxRank) + rankBonus
  const rankIdx = getRankIndex(rank)
  return rankIdx >= 0 && rankIdx <= maxIdx
}

export function getWeaponRankBonus(char) {
  const maestria = (char?.modulosAdquiridos || []).find(m => m.id === 'maestria_armamento')
  return maestria ? (maestria.boughtCount || 1) : 0
}

export function getWeaponWeight(weaponId, name = '', description = '') {
  const weapon = WEAPONS.find(w => w.id === weaponId)
  if (weapon?.peso) return weapon.peso
  const text = `${weapon?.name || ''} ${name || ''} ${description || ''}`.toLowerCase()
  if (!text.trim()) return 1
  if (/adaga|punhal|faca/.test(text)) return 0.5
  if (/pistola|taser|chicote/.test(text)) return 1
  if (/espada|katana|arco|besta|manopla|foice/.test(text)) return 1.8
  if (/lança|lanca|rifle|escopeta|sub-?metralhadora/.test(text)) return 3.5
  if (/sniper|machado|martelo|mangual/.test(text)) return 5
  if (/escudo grande|torre/.test(text)) return 7
  if (/escudo/.test(text)) return 4
  return 1.5
}

export const LEGENDARY_WEAPONS = []

export const WEAPON_POWER_LEVELS = [
  { value: 'menor', label: 'Menor', desc: 'Poderosa mas contida. Uma adaga lendária, um anel com vontade própria — superior ao comum, mas não esmaga exércitos.' },
  { value: 'notavel', label: 'Notável', desc: 'Forte e distinta. Se destaca no campo de batalha, virando combates com suas habilidades únicas.' },
  { value: 'maior', label: 'Maior', desc: 'Entre as mais poderosas. Armas que definem o destino de nações e são temidas por lendas.' },
  { value: 'suprema', label: 'Suprema', desc: 'Poder absoluto. Escallibur, a Lança do Destino — armas que moldam a história do mundo.' },
]
