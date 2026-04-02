'use strict';
// ═══════════════════════════════════════════════════════════
//  CYPHER UI CONTROLLER
//  Wires DOM events → engine actions → renderer updates.
//  Manages: game lifecycle, inventory, timer, win screen,
//  tutorial, toasts, status panel.
// ═══════════════════════════════════════════════════════════

// ── GAME STATE ────────────────────────────────────────────
const G = {
  diff:    'easy',
  state:   null,     // { grid, cols, rows, src, tgt, cfg }
  inv:     {},       // { type: count }
  sel:     null,     // currently selected component type
  moves:   0,
  score:   0,
  solved:  false,
  elapsed: 0,
  tick:    null,
  hintIdx: 0,
};

// ── INIT ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  trackMouse();
  showOverlay('menu');
});

// ── GAME LIFECYCLE ────────────────────────────────────────

function startGame(diff) {
  const { CONFIGS, HINTS, generatePuzzle, propagate } = window.CypherEngine;
  const { renderGrid, fullRefresh } = window.CypherRenderer;

  G.diff    = diff;
  G.inv     = { ...CONFIGS[diff].inv };
  G.moves   = 0;
  G.score   = 0;
  G.solved  = false;
  G.elapsed = 0;
  G.hintIdx = 0;
  G.sel     = null;

  G.state = generatePuzzle(diff);

  hideAllOverlays();

  // Badge
  const badge = document.getElementById('diff-badge');
  badge.textContent  = CONFIGS[diff].label;
  badge.className    = 'badge ' + { easy: 'be', medium: 'bm', hard: 'bh' }[diff];

  // Status reset
  set('diag-firewall',  { text: 'BYPASS',   color: 'var(--gn)' });
  set('diag-encrypt',   { text: 'ATIVA',    color: 'var(--yl)' });
  set('diag-tracker',   { text: 'ONLINE',   color: 'var(--rd)' });
  set('diag-root',      { text: 'NEGADO',   color: 'var(--t2)' });
  document.getElementById('timer').classList.remove('urgent');
  document.getElementById('hint-text').textContent = HINTS[diff][0];
  document.getElementById('signal-target').textContent = CONFIGS[diff].target;

  // Timer
  clearInterval(G.tick);
  updateTimer();
  G.tick = setInterval(() => {
    G.elapsed++;
    updateTimer();
    if (G.elapsed > 90) document.getElementById('timer').classList.add('urgent');
  }, 1000);

  // Render
  const container = document.getElementById('cell-container');
  const svgLayer  = document.getElementById('conn-svg');
  renderGrid(container, svgLayer, G.state);
  attachCellEvents();

  const res = fullRefresh(container, svgLayer, G.state);
  updateStatusUI(res);
  updateComponentList();
  updateSelectionInfo();

  toast('Missão iniciada — ' + CONFIGS[diff].label, 'c');
}

function resetPuzzle() {
  if (G.diff) startGame(G.diff);
}

function showMenu() {
  clearInterval(G.tick);
  showOverlay('menu');
}

// ── CELL INTERACTION ─────────────────────────────────────

function attachCellEvents() {
  const container = document.getElementById('cell-container');
  const { cols, rows } = G.state;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const el = document.getElementById(`ox-${c}-${r}`);
      if (!el) continue;
      // Capture c,r in closure
      const _c = c, _r = r;
      el.addEventListener('click',       e => { e.preventDefault(); if (e.shiftKey) onRemove(_c, _r); else onPlace(_c, _r); });
      el.addEventListener('contextmenu', e => { e.preventDefault(); onRotate(_c, _r); });
    }
  }
}

