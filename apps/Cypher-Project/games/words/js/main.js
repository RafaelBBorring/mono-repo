/**
 * CHYPER — main.js
 * Entry point: boots the app, wires events.
 * v1.1.1
 */

(function () {
  let selectedDiff = 'normal';
  // 'start' | 'next' — controla o que o botão primário faz
  let primaryAction = 'start';

  /* ── BOOT ─────────────────────────────────────── */
  function boot() {
    MatrixRain.init();
    MatrixRain.start();
    wireDiffButtons();
    wireOverlayButtons();
    wireInput();
    showMainMenu();
  }

  /* ── MAIN MENU ────────────────────────────────── */
  function showMainMenu() {
    primaryAction = 'start';
    UI.setOverlayMenu({
      title:    'CHY<span class="accent">P</span>ER',
      tagline:  'SISTEMA DE INVASÃO v1.1.0',
      showDiff: true,
      phaseName: 'FASE 01 — ' + PHASES[0].name,
      phaseDesc: PHASES[0].desc,
      primaryBtn:   { label: 'INICIAR INVASÃO' },
      secondaryBtn: null,
    });
    UI.showOverlay();
  }

  /* ── DIFFICULTY BUTTONS ───────────────────────── */
  function wireDiffButtons() {
    var btns = document.querySelectorAll('.diff-btn');
    var desc = document.getElementById('diff-desc');

    btns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        btns.forEach(function(b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedDiff = btn.dataset.diff;
        if (desc) desc.textContent = DIFFICULTIES[selectedDiff].desc;
      });
    });

    // default: normal
    var defaultBtn = document.querySelector('.diff-btn[data-diff="normal"]');
    if (defaultBtn) {
      defaultBtn.classList.add('selected');
      if (desc) desc.textContent = DIFFICULTIES['normal'].desc;
    }
  }

  /* ── OVERLAY BUTTONS ──────────────────────────── */
  function wireOverlayButtons() {
    var primary   = document.getElementById('ov-btn-primary');
    var secondary = document.getElementById('ov-btn-secondary');

    primary.addEventListener('click', function(e) {
      e.stopPropagation();
      if (primaryAction === 'next') {
        primaryAction = 'start';
        Game.nextPhase();
      } else {
        Game.newGame(selectedDiff);
      }
    });

    secondary.addEventListener('click', function(e) {
      e.stopPropagation();
      var state = Game.getState();
      if (state && state.running) {
        state.running = false;
      }
      showMainMenu();
    });
  }

  /* ── EXPÕE setPrimaryAction para game.js ──────── */
  window.__chyperSetPrimaryAction = function(action) {
    primaryAction = action;
  };

  /* ── INPUT WIRING ─────────────────────────────── */
  function wireInput() {
    var input = document.getElementById('hack-input');

    input.addEventListener('input', function() {
      if (!Game.getState().running) return;
      var val = input.value.trim().toLowerCase();
      Game.onInput(val);
    });

    input.addEventListener('keydown', function(e) {
      if (!Game.getState().running) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        Game.onSubmit(input.value);
      }
    });

    // keep focus during game
    document.addEventListener('keydown', function(e) {
      if (Game.getState().running && document.activeElement !== input) {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          input.focus();
        }
      }
    });
  }

  /* ── INIT ─────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
