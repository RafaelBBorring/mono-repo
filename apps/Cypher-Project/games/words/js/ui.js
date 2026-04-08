/**
 * CHYPER — ui.js
 * UI rendering, DOM helpers, overlays, HUD updates.
 * v1.1.0
 */

const UI = (() => {

  /* ── DOM REFS ─────────────────────────────────── */
  const $ = id => document.getElementById(id);

  const els = {
    overlay:      $('overlay'),
    ovTitle:      $('ov-title'),
    ovTagline:    $('ov-tagline'),
    ovPhasePanel: $('phase-panel'),
    ovPhaseName:  $('pp-phase-name'),
    ovPhaseDesc:  $('pp-desc'),
    ovResultGrid: $('result-grid'),
    ovBtnPrimary: $('ov-btn-primary'),
    ovBtnSecondary: $('ov-btn-secondary'),
    diffSelector: $('diff-selector'),
    diffDesc:     $('diff-desc'),
    diffBadge:    $('diff-badge'),
    gameCanvas:   $('game-canvas'),
    hackInput:    $('hack-input'),
    hudScore:     $('hud-score'),
    hudPhase:     $('hud-phase'),
    hudWpm:       $('hud-wpm'),
    hudLives:     $('hud-lives'),
    comboRibbon:  $('combo-ribbon'),
    progFill:     $('prog-fill'),
    progPct:      $('prog-pct'),
    progPhase:    $('prog-phase'),
    accFill:      $('acc-fill'),
    matchFill:    $('match-fill'),
    dmgFlash:     $('dmg-flash'),
    healFlash:    $('heal-flash'),
  };

  /* ── OVERLAY ──────────────────────────────────── */
  function showOverlay() {
    els.overlay.style.display = 'flex';
    // força reflow antes de remover hidden para a transição funcionar
    void els.overlay.offsetWidth;
    els.overlay.classList.remove('hidden');
  }
  function hideOverlay() {
    els.overlay.style.display = 'none';
    els.overlay.classList.add('hidden');
  }

  function setOverlayMenu({ title, titleClass, tagline, showDiff, phaseName, phaseDesc, results, primaryBtn, secondaryBtn }) {
    els.ovTitle.innerHTML    = title;
    els.ovTitle.className    = 'ov-title' + (titleClass ? ' ' + titleClass : '');
    els.ovTagline.textContent = tagline || '';

    els.diffSelector.style.display = showDiff ? 'flex' : 'none';

    if (phaseName) {
      els.ovPhasePanel.style.display = 'block';
      els.ovPhaseName.textContent     = phaseName;
      els.ovPhaseDesc.innerHTML       = phaseDesc || '';
    } else {
      els.ovPhasePanel.style.display = 'none';
    }

    if (results) {
      els.ovResultGrid.style.display = 'grid';
      els.ovResultGrid.innerHTML = results.map(r =>
        `<div class="result-box">
          <span class="rb-val">${r.val}</span>
          <span class="rb-lbl">${r.lbl}</span>
        </div>`
      ).join('');
    } else {
      els.ovResultGrid.style.display = 'none';
    }

    if (primaryBtn) {
      els.ovBtnPrimary.textContent  = primaryBtn.label;
      els.ovBtnPrimary.className    = 'ov-btn' + (primaryBtn.cls ? ' ' + primaryBtn.cls : '');
      els.ovBtnPrimary.dataset.action = primaryBtn.action || 'start';
      els.ovBtnPrimary.style.display = 'inline-block';
    } else {
      els.ovBtnPrimary.style.display = 'none';
    }

    if (secondaryBtn) {
      els.ovBtnSecondary.textContent  = secondaryBtn.label;
      els.ovBtnSecondary.className    = 'ov-btn secondary' + (secondaryBtn.cls ? ' ' + secondaryBtn.cls : '');
      els.ovBtnSecondary.style.display = 'inline-block';
    } else {
      els.ovBtnSecondary.style.display = 'none';
    }
  }

  /* ── HUD ──────────────────────────────────────── */
  function updateScore(score) {
    els.hudScore.textContent = score.toLocaleString();
  }

  function updatePhase(phaseId) {
    els.hudPhase.textContent = String(phaseId).padStart(2, '0');
  }

  function updateWpm(wpm) {
    els.hudWpm.textContent = wpm;
  }

  function updateLives(lives, maxLives) {
    els.hudLives.innerHTML = '';
    for (let i = 0; i < maxLives; i++) {
      const pip = document.createElement('div');
      pip.className = 'life-pip' + (i >= lives ? ' lost' : '');
      els.hudLives.appendChild(pip);
    }
  }

  function updateDiffBadge(diffId) {
    els.diffBadge.textContent  = DIFFICULTIES[diffId].label;
    els.diffBadge.className    = `diff-badge ${diffId}`;
    els.diffBadge.id           = 'diff-badge';
  }

  /* ── COMBO ────────────────────────────────────── */
  function updateCombo(combo) {
    els.comboRibbon.textContent = `COMBO ×${combo}`;
    if (combo > 1) {
      els.comboRibbon.classList.add('active');
    } else {
      els.comboRibbon.classList.remove('active');
    }
  }

  /* ── PROGRESS ─────────────────────────────────── */
  function updateProgress(pct, phaseLabel) {
    els.progFill.style.width    = pct + '%';
    els.progPct.textContent     = Math.round(pct) + '%';
    if (phaseLabel) els.progPhase.textContent = phaseLabel;
  }

  /* ── MINI STATS ───────────────────────────────── */
  function updateAccBar(pct) {
    els.accFill.style.width = pct + '%';
    const color = pct >= 80 ? 'var(--c-green)' : pct >= 60 ? 'var(--c-orange)' : 'var(--c-red)';
    els.accFill.style.background = color;
  }

  function updateMatchBar(pct) {
    els.matchFill.style.width = pct + '%';
  }

  /* ── SCREEN EFFECTS ───────────────────────────── */
  function triggerDmg() {
    els.dmgFlash.classList.remove('active');
    void els.dmgFlash.offsetWidth;
    els.dmgFlash.classList.add('active');
  }

  function triggerHeal() {
    els.healFlash.classList.remove('active');
    void els.healFlash.offsetWidth;
    els.healFlash.classList.add('active');
  }

  /* ── INPUT FLASH ──────────────────────────────── */
  function flashInput(type) {
    const inp = els.hackInput;
    inp.classList.remove('flash-ok', 'flash-err');
    void inp.offsetWidth;
    inp.classList.add(type === 'ok' ? 'flash-ok' : 'flash-err');
    setTimeout(() => inp.classList.remove('flash-ok', 'flash-err'), 320);
  }

  /* ── FLOATING SCORE ───────────────────────────── */
  function spawnFloatScore(text, xPx, yPx, color) {
    const el = document.createElement('div');
    el.className = 'float-score';
    el.textContent = text;
    el.style.color  = color || 'var(--c-green)';
    el.style.left   = xPx + 'px';
    el.style.top    = yPx + 'px';
    els.gameCanvas.appendChild(el);
    setTimeout(() => el.remove(), 950);
  }

  /* ── PARTICLES ────────────────────────────────── */
  function spawnParticles(xPx, yPx, color) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const angle = (i / count) * Math.PI * 2;
      const dist  = 30 + Math.random() * 40;
      p.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
      p.style.setProperty('--dur', (0.4 + Math.random() * 0.4) + 's');
      p.style.background = color || 'var(--c-green)';
      p.style.left = xPx + 'px';
      p.style.top  = yPx + 'px';
      els.gameCanvas.appendChild(p);
      setTimeout(() => p.remove(), 800);
    }
  }

  /* ── NOTIFICATION TOAST ───────────────────────── */
  function notify(text, type = 'success') {
    const el = document.createElement('div');
    el.className = `notify ${type}`;
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  /* ── WORD TOKEN ───────────────────────────────── */
  function createWordToken(word, tier, pts, topPx) {
    const el = document.createElement('div');
    el.className = `word-token t${tier}`;
    el.dataset.word = word;
    el.style.top    = topPx + 'px';
    el.style.left   = '102%';
    el.innerHTML    = `<span class="w-text">${word}</span><span class="w-pts">+${pts}</span>`;
    els.gameCanvas.appendChild(el);
    return el;
  }

  function updateWordHighlight(el, typed) {
    const word  = el.dataset.word || '';
    const span  = el.querySelector('.w-text');
    if (!span) return;
    if (!typed || !word.startsWith(typed)) {
      span.innerHTML = word;
      return;
    }
    span.innerHTML =
      `<span class="w-matched">${word.slice(0, typed.length)}</span>` +
      `<span class="w-remain">${word.slice(typed.length)}</span>`;
  }

  function destroyWordToken(el, cb) {
    el.classList.add('destroyed');
    setTimeout(() => { el.remove(); if (cb) cb(); }, 450);
  }

  function slipWordToken(el, cb) {
    el.classList.add('slipped');
    setTimeout(() => { el.remove(); if (cb) cb(); }, 300);
  }

  return {
    els,
    showOverlay, hideOverlay, setOverlayMenu,
    updateScore, updatePhase, updateWpm, updateLives,
    updateDiffBadge, updateCombo, updateProgress,
    updateAccBar, updateMatchBar,
    triggerDmg, triggerHeal, flashInput,
    spawnFloatScore, spawnParticles, notify,
    createWordToken, updateWordHighlight, destroyWordToken, slipWordToken,
  };
})();