function onPlace(c, r) {
  if (G.solved) return;
  const { cellAt } = window.CypherEngine;
  const ce = cellAt(G.state.grid, G.state.cols, G.state.rows, c, r);
  if (!ce) return;

  if (ce.isSrc || ce.isTgt) { toast('Célula fixa — não pode ser alterada.', 'y'); return; }
  if (ce.locked)             { toast('Componente pré-instalado — bloqueado.', 'y'); return; }
  if (!G.sel)                { toast('Selecione um componente no painel esquerdo!', 'y'); return; }
  if ((G.inv[G.sel] || 0) <= 0) { toast('Sem estoque!', 'r'); return; }
  if (ce.type === G.sel)     { toast('Já instalado. Clique DIREITO para girar!', 'c'); return; }

  // Return old component to inventory
  if (ce.type && ce.type !== G.sel) {
    G.inv[ce.type] = (G.inv[ce.type] || 0) + 1;
  }

  G.inv[G.sel]--;
  ce.type = G.sel;
  ce.rot  = 0;      // logical rotation reset on fresh placement
  G.moves++;
  flashEl('stat-moves');

  const res = doRefresh();
  updateComponentList();
  checkWin(res);
  toast(window.CypherEngine.COMPONENTS[G.sel].name + ' instalado', 'g');
}

function onRotate(c, r) {
  if (G.solved) return;
  const { cellAt } = window.CypherEngine;
  const { animateRotation, fullRefresh } = window.CypherRenderer;
  const ce = cellAt(G.state.grid, G.state.cols, G.state.rows, c, r);
  if (!ce) return;

  if (ce.isSrc || ce.isTgt) return;
  if (!ce.type)  { toast('Nenhum componente para girar aqui.', 'y'); return; }
  if (ce.locked) { toast('Componente pré-instalado — não pode ser girado.', 'y'); return; }

  G.moves++;
  flashEl('stat-moves');

  const container = document.getElementById('cell-container');
  const svgLayer  = document.getElementById('conn-svg');

  // animateRotation commits ce.rot++ inside its .finished callback,
  // then calls onDone which runs the full refresh.
  animateRotation(c, r, G.state, container, svgLayer, () => {
    const res = fullRefresh(container, svgLayer, G.state);
    updateStatusUI(res);
    checkWin(res);
  });
}

function onRemove(c, r) {
  if (G.solved) return;
  const { cellAt } = window.CypherEngine;
  const ce = cellAt(G.state.grid, G.state.cols, G.state.rows, c, r);
  if (!ce || ce.isSrc || ce.isTgt || !ce.type) return;
  if (ce.locked) { toast('Não pode remover componente pré-instalado!', 'r'); return; }

  G.inv[ce.type] = (G.inv[ce.type] || 0) + 1;
  ce.type = null;
  ce.rot  = 0;
  G.moves++;

  doRefresh();
  updateComponentList();
  toast('Componente removido', 'c');
}

// ── REFRESH HELPER ────────────────────────────────────────

function doRefresh() {
  const { fullRefresh } = window.CypherRenderer;
  const container = document.getElementById('cell-container');
  const svgLayer  = document.getElementById('conn-svg');
  const res = fullRefresh(container, svgLayer, G.state);
  updateStatusUI(res);
  return res;
}

// ── WIN ───────────────────────────────────────────────────

function checkWin(res) {
  if (!res?.reached) return;
  if (res.powered < (G.state.cfg.target || 9999)) return;
  G.solved = true;
  clearInterval(G.tick);
  setTimeout(() => {
    window.CypherRenderer.spawnBurst(innerWidth / 2, innerHeight / 2);
    showWinScreen();
  }, 420);
}

function showWinScreen() {
  document.getElementById('win-time').textContent  = fmtTime(G.elapsed);
  document.getElementById('win-moves').textContent = G.moves;
  document.getElementById('win-diff').textContent  = window.CypherEngine.CONFIGS[G.diff].label;
  showOverlay('win');
  toast('SISTEMA INVADIDO — ROOT ACCESS!', 'g');
}

// ── STATUS UI ─────────────────────────────────────────────

