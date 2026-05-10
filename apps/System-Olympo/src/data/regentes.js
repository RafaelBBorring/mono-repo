export const REGENTES = [
  {
    id: 'anti-relatividade',
    name: 'Senhor da Anti-Relatividade',
    shortName: 'Anti-Relatividade',
    icon: '🌀',
    color: 'text-sky-300',
    badge: 'bg-sky-400/12 text-sky-300 border-sky-400/25',
    sourceNames: ['Senhor da Anti-Relatividade'],
  },
  {
    id: 'anti-inercia',
    name: 'Senhor da Anti-Inercia',
    shortName: 'Anti-Inercia',
    icon: '⏸',
    color: 'text-purple-300',
    badge: 'bg-purple-400/12 text-purple-300 border-purple-400/25',
    sourceNames: ['Senhor da Anti-Inercia'],
  },
  {
    id: 'biofisica-entropia',
    name: 'Biofisica e Entropia Genetica',
    shortName: 'Biofisica',
    icon: '🧬',
    color: 'text-emerald-300',
    badge: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25',
    sourceNames: ['Biofisica e Entropia Genetica'],
  },
  {
    id: 'anti-termodinamica',
    name: 'Senhor do Anti-Termodinamico',
    shortName: 'Anti-Termodinamica',
    icon: '❄',
    color: 'text-amber-200',
    badge: 'bg-amber-300/12 text-amber-200 border-amber-300/30',
    sourceNames: ['Senhor do Anti-Termodinamico'],
  },
]

export const REGENTE_AFFINITY_TIERS = [
  { minRituals: 5, name: 'Afinidade Menor', peDiscount: 2, effectBonus: '+1 dado em efeitos do regente' },
  { minRituals: 8, name: 'Afinidade Media', peDiscount: 4, effectBonus: '+2 dados em efeitos do regente' },
  { minRituals: 12, name: 'Afinidade Maior', peDiscount: 6, effectBonus: '+3 dados e amplifica duracao em +1 rodada' },
]

export function getRegenteId(ritual) {
  if (!ritual) return null
  if (ritual.regent) return ritual.regent
  const sourceName = ritual.source_name || ''
  for (const r of REGENTES) {
    if (r.sourceNames.some(sn => sourceName.toLowerCase().includes(sn.toLowerCase()))) return r.id
  }
  return null
}

export function getRegenteById(id) {
  return REGENTES.find(r => r.id === id) || null
}

export function getRegenteAffinity(rituals = []) {
  const counts = {}
  for (const ritual of rituals) {
    const regentId = getRegenteId(ritual)
    if (regentId) {
      counts[regentId] = (counts[regentId] || 0) + 1
    }
  }

  const affinities = []
  for (const [regentId, count] of Object.entries(counts)) {
    let bestTier = null
    for (const tier of REGENTE_AFFINITY_TIERS) {
      if (count >= tier.minRituals) bestTier = tier
    }
    if (bestTier) {
      affinities.push({
        regentId,
        regente: getRegenteById(regentId),
        ritualCount: count,
        tier: bestTier,
      })
    }
  }

  return affinities
}

export function getRegenteDiscountForRitual(ritual, rituals = []) {
  const regentId = getRegenteId(ritual)
  if (!regentId) return 0
  const affinities = getRegenteAffinity(rituals)
  const match = affinities.find(a => a.regentId === regentId)
  return match ? match.tier.peDiscount : 0
}
