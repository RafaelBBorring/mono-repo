"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import * as THREE from "three";
import type { Psychologist, Reservation, Room } from "@/types";
import { DoorOpen, MousePointer2, ZoomIn, ZoomOut, Maximize, X, CalendarPlus, Clock, Hand, RotateCcw } from "lucide-react";

type Mode = "interactive" | "preview";

type RoomStatus = {
  room: Room;
  busy: boolean;
  current?: Reservation;
  next?: Reservation;
  today: Reservation[];
};

type RoomRig = {
  group: THREE.Group;
  glow: THREE.Mesh;
  spot: THREE.SpotLight;
  accent: string;
};

type SceneController = {
  pause: () => void;
  resume: () => void;
  destroy: () => void;
  zoomBy: (factor: number) => void;
  resetView: () => void;
};

const ROOM_W = 2.7;
const ROOM_D = 2.3;
const WALL_H = 1.5;
const GAP_X = 6.4;
const GAP_Z = 5.9;

type ScenePalette = {
  bg: string;
  fog: string;
  floor: string;
  floorRough: number;
  floorMetal: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  ambient: string;
  ambientIntensity: number;
  keyColor: string;
  keyIntensity: number;
  fillColor: string;
  fillIntensity: number;
  wallBack: string;
  wallLeft: string;
  pad: string;
  labelBg: string;
  labelText: string;
};

const DARK_PALETTE: ScenePalette = {
  bg: "#0b1110",
  fog: "#0b1110",
  floor: "#0a1310",
  floorRough: 0.48,
  floorMetal: 0.55,
  hemiSky: "#e9f4ef",
  hemiGround: "#2a2018",
  hemiIntensity: 0.9,
  ambient: "#ffffff",
  ambientIntensity: 0.35,
  keyColor: "#fff1d8",
  keyIntensity: 2.1,
  fillColor: "#a9d6e5",
  fillIntensity: 0.7,
  wallBack: "#efe7d6",
  wallLeft: "#e4dac6",
  pad: "#cdb78f",
  labelBg: "rgba(10,18,15,.9)",
  labelText: "#ffffff",
};

const LIGHT_PALETTE: ScenePalette = {
  bg: "#f1ead7",
  fog: "#efe7d2",
  floor: "#e7dcc0",
  floorRough: 0.62,
  floorMetal: 0.28,
  hemiSky: "#ffffff",
  hemiGround: "#d8c9a0",
  hemiIntensity: 1.05,
  ambient: "#fff4dd",
  ambientIntensity: 0.5,
  keyColor: "#fff1d8",
  keyIntensity: 1.7,
  fillColor: "#bcd4ff",
  fillIntensity: 0.55,
  wallBack: "#fbf6ea",
  wallLeft: "#f3ecdb",
  pad: "#d8c79c",
  labelBg: "rgba(255,253,247,.92)",
  labelText: "#20143b",
};

function readTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function paletteFor(theme: "light" | "dark"): ScenePalette {
  return theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
}

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function layoutPosition(index: number, total: number) {
  const perRow = total <= 2 ? total : total <= 9 ? 3 : 4;
  const col = index % perRow;
  const row = Math.floor(index / perRow);
  const rows = Math.ceil(total / perRow);
  const x = (col - (perRow - 1) / 2) * GAP_X;
  const z = (row - (rows - 1) / 2) * GAP_Z;
  return { x, z };
}

function disposeMaterial(material: THREE.Material) {
  Object.values(material as unknown as Record<string, unknown>).forEach((value) => {
    if (value instanceof THREE.Texture) value.dispose();
  });
  material.dispose();
}

function disposeScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(disposeMaterial);
    }
  });
  renderer.dispose();
}

function createRenderer(container: HTMLDivElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const el = renderer.domElement;
  el.style.display = "block";
  el.style.width = "100%";
  el.style.height = "100%";
  container.appendChild(el);
  return renderer;
}

