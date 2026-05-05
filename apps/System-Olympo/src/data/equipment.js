export const EQUIPMENT_SLOTS = ['Cabeça', 'Torso', 'Braços', 'Pernas', 'Acessório']

export const EQUIPMENT_RARITIES = [
  { rank: 'Comum', caBonus: 0, passiveSlots: 0, color: 'gray' },
  { rank: 'Incomum', caBonus: 1, passiveSlots: 1, color: 'emerald' },
  { rank: 'Raro', caBonus: 2, passiveSlots: 1, color: 'sky' },
  { rank: 'Epico', caBonus: 3, passiveSlots: 2, color: 'purple' },
  { rank: 'Heroico', caBonus: 4, passiveSlots: 2, color: 'rose' },
  { rank: 'Ancestral', caBonus: 5, passiveSlots: 3, color: 'amber' },
  { rank: 'Mitico', caBonus: 7, passiveSlots: 3, color: 'fuchsia' },
  { rank: 'Transcendente', caBonus: 10, passiveSlots: 4, color: 'cyan' },
]

export const EQUIPMENT_TYPES = [
  { id: 'armadura_leve', label: 'Armadura Leve', slots: ['Torso'], caBase: 1, penalty: 0, desc: 'Couro, tecido reforçado. Sem penalidade.' },
  { id: 'armadura_media', label: 'Armadura Média', slots: ['Torso', 'Pernas'], caBase: 3, penalty: -1, desc: 'Cota de malha, couro endurecido. −1 DES.' },
  { id: 'armadura_pesada', label: 'Armadura Pesada', slots: ['Torso', 'Pernas', 'Braços'], caBase: 5, penalty: -2, desc: 'Placas completas. −2 DES, proteção máxima.' },
  { id: 'elmo', label: 'Elmo', slots: ['Cabeça'], caBase: 1, penalty: 0, desc: 'Proteção craniana.' },
  { id: 'escudo', label: 'Escudo', slots: [], caBase: 2, penalty: 0, desc: 'Ocupa uma mão. Pode ser usado para ataque ou defesa.' },
  { id: 'acessorio', label: 'Acessório', slots: ['Acessório'], caBase: 0, penalty: 0, desc: 'Anéis, amuletos, capas. Concedem passivas.' },
  { id: 'utilidade', label: 'Item de Utilidade', slots: [], caBase: 0, penalty: 0, desc: 'Escutas, ganchos, tasers, kits. Efeitos situacionais.' },
]

export const SET_BONUSES = [
  { id: 'set_guardiao', name: 'Guardião', pieces: 3, bonus: '+2 CA, Redução de dano 2/passou', desc: 'A proteção completa reforça a determinação.' },
  { id: 'set_sombra', name: 'Sombra', pieces: 3, bonus: '+1 DES, Vantagem em Furtividade', desc: 'As peças se fundem à escuridão.' },
  { id: 'set_arcano', name: 'Arcano', pieces: 3, bonus: '+3 Energia, Redução custo magia 10%', desc: 'O tecido pulsa com energia latente.' },
  { id: 'set_guerreiro', name: 'Guerreiro', pieces: 2, bonus: '+5 Vida, +1 Ataque', desc: 'Herança de batalhas antigas.' },
]

export const EQUIPMENT_LIMITS = [
  { minLevel: 1, maxRank: 'Raro' },
  { minLevel: 8, maxRank: 'Epico' },
  { minLevel: 14, maxRank: 'Heroico' },
  { minLevel: 20, maxRank: 'Ancestral' },
  { minLevel: 26, maxRank: 'Transcendente' },
]

export const SIMPLE_ITEMS = [
  { id: 'escuta', nome: 'Escuta Eletrônica', desc: 'Microfone direcional com 30m de alcance. Permite ouvir conversas através de paredes finas.', efeito: 'Vantagem em Percepção auditiva', peso: 0.2 },
  { id: 'gancho', nome: 'Gancho de Escalada', desc: 'Gancho de aço com corda de 15m.', efeito: 'Permite escalada sem teste em superfícies adequadas', peso: 1.5 },
  { id: 'taser', nome: 'Taser de Pulso', desc: 'Descarga elétrica de curto alcance (3m).', efeito: 'Ataque: 1d4 + INT mod. Alvo faz teste CON CD 12 ou paralisia 1 turno', peso: 0.3 },
  { id: 'kit_medico', nome: 'Kit Médico Portátil', desc: 'Suprimentos para primeiros socorros de campo.', efeito: 'Restaura 1d8 + INT mod Vida. Usos: 3', peso: 0.5 },
  { id: 'kit_ladroin', nome: 'Kit de Ladrão', desc: 'Gazua, grampo, tensiómetro e alfinetes.', efeito: 'Vantagem em testes de prestidigitação e arrombamento', peso: 0.3 },
  { id: 'lente_noite', nome: 'Lente de Visão Noturna', desc: 'Óculos compactos com amplificação de luz.', efeito: 'Visão no escuro até 30m. Desvantagem em luz forte.', peso: 0.2 },
  { id: 'granada fumaca', nome: 'Granada de Fumaça', desc: 'Cilindro que libera nuvem densa em 5m de raio.', efeito: 'Área obscurecida por 3 turnos. Vantagem em Furtividade na área.', peso: 0.4 },
  { id: 'corda_aco', nome: 'Corda de Aço (10m)', desc: 'Corda resistente para escalada ou contenção.', efeito: 'Suporta 200kg. Pode ser usada para imobilizar (FOR vs FOR).', peso: 1 },
]

export function getEquipLimitForLevel(nivel) {
  for (let i = EQUIPMENT_LIMITS.length - 1; i >= 0; i--) {
    if (nivel >= EQUIPMENT_LIMITS[i].minLevel) return EQUIPMENT_LIMITS[i]
  }
  return EQUIPMENT_LIMITS[0]
}

export function getEquipRarityIndex(rank) {
  return EQUIPMENT_RARITIES.findIndex(r => r.rank === rank)
}

export function canEquipRank(nivel, rank) {
  const limit = getEquipLimitForLevel(nivel)
  const maxIdx = getEquipRarityIndex(limit.maxRank)
  const rankIdx = getEquipRarityIndex(rank)
  return rankIdx >= 0 && rankIdx <= maxIdx
}

export function calcEquipCABonus(equipamentos) {
  if (!Array.isArray(equipamentos)) return 0
  return equipamentos.reduce((total, eq) => {
    if (!eq.equipado || eq.categoria === 'utilidade') return total
    const type = EQUIPMENT_TYPES.find(t => t.id === eq.tipoEquip)
    const rarity = EQUIPMENT_RARITIES.find(r => r.rank === eq.rank)
    return total + (type?.caBase || 0) + (rarity?.caBonus || 0)
  }, 0)
}

export function calcSetBonuses(equipamentos) {
  if (!Array.isArray(equipamentos)) return []
  const equipped = equipamentos.filter(e => e.equipado && e.setId)
  const setCounts = {}
  equipped.forEach(e => { setCounts[e.setId] = (setCounts[e.setId] || 0) + 1 })
  return SET_BONUSES.filter(s => (setCounts[s.id] || 0) >= s.pieces)
}
