"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type SceneController = {
  pause: () => void;
  resume: () => void;
  destroy: () => void;
};

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function paletteFor(theme: "light" | "dark") {
  if (theme === "dark") {
    return {
      a: new THREE.Color("#3b82f6"),
      b: new THREE.Color("#8b5cf6"),
      c: new THREE.Color("#60a5fa"),
      line: new THREE.Color("#6d8bff"),
      bgFade: 0.0,
    };
  }
  return {
    a: new THREE.Color("#c8a227"),
    b: new THREE.Color("#3a1a5e"),
    c: new THREE.Color("#b88728"),
    line: new THREE.Color("#9c7a17"),
    bgFade: 0.0,
  };
}

function createRenderer(container: HTMLDivElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const el = renderer.domElement;
  el.style.display = "block";
  el.style.width = "100%";
  el.style.height = "100%";
  el.style.position = "absolute";
  el.style.inset = "0";
  container.appendChild(el);
  return renderer;
}

function disposeScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => m.dispose());
    }
  });
  renderer.dispose();
}

const COUNT = 120;
const LINK_DIST = 1.7;

function createAuroraParticles(container: HTMLDivElement): SceneController {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const renderer = createRenderer(container);
  const clock = new THREE.Clock();
  let theme = readTheme();
  let pal = paletteFor(theme);
  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const positions = new Float32Array(COUNT * 3);
  const velocities = new Float32Array(COUNT * 3);
  const baseColors = new Float32Array(COUNT * 3);
  const phases = new Float32Array(COUNT);

  const bounds = { w: 8, h: 5 };
  for (let i = 0; i < COUNT; i += 1) {
    positions[i * 3] = (Math.random() - 0.5) * bounds.w * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * bounds.h * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    velocities[i * 3] = (Math.random() - 0.5) * 0.12;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.12;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    phases[i] = Math.random() * Math.PI * 2;
    const mix = Math.random();
    const c = pal.a.clone().lerp(pal.b, mix);
    baseColors[i * 3] = c.r;
    baseColors[i * 3 + 1] = c.g;
    baseColors[i * 3 + 2] = c.b;
  }

  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointsGeo.setAttribute("color", new THREE.BufferAttribute(baseColors, 3));
  const pointsMat = new THREE.PointsMaterial({
    size: 0.085,
    transparent: true,
    opacity: 0.92,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const points = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  const maxLinks = COUNT * 6;
  const linePositions = new Float32Array(maxLinks * 6);
  const lineColors = new Float32Array(maxLinks * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
  lineGeo.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  const pointer = new THREE.Vector2(99, 99);
  const pointerWorld = new THREE.Vector3(99, 99, 0);
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const ndc = new THREE.Vector2();

  function updatePointer(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    ndc.y = -(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
    ray.setFromCamera(ndc, camera);
    ray.ray.intersectPlane(plane, pointerWorld);
    pointer.copy(ndc);
  }
  function clearPointer() {
    pointerWorld.set(99, 99, 0);
  }

  function repaint() {
    pal = paletteFor(theme);
    for (let i = 0; i < COUNT; i += 1) {
      const mix = (Math.sin(phases[i] * 2) + 1) * 0.5;
      const c = pal.a.clone().lerp(pal.b, mix);
      baseColors[i * 3] = c.r;
      baseColors[i * 3 + 1] = c.g;
      baseColors[i * 3 + 2] = c.b;
    }
    (pointsGeo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  }

  let resizeTimer = 0;
  function resize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(w, h);
      const vAt = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.abs(camera.position.z);
      bounds.h = vAt;
      bounds.w = vAt * camera.aspect;
    }, 120);
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

  const tmpColor = new THREE.Color();
  function render() {
    framePending = false;
    if (destroyed || paused) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = reduced ? 1 : clock.elapsedTime;

    const posAttr = pointsGeo.getAttribute("position") as THREE.BufferAttribute;
    const pointerActive = pointerWorld.x < 50;

    for (let i = 0; i < COUNT; i += 1) {
      const ix = i * 3;
      let x = positions[ix];
      let y = positions[ix + 1];
      let z = positions[ix + 2];
      // organic drift
      x += velocities[ix] * (reduced ? 0 : 1) + Math.sin(t * 0.3 + phases[i]) * 0.002;
      y += velocities[ix + 1] * (reduced ? 0 : 1) + Math.cos(t * 0.26 + phases[i]) * 0.002;
      z += velocities[ix + 2] * (reduced ? 0 : 1);

      // pointer repulsion
      if (pointerActive) {
        const dx = x - pointerWorld.x;
        const dy = y - pointerWorld.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 2.2 && d2 > 0.0001) {
          const f = (1 - Math.sqrt(d2) / 1.5) * 0.05;
          const inv = 1 / Math.sqrt(d2);
          x += dx * inv * f;
          y += dy * inv * f;
        }
      }

      // wrap around bounds
      if (x > bounds.w) x = -bounds.w;
      if (x < -bounds.w) x = bounds.w;
      if (y > bounds.h) y = -bounds.h;
      if (y < -bounds.h) y = bounds.h;

      positions[ix] = x;
      positions[ix + 1] = y;
      positions[ix + 2] = z;
    }
    posAttr.needsUpdate = true;

    // build links
    let li = 0;
    for (let i = 0; i < COUNT && li < maxLinks; i += 1) {
      const ax = positions[i * 3];
      const ay = positions[i * 3 + 1];
      const az = positions[i * 3 + 2];
      for (let j = i + 1; j < COUNT && li < maxLinks; j += 1) {
        const bx = positions[j * 3];
        const by = positions[j * 3 + 1];
        const bz = positions[j * 3 + 2];
        const dx = ax - bx;
        const dy = ay - by;
        const dz = az - bz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < LINK_DIST) {
          const strength = 1 - dist / LINK_DIST;
          linePositions[li * 6] = ax;
          linePositions[li * 6 + 1] = ay;
          linePositions[li * 6 + 2] = az;
          linePositions[li * 6 + 3] = bx;
          linePositions[li * 6 + 4] = by;
          linePositions[li * 6 + 5] = bz;
          tmpColor.copy(pal.line).multiplyScalar(strength);
          for (let k = 0; k < 2; k += 1) {
            lineColors[li * 6 + k * 3] = tmpColor.r;
            lineColors[li * 6 + k * 3 + 1] = tmpColor.g;
            lineColors[li * 6 + k * 3 + 2] = tmpColor.b;
          }
          li += 1;
        }
      }
    }
    // zero out unused tail to avoid stray segments
    for (let k = li; k < maxLinks; k += 1) {
      linePositions[k * 6] = 0;
      linePositions[k * 6 + 1] = 0;
      linePositions[k * 6 + 2] = 0;
      linePositions[k * 6 + 3] = 0;
      linePositions[k * 6 + 4] = 0;
      linePositions[k * 6 + 5] = 0;
    }
    (lineGeo.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (lineGeo.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;

    camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * 0.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    requestFrame();
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", updatePointer, { passive: true });
  window.addEventListener("pointerleave", clearPointer);

  const themeObserver = new MutationObserver(() => {
    const next = readTheme();
    if (next !== theme) {
      theme = next;
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
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("pointerleave", clearPointer);
      themeObserver.disconnect();
      disposeScene(scene, renderer);
      renderer.domElement.remove();
    },
  };
}

export default function AuroraParticles({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const el = containerRef.current;
    let controller: SceneController;
    try {
      controller = createAuroraParticles(el);
    } catch (err) {
      console.warn("AuroraParticles indisponível:", err);
      return undefined;
    }
    let inView = true;
    let visible = document.visibilityState === "visible";
    const sync = () => (inView && visible ? controller.resume() : controller.pause());
    const io =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([e]) => { inView = e?.isIntersecting ?? true; sync(); }, { rootMargin: "120px", threshold: 0.01 })
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

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}