function updateStatusUI(res) {
  const { reached, powered, total } = res || { reached: false, powered: 0, total: 0 };
  const target = G.state?.cfg?.target || 1;

  txt('stat-signal',  powered);
  txt('stat-nodes',   powered);
  txt('stat-moves',   G.moves);

  G.score = Math.max(0, 1000 - G.moves * 8 + powered * 4);
  txt('stat-score', G.score);

  document.getElementById('signal-current').textContent = powered;
  document.getElementById('signal-current').classList.toggle('ok', reached);

  const nodePct   = total > 0 ? Math.min((powered / total)  * 100, 100) : 0;
  const signalPct = Math.min((powered / target) * 100, 100);

  document.getElementById('prog-nodes').style.width  = nodePct   + '%';
  document.getElementById('prog-signal').style.width = signalPct + '%';
  document.getElementById('diag-nodes').textContent  = `${powered}/${total}`;
  document.getElementById('diag-signal').textContent = Math.round(signalPct) + '%';

  if (reached) {
    set('diag-encrypt', { text: 'QUEBRADA',  color: 'var(--gn)' });
    set('diag-root',    { text: 'CONCEDIDO', color: 'var(--gn)' });
  }

  // Rotate hint every 4 moves
  if (G.moves > 0 && G.moves % 4 === 0 && G.state?.cfg) {
    const hints = window.CypherEngine.HINTS[G.diff];
    G.hintIdx = (G.hintIdx + 1) % hints.length;
    document.getElementById('hint-text').textContent = hints[G.hintIdx];
  }
}

function updateTimer() {
  document.getElementById('timer').textContent = fmtTime(G.elapsed);
}

// ── COMPONENT LIST ────────────────────────────────────────

function updateComponentList() {
  const { COMPONENTS, CONFIGS } = window.CypherEngine;
  const { buildComponentIcon } = window.CypherRenderer;
  const list = document.getElementById('comp-list');
  list.innerHTML = '';

  (G.state?.cfg?.types || CONFIGS[G.diff].types).forEach(type => {
    const def = COMPONENTS[type];
    const cnt = G.inv[type] || 0;
    const card = document.createElement('div');
    card.className = 'comp-card' + (G.sel === type ? ' sel' : '') + (cnt <= 0 ? ' empty' : '');

    card.addEventListener('click', () => {
      if (cnt <= 0) { toast('Sem estoque!', 'r'); return; }
      G.sel = (G.sel === type) ? null : type;
      updateComponentList();
      updateSelectionInfo();
    });

    card.innerHTML = `
      <div class="comp-icon">${buildComponentIcon(type)}</div>
      <div class="comp-info">
        <div class="comp-name">${def.name}</div>
        <div class="comp-desc">${def.desc}</div>
      </div>
      <div class="comp-count">${cnt}</div>`;

    list.appendChild(card);
  });
}

function updateSelectionInfo() {
  const { COMPONENTS } = window.CypherEngine;
  const el = document.getElementById('sel-info');
  if (!G.sel) {
    el.textContent = 'Nenhum. Escolha à esquerda.';
    return;
  }
  const def = COMPONENTS[G.sel];
  el.innerHTML = `<strong style="color:var(--ac)">${def.name}</strong><br>${def.desc}<br>
    <span style="color:var(--gn)">Estoque: ${G.inv[G.sel] || 0}</span>`;
}

// ── TUTORIAL ─────────────────────────────────────────────

