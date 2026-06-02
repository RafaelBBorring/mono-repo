export const GRIMORIO_TIERS = [
  { id: 'iniciante', name: 'Grimório de Iniciante', complexity: 1, minCircle: 1, maxCircle: 2, maxRituals: 6 },
  { id: 'avancado', name: 'Grimório Avançado', complexity: 2, minCircle: 1, maxCircle: 3, maxRituals: 10 },
  { id: 'mestre', name: 'Grimório de Mestre', complexity: 3, minCircle: 1, maxCircle: 4, maxRituals: 14 },
]

export const GRIMORIO_TYPES = ['alchemy', 'spells', 'runes', 'magic']

export const GRIMORIO_TYPE_LABELS = {
  alchemy: 'Alquimia',
  spells: 'Feitiços',
  runes: 'Runas',
  magic: 'Magias',
}

export const GRIMORIO_TYPE_ICONS = {
  alchemy: '⚗',
  spells: '✨',
  runes: '💎',
  magic: '🔥',
}

export const GRIMORIO_DEFAULT_IMAGES = {
  alchemy: '',
  spells: '',
  runes: '',
  magic: '',
}

export const MIN_LEVEL_FOR_CIRCLE = { 1: 1, 2: 5, 3: 11, 4: 18, 5: 22, 6: 25, 7: 27, 8: 28, 9: 29 }
