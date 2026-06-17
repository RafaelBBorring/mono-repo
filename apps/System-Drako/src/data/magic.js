export const MAGIC_TYPES = [
  { key: 'dano', name: 'Dano', energia: 2, note: 'Causa dano. Base 2 (menor) até 12 (celeste).' },
  { key: 'cura', name: 'Cura', energia: 3, note: 'Restaura Vida. Custo 3 por uso.' },
  { key: 'controle', name: 'Controle', energia: 4, note: 'Impõe estado no alvo. Custo 4 por uso.' },
  { key: 'protecao', name: 'Proteção', energia: 3, note: 'Escudo/barreira. Custo 3 por uso.' },
  { key: 'suporte', name: 'Suporte', energia: 2, note: 'Buff/compartilhamento. Custo 2 por uso.' }
]

export const MAGIC_RANGES = [
  { key: 'pessoal', name: 'Pessoal', mult: 1, note: 'Apenas o próprio usuário.' },
  { key: 'toque', name: 'Toque', mult: 1, note: 'Precisa tocar o alvo.' },
  { key: 'curto', name: 'Curto', mult: 1.5, note: 'Alcance curto.' },
  { key: 'medio', name: 'Médio', mult: 2, note: 'Alcance médio.' },
  { key: 'longo', name: 'Longo', mult: 3, note: 'Alcance longo. Custo elevado.' }
]

export function magicCostEstimate({ typeKey = 'dano', tier = 'menor', rangeKey = 'curto', dualType = false }) {
  const baseDamage = { menor: 2, medio: 4, maior: 7, absoluto: 12, celeste: 12 }
  const typeCost = { dano: baseDamage[tier] || 2, cura: 3, controle: 4, protecao: 3, suporte: 2 }[typeKey] ?? 2
  const rangeMult = MAGIC_RANGES.find(r => r.key === rangeKey)?.mult ?? 1
  let cost = Math.round(typeCost * rangeMult)
  if (dualType) cost *= 2
  return Math.max(1, cost)
}