const TUTORIAL_STEPS = [
  {
    title: 'O que é o CYPHER?',
    text:  `Você é um <strong>hacker</strong> infiltrado em uma rede corporativa protegida.<br><br>
O tabuleiro é uma <em>grade de octógonos</em>. Seu objetivo é criar um caminho de sinal contínuo da
<strong>FONTE</strong> (octógono azul ⚡) até o <strong>ALVO</strong> (octógono amarelo ⊕),
colocando e girando componentes de cabo.<br><br>
Você tem estoque limitado de peças. Planeje o trajeto antes de colocar tudo.`,
    tip:  'Não há penalidade de tempo. Reset à vontade, sem consequências.',
    vis:  'overview',
  },
  {
    title: 'A regra fundamental do sinal',
    text:  `Cada octógono tem <strong>4 lados</strong>: Norte, Leste, Sul e Oeste.<br><br>
Cada componente tem <strong>portas abertas</strong> em alguns desses lados. O sinal flui entre dois
octógonos vizinhos <em>somente se ambos têm uma porta voltada um para o outro</em>.<br><br>
<strong>Lado A aberto + Lado B aberto → sinal flui ✓</strong><br>
<strong>Lado A aberto + Lado B fechado → bloqueado ✗</strong><br><br>
Essa é a única regra do jogo. Tudo deriva dela.`,
    tip:  'A FONTE e o ALVO aceitam sinal de qualquer lado. Só as peças intermediárias precisam ser alinhadas.',
    vis:  'flow',
  },
  {
    title: 'Os 7 tipos de componente',
    text:  `<strong>Cabo Reto</strong> — abre Norte e Sul (2 lados opostos)<br>
<strong>Curva 90°</strong> — abre Norte e Leste (2 lados adjacentes)<br>
<strong>Bifurcador T</strong> — abre Norte, Leste e Oeste (3 lados)<br>
<strong>Hub Central</strong> — abre todos os 4 lados<br>
<strong>Ponte</strong> — abre todos os 4 lados (caminhos cruzados)<br>
<strong>Terminal</strong> — abre apenas Norte (1 lado — encerra ramos)<br>
<strong>Amplificador</strong> — igual ao Cabo Reto com boost visual`,
    tip:  'Hub e Ponte têm os mesmos 4 lados abertos. A Ponte mostra visualmente que dois caminhos se cruzam.',
    vis:  'comps',
  },
  {
    title: 'Girando os componentes',
    text:  `Cada peça pode ser <strong>girada em passos de 90°</strong> com clique direito.<br><br>
Girar desloca todas as portas abertas +90° no sentido horário:<br>
— Cabo Reto (N↔S) girado 1× vira Leste↔Oeste<br>
— Curva (N↔L) girada 1× vira L↔S, depois S↔O, depois O↔N<br><br>
O sinal é recalculado automaticamente após cada giro.`,
    tip:  '4 cliques direitos = volta à posição original (360°). Não existe "girar demais".',
    vis:  'rotation',
  },
  {
    title: 'Peças pré-instaladas',
    text:  `Alguns octógonos já chegam com componentes instalados — borda laranja + símbolo <strong>⚿</strong>.<br><br>
Essas peças <em>não podem ser removidas nem giradas</em>. Elas fazem parte da solução e servem como
âncoras para o caminho correto.<br><br>
Identifique as peças bloqueadas, veja para que lados as portas delas apontam, e construa o trajeto
a partir dessas âncoras.`,
    tip:  'Se uma peça bloqueada tem portas Norte e Sul abertas, o caminho entra por um lado e sai pelo outro.',
    vis:  'locked',
  },
  {
    title: 'Condição de vitória',
    text:  `O marcador <strong>Sinal Atual</strong> conta quantos octógonos estão energizados.<br><br>
O marcador <strong>Meta</strong> mostra o mínimo necessário para vencer.<br><br>
Para ganhar: <em>o ALVO deve estar na cadeia de sinal</em> E <em>nós energizados ≥ meta</em>.<br><br>
Linhas verdes = sinal fluindo. Linhas azuis pulsantes = conectado mas aguardando.`,
    tip:  'Comece pelo caminho mais curto FONTE → ALVO. Ajuste peça a peça até ver tudo verde.',
    vis:  'win',
  },
];

let tutStep = 0;

function startTutorial() {
  tutStep = 0;
  showOverlay('tutorial');
  renderTutorialStep();
}

function tutNav(delta) {
  tutStep = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, tutStep + delta));
  renderTutorialStep();
}

