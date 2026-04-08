'use strict';
// ═══════════════════════════════════════════════════════════
//  CYPHER RENDERER
//  Draws the grid, cells, connection lines, and animations.
//  Reads state only from CypherEngine data; never mutates it.
//
//  RENDERING APPROACH:
//  - Each cell is a <div> containing an <svg>.
//  - Component arms are drawn at ABSOLUTE positions derived
//    from openSides(type, rot) — no CSS/SVG transform tricks.
//  - Rotation animation: Web Animations API spins the inner
//    div 0→90°, then on completion the SVG is redrawn with
//    the new rotation baked in and transform reset to 0°.
//    This guarantees visual and logical state always match.
// ═══════════════════════════════════════════════════════════

const CELL_SIZE = 72;   // px — cell width & height
const CELL_GAP  = 6;    // px — gap between cells
const CELL_STEP = CELL_SIZE + CELL_GAP;

// Corner cut fraction of cell size for the octagon shape
const CUT_FRAC  = 0.22;

// ── OCTAGON POINTS ────────────────────────────────────────
function octPoints(s, cut) {
  const c = cut ?? s * CUT_FRAC;
  return `${c},0 ${s-c},0 ${s},${c} ${s},${s-c} ${s-c},${s} ${c},${s} 0,${s-c} 0,${c}`;
}

// Port XY: the midpoint of each side (N/E/S/W) relative to cell top-left
function portXY(dir) {
  const h = CELL_SIZE / 2;
  return [
    [h, 0],           // N — top centre
    [CELL_SIZE, h],   // E — right centre
    [h, CELL_SIZE],   // S — bottom centre
    [0, h],           // W — left centre
  ][dir];
}

// ── CELL SVG BUILDER ─────────────────────────────────────

