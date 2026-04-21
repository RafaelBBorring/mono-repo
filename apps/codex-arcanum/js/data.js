// ============================================================
// data.js
// Tabelas de dados do jogo:
//   - PROFILES: estatísticas base por nível para cada perfil
//   - NA_MODS:  modificadores por Nível de Ameaça
//   - ATTR_DIST: distribuições de atributos por faixa de nível
//   - ATTR_NAMES: nomes dos seis atributos
//
// Para alterar valores do jogo, edite apenas este arquivo.
// ============================================================

// ── Perfis de personagem ─────────────────────────────────────
// Cada perfil define:
//   name  → nome exibido na UI
//   dice  → dado de dano principal
//   levels → objeto com estatísticas base por nível-chave
//            (níveis intermediários são interpolados em data.js)
//
// Campos de cada entrada de nível:
//   vida  → [min, max] de pontos de vida
//   arm   → [min, max] de armadura base
//   dano  → string da expressão de dado do dano
//   ba    → bônus de ataque base (inteiro)
//   reac  → reações por turno
//
// NOTA: CA não é mais armazenado aqui.
// CA = 10 + bônus de defesa (onde bd = ba - 3)
// Veja a função calcCA() em main.js.

const PROFILES = {
  // ── Guerreiro (ex-Físico) ── d10 · Alta vida e armadura
  guerreiro: {
    name: 'Guerreiro', dice: 'd10',
    levels: {
      5:  { vida: [180, 220], arm: [12, 16], dano: '2d10+6',   ba: 10, reac: 2 },
      10: { vida: [310, 370], arm: [18, 23], dano: '4d10+12',  ba: 14, reac: 3 },
      15: { vida: [420, 510], arm: [24, 30], dano: '5d10+19',  ba: 17, reac: 4 },
      20: { vida: [450, 550], arm: [29, 36], dano: '6d10+24',  ba: 21, reac: 5 },
      25: { vida: [650,  790], arm: [35, 42], dano: '8d10+30',  ba: 24, reac: 6 },
      30: { vida: [850, 1050], arm: [40, 47], dano: '10d10+35', ba: 28, reac: 7 },
      35: { vida: [1100,1350], arm: [46, 53], dano: '12d10+42', ba: 32, reac: 8 },
      40: { vida: [1400,1700], arm: [52, 60], dano: '15d10+50', ba: 36, reac: 9 }
    }
  },

  // ── Especialista (ex-Balanceado) ── d8 · Versátil e sólido
  especialista: {
    name: 'Especialista', dice: 'd8',
    levels: {
      5:  { vida: [140, 175], arm: [10, 14], dano: '2d8+6',   ba: 10, reac: 3 },
      10: { vida: [240, 300], arm: [16, 21], dano: '4d8+12',  ba: 14, reac: 4 },
      15: { vida: [330, 410], arm: [22, 28], dano: '5d8+19',  ba: 17, reac: 5 },
      20: { vida: [350, 450], arm: [27, 34], dano: '6d8+24',  ba: 21, reac: 6 },
      25: { vida: [520,  650], arm: [33, 40], dano: '8d8+30',  ba: 24, reac: 7 },
      30: { vida: [680,  860], arm: [38, 45], dano: '10d8+35', ba: 28, reac: 8 },
      35: { vida: [880, 1100], arm: [44, 51], dano: '12d8+42', ba: 32, reac: 9 },
      40: { vida: [1100,1400], arm: [50, 58], dano: '15d8+50', ba: 36, reac: 10 }
    }
  },

  // ── Místico (ex-Mágico) ── d6 · Bônus de Poder
  mistico: {
    name: 'Místico', dice: 'd6',
    levels: {
      5:  { vida: [110, 140], arm: [8,  12], dano: '3d6+8',   ba: 10, reac: 2 },
      10: { vida: [190, 240], arm: [14, 19], dano: '5d6+14',  ba: 14, reac: 3 },
      15: { vida: [260, 330], arm: [20, 26], dano: '7d6+21',  ba: 17, reac: 4 },
      20: { vida: [265, 340], arm: [25, 32], dano: '9d6+27',  ba: 21, reac: 4 },
      25: { vida: [410, 530], arm: [31, 38], dano: '11d6+34', ba: 24, reac: 5 },
      30: { vida: [540,  700], arm: [36, 43], dano: '13d6+40', ba: 28, reac: 6 },
      35: { vida: [700,  900], arm: [42, 49], dano: '16d6+48', ba: 32, reac: 7 },
      40: { vida: [900, 1150], arm: [48, 56], dano: '19d6+56', ba: 36, reac: 8 }
    }
  }
};

