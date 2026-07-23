"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type SceneController = { pause: () => void; resume: () => void; destroy: () => void };

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function paletteFor(theme: "light" | "dark") {
  return theme === "dark"
    ? [new THREE.Color("#3b82f6"), new THREE.Color("#8b5cf6"), new THREE.Color("#60a5fa"), new THREE.Color("#a78bfa")]
    : [new THREE.Color("#c8a227"), new THREE.Color("#3a1a5e"), new THREE.Color("#b88728"), new THREE.Color("#5b2d8f")];
}

function createAppBackdrop(container: HTMLDivElement): SceneController {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const el = renderer.domElement;
  el.style.cssText = "display:block;width:100%;height:100%;position:absolute;inset:0;";
  container.appendChild(el);

  const clock = new THREE.Clock();
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let theme = readTheme();
  let pal = paletteFor(theme);

  const COUNT = reduced ? 28 : 64;
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const phases = new Float32Array(COUNT);
  const drift = new Float32Array(COUNT * 3);

  const bounds = { w: 14, h: 9 };
  for (let i = 0; i < COUNT; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * bounds.w * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * bounds.h * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    drift[i * 3] = (Math.random() - 0.5) * 0.05;
    drift[i * 3 + 1] = (Math.random() - 0.5) * 0.04;
    drift[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    sizes[i] = 0.6 + Math.random() * 1.8;
    phases[i] = Math.random() * Math.PI * 2;
    const c = pal[i % pal.length];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 1.4,
    vertexColors: true,
    transparent: true,
    opacity: reduced ? 0.16 : 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  scene.add(new THREE.Points(geo, mat));

  const pointer = new THREE.Vector2(0, 0);
  const camTarget = new THREE.Vector3(0, 0, 12);
  function onPointer(e: PointerEvent) {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    pointer.set((e.clientX / w) * 2 - 1, (e.clientY / h) * 2 - 1);
  }
  function clearPointer() {
    pointer.set(0, 0);
  }

  function repaint() {
    for (let i = 0; i < COUNT; i += 1) {
      const c = pal[i % pal.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    (geo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  }

  let resizeTimer = 0;
  function resize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(w, h);
      const vAt = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      bounds.h = vAt;
      bounds.w = vAt * camera.aspect;
    }, 140);
  }

  let rafId = 0;
  let destroyed = false;
  let paused = false;
  let framePending = false;
  function requestFrame() {
    if (destroyed || paused || framePending) return;
    framePending = true;
    rafId = window.requestAnimationFrame(render);
  }
  function render() {
    framePending = false;
    if (destroyed || paused) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = reduced ? 0 : clock.elapsedTime;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i += 1) {
      const ix = i * 3;
      pos[ix] += drift[ix] * (reduced ? 0 : 1) + Math.sin(t * 0.12 + phases[i]) * 0.002;
      pos[ix + 1] += drift[ix + 1] * (reduced ? 0 : 1) + Math.cos(t * 0.1 + phases[i]) * 0.002;
      pos[ix + 2] += drift[ix + 2] * (reduced ? 0 : 1);
      if (pos[ix] > bounds.w) pos[ix] = -bounds.w;
      if (pos[ix] < -bounds.w) pos[ix] = bounds.w;
      if (pos[ix + 1] > bounds.h) pos[ix + 1] = -bounds.h;
      if (pos[ix + 1] < -bounds.h) pos[ix + 1] = bounds.h;
    }
    geo.attributes.position.needsUpdate = true;
    // gentle parallax
    camTarget.x = pointer.x * 1.1;
    camTarget.y = pointer.y * 0.8;
    camera.position.x += (camTarget.x - camera.position.x) * 0.03;
    camera.position.y += (camTarget.y - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
    requestFrame();
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("pointerleave", clearPointer);
  const themeObserver = new MutationObserver(() => {
    const next = readTheme();
    if (next !== theme) {
      theme = next;
      pal = paletteFor(theme);
      repaint();
    }
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  requestFrame();

  return {
    pause: () => {
      paused = true;
      if (framePending) {
        window.cancelAnimationFrame(rafId);
        framePending = false;
      }
    },
    resume: () => {
      if (destroyed) return;
      paused = false;
      clock.getDelta();
      requestFrame();
    },
    destroy: () => {
      destroyed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", clearPointer);
      themeObserver.disconnect();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

export default function AppBackdrop({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    const el = ref.current;
    let controller: SceneController;
    try {
      controller = createAppBackdrop(el);
    } catch (err) {
      console.warn("AppBackdrop indisponível:", err);
      return undefined;
    }
    let inView = true;
    let visible = document.visibilityState === "visible";
    const sync = () => (inView && visible ? controller.resume() : controller.pause());
    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([e]) => { inView = e?.isIntersecting ?? true; sync(); }, { threshold: 0.01 })
        : null;
    const onVis = () => { visible = document.visibilityState === "visible"; sync(); };
    io?.observe(el);
    document.addEventListener("visibilitychange", onVis);
    sync();
    return () => {
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      controller.destroy();
    };
  }, []);

  return <div ref={ref} className={className} aria-hidden="true" />;
}
