export const ARMOR_SLOTS = [
  { id: 'peitoral', label: 'Peitoral', icon: '🛡️', desc: 'Proteção torso e peito' },
  { id: 'elmo', label: 'Elmo', icon: '⛑️', desc: 'Proteção craniana' },
  { id: 'calcas', label: 'Calças', icon: '👖', desc: 'Proteção pernas e quadril' },
  { id: 'botas', label: 'Botas', icon: '👢', desc: 'Proteção pés e tornozelos' },
]

export const ARMOR_WEIGHTS = [
  { id: 'leve', label: 'Leve', armor: 5, speedPenalty: 0, extraLife: 5, critBonus: 0, desc: 'Mobilidade total, proteção mínima. Sem penalidade.' },
  { id: 'comum', label: 'Comum', armor: 10, speedPenalty: 0, extraLife: 10, critBonus: 0, desc: 'Equilíbrio entre proteção e mobilidade.' },
  { id: 'pesado', label: 'Pesado', armor: 15, speedPenalty: -1, extraLife: 15, critBonus: 0, desc: 'Proteção máxima. -1 DES, reduz velocidade.' },
]

export const ARMOR_TYPES = [
  {
    id: 'guerreiro',
    label: 'Guerreiro',
    color: 'red',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-400/10',
    borderClass: 'border-red-400/30',
    badgeClass: 'bg-red-400/10 text-red-400 border-red-400/20',
    desc: 'Força bruta e resistência. Foco em sobrevida e dano corpo-a-corpo.',
    bonuses: [
      { pieces: 2, label: 'Resistência Marcial', bonus: '+5 Vida Extra, +1 em testes de FOR', passive: 'Golpes consecutivos no mesmo alvo causam +1d4 (max 3x).' },
      { pieces: 3, label: 'Vontade de Ferro', bonus: '+15 Vida Extra, +2 FOR, Redução de dano 3/turno', passive: 'Ao receber dano > 20, recebe metade no próximo turno.' },
      { pieces: 4, label: 'Bastião Inabalável', bonus: '+30 Vida Extra, +3 FOR, Redução de dano 5/turno, Imunidade a Atordoamento', passive: 'Uma vez por combate, ao cair a 0 HP, recupera 25% da vida máxima.' },
    ],
  },
  {
    id: 'assassino',
    label: 'Assassino',
    color: 'purple',
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-400/10',
    borderClass: 'border-purple-400/30',
    badgeClass: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    desc: 'Agilidade e letalidade. Foco em crítico e furtividade.',
    bonuses: [
      { pieces: 2, label: 'Passos Silenciosos', bonus: '+5% Chance de Crítico, +1 DES em Furtividade', passive: 'Após matar um inimigo, próximo ataque tem vantagem.' },
      { pieces: 3, label: 'Sombra Viva', bonus: '+10% Chance de Crítico, +2 DES, Vantagem em Furtividade', passive: 'Pode se mover como ação bônus após um ataque crítico.' },
      { pieces: 4, label: 'Morte Silenciosa', bonus: '+15% Chance de Crítico, +3 DES, Invisibilidade 1/combate (2 turnos)', passive: 'Críticos em furtividade causam dano máximo dos dados.' },
    ],
  },
  {
    id: 'tecnologico',
    label: 'Tecnológico',
    color: 'cyan',
    colorClass: 'text-cyan-400',
    bgClass: 'bg-cyan-400/10',
    borderClass: 'border-cyan-400/30',
    badgeClass: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
    desc: 'Tecnologia avançada. Foco em escudo de energia e utilidade.',
    bonuses: [
      { pieces: 2, label: 'Interface Neural', bonus: '+5 Escudo de Energia, +1 INT em Tecnologia', passive: 'Scan passivo: identifica armadilhas e inimigos em 10m.' },
      { pieces: 3, label: 'Sentido Ampliado', bonus: '+15 Escudo de Energia, +2 INT, Scanner passivo 20m', passive: 'Escudo absorve 100% de dano de área uma vez por combate.' },
      { pieces: 4, label: 'Nexo Cibernético', bonus: '+25 Escudo de Energia, +3 INT, Escudo regenera 5/turno', passive: 'Pode usar uma habilidade como ação livre 1x por combate.' },
    ],
  },
]