function renderTutorialStep() {
  const s     = TUTORIAL_STEPS[tutStep];
  const total = TUTORIAL_STEPS.length;

  document.getElementById('tut-counter').textContent = `Passo ${tutStep + 1} de ${total}`;

  const prev = document.getElementById('tut-prev');
  const next = document.getElementById('tut-next');
  prev.style.opacity       = tutStep === 0 ? '0.3' : '1';
  prev.style.pointerEvents = tutStep === 0 ? 'none' : 'auto';

  if (tutStep === total - 1) {
    next.textContent = '✓ IR AO MENU';
    next.onclick     = () => { showOverlay('menu'); };
    next.className   = 'btn bg';
  } else {
    next.textContent = 'PRÓXIMO →';
    next.onclick     = () => tutNav(1);
    next.className   = 'btn bc';
  }

  // Dots
  const dotsEl = document.getElementById('tut-dots');
  dotsEl.innerHTML = '';
  for (let i = 0; i < total; i++) {
    const d = document.createElement('div');
    d.className = 'tut-dot' + (i === tutStep ? ' ac' : i < tutStep ? ' dn' : '');
    dotsEl.appendChild(d);
  }

  // Content
  document.getElementById('tut-title').textContent = s.title;
  document.getElementById('tut-body').innerHTML    = s.text;
  document.getElementById('tut-tip').textContent   = '⚡ ' + s.tip;

  // Visual
  const visEl = document.getElementById('tut-vis');
  visEl.innerHTML = '';
  visEl.appendChild(buildTutVisual(s.vis));
}

// ── TUTORIAL VISUALS ─────────────────────────────────────