function buildCellSVG(ce) {
  const { COMPONENTS, openSides } = window.CypherEngine;
  const S = CELL_SIZE;
  const cx = S / 2, cy = S / 2;

  // Background polygon colours
  let fill, stroke;
  if      (ce.isSrc)              { fill = 'rgba(0,200,240,.13)';  stroke = '#00c8f0'; }
  else if (ce.isTgt)              { fill = 'rgba(240,192,48,.13)'; stroke = '#f0c030'; }
  else if (ce.locked)             { fill = 'rgba(240,104,48,.09)'; stroke = '#f06830'; }
  else if (ce.powered && ce.type) { fill = 'rgba(0,232,150,.10)';  stroke = '#00e896'; }
  else if (ce.type)               { fill = 'rgba(0,90,130,.15)';   stroke = '#00c8f0'; }
  else                            { fill = 'rgba(0,40,65,.07)';    stroke = '#0a1820'; }

  const poly = `<polygon points="${octPoints(S)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" class="obg"/>`;

  // Powered glow ring
  let glow = '';
  if (ce.powered && (ce.type || ce.isSrc || ce.isTgt)) {
    const gc = ce.isTgt ? '#f0c030' : ce.isSrc ? '#00c8f0' : '#00e896';
    glow = `<polygon points="${octPoints(S, S * 0.17)}"
              fill="none" stroke="${gc}" stroke-width="1.8" opacity=".5"
              style="filter:drop-shadow(0 0 5px ${gc})"/>`;
  }

  // Lock icon
  const lock = ce.locked
    ? `<text x="${S - 9}" y="15" font-size="11" fill="#f06830" opacity=".85">⚿</text>`
    : '';

  // Component arms
  let comp = '';
  if (ce.isSrc) {
    comp = `
      <circle cx="${cx}" cy="${cy}" r="16" fill="rgba(0,200,240,.1)" stroke="#00c8f0" stroke-width="1.3"/>
      <path d="M${cx-3},${cy-10}L${cx-6},${cy+2}L${cx},${cy+2}L${cx-3},${cy+10}L${cx+7},${cy-1}L${cx},${cy-1}Z"
            fill="#00c8f0"/>`;
  } else if (ce.isTgt) {
    comp = `
      <circle cx="${cx}" cy="${cy}" r="16" fill="rgba(240,192,48,.1)" stroke="#f0c030" stroke-width="1.3"/>
      <circle cx="${cx}" cy="${cy}" r="5" fill="#f0c030"/>
      <line x1="${cx}" y1="${cy-16}" x2="${cx}" y2="${cy-8}" stroke="#f0c030" stroke-width="1.5"/>
      <line x1="${cx}" y1="${cy+8}"  x2="${cx}" y2="${cy+16}" stroke="#f0c030" stroke-width="1.5"/>
      <line x1="${cx-16}" y1="${cy}" x2="${cx-8}" y2="${cy}" stroke="#f0c030" stroke-width="1.5"/>
      <line x1="${cx+8}"  y1="${cy}" x2="${cx+16}" y2="${cy}" stroke="#f0c030" stroke-width="1.5"/>`;
  } else if (ce.type) {
    // Absolute open directions for the CURRENT rotation
    const absOpen = openSides(ce.type, ce.rot);
    const def     = COMPONENTS[ce.type];
    const col     = ce.powered ? def.color : def.color;
    const al      = ce.powered ? 1 : 0.72;
    const hubR    = (ce.type === 'cross' || ce.type === 'bridge') ? 9 : 6;
    const armW    = (ce.type === 'cross' || ce.type === 'bridge') ? 4  : 3;

    comp = `<circle cx="${cx}" cy="${cy}" r="${hubR}" fill="${col}" opacity="${al}"/>`;

    absOpen.forEach(d => {
      const [px, py] = portXY(d);
      comp += `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}"
                 stroke="${col}" stroke-width="${armW}" stroke-linecap="round" opacity="${al}"/>
               <circle cx="${px}" cy="${py}" r="4.5" fill="${col}" opacity="${al}"/>`;
    });

    // Extra decoration for amp: arrow indicating N→S direction at current rotation
    if (ce.type === 'amp') {
      // Arrow tip points from centre toward the South port (rotated)
      const [spx, spy] = portXY(absOpen.find(d => {
        // pick the larger-index direction (S-equivalent after rotation)
        const others = absOpen.filter(x => x !== d);
        return others.length === 1;
      }) ?? absOpen[1]);
      const dx = (spx - cx) * 0.35, dy = (spy - cy) * 0.35;
      comp += `<polygon points="${cx-4},${cy-3} ${cx+4},${cy-3} ${cx+dx},${cy+dy}"
                 fill="${col}" opacity=".85"/>`;
    }

    // Extra decoration for bridge: X cross in centre
    if (ce.type === 'bridge') {
      comp += `<line x1="${cx-5}" y1="${cy-5}" x2="${cx+5}" y2="${cy+5}"
                 stroke="${col}" stroke-width="1.5" opacity=".55"/>
               <line x1="${cx+5}" y1="${cy-5}" x2="${cx-5}" y2="${cy+5}"
                 stroke="${col}" stroke-width="1.5" opacity=".55"/>`;
    }
  }

  return `<svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" overflow="visible">
    ${poly}${glow}${lock}<g class="comp">${comp}</g>
  </svg>`;
}

// ── GRID RENDERER ─────────────────────────────────────────

function renderGrid(container, svgLayer, state) {
  container.innerHTML = '';
  svgLayer.innerHTML  = '';

  const { cols, rows, grid } = state;
  const W = CELL_GAP + cols * CELL_STEP;
  const H = CELL_GAP + rows * CELL_STEP;

  container.style.width  = W + 'px';
  container.style.height = H + 'px';
  svgLayer.setAttribute('width',  W);
  svgLayer.setAttribute('height', H);
  svgLayer.style.width  = W + 'px';
  svgLayer.style.height = H + 'px';

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      renderCell(container, state, c, r);
    }
  }

  drawConnectionLines(svgLayer, state);
}