export const EQUIPMENT_RARITIES = [
  { rank: 'Comum', extraLife: 0, armorBonus: 0, activeSkills: 0, passiveSkills: 0, critBonus: 0, damageBonus: 0, shieldAmount: 0, color: 'gray' },
  { rank: 'Incomum', extraLife: 5, armorBonus: 1, activeSkills: 0, passiveSkills: 0, critBonus: 0, damageBonus: 0, shieldAmount: 0, color: 'emerald' },
  { rank: 'Raro', extraLife: 10, armorBonus: 2, activeSkills: 0, passiveSkills: 0, critBonus: 2, damageBonus: 0, shieldAmount: 5, color: 'sky' },
  { rank: 'Épico', extraLife: 15, armorBonus: 3, activeSkills: 1, passiveSkills: 0, critBonus: 3, damageBonus: 1, shieldAmount: 8, color: 'purple' },
  { rank: 'Heroico', extraLife: 20, armorBonus: 4, activeSkills: 1, passiveSkills: 0, critBonus: 5, damageBonus: 2, shieldAmount: 12, color: 'rose' },
  { rank: 'Ancestral', extraLife: 30, armorBonus: 5, activeSkills: 2, passiveSkills: 0, critBonus: 7, damageBonus: 3, shieldAmount: 18, color: 'amber' },
  { rank: 'Mítico', extraLife: 40, armorBonus: 7, activeSkills: 2, passiveSkills: 0, critBonus: 10, damageBonus: 4, shieldAmount: 25, color: 'fuchsia' },
  { rank: 'Transcendente', extraLife: 50, armorBonus: 10, activeSkills: 2, passiveSkills: 1, critBonus: 15, damageBonus: 5, shieldAmount: 35, color: 'cyan' },
]

export const EQUIPMENT_TYPES = [
  { id: 'peitoral_leve', label: 'Peitoral Leve', slot: 'peitoral', weight: 'leve', armorType: null, caBase: 5, penalty: 0, extraLife: 5, desc: 'Couro fino, tecido reforçado. Leve e ágil.' },
  { id: 'peitoral_comum', label: 'Peitoral Comum', slot: 'peitoral', weight: 'comum', armorType: null, caBase: 10, penalty: 0, extraLife: 10, desc: 'Cota de malha ou couro endurecido. Equilibrado.' },
  { id: 'peitoral_pesado', label: 'Peitoral Pesado', slot: 'peitoral', weight: 'pesado', armorType: null, caBase: 15, penalty: -1, extraLife: 15, desc: 'Placas de metal completo. Proteção máxima.' },
  { id: 'elmo_leve', label: 'Elmo Leve', slot: 'elmo', weight: 'leve', armorType: null, caBase: 3, penalty: 0, extraLife: 3, desc: 'Capacete de couro. Proteção básica craniana.' },
  { id: 'elmo_comum', label: 'Elmo Comum', slot: 'elmo', weight: 'comum', armorType: null, caBase: 5, penalty: 0, extraLife: 5, desc: 'Elmo de metal reforçado. Boa proteção.' },
  { id: 'elmo_pesado', label: 'Elmo Pesado', slot: 'elmo', weight: 'pesado', armorType: null, caBase: 8, penalty: -1, extraLife: 8, desc: 'Elmo completo com viseira. Visão limitada, proteção total.' },
  { id: 'calcas_leve', label: 'Calças Leves', slot: 'calcas', weight: 'leve', armorType: null, caBase: 3, penalty: 0, extraLife: 3, desc: 'Perneiras de couro flexível. Mobilidade total.' },
  { id: 'calcas_comum', label: 'Calças Comuns', slot: 'calcas', weight: 'comum', armorType: null, caBase: 5, penalty: 0, extraLife: 5, desc: 'Grevas de malha. Proteção razoável.' },
  { id: 'calcas_pesado', label: 'Calças Pesadas', slot: 'calcas', weight: 'pesado', armorType: null, caBase: 8, penalty: -1, extraLife: 8, desc: 'Placas articuladas. Máxima proteção nas pernas.' },
  { id: 'botas_leve', label: 'Botas Leves', slot: 'botas', weight: 'leve', armorType: null, caBase: 2, penalty: 0, extraLife: 2, desc: 'Botas de couro. Agilidade e leveza.' },
  { id: 'botas_comum', label: 'Botas Comuns', slot: 'botas', weight: 'comum', armorType: null, caBase: 4, penalty: 0, extraLife: 4, desc: 'Botas reforçadas com placa de metal.' },
  { id: 'botas_pesado', label: 'Botas Pesadas', slot: 'botas', weight: 'pesado', armorType: null, caBase: 6, penalty: -1, extraLife: 6, desc: 'Botas de placa pesada. Máxima proteção nos pés.' },
  { id: 'acessorio', label: 'Acessório', slot: 'acessorio', weight: null, armorType: null, caBase: 0, penalty: 0, extraLife: 0, desc: 'Anéis, amuletos, capas. Concedem passivas especiais.' },
  { id: 'utilidade', label: 'Item de Utilidade', slot: null, weight: null, armorType: null, caBase: 0, penalty: 0, extraLife: 0, desc: 'Escutas, ganchos, tasers, kits. Efeitos situacionais.' },
]