function buildRoomRig(status: RoomStatus, index: number, total: number, pal: ScenePalette): RoomRig {
  const accent = status.room.lightHex || status.room.hex;
  const { x, z } = layoutPosition(index, total);
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const add = (mesh: THREE.Mesh, ry = 0) => {
    mesh.userData.roomIndex = index;
    if (ry) mesh.rotation.y = ry;
    group.add(mesh);
    return mesh;
  };
  const box = (w: number, h: number, d: number, color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, ...opts })
    );
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  // glow ring
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(1.45, 1.78, 64),
    new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(0, -0.42, 0);
  glow.userData.roomIndex = index;
  group.add(glow);

  // spotlight from above
  const spot = new THREE.SpotLight(accent, 0, 6, Math.PI / 5.4, 0.9, 1.2);
  spot.position.set(0, 3.4, 0);
  spot.userData.roomIndex = index;
  group.add(spot);

  // floor pad
  const pad = box(ROOM_W, 0.14, ROOM_D, pal.pad, { roughness: 0.74, metalness: 0.04 });
  pad.position.set(0, -0.35, 0);
  add(pad);

  // back + left walls
  const back = box(ROOM_W, WALL_H, 0.12, pal.wallBack, { roughness: 0.92 });
  back.position.set(0, WALL_H / 2 - 0.35, -ROOM_D / 2);
  add(back);
  const left = box(0.12, WALL_H, ROOM_D, pal.wallLeft, { roughness: 0.92 });
  left.position.set(-ROOM_W / 2, WALL_H / 2 - 0.35, 0);
  add(left);

  // window (emissive) + frame
  const win = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 0.6),
    new THREE.MeshStandardMaterial({ color: "#cfe6ff", emissive: "#bfe0ff", emissiveIntensity: 1.6, toneMapped: false })
  );
  win.position.set(-0.55, 0.55, -ROOM_D / 2 + 0.07);
  add(win);
  const frameH = box(1.12, 0.07, 0.07, "#fff6e6", { roughness: 0.6 });
  frameH.position.set(-0.55, 0.85, -ROOM_D / 2 + 0.08);
  add(frameH);
  const frameV = box(0.07, 0.74, 0.07, "#fff6e6", { roughness: 0.6 });
  frameV.position.set(-0.55, 0.5, -ROOM_D / 2 + 0.08);
  add(frameV);

  // door (accent)
  const door = box(0.1, 1.05, 0.56, accent, { emissive: accent, emissiveIntensity: 0.24, roughness: 0.5, metalness: 0.1 });
  door.position.set(-ROOM_W / 2 + 0.02, 0.17, 0.7);
  add(door);

  // therapy couch
  const seat = box(1.15, 0.22, 0.5, "#5f7d86", { roughness: 0.85 });
  seat.position.set(0.25, -0.12, -0.55);
  add(seat);
  const backrest = box(1.15, 0.42, 0.16, "#6e8d96", { roughness: 0.85 });
  backrest.position.set(0.25, 0.06, -0.78);
  add(backrest);
  const cushion = box(0.5, 0.12, 0.42, "#7a98a0", { roughness: 0.82 });
  cushion.position.set(-0.02, -0.02, -0.55);
  add(cushion);

  // side table + plant
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, 20), new THREE.MeshStandardMaterial({ color: "#8a6f4e", roughness: 0.7 }));
  table.position.set(-0.82, -0.14, -0.5);
  add(table);
  const leaf = (r: number, y: number, c: string) => {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true }));
    m.position.set(-0.82, y, -0.5);
    add(m);
  };
  leaf(0.2, 0.12, "#5fa572");
  leaf(0.13, 0.3, "#74c187");

  // rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), new THREE.MeshStandardMaterial({ color: accent, roughness: 0.95, transparent: true, opacity: 0.22 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.25, -0.275, -0.5);
  rug.receiveShadow = true;
  add(rug);

  // pendant
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6), new THREE.MeshStandardMaterial({ color: "#3a3a3a" }));
  cord.position.set(0, 1.12, 0);
  add(cord);
  const shade = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: "#fff2d6", emissive: "#ffd9a0", emissiveIntensity: 1.2, toneMapped: false })
  );
  shade.position.set(0, 0.92, 0);
  add(shade);
  const pendant = new THREE.PointLight("#ffd9a0", 1.1, 3, 2);
  pendant.position.set(0, 0.86, 0);
  group.add(pendant);

  // status orb
  const statusColor = status.busy ? "#e07a64" : "#6fcf97";
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 12),
    new THREE.MeshStandardMaterial({ color: statusColor, emissive: statusColor, emissiveIntensity: status.busy ? 1.5 : 0.9, toneMapped: false })
  );
  orb.position.set(0, 1.18, -ROOM_D / 2 + 0.16);
  add(orb);

  return { group, glow, spot, accent };
}

function statusLine(status: RoomStatus) {
  if (status.busy && status.current) return `Até ${status.current.endTime}`;
  if (status.next) return `Próx. ${status.next.startTime}`;
  return "Livre agora";
}

