export const STARTING_LEVELS = [
  {
    key: 'recruta',
    name: 'Recruta',
    tagline: 'Jovem inexperiente descobrindo quem é.',
    points: 14,
    cap: 3,
    bonus: { vida: 0, energia: 0, pe: 0 },
    max: { vida: 24, energia: 15, pe: 9 }
  },
  {
    key: 'iniciante',
    name: 'Iniciante',
    tagline: 'Já viveu o suficiente para ter escolhas.',
    points: 21,
    cap: 4,
    bonus: { vida: 5, energia: 5, pe: 2 },
    max: { vida: 32, energia: 25, pe: 14 }
  },
  {
    key: 'veterano',
    name: 'Veterano',
    tagline: 'Adulto experiente, marcado pelo que viveu.',
    points: 28,
    cap: 6,
    bonus: { vida: 10, energia: 15, pe: 5 },
    max: { vida: 43, energia: 45, pe: 23 }
  },
  {
    key: 'elite',
    name: 'Elite',
    tagline: 'No topo do que seres comuns conseguem.',
    points: 35,
    cap: 8,
    bonus: { vida: 20, energia: 30, pe: 10 },
    max: { vida: 59, energia: 70, pe: 34 }
  },
  {
    key: 'lenda',
    name: 'Lenda',
    tagline: 'Transcendeu o comum — figura de mito.',
    points: 42,
    cap: 10,
    bonus: { vida: 35, energia: 50, pe: 18 },
    max: { vida: 80, energia: 100, pe: 48 }
  }
]

export const LEVEL_BY_KEY = Object.fromEntries(STARTING_LEVELS.map(l => [l.key, l]))
