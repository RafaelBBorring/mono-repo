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
  { id: 'rifle', name: 'Rifle', dano: '1d10', attr: 'DES', mec: '+3 acerto para alvos a 30m ou mais.' },
  { id: 'escopeta', name: 'Escopeta', dano: '2d6', attr: 'DES', mec: 'Cone 5m: atinge todos no cone.' },
  { id: 'sniper', name: 'Sniper', dano: '2d8', attr: 'DES', mec: 'Se mirar 1 rodada, +5 acerto no próximo.' },
  { id: 'escudo_pequeno', name: 'Escudo Pequeno', dano: '1d4', attr: 'FOR', mec: '+2 CA. Ao bloquear, pode atacar como reação (empurra 3m).' },
  { id: 'escudo_grande', name: 'Escudo Grande', dano: '1d6', attr: 'FOR', mec: '+3 CA. Pode plantar para cobertura total.' },
  { id: 'manopla', name: 'Manopla', dano: '1d6', attr: 'FOR', mec: 'Golpes consecutivos no mesmo alvo: +1d4 (máx Mod.FOR), reseta ao errar.' },
]

export const WEAPON_RANKS = [
  { rank: 'Comum', danoBonus: '', caBonus: 2, slots: 0 },
  { rank: 'Incomum', danoBonus: '+1d6', caBonus: 3, slots: 1 },
  { rank: 'Raro', danoBonus: '+2d6', caBonus: 4, slots: 2 },
  { rank: 'Épico', danoBonus: '+3d8', caBonus: 5, slots: 3 },
  { rank: 'Lendário', danoBonus: '+4d10', caBonus: 6, slots: 4 },
  { rank: 'Mítico', danoBonus: '+5d12', caBonus: 8, slots: 5 },
]

export const WEAPON_ABILITY_COST = { Fraca: 1, Média: 2, Forte: 3 }