function buildTutVisual(type) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;';

  const R  = 34;
  const cr = R * 0.32;
  function oct(cx, cy, fill, stroke) {
    const pts = [
      [cx-R+cr, cy-R], [cx+R-cr, cy-R],
      [cx+R,    cy-R+cr], [cx+R,    cy+R-cr],
      [cx+R-cr, cy+R],    [cx-R+cr, cy+R],
      [cx-R,    cy+R-cr], [cx-R,    cy-R+cr],
    ].map(p => p.join(',')).join(' ');
    return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  }
  const srcIcon = () => `<circle r="13" fill="none" stroke="#00c8f0" stroke-width="1.2"/>
    <path d="M-3,-9L-6,2L0,2L-3,9L6,-1L0,-1Z" fill="#00c8f0"/>`;
  const tgtIcon = () => `<circle r="13" fill="none" stroke="#f0c030" stroke-width="1.2"/>
    <circle r="4.5" fill="#f0c030"/>
    <line x1="0" y1="-13" x2="0" y2="-7" stroke="#f0c030" stroke-width="1.5"/>
    <line x1="0" y1="7" x2="0" y2="13" stroke="#f0c030" stroke-width="1.5"/>
    <line x1="-13" y1="0" x2="-7" y2="0" stroke="#f0c030" stroke-width="1.5"/>
    <line x1="7" y1="0" x2="13" y2="0" stroke="#f0c030" stroke-width="1.5"/>`;
  const strNS  = c => `<line x1="0" y1="0" x2="0" y2="-28" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
    <circle cy="-28" r="4" fill="${c}"/>
    <line x1="0" y1="0" x2="0" y2="28" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
    <circle cy="28" r="4" fill="${c}"/><circle r="5" fill="${c}"/>`;
  const strEW  = c => `<line x1="0" y1="0" x2="-28" y2="0" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="-28" r="4" fill="${c}"/>
    <line x1="0" y1="0" x2="28" y2="0" stroke="${c}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="28" r="4" fill="${c}"/><circle r="5" fill="${c}"/>`;

  if (type === 'overview') {
    wrap.innerHTML = `<svg width="360" height="170" viewBox="0 0 360 170" style="font-family:Share Tech Mono,monospace;">
      ${oct(60,80,'rgba(0,200,240,.12)','#00c8f0')}<g transform="translate(60,80)">${srcIcon()}</g>
      ${oct(180,80,'rgba(0,80,120,.1)','#152030')}<g transform="translate(180,80)">${strEW('#00c8f0')}</g>
      ${oct(300,80,'rgba(240,192,48,.12)','#f0c030')}<g transform="translate(300,80)">${tgtIcon()}</g>
      <line x1="94" y1="80" x2="146" y2="80" stroke="#00c8f0" stroke-width="2" stroke-dasharray="5,3"/>
      <line x1="214" y1="80" x2="266" y2="80" stroke="#00e896" stroke-width="2.5"/>
      <text x="60"  y="134" text-anchor="middle" font-size="8" fill="#2a5870" letter-spacing="2">FONTE</text>
      <text x="180" y="134" text-anchor="middle" font-size="8" fill="#2a5870" letter-spacing="2">CABO</text>
      <text x="300" y="134" text-anchor="middle" font-size="8" fill="#2a5870" letter-spacing="2">ALVO</text>
      <text x="180" y="22" text-anchor="middle" font-size="10" fill="#6aacbf">FONTE → cabos alinhados → ALVO</text>
    </svg>`;
  } else if (type === 'flow') {
    wrap.innerHTML = `<svg width="360" height="240" viewBox="0 0 360 240" style="font-family:Share Tech Mono,monospace;">
      <text x="180" y="18" text-anchor="middle" font-size="10" fill="#00e896">✓ PORTAS ALINHADAS — sinal flui</text>
      ${oct(90,70,'rgba(0,232,150,.1)','#00e896')}<g transform="translate(90,70)">${strEW('#00e896')}</g>
      ${oct(210,70,'rgba(0,232,150,.1)','#00e896')}<g transform="translate(210,70)">${strEW('#00e896')}</g>
      <line x1="124" y1="70" x2="176" y2="70" stroke="#00e896" stroke-width="3.5"/>
      <text x="90"  y="118" text-anchor="middle" font-size="8" fill="#2a5870">porta Leste →</text>
      <text x="210" y="118" text-anchor="middle" font-size="8" fill="#2a5870">← porta Oeste</text>
      <text x="180" y="146" text-anchor="middle" font-size="10" fill="#e83058">✗ DESALINHADAS — bloqueado</text>
      ${oct(90,196,'rgba(0,80,120,.1)','#152030')}<g transform="translate(90,196)">${strEW('#00c8f0')}</g>
      ${oct(210,196,'rgba(80,40,0,.1)','#402000')}<g transform="translate(210,196)">${strNS('#f06830')}</g>
      <line x1="124" y1="196" x2="176" y2="196" stroke="#e83058" stroke-width="1.5" stroke-dasharray="4,3" opacity=".5"/>
      <text x="90"  y="238" text-anchor="middle" font-size="8" fill="#2a5870">porta Leste →</text>
      <text x="210" y="238" text-anchor="middle" font-size="8" fill="#2a5870">sem porta Oeste</text>
    </svg>`;
  } else if (type === 'comps') {
    const types = [
      { sides:[0,2], color:'#00c8f0', label:'Cabo Reto' },
      { sides:[0,1], color:'#00c8f0', label:'Curva 90°' },
      { sides:[0,1,3], color:'#00e896', label:'Bifurc. T' },
      { sides:[0,1,2,3], color:'#f0c030', label:'Hub / Ponte' },
      { sides:[0], color:'#9060f0', label:'Terminal' },
      { sides:[0,2], color:'#f06830', label:'Amplificador' },
    ];
    let s = '';
    types.forEach(({ sides, color, label }, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const cx = 55 + col * 110, cy = 52 + row * 100;
      s += oct(cx, cy, 'rgba(0,40,60,.12)', '#0a1820');
      const pos = [[cx,cy-28],[cx+28,cy],[cx,cy+28],[cx-28,cy]];
      sides.forEach(d => {
        s += `<line x1="${cx}" y1="${cy}" x2="${pos[d][0]}" y2="${pos[d][1]}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
        s += `<circle cx="${pos[d][0]}" cy="${pos[d][1]}" r="4" fill="${color}"/>`;
      });
      s += `<circle cx="${cx}" cy="${cy}" r="5" fill="${color}"/>`;
      s += `<text x="${cx}" y="${cy+50}" text-anchor="middle" font-size="8" fill="#2a5870">${label}</text>`;
    });
    wrap.innerHTML = `<svg width="360" height="225" viewBox="0 0 360 225">${s}</svg>`;
  } else if (type === 'rotation') {
    const inner = document.createElement('div');
    inner.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:10px;';
    inner.innerHTML = `
      <div style="font-size:8px;letter-spacing:2px;color:var(--t2);text-transform:uppercase;">Clique para girar 90°</div>
      <svg id="trt" width="120" height="120" viewBox="-60 -60 120 120" style="cursor:pointer;overflow:visible;"></svg>
      <div id="trtl" style="font-size:8px;color:var(--t2);letter-spacing:2px;">Rotação: 0° — Norte ↔ Sul</div>`;
    wrap.appendChild(inner);

    const names = [['Norte','Sul'],['Leste','Oeste'],['Sul','Norte'],['Oeste','Leste']];
    let rs = 0;

    function drawRotDemo() {
      const svg = document.getElementById('trt');
      if (!svg) return;
      const { openSides } = window.CypherEngine;
      const absOpen = openSides('straight', rs);
      const portPos = [[0,-40],[40,0],[0,40],[-40,0]];
      let arms = '';
      absOpen.forEach(d => {
        arms += `<line x1="0" y1="0" x2="${portPos[d][0]}" y2="${portPos[d][1]}"
                   stroke="#00c8f0" stroke-width="4" stroke-linecap="round"/>`;
        arms += `<circle cx="${portPos[d][0]}" cy="${portPos[d][1]}" r="5.5" fill="#00c8f0"/>`;
      });
      const cr2 = 34 * 0.3;
      const R2 = 34;
      const pts = [
        [-R2+cr2,-R2],[R2-cr2,-R2],[R2,-R2+cr2],[R2,R2-cr2],
        [R2-cr2,R2],[-R2+cr2,R2],[-R2,R2-cr2],[-R2,-R2+cr2],
      ].map(p=>p.join(',')).join(' ');
      svg.innerHTML = `<polygon points="${pts}" fill="rgba(0,80,120,.15)" stroke="#152030" stroke-width="1.5"/>
        ${arms}<circle r="7" fill="#00c8f0"/>`;
      const lbl = document.getElementById('trtl');
      if (lbl) {
        const n = names[rs % 4];
        lbl.textContent = `Rotação: ${rs * 90}° — ${n[0]} ↔ ${n[1]}`;
      }
    }

    setTimeout(() => {
      drawRotDemo();
      const svg = document.getElementById('trt');
      if (svg) svg.addEventListener('click', () => { rs = (rs + 1) & 3; drawRotDemo(); });
    }, 80);
  } else if (type === 'locked') {
    wrap.innerHTML = `<svg width="360" height="190" viewBox="0 0 360 190" style="font-family:Share Tech Mono,monospace;">
      ${oct(100,90,'rgba(240,104,48,.1)','#f06830')}<g transform="translate(100,90)">${strNS('#f06830')}</g>
      <text x="100" y="46" text-anchor="middle" font-size="16" fill="#f06830">⚿</text>
      <text x="100" y="148" text-anchor="middle" font-size="8" fill="#f06830" letter-spacing="2">BLOQUEADO</text>
      <text x="100" y="163" text-anchor="middle" font-size="7" fill="#2a5870">não gira, não remove</text>
      <text x="180" y="86" text-anchor="middle" font-size="9" fill="#00e896">alinhe →</text>
      ${oct(260,90,'rgba(0,200,240,.1)','#00c8f0')}<g transform="translate(260,90)">${strNS('#00c8f0')}</g>
      <line x1="134" y1="90" x2="226" y2="90" stroke="#00e896" stroke-width="2.5"/>
      <text x="260" y="148" text-anchor="middle" font-size="8" fill="#00c8f0" letter-spacing="2">LIVRE</text>
      <text x="260" y="163" text-anchor="middle" font-size="7" fill="#2a5870">alinhe as portas</text>
      <text x="180" y="22" text-anchor="middle" font-size="10" fill="#6aacbf">Peça bloqueada guia o caminho</text>
    </svg>`;
  } else if (type === 'win') {
    wrap.innerHTML = `<svg width="360" height="210" viewBox="0 0 360 210" style="font-family:Share Tech Mono,monospace;">
      <rect x="18" y="28" width="136" height="58" rx="3" fill="rgba(0,200,240,.04)" stroke="#00c8f0" stroke-width="1.5"/>
      <text x="86" y="50" text-anchor="middle" font-size="8" fill="#2a5870" letter-spacing="3">SINAL ATUAL</text>
      <text x="86" y="76" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="26" font-weight="700" fill="#00e896">9</text>
      <rect x="206" y="28" width="136" height="58" rx="3" fill="rgba(240,192,48,.04)" stroke="#f0c030" stroke-width="1.5"/>
      <text x="274" y="50" text-anchor="middle" font-size="8" fill="#2a5870" letter-spacing="3">META</text>
      <text x="274" y="76" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="26" font-weight="700" fill="#f0c030">9</text>
      <line x1="155" y1="57" x2="205" y2="57" stroke="#00e896" stroke-width="2.5"/>
      <text x="180" y="55" text-anchor="middle" font-size="11" fill="#00e896">=</text>
      <text x="180" y="148" text-anchor="middle" font-family="Orbitron,sans-serif" font-size="13" fill="#00e896" letter-spacing="2">SISTEMA INVADIDO</text>
      <text x="180" y="168" text-anchor="middle" font-size="8" fill="#2a5870">Sinal Atual ≥ Meta E ALVO na cadeia</text>
      <text x="180" y="185" text-anchor="middle" font-size="8" fill="#2a5870">Linhas verdes = nós energizados</text>
    </svg>`;
  }

  return wrap;
}

// ── OVERLAY MANAGEMENT ────────────────────────────────────

function showOverlay(id) {
  ['menu', 'win', 'tutorial'].forEach(name => {
    const el = document.getElementById(`ov-${name}`);
    if (el) el.classList.toggle('off', name !== id);
  });
}

function hideAllOverlays() {
  ['menu', 'win', 'tutorial'].forEach(name => {
    const el = document.getElementById(`ov-${name}`);
    if (el) el.classList.add('off');
  });
}

// ── PARTICLES ─────────────────────────────────────────────

function initParticles() {
  const c = document.getElementById('particles');
  if (!c) return;
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left:${Math.random() * 100}%;
      --dx:${(Math.random() - 0.5) * 80}px;
      width:${1 + Math.random() * 2}px;
      height:${1 + Math.random() * 2}px;
      background:${Math.random() > 0.5 ? 'var(--ac)' : 'var(--gn)'};
      animation-duration:${8 + Math.random() * 12}s;
      animation-delay:${Math.random() * 10}s;`;
    c.appendChild(p);
  }
}

function trackMouse() {
  document.addEventListener('mousemove', e => {
    const g = document.getElementById('cursor-glow');
    if (g) { g.style.left = e.clientX + 'px'; g.style.top = e.clientY + 'px'; }
  });
}

// Tracker flicker (pure cosmetic)
setInterval(() => {
  const el = document.getElementById('diag-tracker');
  if (el && !G.solved) {
    el.style.color = ['var(--rd)', 'var(--yl)', 'var(--t2)'][Math.floor(Math.random() * 3)];
  }
}, 2800);

// ── TOASTS ────────────────────────────────────────────────

function toast(msg, type = 'c') {
  const c = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = `toast t${type}`;
  t.textContent = '› ' + msg;
  c.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('in')));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, 2500);
}

// ── UTILITIES ─────────────────────────────────────────────

function txt(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function set(id, { text, color }) {
  const el = document.getElementById(id);
  if (!el) return;
  if (text  !== undefined) el.textContent   = text;
  if (color !== undefined) el.style.color   = color;
}

function flashEl(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 340);
}

function fmtTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ── GLOBAL BINDINGS (called from HTML onclick) ─────────────
window.startGame      = startGame;
window.resetPuzzle    = resetPuzzle;
window.showMenu       = showMenu;
window.startTutorial  = startTutorial;
window.tutNav         = tutNav;