export const EQUIPMENT_LIMITS = [
  { minLevel: 1, maxRank: 'Raro' },
  { minLevel: 8, maxRank: 'Épico' },
  { minLevel: 14, maxRank: 'Heroico' },
  { minLevel: 20, maxRank: 'Ancestral' },
  { minLevel: 26, maxRank: 'Transcendente' },
]

export const SET_BONUSES = ARMOR_TYPES.map(type => ({
  id: type.id,
  name: type.label,
  desc: type.desc,
  bonuses: type.bonuses,
  colorClass: type.colorClass,
  bgClass: type.bgClass,
  borderClass: type.borderClass,
  badgeClass: type.badgeClass,
}))

export const SIMPLE_ITEMS = [
  { id: 'escuta', nome: 'Escuta Eletrônica', desc: 'Microfone direcional com 30m de alcance. Permite ouvir conversas através de paredes finas.', efeito: 'Vantagem em Percepção auditiva', peso: 0.2 },
  { id: 'gancho', nome: 'Gancho de Escalada', desc: 'Gancho de aço com corda de 15m.', efeito: 'Permite escalada sem teste em superfícies adequadas', peso: 1.5 },
  { id: 'taser', nome: 'Taser de Pulso', desc: 'Descarga elétrica de curto alcance (3m).', efeito: 'Ataque: 1d4 + INT mod. Alvo faz teste CON CD 12 ou paralisia 1 turno', peso: 0.3 },
  { id: 'kit_medico', nome: 'Kit Médico Portátil', desc: 'Suprimentos para primeiros socorros de campo.', efeito: 'Restaura 1d8 + INT mod Vida. Usos: 3', peso: 0.5 },
  { id: 'kit_ladroin', nome: 'Kit de Ladrão', desc: 'Gazua, grampo, tensiómetro e alfinetes.', efeito: 'Vantagem em testes de prestidigitação e arrombamento', peso: 0.3 },
  { id: 'lente_noite', nome: 'Lente de Visão Noturna', desc: 'Óculos compactos com amplificação de luz.', efeito: 'Visão no escuro até 30m. Desvantagem em luz forte.', peso: 0.2 },
  { id: 'granada_fumaca', nome: 'Granada de Fumaça', desc: 'Cilindro que libera nuvem densa em 5m de raio.', efeito: 'Área obscurecida por 3 turnos. Vantagem em Furtividade na área.', peso: 0.4 },
  { id: 'corda_aco', nome: 'Corda de Aço (10m)', desc: 'Corda resistente para escalada ou contenção.', efeito: 'Suporta 200kg. Pode ser usada para imobilizar (FOR vs FOR).', peso: 1 },
]

