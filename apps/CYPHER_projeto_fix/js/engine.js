'use strict';
// ═══════════════════════════════════════════════════════════
//  CYPHER ENGINE — Core Game Logic
//  Handles: grid state, component definitions, signal
//  propagation, rotation, placement, win detection.
//
//  DIRECTION CONVENTION (canonical, immutable):
//    N=0  E=1  S=2  W=3
//
//  ROTATION RULE (the only correct way):
//    rotatedSide = (baseSide + rotSteps) % 4
//    This maps: N→E→S→W→N as rotSteps increases.
//    The `rot` field on a cell is always 0-3.
//    `openSides(cell)` always returns the ABSOLUTE directions
//    that are open given the current rotation — this is what
//    the propagation BFS and the renderer both use.
//    There is no "visual transform" trick; arms are redrawn
//    at their correct absolute positions after every rotation.
// ═══════════════════════════════════════════════════════════

const DIR = { N: 0, E: 1, S: 2, W: 3 };
const OPP = [2, 3, 0, 1];           // opposite[N]=S, opposite[E]=W …
const DELTA_RC = [                   // [dRow, dCol] for each direction
  [-1,  0],  // N
  [ 0,  1],  // E
  [ 1,  0],  // S
  [ 0, -1],  // W
];

// ── COMPONENT DEFINITIONS ─────────────────────────────────
// `sides` = base open directions at rot=0.
// All rotations are derived by (side + rot) % 4.
const COMPONENTS = {
  straight: {
    name:  'Cabo Reto',
    desc:  'Conecta dois lados opostos. Girar 90° muda N↔S para L↔O.',
    sides: [0, 2],         // N, S
    color: '#00c8f0',
  },
  curve: {
    name:  'Curva 90°',
    desc:  'Dobra o sinal em ângulo reto entre dois lados adjacentes.',
    sides: [0, 1],         // N, E
    color: '#00c8f0',
  },
  tee: {
    name:  'Bifurcador T',
    desc:  'Divide o sinal em dois caminhos a partir de uma entrada.',
    sides: [0, 1, 3],      // N, E, W
    color: '#00e896',
  },
  cross: {
    name:  'Hub Central',
    desc:  'Distribui sinal para todos os 4 lados simultaneamente.',
    sides: [0, 1, 2, 3],   // N, E, S, W
    color: '#f0c030',
  },
  bridge: {
    name:  'Ponte',
    desc:  'Dois caminhos cruzados independentes — visual distinto do Hub.',
    sides: [0, 1, 2, 3],   // N, E, S, W (same logic, distinct icon)
    color: '#f06830',
  },
  deadend: {
    name:  'Terminal',
    desc:  'Abre apenas um lado. Encerra ramos com elegância.',
    sides: [0],            // N only
    color: '#9060f0',
  },
  amp: {
    name:  'Amplificador',
    desc:  'Cabo reto com boost de sinal. Essencial em rotas longas.',
    sides: [0, 2],         // N, S  (same logic as straight, distinct icon)
    color: '#f06830',
  },
};

// ── DIFFICULTY CONFIGS ────────────────────────────────────
const CONFIGS = {
  easy: {
    label:  'FÁCIL',
    cols:   4,
    rows:   4,
    types:  ['straight', 'curve', 'tee'],
    inv:    { straight: 5, curve: 4, tee: 2 },
    target: 5,
    locked: 1,
  },
  medium: {
    label:  'MÉDIO',
    cols:   5,
    rows:   5,
    types:  ['straight', 'curve', 'tee', 'cross', 'bridge'],
    inv:    { straight: 5, curve: 5, tee: 3, cross: 2, bridge: 2 },
    target: 9,
    locked: 3,
  },
  hard: {
    label:  'DIFÍCIL',
    cols:   6,
    rows:   6,
    types:  ['straight', 'curve', 'tee', 'cross', 'bridge', 'deadend', 'amp'],
    inv:    { straight: 4, curve: 6, tee: 4, cross: 2, bridge: 3, deadend: 2, amp: 2 },
    target: 14,
    locked: 5,
  },
};

const HINTS = {
  easy:   [
    'Selecione um cabo e clique numa célula vazia.',
    'Clique DIREITO para girar 90°.',
    'O sinal passa apenas onde AMBOS os lados adjacentes estão abertos.',
  ],
  medium: [
    'O Bifurcador T cria dois caminhos a partir de um ponto.',
    'Hub e Ponte aceitam sinal de todos os 4 lados.',
    'Planeje o trajeto antes de colocar peças.',
  ],
  hard: [
    'O Terminal encerra ramificações sem desperdiçar espaço.',
    'O Amplificador tem o mesmo efeito que o Cabo Reto.',
    'Revise o caminho inteiro quando ficar travado.',
  ],
};

// ── PURE HELPERS ──────────────────────────────────────────

/** Given a component type and rotation (0-3), return the absolute open directions. */
function openSides(type, rot) {
  const base = COMPONENTS[type].sides;
  return base.map(d => (d + rot) & 3);
}

/** Return whether a cell is open toward `dir`. */
function cellIsOpen(cell, dir) {
  if (!cell) return false;
  if (cell.isSrc || cell.isTgt) return true;  // source/target open on all sides
  if (!cell.type) return false;
  return openSides(cell.type, cell.rot).includes(dir);
}

/** Shuffle array in-place (Fisher-Yates). Returns array. */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── GRID ACCESSORS ────────────────────────────────────────

function cellAt(grid, cols, rows, c, r) {
  if (c < 0 || c >= cols || r < 0 || r >= rows) return null;
  return grid[r * cols + c];
}

function neighbour(c, r, dir) {
  const [dr, dc] = DELTA_RC[dir];
  return { c: c + dc, r: r + dr };
}

