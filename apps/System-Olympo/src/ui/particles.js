let canvas, ctx;
let particles = [];
let animating = false;

function ensureCanvas() {
  if (!canvas) {
    canvas = document.getElementById('particle-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'particle-canvas';
      document.body.appendChild(canvas);
    }
  }
  ctx = canvas.getContext('2d');
  resize();
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  window.removeEventListener('resize', resize);
  window.addEventListener('resize', resize);
}

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

export function burst(x, y, count = 100, options = {}) {
  ensureCanvas();
  const colors = options.colors || ['#f0c56d', '#ffe4ab', '#ffd700'];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * (options.maxSpeed || 6) + (options.minSpeed || 1);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: options.size || (Math.random() * 2.5 + 0.5),
      life: 1,
      decay: options.decay || (Math.random() * 0.015 + 0.006),
      color: colors[Math.floor(Math.random() * colors.length)],
      glow: options.glow !== false,
      gravity: options.gravity || 0
    });
  }
  if (!animating) animate();
}

export function goldenBurst(x, y, count = 60) {
  burst(x, y, count, {
    colors: ['#f0c56d', '#ffe4ab', '#fff8e1', '#ffd700', '#ffffff'],
    maxSpeed: 5,
    minSpeed: 1.5,
    size: Math.random() * 3 + 0.8,
    decay: Math.random() * 0.012 + 0.004,
    glow: true
  });
}

export function classBurst(x, y, color, count = 80) {
  burst(x, y, count, {
    colors: [color, '#ffffff', '#ffe4ab'],
    maxSpeed: 7,
    minSpeed: 2,
    glow: true
  });
}

// Golden palette at ~15% higher brightness than original
const GOLD_COLORS = ['#f7d985', '#ffecb3', '#ffe84d', '#ffd700', '#fffde7', '#fadf8a'];

/**
 * Dissolve an element into golden particles.
 * Runs its own isolated animation loop — no conflict with assemble.
 * Calls onComplete only when ALL particles have faded out (no fixed timeout).
 */
export function dissolve(element, onComplete) {
  ensureCanvas();
  if (!element) { onComplete?.(); return; }

  const rect = element.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const count = 520;

  const pool = [];
  for (let i = 0; i < count; i++) {
    const px = rect.left + Math.random() * rect.width;
    const py = rect.top + Math.random() * rect.height;
    const angle = Math.atan2(py - cy, px - cx) + (Math.random() - 0.5) * 1.2;
    const speed = Math.random() * 8 + 2;

    pool.push({
      x: px, y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 3,
      size: Math.random() * 2.5 + 0.3,
      life: 1,
      // Faster decay: dies in ~45–70 frames (~750ms–1.1s at 60fps)
      // All particles finish BEFORE onComplete fires → zero timing conflict
      decay: Math.random() * 0.008 + 0.014,
      color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
      glow: true,
      gravity: 0.04
    });
  }

  // Fade out the element visually
  element.style.transition = 'opacity 0.35s ease-out, filter 0.35s ease-out';
  element.style.opacity = '0';
  element.style.filter = 'blur(10px)';

  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let anyAlive = false;

    for (const p of pool) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.985;
      p.life -= p.decay;
      if (p.life <= 0) continue;
      anyAlive = true;

      ctx.save();
      ctx.globalAlpha = p.life * 0.88;
      ctx.shadowBlur = 14;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * Math.max(p.life, 0.15), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (anyAlive) {
      requestAnimationFrame(step);
    } else {
      // Canvas clear — safe to hand off to assemble with zero overlap
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      onComplete?.();
    }
  }

  step();
}

/**
 * Assemble golden particles converging onto a target rect.
 * Starts only after dissolve completes → no canvas conflict.
 */
export function assemble(targetRect, onComplete) {
  ensureCanvas();
  const cx = targetRect.left + targetRect.width / 2;
  const cy = targetRect.top + targetRect.height / 2;
  const count = 380;
  const temp = [];

  for (let i = 0; i < count; i++) {
    const startX = cx + (Math.random() - 0.5) * canvas.width * 0.8;
    const startY = cy + (Math.random() - 0.5) * canvas.height * 0.8;
    const targetX = targetRect.left + Math.random() * targetRect.width;
    const targetY = targetRect.top + Math.random() * targetRect.height;

    temp.push({
      x: startX, y: startY,
      targetX, targetY,
      size: Math.random() * 2.2 + 0.4,
      life: 1,
      decay: 0,
      color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
      glow: true,
      progress: 0,
      speed: Math.random() * 0.04 + 0.015,
      arrived: false
    });
  }

  let frame = 0;

  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let allArrived = true;

    temp.forEach(p => {
      if (!p.arrived) {
        p.progress += p.speed;
        const ease = 1 - Math.pow(1 - p.progress, 3);
        p.x = p.x + (p.targetX - p.x) * ease * 0.08;
        p.y = p.y + (p.targetY - p.y) * ease * 0.08;

        if (Math.abs(p.x - p.targetX) < 3 && Math.abs(p.y - p.targetY) < 3) {
          p.arrived = true;
          p.x = p.targetX;
          p.y = p.targetY;
        } else {
          allArrived = false;
        }
      }

      ctx.save();
      ctx.globalAlpha = p.arrived ? 0.4 : 0.75;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    frame++;
    if (!allArrived && frame < 160) {
      requestAnimationFrame(step);
    } else {
      let fadeAlpha = 0.8;
      function fadeOut() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        fadeAlpha -= 0.035;
        if (fadeAlpha <= 0) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          onComplete?.();
          return;
        }
        temp.forEach(p => {
          ctx.save();
          ctx.globalAlpha = fadeAlpha * 0.3;
          ctx.shadowBlur = 5;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
        requestAnimationFrame(fadeOut);
      }
      fadeOut();
    }
  }

  step();
}

function animate() {
  animating = true;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.99;
    p.life -= p.decay;

    if (p.life <= 0) return false;

    ctx.save();
    ctx.globalAlpha = p.life * 0.75;
    if (p.glow) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
    }
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * Math.max(p.life, 0.2), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    return true;
  });

  if (particles.length > 0) {
    requestAnimationFrame(animate);
  } else {
    animating = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

setTimeout(ensureCanvas, 100);