// ── Modificadores por Nível de Ameaça (NA) ──────────────────
// Cada entrada define os ajustes aplicados SOBRE a base do nível:
//   vida     → percentual de modificação (ex: -50 = -50%)
//   arm      → valor absoluto somado à armadura
//   danoBase → dado extra de dano (string, pode ser vazio)
//   ba       → valor somado ao bônus de ataque
//   reac     → reações adicionadas (mínimo 0 após aplicação)
//   tag      → rótulo exibido na ficha

const NA_MODS = {
  '0.25': { vida: -70, arm: -5, danoBase: '-2d6',  ba: -5, reac: -1, tag: 'Horda'        },
  '0.5':  { vida: -50, arm: -3, danoBase: '-1d6',  ba: -3, reac: -1, tag: 'Grupo'        },
  '1':    { vida:   0, arm:  0, danoBase: '',       ba:  0, reac:  0, tag: '1v1'          },
  '1.5':  { vida:  30, arm:  2, danoBase: '+1d6',  ba:  2, reac:  1, tag: 'vs 1.5 PCs'  },
  '2':    { vida:  60, arm:  4, danoBase: '+1d8',  ba:  4, reac:  1, tag: 'vs 2 PCs'    },
  '3':    { vida:  90, arm:  5, danoBase: '+2d8',  ba:  5, reac:  2, tag: 'vs 3 PCs'    },
  '4':    { vida: 120, arm:  6, danoBase: '+2d10', ba:  6, reac:  2, tag: 'vs 4 PCs'    },
  '6':    { vida: 180, arm:  8, danoBase: '+4d10', ba:  8, reac:  3, tag: 'vs 6 PCs + AL(2)' },
  '8':    { vida: 240, arm: 10, danoBase: '+5d12', ba: 10, reac:  4, tag: 'vs 8 PCs + AL(3)'  },
  '10':   { vida: 300, arm: 12, danoBase: '+6d12', ba: 12, reac:  5, tag: 'vs 10 PCs + AL(4)' },
  '12':   { vida: 360, arm: 14, danoBase: '+9d12', ba: 14, reac:  6, tag: 'vs 12 PCs + AL(5)' },
  '15':   { vida: 450, arm: 16, danoBase: '+11d12',ba: 16, reac:  7, tag: 'vs 15 PCs + AL(6)' },
  '18':   { vida: 540, arm: 18, danoBase: '+13d12',ba: 18, reac:  8, tag: 'vs 18 PCs + AL(7)' },
  '20':   { vida: 600, arm: 20, danoBase: '+15d12',ba: 20, reac:  9, tag: 'vs 20 PCs + AL(8)' }
};

// ── Distribuições de atributos por faixa de nível ───────────
// Cada distribuição contém arrays de 6 valores na ordem:
//   [FOR, DES, CON, INT, SAB, CAR]  (antes do shuffle em main.js)
//
// O shuffle é feito em generateSheet() para variar a ordem
// entre os atributos, mantendo os valores da distribuição escolhida.

const ATTR_DIST = {
  balanceada: {
    '1-7':   [18, 14, 13, 12, 10,  8],
    '8-14':  [20, 18, 16, 14, 12, 10],
    '15-22': [22, 20, 18, 16, 14, 12],
    '23-30': [24, 22, 20, 18, 16, 14],
    '31-40': [26, 24, 22, 20, 18, 16]
  },
  minmax: {
    '1-7':   [20, 15, 13, 12, 10,  8],
    '8-14':  [22, 18, 15, 14, 12,  9],
    '15-22': [24, 20, 18, 15, 13, 10],
    '23-30': [26, 24, 20, 18, 14, 12],
    '31-40': [28, 26, 22, 20, 16, 14]
  },
  // Extrema: só disponível para nível 15+
  extrema: {
    '15-22': [26, 22, 16, 14, 12, 10],
    '23-30': [28, 24, 20, 16, 14, 12],
    '31-40': [30, 26, 22, 18, 16, 14]
  }
};

// Nomes dos seis atributos do sistema (ordem fixa, usada na renderização)
// FOR = Força | DES = Destreza | CON = Constituição
// INT = Inteligência | APA = Aparência | AM = Aura Mágica
const ATTR_NAMES = ['FOR', 'DES', 'CON', 'INT', 'APA', 'AM'];