// ── PUZZLE GENERATION ─────────────────────────────────────

function generatePuzzle(diff) {
  const cfg = CONFIGS[diff];
  const { cols, rows } = cfg;

  // Initialise flat grid
  const grid = Array.from({ length: cols * rows }, (_, i) => ({
    c: i % cols,
    r: Math.floor(i / cols),
    type:   null,
    rot:    0,       // 0-3; always the TRUE logical rotation
    locked: false,
    powered: false,
    isSrc:  false,
    isTgt:  false,
  }));

  const getCell = (c, r) => cellAt(grid, cols, rows, c, r);

  // Fixed source (left middle) and target (right middle)
  const sc = 0,        sr = Math.floor(rows / 2);
  const tc = cols - 1, tr = Math.floor(rows / 2);
  getCell(sc, sr).isSrc = true;
  getCell(tc, tr).isTgt = true;

  // Build a random path from source to target
  const path = buildPath(cols, rows, sc, sr, tc, tr);

  // Assign component type + rotation to each path cell
  annotatePath(path, cfg.types);

  // Lock some interior path cells as pre-installed hints
  const interior = path.slice(1, -1);
  shuffle(interior)
    .slice(0, Math.min(cfg.locked, interior.length))
    .forEach(p => {
      const ce = getCell(p.c, p.r);
      ce.type   = p.ct;
      ce.rot    = p.cr;
      ce.locked = true;
    });

  return { grid, cols, rows, src: { c: sc, r: sr }, tgt: { c: tc, r: tr }, cfg };
}

function buildPath(cols, rows, sc, sr, tc, tr) {
  const path = [{ c: sc, r: sr }];
  const vis  = new Set([`${sc},${sr}`]);
  let cur    = { c: sc, r: sr };

  for (let iter = 0; iter < 1000; iter++) {
    if (cur.c === tc && cur.r === tr) break;

    const candidates = [];
    for (let d = 0; d < 4; d++) {
      const nb = neighbour(cur.c, cur.r, d);
      if (nb.c < 0 || nb.c >= cols || nb.r < 0 || nb.r >= rows) continue;
      if (vis.has(`${nb.c},${nb.r}`)) continue;
      candidates.push({ ...nb, fromDir: d, dist: Math.abs(nb.c - tc) + Math.abs(nb.r - tr) });
    }

    if (!candidates.length) {
      if (path.length <= 1) break;
      const back = path.pop();
      vis.delete(`${back.c},${back.r}`);
      cur = path[path.length - 1];
      continue;
    }

    candidates.sort((a, b) => a.dist - b.dist);
    const pick = Math.random() < 0.75
      ? candidates[0]
      : candidates[Math.min(1, candidates.length - 1)];

    vis.add(`${pick.c},${pick.r}`);
    path.push(pick);
    cur = pick;
  }

  return path;
}

function annotatePath(path, allowedTypes) {
  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    // The direction we entered this cell from (what side must be open to receive)
    const inDir  = (i === 0)              ? null : OPP[path[i].fromDir];
    // The direction we leave toward (what side must be open to send)
    const outDir = (i === path.length - 1) ? null : path[i + 1].fromDir;

    const needed = [inDir, outDir].filter(d => d !== null);
    const { type, rot } = pickComponent(needed, allowedTypes);
    p.ct = type;
    p.cr = rot;
  }
}

function pickComponent(needed, allowedTypes) {
  // Try each allowed type × each rotation and return first match
  for (const type of shuffle([...allowedTypes])) {
    for (let rot = 0; rot < 4; rot++) {
      const open = openSides(type, rot);
      if (needed.every(d => open.includes(d))) {
        return { type, rot };
      }
    }
  }
  // Ultimate fallback: cross opens everything
  return { type: 'cross', rot: 0 };
}

// ── SIGNAL PROPAGATION ────────────────────────────────────
// BFS from source. Two adjacent cells connect iff BOTH have
// the shared side open. This is the canonical check — it runs
// after every state change and drives all visual updates.

function propagate(state) {
  const { grid, cols, rows, src } = state;
  const getCell = (c, r) => cellAt(grid, cols, rows, c, r);

  // Reset powered flags
  grid.forEach(ce => { ce.powered = false; });

  if (!src) return { reached: false, powered: 0, total: 0 };

  const srcCell = getCell(src.c, src.r);
  if (!srcCell) return { reached: false, powered: 0, total: 0 };

  srcCell.powered = true;
  const queue = [{ c: src.c, r: src.r }];
  const vis   = new Set([`${src.c},${src.r}`]);
  let reached = false;

  while (queue.length) {
    const { c, r } = queue.shift();
    const ce = getCell(c, r);

    for (let d = 0; d < 4; d++) {
      if (!cellIsOpen(ce, d)) continue;           // this cell is closed here

      const nb  = neighbour(c, r, d);
      const nce = getCell(nb.c, nb.r);
      if (!nce) continue;
      if (vis.has(`${nb.c},${nb.r}`)) continue;
      if (!cellIsOpen(nce, OPP[d])) continue;     // neighbour is closed on its side

      vis.add(`${nb.c},${nb.r}`);
      nce.powered = true;
      if (nce.isTgt) reached = true;
      queue.push({ c: nb.c, r: nb.r });
    }
  }

  const total   = grid.filter(ce => ce.type || ce.isSrc || ce.isTgt).length;
  const powered = grid.filter(ce => ce.powered).length;
  return { reached, powered, total };
}

// ── EXPORTS ───────────────────────────────────────────────
// Exposed as globals (no bundler needed for single-page use)
window.CypherEngine = {
  DIR, OPP, DELTA_RC,
  COMPONENTS, CONFIGS, HINTS,
  openSides, cellIsOpen, shuffle,
  cellAt, neighbour,
  generatePuzzle, propagate,
};
