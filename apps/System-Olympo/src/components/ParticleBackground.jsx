import { useEffect, useRef } from "react";
import OlympoWebGLBackdrop from "./OlympoWebGLBackdrop";

const PARTICLE_COUNT = 40;
const GOLD = { r: 201, g: 168, b: 76 };

function createParticle(width, height) {
  const radius = 1 + Math.random() * 2;
  const trail = Math.random() < 0.3;
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    prevX: 0,
    prevY: 0,
    radius,
    baseOpacity: 0.1 + Math.random() * 0.3,
    opacity: 0,
    vy: -(0.15 + Math.random() * 0.35),
    vx: (Math.random() - 0.5) * 0.3,
    swaySpeed: 0.0005 + Math.random() * 0.001,
    swayAmplitude: 0.3 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
    trail,
    shimmerPhase: Math.random() * Math.PI * 2,
    shimmerSpeed: 0.002 + Math.random() * 0.003,
  };
}

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationId;
    let particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(createParticle(canvas.width, canvas.height));
      }
    }

    function drawParticle(p, time) {
      p.prevX = p.x;
      p.prevY = p.y;

      p.x += p.vx + Math.sin(time * p.swaySpeed + p.phase) * p.swayAmplitude;
      p.y += p.vy;

      if (p.y + p.radius < 0) {
        p.y = canvas.height + p.radius;
        p.x = Math.random() * canvas.width;
        p.prevX = p.x;
        p.prevY = p.y;
      }
      if (p.x < -p.radius) p.x = canvas.width + p.radius;
      if (p.x > canvas.width + p.radius) p.x = -p.radius;

      const shimmer = Math.sin(time * p.shimmerSpeed + p.shimmerPhase);
      const shimmerBoost = shimmer > 0.85 ? (shimmer - 0.85) / 0.15 * 0.25 : 0;
      p.opacity = Math.min(1, p.baseOpacity + shimmerBoost);

      if (p.trail) {
        const dx = p.x - p.prevX;
        const dy = p.y - p.prevY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.5 && dist < 10) {
          ctx.beginPath();
          ctx.moveTo(p.prevX, p.prevY);
          ctx.lineTo(p.x, p.y);
          ctx.strokeStyle = `rgba(${GOLD.r},${GOLD.g},${GOLD.b},${p.opacity * 0.3})`;
          ctx.lineWidth = p.radius * 0.6;
          ctx.stroke();
        }
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${GOLD.r},${GOLD.g},${GOLD.b},${p.opacity})`;
      ctx.fill();
    }

    function animate(time) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        drawParticle(particles[i], time);
      }
      animationId = requestAnimationFrame(animate);
    }

    resize();
    initParticles();
    animationId = requestAnimationFrame(animate);

    function handleResize() {
      resize();
      initParticles();
    }

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <OlympoWebGLBackdrop />
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -1,
          pointerEvents: "none",
        }}
      />
    </>
  );
}
