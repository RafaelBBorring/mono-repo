export const ABSORPTION_TABLE = [
  { min: 1, max: 2, absorb: 0 },
  { min: 3, max: 4, absorb: 2 },
  { min: 5, max: 6, absorb: 4 },
  { min: 7, max: 8, absorb: 6 },
  { min: 9, max: 10, absorb: 8 }
]

export function absorption(forca) {
  const row = ABSORPTION_TABLE.find(r => forca >= r.min && forca <= r.max)
  return row ? row.absorb : 0
}

export const COMBINED_EXAMPLES = [
  { name: 'Lutar com precisão', a: 'for', b: 'agi' },
  { name: 'Rastrear alguém', a: 'per', b: 'int' },
  { name: 'Mentir sob pressão', a: 'pre', b: 'von' },
  { name: 'Operar equipamento danificado', a: 'int', b: 'agi' },
  { name: 'Liderar sob fogo', a: 'pre', b: 'von' },
  { name: 'Resistir a tortura', a: 'for', b: 'von' },
  { name: 'Ler intenções', a: 'per', b: 'int' },
  { name: 'Intimidar fisicamente', a: 'for', b: 'pre' }
]

export const RECOVERY = {
  vida: 'Só por intervenção externa. Cuidado médico rola INT+PER (ação combinada), 1x por cena de descanso: cada sucesso cura +2 Vida. Magia de cura cura conforme o poder.',
  energia: {
    longo: 'AM × 2',
    curto: 'AM (apenas o valor)'
  },
  pe: {
    longo: 'Total',
    curto: 'VON'
  }
}

export const DEATH_RULES = {
  critico: 'Vida 0 = fora de combate, inconsciente/incapaz, não necessariamente morto.',
  porRodada: 'Cada rodada sem intervenção o Narrador rola 1d6: 1-2 piora (risco real de morte); 3+ mantém estável por mais uma rodada.',
  salvamento: 'Cuidado médico ou magia de cura tira do risco imediato e recupera 1 Vida (vivo, não combatente).',
  morte: 'Morre se: piorar 3x seguidas sem intervenção; dano massivo que ultrapassa a Vida máxima em uma única fonte; ou o grupo decider narrativamente.'
}
