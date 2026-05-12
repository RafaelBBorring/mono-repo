export const ATTRIBUTES = ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM']

export const ATTR_LABELS = {
  FOR: 'Força',
  DES: 'Destreza',
  CON: 'Constituição',
  INT: 'Inteligência',
  APA: 'Aparência',
  AM: 'Aura Mágica',
}

export const ATTR_ICONS = {
  FOR: '⚔',
  DES: '🏹',
  CON: '🛡',
  INT: '📚',
  APA: '👁',
  AM: '✦',
}

export const MODIFIER_TABLE = [
  { min: 0, max: 1, mod: -5 },
  { min: 2, max: 3, mod: -4 },
  { min: 4, max: 5, mod: -3 },
  { min: 6, max: 7, mod: -2 },
  { min: 8, max: 9, mod: -1 },
  { min: 10, max: 11, mod: 0 },
  { min: 12, max: 13, mod: 1 },
  { min: 14, max: 15, mod: 2 },
  { min: 16, max: 17, mod: 3 },
  { min: 18, max: 19, mod: 4 },
  { min: 20, max: 21, mod: 5 },
  { min: 22, max: 23, mod: 6 },
  { min: 24, max: 25, mod: 7 },
  { min: 26, max: 27, mod: 8 },
  { min: 28, max: 29, mod: 9 },
  { min: 30, max: 31, mod: 10 },
  { min: 32, max: 33, mod: 11 },
  { min: 34, max: 35, mod: 12 },
  { min: 36, max: 37, mod: 13 },
  { min: 38, max: 39, mod: 14 },
  { min: 40, max: 41, mod: 15 },
  { min: 42, max: 43, mod: 16 },
  { min: 44, max: 45, mod: 17 },
  { min: 46, max: 47, mod: 18 },
  { min: 48, max: 99, mod: 19 },
]

export function getModifier(value) {
  return Math.floor((value - 10) / 2)
}

export const ARRAYS = {
  Balanceado: [15, 14, 13, 12, 10, 8],
  MinMax: [20, 15, 13, 12, 10, 8],
}

export function getTierForLevel(level) {
  if (level <= 7) return '1-7'
  if (level <= 13) return '8-13'
  if (level <= 22) return '14-22'
  if (level <= 30) return '23-30'
  if (level <= 40) return '31-40'
  return '41-50'
}

export function getArraysForLevel() {
  return ARRAYS
}

export const ATTR_CAPS = {
  '1-7': 18,
  '8-13': 22,
  '14-22': 26,
  '23-30': 30,
  '31-40': 34,
  '41-50': 38,
}

export function getAttrCap(level) {
  return ATTR_CAPS[getTierForLevel(level)]
}

export const RACE_TYPES = [
  'Humano Aprimorado',
  'Semi-humano',
  'Raça Predatória',
  'Raça Sobrenatural',
  'Raça Lendária',
]
