/**
 * CHYPER — game.js
 * Core game loop, word spawning, scoring, phase logic.
 * v1.1.0
 */

const Game = (() => {

  /* ── STATE ────────────────────────────────────── */
  let state = {};

  function defaultState() {
    return {
      running:      false,
      phaseIdx:     0,
      difficulty:   'normal',
      score:        0,
      phaseScore:   0,
      lives:        5,
      maxLives:     5,
      combo:        1,
      comboTimer:   null,
      words:        [],       // active word objects
      spawnTimer:   null,
      animFrame:    null,
      lastTime:     null,
      wordCount:    0,        // total words typed correctly
      typedCount:   0,        // total submissions (right + wrong)
      wpmStart:     null,
      usedWords:    new Set(),
    };
  }

  /* ── HELPERS ──────────────────────────────────── */
  function phase()  { return PHASES[state.phaseIdx]; }
  function diff()   { return DIFFICULTIES[state.difficulty]; }

  function effectiveSpeed()     { return phase().baseSpeed     * diff().speedMult; }
  function effectiveSpawnRate() { return phase().baseSpawnRate * diff().spawnMult; }
  function effectiveMaxWords()  { return diff().maxOnScreen; }
  function effectiveLives()     { return Math.max(1, phase().baseLives + diff().livesBonus); }

  function pickWord() {
    const sizes = phase().wordSizes;
    const pool  = [];
    sizes.forEach(s => pool.push(...WORDS[s]));
    const available = pool.filter(w => !state.usedWords.has(w) && !state.words.find(x => x.text === w));
    if (!available.length) { state.usedWords.clear(); return pickWord(); }
    return available[Math.floor(Math.random() * available.length)];
  }

  /* ── WORD SPAWNING ────────────────────────────── */
  function spawnWord() {
    if (!state.running) return;
    if (state.words.length >= effectiveMaxWords()) return;

    const text  = pickWord();
    state.usedWords.add(text);
    const pts   = calcPoints(text, phase().id);
    const tier  = wordTier(text);
    const speed = effectiveSpeed() * (0.82 + Math.random() * 0.36);

    const canvas  = UI.els.gameCanvas;
    const topMin  = 10;
    const canvasH = canvas.clientHeight || canvas.offsetHeight || 400;
    const topMax  = canvasH - 50;
    const top     = topMin + Math.random() * (Math.max(topMax, topMin + 10) - topMin);

    const el = UI.createWordToken(text, tier, pts, top);

    const tierColors = { 1: 'var(--c-green)', 2: 'var(--c-cyan)', 3: 'var(--c-orange)', 4: 'var(--c-red)' };

    state.words.push({
      text, pts, tier, el, top,
      x: 102,
      speed,
      matched: false,
      color: tierColors[tier],
    });
  }

  function startSpawner() {
    spawnWord();
    // stagger first words
    setTimeout(spawnWord, 700);
    setTimeout(spawnWord, 1400);
    state.spawnTimer = setInterval(spawnWord, effectiveSpawnRate());
  }

  function stopSpawner() {
    if (state.spawnTimer) clearInterval(state.spawnTimer);
    state.spawnTimer = null;
  }

  /* ── GAME LOOP ────────────────────────────────── */
  function loop(ts) {
    if (!state.running) return;
    const dt = state.lastTime ? Math.min(ts - state.lastTime, 60) : 16;
    state.lastTime = ts;

    const canvasW = UI.els.gameCanvas.clientWidth || UI.els.gameCanvas.offsetWidth || 800;
    const firewall = 5; // % from left

    const toRemove = [];

    state.words.forEach((w, i) => {
      if (w.matched) return;

      // move
      const pxPerSec = (canvasW * w.speed) / 100;
      const pxDelta  = pxPerSec * (dt / 1000);
      const pxLeft   = (w.x / 100) * canvasW - pxDelta;
      w.x = (pxLeft / canvasW) * 100;
      w.el.style.left = w.x + '%';

      // danger zone
      if (w.x < firewall + 12) {
        w.el.classList.add('danger');
      } else {
        w.el.classList.remove('danger');
      }

      // slipped past firewall
      if (w.x < firewall - 6) {
        UI.slipWordToken(w.el);
        toRemove.push(i);
        onWordSlipped();
      }
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      state.words.splice(toRemove[i], 1);
    }

    updateWpmDisplay();
    state.animFrame = requestAnimationFrame(loop);
  }

  /* ── WORD MATCHED ─────────────────────────────── */
  function matchWord(typed) {
    const idx = state.words.findIndex(w => !w.matched && w.text === typed);
    if (idx === -1) return false;

    const w   = state.words[idx];
    w.matched = true;
    state.typedCount++;
    state.wordCount++;

    const bonusMult = state.combo * diff().scoreBonus;
    const scored    = Math.round(w.pts * bonusMult);
    state.score     += scored;
    state.phaseScore += w.pts;   // phase progress uses base pts

    // canvas coordinates for FX
    const canvas = UI.els.gameCanvas;
    const rect   = canvas.getBoundingClientRect();
    const xPx    = (w.x / 100) * canvas.clientWidth;
    const yPx    = w.top;

    UI.destroyWordToken(w.el, () => {
      state.words.splice(state.words.indexOf(w), 1);
    });
    UI.spawnParticles(xPx, yPx, w.color);
    UI.spawnFloatScore(
      `+${scored}` + (state.combo > 1 ? ` ×${state.combo}` : ''),
      xPx, yPx - 14,
      state.combo > 1 ? 'var(--c-orange)' : 'var(--c-green)'
    );
    UI.flashInput('ok');

    incrementCombo();
    refreshHUD();
    updateProgress();

    if (state.phaseScore >= phase().goal) {
      setTimeout(onPhaseComplete, 300);
    }

    return true;
  }

  /* ── WORD SLIPPED ─────────────────────────────── */
  function onWordSlipped() {
    state.lives--;
    resetCombo();
    UI.triggerDmg();
    UI.updateLives(state.lives, state.maxLives);

    if (state.lives <= 0) {
      setTimeout(onGameOver, 350);
    } else {
      const msgs = ['FIREWALL RESISTIU!', 'ACESSO BLOQUEADO', 'INTRUSO DETECTADO!', 'ALERTA DE SEGURANÇA!'];
      UI.notify(msgs[Math.floor(Math.random() * msgs.length)], 'danger');
    }
  }

  /* ── COMBO ────────────────────────────────────── */
  function incrementCombo() {
    state.combo = Math.min(state.combo + 1, 10);
    if (state.comboTimer) clearTimeout(state.comboTimer);
    state.comboTimer = setTimeout(resetCombo, 3800);
    UI.updateCombo(state.combo);

    if (state.combo === 5)  UI.notify('COMBO ×5 — HACKING ACELERADO!', 'warn');
    if (state.combo === 10) UI.notify('COMBO MÁXIMO ×10 — SISTEMA EM COLAPSO!', 'warn');
  }

  function resetCombo() {
    state.combo = 1;
    if (state.comboTimer) clearTimeout(state.comboTimer);
    UI.updateCombo(1);
  }

  /* ── HUD / STATS ──────────────────────────────── */
  function refreshHUD() {
    UI.updateScore(state.score);
    UI.updateLives(state.lives, state.maxLives);
  }

  function updateProgress() {
    const pct = Math.min(100, (state.phaseScore / phase().goal) * 100);
    UI.updateProgress(pct, `FASE ${String(phase().id).padStart(2,'0')} — ${phase().name}`);
  }

  function updateWpmDisplay() {
    if (!state.wpmStart) return;
    const mins = (Date.now() - state.wpmStart) / 60000;
    if (mins < 0.05) return;
    UI.updateWpm(Math.round(state.wordCount / mins));
  }

  function updateAccuracy() {
    if (!state.typedCount) return;
    const acc = Math.round((state.wordCount / state.typedCount) * 100);
    UI.updateAccBar(acc);
  }

  function updateMatchHighlight(typed) {
    state.words.forEach(w => {
      if (!w.matched) UI.updateWordHighlight(w.el, typed);
    });
    // match bar: how far current typed matches best candidate
    const best = state.words.find(w => !w.matched && w.text.startsWith(typed));
    UI.updateMatchBar(best && typed ? (typed.length / best.text.length) * 100 : 0);
  }

  /* ── PHASE COMPLETE ───────────────────────────── */
  function onPhaseComplete() {
    state.running = false;
    stopSpawner();
    cancelAnimationFrame(state.animFrame);
    clearWords();

    const isLast = state.phaseIdx >= PHASES.length - 1;

    if (isLast) {
      onVictory();
    } else {
      const next = PHASES[state.phaseIdx + 1];
      UI.setOverlayMenu({
        title:    `<span>✓</span> FASE CONCLUÍDA`,
        tagline:  `PONTUAÇÃO ACUMULADA: ${state.score.toLocaleString()}`,
        showDiff: false,
        phaseName: `PRÓXIMO: FASE ${String(next.id).padStart(2,'0')} — ${next.name}`,
        phaseDesc: next.desc,
        results: [
          { val: state.phaseScore, lbl: 'PONTOS DA FASE' },
          { val: state.wordCount,  lbl: 'PALAVRAS TOTAIS' },
          { val: state.combo > 1 ? `×${state.combo}` : '×1', lbl: 'COMBO FINAL' },
        ],
        primaryBtn:   { label: 'AVANÇAR →' },
        secondaryBtn: null,
      });
      if (window.__chyperSetPrimaryAction) window.__chyperSetPrimaryAction('next');
      UI.showOverlay();
    }
  }

  function onGameOver() {
    state.running = false;
    stopSpawner();
    cancelAnimationFrame(state.animFrame);
    clearWords();

    const acc = state.typedCount ? Math.round((state.wordCount / state.typedCount) * 100) : 0;

    UI.setOverlayMenu({
      title:    `ACESSO NEGADO`,
      titleClass: 'danger',
      tagline:  'INVASÃO BLOQUEADA PELO SISTEMA DE DEFESA',
      showDiff: false,
      phaseName: `FASE ${String(phase().id).padStart(2,'0')} — ${phase().name}`,
      phaseDesc: 'Seus privilégios foram revogados.',
      results: [
        { val: state.score.toLocaleString(), lbl: 'PONTUAÇÃO' },
        { val: state.wordCount,              lbl: 'PALAVRAS' },
        { val: acc + '%',                    lbl: 'PRECISÃO' },
      ],
      primaryBtn:   { label: 'TENTAR NOVAMENTE', cls: 'danger-btn', action: 'start' },
      secondaryBtn: { label: 'MENU' },
    });
    UI.showOverlay();
  }

  function onVictory() {
    const acc = state.typedCount ? Math.round((state.wordCount / state.typedCount) * 100) : 0;
    const mins = state.wpmStart ? (Date.now() - state.wpmStart) / 60000 : 1;

    UI.setOverlayMenu({
      title:    `ACESSO ROOT`,
      tagline:  'SISTEMA COMPLETAMENTE COMPROMETIDO',
      showDiff: false,
      phaseName: 'MISSÃO CONCLUÍDA — TODOS OS FIREWALLS DERRUBADOS',
      phaseDesc: 'Você ganhou controle total sobre o servidor alvo.',
      results: [
        { val: state.score.toLocaleString(), lbl: 'PONTUAÇÃO TOTAL' },
        { val: state.wordCount,              lbl: 'PALAVRAS' },
        { val: acc + '%',                    lbl: 'PRECISÃO' },
        { val: Math.round(state.wordCount / Math.max(mins, 0.1)), lbl: 'PAL/MIN' },
        { val: `×${state.combo}`,            lbl: 'COMBO MÁXIMO' },
        { val: DIFFICULTIES[state.difficulty].label, lbl: 'DIFICULDADE' },
      ],
      primaryBtn:   { label: 'JOGAR NOVAMENTE', action: 'start' },
      secondaryBtn: { label: 'MENU' },
    });
    UI.showOverlay();
  }

  /* ── CLEAR WORDS ──────────────────────────────── */
  function clearWords() {
    if (state.words) state.words.forEach(w => { try { w.el.remove(); } catch(e){} });
    state.words = [];
  }

  /* ── PUBLIC: START PHASE ──────────────────────── */
  function startPhase() {
    const ph = phase();
    state.lives       = effectiveLives();
    state.maxLives    = state.lives;
    state.phaseScore  = 0;
    state.combo       = 1;
    state.running     = true;
    state.lastTime    = null;
    state.wpmStart    = state.wpmStart || Date.now();

    UI.updatePhase(ph.id);
    UI.updateDiffBadge(state.difficulty);
    UI.updateLives(state.lives, state.maxLives);
    UI.updateCombo(1);
    UI.updateProgress(0, `FASE ${String(ph.id).padStart(2,'0')} — ${ph.name}`);
    UI.hideOverlay();

    startSpawner();
    state.animFrame = requestAnimationFrame(loop);
    UI.els.hackInput.value = '';
    UI.els.hackInput.focus();
  }

  /* ── PUBLIC: NEW GAME ─────────────────────────── */
  function newGame(difficulty) {
    clearWords();
    stopSpawner();
    if (state.animFrame) cancelAnimationFrame(state.animFrame);

    state = defaultState();
    state.difficulty = difficulty || 'normal';

    UI.updateScore(0);
    UI.updateWpm(0);
    startPhase();
  }

  /* ── PUBLIC: NEXT PHASE ───────────────────────── */
  function nextPhase() {
    state.phaseIdx++;
    startPhase();
  }

  /* ── PUBLIC: ON INPUT ─────────────────────────── */
  function onInput(val) {
    updateMatchHighlight(val);
    const found = matchWord(val);
    if (found) {
      UI.els.hackInput.value = '';
      updateMatchHighlight('');
      updateAccuracy();
    }
  }

  function onSubmit(val) {
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return;
    const found = matchWord(trimmed);
    if (!found) {
      state.typedCount++;
      updateAccuracy();
      UI.flashInput('err');
    }
    UI.els.hackInput.value = '';
    updateMatchHighlight('');
  }

  return {
    newGame,
    nextPhase,
    onInput,
    onSubmit,
    getState: () => state,
    setDifficulty: d => { state.difficulty = d; },
  };
})();
