const ATTR_CAPS = {
  '5-7': 20, '8-14': 26, '15-22': 32, '23-30': 38, '31-38': 44, '39-50': 55,
}

export const CODEX_ATTR_DIST = {
  balanceada: {
    '5-7':   [16, 14, 12, 11, 10, 8],
    '8-14':  [22, 19, 17, 15, 13, 11],
    '15-22': [28, 25, 22, 19, 16, 13],
    '23-30': [34, 30, 27, 23, 19, 15],
    '31-38': [40, 35, 31, 26, 22, 17],
    '39-50': [46, 41, 36, 30, 25, 20],
  },
  minmax: {
    '5-7':   [20, 15, 12, 10, 8, 6],
    '8-14':  [26, 18, 15, 12, 10, 8],
    '15-22': [32, 22, 18, 15, 12, 9],
    '23-30': [38, 27, 22, 18, 14, 10],
    '31-38': [44, 31, 25, 20, 16, 12],
    '39-50': [50, 36, 29, 23, 18, 14],
  },
  extrema: {
    '5-7':   [20, 12, 10, 8, 6, 4],
    '8-14':  [26, 14, 12, 10, 8, 6],
    '15-22': [32, 18, 14, 12, 10, 7],
    '23-30': [38, 22, 18, 14, 11, 8],
    '31-38': [44, 26, 20, 16, 12, 9],
    '39-50': [50, 32, 25, 20, 15, 11],
  },
}

export const DIST_TYPES = [
  { key: 'balanceada', label: 'Balanceada', desc: 'Distribuição uniforme' },
  { key: 'minmax', label: 'MinMax', desc: 'Forte no principal, fraco no menor' },
  { key: 'extrema', label: 'Extrema', desc: 'Muito forte, muito fraco' },
  { key: 'livre', label: 'Livre', desc: 'Distribua pontos livremente' },
]

export function getAttrCapForLevel(level) {
  if (level <= 7) return ATTR_CAPS['5-7']
  if (level <= 14) return ATTR_CAPS['8-14']
  if (level <= 22) return ATTR_CAPS['15-22']
  if (level <= 30) return ATTR_CAPS['23-30']
  if (level <= 38) return ATTR_CAPS['31-38']
  return ATTR_CAPS['39-50']
}

export function getAttrPoolForLevel(level) {
  const tier = getTierKey(level)
  return CODEX_ATTR_DIST.balanceada[tier].reduce((s, v) => s + v, 0)
}

function getTierKey(level) {
  if (level <= 7) return '5-7'
  if (level <= 14) return '8-14'
  if (level <= 22) return '15-22'
  if (level <= 30) return '23-30'
  if (level <= 38) return '31-38'
  return '39-50'
}
