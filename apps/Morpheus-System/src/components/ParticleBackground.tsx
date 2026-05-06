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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    const N = 180;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);

    const pal = [
      new THREE.Color("#c4b5fd"),
      new THREE.Color("#7dd3fc"),
      new THREE.Color("#fda4af"),
      new THREE.Color("#6ee7b7"),
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
    let animId: number;

    function tick() {
      animId = requestAnimationFrame(tick);
      t += 0.001;
      const p = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < N; i++) {
        p[i * 3] += vel[i * 3];
        p[i * 3 + 1] += vel[i * 3 + 1];
        if (p[i * 3] > 65) p[i * 3] = -65;
        if (p[i * 3] < -65) p[i * 3] = 65;
        if (p[i * 3 + 1] > 42) p[i * 3 + 1] = -42;
        if (p[i * 3 + 1] < -42) p[i * 3 + 1] = 42;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 0.3 + Math.sin(t * 0.8) * 0.09;
      renderer.render(scene, camera);
    }

    tick();

    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
    };
  }, []);

  useEffect(() => {
    const cleanup = init();
    return () => cleanup?.();
  }, [init]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}
