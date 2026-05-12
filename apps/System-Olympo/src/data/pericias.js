export const PERICIAS = [
  { name: 'Lutar', attrs: ['FOR', 'DES'] },
  { name: 'Pontaria', attrs: ['DES'] },
  { name: 'Bloqueio', attrs: ['FOR', 'CON'] },
  { name: 'Alquimia', attrs: ['INT'] },
  { name: 'Conhecimento', attrs: ['INT'] },
  { name: 'Dirigir', attrs: ['DES', 'INT'] },
  { name: 'Fortitude', attrs: ['CON'] },
  { name: 'Furtividade', attrs: ['DES'] },
  { name: 'Intimidar', attrs: ['FOR', 'APA'] },
  { name: 'Investigação', attrs: ['INT'] },
  { name: 'Pilotar', attrs: ['DES', 'INT'] },
  { name: 'Percepção', attrs: ['DES', 'INT'] },
  { name: 'Persuasão', attrs: ['APA', 'INT'] },
  { name: 'Poder', attrs: ['AM'] },
  { name: 'Reflexo', attrs: ['DES'] },
  { name: 'Contra-Ataque', attrs: ['DES', 'INT'] },
  { name: 'Atletismo', attrs: ['FOR', 'CON'] },
  { name: 'Crime', attrs: ['DES', 'INT'] },
  { name: 'Vontade', attrs: ['CON', 'AM'] },
]

export const GRAUS_BY_TIER = {
  '1-7':   { maxGrau: 1, nome: 'Treinado', bonus: 5 },
  '8-13':  { maxGrau: 2, nome: 'Veterano', bonus: 10 },
  '14-22': { maxGrau: 3, nome: 'Especialista', bonus: 15 },
  '23-30': { maxGrau: 4, nome: 'Mestre', bonus: 20 },
  '31-40': { maxGrau: 5, nome: 'Lendario', bonus: 25 },
  '41-50': { maxGrau: 6, nome: 'Mitico', bonus: 30 },
}

export const GRAU_NAMES = {
  0: 'Não Treinado',
  1: 'Treinado (+5)',
  2: 'Veterano (+10)',
  3: 'Especialista (+15)',
  4: 'Mestre (+20)',
  5: 'Lendario (+25)',
  6: 'Mitico (+30)',
}

export function getMaxGrauForLevel(level) {
  if (level <= 7) return 1
  if (level <= 13) return 2
  if (level <= 22) return 3
  if (level <= 30) return 4
  if (level <= 40) return 5
  return 6
}

export function getGrauBonus(grau) {
  return grau * 5
}

export function getPericiaBonus(pericia, attrs, grau) {
  const bestMod = Math.max(...pericia.attrs.map(a => {
    const val = attrs[a] || 0
    return Math.floor((val - 10) / 2)
  }))
  return bestMod + getGrauBonus(grau)
}
