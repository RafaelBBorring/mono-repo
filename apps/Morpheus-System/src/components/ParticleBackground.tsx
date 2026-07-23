"use client";

import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    camera.position.z = 55;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const N = reduce ? 72 : 140;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);

    const isDark = document.documentElement.classList.contains("dark");
    const pal = isDark
      ? [
          new THREE.Color("#3b82f6"),
          new THREE.Color("#8b5cf6"),
          new THREE.Color("#60a5fa"),
          new THREE.Color("#a78bfa"),
        ]
      : [
          new THREE.Color("#c8a227"),
          new THREE.Color("#3a1a5e"),
          new THREE.Color("#b88728"),
          new THREE.Color("#5b2d8f"),
        ];

    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 130;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 85;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 55;
      vel[i * 3] = (Math.random() - 0.5) * 0.008;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      const c = pal[i % 4];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.38,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
    });

    scene.add(new THREE.Points(geo, mat));

    let t = 0;
    let animId = 0;
    let running = true;
    let visible = document.visibilityState === "visible";

    function tick() {
      if (!running) return;
      animId = requestAnimationFrame(tick);
      if (!visible) return;

      t += 0.001;
      const p = geo.attributes.position.array as Float32Array;
      if (!reduce) {
        for (let i = 0; i < N; i++) {
          p[i * 3] += vel[i * 3];
          p[i * 3 + 1] += vel[i * 3 + 1];
          if (p[i * 3] > 65) p[i * 3] = -65;
          if (p[i * 3] < -65) p[i * 3] = 65;
          if (p[i * 3 + 1] > 42) p[i * 3 + 1] = -42;
          if (p[i * 3 + 1] < -42) p[i * 3 + 1] = 42;
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = 0.28 + Math.sin(t * 0.8) * 0.07;
      }
      renderer.render(scene, camera);
    }

    tick();

    const handleResize = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    const handleVisibility = () => {
      visible = document.visibilityState === "visible";
    };
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
    };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    try {
      cleanup = init();
    } catch (error) {
      console.warn("Fundo 3D indisponível neste navegador:", error);
      canvasRef.current?.setAttribute("data-webgl", "unavailable");
    }
    return () => cleanup?.();
  }, [init]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