function renderCell(container, state, c, r) {
  const { cols, rows, grid } = state;
  const { cellAt } = window.CypherEngine;
  const ce = cellAt(grid, cols, rows, c, r);

  const x = CELL_GAP + c * CELL_STEP;
  const y = CELL_GAP + r * CELL_STEP;

  const el = document.createElement('div');
  el.className = cellClass(ce);
  el.id        = `ox-${c}-${r}`;
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${CELL_SIZE}px;height:${CELL_SIZE}px;cursor:pointer;z-index:4;`;

  const inner = document.createElement('div');
  inner.id        = `oxi-${c}-${r}`;
  inner.style.cssText = 'position:absolute;inset:0;transform-origin:center;transform:rotate(0deg);';
  inner.innerHTML = buildCellSVG(ce);

  el.appendChild(inner);
  container.appendChild(el);
}

function cellClass(ce) {
  let cls = 'cx-cell';
  if (ce.isSrc)   cls += ' src';
  if (ce.isTgt)   cls += ' tgt';
  if (ce.powered) cls += ' pw';
  return cls;
}

// ── CONNECTION LINES ─────────────────────────────────────
// Drawn between port midpoints of connected adjacent cells.
// Only East (→) and South (↓) directions to avoid duplicates.

function drawConnectionLines(svgLayer, state) {
  const { cols, rows, grid } = state;
  const { cellAt, neighbour, cellIsOpen, OPP } = window.CypherEngine;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      for (const d of [1, 2]) { // E=1, S=2
        const ce  = cellAt(grid, cols, rows, c, r);
        const nb  = neighbour(c, r, d);
        const nce = cellAt(grid, cols, rows, nb.c, nb.r);
        if (!nce) continue;

        // Only draw if both sides have matching open ports
        if (!cellIsOpen(ce, d) || !cellIsOpen(nce, OPP[d])) continue;

        const [px1, py1] = portXY(d);
        const [px2, py2] = portXY(OPP[d]);
        const ax = CELL_GAP + c    * CELL_STEP + px1;
        const ay = CELL_GAP + r    * CELL_STEP + py1;
        const bx = CELL_GAP + nb.c * CELL_STEP + px2;
        const by = CELL_GAP + nb.r * CELL_STEP + py2;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', ax); line.setAttribute('y1', ay);
        line.setAttribute('x2', bx); line.setAttribute('y2', by);

        const powered = ce.powered && nce.powered;
        line.setAttribute('class', 'cx-line ' + (powered ? 'pw' : (ce.type || ce.isSrc ? 'lv' : 'id')));
        svgLayer.appendChild(line);
      }
    }
  }
}

// ── PARTIAL REFRESH ───────────────────────────────────────
// After any state change: re-run propagation, update classes,
// redraw SVG content for each cell, redraw connection lines.
//
// _animating tracks cells currently mid-rotation so fullRefresh
// does not overwrite their innerHTML while they are spinning —
// that would cause the one-frame glitch where new SVG content
// appears at the animation's current (non-zero) angle.
const _animating = new Set();

function fullRefresh(container, svgLayer, state, onResult) {
  const { propagate } = window.CypherEngine;
  const res = propagate(state);

  const { cols, rows, grid } = state;
  const { cellAt } = window.CypherEngine;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key   = `${c},${r}`;
      const el    = document.getElementById(`ox-${c}-${r}`);
      const inner = document.getElementById(`oxi-${c}-${r}`);
      if (!el || !inner) continue;
      const ce = cellAt(grid, cols, rows, c, r);
      // Always update outer class (powered glow, src/tgt)
      el.className = cellClass(ce);
      // Skip SVG redraw for cells that are mid-animation
      if (!_animating.has(key)) {
        inner.innerHTML = buildCellSVG(ce);
        inner.style.transform = 'rotate(0deg)';
      }
    }
  }

  svgLayer.innerHTML = '';
  drawConnectionLines(svgLayer, state);

  if (onResult) onResult(res);
  return res;
}

// ── ROTATION ANIMATION ────────────────────────────────────
// Spin the inner div 0→90° CW, then on completion:
//   1. CANCEL the animation (removes its composited transform)
//   2. Commit ce.rot++ in state
//   3. Redraw SVG with new absolute arms at rot(0deg)
//   4. Run fullRefresh via onDone
//
// ROOT CAUSE of the glitch:
//   Using fill:'forwards' kept the Web Animation's 90° transform
//   composited ON TOP of the element's style.transform.
//   When we then set style.transform='rotate(0deg)', for one
//   paint frame the browser showed: new SVG content (correct for
//   new rot) + 90° animation offset still applied = wrong position.
//   Fix: call anim.cancel() BEFORE touching innerHTML/style.
//   cancel() removes the animation's effect immediately and
//   synchronously, so the next line sees a clean transform.

function animateRotation(c, r, state, container, svgLayer, onDone) {
  const inner = document.getElementById(`oxi-${c}-${r}`);
  if (!inner) {
    onDone();
    return;
  }

  const key = `${c},${r}`;
  _animating.add(key);   // block fullRefresh from touching this cell

  // No overshoot easing — clean ease-out, fill:'none' so the animation
  // effect is removed from the compositor the moment it finishes.
  const anim = inner.animate(
    [{ transform: 'rotate(0deg)' }, { transform: 'rotate(90deg)' }],
    { duration: 280, easing: 'ease-out', fill: 'none' },
  );

  anim.finished.then(() => {
    // 1. cancel() removes the animation's composited transform instantly
    //    and synchronously — inner now has zero active animations.
    anim.cancel();

    // 2. Commit the logical rotation in state
    const { cellAt } = window.CypherEngine;
    const { cols, rows, grid } = state;
    const ce = cellAt(grid, cols, rows, c, r);
    ce.rot = (ce.rot + 1) & 3;

    // 3. Redraw SVG at correct absolute arm positions with clean transform
    inner.style.transform = 'rotate(0deg)';
    inner.innerHTML = buildCellSVG(ce);

    // 4. Unblock fullRefresh for this cell
    _animating.delete(key);

    // 5. Signal caller to run propagation + full refresh
    onDone();
  });
}

// ── PARTICLE / FX ─────────────────────────────────────────

function spawnBurst(cx, cy) {
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div');
    p.className = 'cx-burst';
    const angle = (Math.PI * 2 / 50) * i;
    const dist  = 80 + Math.random() * 220;
    const colors = ['var(--ac)', 'var(--gn)', 'var(--yl)'];
    p.style.cssText = `
      left:${cx}px; top:${cy}px;
      --bx:${Math.cos(angle) * dist}px;
      --by:${Math.sin(angle) * dist}px;
      background:${colors[i % 3]};
      animation-delay:${Math.random() * 0.18}s;`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1300);
  }
}

// Mini icon SVG for the component list panel
function buildComponentIcon(type) {
  const { COMPONENTS } = window.CypherEngine;
  const def = COMPONENTS[type];
  const positions = [[0,-18],[18,0],[0,18],[-18,0]]; // N E S W at r=18
  let ico = `<circle r="4.5" fill="${def.color}" opacity=".9"/>`;
  def.sides.forEach(d => {
    const [ix, iy] = positions[d];
    ico += `<line x1="0" y1="0" x2="${ix}" y2="${iy}"
               stroke="${def.color}" stroke-width="2.5" stroke-linecap="round"/>
             <circle cx="${ix}" cy="${iy}" r="3.2" fill="${def.color}"/>`;
  });
  return `<svg viewBox="-22 -22 44 44" width="100%" height="100%">${ico}</svg>`;
}

// ── EXPORTS ───────────────────────────────────────────────
window.CypherRenderer = {
  CELL_SIZE, CELL_GAP, CELL_STEP,
  octPoints, portXY,
  buildCellSVG, buildComponentIcon,
  renderGrid, fullRefresh,
  animateRotation, spawnBurst,
};