function createClinicScene(
  mount: HTMLDivElement,
  labelsEl: HTMLDivElement,
  mode: Mode,
  statuses: RoomStatus[],
  onSelect: (status: RoomStatus) => void,
  onHoverChange: (active: boolean) => void,
  enableWheelZoom = true,
  theme: "light" | "dark" = "dark",
  customPositions: Record<number, { x: number; z: number }> = {},
  onRoomMove?: (roomId: number, x: number, z: number) => void,
  highlightRef?: { current: number | null }
): SceneController {
  const pal = paletteFor(theme);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(pal.bg);
  scene.fog = new THREE.Fog(pal.fog, 18, 38);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(8.2, 6.8, 9.6);
  camera.lookAt(0, 0.3, 0);

  // fixed-angle camera: only distance (zoom) and target (2D pan) change
  const up = new THREE.Vector3(0, 1, 0);
  const camDir = new THREE.Vector3(8.2, 6.5, 9.6).normalize();
  const camTarget = new THREE.Vector3(0, 0.3, 0);
  const DEFAULT_DIST = 15.6;
  let camDistance = DEFAULT_DIST;
  const MIN_DIST = 8.5;
  const MAX_DIST = 30;
  const PAN_LIMIT = 16;
  const right = new THREE.Vector3();
  const into = new THREE.Vector3();
  function applyCamera() {
    camera.position.copy(camTarget).addScaledVector(camDir, camDistance);
    camera.lookAt(camTarget);
  }
  applyCamera();

  const renderer = createRenderer(mount);
  const clock = new THREE.Clock();
  const reduced = reduceMotion();

  // lights
  scene.add(new THREE.HemisphereLight(pal.hemiSky, pal.hemiGround, pal.hemiIntensity));
  scene.add(new THREE.AmbientLight(pal.ambient, pal.ambientIntensity));
  const key = new THREE.DirectionalLight(pal.keyColor, pal.keyIntensity);
  key.position.set(6, 11, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 14;
  key.shadow.camera.bottom = -14;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const fill = new THREE.DirectionalLight(pal.fillColor, pal.fillIntensity);
  fill.position.set(-5, 4, -4);
  scene.add(fill);

  // glossy floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.MeshStandardMaterial({ color: pal.floor, roughness: pal.floorRough, metalness: pal.floorMetal })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.64;
  floor.receiveShadow = true;
  scene.add(floor);

  // rooms
  const root = new THREE.Group();
  scene.add(root);
  const ROOM_LIMIT = PAN_LIMIT * 1.15;
  const rigs = statuses.map((status, index) => {
    const rig = buildRoomRig(status, index, statuses.length, pal);
    const custom = customPositions[status.room.id];
    if (custom) {
      rig.group.position.set(
        THREE.MathUtils.clamp(custom.x, -ROOM_LIMIT, ROOM_LIMIT),
        0,
        THREE.MathUtils.clamp(custom.z, -ROOM_LIMIT, ROOM_LIMIT)
      );
    }
    root.add(rig.group);
    return rig;
  });

  // labels (DOM)
  const labelNodes = statuses.map((status, index) => {
    const el = document.createElement("div");
    const isDark = theme === "dark";
    const border = isDark ? "rgba(255,255,255,.14)" : "rgba(58,26,94,.16)";
    const shadow = isDark ? "0 10px 30px rgba(0,0,0,.4)" : "0 10px 30px rgba(58,26,94,.16)";
    el.style.cssText =
      "position:absolute;left:0;top:0;transform:translate(-50%,-50%);pointer-events:none;will-change:transform,opacity;" +
      "min-width:150px;padding:7px 12px;border-radius:14px;border:1px solid " + border + ";" +
      "background:" + pal.labelBg + ";backdrop-filter:blur(10px);text-align:center;color:" + pal.labelText + ";box-shadow:" + shadow + ";" +
      "font-family:inherit;transition:transform .18s ease,opacity .2s ease;transform-origin:center;";
    const accent = status.room.lightHex || status.room.hex;
    const busy = status.busy;
    const dot = busy ? "#f07167" : "#70d39a";
    const txt = busy ? "#f4a394" : "#9ed6b1";
    el.innerHTML =
      `<div style="font-weight:600;font-size:14px;line-height:1.1;white-space:nowrap">${status.room.name}</div>` +
      `<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:2px;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${txt}">` +
      `<span style="width:6px;height:6px;border-radius:50%;background:${dot}"></span>${statusLine(status)}</div>`;
    el.dataset.idx = String(index);
    labelsEl.appendChild(el);
    return el;
  });

  // interaction: 2D pan + zoom + hover + click + press-hold-to-drag a room (interactive only)
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-10, -10);
  let hoveredIndex = -1;
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let lastY = 0;
  let downOnCanvas = false;
  let moved = 0;
  let dragging = false;
  // room drag (press-and-hold) state
  let roomDownIndex = -1;
  let roomDragIndex = -1;
  let roomDragging = false;
  let holdTimer = 0;
  let lastMoveEmit = 0;
  const HOLD_MS = 360;
  const MOVE_LIMIT = ROOM_LIMIT;

  function commitRoomPosition(idx: number) {
    if (!onRoomMove) return;
    const rig = rigs[idx];
    if (!rig) return;
    onRoomMove(statuses[idx].room.id, rig.group.position.x, rig.group.position.z);
  }

  function enterRoomDrag(idx: number) {
    roomDragIndex = idx;
    roomDragging = true;
    dragging = true;
    renderer.domElement.style.cursor = "grabbing";
    onHoverChange(false);
  }

  function setNdc(event: PointerEvent) {
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
    ndc.y = -(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
  }
  function pickRoom(): number {
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(root, true);
    for (const hit of hits) {
      const idx = hit.object.userData.roomIndex;
      if (typeof idx === "number") return idx;
    }
    return -1;
  }

  function onPointerMove(event: PointerEvent) {
    if (mode !== "interactive") return;
    setNdc(event);
    if (roomDragging && roomDragIndex >= 0) {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      const rect = renderer.domElement.getBoundingClientRect();
      const h = Math.max(rect.height, 1);
      const worldPerPx = (2 * camDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h;
      right.crossVectors(camDir, up).normalize();
      into.set(-camDir.x, 0, -camDir.z).normalize();
      const rig = rigs[roomDragIndex];
      if (rig) {
        rig.group.position.x = THREE.MathUtils.clamp(rig.group.position.x + dx * worldPerPx, -MOVE_LIMIT, MOVE_LIMIT);
        rig.group.position.z = THREE.MathUtils.clamp(rig.group.position.z + dy * worldPerPx, -MOVE_LIMIT, MOVE_LIMIT);
        const now = performance.now();
        if (onRoomMove && now - lastMoveEmit > 90) {
          lastMoveEmit = now;
          commitRoomPosition(roomDragIndex);
        }
      }
      return;
    }
    if (downOnCanvas) {
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      moved += Math.hypot(dx, dy);
      if (moved > 4) {
        // começou a mover antes do press-hold disparar → cancela hold (vira pan/click-arrastado)
        if (holdTimer) { window.clearTimeout(holdTimer); holdTimer = 0; }
        dragging = true;
        renderer.domElement.style.cursor = "grabbing";
        onHoverChange(false);
        const rect = renderer.domElement.getBoundingClientRect();
        const h = Math.max(rect.height, 1);
        const worldPerPx = (2 * camDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / h;
        right.crossVectors(camDir, up).normalize();
        into.set(-camDir.x, 0, -camDir.z).normalize();
        camTarget.addScaledVector(right, dx * worldPerPx);
        camTarget.addScaledVector(into, dy * worldPerPx);
        camTarget.x = THREE.MathUtils.clamp(camTarget.x, -PAN_LIMIT, PAN_LIMIT);
        camTarget.z = THREE.MathUtils.clamp(camTarget.z, -PAN_LIMIT, PAN_LIMIT);
        applyCamera();
      }
    }
  }
  function onPointerDown(event: PointerEvent) {
    if (mode !== "interactive") return;
    downOnCanvas = true;
    dragging = false;
    roomDragging = false;
    moved = 0;
    downX = lastX = event.clientX;
    downY = lastY = event.clientY;
    setNdc(event);
    const idx = pickRoom();
    roomDownIndex = idx;
    if (idx >= 0 && onRoomMove) {
      if (holdTimer) window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(() => { holdTimer = 0; enterRoomDrag(idx); }, HOLD_MS);
    }
  }
  function onPointerUp(event: PointerEvent) {
    if (mode !== "interactive" || !downOnCanvas) return;
    if (holdTimer) { window.clearTimeout(holdTimer); holdTimer = 0; }
    downOnCanvas = false;
    if (roomDragging) {
      if (roomDragIndex >= 0) commitRoomPosition(roomDragIndex);
      roomDragIndex = -1;
      roomDragging = false;
      dragging = false;
      renderer.domElement.style.cursor = "grab";
      return;
    }
    const wasDrag = dragging || Math.hypot(event.clientX - downX, event.clientY - downY) > 6;
    dragging = false;
    if (wasDrag) return;
    setNdc(event);
    const idx = pickRoom();
    if (idx >= 0) onSelect(statuses[idx]);
  }
  function onWheel(event: WheelEvent) {
    if (mode !== "interactive" || !enableWheelZoom) return;
    // só captura o gesto quando o usuário quer ampliar a cena:
    // Ctrl/Cmd+wheel, ou pinch do trackpad (que sintetiza ctrlKey=true).
    // caso contrário deixamos o evento fluir para rolar a página.
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    camDistance = THREE.MathUtils.clamp(camDistance + event.deltaY * 0.012, MIN_DIST, MAX_DIST);
    applyCamera();
  }
  function onPointerLeave() {
    ndc.set(-10, -10);
    if (holdTimer) { window.clearTimeout(holdTimer); holdTimer = 0; }
    if (roomDragging && roomDragIndex >= 0) commitRoomPosition(roomDragIndex);
    roomDragIndex = -1;
    roomDragging = false;
    downOnCanvas = false;
    dragging = false;
  }

  if (mode === "interactive") {
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    if (enableWheelZoom) {
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });
    }
  }

  const proj = new THREE.Vector3();
  let rafId = 0;
  let resizeTimer = 0;
  let destroyed = false;
  let paused = false;
  let framePending = false;

  function resize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(w, h);
    }, 120);
  }

  function requestFrame() {
    if (destroyed || paused || framePending) return;
    framePending = true;
    rafId = window.requestAnimationFrame(render);
  }

  function render() {
    framePending = false;
    if (destroyed || paused) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = reduced ? 1.4 : clock.elapsedTime;

    // hover pick
    if (mode === "interactive" && !dragging) {
      const idx = ndc.x < -2 ? -1 : pickRoom();
      if (idx !== hoveredIndex) {
        hoveredIndex = idx;
        onHoverChange(idx >= 0);
        renderer.domElement.style.cursor = idx >= 0 ? "pointer" : "grab";
      }
    }

    rigs.forEach((rig, i) => {
      const isDrag = i === roomDragIndex;
      const isHighlight = highlightRef && highlightRef.current != null && statuses[i].room.id === highlightRef.current;
      const active = isDrag || isHighlight || i === hoveredIndex;
      const target = isDrag ? 1.12 : isHighlight ? 1.1 + Math.sin(time * 4) * 0.02 : active ? 1.07 : 1;
      const s = THREE.MathUtils.damp(rig.group.scale.x, target, 8, dt);
      rig.group.scale.setScalar(s);
      const yTarget = isDrag ? 0.32 : isHighlight ? 0.28 + Math.sin(time * 4) * 0.04 : active ? 0.16 : 0;
      rig.group.position.y = THREE.MathUtils.damp(rig.group.position.y, yTarget, 8, dt);
      if (mode === "interactive") {
        rig.group.rotation.y = Math.sin(time * 0.3 + i) * 0.02;
      }
      const mat = rig.glow.material as THREE.MeshBasicMaterial;
      const pulse = 0.5 + Math.sin(time * 3) * 0.25;
      const highlightPulse = isHighlight ? 0.7 + Math.sin(time * 6) * 0.3 : 0;
      mat.opacity = THREE.MathUtils.damp(mat.opacity, isHighlight ? highlightPulse : active ? pulse : 0, 9, dt);
      const rs = THREE.MathUtils.damp(rig.glow.scale.x, isHighlight ? 1.3 + Math.sin(time * 5) * 0.08 : active ? 1.12 : 0.92, 9, dt);
      rig.glow.scale.setScalar(rs);
      rig.spot.intensity = THREE.MathUtils.damp(rig.spot.intensity, isHighlight ? 20 : active ? 14 : 0, 9, dt);
    });

    // labels projection
    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    rigs.forEach((rig, i) => {
      const el = labelNodes[i];
      proj.set(rig.group.position.x, 1.55, rig.group.position.z).project(camera);
      const sx = (proj.x * 0.5 + 0.5) * w;
      const sy = (-proj.y * 0.5 + 0.5) * h;
      const visible = proj.z < 1 && proj.z > -1;
      const active = i === hoveredIndex;
      const sc = active ? 1.12 : 1;
      el.style.opacity = visible ? "1" : "0";
      el.style.transform = `translate(-50%,-50%) translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) scale(${sc})`;
    });

    renderer.render(scene, camera);
    requestFrame();
  }

  resize();
  window.addEventListener("resize", resize);
  const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(() => resize()) : null;
  resizeObserver?.observe(mount);
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
    zoomBy: (factor: number) => {
      camDistance = THREE.MathUtils.clamp(camDistance * factor, MIN_DIST, MAX_DIST);
      applyCamera();
    },
    resetView: () => {
      camDistance = DEFAULT_DIST;
      camTarget.set(0, 0.3, 0);
      applyCamera();
    },
    destroy: () => {
      destroyed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", resize);
      resizeObserver?.disconnect();
      if (mode === "interactive") {
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
        if (enableWheelZoom) renderer.domElement.removeEventListener("wheel", onWheel);
      }
      labelNodes.forEach((el) => el.remove());
      disposeScene(scene, renderer);
      renderer.domElement.remove();
    },
  };
}