export function getEquipLimitForLevel(nivel) {
  for (let i = EQUIPMENT_LIMITS.length - 1; i >= 0; i--) {
    if (nivel >= EQUIPMENT_LIMITS[i].minLevel) return EQUIPMENT_LIMITS[i]
  }
  return EQUIPMENT_LIMITS[0]
}

export function getEquipRarityIndex(rank) {
  const key = normalizeRank(rank)
  return EQUIPMENT_RARITIES.findIndex(r => normalizeRank(r.rank) === key)
}

export function normalizeRank(rank = '') {
  return String(rank).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function getEquipmentRarity(rank) {
  const key = normalizeRank(rank)
  return EQUIPMENT_RARITIES.find(r => normalizeRank(r.rank) === key) || EQUIPMENT_RARITIES[0]
}

export function canEquipRank(nivel, rank) {
  const limit = getEquipLimitForLevel(nivel)
  const maxIdx = getEquipRarityIndex(limit.maxRank)
  const rankIdx = getEquipRarityIndex(rank)
  return rankIdx >= 0 && rankIdx <= maxIdx
}

export function calcEquipStats(equipamentos) {
  if (!Array.isArray(equipamentos)) return { totalArmor: 0, totalExtraLife: 0, totalCrit: 0, totalDamage: 0, totalShield: 0, totalSpeedPenalty: 0, activeSetBonuses: [] }

  let totalArmor = 0
  let totalExtraLife = 0
  let totalCrit = 0
  let totalDamage = 0
  let totalShield = 0
  let totalSpeedPenalty = 0

  const equipped = equipamentos.filter(e => e.equipado && e.categoria === 'Equipamento')

  for (const eq of equipped) {
    const type = EQUIPMENT_TYPES.find(t => t.id === eq.tipoEquip)
    const rarity = getEquipmentRarity(eq.rank)
    if (!type || !rarity) continue

    totalArmor += (type.caBase || 0) + (rarity.armorBonus || 0)
    totalExtraLife += (type.extraLife || 0) + (rarity.extraLife || 0)
    totalCrit += rarity.critBonus || 0
    totalDamage += rarity.damageBonus || 0
    totalShield += rarity.shieldAmount || 0
    totalSpeedPenalty += type.penalty || 0
  }

  const setCounts = {}
  equipped.forEach(e => {
    if (e.armorType) {
      setCounts[e.armorType] = (setCounts[e.armorType] || 0) + 1
    }
  })

  const activeSetBonuses = []
  for (const at of ARMOR_TYPES) {
    const count = setCounts[at.id] || 0
    if (count >= 2) {
      const applicableBonuses = at.bonuses.filter(b => count >= b.pieces)
      const best = applicableBonuses[applicableBonuses.length - 1]
      if (best) {
        activeSetBonuses.push({ type: at, count, bonus: best })
      }
    }
  }

  return { totalArmor, totalExtraLife, totalCrit, totalDamage, totalShield, totalSpeedPenalty, activeSetBonuses }
}

export function getEquipmentBySlot(equipamentos, slotId) {
  if (!Array.isArray(equipamentos)) return null
  return equipamentos.find(e => {
    if (!e.equipado) return false
    const type = EQUIPMENT_TYPES.find(t => t.id === e.tipoEquip)
    return type?.slot === slotId
  })
}

export function getSkillGrantsForRank(rank) {
  const rarity = getEquipmentRarity(rank)
  if (!rarity) return { activeSkills: 0, passiveSkills: 0 }
  return { activeSkills: rarity.activeSkills, passiveSkills: rarity.passiveSkills }
}

export function getFullSetBonuses(armorTypeId, pieceCount) {
  const armorType = ARMOR_TYPES.find(at => at.id === armorTypeId)
  if (!armorType) return []
  return armorType.bonuses.filter(b => pieceCount >= b.pieces)
}
