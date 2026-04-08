/**
 * CHYPER — matrix.js
 * Matrix-style rain background animation.
 * v1.1.0
 */

const MatrixRain = (() => {
  let canvas, ctx, cols, drops, raf;
  const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモ';
  const FONT_SIZE = 12;
  const COLOR = '#00ff88';

  function init() {
    canvas = document.getElementById('matrix-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    cols  = Math.floor(canvas.width / FONT_SIZE);
    drops = Array.from({ length: cols }, () => Math.random() * -50);
  }

  function draw() {
    ctx.fillStyle = 'rgba(4,16,10,0.045)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = COLOR;
    ctx.font = FONT_SIZE + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
      const char = CHARS[Math.floor(Math.random() * CHARS.length)];
      ctx.fillText(char, i * FONT_SIZE, drops[i] * FONT_SIZE);
      if (drops[i] * FONT_SIZE > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i] += 0.35;
    }
  }

  function start() {
    if (raf) return;
    (function loop() { draw(); raf = requestAnimationFrame(loop); })();
  }

  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = null; }
  }

  return { init, start, stop };
})();