function buildStatuses(rooms: Room[], reservations: Reservation[], date: string): RoomStatus[] {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return rooms.map((room) => {
    const today = reservations
      .filter((r) => r.roomId === room.id && r.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    const current = today.find((r) => r.startTime <= currentTime && r.endTime > currentTime);
    const next = today.find((r) => r.startTime > currentTime);
    return { room, busy: Boolean(current), current, next, today };
  });
}

function psychLabel(psychologists: Psychologist[] | undefined, psychId: number) {
  const p = psychologists?.find((x) => x.id === psychId);
  return p ? p.shortName || p.initials || p.name : "Profissional";
}

function RoomDetailPanel({
  status,
  psychologists,
  onBook,
  onClose,
  demo = false,
}: {
  status: RoomStatus;
  psychologists?: Psychologist[];
  onBook: () => void;
  onClose: () => void;
  demo?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div className="absolute inset-0 z-30 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border-light)] bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xl"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border-light)] px-6 py-5" style={{ background: `linear-gradient(135deg, ${status.room.lightHex || status.room.hex}26, transparent)` }}>
          <div>
            <p className="font-body text-[11px] font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">Sala</p>
            <h3 className="font-brand text-2xl font-semibold">{status.room.name}</h3>
            <span className="mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1 font-body text-xs font-extrabold uppercase tracking-[0.12em]" style={{ color: status.busy ? "#f4a394" : "#9ed6b1", background: status.busy ? "rgba(224,122,100,.16)" : "rgba(111,207,151,.16)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: status.busy ? "#f07167" : "#70d39a" }} />
              {status.busy && status.current ? `Ocupada até ${status.current.endTime}` : "Livre agora"}
            </span>
          </div>
          <button onClick={onClose} className="rounded-xl border border-[var(--border-light)] bg-[var(--glass-soft)] p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[44vh] overflow-y-auto px-6 py-5">
          <p className="mb-3 flex items-center gap-2 font-body text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]"><Clock size={14} /> Agenda de hoje</p>
          {status.today.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[var(--border-medium)] px-4 py-6 text-center font-body text-sm text-[var(--text-muted)]">Nenhuma reserva para esta sala hoje.</p>
          ) : (
            <ul className="space-y-2">
              {status.today.map((r) => {
                const isCurrent = status.current?.id === r.id;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: isCurrent ? "rgba(224,122,100,.5)" : "var(--border-light)", background: isCurrent ? "rgba(224,122,100,.12)" : "var(--glass-soft)" }}>
                    <span className="min-w-0">
                      <span className="block font-brand text-sm font-semibold">{psychLabel(psychologists, r.psychId)}</span>
                      <span className="block font-body text-xs text-[var(--text-muted)]">{r.notes || "Sem observações"}</span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-[var(--bg-deep)] px-2.5 py-1 font-mono text-xs font-bold tracking-tight">{r.startTime}–{r.endTime}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {status.next && (
            <p className="mt-4 rounded-2xl bg-[var(--glass-soft)] px-4 py-3 font-body text-xs text-[var(--text-soft)]">Próxima reserva: <strong className="text-[var(--text-primary)]">{psychLabel(psychologists, status.next.psychId)}</strong> às {status.next.startTime}.</p>
          )}
        </div>
        <div className="border-t border-[var(--border-light)] px-6 py-4">
          {demo ? (
            <p className="text-center font-body text-xs text-[var(--text-muted)]">Ambiente de demonstração — cadastre sua clínica para reservar.</p>
          ) : (
            <button onClick={onBook} className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 font-body text-sm font-extrabold text-white transition hover:brightness-1.08" style={{ background: status.room.lightHex || status.room.hex }}>
              <CalendarPlus size={17} /> Reservar nesta sala
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function useActiveTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => readTheme());
  useEffect(() => {
    const update = () => setTheme(readTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

function ClinicHost({
  mode,
  statuses,
  onSelect,
  onHoverChange,
  className,
  mountClassName,
  enableWheelZoom = true,
  showZoomControls = true,
  customPositions,
  onRoomMove,
  layoutVersion = 0,
  highlightRoomId,
}: {
  mode: Mode;
  statuses: RoomStatus[];
  onSelect: (status: RoomStatus) => void;
  onHoverChange: (active: boolean) => void;
  className?: string;
  mountClassName?: string;
  enableWheelZoom?: boolean;
  showZoomControls?: boolean;
  customPositions?: Record<number, { x: number; z: number }>;
  onRoomMove?: (roomId: number, x: number, z: number) => void;
  layoutVersion?: number;
  highlightRoomId?: number | null;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelsRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<SceneController | null>(null);
  const highlightRef = useRef<number | null>(null);
  const theme = useActiveTheme();

  useEffect(() => {
    highlightRef.current = highlightRoomId ?? null;
  }, [highlightRoomId]);

  // As posições customizadas são aplicadas apenas na criação da cena e atualizadas
  // in-place durante o arraste (sem recriar). Por isso o dataKey depende só de um
  // layoutVersion (que muda apenas no reset), evitando que o commit de cada arraste
  // destrua e reconstrua a cena inteira.
  const dataKey =
    statuses
      .map((s) => `${s.room.id}:${s.today.length}:${s.busy ? 1 : 0}:${s.next?.startTime ?? ""}`)
      .join("|") +
    "@" + theme + "#v=" + layoutVersion;

  useEffect(() => {
    if (!mountRef.current || !labelsRef.current) return undefined;
    const mount = mountRef.current;
    const labelsEl = labelsRef.current;
    let controller: SceneController;
    try {
      controller = createClinicScene(
        mount,
        labelsEl,
        mode,
        statuses,
        onSelect,
        onHoverChange,
        enableWheelZoom,
        theme,
        customPositions,
        onRoomMove,
        highlightRef
      );
    } catch (error) {
      console.warn("Morpheus 3D indisponível neste navegador:", error);
      return undefined;
    }
    controllerRef.current = controller;
    let inViewport = true;
    let docVisible = document.visibilityState === "visible";
    const sync = () => (inViewport && docVisible ? controller.resume() : controller.pause());
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([e]) => { inViewport = e?.isIntersecting ?? true; sync(); }, { rootMargin: "120px", threshold: 0.01 })
        : null;
    const onVis = () => { docVisible = document.visibilityState === "visible"; sync(); };
    observer?.observe(mount);
    document.addEventListener("visibilitychange", onVis);
    sync();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      controller.destroy();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dataKey, theme]);

  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mountRef} className={mountClassName} style={{ position: "absolute", inset: 0 }} />
      <div ref={labelsRef} className={mountClassName} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />
      {showZoomControls && mode === "interactive" && (
        <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => controllerRef.current?.zoomBy(0.82)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-lg backdrop-blur transition hover:bg-[var(--bg-elevated)]"
            title="Aproximar"
            aria-label="Aproximar"
          >
            <ZoomIn size={16} />
          </button>
          <button
            type="button"
            onClick={() => controllerRef.current?.zoomBy(1.22)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-lg backdrop-blur transition hover:bg-[var(--bg-elevated)]"
            title="Afastar"
            aria-label="Afastar"
          >
            <ZoomOut size={16} />
          </button>
          <button
            type="button"
            onClick={() => controllerRef.current?.resetView()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-lg backdrop-blur transition hover:bg-[var(--bg-elevated)]"
            title="Restaurar vista"
            aria-label="Restaurar vista"
          >
            <Maximize size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default function RoomSpatialMap({
  rooms,
  reservations,
  date,
  psychologists,
  onSelect,
}: {
  rooms: Room[];
  reservations: Reservation[];
  date: string;
  psychologists?: Psychologist[];
  onSelect: (room: Room) => void;
}) {
  const statuses = useMemo(() => buildStatuses(rooms, reservations, date), [rooms, reservations, date]);
  const [selected, setSelected] = useState<RoomStatus | null>(null);
  const [anyHover, setAnyHover] = useState(false);

  const layoutKey = useMemo(() => {
    const ids = rooms.map((r) => r.id).sort((a, b) => a - b).join("-");
    return `morpheus:roomLayout:${ids}`;
  }, [rooms]);

  const [customPositions, setCustomPositions] = useState<Record<number, { x: number; z: number }>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(layoutKey);
      return raw ? (JSON.parse(raw) as Record<number, { x: number; z: number }>) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(layoutKey);
      setCustomPositions(raw ? (JSON.parse(raw) as Record<number, { x: number; z: number }>) : {});
    } catch {
      setCustomPositions({});
    }
  }, [layoutKey]);

  const [layoutVersion, setLayoutVersion] = useState(0);
  const [highlightRoomId, setHighlightRoomId] = useState<number | null>(null);
  const prevResIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(reservations.map((r) => r.id));
    const prev = prevResIdsRef.current;
    const arrived = prev.size > 0 ? reservations.filter((r) => !prev.has(r.id)) : [];
    prevResIdsRef.current = currentIds;
    if (arrived.length > 0) {
      const last = arrived[arrived.length - 1];
      setHighlightRoomId(last.roomId);
      const t = window.setTimeout(() => setHighlightRoomId((cur) => (cur === last.roomId ? null : cur)), 2600);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [reservations]);

  const handleRoomMove = useCallback((roomId: number, x: number, z: number) => {
    setCustomPositions((prev) => {
      const next = { ...prev, [roomId]: { x, z } };
      try {
        window.localStorage.setItem(layoutKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [layoutKey]);

  const resetLayout = useCallback(() => {
    try {
      window.localStorage.removeItem(layoutKey);
    } catch {}
    setCustomPositions({});
    setLayoutVersion((v) => v + 1);
  }, [layoutKey]);

  if (rooms.length === 0) {
    return (
      <div className="flex min-h-[340px] items-center justify-center rounded-3xl border border-dashed border-[var(--border-medium)] bg-[var(--glass-soft)] text-center">
        <div>
          <DoorOpen className="mx-auto text-[var(--accent-mint)]" size={34} />
          <p className="mt-4 font-brand text-2xl font-semibold">Crie a primeira sala</p>
          <p className="mt-2 font-body text-sm text-[var(--text-muted)]">O mapa espacial aparecerá aqui automaticamente.</p>
        </div>
      </div>
    );
  }

  const hasCustom = Object.keys(customPositions).length > 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--border-light)] bg-[var(--bg-elevated)] shadow-2xl">
      <div className="flex flex-col justify-between gap-3 border-b border-[var(--border-light)] px-5 py-4 text-[var(--text-primary)] sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className="font-body text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--accent-sky)]">Clínica em tempo real</p>
          <h3 className="mt-1 font-brand text-2xl font-semibold">Encontre uma sala em segundos</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-body text-xs font-bold text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-2"><MousePointer2 size={15} /> Clique para detalhes</span>
          <span className="inline-flex items-center gap-2"><Hand size={15} /> Segure para mover a sala</span>
          <span className="inline-flex items-center gap-2"><ZoomIn size={15} /> Ctrl + scroll para zoom</span>
          {hasCustom && (
            <button
              type="button"
              onClick={resetLayout}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-medium)] bg-[var(--bg-surface)] px-3 py-1 text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
              title="Restaurar o layout padrão das salas"
            >
              <RotateCcw size={13} /> Resetar layout
            </button>
          )}
        </div>
      </div>
      <div className="relative h-[520px] w-full sm:h-[620px]">
        <ClinicHost
          mode="interactive"
          statuses={statuses}
          onSelect={(s) => setSelected(s)}
          onHoverChange={setAnyHover}
          className="absolute inset-0"
          mountClassName="absolute inset-0"
          customPositions={customPositions}
          onRoomMove={handleRoomMove}
          layoutVersion={layoutVersion}
          highlightRoomId={highlightRoomId}
        />
        <AnimatePresence>
          {selected && (
            <RoomDetailPanel
              status={selected}
              psychologists={psychologists}
              onBook={() => { onSelect(selected.room); setSelected(null); }}
              onClose={() => setSelected(null)}
            />
          )}
        </AnimatePresence>
        {!anyHover && !selected && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-[var(--border-light)] bg-[var(--bg-surface)] px-4 py-1.5 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] backdrop-blur">
            Passe o mouse sobre uma sala
          </div>
        )}
      </div>
      <div className="grid gap-2 border-t border-[var(--border-light)] bg-[var(--glass-soft)] p-3 sm:grid-cols-2 lg:grid-cols-3">
        {statuses.map((status) => (
          <button key={status.room.id} onClick={() => onSelect(status.room)} className="flex items-center justify-between rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] px-4 py-3 text-left text-[var(--text-primary)] transition hover:border-[var(--accent-lavender)] hover:bg-[var(--bg-elevated)]">
            <span className="min-w-0">
              <span className="block truncate font-brand text-base font-semibold">{status.room.name}</span>
              <span className="block font-body text-xs text-[var(--text-muted)]">{status.next ? `Próxima às ${status.next.startTime}` : "Sem outra reserva hoje"}</span>
            </span>
            <span className="ml-3 rounded-full px-2.5 py-1 font-body text-[10px] font-extrabold uppercase tracking-[0.1em]" style={{ color: status.busy ? "#f4a394" : "#9ed6b1", background: status.busy ? "rgba(224,122,100,.14)" : "rgba(111,207,151,.14)" }}>
              {status.busy ? "Ocupada" : "Livre"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

const DEMO_ROOMS: Room[] = [
  { id: 1, name: "Névoa", hex: "#7b6bff", rgb: "123,107,255", lightHex: "#9d90ff", lightRgb: "157,144,255" },
  { id: 2, name: "Íris", hex: "#5eead4", rgb: "94,234,212", lightHex: "#7bf5e0", lightRgb: "123,245,224" },
  { id: 3, name: "Lótus", hex: "#f472b6", rgb: "244,114,182", lightHex: "#f9a8d4", lightRgb: "249,168,212" },
  { id: 4, name: "Aurora", hex: "#fbbf24", rgb: "251,191,36", lightHex: "#fcd34d", lightRgb: "252,211,77" },
  { id: 5, name: "Cedro", hex: "#34d399", rgb: "52,211,153", lightHex: "#6ee7b7", lightRgb: "110,231,183" },
  { id: 6, name: "Livre", hex: "#60a5fa", rgb: "96,165,250", lightHex: "#93c5fd", lightRgb: "147,197,253" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const DEMO_RESERVATIONS: Reservation[] = (() => {
  const date = todayISO();
  const seed: Array<[number, string, string]> = [
    [1, "09:00", "10:00"], [1, "11:00", "12:00"], [2, "10:00", "11:00"], [3, "08:00", "09:00"],
    [3, "14:00", "15:00"], [4, "13:00", "14:00"], [5, "15:00", "16:00"], [6, "16:00", "17:00"],
  ];
  return seed.map(([roomId, startTime, endTime], i) => ({ id: `demo-${i}`, roomId, psychId: (i % 5) + 1, date, startTime, endTime, notes: "" }));
})();

const DEMO_PSYCHOLOGISTS: Psychologist[] = [
  { id: 1, name: "Dra. Helena Vasconcelos", shortName: "Dra. Helena", initials: "HV", hex: "#7b6bff", rgb: "123,107,255", lightHex: "#9d90ff", lightRgb: "157,144,255" },
  { id: 2, name: "Dr. Tomás Ribeiro", shortName: "Dr. Tomás", initials: "TR", hex: "#5eead4", rgb: "94,234,212", lightHex: "#7bf5e0", lightRgb: "123,245,224" },
  { id: 3, name: "Dra. Camila Nunes", shortName: "Dra. Camila", initials: "CN", hex: "#f472b6", rgb: "244,114,182", lightHex: "#f9a8d4", lightRgb: "249,168,212" },
  { id: 4, name: "Dr. André Lacerda", shortName: "Dr. André", initials: "AL", hex: "#fbbf24", rgb: "251,191,36", lightHex: "#fcd34d", lightRgb: "252,211,77" },
  { id: 5, name: "Dra. Beatriz Halm", shortName: "Dra. Beatriz", initials: "BH", hex: "#34d399", rgb: "52,211,153", lightHex: "#6ee7b7", lightRgb: "110,231,183" },
];

export function LandingClinicShowcase({ className }: { className?: string }) {
  const statuses = useMemo(() => buildStatuses(DEMO_ROOMS, DEMO_RESERVATIONS, todayISO()), []);
  const [selected, setSelected] = useState<RoomStatus | null>(null);
  return (
    <div className={className} style={{ position: "relative" }}>
      <ClinicHost
        mode="interactive"
        statuses={statuses}
        onSelect={setSelected}
        onHoverChange={() => {}}
        enableWheelZoom={false}
        className="absolute inset-0"
        mountClassName="absolute inset-0"
      />
      <AnimatePresence>
        {selected && (
          <RoomDetailPanel
            status={selected}
            psychologists={DEMO_PSYCHOLOGISTS}
            demo
            onBook={() => setSelected(null)}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
